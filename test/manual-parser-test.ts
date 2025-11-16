/**
 * Manual test of parser with real MODSIM III code from RAMS codebase
 */

import { Lexer } from '../src/language/lexer';
import { Parser } from '../src/language/parser';

// Sample code from DAcceptCriteria.mod (simplified - no parameterized types)
const sampleDefinitionModule = `
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

console.log('\n=== Testing Parser with Real MODSIM Code ===\n');

try {
  console.log('Sample: DEFINITION MODULE AcceptCriteria');
  console.log('Parsing...');

  const lexer = new Lexer(sampleDefinitionModule);
  const tokens = lexer.tokenize();
  console.log(`Tokenized: ${tokens.length} tokens`);

  const parser = new Parser(tokens);
  const ast = parser.parse();

  console.log('✓ Parsed successfully!');
  console.log(`  Module kind: ${ast.kind}`);
  console.log(`  Module name: ${ast.name}`);
  console.log(`  Imports: ${ast.imports.length}`);
  console.log(`  Declarations: ${ast.declarations.length}`);

  // Check first declaration (AcceptCriteriaObj)
  if (ast.declarations.length > 0) {
    const firstDecl = ast.declarations[0];
    console.log(`  First declaration type: ${firstDecl.type}`);
    if (firstDecl.type === 'TypeDeclaration') {
      console.log(`    Type name: ${firstDecl.name}`);
      if (firstDecl.typeSpec.type === 'ObjectType') {
        const objType = firstDecl.typeSpec as any;
        console.log(`    Object fields: ${objType.fields.length}`);
        console.log(`    Object methods: ${objType.methods.length}`);
        console.log(`    Override methods: ${objType.methods.filter((m: any) => m.isOverride).length}`);
      }
    }
  }

  console.log('\n✓ All parsing successful!\n');
} catch (error: any) {
  console.error('\n✗ Parsing failed:');
  console.error(`  ${error.message}`);
  if (error.token) {
    console.error(`  At line ${error.token.start.line}, column ${error.token.start.column}`);
    console.error(`  Token: ${error.token.type} "${error.token.value}"`);
  }
  process.exit(1);
}
