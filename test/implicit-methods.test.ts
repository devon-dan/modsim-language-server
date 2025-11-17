/**
 * Tests for implicit object methods (ObjInit, ObjTerminate)
 */

import { Lexer } from '../src/language/lexer';
import { Parser } from '../src/language/parser';
import { SemanticAnalyzer } from '../src/language/analyzer';

describe('Implicit Object Methods', () => {
  test('ObjInit with OVERRIDE should not produce warning', () => {
    const code = `
DEFINITION MODULE Test;

TYPE
  BaseObj = OBJECT
  END OBJECT;

  DerivedObj = OBJECT(BaseObj)
    OVERRIDE
      ASK METHOD ObjInit;
  END OBJECT;

END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();
    const diagnostics = analyzer.analyze(ast);

    // Should NOT have "does not override" error for ObjInit
    const overrideErrors = diagnostics.filter(d =>
      d.message.includes('ObjInit') && d.message.includes('does not override')
    );
    expect(overrideErrors).toHaveLength(0);
  });

  test('ObjTerminate with OVERRIDE should not produce warning', () => {
    const code = `
DEFINITION MODULE Test;

TYPE
  BaseObj = OBJECT
  END OBJECT;

  DerivedObj = OBJECT(BaseObj)
    OVERRIDE
      ASK METHOD ObjTerminate;
  END OBJECT;

END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();
    const diagnostics = analyzer.analyze(ast);

    // Should NOT have "does not override" error for ObjTerminate
    const overrideErrors = diagnostics.filter(d =>
      d.message.includes('ObjTerminate') && d.message.includes('does not override')
    );
    expect(overrideErrors).toHaveLength(0);
  });

  test('other methods with OVERRIDE should still produce warning', () => {
    const code = `
DEFINITION MODULE Test;

TYPE
  BaseObj = OBJECT
  END OBJECT;

  DerivedObj = OBJECT(BaseObj)
    OVERRIDE
      ASK METHOD CustomMethod;
  END OBJECT;

END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();
    const diagnostics = analyzer.analyze(ast);

    // SHOULD have "does not override" error for CustomMethod
    const overrideErrors = diagnostics.filter(d =>
      d.message.includes('CustomMethod') && d.message.includes('does not override')
    );
    expect(overrideErrors.length).toBeGreaterThan(0);
  });

  test('ObjInit and ObjTerminate can be declared without OVERRIDE', () => {
    const code = `
DEFINITION MODULE Test;

TYPE
  MyObj = OBJECT
    ASK METHOD ObjInit;
    ASK METHOD ObjTerminate;
  END OBJECT;

END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();
    const diagnostics = analyzer.analyze(ast);

    // Should not produce any OVERRIDE-related errors
    const overrideErrors = diagnostics.filter(d =>
      d.message.includes('OVERRIDE')
    );
    expect(overrideErrors).toHaveLength(0);
  });

  test('complex inheritance chain with ObjTerminate', () => {
    const code = `
DEFINITION MODULE Test;

FROM Window IMPORT WindowObj;

TYPE
  MyWindowObj = OBJECT(WindowObj)
    OVERRIDE
      ASK METHOD ObjTerminate;
  END OBJECT;

END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();
    const diagnostics = analyzer.analyze(ast);

    // Should NOT have "does not override" error for ObjTerminate
    const overrideErrors = diagnostics.filter(d =>
      d.message.includes('ObjTerminate') && d.message.includes('does not override')
    );
    expect(overrideErrors).toHaveLength(0);
  });
});
