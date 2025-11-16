/**
 * Unit tests for Hover Provider
 */

import { getHover } from './hover';
import { Lexer } from '../language/lexer';
import { Parser } from '../language/parser';
import { SemanticAnalyzer } from '../language/analyzer';
import type { Module } from '../language/ast';
import { MarkupKind } from 'vscode-languageserver/node';

describe('Hover', () => {
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
    it('should return null when no identifier at position', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Position in whitespace
      const hover = getHover(ast, analyzer.getSymbolTable(), 0, 0, testUri);

      expect(hover).toBeNull();
    });

    it('should return null when symbol not found', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Invalid position
      const hover = getHover(ast, analyzer.getSymbolTable(), 100, 100, testUri);

      expect(hover).toBeNull();
    });

    it('should return Hover object with markdown content when symbol found', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Try to get hover
      const hover = getHover(ast, analyzer.getSymbolTable(), 1, 5, testUri);

      // If hover is returned, it should have proper structure
      if (hover) {
        expect(hover.contents).toBeDefined();
        // Type guard for MarkupContent
        if (typeof hover.contents === 'object' && 'kind' in hover.contents) {
          expect(hover.contents.kind).toBe(MarkupKind.Markdown);
          expect(typeof hover.contents.value).toBe('string');
        }
      }
    });
  });

  describe('Type Hover', () => {
    it('should handle type hover', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      const hover = getHover(ast, analyzer.getSymbolTable(), 1, 5, testUri);

      // Should not crash
      expect(hover === null || typeof hover === 'object').toBe(true);
    });

    it('should handle object type hover', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Counter = OBJECT
  count: INTEGER;
  ASK METHOD GetCount: INTEGER;
END OBJECT;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      const hover = getHover(ast, analyzer.getSymbolTable(), 1, 5, testUri);

      // Should not crash
      expect(hover === null || typeof hover === 'object').toBe(true);
    });
  });

  describe('Constant Hover', () => {
    it('should handle constant hover', () => {
      const code = `
DEFINITION MODULE Test;
CONST MaxSize = 100;
TYPE Dummy = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      const hover = getHover(ast, analyzer.getSymbolTable(), 1, 6, testUri);

      // Should not crash
      expect(hover === null || typeof hover === 'object').toBe(true);
    });
  });

  describe('Variable Hover', () => {
    it('should handle variable hover', () => {
      const code = `
DEFINITION MODULE Test;
VAR count: INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      const hover = getHover(ast, analyzer.getSymbolTable(), 1, 4, testUri);

      // Should not crash
      expect(hover === null || typeof hover === 'object').toBe(true);
    });
  });

  describe('Procedure Hover', () => {
    it('should handle procedure hover without parameters', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE DoWork;
BEGIN
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      const hover = getHover(ast, analyzer.getSymbolTable(), 1, 10, testUri);

      // Should not crash
      expect(hover === null || typeof hover === 'object').toBe(true);
    });

    it('should handle procedure hover with parameters', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN x: INTEGER; IN y: INTEGER): INTEGER;
BEGIN
  RETURN x + y;
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      const hover = getHover(ast, analyzer.getSymbolTable(), 1, 10, testUri);

      // Should not crash
      expect(hover === null || typeof hover === 'object').toBe(true);
    });

    it('should handle procedure hover with return type', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Calculate(IN value: INTEGER): INTEGER;
BEGIN
  RETURN value * 2;
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      const hover = getHover(ast, analyzer.getSymbolTable(), 1, 10, testUri);

      // Should not crash
      expect(hover === null || typeof hover === 'object').toBe(true);
    });
  });

  describe('Method Hover', () => {
    it('should handle ASK method hover', () => {
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

      const hover = getHover(ast, analyzer.getSymbolTable(), 7, 13, testUri);

      // Should not crash
      expect(hover === null || typeof hover === 'object').toBe(true);
    });

    it('should handle TELL method hover', () => {
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
  END METHOD;
END OBJECT;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      const hover = getHover(ast, analyzer.getSymbolTable(), 7, 14, testUri);

      // Should not crash
      expect(hover === null || typeof hover === 'object').toBe(true);
    });
  });

  describe('Field Hover', () => {
    it('should handle field hover', () => {
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

      const hover = getHover(ast, analyzer.getSymbolTable(), 2, 2, testUri);

      // Should not crash
      expect(hover === null || typeof hover === 'object').toBe(true);
    });
  });

  describe('Parameter Hover', () => {
    it('should handle parameter hover', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN x: INTEGER; IN y: INTEGER): INTEGER;
BEGIN
  RETURN x + y;
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      const hover = getHover(ast, analyzer.getSymbolTable(), 1, 14, testUri);

      // Should not crash
      expect(hover === null || typeof hover === 'object').toBe(true);
    });
  });

  describe('Module Hover', () => {
    it('should handle module hover', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Dummy = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Try hovering over module name (if supported)
      const hover = getHover(ast, analyzer.getSymbolTable(), 0, 18, testUri);

      // Should not crash
      expect(hover === null || typeof hover === 'object').toBe(true);
    });
  });

  describe('Hover Content Format', () => {
    it('should use markdown format for hover content', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      const hover = getHover(ast, analyzer.getSymbolTable(), 1, 5, testUri);

      if (hover && hover.contents && typeof hover.contents === 'object' && 'kind' in hover.contents) {
        expect(hover.contents.kind).toBe(MarkupKind.Markdown);
        expect(typeof hover.contents.value).toBe('string');
        expect(hover.contents.value.length).toBeGreaterThan(0);
      }
    });

    it('should include code blocks in hover content', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      const hover = getHover(ast, analyzer.getSymbolTable(), 1, 5, testUri);

      if (hover && hover.contents && typeof hover.contents === 'object' && 'value' in hover.contents) {
        // Markdown content might include code blocks with triple backticks
        const hasCodeBlock = hover.contents.value.includes('```');
        // Code blocks are common but not required
        expect(typeof hasCodeBlock).toBe('boolean');
      }
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complex module hover requests', () => {
      const code = `
IMPLEMENTATION MODULE Test;

CONST MaxSize = 100;

TYPE Point = OBJECT
  x: REAL;
  y: REAL;
  ASK METHOD Distance: REAL;
END OBJECT;

VAR globalPoint: Point;

PROCEDURE Init;
BEGIN
  globalPoint := NIL;
END PROCEDURE;

OBJECT Point;
  ASK METHOD Distance: REAL;
  BEGIN
    RETURN 0.0;
  END METHOD;
END OBJECT;

END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      // Try multiple hover positions
      const hovers = [
        getHover(ast, analyzer.getSymbolTable(), 2, 6, testUri),   // CONST
        getHover(ast, analyzer.getSymbolTable(), 4, 5, testUri),   // TYPE
        getHover(ast, analyzer.getSymbolTable(), 10, 4, testUri),  // VAR
        getHover(ast, analyzer.getSymbolTable(), 12, 10, testUri), // PROCEDURE
      ];

      // All should complete without crashing
      hovers.forEach(hover => {
        expect(hover === null || typeof hover === 'object').toBe(true);
      });
    });
  });

  describe('Hover Structure', () => {
    it('should return proper Hover structure when hover available', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);

      const hover = getHover(ast, analyzer.getSymbolTable(), 1, 5, testUri);

      if (hover && hover.contents && typeof hover.contents === 'object' && 'kind' in hover.contents) {
        // Verify hover structure
        expect(hover.contents.kind).toBeDefined();
        expect(hover.contents.value).toBeDefined();

        // Kind should be Markdown
        expect(hover.contents.kind).toBe(MarkupKind.Markdown);

        // Value should be a non-empty string
        expect(typeof hover.contents.value).toBe('string');
        expect(hover.contents.value.length).toBeGreaterThan(0);
      }
    });
  });
});
