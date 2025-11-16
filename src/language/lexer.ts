/**
 * MODSIM III Lexer (Tokenizer)
 *
 * Converts MODSIM III source code into a stream of tokens.
 * Handles all keywords (ALL CAPS only), operators, literals, and nestable comments.
 */

import { Token, TokenType, KEYWORDS, Position } from './ast';

export class Lexer {
  private source: string;
  private position: number;
  private line: number;
  private column: number;
  private tokens: Token[];

  constructor(source: string) {
    this.source = source;
    this.position = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
  }

  /**
   * Tokenize the source code
   */
  public tokenize(): Token[] {
    this.tokens = [];

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    // Add EOF token
    this.tokens.push(this.createToken(TokenType.EOF, ''));

    return this.tokens;
  }

  /**
   * Scan a single token
   */
  private scanToken(): void {
    const start = this.currentPosition();
    const ch = this.advance();

    // Skip whitespace
    if (this.isWhitespace(ch)) {
      this.skipWhitespace();
      return;
    }

    // Comments
    if (ch === '{') {
      this.scanComment('{', '}');
      return;
    }

    if (ch === '(' && this.peek() === '*') {
      this.advance(); // consume '*'
      this.scanComment('(*', '*)');
      return;
    }

    // String literals
    if (ch === '"') {
      this.scanString(start);
      return;
    }

    // Character literals
    if (ch === "'") {
      this.scanChar(start);
      return;
    }

    // Numbers
    if (this.isDigit(ch)) {
      this.scanNumber(start);
      return;
    }

    // Identifiers and keywords
    if (this.isAlpha(ch)) {
      this.scanIdentifier(start);
      return;
    }

    // Operators and punctuation
    this.scanOperator(start);
  }

  /**
   * Scan a string literal
   */
  private scanString(start: Position): void {
    let value = '';

    while (true) {
      // Scan until we hit a quote or end of file
      while (!this.isAtEnd() && this.peek() !== '"') {
        value += this.advance();
      }

      if (this.isAtEnd()) {
        this.addErrorToken(start, 'Unterminated string literal');
        return;
      }

      this.advance(); // consume the quote

      // MODSIM III: Check for doubled quotes ("") which represents an embedded quote
      // If the next character is also a quote, it's an escaped quote - add one quote to value and continue
      if (!this.isAtEnd() && this.peek() === '"') {
        value += '"'; // Add one embedded quote to the string value
        this.advance(); // consume the second quote
        // Continue the loop to scan more of the string
      } else {
        // Single quote - end of string
        break;
      }
    }

    this.addToken(TokenType.STRING_LITERAL, value, start);
  }

  /**
   * Scan a character literal
   *
   * MODSIM III character literal rules:
   * - Single character: 'x'
   * - Apostrophe character: '''' (four apostrophes represents one apostrophe)
   * - Control characters: 13C (decimal value + C, not in quotes)
   *
   * NOTE: MODSIM does NOT use backslash escapes like '\n' or '\t'
   * Backslash is treated as a regular character: '\' is valid
   */
  private scanChar(start: Position): void {
    if (this.isAtEnd()) {
      this.addErrorToken(start, 'Unterminated character literal');
      return;
    }

    let value = '';

    // Check for doubled apostrophe ('''' = apostrophe character)
    if (this.peek() === "'") {
      this.advance(); // consume first apostrophe of the pair
      if (this.peek() === "'") {
        this.advance(); // consume second apostrophe of the pair
        value = "'"; // The literal value is a single apostrophe

        // Must have closing apostrophe
        if (this.isAtEnd() || this.peek() !== "'") {
          this.addErrorToken(start, 'Unterminated character literal');
          return;
        }
        this.advance(); // consume closing quote
        this.addToken(TokenType.CHAR_LITERAL, value, start);
        return;
      } else {
        // Single apostrophe inside quotes - invalid
        this.addErrorToken(start, 'Invalid character literal');
        return;
      }
    }

    // Single character (including backslash)
    value = this.advance();

    if (this.isAtEnd() || this.peek() !== "'") {
      this.addErrorToken(start, 'Unterminated character literal');
      return;
    }

    this.advance(); // consume closing quote
    this.addToken(TokenType.CHAR_LITERAL, value, start);
  }

  /**
   * Scan a number (integer or real)
   */
  private scanNumber(start: Position): void {
    let value = this.source[this.position - 1];

    // Scan integer part
    while (this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Check for decimal point
    // Accept "100." or "100.5" but not "100.." (range operator)
    if (this.peek() === '.' && this.peekNext() !== '.') {
      value += this.advance(); // consume '.'

      // Scan fractional part (if any - "100." is valid)
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }

      // Check for scientific notation
      if (this.peek() === 'e' || this.peek() === 'E') {
        value += this.advance(); // consume 'e' or 'E'

        // Optional sign
        if (this.peek() === '+' || this.peek() === '-') {
          value += this.advance();
        }

        // Exponent digits
        if (!this.isDigit(this.peek())) {
          this.addErrorToken(start, 'Invalid number format');
          return;
        }

        while (this.isDigit(this.peek())) {
          value += this.advance();
        }
      }

      this.addToken(TokenType.REAL_LITERAL, value, start);
    } else {
      // Check for scientific notation on integers
      if (this.peek() === 'e' || this.peek() === 'E') {
        value += this.advance(); // consume 'e' or 'E'

        // Optional sign
        if (this.peek() === '+' || this.peek() === '-') {
          value += this.advance();
        }

        // Exponent digits
        if (!this.isDigit(this.peek())) {
          this.addErrorToken(start, 'Invalid number format');
          return;
        }

        while (this.isDigit(this.peek())) {
          value += this.advance();
        }

        this.addToken(TokenType.REAL_LITERAL, value, start);
      } else {
        this.addToken(TokenType.INTEGER_LITERAL, value, start);
      }
    }
  }

  /**
   * Scan an identifier or keyword
   */
  private scanIdentifier(start: Position): void {
    let value = this.source[this.position - 1];

    while (this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    // Check if it's a keyword (ALL CAPS only)
    const tokenType = KEYWORDS.get(value);

    if (tokenType) {
      // Valid uppercase keyword
      this.addToken(tokenType, value, start);
    } else {
      // Not a keyword - treat as identifier (even if it's a lowercase keyword)
      // MODSIM is case-insensitive: keywords are uppercase, lowercase versions are identifiers
      // This allows using words like "type", "time", "date" as variable names
      this.addToken(TokenType.IDENTIFIER, value, start);
    }
  }

  /**
   * Scan an operator or punctuation
   */
  private scanOperator(start: Position): void {
    const ch = this.source[this.position - 1];

    switch (ch) {
      case '+':
        this.addToken(TokenType.PLUS, ch, start);
        break;
      case '-':
        this.addToken(TokenType.MINUS, ch, start);
        break;
      case '*':
        this.addToken(TokenType.MULTIPLY, ch, start);
        break;
      case '/':
        this.addToken(TokenType.DIVIDE, ch, start);
        break;
      case ',':
        this.addToken(TokenType.COMMA, ch, start);
        break;
      case ';':
        this.addToken(TokenType.SEMICOLON, ch, start);
        break;
      case '(':
        this.addToken(TokenType.LPAREN, ch, start);
        break;
      case ')':
        this.addToken(TokenType.RPAREN, ch, start);
        break;
      case '[':
        this.addToken(TokenType.LBRACKET, ch, start);
        break;
      case ']':
        this.addToken(TokenType.RBRACKET, ch, start);
        break;
      case '|':
        this.addToken(TokenType.PIPE, ch, start);
        break;
      case '#':
        this.addToken(TokenType.HASH, ch, start);
        break;
      case ':':
        if (this.peek() === '=') {
          this.advance();
          this.addToken(TokenType.ASSIGN, ':=', start);
        } else {
          this.addToken(TokenType.COLON, ch, start);
        }
        break;
      case '=':
        this.addToken(TokenType.EQUAL, ch, start);
        break;
      case '<':
        if (this.peek() === '=') {
          this.advance();
          this.addToken(TokenType.LESS_EQUAL, '<=', start);
        } else if (this.peek() === '>') {
          this.advance();
          this.addToken(TokenType.NOT_EQUAL, '<>', start);
        } else {
          this.addToken(TokenType.LESS_THAN, ch, start);
        }
        break;
      case '>':
        if (this.peek() === '=') {
          this.advance();
          this.addToken(TokenType.GREATER_EQUAL, '>=', start);
        } else {
          this.addToken(TokenType.GREATER_THAN, ch, start);
        }
        break;
      case '.':
        if (this.peek() === '.') {
          this.advance();
          this.addToken(TokenType.RANGE, '..', start);
        } else {
          this.addToken(TokenType.DOT, ch, start);
        }
        break;
      case '}':
        // MODSIM III allows "lax syntax" with dangling closing braces }
        // These are unmatched comment terminators that should be silently ignored
        // This is a quirk of the language - stray } characters are valid and do nothing
        // Do not create a token - just skip it
        break;
      default:
        this.addErrorToken(start, `Unexpected character: '${ch}'`);
    }
  }

  /**
   * Scan a comment (nestable)
   */
  private scanComment(openDelim: string, closeDelim: string): void {
    let depth = 1;
    let value = openDelim;

    while (!this.isAtEnd() && depth > 0) {
      // Check for nested opening delimiter
      if (this.matchSequence(openDelim)) {
        depth++;
        value += openDelim;
        for (let i = 0; i < openDelim.length; i++) {
          this.advance();
        }
      }
      // Check for closing delimiter
      else if (this.matchSequence(closeDelim)) {
        depth--;
        value += closeDelim;
        for (let i = 0; i < closeDelim.length; i++) {
          this.advance();
        }
      } else {
        value += this.advance();
      }
    }

    // Comments are typically ignored, but we can optionally store them for documentation
    // this.addToken(TokenType.COMMENT, value, start);
  }

  /**
   * Skip whitespace
   */
  private skipWhitespace(): void {
    while (!this.isAtEnd() && this.isWhitespace(this.peek())) {
      this.advance();
    }
  }

  /**
   * Check if a sequence of characters matches
   */
  private matchSequence(sequence: string): boolean {
    for (let i = 0; i < sequence.length; i++) {
      if (this.position + i >= this.source.length || this.source[this.position + i] !== sequence[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Advance to next character
   */
  private advance(): string {
    const ch = this.source[this.position];
    this.position++;

    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }

    return ch;
  }

  /**
   * Peek at current character without advancing
   */
  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.position];
  }

  /**
   * Peek at next character without advancing
   */
  private peekNext(): string {
    if (this.position + 1 >= this.source.length) return '\0';
    return this.source[this.position + 1];
  }

  /**
   * Check if at end of source
   */
  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  /**
   * Check if character is whitespace
   */
  private isWhitespace(ch: string): boolean {
    return ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n';
  }

  /**
   * Check if character is a digit
   */
  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  /**
   * Check if character is alphabetic
   */
  private isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  /**
   * Check if character is alphanumeric
   */
  private isAlphaNumeric(ch: string): boolean {
    return this.isAlpha(ch) || this.isDigit(ch);
  }

  /**
   * Get current position
   */
  private currentPosition(): Position {
    return {
      line: this.line,
      column: this.column,
      offset: this.position,
    };
  }

  /**
   * Add a token
   */
  private addToken(type: TokenType, value: string, start: Position): void {
    const token: Token = {
      type,
      value,
      start,
      end: this.currentPosition(),
    };
    this.tokens.push(token);
  }

  /**
   * Add an error token
   */
  private addErrorToken(start: Position, message: string): void {
    const token: Token = {
      type: TokenType.ERROR,
      value: message,
      start,
      end: this.currentPosition(),
    };
    this.tokens.push(token);
  }

  /**
   * Create a token
   */
  private createToken(type: TokenType, value: string): Token {
    const pos = this.currentPosition();
    return {
      type,
      value,
      start: pos,
      end: pos,
    };
  }
}
