/**
 * Workspace Management
 * Handles multi-file indexing, workspace-wide symbol resolution, and file watching
 */

import * as path from 'path';
import * as fs from 'fs';
import { URI } from 'vscode-uri';
import { Lexer } from '../language/lexer';
import { Parser } from '../language/parser';
import { SemanticAnalyzer } from '../language/analyzer';
import { SymbolTable, Symbol as LspSymbol } from '../language/symbols';
import type { Module } from '../language/ast';
import { logInfo, logError, logWarn, logDebug } from './logging';

/**
 * Document info stored in workspace
 */
export interface WorkspaceDocument {
  uri: string;
  version: number;
  ast?: Module;
  symbolTable?: SymbolTable;
  dependencies: Set<string>; // URIs of imported modules
  dependents: Set<string>; // URIs of modules that import this one
  parseError?: string;
}

/**
 * Workspace manager
 */
export class WorkspaceManager {
  private documents = new Map<string, WorkspaceDocument>();
  private globalSymbolTable = new SymbolTable();
  private workspaceRoots: string[] = [];
  private moduleNameToUri = new Map<string, string>();
  private indexing = false;

  /**
   * Initialize workspace with root folders
   */
  async initialize(workspaceFolders: string[]): Promise<void> {
    this.workspaceRoots = workspaceFolders;
    logInfo(`Initializing workspace with ${workspaceFolders.length} root folder(s)`);

    // Index all .mod files in workspace
    await this.indexWorkspace();
  }

  /**
   * Index all .mod files in the workspace
   */
  private async indexWorkspace(): Promise<void> {
    if (this.indexing) {
      logWarn('Workspace indexing already in progress');
      return;
    }

    this.indexing = true;
    logInfo('Starting workspace indexing...');

    try {
      const modFiles: string[] = [];

      // Find all .mod files
      for (const root of this.workspaceRoots) {
        const files = await this.findModFiles(root);
        modFiles.push(...files);
      }

      logInfo(`Found ${modFiles.length} .mod files in workspace`);

      // Parse all files in parallel (first pass - no cross-file resolution yet)
      const parsePromises = modFiles.map((file) => this.indexFile(file));
      await Promise.all(parsePromises);

      // Second pass - resolve imports and build global symbol table
      await this.resolveImports();

      logInfo(`Workspace indexing complete: ${this.documents.size} documents indexed`);
    } catch (error: any) {
      logError('Error during workspace indexing', { error: error.message });
    } finally {
      this.indexing = false;
    }
  }

  /**
   * Find all .mod files in a directory recursively
   */
  private async findModFiles(dir: string): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
            continue;
          }
          const subResults = await this.findModFiles(fullPath);
          results.push(...subResults);
        } else if (entry.isFile() && entry.name.endsWith('.mod')) {
          results.push(fullPath);
        }
      }
    } catch (error: any) {
      logError(`Error reading directory ${dir}`, { error: error.message });
    }

    return results;
  }

  /**
   * Index a single file
   */
  private async indexFile(filePath: string): Promise<void> {
    try {
      const uri = URI.file(filePath).toString();
      const content = await fs.promises.readFile(filePath, 'utf-8');

      // Parse the file
      const lexer = new Lexer(content);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Analyze the file
      const analyzer = new SemanticAnalyzer();
      analyzer.analyze(ast);

      // Extract module name from AST
      const moduleName = ast?.name;

      // Store document info
      const doc: WorkspaceDocument = {
        uri,
        version: 0,
        ast,
        symbolTable: analyzer.getSymbolTable(),
        dependencies: new Set(),
        dependents: new Set(),
      };

      this.documents.set(uri, doc);

      // Map module name to URI
      if (moduleName) {
        this.moduleNameToUri.set(moduleName, uri);
        logDebug(`Indexed module ${moduleName} from ${filePath}`);
      } else {
        logWarn(`Module at ${filePath} has no name`);
      }
    } catch (error: any) {
      const uri = URI.file(filePath).toString();
      logError(`Error indexing file ${filePath}`, { error: error.message, stack: error.stack });

      // Store document with error
      this.documents.set(uri, {
        uri,
        version: 0,
        dependencies: new Set(),
        dependents: new Set(),
        parseError: error.message,
      });
    }
  }

  /**
   * Resolve imports across all files and build global symbol table
   */
  private async resolveImports(): Promise<void> {
    logInfo('Resolving imports across workspace...');

    // First, clear dependency maps
    for (const doc of this.documents.values()) {
      doc.dependencies.clear();
      doc.dependents.clear();
    }

    // Build dependency graph
    for (const doc of this.documents.values()) {
      if (!doc.ast) continue;

      // Extract imports from AST
      const imports = this.extractImports(doc.ast);

      for (const importName of imports) {
        const importedUri = this.moduleNameToUri.get(importName);
        if (importedUri) {
          // Record dependency
          doc.dependencies.add(importedUri);

          // Record dependent
          const importedDoc = this.documents.get(importedUri);
          if (importedDoc) {
            importedDoc.dependents.add(doc.uri);
          }
        } else {
          logWarn(`Cannot resolve import '${importName}' in ${doc.uri}`);
        }
      }
    }

    // Check for circular dependencies
    this.detectCircularDependencies();

    // Build global symbol table
    await this.buildGlobalSymbolTable();

    logInfo('Import resolution complete');
  }

  /**
   * Extract import names from a module AST
   */
  private extractImports(ast: Module): string[] {
    const imports: string[] = [];

    // Extract from IMPORT statements
    if (ast.imports) {
      for (const importStmt of ast.imports) {
        if (importStmt.type === 'ImportStatement') {
          imports.push(importStmt.moduleName);
        }
      }
    }

    return imports;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (uri: string, path: string[]): boolean => {
      visited.add(uri);
      recursionStack.add(uri);

      const doc = this.documents.get(uri);
      if (doc) {
        for (const depUri of doc.dependencies) {
          if (!visited.has(depUri)) {
            if (dfs(depUri, [...path, uri])) {
              return true;
            }
          } else if (recursionStack.has(depUri)) {
            // Circular dependency detected
            const cycle = [...path, uri, depUri];
            logWarn(`Circular dependency detected: ${cycle.join(' -> ')}`);
            return true;
          }
        }
      }

      recursionStack.delete(uri);
      return false;
    };

    for (const uri of this.documents.keys()) {
      if (!visited.has(uri)) {
        dfs(uri, []);
      }
    }
  }

  /**
   * Build global symbol table from all modules
   */
  private async buildGlobalSymbolTable(): Promise<void> {
    logInfo('Building global symbol table...');

    // Create new global symbol table
    this.globalSymbolTable = new SymbolTable();

    // Process modules in topological order (dependencies first)
    const processedUris = new Set<string>();
    const toProcess = Array.from(this.documents.keys());

    // Simple heuristic: process modules with fewer dependencies first
    toProcess.sort((a, b) => {
      const docA = this.documents.get(a);
      const docB = this.documents.get(b);
      const depsA = docA?.dependencies.size || 0;
      const depsB = docB?.dependencies.size || 0;
      return depsA - depsB;
    });

    for (const uri of toProcess) {
      const doc = this.documents.get(uri);
      if (!doc || !doc.symbolTable) continue;

      // Copy exported symbols to global symbol table
      this.exportSymbolsToGlobal(doc);
      processedUris.add(uri);
    }

    logInfo(`Global symbol table built with symbols from ${processedUris.size} modules`);
  }

  /**
   * Export symbols from a module to the global symbol table
   */
  private exportSymbolsToGlobal(doc: WorkspaceDocument): void {
    if (!doc.symbolTable || !doc.ast) return;

    const moduleName = doc.ast.name;
    if (!moduleName) return;

    // Get all symbols from module's global scope
    const moduleScope = doc.symbolTable.globalScope;

    // Export symbols to global table
    for (const [name, symbol] of moduleScope.symbols.entries()) {
      // Only export exported symbols (for DEFINITION MODULE)
      // For now, export all symbols from all modules
      try {
        this.globalSymbolTable.define(symbol);
      } catch (error: any) {
        // Symbol already exists - this is OK for duplicate definitions
        logDebug(`Symbol ${name} already exists in global table`);
      }
    }
  }

  /**
   * Update a document (e.g., when it changes)
   */
  async updateDocument(uri: string, content: string, version: number): Promise<void> {
    logDebug(`Updating document ${uri}, version ${version}`);

    try {
      // Parse the updated document
      const lexer = new Lexer(content);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Analyze
      const analyzer = new SemanticAnalyzer();
      analyzer.analyze(ast);

      // Get existing document or create new one
      const existingDoc = this.documents.get(uri);
      const doc: WorkspaceDocument = {
        uri,
        version,
        ast,
        symbolTable: analyzer.getSymbolTable(),
        dependencies: existingDoc?.dependencies || new Set(),
        dependents: existingDoc?.dependents || new Set(),
      };

      this.documents.set(uri, doc);

      // Update module name mapping
      if (ast.name) {
        this.moduleNameToUri.set(ast.name, uri);
      }

      // Re-resolve imports for this document and its dependents
      await this.updateImportsForDocument(uri);

      logDebug(`Document ${uri} updated successfully`);
    } catch (error: any) {
      logError(`Error updating document ${uri}`, { error: error.message });

      // Store document with error
      const existingDoc = this.documents.get(uri);
      this.documents.set(uri, {
        uri,
        version,
        dependencies: existingDoc?.dependencies || new Set(),
        dependents: existingDoc?.dependents || new Set(),
        parseError: error.message,
      });
    }
  }

  /**
   * Update imports for a document and propagate changes
   */
  private async updateImportsForDocument(uri: string): Promise<void> {
    const doc = this.documents.get(uri);
    if (!doc || !doc.ast) return;

    // Clear old dependencies
    const oldDeps = new Set(doc.dependencies);
    doc.dependencies.clear();

    // Extract new imports
    const imports = this.extractImports(doc.ast);

    for (const importName of imports) {
      const importedUri = this.moduleNameToUri.get(importName);
      if (importedUri) {
        doc.dependencies.add(importedUri);

        const importedDoc = this.documents.get(importedUri);
        if (importedDoc) {
          importedDoc.dependents.add(uri);
        }
      }
    }

    // Remove this document from old dependencies' dependents
    for (const oldDep of oldDeps) {
      if (!doc.dependencies.has(oldDep)) {
        const oldDepDoc = this.documents.get(oldDep);
        if (oldDepDoc) {
          oldDepDoc.dependents.delete(uri);
        }
      }
    }

    // Rebuild global symbol table (simplified - in production, do incremental update)
    await this.buildGlobalSymbolTable();
  }

  /**
   * Remove a document (e.g., when file is deleted)
   */
  removeDocument(uri: string): void {
    const doc = this.documents.get(uri);
    if (!doc) return;

    logDebug(`Removing document ${uri}`);

    // Remove from module name mapping
    if (doc.ast?.name) {
      this.moduleNameToUri.delete(doc.ast.name);
    }

    // Remove from dependencies
    for (const depUri of doc.dependencies) {
      const depDoc = this.documents.get(depUri);
      if (depDoc) {
        depDoc.dependents.delete(uri);
      }
    }

    // Remove from dependents
    for (const depUri of doc.dependents) {
      const depDoc = this.documents.get(depUri);
      if (depDoc) {
        depDoc.dependencies.delete(uri);
      }
    }

    this.documents.delete(uri);

    // Rebuild global symbol table
    this.buildGlobalSymbolTable();
  }

  /**
   * Get a document by URI
   */
  getDocument(uri: string): WorkspaceDocument | undefined {
    return this.documents.get(uri);
  }

  /**
   * Get all documents
   */
  getAllDocuments(): WorkspaceDocument[] {
    return Array.from(this.documents.values());
  }

  /**
   * Resolve a module name to a URI
   */
  resolveModule(moduleName: string): string | undefined {
    return this.moduleNameToUri.get(moduleName);
  }

  /**
   * Lookup a symbol across the entire workspace
   */
  lookupSymbol(name: string): LspSymbol | undefined {
    return this.globalSymbolTable.lookup(name);
  }

  /**
   * Get all exported symbols from a module
   */
  getModuleExports(uri: string): Map<string, LspSymbol> {
    const doc = this.documents.get(uri);
    if (!doc || !doc.symbolTable) {
      return new Map();
    }

    return doc.symbolTable.globalScope.symbols;
  }

  /**
   * Find all references to a symbol across workspace
   */
  findReferences(
    _symbolName: string,
    _includeDeclaration = true
  ): Array<{ uri: string; line: number; column: number }> {
    const references: Array<{ uri: string; line: number; column: number }> = [];

    // TODO: Implement AST traversal to find all references
    // For now, return empty array
    logWarn('findReferences not yet implemented');

    return references;
  }

  /**
   * Get dependencies for a document
   */
  getDependencies(uri: string): string[] {
    const doc = this.documents.get(uri);
    return doc ? Array.from(doc.dependencies) : [];
  }

  /**
   * Get dependents for a document
   */
  getDependents(uri: string): string[] {
    const doc = this.documents.get(uri);
    return doc ? Array.from(doc.dependents) : [];
  }
}
