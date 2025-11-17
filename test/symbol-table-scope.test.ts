/**
 * Test for symbol table scope issue
 * Verifies that symbols defined during analysis can be looked up after analysis completes
 */

import { Lexer } from '../src/language/lexer';
import { Parser } from '../src/language/parser';
import { SemanticAnalyzer } from '../src/language/analyzer';

describe('Symbol Table Scope', () => {
  test('symbols should be accessible after module analysis completes', () => {
    const code = `
DEFINITION MODULE GrpId;

FROM Id IMPORT IdObj;

TYPE
  BTreeIdObj = PROTO (IdObj)
    ASK METHOD Test;
  END PROTO;

END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();
    analyzer.analyze(ast);

    const symbolTable = analyzer.getSymbolTable();

    // Get all symbols
    const allSymbols = symbolTable.getAllSymbols();
    const symbolNames = allSymbols.map(s => s.name);

    // Verify BTreeIdObj exists in getAllSymbols()
    expect(symbolNames).toContain('BTreeIdObj');

    // Now try to lookup the same symbol using lookupGlobal
    // (regular lookup won't work because currentScope exited the MODULE scope)
    const btreeSymbol = symbolTable.lookupGlobal('BTreeIdObj');

    // This should work with lookupGlobal
    expect(btreeSymbol).toBeDefined();
    expect(btreeSymbol?.name).toBe('BTreeIdObj');
  });

  test('symbols should be accessible from globalScope', () => {
    const code = `
DEFINITION MODULE GrpId;

TYPE
  SimpleType = INTEGER;

END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();
    analyzer.analyze(ast);

    const symbolTable = analyzer.getSymbolTable();

    // Access globalScope directly
    const globalScope = (symbolTable as any).globalScope;
    expect(globalScope).toBeDefined();

    // Try to find SimpleType using lookupGlobal (which searches children)
    const simpleType = symbolTable.lookupGlobal('SimpleType');

    // This should work with lookupGlobal
    expect(simpleType).toBeDefined();
  });

  test('lookup should work from any scope after analysis', () => {
    const code = `
DEFINITION MODULE TestMod;

TYPE
  TypeA = INTEGER;
  TypeB = REAL;

VAR
  varA : INTEGER;

END MODULE.
`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const analyzer = new SemanticAnalyzer();
    analyzer.analyze(ast);

    const symbolTable = analyzer.getSymbolTable();

    // All defined symbols should be findable via lookupGlobal
    expect(symbolTable.lookupGlobal('TypeA')).toBeDefined();
    expect(symbolTable.lookupGlobal('TypeB')).toBeDefined();
    expect(symbolTable.lookupGlobal('varA')).toBeDefined();

    // And they should match what's in getAllSymbols()
    const allSymbols = symbolTable.getAllSymbols();
    const typeAInAll = allSymbols.find(s => s.name === 'TypeA');
    const typeAFromLookup = symbolTable.lookupGlobal('TypeA');

    expect(typeAInAll).toBeDefined();
    expect(typeAFromLookup).toBeDefined();
    expect(typeAInAll?.name).toBe(typeAFromLookup?.name);
  });
});
