/**
 * Unit tests for MODSIM III Lexer
 */

import { Lexer } from './lexer';
import { TokenType } from './ast';

describe('Lexer', () => {
  describe('Keywords', () => {
    it('should tokenize ALL CAPS keywords', () => {
      const lexer = new Lexer('BEGIN END IF THEN ELSE PROCEDURE OBJECT');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.BEGIN);
      expect(tokens[1].type).toBe(TokenType.END);
      expect(tokens[2].type).toBe(TokenType.IF);
      expect(tokens[3].type).toBe(TokenType.THEN);
      expect(tokens[4].type).toBe(TokenType.ELSE);
      expect(tokens[5].type).toBe(TokenType.PROCEDURE);
      expect(tokens[6].type).toBe(TokenType.OBJECT);
      expect(tokens[7].type).toBe(TokenType.EOF);
    });

    it('should treat lowercase keywords as identifiers', () => {
      const lexer = new Lexer('begin end if then else');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('begin');
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].value).toBe('end');
    });

    it('should tokenize ASK and TELL keywords', () => {
      const lexer = new Lexer('ASK TELL METHOD');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.ASK);
      expect(tokens[1].type).toBe(TokenType.TELL);
      expect(tokens[2].type).toBe(TokenType.METHOD);
    });

    it('should tokenize WAIT and related keywords', () => {
      const lexer = new Lexer('WAIT DURATION ON INTERRUPT');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.WAIT);
      expect(tokens[1].type).toBe(TokenType.DURATION);
      expect(tokens[2].type).toBe(TokenType.ON);
      expect(tokens[3].type).toBe(TokenType.INTERRUPT);
    });

    it('should tokenize loop keywords', () => {
      const lexer = new Lexer('FOR TO DOWNTO BY DO WHILE LOOP EXIT FOREACH IN');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.FOR);
      expect(tokens[1].type).toBe(TokenType.TO);
      expect(tokens[2].type).toBe(TokenType.DOWNTO);
      expect(tokens[3].type).toBe(TokenType.BY);
      expect(tokens[4].type).toBe(TokenType.DO);
      expect(tokens[5].type).toBe(TokenType.WHILE);
      expect(tokens[6].type).toBe(TokenType.LOOP);
      expect(tokens[7].type).toBe(TokenType.EXIT);
      expect(tokens[8].type).toBe(TokenType.FOREACH);
      expect(tokens[9].type).toBe(TokenType.IN);
    });

    it('should tokenize type keywords', () => {
      const lexer = new Lexer('TYPE INTEGER REAL BOOLEAN STRING ARRAY RECORD');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.TYPE);
      expect(tokens[1].type).toBe(TokenType.INTEGER);
      expect(tokens[2].type).toBe(TokenType.REAL);
      expect(tokens[3].type).toBe(TokenType.BOOLEAN);
      expect(tokens[4].type).toBe(TokenType.STRING);
      expect(tokens[5].type).toBe(TokenType.ARRAY);
      expect(tokens[6].type).toBe(TokenType.RECORD);
    });

    it('should tokenize boolean and nil literals', () => {
      const lexer = new Lexer('TRUE FALSE NILOBJ NILREC NILARRAY');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.TRUE);
      expect(tokens[1].type).toBe(TokenType.FALSE);
      expect(tokens[2].type).toBe(TokenType.NILOBJ);
      expect(tokens[3].type).toBe(TokenType.NILREC);
      expect(tokens[4].type).toBe(TokenType.NILARRAY);
    });
  });

  describe('Operators', () => {
    it('should tokenize assignment operator', () => {
      const lexer = new Lexer('x := 10');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].type).toBe(TokenType.ASSIGN);
      expect(tokens[1].value).toBe(':=');
    });

    it('should tokenize comparison operators', () => {
      const lexer = new Lexer('= <> < > <= >=');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.EQUAL);
      expect(tokens[1].type).toBe(TokenType.NOT_EQUAL);
      expect(tokens[2].type).toBe(TokenType.LESS_THAN);
      expect(tokens[3].type).toBe(TokenType.GREATER_THAN);
      expect(tokens[4].type).toBe(TokenType.LESS_EQUAL);
      expect(tokens[5].type).toBe(TokenType.GREATER_EQUAL);
    });

    it('should tokenize arithmetic operators', () => {
      const lexer = new Lexer('+ - * / DIV MOD');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.PLUS);
      expect(tokens[1].type).toBe(TokenType.MINUS);
      expect(tokens[2].type).toBe(TokenType.MULTIPLY);
      expect(tokens[3].type).toBe(TokenType.DIVIDE);
      expect(tokens[4].type).toBe(TokenType.DIV);
      expect(tokens[5].type).toBe(TokenType.MOD);
    });

    it('should tokenize logical operators', () => {
      const lexer = new Lexer('AND OR NOT XOR');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.AND);
      expect(tokens[1].type).toBe(TokenType.OR);
      expect(tokens[2].type).toBe(TokenType.NOT);
      expect(tokens[3].type).toBe(TokenType.XOR);
    });

    it('should tokenize punctuation', () => {
      const lexer = new Lexer('. , ; : ( ) [ ] |');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.DOT);
      expect(tokens[1].type).toBe(TokenType.COMMA);
      expect(tokens[2].type).toBe(TokenType.SEMICOLON);
      expect(tokens[3].type).toBe(TokenType.COLON);
      expect(tokens[4].type).toBe(TokenType.LPAREN);
      expect(tokens[5].type).toBe(TokenType.RPAREN);
      expect(tokens[6].type).toBe(TokenType.LBRACKET);
      expect(tokens[7].type).toBe(TokenType.RBRACKET);
      expect(tokens[8].type).toBe(TokenType.PIPE);
    });

    it('should tokenize range operator', () => {
      const lexer = new Lexer('1..10');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.INTEGER_LITERAL);
      expect(tokens[1].type).toBe(TokenType.RANGE);
      expect(tokens[1].value).toBe('..');
      expect(tokens[2].type).toBe(TokenType.INTEGER_LITERAL);
    });
  });

  describe('Identifiers', () => {
    it('should tokenize simple identifiers', () => {
      const lexer = new Lexer('x myVar _temp');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('x');
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].value).toBe('myVar');
      expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2].value).toBe('_temp');
    });

    it('should tokenize identifiers with numbers', () => {
      const lexer = new Lexer('var1 x2y3 _temp99');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('var1');
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].value).toBe('x2y3');
    });
  });

  describe('String Literals', () => {
    it('should tokenize simple string literals', () => {
      const lexer = new Lexer('"Hello World"');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.STRING_LITERAL);
      expect(tokens[0].value).toBe('Hello World');
    });

    it('should handle backslash as regular character in strings', () => {
      const lexer = new Lexer('"Line 1\\nLine 2\\tTab"');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.STRING_LITERAL);
      // MODSIM doesn't process escape sequences - backslash is literal
      expect(tokens[0].value).toBe('Line 1\\nLine 2\\tTab');
    });

    it('should handle doubled quotes in strings', () => {
      const lexer = new Lexer('"Say ""Hello"""');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.STRING_LITERAL);
      // MODSIM uses "" for embedded quote
      expect(tokens[0].value).toBe('Say "Hello"');
    });

    it('should detect unterminated strings', () => {
      const lexer = new Lexer('"Unterminated string');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.ERROR);
      expect(tokens[0].value).toContain('Unterminated');
    });
  });

  describe('Character Literals', () => {
    it('should tokenize simple character literals', () => {
      const lexer = new Lexer("'A'");
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.CHAR_LITERAL);
      expect(tokens[0].value).toBe('A');
    });

    it('should handle backslash as regular character', () => {
      const lexer = new Lexer("'\\'");
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.CHAR_LITERAL);
      // MODSIM treats backslash as regular character
      expect(tokens[0].value).toBe('\\');
    });

    it('should handle apostrophe character with four apostrophes', () => {
      const lexer = new Lexer("''''");
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.CHAR_LITERAL);
      // MODSIM uses '''' to represent single apostrophe
      expect(tokens[0].value).toBe("'");
    });
  });

  describe('Numeric Literals', () => {
    it('should tokenize integer literals', () => {
      const lexer = new Lexer('0 123 999');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.INTEGER_LITERAL);
      expect(tokens[0].value).toBe('0');
      expect(tokens[1].type).toBe(TokenType.INTEGER_LITERAL);
      expect(tokens[1].value).toBe('123');
      expect(tokens[2].type).toBe(TokenType.INTEGER_LITERAL);
      expect(tokens[2].value).toBe('999');
    });

    it('should tokenize real literals', () => {
      const lexer = new Lexer('3.14 0.5 123.456');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.REAL_LITERAL);
      expect(tokens[0].value).toBe('3.14');
      expect(tokens[1].type).toBe(TokenType.REAL_LITERAL);
      expect(tokens[1].value).toBe('0.5');
      expect(tokens[2].type).toBe(TokenType.REAL_LITERAL);
      expect(tokens[2].value).toBe('123.456');
    });

    it('should tokenize scientific notation', () => {
      const lexer = new Lexer('1.23e4 5.67E-8 9e10');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.REAL_LITERAL);
      expect(tokens[0].value).toBe('1.23e4');
      expect(tokens[1].type).toBe(TokenType.REAL_LITERAL);
      expect(tokens[1].value).toBe('5.67E-8');
      expect(tokens[2].type).toBe(TokenType.REAL_LITERAL);
      expect(tokens[2].value).toBe('9e10');
    });
  });

  describe('Comments', () => {
    it('should skip brace comments', () => {
      const lexer = new Lexer('BEGIN { comment } END');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.BEGIN);
      expect(tokens[1].type).toBe(TokenType.END);
      expect(tokens[2].type).toBe(TokenType.EOF);
    });

    it('should skip parenthesis-star comments', () => {
      const lexer = new Lexer('BEGIN (* comment *) END');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.BEGIN);
      expect(tokens[1].type).toBe(TokenType.END);
      expect(tokens[2].type).toBe(TokenType.EOF);
    });

    it('should handle nested comments', () => {
      const lexer = new Lexer('BEGIN { outer { inner } outer } END');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.BEGIN);
      expect(tokens[1].type).toBe(TokenType.END);
      expect(tokens[2].type).toBe(TokenType.EOF);
    });

    it('should handle mixed nested comments', () => {
      const lexer = new Lexer('BEGIN { outer (* inner *) outer } END');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.BEGIN);
      expect(tokens[1].type).toBe(TokenType.END);
      expect(tokens[2].type).toBe(TokenType.EOF);
    });
  });

  describe('Position Tracking', () => {
    it('should track line and column positions', () => {
      const lexer = new Lexer('BEGIN\n  x := 10;\nEND');
      const tokens = lexer.tokenize();

      expect(tokens[0].start.line).toBe(1);
      expect(tokens[0].start.column).toBe(1);

      expect(tokens[1].start.line).toBe(2);
      expect(tokens[1].start.column).toBe(3);
    });
  });

  describe('Complex Code', () => {
    it('should tokenize a simple procedure', () => {
      const code = `
PROCEDURE Add(IN a: INTEGER; IN b: INTEGER): INTEGER;
BEGIN
  RETURN a + b;
END PROCEDURE;
      `.trim();

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.PROCEDURE);
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].value).toBe('Add');
      expect(tokens[2].type).toBe(TokenType.LPAREN);
      expect(tokens[3].type).toBe(TokenType.IN);
    });

    it('should tokenize ASK/TELL statements', () => {
      const code = 'ASK obj TO Method(); TELL obj TO Process();';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.ASK);
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2].type).toBe(TokenType.TO);
      expect(tokens[3].type).toBe(TokenType.IDENTIFIER);

      expect(tokens[7].type).toBe(TokenType.TELL);
      expect(tokens[8].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[9].type).toBe(TokenType.TO);
    });
  });

  describe('Error Handling', () => {
    it('should report unexpected characters', () => {
      const lexer = new Lexer('BEGIN @ END');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.BEGIN);
      expect(tokens[1].type).toBe(TokenType.ERROR);
      expect(tokens[2].type).toBe(TokenType.END);
    });
  });
});
