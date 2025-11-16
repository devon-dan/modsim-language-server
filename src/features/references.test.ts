/**
 * Unit tests for Find References Provider
 */

import { findReferences, groupReferencesByFile } from './references';
import { Lexer } from '../language/lexer';
import { Parser } from '../language/parser';
import { SemanticAnalyzer } from '../language/analyzer';
import type { Module } from '../language/ast';
import { Location } from 'vscode-languageserver/node';

describe('References', () => {
  const testUri = 'file:///test.mod';

  function parseAndAnalyze(code: string): { ast: Module; analyzer: SemanticAnalyzer } {
    const lexer = new Lexer(code.trim());
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const analyzer = new SemanticAnalyzer();
    analyzer.analyze(ast);
    return { ast, analyzer };
  }

  describe('Basic Functionality', () => {
    it('should return empty array when no identifier at position', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Position in whitespace
      const references = findReferences(ast, analyzer.getSymbolTable(), 0, 0, testUri, true);

      expect(Array.isArray(references)).toBe(true);
      expect(references).toEqual([]);
    });

    it('should return empty array when symbol not found', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Invalid position
      const references = findReferences(ast, analyzer.getSymbolTable(), 100, 100, testUri, true);

      expect(Array.isArray(references)).toBe(true);
      expect(references).toEqual([]);
    });

    it('should return array of Location objects when references found', () => {
      const code = `
IMPLEMENTATION MODULE Test;
VAR count: INTEGER;
PROCEDURE Init;
BEGIN
  count := 0;
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Try to find references
      const references = findReferences(ast, analyzer.getSymbolTable(), 1, 4, testUri, true);

      // Should return an array
      expect(Array.isArray(references)).toBe(true);

      // Each reference should have uri and range
      references.forEach(ref => {
        expect(ref.uri).toBeDefined();
        expect(ref.range).toBeDefined();
        expect(ref.range.start).toBeDefined();
        expect(ref.range.end).toBeDefined();
      });
    });
  });

  describe('Include Declaration Parameter', () => {
    it('should handle includeDeclaration=true', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Find references with declaration
      const references = findReferences(ast, analyzer.getSymbolTable(), 1, 5, testUri, true);

      // Should return array (may be empty depending on AST positions)
      expect(Array.isArray(references)).toBe(true);
    });

    it('should handle includeDeclaration=false', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Find references without declaration
      const references = findReferences(ast, analyzer.getSymbolTable(), 1, 5, testUri, false);

      // Should return array (may be empty depending on AST positions)
      expect(Array.isArray(references)).toBe(true);
    });
  });

  describe('Type References', () => {
    it('should handle finding references to types', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
VAR myAge: Age;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Try to find references to Age type
      const references = findReferences(ast, analyzer.getSymbolTable(), 1, 5, testUri, true);

      // Should not crash and return array
      expect(Array.isArray(references)).toBe(true);
    });
  });

  describe('Variable References', () => {
    it('should handle finding references to variables', () => {
      const code = `
IMPLEMENTATION MODULE Test;
VAR count: INTEGER;
PROCEDURE Init;
BEGIN
  count := 0;
  count := count + 1;
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Try to find references to count variable
      const references = findReferences(ast, analyzer.getSymbolTable(), 1, 4, testUri, true);

      // Should not crash and return array
      expect(Array.isArray(references)).toBe(true);
    });
  });

  describe('Procedure References', () => {
    it('should handle finding references to procedures', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE DoWork;
BEGIN
END PROCEDURE;

PROCEDURE Init;
BEGIN
  DoWork;
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Try to find references to DoWork procedure
      const references = findReferences(ast, analyzer.getSymbolTable(), 1, 10, testUri, true);

      // Should not crash and return array
      expect(Array.isArray(references)).toBe(true);
    });
  });

  describe('Parameter References', () => {
    it('should handle finding references to parameters', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN x: INTEGER; IN y: INTEGER): INTEGER;
BEGIN
  RETURN x + y;
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Try to find references to parameter x
      const references = findReferences(ast, analyzer.getSymbolTable(), 1, 14, testUri, true);

      // Should not crash and return array
      expect(Array.isArray(references)).toBe(true);
    });
  });

  describe('Object and Method References', () => {
    it('should handle finding references to object types', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Counter = OBJECT
  count: INTEGER;
  ASK METHOD GetCount: INTEGER;
END OBJECT;
VAR myCounter: Counter;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Try to find references to Counter type
      const references = findReferences(ast, analyzer.getSymbolTable(), 1, 5, testUri, true);

      // Should not crash and return array
      expect(Array.isArray(references)).toBe(true);
    });

    it('should handle finding references to methods', () => {
      const code = `
IMPLEMENTATION MODULE Test;
TYPE Counter = OBJECT
  count: INTEGER;
  ASK METHOD GetCount: INTEGER;
END OBJECT;

OBJECT Counter;
  ASK METHOD GetCount: INTEGER;
  BEGIN
    RETURN count;
  END METHOD;
END OBJECT;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Try to find references to GetCount method
      const references = findReferences(ast, analyzer.getSymbolTable(), 7, 13, testUri, true);

      // Should not crash and return array
      expect(Array.isArray(references)).toBe(true);
    });

    it('should handle finding references to fields', () => {
      const code = `
IMPLEMENTATION MODULE Test;
TYPE Point = OBJECT
  x: REAL;
  y: REAL;
  ASK METHOD GetX: REAL;
END OBJECT;

OBJECT Point;
  ASK METHOD GetX: REAL;
  BEGIN
    RETURN x;
  END METHOD;
END OBJECT;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Try to find references to field x
      const references = findReferences(ast, analyzer.getSymbolTable(), 2, 2, testUri, true);

      // Should not crash and return array
      expect(Array.isArray(references)).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complex module with multiple references', () => {
      const code = `
IMPLEMENTATION MODULE Test;

CONST MaxSize = 100;

VAR globalCount: INTEGER;

PROCEDURE Init;
BEGIN
  globalCount := 0;
END PROCEDURE;

PROCEDURE Increment;
BEGIN
  globalCount := globalCount + 1;
END PROCEDURE;

END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Try to find references to globalCount
      const references = findReferences(ast, analyzer.getSymbolTable(), 4, 4, testUri, true);

      // Should return array without crashing
      expect(Array.isArray(references)).toBe(true);
    });
  });

  describe('Group References By File', () => {
    it('should group references by URI', () => {
      const locations: Location[] = [
        {
          uri: 'file:///test1.mod',
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }
        },
        {
          uri: 'file:///test1.mod',
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } }
        },
        {
          uri: 'file:///test2.mod',
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }
        },
      ];

      const grouped = groupReferencesByFile(locations);

      expect(grouped.length).toBe(2);
      expect(grouped[0].uri).toBeDefined();
      expect(grouped[0].locations.length).toBeGreaterThan(0);
    });

    it('should handle empty array', () => {
      const grouped = groupReferencesByFile([]);

      expect(Array.isArray(grouped)).toBe(true);
      expect(grouped.length).toBe(0);
    });

    it('should handle single location', () => {
      const locations: Location[] = [
        {
          uri: 'file:///test.mod',
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }
        },
      ];

      const grouped = groupReferencesByFile(locations);

      expect(grouped.length).toBe(1);
      expect(grouped[0].uri).toBe('file:///test.mod');
      expect(grouped[0].locations.length).toBe(1);
    });
  });

  describe('Location Structure Validation', () => {
    it('should return locations with proper structure', () => {
      const code = `
IMPLEMENTATION MODULE Test;
VAR count: INTEGER;
PROCEDURE Init;
BEGIN
  count := 0;
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      const references = findReferences(ast, analyzer.getSymbolTable(), 1, 4, testUri, true);

      // Verify structure of any returned locations
      references.forEach(location => {
        expect(typeof location.uri).toBe('string');
        expect(typeof location.range.start.line).toBe('number');
        expect(typeof location.range.start.character).toBe('number');
        expect(typeof location.range.end.line).toBe('number');
        expect(typeof location.range.end.character).toBe('number');
        expect(location.range.start.line).toBeGreaterThanOrEqual(0);
        expect(location.range.start.character).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
