/**
 * Tests for IMPLEMENTATION module auto-importing from DEFINITION module
 */

import { Lexer } from '../src/language/lexer';
import { Parser } from '../src/language/parser';
import { SemanticAnalyzer } from '../src/language/analyzer';

describe('IMPLEMENTATION Module', () => {
  test('should auto-import symbols from DEFINITION module', () => {
    // First create and analyze the DEFINITION module
    const defCode = `
DEFINITION MODULE TestModule;

TYPE
  TestType = INTEGER;
  MyObj = OBJECT
    value : INTEGER;
    ASK METHOD GetValue() : INTEGER;
  END OBJECT;

VAR
  globalVar : INTEGER;

END MODULE.
`;

    const defLexer = new Lexer(defCode);
    const defTokens = defLexer.tokenize();
    const defParser = new Parser(defTokens);
    const defAst = defParser.parse();

    const defAnalyzer = new SemanticAnalyzer();
    defAnalyzer.analyze(defAst);
    const defSymbolTable = defAnalyzer.getSymbolTable();

    // Now create the IMPLEMENTATION module
    const implCode = `
IMPLEMENTATION MODULE TestModule;

VAR
  localVar : TestType;
  obj : MyObj;

END MODULE.
`;

    const implLexer = new Lexer(implCode);
    const implTokens = implLexer.tokenize();
    const implParser = new Parser(implTokens);
    const implAst = implParser.parse();

    const implAnalyzer = new SemanticAnalyzer();

    // Set up workspace resolver to return DEFINITION module's symbols
    implAnalyzer.setWorkspaceResolver((moduleName: string) => {
      if (moduleName === 'TestModule') {
        return defSymbolTable;
      }
      return undefined;
    });

    const diagnostics = implAnalyzer.analyze(implAst);

    // Should NOT have "undefined identifier" or "unknown type" errors
    const undefinedErrors = diagnostics.filter(d =>
      d.message.includes('Undefined identifier') || d.message.includes('Unknown type')
    );

    // Print any unexpected errors for debugging
    if (undefinedErrors.length > 0) {
      console.log('Unexpected errors:', undefinedErrors.map(d => d.message));
    }

    expect(undefinedErrors).toHaveLength(0);
  });

  test('IMPLEMENTATION module without DEFINITION should work normally', () => {
    const code = `
IMPLEMENTATION MODULE Standalone;

VAR
  localVar : INTEGER;

END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();

    // No workspace resolver - DEFINITION not found
    analyzer.setWorkspaceResolver((_moduleName: string) => {
      return undefined;
    });

    const diagnostics = analyzer.analyze(ast);

    // Should not crash, just work normally
    expect(diagnostics).toBeDefined();
  });

  test('should not import built-in types from DEFINITION', () => {
    const defCode = `
DEFINITION MODULE TestModule;

END MODULE.
`;

    const defLexer = new Lexer(defCode);
    const defTokens = defLexer.tokenize();
    const defParser = new Parser(defTokens);
    const defAst = defParser.parse();

    const defAnalyzer = new SemanticAnalyzer();
    defAnalyzer.analyze(defAst);
    const defSymbolTable = defAnalyzer.getSymbolTable();

    const implCode = `
IMPLEMENTATION MODULE TestModule;

VAR
  x : INTEGER;

END MODULE.
`;

    const implLexer = new Lexer(implCode);
    const implTokens = implLexer.tokenize();
    const implParser = new Parser(implTokens);
    const implAst = implParser.parse();

    const implAnalyzer = new SemanticAnalyzer();
    implAnalyzer.setWorkspaceResolver((moduleName: string) => {
      if (moduleName === 'TestModule') {
        return defSymbolTable;
      }
      return undefined;
    });

    const diagnostics = implAnalyzer.analyze(implAst);

    // Should work without errors
    const typeErrors = diagnostics.filter(d =>
      d.message.includes('Unknown type')
    );
    expect(typeErrors).toHaveLength(0);
  });
});
