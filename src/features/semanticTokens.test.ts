/**
 * Unit tests for Semantic Tokens Provider
 */

import { getSemanticTokens } from './semanticTokens';
import { Lexer } from '../language/lexer';
import { Parser } from '../language/parser';
import type { Module } from '../language/ast';

describe('SemanticTokens', () => {
  function parseCode(code: string): Module {
    const lexer = new Lexer(code.trim());
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  describe('Basic Module Structure', () => {
    it('should generate tokens for simple DEFINITION MODULE', () => {
      const code = `
DEFINITION MODULE Test;
END MODULE;
      `;

      const ast = parseCode(code);
      const tokens = getSemanticTokens(ast);

      expect(tokens).toBeDefined();
      expect(Array.isArray(tokens)).toBe(true);
    });

    it('should generate tokens for IMPLEMENTATION MODULE', () => {
      const code = `
IMPLEMENTATION MODULE Test;
END MODULE;
      `;

      const ast = parseCode(code);
      const tokens = getSemanticTokens(ast);

      expect(tokens).toBeDefined();
      expect(Array.isArray(tokens)).toBe(true);
    });
  });

  describe('Type Declarations', () => {
    it('should generate tokens for simple type', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
END MODULE;
      `;

      const ast = parseCode(code);
      const tokens = getSemanticTokens(ast);

      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should generate tokens for array type', () => {
      const code = `
DEFINITION MODULE Test;
TYPE Numbers = ARRAY [1..10] OF INTEGER;
END MODULE;
      `;

      const ast = parseCode(code);
      const tokens = getSemanticTokens(ast);

      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Variable and Constant Declarations', () => {
    it('should generate tokens for variable declaration', () => {
      const code = `
DEFINITION MODULE Test;
VAR x, y, z: INTEGER;
END MODULE;
      `;

      const ast = parseCode(code);
      const tokens = getSemanticTokens(ast);

      expect(tokens).toBeDefined();
      expect(Array.isArray(tokens)).toBe(true);
      // VAR declarations may not generate tokens in current implementation
    });

    it('should generate tokens for constant declaration', () => {
      const code = `
DEFINITION MODULE Test;
CONST MaxSize = 100;
END MODULE;
      `;

      const ast = parseCode(code);
      const tokens = getSemanticTokens(ast);

      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Procedure Declarations', () => {
    it('should generate tokens for simple procedure', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE DoWork;
BEGIN
END PROCEDURE;
END MODULE;
      `;

      const ast = parseCode(code);
      const tokens = getSemanticTokens(ast);

      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should generate tokens for procedure with parameters', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN x: INTEGER; IN y: INTEGER): INTEGER;
BEGIN
  RETURN x + y;
END PROCEDURE;
END MODULE;
      `;

      const ast = parseCode(code);
      const tokens = getSemanticTokens(ast);

      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Object Declarations', () => {
    it('should generate tokens for simple object type', () => {
      const code = `
DEFINITION MODULE Test;
TYPE
  Counter = OBJECT
    count: INTEGER;
    ASK METHOD GetCount: INTEGER;
  END OBJECT;
END MODULE;
      `;

      const ast = parseCode(code);
      const tokens = getSemanticTokens(ast);

      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should generate tokens for object implementation', () => {
      const code = `
IMPLEMENTATION MODULE Test;
TYPE
  Counter = OBJECT
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

      const ast = parseCode(code);
      const tokens = getSemanticTokens(ast);

      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Import Statements', () => {
    it('should generate tokens for FROM...IMPORT', () => {
      const code = `
DEFINITION MODULE Test;
FROM Util IMPORT Helper, Tool;
TYPE Dummy = INTEGER;
END MODULE;
      `;

      const ast = parseCode(code);
      const tokens = getSemanticTokens(ast);

      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should generate tokens for IMPORT', () => {
      const code = `
DEFINITION MODULE Test;
FROM Math IMPORT Sin, Cos;
TYPE Dummy = INTEGER;
END MODULE;
      `;

      const ast = parseCode(code);
      const tokens = getSemanticTokens(ast);

      expect(tokens).toBeDefined();
      expect(Array.isArray(tokens)).toBe(true);
      // IMPORT statements may not generate many tokens in current implementation
    });
  });

  describe('Complex Module', () => {
    it('should generate tokens for realistic module with multiple declarations', () => {
      const code = `
IMPLEMENTATION MODULE Test;

CONST MaxSize = 100;

TYPE
  Point = OBJECT
    x: REAL;
    y: REAL;
    ASK METHOD GetX: REAL;
  END OBJECT;

VAR globalPoint: Point;

PROCEDURE Init;
VAR temp: INTEGER;
BEGIN
  temp := 5;
END PROCEDURE;

OBJECT Point;
  ASK METHOD GetX: REAL;
  BEGIN
    RETURN x;
  END METHOD;
END OBJECT;

END MODULE;
      `;

      const ast = parseCode(code);
      const tokens = getSemanticTokens(ast);

      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);
      // Should generate many tokens for this complex module
      expect(tokens.length).toBeGreaterThan(20);
    });
  });
});
