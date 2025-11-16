/**
 * Manual test of lexer with sample MODSIM III code
 */

import { Lexer } from '../src/language/lexer';

// Sample MODSIM code from language guide
const sample1 = `
PROCEDURE Add(IN a: INTEGER; IN b: INTEGER): INTEGER;
BEGIN
  RETURN a + b;
END PROCEDURE;
`;

const sample2 = `
OBJECT MyObject;
  ASK METHOD GetID: INTEGER;
  BEGIN
    RETURN id;
  END METHOD;

  TELL METHOD RunProcess(IN duration: REAL);
  BEGIN
    WAIT DURATION duration;
  END METHOD;
END OBJECT;
`;

const sample3 = `
IF x = 10 THEN
  OUTPUT("x is 10");
ELSIF x > 10 THEN
  OUTPUT("x is greater than 10");
ELSE
  OUTPUT("x is less than 10");
END IF;
`;

console.log('\n=== Testing Lexer with MODSIM Samples ===\n');

console.log('Sample 1: Simple Procedure');
const lexer1 = new Lexer(sample1);
const tokens1 = lexer1.tokenize();
console.log(`Tokens: ${tokens1.length}`);
tokens1.slice(0, 10).forEach((token) => {
  console.log(`  ${token.type.padEnd(20)} "${token.value}"`);
});

console.log('\nSample 2: Object with Methods');
const lexer2 = new Lexer(sample2);
const tokens2 = lexer2.tokenize();
console.log(`Tokens: ${tokens2.length}`);
tokens2.slice(0, 15).forEach((token) => {
  console.log(`  ${token.type.padEnd(20)} "${token.value}"`);
});

console.log('\nSample 3: IF Statement');
const lexer3 = new Lexer(sample3);
const tokens3 = lexer3.tokenize();
console.log(`Tokens: ${tokens3.length}`);
tokens3.slice(0, 15).forEach((token) => {
  console.log(`  ${token.type.padEnd(20)} "${token.value}"`);
});

console.log('\n=== All samples tokenized successfully! ===\n');
