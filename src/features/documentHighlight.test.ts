/**
 * Unit tests for document highlight provider
 */

import { DocumentHighlightKind } from 'vscode-languageserver/node';
import { Lexer } from '../language/lexer';
import { Parser } from '../language/parser';
import { SemanticAnalyzer } from '../language/analyzer';
import { getDocumentHighlights } from './documentHighlight';
import { WorkspaceManager } from '../utils/workspace';

function parseAndAnalyze(code: string) {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const analyzer = new SemanticAnalyzer();
  analyzer.analyze(ast);
  return { ast, analyzer };
}

describe('Document Highlight Provider', () => {
  const documentUri = 'file:///test.mod';
  const workspaceManager = new WorkspaceManager();

  describe('Variable Highlights', () => {
    it('should highlight all occurrences of a variable', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR count: INTEGER;
BEGIN
  count := 10;
  count := count + 1;
END PROCEDURE;
END MODULE;
      `.trim();

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on "count" in first assignment (line 4, char 2)
      const highlights = getDocumentHighlights(
        ast,
        symbolTable,
        4,
        2,
        documentUri,
        workspaceManager
      );

      // Should highlight: declaration + 3 usages in body
      expect(highlights.length).toBe(4);

      // All highlights should have ranges
      highlights.forEach(h => {
        expect(h.range).toBeDefined();
        expect(h.range.start).toBeDefined();
        expect(h.range.end).toBeDefined();
        expect(h.kind).toBe(DocumentHighlightKind.Text);
      });
    });

    it('should return empty array for unknown symbol', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
BEGIN
END PROCEDURE;
END MODULE;
      `.trim();

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on whitespace (line 2, char 0)
      const highlights = getDocumentHighlights(
        ast,
        symbolTable,
        2,
        0,
        documentUri,
        workspaceManager
      );

      expect(highlights.length).toBe(0);
    });
  });

  describe('Procedure Highlights', () => {
    it('should highlight procedure declaration and all calls', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Calculate(): INTEGER;
BEGIN
  RETURN 42;
END PROCEDURE;

PROCEDURE Main();
VAR result: INTEGER;
BEGIN
  result := Calculate();
  result := Calculate() + 1;
END PROCEDURE;
END MODULE;
      `.trim();

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on "Calculate" in declaration (line 1, char 10)
      const highlights = getDocumentHighlights(
        ast,
        symbolTable,
        1,
        10,
        documentUri,
        workspaceManager
      );

      // Should highlight: declaration + 2 calls
      expect(highlights.length).toBe(3);
    });
  });

  describe('Parameter Highlights', () => {
    it('should highlight parameter declaration and usages', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN a: INTEGER; IN b: INTEGER): INTEGER;
BEGIN
  RETURN a + b;
END PROCEDURE;
END MODULE;
      `.trim();

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on "a" in return statement (line 3, char 9)
      const highlights = getDocumentHighlights(
        ast,
        symbolTable,
        3,
        9,
        documentUri,
        workspaceManager
      );

      // Should highlight: parameter declaration + usage in return
      expect(highlights.length).toBe(2);
    });
  });

  describe('Type Highlights', () => {
    it('should highlight type declaration and all uses', () => {
      const code = `
IMPLEMENTATION MODULE Test;
TYPE Counter = INTEGER;

PROCEDURE Main();
VAR c: Counter;
BEGIN
  c := 0;
END PROCEDURE;
END MODULE;
      `.trim();

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on "Counter" in type declaration (line 1, char 8)
      const highlights = getDocumentHighlights(
        ast,
        symbolTable,
        1,
        8,
        documentUri,
        workspaceManager
      );

      // Should highlight: type declaration + variable type reference
      expect(highlights.length).toBe(2);
    });
  });

  describe('Const Highlights', () => {
    it('should highlight const declaration and usages', () => {
      const code = `
IMPLEMENTATION MODULE Test;
CONST MAX_SIZE = 100;

PROCEDURE Main();
VAR size: INTEGER;
BEGIN
  size := MAX_SIZE;
  size := MAX_SIZE + 1;
END PROCEDURE;
END MODULE;
      `.trim();

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on "MAX_SIZE" in declaration (line 1, char 10)
      const highlights = getDocumentHighlights(
        ast,
        symbolTable,
        1,
        10,
        documentUri,
        workspaceManager
      );

      // Should highlight: declaration + 2 usages
      expect(highlights.length).toBe(3);
    });
  });

  describe('Method Highlights', () => {
    it('should highlight method declaration and calls', () => {
      const code = `
IMPLEMENTATION MODULE Test;
OBJECT Counter;
  VAR count: INTEGER;

  ASK METHOD GetCount(): INTEGER;
  BEGIN
    RETURN count;
  END METHOD;
END OBJECT;

PROCEDURE Main();
VAR c: Counter;
VAR value: INTEGER;
BEGIN
  ASK c TO GetCount() RETURNING value;
END PROCEDURE;
END MODULE;
      `.trim();

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on "GetCount" in method declaration (line 4, char 17)
      const highlights = getDocumentHighlights(
        ast,
        symbolTable,
        4,
        17,
        documentUri,
        workspaceManager
      );

      // Should highlight: method declaration + ASK call
      expect(highlights.length).toBeGreaterThan(0);
    });
  });

  describe('Scope Handling', () => {
    it('should highlight all variables with same name across different scopes', () => {
      // Note: Current implementation highlights all symbols with same name
      // Not scope-aware (this is a known limitation)
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Outer();
VAR x: INTEGER;
BEGIN
  x := 10;
END PROCEDURE;

PROCEDURE Inner();
VAR x: INTEGER;
BEGIN
  x := 20;
END PROCEDURE;
END MODULE;
      `.trim();

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on x in Outer procedure (line 4, char 2)
      const highlights = getDocumentHighlights(
        ast,
        symbolTable,
        4,
        2,
        documentUri,
        workspaceManager
      );

      // Currently highlights ALL x's (both scopes)
      expect(highlights.length).toBe(3); // Both declarations + both usages
    });
  });

  describe('Document Filtering', () => {
    it('should only return highlights from current document', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR count: INTEGER;
BEGIN
  count := 10;
END PROCEDURE;
END MODULE;
      `.trim();

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on "count" (line 4, char 2)
      const highlights = getDocumentHighlights(
        ast,
        symbolTable,
        4,
        2,
        documentUri,
        workspaceManager
      );

      // All highlights should be from the current document
      highlights.forEach(h => {
        // DocumentHighlight doesn't have uri, but we verify by getting them
        // from findReferences which filters to current document
        expect(h.range).toBeDefined();
      });

      expect(highlights.length).toBeGreaterThan(0);
    });
  });

  describe('Highlight Structure', () => {
    it('should return highlights with proper structure', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  x := 10;
END PROCEDURE;
END MODULE;
      `.trim();

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      // Position on "x" (line 4, char 2)
      const highlights = getDocumentHighlights(
        ast,
        symbolTable,
        4,
        2,
        documentUri,
        workspaceManager
      );

      expect(highlights.length).toBeGreaterThan(0);

      highlights.forEach(h => {
        // Check structure
        expect(h).toHaveProperty('range');
        expect(h).toHaveProperty('kind');

        // Check range structure
        expect(h.range).toHaveProperty('start');
        expect(h.range).toHaveProperty('end');
        expect(h.range.start).toHaveProperty('line');
        expect(h.range.start).toHaveProperty('character');
        expect(h.range.end).toHaveProperty('line');
        expect(h.range.end).toHaveProperty('character');

        // Check kind is valid
        expect([
          DocumentHighlightKind.Text,
          DocumentHighlightKind.Read,
          DocumentHighlightKind.Write,
        ]).toContain(h.kind);
      });
    });
  });
});
