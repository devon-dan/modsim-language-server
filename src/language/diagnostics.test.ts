/**
 * Unit tests for Diagnostics
 */

import { Lexer } from './lexer';
import { Parser } from './parser';
import { SemanticAnalyzer } from './analyzer';
import type { Module } from './ast';
import { DiagnosticSeverity } from './diagnostics';

describe('Diagnostics', () => {
  function parseAndAnalyze(code: string): { ast: Module; diagnostics: any[] } {
    const lexer = new Lexer(code.trim());
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const analyzer = new SemanticAnalyzer();
    const diagnostics = analyzer.analyze(ast);
    return { ast, diagnostics };
  }

  describe('Semantic Error Detection', () => {
    describe('Duplicate Definitions', () => {
      it('should detect duplicate type definitions', () => {
        const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
TYPE Age = REAL;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const duplicateError = diagnostics.find(d =>
          d.message.includes('already defined')
        );
        expect(duplicateError).toBeDefined();
        expect(duplicateError?.severity).toBe(DiagnosticSeverity.Error);
      });

      it('should detect duplicate constant definitions', () => {
        const code = `
DEFINITION MODULE Test;
CONST MaxSize = 100;
CONST MaxSize = 200;
TYPE Dummy = INTEGER;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const duplicateError = diagnostics.find(d =>
          d.message.includes('already defined')
        );
        expect(duplicateError).toBeDefined();
      });

      it('should detect duplicate variable definitions', () => {
        const code = `
DEFINITION MODULE Test;
VAR count: INTEGER;
VAR count: REAL;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const duplicateError = diagnostics.find(d =>
          d.message.includes('already defined')
        );
        expect(duplicateError).toBeDefined();
      });

      it('should detect duplicate procedure definitions', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE DoWork;
BEGIN
END PROCEDURE;
PROCEDURE DoWork;
BEGIN
END PROCEDURE;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const duplicateError = diagnostics.find(d =>
          d.message.includes('already defined')
        );
        expect(duplicateError).toBeDefined();
      });
    });

    describe('Type Errors', () => {
      it('should detect non-boolean IF condition', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
VAR x: INTEGER;
BEGIN
  IF x THEN
  END IF;
END PROCEDURE;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const typeError = diagnostics.find(d =>
          d.message.includes('condition must be BOOLEAN')
        );
        expect(typeError).toBeDefined();
      });

      it('should detect non-boolean ELSIF condition', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
VAR x: INTEGER;
VAR flag: BOOLEAN;
BEGIN
  IF flag THEN
  ELSIF x THEN
  END IF;
END PROCEDURE;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const typeError = diagnostics.find(d =>
          d.message.includes('ELSIF condition must be BOOLEAN')
        );
        expect(typeError).toBeDefined();
      });

      it('should detect non-boolean WHILE condition', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
VAR x: INTEGER;
BEGIN
  WHILE x DO
  END WHILE;
END PROCEDURE;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const typeError = diagnostics.find(d =>
          d.message.includes('WHILE condition must be BOOLEAN')
        );
        expect(typeError).toBeDefined();
      });

      it('should detect unknown type references', () => {
        const code = `
DEFINITION MODULE Test;
VAR count: UnknownType;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const typeError = diagnostics.find(d =>
          d.message.includes('Unknown type')
        );
        expect(typeError).toBeDefined();
      });
    });

    describe('Undefined Symbols', () => {
      it('should detect undefined variables', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  undefinedVar := 5;
END PROCEDURE;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const undefinedError = diagnostics.find(d =>
          d.message.includes('Undefined identifier')
        );
        expect(undefinedError).toBeDefined();
      });
    });

    describe('MODSIM-Specific Errors', () => {
      it('should detect WAIT statement in ASK method', () => {
        const code = `
IMPLEMENTATION MODULE Test;
TYPE Counter = OBJECT
  count: INTEGER;
  ASK METHOD GetCount: INTEGER;
END OBJECT;

OBJECT Counter;
  ASK METHOD GetCount: INTEGER;
  BEGIN
    WAIT DURATION 5.0;
    RETURN count;
  END METHOD;
END OBJECT;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const waitError = diagnostics.find(d =>
          d.message.includes('WAIT statement is not allowed in ASK methods')
        );
        expect(waitError).toBeDefined();
      });

      it('should detect TELL method with RETURN value', () => {
        const code = `
IMPLEMENTATION MODULE Test;
TYPE Counter = OBJECT
  count: INTEGER;
  TELL METHOD Increment;
END OBJECT;

OBJECT Counter;
  TELL METHOD Increment;
  BEGIN
    count := count + 1;
    RETURN count;
  END METHOD;
END OBJECT;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const tellError = diagnostics.find(d =>
          d.message.includes('TELL methods cannot return values')
        );
        expect(tellError).toBeDefined();
      });

      it('should detect RETURN statement outside procedure', () => {
        const code = `
IMPLEMENTATION MODULE Test;
VAR x: INTEGER;
BEGIN
  RETURN 5;
END MODULE;
        `;

        // This should throw a parse error since BEGIN...END is not valid at module level
        // But if we had initialization blocks, this test would be relevant
        expect(() => parseAndAnalyze(code)).toThrow();
      });

      it('should detect TELL method with OUT parameter', () => {
        const code = `
IMPLEMENTATION MODULE Test;
TYPE Counter = OBJECT
  count: INTEGER;
  TELL METHOD SetValue;
END OBJECT;

OBJECT Counter;
  TELL METHOD SetValue(OUT value: INTEGER);
  BEGIN
    count := value;
  END METHOD;
END OBJECT;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const paramModeError = diagnostics.find(d =>
          d.message.includes('TELL methods can only have IN parameters')
        );
        expect(paramModeError).toBeDefined();
      });

      it('should detect TELL method with INOUT parameter', () => {
        const code = `
IMPLEMENTATION MODULE Test;
TYPE Counter = OBJECT
  count: INTEGER;
  TELL METHOD Process;
END OBJECT;

OBJECT Counter;
  TELL METHOD Process(INOUT data: INTEGER);
  BEGIN
    count := data;
  END METHOD;
END OBJECT;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const paramModeError = diagnostics.find(d =>
          d.message.includes('TELL methods can only have IN parameters')
        );
        expect(paramModeError).toBeDefined();
      });

      it('should allow ASK method with OUT/INOUT parameters', () => {
        const code = `
IMPLEMENTATION MODULE Test;
TYPE Counter = OBJECT
  count: INTEGER;
  ASK METHOD GetAndReset: INTEGER;
END OBJECT;

OBJECT Counter;
  ASK METHOD GetAndReset(OUT oldValue: INTEGER): INTEGER;
  BEGIN
    oldValue := count;
    count := 0;
    RETURN oldValue;
  END METHOD;
END OBJECT;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        // Should not report parameter mode error for ASK methods
        const paramModeError = diagnostics.find(d =>
          d.message.includes('can only have IN parameters')
        );
        expect(paramModeError).toBeUndefined();
      });
    });

    describe('OVERRIDE Validation', () => {
      it('should detect missing OVERRIDE keyword when overriding base method', () => {
        const code = `
IMPLEMENTATION MODULE Test;
TYPE Base = OBJECT
  ASK METHOD GetValue: INTEGER;
END OBJECT;

TYPE Derived = OBJECT (Base)
END OBJECT;

OBJECT Derived (Base);
  ASK METHOD GetValue: INTEGER;
  BEGIN
    RETURN 42;
  END METHOD;
END OBJECT;
END MODULE;
        `;

        const {diagnostics} = parseAndAnalyze(code);

        const overrideError = diagnostics.find(d =>
          d.message.includes("overrides a base class method and must be marked with OVERRIDE")
        );
        expect(overrideError).toBeDefined();
      });

      it('should detect incorrect OVERRIDE keyword when not overriding', () => {
        const code = `
IMPLEMENTATION MODULE Test;
TYPE Base = OBJECT
  ASK METHOD GetValue: INTEGER;
END OBJECT;

TYPE Derived = OBJECT (Base)
END OBJECT;

OBJECT Derived (Base);
  ASK OVERRIDE METHOD GetOtherValue: INTEGER;
  BEGIN
    RETURN 42;
  END METHOD;
END OBJECT;
END MODULE;
        `;

        const {diagnostics} = parseAndAnalyze(code);

        const overrideError = diagnostics.find(d =>
          d.message.includes("marked with OVERRIDE but does not override any base class method")
        );
        expect(overrideError).toBeDefined();
      });

      it('should allow OVERRIDE when correctly overriding base method', () => {
        const code = `
IMPLEMENTATION MODULE Test;
TYPE Base = OBJECT
  ASK METHOD GetValue: INTEGER;
END OBJECT;

TYPE Derived = OBJECT (Base)
END OBJECT;

OBJECT Derived (Base);
  ASK OVERRIDE METHOD GetValue: INTEGER;
  BEGIN
    RETURN 42;
  END METHOD;
END OBJECT;
END MODULE;
        `;

        const {diagnostics} = parseAndAnalyze(code);

        const overrideError = diagnostics.find(d =>
          d.message.includes("OVERRIDE")
        );
        expect(overrideError).toBeUndefined();
      });

      it('should detect OVERRIDE used without base types', () => {
        const code = `
IMPLEMENTATION MODULE Test;
TYPE MyObject = OBJECT
END OBJECT;

OBJECT MyObject;
  ASK OVERRIDE METHOD GetValue: INTEGER;
  BEGIN
    RETURN 42;
  END METHOD;
END OBJECT;
END MODULE;
        `;

        const {diagnostics} = parseAndAnalyze(code);

        const overrideError = diagnostics.find(d =>
          d.message.includes("marked with OVERRIDE but type") &&
          d.message.includes("has no base types")
        );
        expect(overrideError).toBeDefined();
      });
    });

    describe('Object-Oriented Errors', () => {
      it('should detect base type not found', () => {
        const code = `
DEFINITION MODULE Test;
TYPE Derived = OBJECT (UnknownBase)
  field: INTEGER;
END OBJECT;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const baseError = diagnostics.find(d =>
          d.message.includes('Base type') && d.message.includes('not found')
        );
        expect(baseError).toBeDefined();
      });

      it('should detect non-object base type', () => {
        const code = `
DEFINITION MODULE Test;
TYPE MyInt = INTEGER;
TYPE Derived = OBJECT (MyInt)
  field: INTEGER;
END OBJECT;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        expect(diagnostics.length).toBeGreaterThan(0);
        const baseError = diagnostics.find(d =>
          d.message.includes('is not an OBJECT type')
        );
        expect(baseError).toBeDefined();
      });
    });
  });

  describe('Valid Code - No Errors', () => {
    it('should not report errors for valid DEFINITION MODULE', () => {
      const code = `
DEFINITION MODULE Test;
CONST MaxSize = 100;
TYPE Age = INTEGER;
VAR count: INTEGER;
END MODULE;
      `;

      const { diagnostics } = parseAndAnalyze(code);

      expect(diagnostics.length).toBe(0);
    });

    it('should not report errors for valid IMPLEMENTATION MODULE', () => {
      const code = `
IMPLEMENTATION MODULE Test;
VAR count: INTEGER;
PROCEDURE Init;
BEGIN
  count := 0;
END PROCEDURE;
END MODULE;
      `;

      const { diagnostics } = parseAndAnalyze(code);

      expect(diagnostics.length).toBe(0);
    });

    it('should not report errors for valid OBJECT', () => {
      const code = `
IMPLEMENTATION MODULE Test;
TYPE Counter = OBJECT
  count: INTEGER;
  ASK METHOD GetCount: INTEGER;
  TELL METHOD Increment;
END OBJECT;

OBJECT Counter;
  ASK METHOD GetCount: INTEGER;
  BEGIN
    RETURN count;
  END METHOD;

  TELL METHOD Increment;
  BEGIN
    count := count + 1;
  END METHOD;
END OBJECT;
END MODULE;
      `;

      const { diagnostics } = parseAndAnalyze(code);

      expect(diagnostics.length).toBe(0);
    });

    it('should not report errors for boolean conditions', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
VAR flag: BOOLEAN;
VAR count: INTEGER;
BEGIN
  flag := TRUE;
  IF flag THEN
    count := 1;
  ELSIF NOT flag THEN
    count := 2;
  ELSE
    count := 3;
  END IF;

  WHILE flag DO
    flag := FALSE;
  END WHILE;
END PROCEDURE;
END MODULE;
      `;

      const { diagnostics } = parseAndAnalyze(code);

      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Syntax Errors', () => {
    describe('Lowercase Keywords', () => {
      it('should detect lowercase MODULE keyword', () => {
        const code = `
module Test;
END MODULE;
        `;

        // This will fail during tokenization, so we need to test the lexer directly
        const lexer = new Lexer(code.trim());
        const tokens = lexer.tokenize();

        // Check for ERROR token
        const errorToken = tokens.find(t => t.type === 'ERROR');
        expect(errorToken).toBeDefined();
        expect(errorToken?.value).toContain('MODULE');
        expect(errorToken?.value).toContain('module');
      });

      it('should detect lowercase PROCEDURE keyword', () => {
        const code = 'procedure Test;';

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const errorToken = tokens.find(t => t.type === 'ERROR');
        expect(errorToken).toBeDefined();
        expect(errorToken?.value).toContain('PROCEDURE');
        expect(errorToken?.value).toContain('procedure');
      });

      it('should detect mixed-case keywords', () => {
        const code = 'BeGiN';

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const errorToken = tokens.find(t => t.type === 'ERROR');
        expect(errorToken).toBeDefined();
        expect(errorToken?.value).toContain('BEGIN');
        expect(errorToken?.value).toContain('BeGiN');
      });

      it('should allow valid uppercase keywords', () => {
        const code = 'BEGIN END';

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const errorTokens = tokens.filter(t => t.type === 'ERROR');
        expect(errorTokens.length).toBe(0);
      });
    });
  });

  describe('Diagnostic Structure', () => {
    it('should include severity in diagnostics', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
TYPE Age = REAL;
END MODULE;
      `;

      const { diagnostics } = parseAndAnalyze(code);

      expect(diagnostics.length).toBeGreaterThan(0);
      diagnostics.forEach(d => {
        expect(d.severity).toBeDefined();
        expect([
          DiagnosticSeverity.Error,
          DiagnosticSeverity.Warning,
          DiagnosticSeverity.Information,
          DiagnosticSeverity.Hint
        ]).toContain(d.severity);
      });
    });

    it('should include message in diagnostics', () => {
      const code = `
DEFINITION MODULE Test;
VAR count: UnknownType;
END MODULE;
      `;

      const { diagnostics } = parseAndAnalyze(code);

      expect(diagnostics.length).toBeGreaterThan(0);
      diagnostics.forEach(d => {
        expect(d.message).toBeDefined();
        expect(typeof d.message).toBe('string');
        expect(d.message.length).toBeGreaterThan(0);
      });
    });

    it('should include position information in diagnostics', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
TYPE Age = REAL;
END MODULE;
      `;

      const { diagnostics } = parseAndAnalyze(code);

      expect(diagnostics.length).toBeGreaterThan(0);
      diagnostics.forEach(d => {
        expect(d.start).toBeDefined();
        expect(d.end).toBeDefined();
        expect(d.start.line).toBeGreaterThan(0);
        expect(d.start.column).toBeGreaterThan(0);
        expect(d.end.line).toBeGreaterThan(0);
        expect(d.end.column).toBeGreaterThan(0);
      });
    });
  });

  describe('Warnings', () => {
    describe('Unused Variables', () => {
      it('should warn about unused local variables', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE TestProc;
VAR x: INTEGER;
VAR y: INTEGER;
BEGIN
  x := 5;
END PROCEDURE;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        const unusedWarning = diagnostics.find(d =>
          d.message.includes("Variable 'y' is declared but never used") &&
          d.severity === DiagnosticSeverity.Warning
        );
        expect(unusedWarning).toBeDefined();

        // x should not generate a warning since it's used
        const xWarning = diagnostics.find(d =>
          d.message.includes("Variable 'x'")
        );
        expect(xWarning).toBeUndefined();
      });

      it('should warn about unused parameters', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE TestProc(IN x: INTEGER; IN y: INTEGER);
BEGIN
  x := x + 1;
END PROCEDURE;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        const unusedParam = diagnostics.find(d =>
          d.message.includes("Parameter 'y' is declared but never used") &&
          d.severity === DiagnosticSeverity.Warning
        );
        expect(unusedParam).toBeDefined();
      });

      it('should not warn about used variables', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE TestProc;
VAR count: INTEGER;
BEGIN
  count := 0;
  count := count + 1;
END PROCEDURE;
END MODULE;
        `;

        const { diagnostics } = parseAndAnalyze(code);

        const unusedWarning = diagnostics.find(d =>
          d.message.includes('is declared but never used')
        );
        expect(unusedWarning).toBeUndefined();
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should detect multiple errors in complex module', () => {
      const code = `
IMPLEMENTATION MODULE Test;
TYPE Age = INTEGER;
TYPE Age = REAL;
VAR count: UnknownType;
VAR flag: BOOLEAN;
PROCEDURE Test;
VAR x: INTEGER;
BEGIN
  IF x THEN
    undefinedVar := 5;
  END IF;
END PROCEDURE;
END MODULE;
      `;

      const { diagnostics } = parseAndAnalyze(code);

      // Should detect:
      // 1. Duplicate type 'Age'
      // 2. Unknown type 'UnknownType'
      // 3. Non-boolean IF condition
      // 4. Undefined identifier 'undefinedVar'
      expect(diagnostics.length).toBeGreaterThanOrEqual(3);
    });
  });
});
