/**
 * Semantic analyzer for MODSIM III
 * Builds symbol table, performs type checking, validates semantics
 */

import type {
  Module,
  Declaration,
  TypeDeclaration,
  ConstDeclaration,
  VarDeclaration,
  ProcedureDeclaration,
  ObjectDeclaration,
  MethodDeclaration,
  Statement,
  Expression,
  TypeSpec,
  SimpleType,
  ArrayType,
  RecordType,
  ObjectType,
  EnumType,
  SubrangeType,
  PointerType,
} from './ast';

import {
  Type,
  TypeKind,
  BUILTIN_TYPES,
  ObjectType as SemanticObjectType,
  ArrayType as SemanticArrayType,
  RecordType as SemanticRecordType,
  EnumType as SemanticEnumType,
  SubrangeType as SemanticSubrangeType,
  PointerType as SemanticPointerType,
  MethodInfo,
  ParameterInfo,
  FieldInfo,
  isAssignable,
  getBinaryOpResultType,
  getUnaryOpResultType,
} from './types';

import {
  SymbolTable,
  ScopeKind,
  SymbolKind,
  AnySymbol,
  ModuleSymbol,
  TypeSymbol,
  ConstSymbol,
  VarSymbol,
  ParameterSymbol,
  ProcedureSymbol,
} from './symbols';

import { Diagnostic, DiagnosticSeverity } from './diagnostics';

/**
 * Semantic Analyzer - performs semantic analysis on AST
 */
interface DeclaredSymbol {
  name: string;
  kind: SymbolKind;
  declaration: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
}

export class SemanticAnalyzer {
  private symbolTable: SymbolTable;
  private diagnostics: Diagnostic[] = [];
  private currentProcedure?: {
    name: string;
    returnType: Type;
    methodType?: 'ASK' | 'TELL' | 'LMONITOR' | 'RMONITOR' | 'WAITFOR';
  };
  private currentObject?: {
    name: string;
    baseTypes: string[];
  };
  private usedSymbols: Set<string> = new Set();
  private declaredSymbols: DeclaredSymbol[][] = []; // Stack of scopes
  private workspaceResolver?: (moduleName: string) => SymbolTable | undefined;

  constructor() {
    this.symbolTable = new SymbolTable();
    this.initializeBuiltins();
  }

  /**
   * Set workspace symbol resolver for cross-file symbol lookup
   */
  public setWorkspaceResolver(resolver: (moduleName: string) => SymbolTable | undefined): void {
    this.workspaceResolver = resolver;
  }

  /**
   * Initialize built-in types in global scope
   */
  private initializeBuiltins(): void {
    for (const [name, type] of BUILTIN_TYPES.entries()) {
      const symbol: TypeSymbol = {
        name,
        kind: SymbolKind.TYPE,
        type,
        declaration: { line: 0, column: 0, offset: 0 },
      };
      this.symbolTable.define(symbol);
    }
  }

  /**
   * Analyze a module and return diagnostics
   */
  public analyze(module: Module): Diagnostic[] {
    this.diagnostics = [];

    // Enter module scope
    this.symbolTable.enterScope(ScopeKind.MODULE, module.name);

    // Define module symbol
    const moduleSymbol: ModuleSymbol = {
      name: module.name,
      kind: SymbolKind.MODULE,
      type: { kind: TypeKind.VOID },
      declaration: module.start,
      moduleKind: module.kind,
      exports: new Set(),
    };
    this.symbolTable.globalScope.define(moduleSymbol);

    // Process imports
    this.analyzeImports(module);

    // Process declarations
    for (const decl of module.declarations) {
      this.analyzeDeclaration(decl);
    }

    // Exit module scope
    this.symbolTable.exitScope();

    return this.diagnostics;
  }

  /**
   * Get the symbol table
   */
  public getSymbolTable(): SymbolTable {
    return this.symbolTable;
  }

  /**
   * Add a diagnostic
   */
  private addDiagnostic(
    severity: DiagnosticSeverity,
    message: string,
    start: { line: number; column: number; offset: number },
    end: { line: number; column: number; offset: number }
  ): void {
    this.diagnostics.push({
      severity,
      message,
      start,
      end,
    });
  }

  /**
   * Add an error diagnostic
   */
  private error(message: string, start: any, end: any): void {
    this.addDiagnostic(DiagnosticSeverity.Error, message, start, end);
  }

  /**
   * Add a warning diagnostic
   */
  private warning(message: string, start: any, end: any): void {
    this.addDiagnostic(DiagnosticSeverity.Warning, message, start, end);
  }

  /**
   * Enter a new scope for tracking declarations
   */
  private enterDeclarationScope(): void {
    this.declaredSymbols.push([]);
  }

  /**
   * Track a declared symbol in the current scope
   */
  private trackDeclaredSymbol(name: string, kind: SymbolKind, start: any, end: any): void {
    const currentScope = this.declaredSymbols[this.declaredSymbols.length - 1];
    if (currentScope) {
      currentScope.push({ name, kind, declaration: start, end });
    }
  }

  /**
   * Exit the current scope and check for unused symbols
   */
  private exitDeclarationScope(): void {
    const currentScope = this.declaredSymbols.pop();
    if (!currentScope) return;

    for (const symbol of currentScope) {
      // Skip type declarations (they don't need to be "used")
      if (symbol.kind === SymbolKind.TYPE || symbol.kind === SymbolKind.CONST) {
        continue;
      }

      // Check if symbol was used
      if (!this.usedSymbols.has(symbol.name)) {
        const kindName = symbol.kind === SymbolKind.PARAMETER ? 'Parameter' : 'Variable';
        this.warning(
          `${kindName} '${symbol.name}' is declared but never used`,
          symbol.declaration,
          symbol.end
        );
      }
    }
  }

  /**
   * Add a warning diagnostic
   */
  // private warning(message: string, start: any, end: any): void {
  //   this.addDiagnostic(DiagnosticSeverity.Warning, message, start, end);
  // }

  /**
   * Analyze import statements
   */
  private analyzeImports(module: Module): void {
    for (const importStmt of module.imports) {
      // Use workspace resolver to get symbols from imported module
      if (this.workspaceResolver && importStmt.moduleName) {
        const importedModuleSymbols = this.workspaceResolver(importStmt.moduleName);

        if (importedModuleSymbols) {
          // Import the requested symbols from the module
          for (const symbolImport of importStmt.symbols) {
            // Use lookupGlobal() because after analysis completes, currentScope
            // has exited the MODULE scope where symbols were defined
            const symbol = importedModuleSymbols.lookupGlobal(symbolImport.name);
            if (symbol) {
              // Add imported symbol to current scope
              this.symbolTable.define(symbol);
            } else {
              // Symbol not found in imported module
              this.error(
                `Symbol '${symbolImport.name}' not found in module '${importStmt.moduleName}'`,
                importStmt.start,
                importStmt.end
              );
            }
          }
        } else {
          // Module not found in workspace
          this.error(
            `Module '${importStmt.moduleName}' not found`,
            importStmt.start,
            importStmt.end
          );
        }
      } else {
        // No workspace resolver - create placeholder symbols
        for (const symbol of importStmt.symbols) {
          const importedSymbol: AnySymbol = {
            name: symbol.name,
            kind: SymbolKind.VAR,
            type: { kind: TypeKind.UNKNOWN },
            declaration: importStmt.start,
          };
          this.symbolTable.define(importedSymbol);
        }
      }
    }
  }

  /**
   * Analyze a declaration
   */
  private analyzeDeclaration(decl: Declaration): void {
    switch (decl.type) {
      case 'TypeDeclaration':
        this.analyzeTypeDeclaration(decl);
        break;
      case 'ConstDeclaration':
        this.analyzeConstDeclaration(decl);
        break;
      case 'VarDeclaration':
        this.analyzeVarDeclaration(decl);
        break;
      case 'ProcedureDeclaration':
        this.analyzeProcedureDeclaration(decl);
        break;
      case 'ObjectDeclaration':
        this.analyzeObjectDeclaration(decl);
        break;
    }
  }

  /**
   * Analyze a type declaration
   */
  private analyzeTypeDeclaration(decl: TypeDeclaration): void {
    const type = this.resolveTypeSpec(decl.typeSpec);

    // Check if already defined
    if (this.symbolTable.lookupLocal(decl.name)) {
      this.error(`Type '${decl.name}' is already defined`, decl.start, decl.end);
      return;
    }

    // Define type symbol
    const symbol: TypeSymbol = {
      name: decl.name,
      kind: SymbolKind.TYPE,
      type,
      declaration: decl.start,
    };
    this.symbolTable.define(symbol);
  }

  /**
   * Analyze a const declaration
   */
  private analyzeConstDeclaration(decl: ConstDeclaration): void {
    // Check if already defined
    if (this.symbolTable.lookupLocal(decl.name)) {
      this.error(`Constant '${decl.name}' is already defined`, decl.start, decl.end);
      return;
    }

    // Infer type from value expression
    const valueType = this.inferExpressionType(decl.value);

    // Define const symbol
    const symbol: ConstSymbol = {
      name: decl.name,
      kind: SymbolKind.CONST,
      type: valueType,
      declaration: decl.start,
    };
    this.symbolTable.define(symbol);
  }

  /**
   * Analyze a var declaration
   */
  private analyzeVarDeclaration(decl: VarDeclaration): void {
    const varType = this.resolveTypeSpec(decl.valueType);

    for (const name of decl.names) {
      // Check if already defined in current scope
      if (this.symbolTable.lookupLocal(name)) {
        this.error(`Variable '${name}' is already defined`, decl.start, decl.end);
        continue;
      }

      // Define var symbol
      const symbol: VarSymbol = {
        name,
        kind: SymbolKind.VAR,
        type: varType,
        declaration: decl.start,
      };
      this.symbolTable.define(symbol);
      this.trackDeclaredSymbol(name, SymbolKind.VAR, decl.start, decl.end);
    }
  }

  /**
   * Analyze a procedure declaration
   */
  private analyzeProcedureDeclaration(decl: ProcedureDeclaration): void {
    // Check if already defined
    if (this.symbolTable.lookupLocal(decl.name)) {
      this.error(`Procedure '${decl.name}' is already defined`, decl.start, decl.end);
      return;
    }

    // Determine return type
    const returnType = decl.returnType ? this.resolveTypeSpec(decl.returnType) : { kind: TypeKind.VOID };

    // Set current procedure context for return statement checking
    const previousProcedure = this.currentProcedure;
    this.currentProcedure = {
      name: decl.name,
      returnType,
    };

    // Enter procedure scope
    const procScope = this.symbolTable.enterScope(ScopeKind.PROCEDURE, decl.name);
    this.enterDeclarationScope(); // Start tracking declarations for unused warnings

    // Analyze parameters
    const parameters: ParameterSymbol[] = [];
    for (let i = 0; i < decl.parameters.length; i++) {
      const param = decl.parameters[i];
      const paramType = this.resolveTypeSpec(param.valueType);

      const paramSymbol: ParameterSymbol = {
        name: param.name,
        kind: SymbolKind.PARAMETER,
        type: paramType,
        mode: param.mode,
        index: i,
        declaration: param.start,
      };
      parameters.push(paramSymbol);
      this.symbolTable.define(paramSymbol);
      this.trackDeclaredSymbol(param.name, SymbolKind.PARAMETER, param.start, param.end);
    }

    // Analyze local declarations
    if (decl.localDeclarations) {
      for (const localDecl of decl.localDeclarations) {
        this.analyzeDeclaration(localDecl);
      }
    }

    // Analyze body statements
    for (const stmt of decl.body) {
      this.analyzeStatement(stmt);
    }

    // Exit procedure scope and check for unused symbols
    this.exitDeclarationScope();
    this.symbolTable.exitScope();

    // Restore previous procedure context
    this.currentProcedure = previousProcedure;

    // Define procedure symbol in parent scope
    const procSymbol: ProcedureSymbol = {
      name: decl.name,
      kind: SymbolKind.PROCEDURE,
      type: returnType,
      parameters,
      returnType,
      localScope: procScope,
      declaration: decl.start,
    };
    this.symbolTable.currentScope.define(procSymbol);
  }

  /**
   * Analyze an object declaration
   */
  private analyzeObjectDeclaration(decl: ObjectDeclaration): void {
    // This is an OBJECT implementation block: OBJECT TypeName; ... END OBJECT
    // We need to analyze the method implementations and create a TYPE if it doesn't exist

    // Get base types from the AST node
    const baseTypes: string[] = decl.baseTypes || [];

    // Look up the TYPE definition
    let typeSymbol = this.symbolTable.lookup(decl.name);

    // If no TYPE exists, create one from the OBJECT declaration
    if (!typeSymbol) {
      // Build fields map
      const fields = new Map<string, FieldInfo>();
      for (const field of decl.fields) {
        const fieldType = this.resolveTypeSpec(field.valueType);
        for (const name of field.names) {
          fields.set(name, { type: fieldType });
        }
      }

      // Build methods map
      const methods = new Map<string, MethodInfo>();
      for (const method of decl.methods) {
        const parameters: ParameterInfo[] = method.parameters.map((p) => ({
          name: p.name,
          type: this.resolveTypeSpec(p.valueType),
          mode: p.mode,
        }));
        const returnType = method.returnType ? this.resolveTypeSpec(method.returnType) : undefined;

        methods.set(method.name, {
          methodType: method.methodType,
          parameters,
          returnType,
          isOverride: method.isOverride || false,
        });
      }

      // Create the object type
      const objectType: SemanticObjectType = {
        kind: TypeKind.OBJECT,
        fields,
        methods,
        baseTypes: [],
      };

      // Define the TYPE symbol
      typeSymbol = {
        name: decl.name,
        kind: SymbolKind.TYPE,
        type: objectType,
        declaration: decl.start,
      };
      this.symbolTable.define(typeSymbol);
    }

    // Enter object scope
    this.symbolTable.enterScope(ScopeKind.OBJECT, decl.name);

    // Add fields from the type definition to the current scope
    if (typeSymbol.kind === SymbolKind.TYPE && typeSymbol.type.kind === TypeKind.OBJECT) {
      const objectType = typeSymbol.type as SemanticObjectType;

      for (const [fieldName, fieldInfo] of objectType.fields.entries()) {
        const fieldSymbol: VarSymbol = {
          name: fieldName,
          kind: SymbolKind.VAR,
          type: fieldInfo.type,
          declaration: { line: 0, column: 0, offset: 0 }, // From type definition
        };
        this.symbolTable.define(fieldSymbol);
      }
    }

    // Set current object context for OVERRIDE checking
    const previousObject = this.currentObject;
    this.currentObject = {
      name: decl.name,
      baseTypes,
    };

    // Analyze fields from implementation (if any)
    for (const field of decl.fields) {
      this.analyzeDeclaration(field);
    }

    // Analyze methods
    for (const method of decl.methods) {
      this.analyzeMethodImplementation(method);
    }

    // Analyze private section if present
    if (decl.privateSection) {
      for (const field of decl.privateSection.fields) {
        this.analyzeDeclaration(field);
      }
      for (const method of decl.privateSection.methods) {
        this.analyzeMethodImplementation(method);
      }
    }

    // Exit object scope
    this.symbolTable.exitScope();

    // Restore previous object context
    this.currentObject = previousObject;
  }

  /**
   * Analyze a method implementation
   */
  private analyzeMethodImplementation(method: MethodDeclaration): void {
    // Determine return type
    const returnType = method.returnType
      ? this.resolveTypeSpec(method.returnType)
      : { kind: TypeKind.VOID };

    // Check OVERRIDE keyword usage
    if (this.currentObject && this.currentObject.baseTypes.length > 0) {
      // Check if this method overrides a base class method
      let foundInBase = false;

      for (const baseTypeName of this.currentObject.baseTypes) {
        const baseTypeSymbol = this.symbolTable.lookup(baseTypeName);
        if (baseTypeSymbol && baseTypeSymbol.kind === SymbolKind.TYPE && baseTypeSymbol.type.kind === TypeKind.OBJECT) {
          const baseObjectType = baseTypeSymbol.type as SemanticObjectType;
          if (baseObjectType.methods.has(method.name)) {
            foundInBase = true;
            break;
          }
        }
      }

      // If found in base but no OVERRIDE keyword, error
      if (foundInBase && !method.isOverride) {
        this.error(
          `Method '${method.name}' overrides a base class method and must be marked with OVERRIDE`,
          method.start,
          method.end
        );
      }

      // If OVERRIDE keyword but not found in base, error
      if (!foundInBase && method.isOverride) {
        this.error(
          `Method '${method.name}' is marked with OVERRIDE but does not override any base class method`,
          method.start,
          method.end
        );
      }
    } else if (method.isOverride) {
      // OVERRIDE keyword used but no base types
      this.error(
        `Method '${method.name}' is marked with OVERRIDE but type '${this.currentObject?.name}' has no base types`,
        method.start,
        method.end
      );
    }

    // Set current procedure context for WAIT/RETURN checking
    const previousProcedure = this.currentProcedure;
    this.currentProcedure = {
      name: method.name,
      returnType,
      methodType: method.methodType, // ASK or TELL
    };

    // Enter method scope
    this.symbolTable.enterScope(ScopeKind.PROCEDURE, method.name);
    this.enterDeclarationScope(); // Start tracking declarations for unused warnings

    // Analyze parameters
    for (let i = 0; i < method.parameters.length; i++) {
      const param = method.parameters[i];
      const paramType = this.resolveTypeSpec(param.valueType);

      // Check parameter mode for TELL methods
      if (method.methodType === 'TELL' && param.mode !== 'IN') {
        this.addDiagnostic(
          DiagnosticSeverity.Error,
          `TELL methods can only have IN parameters, found ${param.mode} parameter '${param.name}'`,
          param.start,
          param.end
        );
      }

      const paramSymbol: ParameterSymbol = {
        name: param.name,
        kind: SymbolKind.PARAMETER,
        type: paramType,
        mode: param.mode,
        index: i,
        declaration: param.start,
      };
      this.symbolTable.define(paramSymbol);
      this.trackDeclaredSymbol(param.name, SymbolKind.PARAMETER, param.start, param.end);
    }

    // Analyze method body
    for (const stmt of method.body) {
      this.analyzeStatement(stmt);
    }

    // Exit method scope and check for unused symbols
    this.exitDeclarationScope();
    this.symbolTable.exitScope();

    // Restore previous procedure context
    this.currentProcedure = previousProcedure;
  }

  /**
   * Analyze a statement
   */
  private analyzeStatement(stmt: Statement): void {
    switch (stmt.type) {
      case 'AssignmentStatement':
        this.analyzeAssignment(stmt as any);
        break;
      case 'AskStatement':
        this.analyzeAskStatement(stmt as any);
        break;
      case 'TellStatement':
        this.analyzeTellStatement(stmt as any);
        break;
      case 'IfStatement':
        this.analyzeIfStatement(stmt as any);
        break;
      case 'WhileStatement':
        this.analyzeWhileStatement(stmt as any);
        break;
      case 'ForStatement':
        this.analyzeForStatement(stmt as any);
        break;
      case 'WaitStatement':
        this.analyzeWaitStatement(stmt as any);
        break;
      case 'ReturnStatement':
        this.analyzeReturnStatement(stmt as any);
        break;
      // TODO: Implement other statement types
    }
  }

  /**
   * Analyze an assignment statement
   */
  private analyzeAssignment(stmt: any): void {
    const targetType = this.inferExpressionType(stmt.target);
    const valueType = this.inferExpressionType(stmt.value);

    if (!isAssignable(targetType, valueType)) {
      this.error(
        `Cannot assign ${valueType.kind} to ${targetType.kind}`,
        stmt.start,
        stmt.end
      );
    }
  }

  /**
   * Analyze an ASK statement
   */
  private analyzeAskStatement(stmt: any): void {
    const objectType = this.inferExpressionType(stmt.object);

    if (objectType.kind === TypeKind.OBJECT) {
      const objType = objectType as SemanticObjectType;
      const method = objType.methods.get(stmt.method);

      if (!method) {
        this.error(
          `Method '${stmt.method}' not found in object type`,
          stmt.start,
          stmt.end
        );
        return;
      }

      // Validate it's an ASK method
      if (method.methodType !== 'ASK') {
        this.error(
          `Cannot ASK a TELL method '${stmt.method}'`,
          stmt.start,
          stmt.end
        );
      }

      // Check argument count and types
      this.checkMethodArguments(stmt.method, method, stmt.arguments, stmt.start, stmt.end);
    }
  }

  /**
   * Analyze a TELL statement
   */
  private analyzeTellStatement(stmt: any): void {
    const objectType = this.inferExpressionType(stmt.object);

    if (objectType.kind === TypeKind.OBJECT) {
      const objType = objectType as SemanticObjectType;
      const method = objType.methods.get(stmt.method);

      if (!method) {
        this.error(
          `Method '${stmt.method}' not found in object type`,
          stmt.start,
          stmt.end
        );
        return;
      }

      // Validate it's a TELL method
      if (method.methodType !== 'TELL') {
        this.error(
          `Cannot TELL an ASK method '${stmt.method}'`,
          stmt.start,
          stmt.end
        );
      }

      // Check argument count and types
      this.checkMethodArguments(stmt.method, method, stmt.arguments, stmt.start, stmt.end);
    }
  }

  /**
   * Check method arguments match parameters
   */
  private checkMethodArguments(
    methodName: string,
    method: MethodInfo,
    args: Expression[],
    start: any,
    end: any
  ): void {
    const expectedCount = method.parameters.length;
    const actualCount = args.length;

    if (actualCount !== expectedCount) {
      this.error(
        `Method '${methodName}' expects ${expectedCount} argument(s) but got ${actualCount}`,
        start,
        end
      );
    }

    // Check each argument type
    for (let i = 0; i < Math.min(actualCount, expectedCount); i++) {
      const argType = this.inferExpressionType(args[i]);
      const paramType = method.parameters[i].type;

      if (!isAssignable(paramType, argType)) {
        this.error(
          `Argument ${i + 1} type mismatch in method '${methodName}': expected ${this.formatType(paramType)} but got ${this.formatType(argType)}`,
          args[i].start,
          args[i].end
        );
      }
    }
  }

  /**
   * Analyze an if statement
   */
  private analyzeIfStatement(stmt: any): void {
    const condType = this.inferExpressionType(stmt.condition);
    if (condType.kind !== TypeKind.BOOLEAN) {
      this.error('IF condition must be BOOLEAN', stmt.start, stmt.end);
    }

    for (const s of stmt.thenBlock) {
      this.analyzeStatement(s);
    }

    for (const elsif of stmt.elsifClauses) {
      const elsifCondType = this.inferExpressionType(elsif.condition);
      if (elsifCondType.kind !== TypeKind.BOOLEAN) {
        this.error('ELSIF condition must be BOOLEAN', stmt.start, stmt.end);
      }
      for (const s of elsif.block) {
        this.analyzeStatement(s);
      }
    }

    if (stmt.elseBlock) {
      for (const s of stmt.elseBlock) {
        this.analyzeStatement(s);
      }
    }
  }

  /**
   * Analyze a while statement
   */
  private analyzeWhileStatement(stmt: any): void {
    const condType = this.inferExpressionType(stmt.condition);
    if (condType.kind !== TypeKind.BOOLEAN) {
      this.error('WHILE condition must be BOOLEAN', stmt.start, stmt.end);
    }

    for (const s of stmt.body) {
      this.analyzeStatement(s);
    }
  }

  /**
   * Analyze a for statement
   */
  private analyzeForStatement(stmt: any): void {
    // TODO: Full FOR statement analysis
    for (const s of stmt.body) {
      this.analyzeStatement(s);
    }
  }

  /**
   * Analyze a WAIT statement
   */
  private analyzeWaitStatement(stmt: any): void {
    // WAIT is only allowed in TELL methods
    if (this.currentProcedure && this.currentProcedure.methodType === 'ASK') {
      this.error('WAIT statement is not allowed in ASK methods', stmt.start, stmt.end);
    }

    // Type check the wait expression
    if (stmt.expression) {
      this.inferExpressionType(stmt.expression);
    }

    // Analyze on-interrupt block if present
    if (stmt.onInterrupt) {
      for (const s of stmt.onInterrupt) {
        this.analyzeStatement(s);
      }
    }
  }

  /**
   * Analyze a return statement
   */
  private analyzeReturnStatement(stmt: any): void {
    if (!this.currentProcedure) {
      this.error('RETURN statement outside of procedure or method', stmt.start, stmt.end);
      return;
    }

    const expectedType = this.currentProcedure.returnType;

    if (stmt.value) {
      const actualType = this.inferExpressionType(stmt.value);

      // Check if the return type matches
      if (!isAssignable(expectedType, actualType)) {
        this.error(
          `Return type mismatch: expected ${this.formatType(expectedType)} but got ${this.formatType(actualType)}`,
          stmt.start,
          stmt.end
        );
      }
    } else {
      // No return value - must be VOID procedure
      if (expectedType.kind !== TypeKind.VOID) {
        this.error(
          `Procedure '${this.currentProcedure.name}' expects return type ${this.formatType(expectedType)} but got no return value`,
          stmt.start,
          stmt.end
        );
      }
    }

    // Check TELL methods cannot return values (part of Task 4.9)
    if (this.currentProcedure.methodType === 'TELL' && stmt.value) {
      this.error('TELL methods cannot return values', stmt.start, stmt.end);
    }
  }

  /**
   * Resolve a type specification to a semantic type
   */
  private resolveTypeSpec(typeSpec: TypeSpec): Type {
    switch (typeSpec.type) {
      case 'SimpleType':
        return this.resolveSimpleType(typeSpec);
      case 'ArrayType':
        return this.resolveArrayType(typeSpec);
      case 'RecordType':
        return this.resolveRecordType(typeSpec);
      case 'ObjectType':
        return this.resolveObjectType(typeSpec);
      case 'EnumType':
        return this.resolveEnumType(typeSpec);
      case 'SubrangeType':
        return this.resolveSubrangeType(typeSpec);
      case 'PointerType':
        return this.resolvePointerType(typeSpec);
      default:
        return { kind: TypeKind.UNKNOWN };
    }
  }

  /**
   * Resolve a simple type name
   */
  private resolveSimpleType(typeSpec: SimpleType): Type {
    // Check built-in types
    const builtinType = BUILTIN_TYPES.get(typeSpec.name);
    if (builtinType) {
      return builtinType;
    }

    // Look up user-defined type
    const symbol = this.symbolTable.lookup(typeSpec.name);
    if (symbol && symbol.kind === SymbolKind.TYPE) {
      return symbol.type;
    }

    // Unknown type
    this.error(`Unknown type '${typeSpec.name}'`, typeSpec.start, typeSpec.end);
    return { kind: TypeKind.UNKNOWN };
  }

  /**
   * Resolve an array type
   */
  private resolveArrayType(typeSpec: ArrayType): Type {
    const elementType = this.resolveTypeSpec(typeSpec.elementType);
    const arrayType: SemanticArrayType = {
      kind: TypeKind.ARRAY,
      dimensions: typeSpec.indexRanges.length,
      indexTypes: [], // TODO: Resolve index types from ranges
      elementType,
    };
    return arrayType;
  }

  /**
   * Resolve a record type
   */
  private resolveRecordType(typeSpec: RecordType): Type {
    const fields = new Map<string, FieldInfo>();
    for (const field of typeSpec.fields) {
      const fieldType = this.resolveTypeSpec(field.valueType);
      for (const name of field.names) {
        fields.set(name, { type: fieldType });
      }
    }
    const recordType: SemanticRecordType = {
      kind: TypeKind.RECORD,
      fields,
    };
    return recordType;
  }

  /**
   * Resolve an object type
   */
  private resolveObjectType(typeSpec: ObjectType): Type {
    // Resolve base types and inherit their members
    const baseTypes: SemanticObjectType[] = [];
    const fields = new Map<string, FieldInfo>();
    const methods = new Map<string, MethodInfo>();

    // Resolve base types
    if (typeSpec.baseTypes && typeSpec.baseTypes.length > 0) {
      for (const baseTypeName of typeSpec.baseTypes) {
        const baseSymbol = this.symbolTable.lookup(baseTypeName);
        if (!baseSymbol || baseSymbol.kind !== SymbolKind.TYPE) {
          this.error(`Base type '${baseTypeName}' not found`, typeSpec.start, typeSpec.end);
          continue;
        }

        const baseType = baseSymbol.type;
        if (baseType.kind !== TypeKind.OBJECT) {
          this.error(`Base type '${baseTypeName}' is not an OBJECT type`, typeSpec.start, typeSpec.end);
          continue;
        }

        const baseObjType = baseType as SemanticObjectType;
        baseTypes.push(baseObjType);

        // Inherit fields from base type
        for (const [fieldName, fieldInfo] of baseObjType.fields.entries()) {
          fields.set(fieldName, fieldInfo);
        }

        // Inherit methods from base type
        for (const [methodName, methodInfo] of baseObjType.methods.entries()) {
          methods.set(methodName, methodInfo);
        }
      }
    }

    // Add fields from this type
    for (const field of typeSpec.fields) {
      const fieldType = this.resolveTypeSpec(field.valueType);
      for (const name of field.names) {
        fields.set(name, { type: fieldType });
      }
    }

    // Add methods from this type
    for (const method of typeSpec.methods) {
      // Validate parameter modes for ASK vs TELL
      for (const param of method.parameters) {
        if (method.methodType === 'TELL' && param.mode !== 'IN') {
          this.error(
            `TELL method '${method.name}' cannot have ${param.mode} parameter '${param.name}'. TELL methods can only have IN parameters.`,
            method.start,
            method.end
          );
        }
      }

      const parameters: ParameterInfo[] = method.parameters.map((p) => ({
        name: p.name,
        type: this.resolveTypeSpec(p.valueType),
        mode: p.mode,
      }));
      const returnType = method.returnType ? this.resolveTypeSpec(method.returnType) : undefined;

      // Validate TELL methods don't have return types
      if (method.methodType === 'TELL' && returnType && returnType.kind !== TypeKind.VOID) {
        this.error(
          `TELL method '${method.name}' cannot have a return type`,
          method.start,
          method.end
        );
      }

      // Check if this is an override
      const isOverriding = methods.has(method.name);
      if (method.isOverride && !isOverriding) {
        this.error(
          `Method '${method.name}' is marked as OVERRIDE but does not override any base method`,
          method.start,
          method.end
        );
      } else if (!method.isOverride && isOverriding) {
        this.error(
          `Method '${method.name}' overrides a base method but is not marked with OVERRIDE`,
          method.start,
          method.end
        );
      }

      methods.set(method.name, {
        methodType: method.methodType,
        parameters,
        returnType,
        isOverride: method.isOverride || false,
      });
    }

    const objectType: SemanticObjectType = {
      kind: TypeKind.OBJECT,
      baseTypes,
      fields,
      methods,
    };
    return objectType;
  }

  /**
   * Resolve an enum type
   */
  private resolveEnumType(typeSpec: EnumType): Type {
    const enumType: SemanticEnumType = {
      kind: TypeKind.ENUM,
      values: typeSpec.values,
    };
    return enumType;
  }

  /**
   * Resolve a subrange type
   */
  private resolveSubrangeType(_typeSpec: SubrangeType): Type {
    // TODO: Evaluate low and high expressions from typeSpec to get actual values
    const subrangeType: SemanticSubrangeType = {
      kind: TypeKind.SUBRANGE,
      baseType: { kind: TypeKind.INTEGER },
      low: 0, // TODO: Evaluate expression
      high: 100, // TODO: Evaluate expression
    };
    return subrangeType;
  }

  /**
   * Resolve a pointer type
   */
  private resolvePointerType(_typeSpec: PointerType): Type {
    const baseType = this.resolveTypeSpec(_typeSpec.baseType);
    const pointerType: SemanticPointerType = {
      kind: TypeKind.POINTER,
      baseType,
    };
    return pointerType;
  }

  /**
   * Infer the type of an expression
   */
  private inferExpressionType(expr: Expression): Type {
    switch (expr.type) {
      case 'LiteralExpression':
        return this.inferLiteralType(expr as any);
      case 'IdentifierExpression':
        return this.inferIdentifierType(expr as any);
      case 'BinaryExpression':
        return this.inferBinaryExpressionType(expr as any);
      case 'UnaryExpression':
        return this.inferUnaryExpressionType(expr as any);
      case 'CallExpression':
        return this.inferCallExpressionType(expr as any);
      case 'FieldAccessExpression':
        return this.inferFieldAccessType(expr as any);
      case 'ArrayAccessExpression':
        return this.inferArrayAccessType(expr as any);
      default:
        return { kind: TypeKind.UNKNOWN };
    }
  }

  /**
   * Infer type from literal
   */
  private inferLiteralType(expr: any): Type {
    switch (expr.literalType) {
      case 'INTEGER':
        return BUILTIN_TYPES.get('INTEGER')!;
      case 'REAL':
        return BUILTIN_TYPES.get('REAL')!;
      case 'STRING':
        return BUILTIN_TYPES.get('STRING')!;
      case 'CHAR':
        return BUILTIN_TYPES.get('CHAR')!;
      case 'BOOLEAN':
        return BUILTIN_TYPES.get('BOOLEAN')!;
      case 'NIL':
        return { kind: TypeKind.UNKNOWN }; // NIL can be any reference type
      default:
        return { kind: TypeKind.UNKNOWN };
    }
  }

  /**
   * Infer type from identifier
   */
  private inferIdentifierType(expr: any): Type {
    const symbol = this.symbolTable.lookup(expr.name);
    if (symbol) {
      // Mark symbol as used
      this.usedSymbols.add(expr.name);
      return symbol.type;
    }
    this.error(`Undefined identifier '${expr.name}'`, expr.start, expr.end);
    return { kind: TypeKind.ERROR, message: `Undefined identifier '${expr.name}'` } as any;
  }

  /**
   * Infer type from binary expression
   */
  private inferBinaryExpressionType(expr: any): Type {
    const leftType = this.inferExpressionType(expr.left);
    const rightType = this.inferExpressionType(expr.right);
    return getBinaryOpResultType(expr.operator, leftType, rightType);
  }

  /**
   * Infer type from unary expression
   */
  private inferUnaryExpressionType(expr: any): Type {
    const operandType = this.inferExpressionType(expr.operand);
    return getUnaryOpResultType(expr.operator, operandType);
  }

  /**
   * Infer type from call expression
   */
  private inferCallExpressionType(expr: any): Type {
    // Get the callee type - should be a procedure
    const calleeType = this.inferExpressionType(expr.callee);

    // If callee is an identifier, look up the procedure symbol
    if (expr.callee.type === 'IdentifierExpression') {
      const symbol = this.symbolTable.lookup(expr.callee.name);
      if (symbol && symbol.kind === SymbolKind.PROCEDURE) {
        const procSymbol = symbol as ProcedureSymbol;

        // Check argument count
        const expectedCount = procSymbol.parameters.length;
        const actualCount = expr.arguments.length;
        if (actualCount !== expectedCount) {
          this.error(
            `Procedure '${expr.callee.name}' expects ${expectedCount} argument(s) but got ${actualCount}`,
            expr.start,
            expr.end
          );
        }

        // Check argument types
        for (let i = 0; i < Math.min(actualCount, expectedCount); i++) {
          const argType = this.inferExpressionType(expr.arguments[i]);
          const paramType = procSymbol.parameters[i].type;

          if (!isAssignable(paramType, argType)) {
            this.error(
              `Argument ${i + 1} type mismatch: expected ${this.formatType(paramType)} but got ${this.formatType(argType)}`,
              expr.arguments[i].start,
              expr.arguments[i].end
            );
          }
        }

        // Return the procedure's return type
        return procSymbol.returnType || { kind: TypeKind.VOID };
      }
    }

    return calleeType;
  }

  /**
   * Format a type for error messages
   */
  private formatType(type: Type): string {
    if (!type) return 'Unknown';
    if (type.kind === TypeKind.OBJECT && 'name' in type && type.name) {
      return type.name;
    }
    return type.kind;
  }

  /**
   * Infer type from field access
   */
  private inferFieldAccessType(_expr: any): Type {
    // const objectType = this.inferExpressionType(expr.object);
    // TODO: Look up field in object type
    return { kind: TypeKind.UNKNOWN };
  }

  /**
   * Infer type from array access
   */
  private inferArrayAccessType(expr: any): Type {
    const arrayType = this.inferExpressionType(expr.array);
    if (arrayType.kind === TypeKind.ARRAY) {
      return (arrayType as SemanticArrayType).elementType;
    }
    return { kind: TypeKind.UNKNOWN };
  }
}
