/**
 * Unit tests for Completion Provider
 */

import { getCompletions, resolveCompletionItem } from './completion';
import { CompletionItemKind } from 'vscode-languageserver/node';
import { Lexer } from '../language/lexer';
import { Parser } from '../language/parser';
import { SemanticAnalyzer } from '../language/analyzer';
import type { Module } from '../language/ast';

describe('Completion', () => {
  function parseAndAnalyze(code: string): { ast: Module; analyzer: SemanticAnalyzer } {
    const lexer = new Lexer(code.trim());
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const analyzer = new SemanticAnalyzer();
    analyzer.analyze(ast);
    return { ast, analyzer };
  }

  describe('Basic Completions', () => {
    it('should return keyword completions', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Dummy = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      // Should include MODSIM III keywords
      const keywords = completions.filter(c => c.kind === CompletionItemKind.Keyword);
      expect(keywords.length).toBeGreaterThan(0);

      const keywordLabels = keywords.map(k => k.label);
      expect(keywordLabels).toContain('IF');
      expect(keywordLabels).toContain('WHILE');
      expect(keywordLabels).toContain('PROCEDURE');
      expect(keywordLabels).toContain('TYPE');
      expect(keywordLabels).toContain('VAR');
    });

    it('should return snippet completions', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Dummy = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      // Should include code snippets
      const snippets = completions.filter(c => c.kind === CompletionItemKind.Snippet);
      expect(snippets.length).toBeGreaterThan(0);

      const snippetLabels = snippets.map(s => s.label);
      expect(snippetLabels).toContain('IF...END IF');
      expect(snippetLabels).toContain('WHILE...END WHILE');
      expect(snippetLabels).toContain('PROCEDURE');
    });
  });

  describe('Symbol Completions', () => {
    it('should include built-in type completions', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
TYPE Name = STRING;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      const typeCompletions = completions.filter(c => c.kind === CompletionItemKind.Class);
      const typeLabels = typeCompletions.map(t => t.label);

      // Should include built-in types
      expect(typeLabels).toContain('INTEGER');
      expect(typeLabels).toContain('REAL');
      expect(typeLabels).toContain('BOOLEAN');
      expect(typeLabels).toContain('STRING');
    });

    it('should handle constant declarations', () => {
      const code = `
DEFINITION MODULE Test;
CONST MaxSize = 100;
CONST MinSize = 10;
TYPE Dummy = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      // Should return completions without errors
      expect(completions).toBeDefined();
      expect(Array.isArray(completions)).toBe(true);
      expect(completions.length).toBeGreaterThan(0);
    });

    it('should handle variable declarations', () => {
      const code = `
DEFINITION MODULE Test;
VAR x, y: INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      // Completions should be returned without errors
      expect(completions).toBeDefined();
      expect(Array.isArray(completions)).toBe(true);
      expect(completions.length).toBeGreaterThan(0);
    });

    it('should handle procedure declarations', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE DoWork;
BEGIN
END PROCEDURE;

PROCEDURE Calculate(IN a: INTEGER): INTEGER;
BEGIN
  RETURN a;
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      // Completions should be returned without errors
      expect(completions).toBeDefined();
      expect(Array.isArray(completions)).toBe(true);
      expect(completions.length).toBeGreaterThan(0);
    });

    it('should handle procedures with parameters', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN x: INTEGER; IN y: INTEGER): INTEGER;
VAR result: INTEGER;
BEGIN
  result := x + y;
  RETURN result;
END PROCEDURE;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      // Should return completions without errors
      expect(completions).toBeDefined();
      expect(Array.isArray(completions)).toBe(true);
      expect(completions.length).toBeGreaterThan(0);
    });
  });

  describe('Object Completions', () => {
    it('should handle object type declarations', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Counter = OBJECT
  count: INTEGER;
  ASK METHOD GetCount: INTEGER;
END OBJECT;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      const typeCompletions = completions.filter(c => c.kind === CompletionItemKind.Class);

      // Should return type completions (at least built-in types)
      expect(typeCompletions.length).toBeGreaterThan(0);
    });

    it('should handle object with methods', () => {
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

      const { ast, analyzer } = parseAndAnalyze(code);
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      // Should return completions without errors
      expect(completions).toBeDefined();
      expect(Array.isArray(completions)).toBe(true);
      expect(completions.length).toBeGreaterThan(0);
    });

    it('should handle objects with fields', () => {
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
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      // Should return completions without errors
      expect(completions).toBeDefined();
      expect(Array.isArray(completions)).toBe(true);
      expect(completions.length).toBeGreaterThan(0);
    });
  });

  describe('Snippet Details', () => {
    it('should have correct insert text for IF snippet', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Dummy = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      const ifSnippet = completions.find(c => c.label === 'IF...END IF');
      expect(ifSnippet).toBeDefined();
      expect(ifSnippet?.insertText).toContain('IF');
      expect(ifSnippet?.insertText).toContain('THEN');
      expect(ifSnippet?.insertText).toContain('END IF');
    });

    it('should have PROCEDURE snippet in completions', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Dummy = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      const procSnippet = completions.find(c =>
        c.kind === CompletionItemKind.Snippet &&
        c.detail === 'Procedure declaration'
      );
      expect(procSnippet).toBeDefined();
      if (procSnippet?.insertText) {
        expect(procSnippet.insertText).toContain('PROCEDURE');
        expect(procSnippet.insertText).toContain('BEGIN');
        expect(procSnippet.insertText).toContain('END PROCEDURE');
      }
    });

    it('should have correct insert text for ASK METHOD snippet', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Dummy = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      const askSnippet = completions.find(c => c.label === 'ASK METHOD');
      expect(askSnippet).toBeDefined();
      expect(askSnippet?.insertText).toContain('ASK METHOD');
      expect(askSnippet?.insertText).toContain('RETURN');
      expect(askSnippet?.insertText).toContain('END METHOD');
    });
  });

  describe('Completion Resolution', () => {
    it('should resolve completion item', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Dummy = INTEGER;
END MODULE;
      `;

      const { ast, analyzer } = parseAndAnalyze(code);
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      const item = completions[0];
      const resolved = resolveCompletionItem(item);

      expect(resolved).toBeDefined();
      expect(resolved.label).toBe(item.label);
    });
  });

  describe('Complex Module Completions', () => {
    it('should return all completion categories for a complex module', () => {
      const code = `
IMPLEMENTATION MODULE Test;

CONST MaxCount = 100;

TYPE Point = OBJECT
  x: REAL;
  y: REAL;
  ASK METHOD Distance: REAL;
END OBJECT;

VAR globalCount: INTEGER;

PROCEDURE Init;
BEGIN
  globalCount := 0;
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
      const completions = getCompletions(ast, analyzer.getSymbolTable(), 0, 0);

      // Should have keywords
      const keywords = completions.filter(c => c.kind === CompletionItemKind.Keyword);
      expect(keywords.length).toBeGreaterThan(0);

      // Should have snippets
      const snippets = completions.filter(c => c.kind === CompletionItemKind.Snippet);
      expect(snippets.length).toBeGreaterThan(0);

      // Should have types (including built-in types)
      const types = completions.filter(c => c.kind === CompletionItemKind.Class);
      expect(types.length).toBeGreaterThan(0);

      // Verify module parses without errors
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Module');
    });
  });
});
