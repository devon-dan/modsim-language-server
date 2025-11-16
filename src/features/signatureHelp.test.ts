/**
 * Unit tests for Signature Help Provider
 */

import { getSignatureHelp } from './signatureHelp';
import { Lexer } from '../language/lexer';
import { Parser } from '../language/parser';
import { SemanticAnalyzer } from '../language/analyzer';
import type { Module } from '../language/ast';

describe('Signature Help', () => {
  function parseAndAnalyze(code: string): { ast: Module; analyzer: SemanticAnalyzer } {
    const lexer = new Lexer(code.trim());
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const analyzer = new SemanticAnalyzer();
    analyzer.analyze(ast);
    return { ast, analyzer };
  }

  describe('Procedure Calls', () => {
    it('should provide signature help for procedure with no parameters', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Initialize();
BEGIN
END PROCEDURE;

PROCEDURE Main();
BEGIN
  Initialize();
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position inside the call: Initialize(|) - line 8 in code, 0-based = 7
      const help = getSignatureHelp(ast, symbolTable, 7, 14);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures).toHaveLength(1);
        expect(help.signatures[0].label).toContain('PROCEDURE Initialize');
        expect(help.signatures[0].label).toContain('()');
        expect(help.activeSignature).toBe(0);
      }
    });

    it('should provide signature help for procedure with parameters', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN a: INTEGER; IN b: INTEGER): INTEGER;
BEGIN
  RETURN a + b;
END PROCEDURE;

PROCEDURE Main();
VAR result: INTEGER;
BEGIN
  result := Add(10, 20);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position inside the call: Add(|10, 20) - line 10 (1-based) = line 9 (0-based)
      const help = getSignatureHelp(ast, symbolTable, 9, 16);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures).toHaveLength(1);
        expect(help.signatures[0].label).toContain('PROCEDURE Add');
        expect(help.signatures[0].parameters).toHaveLength(2);
        expect(help.signatures[0].parameters![0].label).toContain('IN a: INTEGER');
        expect(help.signatures[0].parameters![1].label).toContain('IN b: INTEGER');
      }
    });

    it('should highlight first parameter when cursor is on first argument', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN a: INTEGER; IN b: INTEGER): INTEGER;
BEGIN
  RETURN a + b;
END PROCEDURE;

PROCEDURE Main();
BEGIN
  Add(10, 20);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on first argument: Add(1|0, 20) - line 9 (1-based) = line 8 (0-based), char 7
      const help = getSignatureHelp(ast, symbolTable, 8, 7);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.activeParameter).toBe(0);
      }
    });

    it('should highlight second parameter when cursor is on second argument', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN a: INTEGER; IN b: INTEGER): INTEGER;
BEGIN
  RETURN a + b;
END PROCEDURE;

PROCEDURE Main();
BEGIN
  Add(10, 20);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on second argument: Add(10, 2|0) - line 9 (1-based) = line 8 (0-based), char 11
      const help = getSignatureHelp(ast, symbolTable, 8, 11);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.activeParameter).toBe(1);
      }
    });

    it('should include parameter documentation', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Calculate(IN value: REAL; INOUT result: REAL);
BEGIN
  result := value * 2.0;
END PROCEDURE;

PROCEDURE Main();
VAR x: REAL;
BEGIN
  Calculate(5.0, x);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      const help = getSignatureHelp(ast, symbolTable, 9, 15);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures[0].parameters).toHaveLength(2);
        expect(help.signatures[0].parameters![0].documentation).toBeDefined();
        expect(help.signatures[0].parameters![1].documentation).toBeDefined();
      }
    });

    it('should show return type in signature', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE GetValue(): INTEGER;
BEGIN
  RETURN 42;
END PROCEDURE;

PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  x := GetValue();
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position inside GetValue() call - line 10 (1-based) = line 9 (0-based), char 16
      const help = getSignatureHelp(ast, symbolTable, 9, 16);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures[0].label).toContain('INTEGER');
      }
    });
  });

  describe('Method Calls', () => {
    it('should provide signature help for ASK method', () => {
      const code = `
IMPLEMENTATION MODULE Test;
OBJECT Counter;
  VAR count: INTEGER;
  ASK METHOD GetCount: INTEGER;
  BEGIN
    RETURN count;
  END METHOD;
END OBJECT;

PROCEDURE Main();
VAR c: Counter;
VAR value: INTEGER;
BEGIN
  ASK c TO GetCount RETURNING value;
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on method name: ASK c TO GetCount - line 14 (1-based) = line 13 (0-based), char 14
      const help = getSignatureHelp(ast, symbolTable, 13, 14);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures).toHaveLength(1);
        expect(help.signatures[0].label).toContain('ASK METHOD');
        expect(help.signatures[0].label).toContain('GetCount');
      }
    });

    it('should provide signature help for TELL method', () => {
      const code = `
IMPLEMENTATION MODULE Test;
OBJECT Counter;
  VAR count: INTEGER;
  TELL METHOD SetCount(IN value: INTEGER);
  BEGIN
    count := value;
  END METHOD;
END OBJECT;

PROCEDURE Main();
VAR c: Counter;
BEGIN
  TELL c TO SetCount(42);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on argument: TELL c TO SetCount(42) - line 13 (1-based) = line 12 (0-based), char 21
      const help = getSignatureHelp(ast, symbolTable, 12, 21);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures).toHaveLength(1);
        expect(help.signatures[0].label).toContain('TELL METHOD');
        expect(help.signatures[0].label).toContain('SetCount');
      }
    });

    it('should show method parameters', () => {
      const code = `
IMPLEMENTATION MODULE Test;
OBJECT Calculator;
  TELL METHOD Add(IN a: INTEGER; IN b: INTEGER; OUT result: INTEGER);
  BEGIN
    result := a + b;
  END METHOD;
END OBJECT;

PROCEDURE Main();
VAR calc: Calculator;
VAR r: INTEGER;
BEGIN
  TELL calc TO Add(10, 20, r);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on first argument: TELL calc TO Add(10, 20, r) - line 13 (1-based) = line 12 (0-based), char 20
      const help = getSignatureHelp(ast, symbolTable, 12, 20);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures[0].parameters).toHaveLength(3);
        expect(help.signatures[0].parameters![0].label).toContain('IN a');
        expect(help.signatures[0].parameters![1].label).toContain('IN b');
        expect(help.signatures[0].parameters![2].label).toContain('OUT result');
      }
    });

    it('should distinguish between ASK and TELL methods', () => {
      const code = `
IMPLEMENTATION MODULE Test;
OBJECT Counter;
  VAR count: INTEGER;
  ASK METHOD GetCount: INTEGER;
  BEGIN
    RETURN count;
  END METHOD;

  TELL METHOD Increment();
  BEGIN
    count := count + 1;
  END METHOD;
END OBJECT;

PROCEDURE Main();
VAR c: Counter;
VAR v: INTEGER;
BEGIN
  ASK c TO GetCount RETURNING v;
  TELL c TO Increment();
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // ASK c TO GetCount - line 19 (1-based) = line 18 (0-based), char 14
      const askHelp = getSignatureHelp(ast, symbolTable, 18, 14);
      // TELL c TO Increment() - line 20 (1-based) = line 19 (0-based), char 16
      const tellHelp = getSignatureHelp(ast, symbolTable, 19, 16);

      expect(askHelp).not.toBeNull();
      expect(tellHelp).not.toBeNull();

      if (askHelp && tellHelp) {
        expect(askHelp.signatures[0].label).toContain('ASK METHOD');
        expect(tellHelp.signatures[0].label).toContain('TELL METHOD');
      }
    });
  });

  describe('Parameter Modes', () => {
    it('should show IN parameter mode', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Process(IN data: INTEGER);
BEGIN
END PROCEDURE;

PROCEDURE Main();
BEGIN
  Process(42);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      const help = getSignatureHelp(ast, symbolTable, 7, 11);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures[0].parameters![0].label).toContain('IN');
      }
    });

    it('should show OUT parameter mode', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE GetValue(OUT result: INTEGER);
BEGIN
  result := 42;
END PROCEDURE;

PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  GetValue(x);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      const help = getSignatureHelp(ast, symbolTable, 9, 12);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures[0].parameters![0].label).toContain('OUT');
      }
    });

    it('should show INOUT parameter mode', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Swap(INOUT a: INTEGER; INOUT b: INTEGER);
VAR temp: INTEGER;
BEGIN
  temp := a;
  a := b;
  b := temp;
END PROCEDURE;

PROCEDURE Main();
VAR x, y: INTEGER;
BEGIN
  Swap(x, y);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      const help = getSignatureHelp(ast, symbolTable, 12, 8);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures[0].parameters![0].label).toContain('INOUT');
        expect(help.signatures[0].parameters![1].label).toContain('INOUT');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should return null when not in a call expression', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  x := 42;
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on assignment, not in call
      const help = getSignatureHelp(ast, symbolTable, 4, 5);

      expect(help).toBeNull();
    });

    it('should return null for undefined procedure', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
BEGIN
  UnknownProc();
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      const help = getSignatureHelp(ast, symbolTable, 3, 15);

      expect(help).toBeNull();
    });

    it('should handle procedure with no return type', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE DoSomething();
BEGIN
END PROCEDURE;

PROCEDURE Main();
BEGIN
  DoSomething();
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      const help = getSignatureHelp(ast, symbolTable, 7, 15);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures[0].label).toContain('PROCEDURE DoSomething');
        expect(help.signatures[0].label).toContain('()');
      }
    });

    it('should handle cursor at end of parameter list', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN a: INTEGER; IN b: INTEGER): INTEGER;
BEGIN
  RETURN a + b;
END PROCEDURE;

PROCEDURE Main();
BEGIN
  Add(10, 20);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position after last argument: Add(10, 20|) - line 9 (1-based) = line 8 (0-based), char 12
      const help = getSignatureHelp(ast, symbolTable, 8, 12);

      expect(help).not.toBeNull();
      if (help) {
        // Should highlight last parameter or beyond
        expect(help.activeParameter).toBeGreaterThanOrEqual(1);
      }
    });

    it('should handle nested calls', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Inner(IN x: INTEGER): INTEGER;
BEGIN
  RETURN x * 2;
END PROCEDURE;

PROCEDURE Outer(IN y: INTEGER): INTEGER;
BEGIN
  RETURN y + 1;
END PROCEDURE;

PROCEDURE Main();
BEGIN
  Outer(Inner(5));
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position in inner call: Outer(Inner(5|)) - line 14 (1-based) = line 13 (0-based), char 14
      const help = getSignatureHelp(ast, symbolTable, 13, 14);

      expect(help).not.toBeNull();
      if (help) {
        // Should show Inner's signature
        expect(help.signatures[0].label).toContain('Inner');
      }
    });
  });

  describe('Signature Documentation', () => {
    it('should include signature documentation', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Calculate(IN value: REAL): REAL;
BEGIN
  RETURN value * 2.0;
END PROCEDURE;

PROCEDURE Main();
BEGIN
  Calculate(3.14);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      const help = getSignatureHelp(ast, symbolTable, 8, 13);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures[0].documentation).toBeDefined();
      }
    });

    it('should indicate method vs procedure in documentation', () => {
      const code = `
IMPLEMENTATION MODULE Test;
OBJECT Counter;
  VAR count: INTEGER;
  ASK METHOD GetCount: INTEGER;
  BEGIN
    RETURN count;
  END METHOD;
END OBJECT;

PROCEDURE Main();
VAR c: Counter;
VAR v: INTEGER;
BEGIN
  ASK c TO GetCount RETURNING v;
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on method name: ASK c TO GetCount - line 14 (1-based) = line 13 (0-based), char 14
      const help = getSignatureHelp(ast, symbolTable, 13, 14);

      expect(help).not.toBeNull();
      if (help) {
        const doc = help.signatures[0].documentation;
        expect(doc).toBeDefined();
        if (doc && typeof doc === 'object' && 'value' in doc) {
          expect(doc.value).toContain('method');
        }
      }
    });
  });

  describe('Complex Parameter Types', () => {
    it('should handle array parameters', () => {
      const code = `
IMPLEMENTATION MODULE Test;
TYPE IntArray = ARRAY [1..10] OF INTEGER;

PROCEDURE ProcessArray(IN arr: IntArray);
BEGIN
END PROCEDURE;

PROCEDURE Main();
VAR myArray: IntArray;
BEGIN
  ProcessArray(myArray);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      const help = getSignatureHelp(ast, symbolTable, 10, 18);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures[0].parameters).toHaveLength(1);
        expect(help.signatures[0].parameters![0].label).toContain('arr');
        expect(help.signatures[0].parameters![0].label).toContain('IN');
      }
    });

    it('should handle record parameters', () => {
      const code = `
IMPLEMENTATION MODULE Test;
TYPE Point = RECORD
  VAR x: REAL;
  VAR y: REAL;
END RECORD;

PROCEDURE DrawPoint(IN p: Point);
BEGIN
END PROCEDURE;

PROCEDURE Main();
VAR pt: Point;
BEGIN
  DrawPoint(pt);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      const help = getSignatureHelp(ast, symbolTable, 13, 13);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures[0].parameters).toHaveLength(1);
        expect(help.signatures[0].parameters![0].label).toContain('p');
        expect(help.signatures[0].parameters![0].label).toContain('IN');
      }
    });

    it('should handle object type parameters', () => {
      const code = `
IMPLEMENTATION MODULE Test;
TYPE FlightObj = OBJECT
  id: INTEGER;
END OBJECT;

PROCEDURE ProcessFlight(IN flight: FlightObj);
BEGIN
END PROCEDURE;

PROCEDURE Main();
VAR f: FlightObj;
BEGIN
  ProcessFlight(f);
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      const help = getSignatureHelp(ast, symbolTable, 12, 18);

      expect(help).not.toBeNull();
      if (help) {
        expect(help.signatures[0].parameters).toHaveLength(1);
        expect(help.signatures[0].parameters![0].label).toContain('flight');
        expect(help.signatures[0].parameters![0].label).toContain('IN');
      }
    });
  });
});
