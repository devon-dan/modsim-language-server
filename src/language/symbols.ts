/**
 * Symbol table implementation for MODSIM III
 * Handles scopes, symbol resolution, and symbol information
 */

import { Type } from './types';
import type { Position } from './ast';

// Symbol kinds
export enum SymbolKind {
  MODULE = 'MODULE',
  TYPE = 'TYPE',
  CONST = 'CONST',
  VAR = 'VAR',
  PARAMETER = 'PARAMETER',
  PROCEDURE = 'PROCEDURE',
  OBJECT = 'OBJECT',
  METHOD = 'METHOD',
  FIELD = 'FIELD',
  ENUM_VALUE = 'ENUM_VALUE',
}

// Base symbol interface
export interface Symbol {
  name: string;
  kind: SymbolKind;
  type: Type;
  declaration: Position; // Where the symbol was declared
  scope?: Scope; // The scope containing this symbol
}

// Module symbol
export interface ModuleSymbol extends Symbol {
  kind: SymbolKind.MODULE;
  moduleKind: 'DEFINITION' | 'IMPLEMENTATION' | 'MAIN';
  exports: Set<string>; // Exported symbol names
}

// Type symbol
export interface TypeSymbol extends Symbol {
  kind: SymbolKind.TYPE;
}

// Constant symbol
export interface ConstSymbol extends Symbol {
  kind: SymbolKind.CONST;
  value?: any; // Optional compile-time constant value
}

// Variable symbol
export interface VarSymbol extends Symbol {
  kind: SymbolKind.VAR;
  isLocal?: boolean; // True if local to procedure/method
}

// Parameter symbol
export interface ParameterSymbol extends Symbol {
  kind: SymbolKind.PARAMETER;
  mode: 'IN' | 'OUT' | 'INOUT';
  index: number; // Parameter position
}

// Procedure symbol
export interface ProcedureSymbol extends Symbol {
  kind: SymbolKind.PROCEDURE;
  parameters: ParameterSymbol[];
  returnType?: Type;
  localScope?: Scope; // Scope for procedure body
}

// Object symbol
export interface ObjectSymbol extends Symbol {
  kind: SymbolKind.OBJECT;
  baseTypes?: string[]; // Names of base types
  fields: Map<string, FieldSymbol>;
  methods: Map<string, MethodSymbol>;
  privateFields?: Map<string, FieldSymbol>;
  privateMethods?: Map<string, MethodSymbol>;
  objectScope?: Scope; // Scope for object members
}

// Method symbol
export interface MethodSymbol extends Symbol {
  kind: SymbolKind.METHOD;
  methodType: 'ASK' | 'TELL';
  parameters: ParameterSymbol[];
  returnType?: Type;
  isOverride: boolean;
  localScope?: Scope; // Scope for method body
}

// Field symbol
export interface FieldSymbol extends Symbol {
  kind: SymbolKind.FIELD;
  isPrivate?: boolean;
}

// Enum value symbol
export interface EnumValueSymbol extends Symbol {
  kind: SymbolKind.ENUM_VALUE;
  enumType: string; // Name of the enum type
  value: number; // Ordinal value
}

// Union type for all symbol variants
export type AnySymbol =
  | ModuleSymbol
  | TypeSymbol
  | ConstSymbol
  | VarSymbol
  | ParameterSymbol
  | ProcedureSymbol
  | ObjectSymbol
  | MethodSymbol
  | FieldSymbol
  | EnumValueSymbol;

// Scope types
export enum ScopeKind {
  GLOBAL = 'GLOBAL',
  MODULE = 'MODULE',
  OBJECT = 'OBJECT',
  PROCEDURE = 'PROCEDURE',
  METHOD = 'METHOD',
  BLOCK = 'BLOCK',
}

/**
 * Scope - represents a lexical scope in the program
 */
export class Scope {
  kind: ScopeKind;
  name: string;
  parent?: Scope;
  symbols: Map<string, AnySymbol> = new Map();
  children: Scope[] = [];

  constructor(kind: ScopeKind, name: string, parent?: Scope) {
    this.kind = kind;
    this.name = name;
    this.parent = parent;
    if (parent) {
      parent.children.push(this);
    }
  }

  /**
   * Define a symbol in this scope
   */
  define(symbol: AnySymbol): void {
    this.symbols.set(symbol.name, symbol);
    symbol.scope = this;
  }

  /**
   * Lookup a symbol in this scope only (no parent lookup)
   */
  lookupLocal(name: string): AnySymbol | undefined {
    return this.symbols.get(name);
  }

  /**
   * Lookup a symbol in this scope and parent scopes
   */
  lookup(name: string): AnySymbol | undefined {
    const symbol = this.symbols.get(name);
    if (symbol) {
      return symbol;
    }
    if (this.parent) {
      return this.parent.lookup(name);
    }
    return undefined;
  }

  /**
   * Check if a symbol is defined in this scope (not in parent scopes)
   */
  isDefined(name: string): boolean {
    return this.symbols.has(name);
  }

  /**
   * Get all symbols in this scope
   */
  getSymbols(): AnySymbol[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Get all symbols of a specific kind
   */
  getSymbolsByKind(kind: SymbolKind): AnySymbol[] {
    return this.getSymbols().filter((s) => s.kind === kind);
  }

  /**
   * Create a child scope
   */
  createChild(kind: ScopeKind, name: string): Scope {
    return new Scope(kind, name, this);
  }
}

/**
 * Symbol Table - manages all scopes and symbols in a program
 */
export class SymbolTable {
  globalScope: Scope;
  currentScope: Scope;
  scopes: Map<string, Scope> = new Map(); // All scopes by name

  constructor() {
    this.globalScope = new Scope(ScopeKind.GLOBAL, '<global>');
    this.currentScope = this.globalScope;
    this.scopes.set(this.globalScope.name, this.globalScope);
  }

  /**
   * Enter a new scope
   */
  enterScope(kind: ScopeKind, name: string): Scope {
    const newScope = this.currentScope.createChild(kind, name);
    this.currentScope = newScope;
    this.scopes.set(name, newScope);
    return newScope;
  }

  /**
   * Exit the current scope and return to parent
   */
  exitScope(): Scope | undefined {
    if (this.currentScope.parent) {
      this.currentScope = this.currentScope.parent;
      return this.currentScope;
    }
    return undefined;
  }

  /**
   * Define a symbol in the current scope
   */
  define(symbol: AnySymbol): void {
    this.currentScope.define(symbol);
  }

  /**
   * Lookup a symbol starting from current scope
   */
  lookup(name: string): AnySymbol | undefined {
    return this.currentScope.lookup(name);
  }

  /**
   * Lookup a symbol in current scope only
   */
  lookupLocal(name: string): AnySymbol | undefined {
    return this.currentScope.lookupLocal(name);
  }

  /**
   * Get a scope by name
   */
  getScope(name: string): Scope | undefined {
    return this.scopes.get(name);
  }

  /**
   * Get all symbols in the symbol table
   */
  getAllSymbols(): AnySymbol[] {
    const symbols: AnySymbol[] = [];
    const visitScope = (scope: Scope) => {
      symbols.push(...scope.getSymbols());
      scope.children.forEach(visitScope);
    };
    visitScope(this.globalScope);
    return symbols;
  }

  /**
   * Find all references to a symbol
   */
  findReferences(symbolName: string): AnySymbol[] {
    return this.getAllSymbols().filter((s) => s.name === symbolName);
  }

  /**
   * Check if a symbol is visible from the current scope
   */
  isVisible(symbol: AnySymbol): boolean {
    let scope: Scope | undefined = this.currentScope;
    while (scope) {
      if (scope.symbols.has(symbol.name)) {
        return scope.symbols.get(symbol.name) === symbol;
      }
      scope = scope.parent;
    }
    return false;
  }
}

/**
 * Symbol table builder - walks AST and populates symbol table
 */
export class SymbolTableBuilder {
  symbolTable: SymbolTable;

  constructor() {
    this.symbolTable = new SymbolTable();
  }

  /**
   * Get the built symbol table
   */
  getSymbolTable(): SymbolTable {
    return this.symbolTable;
  }
}
