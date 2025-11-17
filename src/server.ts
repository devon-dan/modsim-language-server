/**
 * MODSIM III Language Server
 * Main LSP server implementation with document lifecycle and request routing
 */

import {
  createConnection,
  TextDocuments,
  Diagnostic,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  DidChangeConfigurationNotification,
  CompletionItem,
  TextDocumentPositionParams,
  Connection,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { Lexer } from './language/lexer';
import { Parser } from './language/parser';
import { SemanticAnalyzer } from './language/analyzer';
import type { Module } from './language/ast';
import { SymbolTable } from './language/symbols';
import { getDocumentSymbols } from './features/documentSymbols';
import { getHover } from './features/hover';
import { getDefinition } from './features/definition';
import { getSemanticTokens } from './features/semanticTokens';
import { getCompletions, resolveCompletionItem } from './features/completion';
import { findReferences } from './features/references';
import { getSignatureHelp } from './features/signatureHelp';
import { getCodeActions } from './features/codeAction';
import { prepareRename, getRename } from './features/rename';
import { getDocumentHighlights } from './features/documentHighlight';
import { getFoldingRanges } from './features/foldingRanges';
import { initLogger, logInfo, logError, logWarn } from './utils/logging';
import { WorkspaceManager } from './utils/workspace';

// Create connection using all proposed features
const connection: Connection = createConnection(ProposedFeatures.all);

// Create document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Create workspace manager
const workspaceManager = new WorkspaceManager();

// Document state cache
interface DocumentState {
  ast?: Module;
  symbolTable?: SymbolTable;
  diagnostics: Diagnostic[];
  version: number;
}

const documentStates = new Map<string, DocumentState>();

// Server capabilities
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
// let hasDiagnosticRelatedInformationCapability = false;

/**
 * Initialize server
 */
connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Check client capabilities
  hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
  hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
  // hasDiagnosticRelatedInformationCapability = !!(
  //   capabilities.textDocument &&
  //   capabilities.textDocument.publishDiagnostics &&
  //   capabilities.textDocument.publishDiagnostics.relatedInformation
  // );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      documentSymbolProvider: true,
      hoverProvider: true,
      definitionProvider: true,
      semanticTokensProvider: {
        legend: {
          tokenTypes: ['keyword', 'type', 'class', 'function', 'variable', 'parameter', 'property', 'string', 'number', 'comment'],
          tokenModifiers: ['declaration', 'definition', 'readonly'],
        },
        full: true,
      },
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.', ' '],
      },
      referencesProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ['(', ','],
      },
      renameProvider: {
        prepareProvider: true,
      },
      documentHighlightProvider: true,
      foldingRangeProvider: true,
    },
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }

  return result;
});

/**
 * Server initialized
 */
connection.onInitialized(async () => {
  // Initialize logger
  initLogger();
  logInfo('MODSIM III Language Server initialized');

  if (hasConfigurationCapability) {
    // Register for configuration changes
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }

  // Initialize workspace with workspace folders
  const workspaceFolders = hasWorkspaceFolderCapability
    ? await connection.workspace.getWorkspaceFolders()
    : null;

  if (workspaceFolders && workspaceFolders.length > 0) {
    const workspaceRoots = workspaceFolders.map((folder) => {
      // Convert URI to file path using vscode-uri
      const { URI } = require('vscode-uri');
      return URI.parse(folder.uri).fsPath;
    });

    logInfo(`Initializing workspace with folders: ${workspaceRoots.join(', ')}`);
    await workspaceManager.initialize(workspaceRoots);
    logInfo(`Workspace initialized with ${workspaceRoots.length} folder(s)`);
  } else {
    // Don't index on startup - wait for first document to open
    logWarn('No workspace folders provided by client, will auto-discover on first document open');
  }

  if (hasWorkspaceFolderCapability) {

    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
      logInfo('Workspace folder change event received');
      // TODO: Re-initialize workspace with new folders
    });
  }

  connection.console.log('MODSIM III Language Server initialized');
});

/**
 * Configuration changed
 */
connection.onDidChangeConfiguration((_change) => {
  // Revalidate all open documents
  documents.all().forEach(validateTextDocument);
});

/**
 * Document opened
 */
documents.onDidOpen(async (event) => {
  connection.console.log(`Document opened: ${event.document.uri}`);
  logInfo(`Document opened: ${event.document.uri}`);

  // Check if we need to index/re-index workspace based on opened file
  const { URI } = require('vscode-uri');
  const filePath = URI.parse(event.document.uri).fsPath;
  const fileDir = require('path').dirname(filePath);

  // Check if opened file is within any indexed workspace root
  const workspaceRoots = workspaceManager.getWorkspaceRoots();
  const isFileInWorkspace = workspaceRoots.some((root: string) =>
    filePath.startsWith(root) || fileDir.startsWith(root)
  );

  connection.console.log(`File in workspace: ${isFileInWorkspace}, Current roots: ${workspaceRoots.join(', ')}`);

  // If file is not in workspace OR no workspace indexed yet, auto-discover and index
  if (!isFileInWorkspace) {
    connection.console.log(`File ${filePath} not in current workspace, auto-discovering...`);
    const pathModule = require('path');
    const fsModule = require('fs');

    // Try to find workspace root (go up until we find a parent with .mod files or hit root)
    let workspaceRoot = fileDir;
    let currentDir = fileDir;

    // Check if parent directories have more .mod files (likely the workspace root)
    while (true) {
      const parent = pathModule.dirname(currentDir);
      if (parent === currentDir) break; // Hit filesystem root

      // Check if parent has .mod files
      try {
        const entries = fsModule.readdirSync(parent);
        const hasModFiles = entries.some((e: string) => e.endsWith('.mod'));
        if (hasModFiles) {
          workspaceRoot = parent;
          currentDir = parent;
        } else {
          break; // No more .mod files, we've found the root
        }
      } catch {
        break;
      }
    }

    logInfo(`Auto-discovered workspace root: ${workspaceRoot}`);
    connection.console.log(`Auto-discovered workspace root: ${workspaceRoot}`);

    try {
      await workspaceManager.initialize([workspaceRoot], (msg) => connection.console.log(msg));
      connection.console.log(`Workspace indexing completed successfully`);
    } catch (error: any) {
      logError(`Workspace initialization failed: ${error.message}`);
      connection.console.log(`Workspace initialization failed: ${error.message}`);
    }
  }

  await validateTextDocument(event.document);
});

/**
 * Document changed
 */
documents.onDidChangeContent(async (change) => {
  connection.console.log(`Document changed: ${change.document.uri}`);
  logInfo(`Document changed: ${change.document.uri}`);
  await validateTextDocument(change.document);
});

/**
 * Document closed
 */
documents.onDidClose((event) => {
  connection.console.log(`Document closed: ${event.document.uri}`);
  logInfo(`Document closed: ${event.document.uri}`);
  documentStates.delete(event.document.uri);
  workspaceManager.removeDocument(event.document.uri);
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

/**
 * Validate (parse and analyze) a text document
 */
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  try {
    const text = textDocument.getText();
    const uri = textDocument.uri;
    const version = textDocument.version;

    // Tokenize
    const lexer = new Lexer(text);
    const tokens = lexer.tokenize();

    // Parse
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // Analyze with workspace context
    const analyzer = new SemanticAnalyzer();

    // Provide workspace symbol resolver to analyzer
    analyzer.setWorkspaceResolver((moduleName: string) => {
      connection.console.log(`Looking up module: ${moduleName}`);
      const moduleUri = workspaceManager.resolveModule(moduleName);
      if (moduleUri) {
        connection.console.log(`Found module ${moduleName} at ${moduleUri}`);
        const doc = workspaceManager.getDocument(moduleUri);
        if (doc) {
          connection.console.log(`  Document exists for ${moduleName}`);
          if (doc.symbolTable) {
            const symbols = doc.symbolTable.getAllSymbols();
            connection.console.log(`  SymbolTable exists with ${symbols.length} symbols`);
            connection.console.log(`  Symbol names: ${symbols.map(s => s.name).join(', ')}`);
          } else {
            connection.console.log(`  SymbolTable is undefined!`);
          }
          return doc.symbolTable;
        } else {
          connection.console.log(`  Document not found for URI ${moduleUri}`);
        }
      } else {
        connection.console.log(`Module ${moduleName} not found in workspace`);
      }
      return undefined;
    });

    const analyzerDiagnostics = analyzer.analyze(ast);

    // Check for ERROR tokens from lexer (e.g., lowercase keywords)
    const tokenDiagnostics = tokens
      .filter((token) => token.type === 'ERROR')
      .map((token) => ({
        severity: 'Error' as const,
        message: token.value,
        start: token.start,
        end: token.end,
      }));

    // Combine all diagnostics
    const allDiagnostics = [...analyzerDiagnostics, ...tokenDiagnostics];

    // Convert diagnostics to LSP format
    const diagnostics: Diagnostic[] = allDiagnostics.map((d) => ({
      severity: d.severity === 'Error' ? 1 : d.severity === 'Warning' ? 2 : 3,
      range: {
        start: { line: d.start.line - 1, character: d.start.column - 1 }, // LSP is 0-based
        end: { line: d.end.line - 1, character: d.end.column - 1 },
      },
      message: d.message,
      source: 'modsim-lsp',
    }));

    // Cache document state
    documentStates.set(uri, {
      ast,
      symbolTable: analyzer.getSymbolTable(),
      diagnostics,
      version,
    });

    // Update workspace manager
    await workspaceManager.updateDocument(uri, text, version);

    // Send diagnostics to client
    connection.sendDiagnostics({ uri, diagnostics });
    logInfo(`Validated document: ${uri}, diagnostics: ${diagnostics.length}`);
  } catch (error: any) {
    // Log error
    logError(`Error validating ${textDocument.uri}`, { error: error.message, stack: error.stack });

    // Send parse error as diagnostic
    const diagnostic: Diagnostic = {
      severity: 1, // Error
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      },
      message: `Parse error: ${error.message}`,
      source: 'modsim-lsp',
    };

    connection.sendDiagnostics({
      uri: textDocument.uri,
      diagnostics: [diagnostic],
    });

    connection.console.error(`Error validating ${textDocument.uri}: ${error.message}`);
  }
}

/**
 * Get document state
 */
function getDocumentState(uri: string): DocumentState | undefined {
  return documentStates.get(uri);
}

/**
 * Completion provider
 */
connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
  const state = getDocumentState(params.textDocument.uri);
  if (!state?.ast || !state?.symbolTable) {
    return [];
  }
  return getCompletions(
    state.ast,
    state.symbolTable,
    params.position.line,
    params.position.character
  );
});

/**
 * Completion resolve
 */
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  return resolveCompletionItem(item);
});

/**
 * Document symbols provider
 */
connection.onDocumentSymbol((params) => {
  const state = getDocumentState(params.textDocument.uri);
  if (!state?.ast) {
    return null;
  }
  return getDocumentSymbols(state.ast);
});

/**
 * Hover provider
 */
connection.onHover((params) => {
  const state = getDocumentState(params.textDocument.uri);
  if (!state?.ast || !state?.symbolTable) {
    return null;
  }
  return getHover(
    state.ast,
    state.symbolTable,
    params.position.line,
    params.position.character,
    params.textDocument.uri
  );
});

/**
 * Go-to-definition provider
 */
connection.onDefinition((params) => {
  const state = getDocumentState(params.textDocument.uri);
  if (!state?.ast || !state?.symbolTable) {
    return null;
  }
  return getDefinition(
    state.ast,
    state.symbolTable,
    params.position.line,
    params.position.character,
    params.textDocument.uri
  );
});

/**
 * Find references provider
 */
connection.onReferences((params) => {
  const state = getDocumentState(params.textDocument.uri);
  if (!state?.ast || !state?.symbolTable) {
    return null;
  }
  return findReferences(
    state.ast,
    state.symbolTable,
    params.position.line,
    params.position.character,
    params.textDocument.uri,
    params.context.includeDeclaration,
    workspaceManager
  );
});

/**
 * Signature help provider
 */
connection.onSignatureHelp((params) => {
  const state = getDocumentState(params.textDocument.uri);
  if (!state?.ast || !state?.symbolTable) {
    return null;
  }
  return getSignatureHelp(
    state.ast,
    state.symbolTable,
    params.position.line,
    params.position.character
  );
});

/**
 * Code action provider
 */
connection.onCodeAction((params) => {
  const state = getDocumentState(params.textDocument.uri);
  if (!state?.ast || !state?.symbolTable) {
    return [];
  }

  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  return getCodeActions(
    state.ast,
    state.symbolTable,
    params.range,
    params.context.diagnostics,
    params.textDocument.uri,
    document.getText()
  );
});

/**
 * Prepare rename provider
 */
connection.onPrepareRename((params) => {
  const state = getDocumentState(params.textDocument.uri);
  if (!state?.ast || !state?.symbolTable) {
    return null;
  }

  return prepareRename(
    state.ast,
    state.symbolTable,
    params.position.line,
    params.position.character
  );
});

/**
 * Rename provider
 */
connection.onRenameRequest((params) => {
  const state = getDocumentState(params.textDocument.uri);
  if (!state?.ast || !state?.symbolTable) {
    return null;
  }

  return getRename(
    state.ast,
    state.symbolTable,
    params.position.line,
    params.position.character,
    params.newName,
    params.textDocument.uri,
    workspaceManager
  );
});

/**
 * Document highlight provider
 */
connection.onDocumentHighlight((params) => {
  const state = getDocumentState(params.textDocument.uri);
  if (!state?.ast || !state?.symbolTable) {
    return null;
  }

  return getDocumentHighlights(
    state.ast,
    state.symbolTable,
    params.position.line,
    params.position.character,
    params.textDocument.uri,
    workspaceManager
  );
});

/**
 * Folding ranges provider
 */
connection.onFoldingRanges((params) => {
  const state = getDocumentState(params.textDocument.uri);
  if (!state?.ast) {
    return null;
  }

  return getFoldingRanges(state.ast);
});

/**
 * Semantic tokens provider
 */
connection.languages.semanticTokens.on((params) => {
  const state = getDocumentState(params.textDocument.uri);
  if (!state?.ast) {
    return { data: [] };
  }
  return { data: getSemanticTokens(state.ast) };
});

/**
 * Shutdown
 */
connection.onShutdown(() => {
  connection.console.log('Server shutting down');
});

/**
 * Exit
 */
connection.onExit(() => {
  process.exit(0);
});

// Listen on the connection
documents.listen(connection);
connection.listen();

export { connection, documents, getDocumentState, workspaceManager };
