/**
 * Unit tests for Document Symbols Provider
 */

import { getDocumentSymbols } from './documentSymbols';
import { SymbolKind } from 'vscode-languageserver/node';
import { Lexer } from '../language/lexer';
import { Parser } from '../language/parser';
import type { Module } from '../language/ast';

describe('Document Symbols', () => {
  function parse(code: string): Module {
    const lexer = new Lexer(code.trim());
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  describe('Module Symbols', () => {
    it('should create module symbol for basic module', () => {
      const code = `
DEFINITION MODULE Test;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('Test');
      expect(symbols[0].kind).toBe(SymbolKind.Module);
      expect(symbols[0].children).toBeDefined();
    });

    it('should include module name in symbol', () => {
      const code = `
DEFINITION MODULE FlightManager;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      expect(symbols[0].name).toBe('FlightManager');
    });
  });

  describe('Type Declaration Symbols', () => {
    it('should create symbol for enumeration type', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Color = (RED, GREEN, BLUE);
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      expect(symbols[0].children).toHaveLength(1);
      const typeSymbol = symbols[0].children![0];
      expect(typeSymbol.name).toBe('Color');
      expect(typeSymbol.kind).toBe(SymbolKind.Enum);
    });

    it('should create symbol for object type', () => {
      const code = `
DEFINITION MODULE Test;
TYPE FlightObj = OBJECT
  altitude: INTEGER;
  ASK METHOD GetAltitude: INTEGER;
  TELL METHOD SetAltitude(IN alt: INTEGER);
END OBJECT;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const typeSymbol = symbols[0].children![0];
      expect(typeSymbol.name).toBe('FlightObj');
      expect(typeSymbol.kind).toBe(SymbolKind.Class);
    });

    it('should create symbol for record type', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Point = RECORD
  VAR x: REAL;
  VAR y: REAL;
END RECORD;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const typeSymbol = symbols[0].children![0];
      expect(typeSymbol.name).toBe('Point');
      expect(typeSymbol.kind).toBe(SymbolKind.Struct);
    });

    it('should create symbol for array type', () => {
      const code = `
DEFINITION MODULE Test;
TYPE IntArray = ARRAY [1..10] OF INTEGER;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const typeSymbol = symbols[0].children![0];
      expect(typeSymbol.name).toBe('IntArray');
      expect(typeSymbol.kind).toBe(SymbolKind.Array);
    });
  });

  describe('Object Type Children', () => {
    it('should include fields as children of object type', () => {
      const code = `
DEFINITION MODULE Test;
TYPE FlightObj = OBJECT
  callsign: STRING;
  altitude: INTEGER;
  speed: REAL;
END OBJECT;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const objectSymbol = symbols[0].children![0];
      expect(objectSymbol.children).toBeDefined();
      expect(objectSymbol.children!.length).toBeGreaterThanOrEqual(3);

      const fieldNames = objectSymbol.children!.map(c => c.name);
      expect(fieldNames).toContain('callsign');
      expect(fieldNames).toContain('altitude');
      expect(fieldNames).toContain('speed');

      const fields = objectSymbol.children!.filter(c => c.kind === SymbolKind.Field);
      expect(fields.length).toBe(3);
    });

    it('should include methods as children of object type', () => {
      const code = `
DEFINITION MODULE Test;
TYPE FlightObj = OBJECT
  ASK METHOD GetAltitude: INTEGER;
  TELL METHOD SetAltitude(IN alt: INTEGER);
  ASK METHOD GetSpeed: REAL;
END OBJECT;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const objectSymbol = symbols[0].children![0];
      const methods = objectSymbol.children!.filter(c => c.kind === SymbolKind.Method);

      expect(methods.length).toBe(3);

      const methodNames = methods.map(m => m.name);
      expect(methodNames).toContain('GetAltitude');
      expect(methodNames).toContain('SetAltitude');
      expect(methodNames).toContain('GetSpeed');
    });

    it('should include method type (ASK/TELL) in detail', () => {
      const code = `
DEFINITION MODULE Test;
TYPE FlightObj = OBJECT
  ASK METHOD GetAltitude: INTEGER;
  TELL METHOD SetAltitude(IN alt: INTEGER);
END OBJECT;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const objectSymbol = symbols[0].children![0];
      const methods = objectSymbol.children!.filter(c => c.kind === SymbolKind.Method);

      const getAltitude = methods.find(m => m.name === 'GetAltitude');
      const setAltitude = methods.find(m => m.name === 'SetAltitude');

      expect(getAltitude?.detail).toBe('ASK');
      expect(setAltitude?.detail).toBe('TELL');
    });

    it('should handle object with both fields and methods', () => {
      const code = `
DEFINITION MODULE Test;
TYPE FlightObj = OBJECT
  callsign: STRING;
  altitude: INTEGER;
  ASK METHOD GetCallsign: STRING;
  TELL METHOD SetAltitude(IN alt: INTEGER);
END OBJECT;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const objectSymbol = symbols[0].children![0];
      expect(objectSymbol.children!.length).toBe(4);

      const fields = objectSymbol.children!.filter(c => c.kind === SymbolKind.Field);
      const methods = objectSymbol.children!.filter(c => c.kind === SymbolKind.Method);

      expect(fields.length).toBe(2);
      expect(methods.length).toBe(2);
    });
  });

  describe('Constant Declaration Symbols', () => {
    it('should create symbol for constant', () => {
      const code = `
DEFINITION MODULE Test;
CONST MaxFlights = 100;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      expect(symbols[0].children).toHaveLength(1);
      const constSymbol = symbols[0].children![0];
      expect(constSymbol.name).toBe('MaxFlights');
      expect(constSymbol.kind).toBe(SymbolKind.Constant);
    });

    it('should handle multiple constants', () => {
      const code = `
DEFINITION MODULE Test;
CONST MaxFlights = 100;
CONST MinAltitude = 0;
CONST MaxAltitude = 50000;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      expect(symbols[0].children!.length).toBe(3);

      const constants = symbols[0].children!.filter(c => c.kind === SymbolKind.Constant);
      expect(constants.length).toBe(3);

      const constNames = constants.map(c => c.name);
      expect(constNames).toContain('MaxFlights');
      expect(constNames).toContain('MinAltitude');
      expect(constNames).toContain('MaxAltitude');
    });
  });

  describe('Variable Declaration Symbols', () => {
    it('should create symbol for single variable', () => {
      const code = `
DEFINITION MODULE Test;
VAR counter: INTEGER;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const varSymbol = symbols[0].children!.find(c => c.kind === SymbolKind.Variable);
      expect(varSymbol).toBeDefined();
      expect(varSymbol!.name).toBe('counter');
    });

    it('should create symbol for multiple variables in one declaration', () => {
      const code = `
DEFINITION MODULE Test;
VAR x, y, z: REAL;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const varSymbol = symbols[0].children!.find(c => c.kind === SymbolKind.Variable);
      expect(varSymbol).toBeDefined();
      expect(varSymbol!.name).toBe('x, y, z');
    });

    it('should handle multiple variable declarations', () => {
      const code = `
DEFINITION MODULE Test;
VAR counter: INTEGER;
VAR total: REAL;
VAR active: BOOLEAN;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const variables = symbols[0].children!.filter(c => c.kind === SymbolKind.Variable);
      expect(variables.length).toBe(3);
    });
  });

  describe('Procedure Declaration Symbols', () => {
    it('should create symbol for procedure', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Calculate(IN x: INTEGER): INTEGER;
BEGIN
  RETURN x * 2;
END PROCEDURE;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const procSymbol = symbols[0].children!.find(c => c.kind === SymbolKind.Function);
      expect(procSymbol).toBeDefined();
      expect(procSymbol!.name).toBe('Calculate');
    });

    it('should include parameters as children', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN a: INTEGER; IN b: INTEGER): INTEGER;
BEGIN
  RETURN a + b;
END PROCEDURE;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const procSymbol = symbols[0].children!.find(c => c.kind === SymbolKind.Function);
      expect(procSymbol!.children).toBeDefined();
      expect(procSymbol!.children!.length).toBeGreaterThanOrEqual(2);

      const params = procSymbol!.children!.filter(c => c.kind === SymbolKind.Variable);
      const paramNames = params.map(p => p.name);
      expect(paramNames).toContain('a');
      expect(paramNames).toContain('b');
    });

    it('should include parameter modes in detail', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Swap(INOUT a: INTEGER; INOUT b: INTEGER);
VAR temp: INTEGER;
BEGIN
  temp := a;
  a := b;
  b := temp;
END PROCEDURE;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const procSymbol = symbols[0].children!.find(c => c.kind === SymbolKind.Function);
      const params = procSymbol!.children!.filter(c => c.kind === SymbolKind.Variable && c.detail);

      expect(params.length).toBeGreaterThanOrEqual(2);
      expect(params[0].detail).toBe('INOUT');
      expect(params[1].detail).toBe('INOUT');
    });

    it('should include local declarations as children', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Calculate(): INTEGER;
VAR result: INTEGER;
CONST Factor = 2;
BEGIN
  result := 10 * Factor;
  RETURN result;
END PROCEDURE;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const procSymbol = symbols[0].children!.find(c => c.kind === SymbolKind.Function);
      expect(procSymbol!.children!.length).toBeGreaterThanOrEqual(2);

      const hasVariable = procSymbol!.children!.some(c => c.kind === SymbolKind.Variable && c.name === 'result');
      const hasConstant = procSymbol!.children!.some(c => c.kind === SymbolKind.Constant && c.name === 'Factor');

      expect(hasVariable).toBe(true);
      expect(hasConstant).toBe(true);
    });

    it('should handle procedure without parameters', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Initialize();
BEGIN
END PROCEDURE;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const procSymbol = symbols[0].children!.find(c => c.kind === SymbolKind.Function);
      expect(procSymbol).toBeDefined();
      expect(procSymbol!.name).toBe('Initialize');
      expect(procSymbol!.children).toBeDefined();
    });
  });

  describe('Hierarchical Structure', () => {
    it('should create proper hierarchy for complex module', () => {
      const code = `
DEFINITION MODULE FlightManager;
TYPE FlightObj = OBJECT
  callsign: STRING;
  altitude: INTEGER;
  ASK METHOD GetAltitude: INTEGER;
  TELL METHOD SetAltitude(IN alt: INTEGER);
END OBJECT;
CONST MaxFlights = 100;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      // Module at top level
      expect(symbols).toHaveLength(1);
      expect(symbols[0].kind).toBe(SymbolKind.Module);

      // Type and const at module level
      expect(symbols[0].children!.length).toBe(2);

      const typeSymbol = symbols[0].children![0];
      const constSymbol = symbols[0].children![1];

      expect(typeSymbol.kind).toBe(SymbolKind.Class);
      expect(constSymbol.kind).toBe(SymbolKind.Constant);

      // Fields and methods under object type
      expect(typeSymbol.children!.length).toBe(4);
    });

    it('should maintain correct nesting levels', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE OuterProc();
VAR outerVar: INTEGER;
BEGIN
END PROCEDURE;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const outerProc = symbols[0].children!.find(c => c.name === 'OuterProc');
      expect(outerProc).toBeDefined();

      // Outer procedure should have variable
      const hasOuterVar = outerProc!.children!.some(c => c.name === 'outerVar');
      expect(hasOuterVar).toBe(true);
    });
  });

  describe('Position Information', () => {
    it('should include range for all symbols', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Color = (RED, GREEN, BLUE);
CONST MaxValue = 100;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      // Module range
      expect(symbols[0].range).toBeDefined();
      expect(symbols[0].range.start.line).toBeGreaterThanOrEqual(0);
      expect(symbols[0].range.end.line).toBeGreaterThanOrEqual(symbols[0].range.start.line);

      // Type range
      const typeSymbol = symbols[0].children![0];
      expect(typeSymbol.range).toBeDefined();

      // Const range
      const constSymbol = symbols[0].children![1];
      expect(constSymbol.range).toBeDefined();
    });

    it('should include selection range for all symbols', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Color = (RED, GREEN, BLUE);
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      expect(symbols[0].selectionRange).toBeDefined();
      expect(symbols[0].children![0].selectionRange).toBeDefined();
    });

    it('should have LSP 0-based positions', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Color = (RED, GREEN, BLUE);
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      // LSP uses 0-based line and character numbers
      expect(symbols[0].range.start.line).toBeGreaterThanOrEqual(0);
      expect(symbols[0].range.start.character).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty module', () => {
      const code = `
DEFINITION MODULE Empty;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      expect(symbols).toHaveLength(1);
      expect(symbols[0].children).toHaveLength(0);
    });

    it('should handle object with no fields or methods', () => {
      const code = `
DEFINITION MODULE Test;
TYPE EmptyObj = OBJECT
END OBJECT;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const objectSymbol = symbols[0].children![0];
      expect(objectSymbol.children).toBeDefined();
      expect(objectSymbol.children!.length).toBe(0);
    });

    it('should handle procedure with no parameters or locals', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE DoNothing();
BEGIN
END PROCEDURE;
END MODULE;
      `;

      const ast = parse(code);
      const symbols = getDocumentSymbols(ast);

      const procSymbol = symbols[0].children!.find(c => c.kind === SymbolKind.Function);
      expect(procSymbol).toBeDefined();
      expect(procSymbol!.children).toBeDefined();
    });
  });
});
