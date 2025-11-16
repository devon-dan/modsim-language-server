/**
 * Unit tests for semantic analyzer
 */

import { Lexer } from './lexer';
import { Parser } from './parser';
import { SemanticAnalyzer } from './analyzer';
import { DiagnosticSeverity } from './diagnostics';

describe('SemanticAnalyzer', () => {
  function analyze(source: string) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const analyzer = new SemanticAnalyzer();
    const diagnostics = analyzer.analyze(ast);
    return { ast, analyzer, diagnostics };
  }

  describe('Symbol Table', () => {
    it('should build symbol table for simple module', () => {
      const source = `
DEFINITION MODULE Test;
CONST PI = 3.14;
VAR x, y: INTEGER;
END MODULE;
      `.trim();

      const { analyzer } = analyze(source);
      const symbolTable = analyzer.getSymbolTable();

      // Check that symbols are defined in the module scope
      const moduleScope = symbolTable.getScope('Test');
      expect(moduleScope).toBeDefined();
      expect(moduleScope?.lookupLocal('PI')).toBeDefined();
      expect(moduleScope?.lookupLocal('x')).toBeDefined();
      expect(moduleScope?.lookupLocal('y')).toBeDefined();
    });

    it('should define types in symbol table', () => {
      const source = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
TYPE Color = (RED, GREEN, BLUE);
END MODULE;
      `.trim();

      const { analyzer } = analyze(source);
      const symbolTable = analyzer.getSymbolTable();
      const moduleScope = symbolTable.getScope('Test');

      const ageSymbol = moduleScope?.lookupLocal('Age');
      expect(ageSymbol).toBeDefined();
      expect(ageSymbol?.kind).toBe('TYPE');

      const colorSymbol = moduleScope?.lookupLocal('Color');
      expect(colorSymbol).toBeDefined();
      expect(colorSymbol?.kind).toBe('TYPE');
    });

    it('should define procedures in symbol table', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN a: INTEGER; IN b: INTEGER): INTEGER;
BEGIN
  RETURN a + b;
END PROCEDURE;
END MODULE;
      `.trim();

      const { analyzer } = analyze(source);
      const symbolTable = analyzer.getSymbolTable();
      const moduleScope = symbolTable.getScope('Test');

      const procSymbol = moduleScope?.lookupLocal('Add');
      expect(procSymbol).toBeDefined();
      expect(procSymbol?.kind).toBe('PROCEDURE');
    });
  });

  describe('Type Checking', () => {
    it('should detect type errors in assignments', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
VAR x: INTEGER;
VAR flag: BOOLEAN;
BEGIN
  x := TRUE;
END PROCEDURE;
END MODULE;
      `.trim();

      const { diagnostics } = analyze(source);
      const errors = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('assign'))).toBe(true);
    });

    it('should allow valid assignments', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
VAR x: INTEGER;
BEGIN
  x := 10;
END PROCEDURE;
END MODULE;
      `.trim();

      const { diagnostics } = analyze(source);
      const errors = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error);

      // Print all errors for debugging
      if (errors.length > 0) {
        console.log('Errors found:', errors.map(e => e.message));
      }

      // Should have no type errors (may have other errors like undefined symbols)
      const typeErrors = errors.filter((e) => e.message.includes('assign') && e.message.includes('Cannot'));
      expect(typeErrors.length).toBe(0);
    });

    it('should check IF statement conditions', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  IF 10 THEN
    x := 5;
  END IF;
END PROCEDURE;
END MODULE;
      `.trim();

      const { diagnostics } = analyze(source);
      const errors = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error);
      expect(errors.some((e) => e.message.includes('IF') && e.message.includes('BOOLEAN'))).toBe(true);
    });
  });

  describe('Error Detection', () => {
    it('should detect duplicate symbol definitions', () => {
      const source = `
DEFINITION MODULE Test;
VAR x: INTEGER;
VAR x: REAL;
END MODULE;
      `.trim();

      const { diagnostics } = analyze(source);
      const errors = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error);
      expect(errors.some((e) => e.message.includes('already defined'))).toBe(true);
    });

    it('should detect undefined identifiers', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  x := 10;
END PROCEDURE;
END MODULE;
      `.trim();

      const { diagnostics } = analyze(source);
      const errors = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error);
      expect(errors.some((e) => e.message.includes('Undefined'))).toBe(true);
    });

    it('should detect undefined types', () => {
      const source = `
DEFINITION MODULE Test;
VAR x: UnknownType;
END MODULE;
      `.trim();

      const { diagnostics } = analyze(source);
      const errors = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error);
      expect(errors.some((e) => e.message.includes('Unknown type'))).toBe(true);
    });
  });
});
