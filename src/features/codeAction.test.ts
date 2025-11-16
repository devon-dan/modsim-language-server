/**
 * Unit tests for code actions
 */

import { CodeActionKind, Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver/node';
import { Lexer } from '../language/lexer';
import { Parser } from '../language/parser';
import { SemanticAnalyzer } from '../language/analyzer';
import { getCodeActions } from './codeAction';

function parseAndAnalyze(code: string, options?: { errorRecovery?: boolean }) {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens, options);
  const ast = parser.parse();
  const analyzer = new SemanticAnalyzer();
  analyzer.analyze(ast);
  return { ast, analyzer };
}

describe('Code Actions', () => {
  const documentUri = 'file:///test.mod';

  describe('Quick Fixes', () => {
    describe('Convert lowercase keyword to uppercase', () => {
      it('should provide quick fix for lowercase PROCEDURE', () => {
        // Use valid code - the diagnostic would come from the lexer checking for lowercase
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
BEGIN
END PROCEDURE;
END MODULE;
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code);
        const symbolTable = analyzer.getSymbolTable();

        // Simulate a diagnostic for lowercase keyword (even though code is valid)
        const diagnostic: Diagnostic = {
          range: {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 9 }
          },
          message: "Keyword 'procedure' must be uppercase",
          severity: DiagnosticSeverity.Error
        };

        const actions = getCodeActions(
          ast,
          symbolTable,
          diagnostic.range,
          [diagnostic],
          documentUri,
          code
        );

        expect(actions.length).toBeGreaterThan(0);
        const action = actions.find(a => a.title.includes('PROCEDURE'));
        expect(action).toBeDefined();
        expect(action?.kind).toBe(CodeActionKind.QuickFix);
        expect(action?.diagnostics).toContain(diagnostic);
        expect(action?.edit?.changes?.[documentUri]).toBeDefined();
        expect(action?.edit?.changes?.[documentUri][0].newText).toBe('PROCEDURE');
      });

      it('should provide quick fix for lowercase BEGIN', () => {
        // Use valid code - the diagnostic is simulated
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
BEGIN
END PROCEDURE;
END MODULE;
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code);
        const symbolTable = analyzer.getSymbolTable();

        const diagnostic: Diagnostic = {
          range: {
            start: { line: 2, character: 0 },
            end: { line: 2, character: 5 }
          },
          message: "Keyword 'begin' must be uppercase",
          severity: DiagnosticSeverity.Error
        };

        const actions = getCodeActions(
          ast,
          symbolTable,
          diagnostic.range,
          [diagnostic],
          documentUri,
          code
        );

        const action = actions.find(a => a.title.includes('BEGIN'));
        expect(action).toBeDefined();
        expect(action?.edit?.changes?.[documentUri][0].newText).toBe('BEGIN');
      });

      it('should provide quick fix for multiple lowercase keywords', () => {
        // Use valid code - diagnostics are simulated
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
BEGIN
END PROCEDURE;
END MODULE;
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code);
        const symbolTable = analyzer.getSymbolTable();

        const diagnostics: Diagnostic[] = [
          {
            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 9 } },
            message: "Keyword 'procedure' must be uppercase",
            severity: DiagnosticSeverity.Error
          },
          {
            range: { start: { line: 3, character: 0 }, end: { line: 3, character: 5 } },
            message: "Keyword 'begin' must be uppercase",
            severity: DiagnosticSeverity.Error
          },
          {
            range: { start: { line: 2, character: 0 }, end: { line: 2, character: 3 } },
            message: "Keyword 'var' must be uppercase",
            severity: DiagnosticSeverity.Error
          }
        ];

        // Test each diagnostic separately
        diagnostics.forEach(diagnostic => {
          const actions = getCodeActions(
            ast,
            symbolTable,
            diagnostic.range,
            [diagnostic],
            documentUri,
            code
          );
          expect(actions.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Add missing OVERRIDE', () => {
      it('should provide quick fix to add OVERRIDE to method', () => {
        const code = `
IMPLEMENTATION MODULE Test;
TYPE Base = OBJECT
  ASK METHOD GetValue(): INTEGER;
END OBJECT;

TYPE Derived = OBJECT(Base)
  ASK OVERRIDE METHOD GetValue(): INTEGER;
END OBJECT;

OBJECT Derived;
  ASK METHOD GetValue(): INTEGER;
  BEGIN
    RETURN 42;
  END METHOD;
END OBJECT;
END MODULE;
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code);
        const symbolTable = analyzer.getSymbolTable();

        // Simulate a diagnostic for a missing OVERRIDE on line 10 (0-indexed)
        const diagnostic: Diagnostic = {
          range: {
            start: { line: 10, character: 2 },
            end: { line: 10, character: 35 }
          },
          message: "Method 'GetValue' overrides a base class method and must be marked with OVERRIDE",
          severity: DiagnosticSeverity.Error
        };

        const actions = getCodeActions(
          ast,
          symbolTable,
          diagnostic.range,
          [diagnostic],
          documentUri,
          code
        );

        const action = actions.find(a => a.title.includes('Add OVERRIDE'));
        expect(action).toBeDefined();
        expect(action?.kind).toBe(CodeActionKind.QuickFix);
        expect(action?.edit?.changes?.[documentUri]).toBeDefined();
        expect(action?.edit?.changes?.[documentUri][0].newText).toBe('OVERRIDE ');
      });
    });

    describe('Remove unused variable', () => {
      it('should provide quick fix to remove unused variable', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR unused: INTEGER;
VAR used: INTEGER;
BEGIN
  used := 10;
END PROCEDURE;
END MODULE;
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code);
        const symbolTable = analyzer.getSymbolTable();

        const diagnostic: Diagnostic = {
          range: {
            start: { line: 2, character: 0 },
            end: { line: 2, character: 20 }
          },
          message: "Variable 'unused' is declared but never used",
          severity: DiagnosticSeverity.Warning
        };

        const actions = getCodeActions(
          ast,
          symbolTable,
          diagnostic.range,
          [diagnostic],
          documentUri,
          code
        );

        const action = actions.find(a => a.title.includes('Remove unused variable'));
        expect(action).toBeDefined();
        expect(action?.kind).toBe(CodeActionKind.QuickFix);
        expect(action?.edit?.changes?.[documentUri]).toBeDefined();

        // Should delete the entire line
        const edit = action?.edit?.changes?.[documentUri][0];
        expect(edit?.range.start.line).toBe(2);
        expect(edit?.range.end.line).toBe(3);
      });

      it('should not provide quick fix for unused parameter', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN a: INTEGER; IN b: INTEGER): INTEGER;
BEGIN
  RETURN a;
END PROCEDURE;
END MODULE;
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code);
        const symbolTable = analyzer.getSymbolTable();

        const diagnostic: Diagnostic = {
          range: {
            start: { line: 1, character: 29 },
            end: { line: 1, character: 41 }
          },
          message: "Parameter 'b' is declared but never used",
          severity: DiagnosticSeverity.Warning
        };

        const actions = getCodeActions(
          ast,
          symbolTable,
          diagnostic.range,
          [diagnostic],
          documentUri,
          code
        );

        // Should not provide remove action for parameters
        const action = actions.find(a => a.title.includes('Remove'));
        expect(action).toBeUndefined();
      });
    });

    describe('Add missing END', () => {
      it('should provide quick fix to add missing END PROCEDURE', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
BEGIN
(* Missing END PROCEDURE *)
END MODULE;
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code, { errorRecovery: true });
        const symbolTable = analyzer.getSymbolTable();

        const diagnostic: Diagnostic = {
          range: {
            start: { line: 4, character: 0 },
            end: { line: 4, character: 10 }
          },
          message: "Expected END PROCEDURE",
          severity: DiagnosticSeverity.Error
        };

        const actions = getCodeActions(
          ast,
          symbolTable,
          diagnostic.range,
          [diagnostic],
          documentUri,
          code
        );

        const action = actions.find(a => a.title.includes('Add missing END PROCEDURE'));
        expect(action).toBeDefined();
        expect(action?.kind).toBe(CodeActionKind.QuickFix);
        expect(action?.edit?.changes?.[documentUri]).toBeDefined();
        expect(action?.edit?.changes?.[documentUri][0].newText).toContain('END PROCEDURE');
      });

      it('should provide quick fix to add missing END MODULE', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
BEGIN
END PROCEDURE;
(* Missing END MODULE *)
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code, { errorRecovery: true });
        const symbolTable = analyzer.getSymbolTable();

        const diagnostic: Diagnostic = {
          range: {
            start: { line: 5, character: 0 },
            end: { line: 5, character: 0 }
          },
          message: "Expected END MODULE",
          severity: DiagnosticSeverity.Error
        };

        const actions = getCodeActions(
          ast,
          symbolTable,
          diagnostic.range,
          [diagnostic],
          documentUri,
          code
        );

        const action = actions.find(a => a.title.includes('Add missing END MODULE'));
        expect(action).toBeDefined();
        expect(action?.edit?.changes?.[documentUri][0].newText).toContain('END MODULE');
      });

      it('should provide quick fix to add missing END OBJECT', () => {
        const code = `
IMPLEMENTATION MODULE Test;
OBJECT Counter;
  VAR count: INTEGER;
  (* Missing END OBJECT *)
END MODULE;
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code, { errorRecovery: true });
        const symbolTable = analyzer.getSymbolTable();

        const diagnostic: Diagnostic = {
          range: {
            start: { line: 4, character: 0 },
            end: { line: 4, character: 10 }
          },
          message: "Expected END OBJECT",
          severity: DiagnosticSeverity.Error
        };

        const actions = getCodeActions(
          ast,
          symbolTable,
          diagnostic.range,
          [diagnostic],
          documentUri,
          code
        );

        const action = actions.find(a => a.title.includes('Add missing END OBJECT'));
        expect(action).toBeDefined();
        expect(action?.edit?.changes?.[documentUri][0].newText).toContain('END OBJECT');
      });
    });
  });

  describe('Refactorings', () => {
    describe('Extract variable', () => {
      it('should provide extract variable for binary expression', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR result: INTEGER;
BEGIN
  result := 10 + 20;
END PROCEDURE;
END MODULE;
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code);
        const symbolTable = analyzer.getSymbolTable();

        // Position on the "10 + 20" expression
        const range: Range = {
          start: { line: 4, character: 12 },
          end: { line: 4, character: 19 }
        };

        const actions = getCodeActions(
          ast,
          symbolTable,
          range,
          [],
          documentUri,
          code
        );

        const action = actions.find(a => a.title.includes('Extract to variable'));
        expect(action).toBeDefined();
        expect(action?.kind).toBe(CodeActionKind.RefactorExtract);
      });

      it('should not provide extract variable for simple identifier', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
VAR y: INTEGER;
BEGIN
  y := x;
END PROCEDURE;
END MODULE;
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code);
        const symbolTable = analyzer.getSymbolTable();

        // Position on the "x" identifier
        const range: Range = {
          start: { line: 5, character: 7 },
          end: { line: 5, character: 8 }
        };

        const actions = getCodeActions(
          ast,
          symbolTable,
          range,
          [],
          documentUri,
          code
        );

        // Should not provide extract variable for simple identifiers
        const action = actions.find(a => a.title.includes('Extract to variable'));
        expect(action).toBeUndefined();
      });

      it('should provide extract variable for call expression', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE GetValue(): INTEGER;
BEGIN
  RETURN 42;
END PROCEDURE;

PROCEDURE Main();
VAR result: INTEGER;
BEGIN
  result := GetValue();
END PROCEDURE;
END MODULE;
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code);
        const symbolTable = analyzer.getSymbolTable();

        // Position on the "()" part of "GetValue()" to hit the CallExpression node
        // (positions on "GetValue" hit the IdentifierExpression child)
        const range: Range = {
          start: { line: 9, character: 21 },
          end: { line: 9, character: 22 }
        };

        const actions = getCodeActions(
          ast,
          symbolTable,
          range,
          [],
          documentUri,
          code
        );

        const action = actions.find(a => a.title.includes('Extract to variable'));
        expect(action).toBeDefined();
      });
    });

    describe('Inline variable', () => {
      it('should provide inline variable refactoring', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR temp: INTEGER;
VAR result: INTEGER;
BEGIN
  temp := 10;
  result := temp;
END PROCEDURE;
END MODULE;
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code);
        const symbolTable = analyzer.getSymbolTable();

        // Position on "temp" identifier in "result := temp"
        const range: Range = {
          start: { line: 6, character: 12 },
          end: { line: 6, character: 16 }
        };

        const actions = getCodeActions(
          ast,
          symbolTable,
          range,
          [],
          documentUri,
          code
        );

        const action = actions.find(a => a.title.includes('Inline variable'));
        expect(action).toBeDefined();
        expect(action?.kind).toBe(CodeActionKind.RefactorInline);
      });
    });

    describe('Extract method', () => {
      it('should provide extract method for statement', () => {
        const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
VAR x: INTEGER;
BEGIN
  x := 10 + 20;
END PROCEDURE;
END MODULE;
        `.trim();

        const { ast, analyzer } = parseAndAnalyze(code);
        const symbolTable = analyzer.getSymbolTable();

        // Position on the ":=" part to hit the AssignmentStatement node
        // (position on "x" hits the IdentifierExpression child)
        const range: Range = {
          start: { line: 4, character: 4 },
          end: { line: 4, character: 6 }
        };

        const actions = getCodeActions(
          ast,
          symbolTable,
          range,
          [],
          documentUri,
          code
        );

        const action = actions.find(a => a.title.includes('Extract to method'));
        expect(action).toBeDefined();
        expect(action?.kind).toBe(CodeActionKind.RefactorExtract);
      });
    });
  });

  describe('Range handling', () => {
    it('should return no actions when diagnostic does not overlap with range', () => {
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
BEGIN
END PROCEDURE;
END MODULE;
      `.trim();

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      const diagnostic: Diagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 }
        },
        message: "Some error",
        severity: DiagnosticSeverity.Error
      };

      // Request actions for a different range
      const requestRange: Range = {
        start: { line: 5, character: 0 },
        end: { line: 5, character: 10 }
      };

      const actions = getCodeActions(
        ast,
        symbolTable,
        requestRange,
        [diagnostic],
        documentUri,
        code
      );

      expect(actions.length).toBe(0);
    });

    it('should return actions when diagnostic overlaps with range', () => {
      // Use valid code - diagnostic is simulated
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
BEGIN
END PROCEDURE;
END MODULE;
      `.trim();

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      const diagnostic: Diagnostic = {
        range: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 9 }
        },
        message: "Keyword 'procedure' must be uppercase",
        severity: DiagnosticSeverity.Error
      };

      // Request actions for overlapping range
      const requestRange: Range = {
        start: { line: 1, character: 5 },
        end: { line: 1, character: 7 }
      };

      const actions = getCodeActions(
        ast,
        symbolTable,
        requestRange,
        [diagnostic],
        documentUri,
        code
      );

      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple diagnostics', () => {
    it('should provide actions for all overlapping diagnostics', () => {
      // Use valid code - diagnostics are simulated
      const code = `
IMPLEMENTATION MODULE Test;
PROCEDURE Main();
BEGIN
END PROCEDURE;
END MODULE;
      `.trim();

      const { ast, analyzer } = parseAndAnalyze(code);
      const symbolTable = analyzer.getSymbolTable();

      const diagnostics: Diagnostic[] = [
        {
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 9 } },
          message: "Keyword 'procedure' must be uppercase",
          severity: DiagnosticSeverity.Error
        },
        {
          range: { start: { line: 2, character: 0 }, end: { line: 2, character: 5 } },
          message: "Keyword 'begin' must be uppercase",
          severity: DiagnosticSeverity.Error
        }
      ];

      // Request actions for range covering both diagnostics
      const requestRange: Range = {
        start: { line: 1, character: 0 },
        end: { line: 2, character: 5 }
      };

      const actions = getCodeActions(
        ast,
        symbolTable,
        requestRange,
        diagnostics,
        documentUri,
        code
      );

      // Should have actions for both diagnostics
      expect(actions.length).toBeGreaterThanOrEqual(2);
      expect(actions.some(a => a.title.includes('PROCEDURE'))).toBe(true);
      expect(actions.some(a => a.title.includes('BEGIN'))).toBe(true);
    });
  });
});
