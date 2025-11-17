/**
 * Debug test to see what's in each scope
 */

import { Lexer } from '../src/language/lexer';
import { Parser } from '../src/language/parser';
import { SemanticAnalyzer } from '../src/language/analyzer';

test('debug scope structure', () => {
  const code = `
DEFINITION MODULE TestMod;

TYPE
  TypeA = INTEGER;

END MODULE.
`;

  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const analyzer = new SemanticAnalyzer();
  analyzer.analyze(ast);

  const symbolTable = analyzer.getSymbolTable();

  // Access internal structure
  const globalScope = (symbolTable as any).globalScope;
  const currentScope = (symbolTable as any).currentScope;

  console.log('Global scope name:', globalScope.name);
  console.log('Global scope kind:', globalScope.kind);
  console.log('Global scope symbols:', globalScope.getSymbols().map((s: any) => s.name));
  console.log('Global scope children:', globalScope.children.map((c: any) => c.name));

  console.log('\nCurrent scope name:', currentScope.name);
  console.log('Current scope kind:', currentScope.kind);
  console.log('Current scope symbols:', currentScope.getSymbols().map((s: any) => s.name));

  console.log('\nAll symbols:', symbolTable.getAllSymbols().map(s => s.name));

  // Check children
  for (const child of globalScope.children) {
    console.log(`\nChild scope: ${child.name} (${child.kind})`);
    console.log('  Symbols:', child.getSymbols().map((s: any) => s.name));
  }
});
