/**
 * Manual test for Semantic Analyzer with real MODSIM III code
 */

import { Lexer } from '../src/language/lexer';
import { Parser } from '../src/language/parser';
import { SemanticAnalyzer } from '../src/language/analyzer';

console.log('=== Testing Semantic Analyzer with Real MODSIM Code ===\n');

// Sample MODSIM code from RAMS codebase (DAcceptCriteria.mod)
const content = `
DEFINITION MODULE AcceptCriteria ;

FROM Airline           IMPORT AirlineListObj ;
FROM ACGroup           IMPORT ACGroupObj,
                              ACGroupQueueObj ;

TYPE

   AcceptCriteriaObj = OBJECT (DataIntegrityWithIdObj) ;
      AcceptACGroup     : ACGroupQueueObj ;
      AcceptAirline     : AirlineListObj ;
      ExplicitOnly      : BOOLEAN ;
      ReportId          : IdObj ;

      ASK METHOD AddCriteria (IN token : STRING) ;
      ASK METHOD CopyTo (IN copyCriteria : AcceptCriteriaObj) ;
      ASK METHOD CriteriaDefined () : BOOLEAN ;
      ASK METHOD CriteriaOK (IN flight : FlightDataObj ;
                             OUT status  : STRING) : BOOLEAN ;

      OVERRIDE
         ASK METHOD Dependents () : DataIntegrityQueueObj ;
         ASK METHOD DisplayDetailDBox ;
         ASK METHOD ReturnSelf ;
   END OBJECT ;

END MODULE ;
`.trim();

console.log('Sample: Test Module with types and procedures');
console.log('Analyzing...');

try {
  // Tokenize
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  console.log(`Tokenized: ${tokens.length} tokens`);

  // Parse
  const parser = new Parser(tokens);
  const ast = parser.parse();
  console.log('✓ Parsed successfully!');
  console.log(`  Module kind: ${ast.kind}`);
  console.log(`  Module name: ${ast.name}`);
  console.log(`  Imports: ${ast.imports.length}`);
  console.log(`  Declarations: ${ast.declarations.length}`);

  // Analyze
  const analyzer = new SemanticAnalyzer();
  const diagnostics = analyzer.analyze(ast);

  console.log(`✓ Analyzed successfully!`);
  console.log(`  Diagnostics: ${diagnostics.length}`);

  if (diagnostics.length > 0) {
    console.log('\nDiagnostics:');
    for (const diag of diagnostics) {
      console.log(`  [${diag.severity}] Line ${diag.start.line}: ${diag.message}`);
    }
  }

  const symbolTable = analyzer.getSymbolTable();
  console.log(`\nSymbol Table:`);
  console.log(`  Global scope symbols: ${symbolTable.globalScope.symbols.size}`);
  console.log(`  Child scopes: ${symbolTable.globalScope.children.length}`);

  console.log('\n✓ All analysis successful!');
} catch (error: any) {
  console.error('✗ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
