/**
 * Tests for ANYOBJ built-in type
 */

import { Lexer } from '../src/language/lexer';
import { Parser } from '../src/language/parser';
import { SemanticAnalyzer } from '../src/language/analyzer';

describe('ANYOBJ Type', () => {
  test('ANYOBJ should be recognized as a built-in type', () => {
    const code = `
DEFINITION MODULE Test;

VAR
  obj : ANYOBJ;

END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();
    const diagnostics = analyzer.analyze(ast);

    // Should not have "Unknown type 'ANYOBJ'" error
    const anyobjErrors = diagnostics.filter(d =>
      d.message.includes('Unknown type') && d.message.includes('ANYOBJ')
    );
    expect(anyobjErrors).toHaveLength(0);
  });

  test('ANYOBJ should work as parameter type', () => {
    const code = `
DEFINITION MODULE Test;

TYPE
  TestObj = OBJECT
    ASK METHOD Process(IN item : ANYOBJ);
  END OBJECT;

END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();
    const diagnostics = analyzer.analyze(ast);

    // Should not have "Unknown type 'ANYOBJ'" error
    const anyobjErrors = diagnostics.filter(d =>
      d.message.includes('Unknown type') && d.message.includes('ANYOBJ')
    );
    expect(anyobjErrors).toHaveLength(0);
  });

  test('ANYOBJ should work as return type', () => {
    const code = `
DEFINITION MODULE Test;

TYPE
  TestObj = OBJECT
    ASK METHOD GetObject() : ANYOBJ;
  END OBJECT;

END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();
    const diagnostics = analyzer.analyze(ast);

    // Should not have "Unknown type 'ANYOBJ'" error
    const anyobjErrors = diagnostics.filter(d =>
      d.message.includes('Unknown type') && d.message.includes('ANYOBJ')
    );
    expect(anyobjErrors).toHaveLength(0);
  });

  test('ANYOBJ should work in OBJECT method parameters', () => {
    const code = `
DEFINITION MODULE Test;

TYPE
  TestObj = OBJECT
    ASK METHOD Process(IN item : ANYOBJ);
  END OBJECT;

END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();
    const diagnostics = analyzer.analyze(ast);

    // Should not have "Unknown type 'ANYOBJ'" error
    const anyobjErrors = diagnostics.filter(d =>
      d.message.includes('Unknown type') && d.message.includes('ANYOBJ')
    );
    expect(anyobjErrors).toHaveLength(0);
  });

  test('ANYOBJ should be in symbol table as built-in', () => {
    const code = `
DEFINITION MODULE Test;
END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();
    analyzer.analyze(ast);

    const symbolTable = analyzer.getSymbolTable();
    const anyobjSymbol = symbolTable.lookupGlobal('ANYOBJ');

    expect(anyobjSymbol).toBeDefined();
    expect(anyobjSymbol?.name).toBe('ANYOBJ');
  });
});
