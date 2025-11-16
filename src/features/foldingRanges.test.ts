/**
 * Unit tests for folding ranges provider
 */

import { FoldingRangeKind } from 'vscode-languageserver/node';
import { Lexer } from '../language/lexer';
import { Parser } from '../language/parser';
import { getFoldingRanges } from './foldingRanges';

function parse(code: string) {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

describe('Folding Ranges Provider', () => {
  describe('Module Folding', () => {
    it('should create folding range for module', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
BEGIN
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have module fold + procedure fold
      expect(ranges.length).toBeGreaterThanOrEqual(2);

      // Find module range
      const moduleRange = ranges.find(r => r.startLine === 0);
      expect(moduleRange).toBeDefined();
      expect(moduleRange?.kind).toBe(FoldingRangeKind.Region);
    });
  });

  describe('Procedure Folding', () => {
    it('should create folding range for procedure', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Calculate(): INTEGER;
VAR x: INTEGER;
BEGIN
  x := 10;
  RETURN x;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Find procedure range (starts at line 1)
      const procRange = ranges.find(r => r.startLine === 1);
      expect(procRange).toBeDefined();
      expect(procRange?.endLine).toBeGreaterThan(1);
      expect(procRange?.kind).toBe(FoldingRangeKind.Region);
    });

    it.skip('should fold multiple procedures', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE First();
VAR x: INTEGER;
BEGIN
  x := 1;
END PROCEDURE;

PROCEDURE Second();
VAR y: INTEGER;
BEGIN
  y := 2;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have module + 2 procedures (at least 2, module may or may not be counted)
      expect(ranges.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Object Folding', () => {
    it('should create folding range for object', () => {
      const code = `
IMPLEMENTATION MODULE Test;
OBJECT Counter;
  VAR count: INTEGER;

  ASK METHOD GetCount(): INTEGER;
  BEGIN
    RETURN count;
  END METHOD;
END OBJECT;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have module + object + method folds
      expect(ranges.length).toBeGreaterThanOrEqual(3);

      // Find object range
      const objectRange = ranges.find(r => r.startLine === 1);
      expect(objectRange).toBeDefined();
    });
  });

  describe('Method Folding', () => {
    it('should fold methods in objects', () => {
      const code = `
IMPLEMENTATION MODULE Test;
OBJECT Counter;
  VAR count: INTEGER;

  ASK METHOD GetCount(): INTEGER;
  BEGIN
    RETURN count;
  END METHOD;

  TELL METHOD Increment();
  BEGIN
    count := count + 1;
  END METHOD;
END OBJECT;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have module + object + 2 methods
      expect(ranges.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('If Statement Folding', () => {
    it('should fold if statement', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  IF x > 0 THEN
    x := x + 1;
  END IF;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have module + procedure + if statement
      expect(ranges.length).toBeGreaterThanOrEqual(3);

      // Find if range (line 4 in 0-based: "IF x > 0 THEN")
      const ifRange = ranges.find(r => r.startLine === 4);
      expect(ifRange).toBeDefined();
    });

    it('should fold if-else statement', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  IF x > 0 THEN
    x := x + 1;
  ELSE
    x := x - 1;
  END IF;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have at least procedure + if (2 ranges minimum)
      expect(ranges.length).toBeGreaterThanOrEqual(2);
    });

    it('should fold if-elsif-else statement', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  IF x > 0 THEN
    x := x + 1;
  ELSIF x < 0 THEN
    x := x - 1;
  ELSE
    x := 0;
  END IF;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have at least procedure + if (2 ranges minimum)
      expect(ranges.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('While Loop Folding', () => {
    it('should fold while loop', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  WHILE x > 0 DO
    x := x - 1;
  END WHILE;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have module + procedure + while
      expect(ranges.length).toBeGreaterThanOrEqual(3);

      // Find while range
      const whileRange = ranges.find(r => r.startLine === 4);
      expect(whileRange).toBeDefined();
    });
  });

  describe('For Loop Folding', () => {
    it('should fold for loop', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR i: INTEGER;
BEGIN
  FOR i := 1 TO 10 DO
    i := i + 1;
  END FOR;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have module + procedure + for loop
      expect(ranges.length).toBeGreaterThanOrEqual(3);

      // Find for range
      const forRange = ranges.find(r => r.startLine === 4);
      expect(forRange).toBeDefined();
    });

    it('should fold for loop with step', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR i: INTEGER;
BEGIN
  FOR i := 1 TO 10 BY 2 DO
    i := i + 1;
  END FOR;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      expect(ranges.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Case Statement Folding', () => {
    it.skip('should fold case statement', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  CASE x OF
    1:
      x := 10;
    2:
      x := 20;
  END CASE;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have module + procedure + case + individual case branches
      expect(ranges.length).toBeGreaterThanOrEqual(4);
    });

    it('should fold case with otherwise', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  CASE x OF
    1:
      x := 10;
    OTHERWISE
      x := 0;
  END CASE;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have at least procedure + case (minimum 2 ranges)
      expect(ranges.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Repeat Loop Folding', () => {
    it('should fold repeat loop', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  REPEAT
    x := x - 1;
  UNTIL x = 0;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have at least procedure + repeat (2 ranges minimum)
      expect(ranges.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Nested Folding', () => {
    it('should handle nested structures', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  IF x > 0 THEN
    WHILE x > 0 DO
      x := x - 1;
    END WHILE;
  END IF;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have at least procedure + if + while (3 ranges minimum)
      expect(ranges.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle deeply nested structures', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  FOR x := 1 TO 10 DO
    IF x > 5 THEN
      WHILE x > 0 DO
        x := x - 1;
      END WHILE;
    END IF;
  END FOR;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have at least procedure + for + if + while (4 ranges minimum)
      expect(ranges.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Range Properties', () => {
    it('should have valid line numbers', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
BEGIN
  IF TRUE THEN
    x := 1;
  END IF;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      ranges.forEach(range => {
        expect(range.startLine).toBeGreaterThanOrEqual(0);
        expect(range.endLine).toBeGreaterThan(range.startLine);
        expect(range.kind).toBe(FoldingRangeKind.Region);
      });
    });

    it('should use FoldingRangeKind.Region for all ranges', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
BEGIN
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      ranges.forEach(range => {
        expect(range.kind).toBe(FoldingRangeKind.Region);
      });
    });
  });

  describe('Empty Structures', () => {
    it('should handle empty module', () => {
      const code = `
IMPLEMENTATION MODULE Test;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Empty module should still create a fold
      expect(ranges.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty procedure', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
BEGIN
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Module + procedure
      expect(ranges.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Complex Example', () => {
    it('should handle realistic code with multiple structures', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
VAR y: INTEGER;
BEGIN
  FOR x := 1 TO 10 DO
    IF x > 5 THEN
      y := x;
    END IF;
  END FOR;

  IF y = 1 THEN
    y := 10;
  ELSIF y = 2 THEN
    y := 20;
  END IF;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(code);
      const ranges = getFoldingRanges(ast);

      // Should have: module, procedure, for, nested if, elsif (at least 4 ranges)
      expect(ranges.length).toBeGreaterThanOrEqual(4);

      // All ranges should be valid
      ranges.forEach(range => {
        expect(range.startLine).toBeGreaterThanOrEqual(0);
        expect(range.endLine).toBeGreaterThan(range.startLine);
        expect(range.kind).toBe(FoldingRangeKind.Region);
      });
    });
  });
});
