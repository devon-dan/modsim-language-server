/**
 * Unit tests for Symbol Table
 */

import { SymbolTable, ScopeKind, SymbolKind, TypeSymbol, VarSymbol, ProcedureSymbol } from './symbols';
import { TypeKind } from './types';

describe('SymbolTable', () => {
  describe('Basic Operations', () => {
    it('should create global scope on initialization', () => {
      const symbolTable = new SymbolTable();

      expect(symbolTable.globalScope).toBeDefined();
      expect(symbolTable.globalScope.kind).toBe(ScopeKind.GLOBAL);
      expect(symbolTable.currentScope).toBe(symbolTable.globalScope);
    });

    it('should define and lookup symbols in global scope', () => {
      const symbolTable = new SymbolTable();

      const symbol: VarSymbol = {
        name: 'x',
        kind: SymbolKind.VAR,
        type: { kind: TypeKind.INTEGER },
        declaration: { line: 1, column: 1, offset: 0 },
      };

      symbolTable.define(symbol);

      const found = symbolTable.lookup('x');
      expect(found).toBeDefined();
      expect(found?.name).toBe('x');
      expect(found?.kind).toBe(SymbolKind.VAR);
    });

    it('should return undefined for undefined symbols', () => {
      const symbolTable = new SymbolTable();

      const found = symbolTable.lookup('nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('Scope Management', () => {
    it('should enter and exit scopes', () => {
      const symbolTable = new SymbolTable();

      const moduleScope = symbolTable.enterScope(ScopeKind.MODULE, 'TestModule');
      expect(symbolTable.currentScope).toBe(moduleScope);
      expect(moduleScope.parent).toBe(symbolTable.globalScope);

      symbolTable.exitScope();
      expect(symbolTable.currentScope).toBe(symbolTable.globalScope);
    });

    it('should nest scopes correctly', () => {
      const symbolTable = new SymbolTable();

      const moduleScope = symbolTable.enterScope(ScopeKind.MODULE, 'TestModule');
      const procScope = symbolTable.enterScope(ScopeKind.PROCEDURE, 'TestProc');
      const blockScope = symbolTable.enterScope(ScopeKind.BLOCK, 'Block');

      expect(symbolTable.currentScope).toBe(blockScope);
      expect(blockScope.parent).toBe(procScope);
      expect(procScope.parent).toBe(moduleScope);
      expect(moduleScope.parent).toBe(symbolTable.globalScope);

      symbolTable.exitScope();
      expect(symbolTable.currentScope).toBe(procScope);

      symbolTable.exitScope();
      expect(symbolTable.currentScope).toBe(moduleScope);

      symbolTable.exitScope();
      expect(symbolTable.currentScope).toBe(symbolTable.globalScope);
    });

    it('should not exit beyond global scope', () => {
      const symbolTable = new SymbolTable();

      symbolTable.exitScope(); // Try to exit global scope
      expect(symbolTable.currentScope).toBe(symbolTable.globalScope);
    });
  });

  describe('Symbol Resolution', () => {
    it('should resolve symbols in current scope', () => {
      const symbolTable = new SymbolTable();

      const symbol: VarSymbol = {
        name: 'localVar',
        kind: SymbolKind.VAR,
        type: { kind: TypeKind.INTEGER },
        declaration: { line: 1, column: 1, offset: 0 },
      };

      symbolTable.enterScope(ScopeKind.PROCEDURE, 'TestProc');
      symbolTable.define(symbol);

      const found = symbolTable.lookup('localVar');
      expect(found).toBeDefined();
      expect(found?.name).toBe('localVar');
    });

    it('should resolve symbols in parent scopes', () => {
      const symbolTable = new SymbolTable();

      const globalSymbol: TypeSymbol = {
        name: 'GlobalType',
        kind: SymbolKind.TYPE,
        type: { kind: TypeKind.INTEGER },
        declaration: { line: 1, column: 1, offset: 0 },
      };

      symbolTable.define(globalSymbol);

      symbolTable.enterScope(ScopeKind.MODULE, 'TestModule');
      symbolTable.enterScope(ScopeKind.PROCEDURE, 'TestProc');

      const found = symbolTable.lookup('GlobalType');
      expect(found).toBeDefined();
      expect(found?.name).toBe('GlobalType');
      expect(found?.kind).toBe(SymbolKind.TYPE);
    });

    it('should shadow symbols in parent scopes', () => {
      const symbolTable = new SymbolTable();

      const globalSymbol: VarSymbol = {
        name: 'x',
        kind: SymbolKind.VAR,
        type: { kind: TypeKind.INTEGER },
        declaration: { line: 1, column: 1, offset: 0 },
      };

      const localSymbol: VarSymbol = {
        name: 'x',
        kind: SymbolKind.VAR,
        type: { kind: TypeKind.REAL },
        declaration: { line: 5, column: 1, offset: 50 },
      };

      symbolTable.define(globalSymbol);
      symbolTable.enterScope(ScopeKind.PROCEDURE, 'TestProc');
      symbolTable.define(localSymbol);

      const found = symbolTable.lookup('x');
      expect(found).toBeDefined();
      expect(found?.type.kind).toBe(TypeKind.REAL); // Should find local, not global
    });

    it('should find symbols after exiting scope', () => {
      const symbolTable = new SymbolTable();

      const globalSymbol: VarSymbol = {
        name: 'global',
        kind: SymbolKind.VAR,
        type: { kind: TypeKind.INTEGER },
        declaration: { line: 1, column: 1, offset: 0 },
      };

      symbolTable.define(globalSymbol);
      symbolTable.enterScope(ScopeKind.PROCEDURE, 'TestProc');
      symbolTable.exitScope();

      const found = symbolTable.lookup('global');
      expect(found).toBeDefined();
      expect(found?.name).toBe('global');
    });
  });

  describe('Scope Queries', () => {
    it('should lookup local symbols only', () => {
      const symbolTable = new SymbolTable();

      const globalSymbol: VarSymbol = {
        name: 'global',
        kind: SymbolKind.VAR,
        type: { kind: TypeKind.INTEGER },
        declaration: { line: 1, column: 1, offset: 0 },
      };

      const localSymbol: VarSymbol = {
        name: 'local',
        kind: SymbolKind.VAR,
        type: { kind: TypeKind.INTEGER },
        declaration: { line: 5, column: 1, offset: 50 },
      };

      symbolTable.define(globalSymbol);
      symbolTable.enterScope(ScopeKind.PROCEDURE, 'TestProc');
      symbolTable.define(localSymbol);

      const foundLocal = symbolTable.currentScope.lookupLocal('local');
      expect(foundLocal).toBeDefined();

      const foundGlobal = symbolTable.currentScope.lookupLocal('global');
      expect(foundGlobal).toBeUndefined(); // Should not find in parent
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle procedure symbols with parameters', () => {
      const symbolTable = new SymbolTable();

      const procSymbol: ProcedureSymbol = {
        name: 'Add',
        kind: SymbolKind.PROCEDURE,
        type: { kind: TypeKind.INTEGER },
        parameters: [
          {
            name: 'a',
            kind: SymbolKind.PARAMETER,
            type: { kind: TypeKind.INTEGER },
            mode: 'IN',
            index: 0,
            declaration: { line: 1, column: 15, offset: 14 },
          },
          {
            name: 'b',
            kind: SymbolKind.PARAMETER,
            type: { kind: TypeKind.INTEGER },
            mode: 'IN',
            index: 1,
            declaration: { line: 1, column: 25, offset: 24 },
          },
        ],
        returnType: { kind: TypeKind.INTEGER },
        declaration: { line: 1, column: 1, offset: 0 },
      };

      symbolTable.define(procSymbol);

      const found = symbolTable.lookup('Add');
      expect(found).toBeDefined();
      expect(found?.kind).toBe(SymbolKind.PROCEDURE);

      const proc = found as ProcedureSymbol;
      expect(proc.parameters).toHaveLength(2);
      expect(proc.parameters[0].name).toBe('a');
      expect(proc.parameters[1].name).toBe('b');
    });

    it('should handle multiple nested scopes with same-named symbols', () => {
      const symbolTable = new SymbolTable();

      // Global x
      symbolTable.define({
        name: 'x',
        kind: SymbolKind.VAR,
        type: { kind: TypeKind.INTEGER },
        declaration: { line: 1, column: 1, offset: 0 },
      });

      // Module scope x
      symbolTable.enterScope(ScopeKind.MODULE, 'M');
      symbolTable.define({
        name: 'x',
        kind: SymbolKind.VAR,
        type: { kind: TypeKind.REAL },
        declaration: { line: 5, column: 1, offset: 50 },
      });

      // Procedure scope x
      symbolTable.enterScope(ScopeKind.PROCEDURE, 'P');
      symbolTable.define({
        name: 'x',
        kind: SymbolKind.VAR,
        type: { kind: TypeKind.BOOLEAN },
        declaration: { line: 10, column: 1, offset: 100 },
      });

      // Should find innermost
      let found = symbolTable.lookup('x');
      expect(found?.type.kind).toBe(TypeKind.BOOLEAN);

      symbolTable.exitScope();
      found = symbolTable.lookup('x');
      expect(found?.type.kind).toBe(TypeKind.REAL);

      symbolTable.exitScope();
      found = symbolTable.lookup('x');
      expect(found?.type.kind).toBe(TypeKind.INTEGER);
    });
  });
});
