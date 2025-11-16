/**
 * MODSIM III Parser
 *
 * Builds an Abstract Syntax Tree (AST) from tokens produced by the lexer.
 * Implements recursive descent parsing for the complete MODSIM III grammar.
 */

import { Token, TokenType, Module } from './ast';
import type {
  ImportStatement,
  ExportStatement,
  Declaration,
  TypeDeclaration,
  ConstDeclaration,
  VarDeclaration,
  ProcedureDeclaration,
  ObjectDeclaration,
  MethodDeclaration,
  Parameter,
  TypeSpec,
  ArrayType,
  RecordType,
  Statement,
  Expression,
} from './ast';

export class ParseError extends Error {
  constructor(
    message: string,
    public token: Token
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private errors: ParseError[] = [];
  private errorRecovery: boolean = false;

  constructor(tokens: Token[], options?: { errorRecovery?: boolean }) {
    // Filter out ERROR tokens to handle lexical errors gracefully
    // This allows the parser to skip over malformed characters while continuing to parse valid syntax
    this.tokens = tokens.filter(t => t.type !== TokenType.ERROR);
    this.errorRecovery = options?.errorRecovery ?? false;
  }

  /**
   * Parse the token stream into a Module AST
   */
  public parse(): Module {
    try {
      return this.parseModule();
    } catch (error) {
      if (error instanceof ParseError) {
        this.errors.push(error);
      }
      // In error recovery mode, return a partial module
      if (this.errorRecovery) {
        return {
          type: 'Module',
          kind: 'IMPLEMENTATION',
          name: 'ErrorRecovery',
          imports: [],
          declarations: [],
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        };
      }
      throw error;
    }
  }

  /**
   * Get parse errors
   */
  public getErrors(): ParseError[] {
    return this.errors;
  }

  // ====================
  // Module parsing
  // ====================

  private parseModule(): Module {
    const start = this.peek().start;

    // Optional LIBRARY keyword (RAMS extension)
    // Example: LIBRARY DEFINITION MODULE Name ;
    this.match(TokenType.LIBRARY);

    // Check for PROGRAM as alternative to MAIN MODULE
    let isProgramSyntax = false;
    if (this.check(TokenType.PROGRAM)) {
      isProgramSyntax = true;
      this.advance(); // consume PROGRAM
    }

    // DEFINITION MODULE or IMPLEMENTATION MODULE or MAIN MODULE
    let kind: 'DEFINITION' | 'IMPLEMENTATION' | 'MAIN';
    if (isProgramSyntax) {
      kind = 'MAIN';
    } else {
      kind = this.match(TokenType.DEFINITION)
        ? 'DEFINITION'
        : this.match(TokenType.IMPLEMENTATION)
          ? 'IMPLEMENTATION'
          : this.match(TokenType.MAIN)
            ? 'MAIN'
            : this.error('Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM');
      this.consume(TokenType.MODULE, 'Expected MODULE keyword');
    }

    const name = this.consume(TokenType.IDENTIFIER, 'Expected module name').value;
    this.match(TokenType.SEMICOLON); // Semicolon is optional after module name

    // Parse imports
    const imports: ImportStatement[] = [];
    while (this.check(TokenType.FROM) || this.check(TokenType.IMPORT)) {
      if (this.check(TokenType.FROM)) {
        imports.push(this.parseImport());
      } else {
        // Standalone IMPORT statement
        imports.push(...this.parseStandaloneImport());
      }
    }

    // Parse exports (DEFINITION MODULE only)
    let exports: ExportStatement | undefined;
    if (this.check(TokenType.EXPORT)) {
      exports = this.parseExport();
    }

    // Parse declarations
    const declarations: Declaration[] = [];
    while (!this.check(TokenType.END) && !this.check(TokenType.BEGIN) && !this.isAtEnd()) {
      // Skip extra semicolons (from documentation comments, formatting, etc.)
      while (this.match(TokenType.SEMICOLON)) {
        // Skip
      }
      if (!this.check(TokenType.END) && !this.check(TokenType.BEGIN) && !this.isAtEnd()) {
        declarations.push(this.parseDeclaration());
      }
    }

    // For MAIN MODULE, parse optional BEGIN...END block
    let mainBody: Statement[] | undefined;
    if (kind === 'MAIN' && this.match(TokenType.BEGIN)) {
      mainBody = [];
      while (!this.check(TokenType.END) && !this.isAtEnd()) {
        mainBody.push(this.parseStatement());
        // Semicolons are optional between statements
        this.match(TokenType.SEMICOLON);
      }
    }

    this.consumeOrRecover(TokenType.END, 'Expected END');
    if (isProgramSyntax) {
      this.consumeOrRecover(TokenType.PROGRAM, 'Expected PROGRAM');
    } else {
      this.consumeOrRecover(TokenType.MODULE, 'Expected MODULE');
    }
    // RAMS uses DOT instead of semicolon: END MODULE.
    // Some files use semicolon instead: END MODULE;
    if (!this.match(TokenType.DOT)) {
      this.match(TokenType.SEMICOLON); // Accept semicolon as alternative
    }

    return {
      type: 'Module',
      kind,
      name,
      imports,
      exports,
      declarations,
      mainBody,
      start,
      end: this.previous().end,
    };
  }

  private parseImport(): ImportStatement {
    const start = this.advance().start; // FROM
    const moduleName = this.consume(TokenType.IDENTIFIER, 'Expected module name').value;
    this.consume(TokenType.IMPORT, 'Expected IMPORT');

    const symbols: Array<{ name: string; alias?: string }> = [];

    // Parse first symbol (with optional ALL prefix for enum imports)
    // RAMS allows: FROM Module IMPORT ALL EnumType ; (imports all enum values)
    if (this.check(TokenType.IDENTIFIER) && this.peek().value === 'ALL') {
      this.advance(); // consume 'ALL'
    }
    let symbolName = this.consume(TokenType.IDENTIFIER, 'Expected symbol name').value;

    // Check for enum value list: EnumType (Value1, Value2, Value3 AS Alias, ...)
    // RAMS allows importing specific enum values with optional AS aliases
    if (this.match(TokenType.LPAREN)) {
      // Parse enum values (we just skip them for now, AST doesn't track them)
      do {
        this.consume(TokenType.IDENTIFIER, 'Expected enum value');
        // Check for AS alias for individual enum values
        if (this.match(TokenType.AS)) {
          this.consume(TokenType.IDENTIFIER, 'Expected alias name after AS');
        }
      } while (this.match(TokenType.COMMA));
      this.consume(TokenType.RPAREN, 'Expected )');
    }

    let alias: string | undefined;
    if (this.match(TokenType.AS)) {
      alias = this.consume(TokenType.IDENTIFIER, 'Expected alias name after AS').value;
    }
    symbols.push({ name: symbolName, alias });

    // Parse remaining symbols
    while (this.match(TokenType.COMMA)) {
      // Check for optional ALL prefix
      if (this.check(TokenType.IDENTIFIER) && this.peek().value === 'ALL') {
        this.advance(); // consume 'ALL'
      }
      symbolName = this.consume(TokenType.IDENTIFIER, 'Expected symbol name').value;

      // Check for enum value list
      if (this.match(TokenType.LPAREN)) {
        do {
          this.consume(TokenType.IDENTIFIER, 'Expected enum value');
          // Check for AS alias for individual enum values
          if (this.match(TokenType.AS)) {
            this.consume(TokenType.IDENTIFIER, 'Expected alias name after AS');
          }
        } while (this.match(TokenType.COMMA));
        this.consume(TokenType.RPAREN, 'Expected )');
      }

      alias = undefined;
      if (this.match(TokenType.AS)) {
        alias = this.consume(TokenType.IDENTIFIER, 'Expected alias name after AS').value;
      }
      symbols.push({ name: symbolName, alias });
    }

    this.consume(TokenType.SEMICOLON, 'Expected semicolon');

    return {
      type: 'ImportStatement',
      moduleName,
      symbols,
      start,
      end: this.previous().end,
    };
  }

  private parseExport(): ExportStatement {
    const start = this.advance().start; // EXPORT
    const symbols: string[] = [];

    // Parse first symbol
    symbols.push(this.consume(TokenType.IDENTIFIER, 'Expected symbol name').value);

    // Parse remaining symbols
    while (this.match(TokenType.COMMA)) {
      symbols.push(this.consume(TokenType.IDENTIFIER, 'Expected symbol name').value);
    }

    this.consume(TokenType.SEMICOLON, 'Expected semicolon');

    return {
      type: 'ExportStatement',
      symbols,
      start,
      end: this.previous().end,
    };
  }

  private parseStandaloneImport(): ImportStatement[] {
    const start = this.advance().start; // IMPORT
    const imports: ImportStatement[] = [];

    // Parse first module
    const firstModule = this.consume(TokenType.IDENTIFIER, 'Expected module name').value;
    imports.push({
      type: 'ImportStatement',
      moduleName: firstModule,
      symbols: [], // Empty array means "import all"
      start,
      end: this.previous().end,
    });

    // Parse remaining modules
    while (this.match(TokenType.COMMA)) {
      const moduleName = this.consume(TokenType.IDENTIFIER, 'Expected module name').value;
      imports.push({
        type: 'ImportStatement',
        moduleName,
        symbols: [], // Empty array means "import all"
        start,
        end: this.previous().end,
      });
    }

    this.consume(TokenType.SEMICOLON, 'Expected semicolon');

    return imports;
  }

  // ====================
  // Declaration parsing
  // ====================

  private lastDeclKeyword: TokenType | null = null; // Track last declaration keyword seen

  private parseDeclaration(): Declaration {
    // RAMS style: TYPE/CONST/VAR keyword appears once, followed by multiple declarations
    // Check if this looks like a continuation (Identifier = or Identifier :)
    if (this.check(TokenType.IDENTIFIER)) {
      const next = this.peekNext();
      if (next && next.type === TokenType.EQUAL) {
        // Continuation of TYPE or CONST section, OR implicit TYPE at module level
        if (this.lastDeclKeyword === TokenType.TYPE) {
          return this.parseTypeDeclarationWithoutKeyword();
        } else if (this.lastDeclKeyword === TokenType.CONST) {
          return this.parseConstDeclarationWithoutKeyword();
        } else {
          // No lastDeclKeyword - check if it's a type declaration (Identifier = OBJECT/RECORD/PROTO/etc)
          // or a const declaration (Identifier = expression)
          // Look ahead two tokens to see what comes after the =
          const afterEqual = this.current + 2 < this.tokens.length ? this.tokens[this.current + 2] : null;
          if (afterEqual && (afterEqual.type === TokenType.OBJECT || afterEqual.type === TokenType.RECORD ||
                             afterEqual.type === TokenType.PROTO || afterEqual.type === TokenType.ARRAY ||
                             afterEqual.type === TokenType.SET || afterEqual.type === TokenType.LPAREN)) {
            // It's a type declaration (RAMS allows omitting TYPE keyword at module level)
            this.lastDeclKeyword = TokenType.TYPE;
            return this.parseTypeDeclarationWithoutKeyword();
          }
          // Otherwise fall through (might be CONST without keyword, but that's less common)
        }
      } else if (next && (next.type === TokenType.COLON || next.type === TokenType.COMMA)) {
        // Could be VAR continuation (name : type or name1, name2 : type)
        // Only treat as VAR if we saw VAR keyword before
        if (this.lastDeclKeyword === TokenType.VAR) {
          return this.parseVarDeclarationWithoutKeyword();
        }
      }
    }

    // Standard declaration with keyword
    if (this.check(TokenType.TYPE)) {
      this.lastDeclKeyword = TokenType.TYPE;
      const typeDecl = this.parseTypeDeclaration();
      if (typeDecl) {
        return typeDecl;
      }
      // Empty TYPE section - recursively parse next declaration
      // (The TYPE token was already consumed in parseTypeDeclaration)
      if (!this.isAtEnd() && !this.check(TokenType.END) && !this.check(TokenType.BEGIN)) {
        return this.parseDeclaration();
      }
      // If at END or BEGIN, create a dummy type declaration for the empty section
      // RAMS allows empty TYPE sections before END MODULE
      const pos = this.previous().start;
      return {
        type: 'TypeDeclaration',
        name: '__EMPTY_TYPE_SECTION__',
        typeSpec: {
          type: 'SimpleType',
          name: 'BOOLEAN',
          start: pos,
          end: pos,
        },
        start: pos,
        end: pos,
      };
    }
    if (this.check(TokenType.CONST)) {
      this.lastDeclKeyword = TokenType.CONST;
      return this.parseConstDeclaration();
    }
    if (this.check(TokenType.VAR)) {
      this.lastDeclKeyword = TokenType.VAR;
      return this.parseVarDeclaration();
    }
    if (this.check(TokenType.PROCEDURE)) {
      // Don't reset lastDeclKeyword - PROCEDURE can appear within TYPE/CONST sections
      // The TYPE/CONST context should continue after the PROCEDURE
      return this.parseProcedureDeclaration();
    }
    if (this.check(TokenType.OBJECT)) {
      this.lastDeclKeyword = null; // Reset
      return this.parseObjectDeclaration();
    }
    if (this.check(TokenType.PROTO)) {
      // PROTO can appear at module level in RAMS for implementing proto methods
      // Syntax: PROTO TypeName ; followed by method implementations
      this.lastDeclKeyword = null; // Reset
      return this.parseProtoImplementation();
    }

    // Reset on unexpected token
    this.lastDeclKeyword = null;
    throw this.error('Expected declaration (TYPE, CONST, VAR, PROCEDURE, OBJECT, or PROTO)');
  }

  // Helper to peek at next token without consuming current
  private peekNext(): Token | null {
    if (this.current + 1 < this.tokens.length) {
      return this.tokens[this.current + 1];
    }
    return null;
  }

  // Lookahead to see if there's a BEGIN before hitting module-level constructs
  // Returns true if BEGIN is found, false if we hit module-level indicators first
  private lookaheadForBegin(): boolean {
    let depth = 0; // Track nesting of BEGIN/END pairs
    for (let i = this.current; i < this.tokens.length && i < this.current + 100; i++) {
      const token = this.tokens[i];

      if (token.type === TokenType.BEGIN) {
        if (depth === 0) {
          return true; // Found BEGIN at our level
        }
        depth++;
      } else if (token.type === TokenType.END) {
        if (depth > 0) {
          depth--;
        } else {
          // END at our level without matching BEGIN - likely END MODULE/OBJECT/etc
          return false;
        }
      } else if (depth === 0) {
        // At our level, check for module-level indicators
        if (token.type === TokenType.PROCEDURE ||
            token.type === TokenType.OBJECT) {
          return false; // Hit another top-level declaration
        }
      }
    }
    return false; // Didn't find BEGIN within lookahead limit
  }

  private parseTypeDeclaration(): TypeDeclaration | null {
    const start = this.advance().start; // TYPE

    // Check for empty TYPE section (RAMS allows empty sections)
    // If no IDENTIFIER follows, this is an empty section marker
    if (!this.check(TokenType.IDENTIFIER)) {
      return null; // Signal empty section
    }

    const name = this.consume(TokenType.IDENTIFIER, 'Expected type name').value;
    this.consume(TokenType.EQUAL, 'Expected =');
    const typeSpec = this.parseTypeSpec();
    this.consume(TokenType.SEMICOLON, 'Expected semicolon');

    return {
      type: 'TypeDeclaration',
      name,
      typeSpec,
      start,
      end: this.previous().end,
    };
  }

  // Parse type declaration without TYPE keyword (RAMS continuation style)
  private parseTypeDeclarationWithoutKeyword(): TypeDeclaration {
    const start = this.peek().start;
    const name = this.consume(TokenType.IDENTIFIER, 'Expected type name').value;
    this.consume(TokenType.EQUAL, 'Expected =');
    const typeSpec = this.parseTypeSpec();
    this.consume(TokenType.SEMICOLON, 'Expected semicolon');

    return {
      type: 'TypeDeclaration',
      name,
      typeSpec,
      start,
      end: this.previous().end,
    };
  }

  private parseConstDeclaration(): ConstDeclaration {
    const start = this.advance().start; // CONST
    const name = this.consume(TokenType.IDENTIFIER, 'Expected constant name').value;

    let valueType: TypeSpec | undefined;
    if (this.match(TokenType.COLON)) {
      valueType = this.parseTypeSpec();
    }

    this.consume(TokenType.EQUAL, 'Expected =');
    const value = this.parseExpression();
    this.consume(TokenType.SEMICOLON, 'Expected semicolon');

    return {
      type: 'ConstDeclaration',
      name,
      valueType,
      value,
      start,
      end: this.previous().end,
    };
  }

  // Parse const declaration without CONST keyword (RAMS continuation style)
  private parseConstDeclarationWithoutKeyword(): ConstDeclaration {
    const start = this.peek().start;
    const name = this.consume(TokenType.IDENTIFIER, 'Expected constant name').value;

    let valueType: TypeSpec | undefined;
    if (this.match(TokenType.COLON)) {
      valueType = this.parseTypeSpec();
    }

    this.consume(TokenType.EQUAL, 'Expected =');
    const value = this.parseExpression();
    this.consume(TokenType.SEMICOLON, 'Expected semicolon');

    return {
      type: 'ConstDeclaration',
      name,
      valueType,
      value,
      start,
      end: this.previous().end,
    };
  }

  private parseVarDeclaration(): VarDeclaration {
    const start = this.advance().start; // VAR

    // Check for empty VAR section (VAR followed by PROCEDURE, TYPE, CONST, etc.)
    // This is valid MODSIM III syntax
    if (
      this.check(TokenType.PROCEDURE) ||
      this.check(TokenType.TYPE) ||
      this.check(TokenType.CONST) ||
      this.check(TokenType.OBJECT)
    ) {
      // Return empty var declaration
      return {
        type: 'VarDeclaration',
        names: [],
        valueType: {
          type: 'SimpleType',
          name: 'EMPTY',
          start,
          end: this.previous().end,
        },
        start,
        end: this.previous().end,
      };
    }

    const names: string[] = [];
    names.push(this.consume(TokenType.IDENTIFIER, 'Expected variable name').value);

    while (this.match(TokenType.COMMA)) {
      names.push(this.consume(TokenType.IDENTIFIER, 'Expected variable name').value);
    }

    this.consume(TokenType.COLON, 'Expected colon');
    const valueType = this.parseTypeSpec();
    this.match(TokenType.SEMICOLON); // Optional semicolon after VAR

    return {
      type: 'VarDeclaration',
      names,
      valueType,
      start,
      end: this.previous().end,
    };
  }

  private parseVarDeclarationWithoutKeyword(): VarDeclaration {
    // Parse VAR declaration without consuming VAR keyword (for continuations)
    const start = this.peek().start;
    const names: string[] = [];
    names.push(this.consume(TokenType.IDENTIFIER, 'Expected variable name').value);

    while (this.match(TokenType.COMMA)) {
      names.push(this.consume(TokenType.IDENTIFIER, 'Expected variable name').value);
    }

    this.consume(TokenType.COLON, 'Expected colon');
    const valueType = this.parseTypeSpec();
    this.match(TokenType.SEMICOLON); // Optional semicolon after VAR

    return {
      type: 'VarDeclaration',
      names,
      valueType,
      start,
      end: this.previous().end,
    };
  }

  private parseProcedureDeclaration(): ProcedureDeclaration {
    const start = this.advance().start; // PROCEDURE
    const name = this.consume(TokenType.IDENTIFIER, 'Expected procedure name').value;

    // Parameters
    const parameters: Parameter[] = [];
    if (this.match(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        do {
          parameters.push(...this.parseParameter()); // parseParameter now returns array
        } while (this.match(TokenType.SEMICOLON));
      }
      this.consume(TokenType.RPAREN, 'Expected )');
    }

    // Return type
    let returnType: TypeSpec | undefined;
    if (this.match(TokenType.COLON)) {
      returnType = this.parseTypeSpec();
    }

    // Check for optional NONMODSIM pragma (external procedure)
    // Example: PROCEDURE Name(...) : ReturnType ; NONMODSIM "C" ;
    // OR:      PROCEDURE Name(...) : ReturnType NONMODSIM "C" ;
    // Note: semicolon before NONMODSIM is optional in RAMS
    const hasNonModSim = (this.check(TokenType.IDENTIFIER) && this.peek().value === 'NONMODSIM') ||
                         (this.check(TokenType.SEMICOLON) && this.peekAhead(1)?.type === TokenType.IDENTIFIER && this.peekAhead(1)?.value === 'NONMODSIM');
    if (hasNonModSim) {
      this.match(TokenType.SEMICOLON); // Optional semicolon before NONMODSIM
      this.consume(TokenType.IDENTIFIER, 'Expected NONMODSIM'); // consume NONMODSIM
      // Consume the language string (e.g., "C")
      if (this.check(TokenType.STRING_LITERAL)) {
        this.advance();
      }
      this.consume(TokenType.SEMICOLON, 'Expected semicolon after NONMODSIM pragma');
      // NONMODSIM procedures have no body - treat as forward declaration
      return {
        type: 'ProcedureDeclaration',
        name,
        parameters,
        returnType,
        localDeclarations: undefined,
        body: [], // Empty body for external procedure
        start,
        end: this.previous().end,
      };
    }

    // For non-NONMODSIM procedures, semicolon is required after return type
    this.consume(TokenType.SEMICOLON, 'Expected semicolon');

    // Check if this is a forward declaration (no body)
    // Forward declarations end with just a semicolon, no BEGIN...END
    // Need to distinguish between:
    // 1. PROCEDURE Name() ; (simple forward declaration)
    // 2. PROCEDURE Name() ; TYPE LocalType = ... ; BEGIN ... END PROCEDURE ; (has local decls + body)
    // 3. PROCEDURE Name() ; TYPE ModuleType = ... ; (forward decl, TYPE is module-level)
    if (!this.check(TokenType.BEGIN) && !this.check(TokenType.VAR) &&
        !this.check(TokenType.CONST) && !this.check(TokenType.TYPE)) {
      // Simple forward declaration - no local declarations, no body
      return {
        type: 'ProcedureDeclaration',
        name,
        parameters,
        returnType,
        localDeclarations: undefined,
        body: [], // Empty body for forward declaration
        start,
        end: this.previous().end,
      };
    }

    // If we see VAR/CONST/TYPE, we need to determine if they're local declarations or module-level
    // Lookahead to see if there's a BEGIN before we hit something that indicates module-level
    if (!this.check(TokenType.BEGIN) && (this.check(TokenType.VAR) || this.check(TokenType.CONST) || this.check(TokenType.TYPE))) {
      const hasBegin = this.lookaheadForBegin();
      if (!hasBegin) {
        // No BEGIN found - this is a forward declaration, TYPE/VAR/CONST are module-level
        return {
          type: 'ProcedureDeclaration',
          name,
          parameters,
          returnType,
          localDeclarations: undefined,
          body: [], // Empty body for forward declaration
          start,
          end: this.previous().end,
        };
      }
      // BEGIN found - fall through to parse local declarations
    }

    // Local declarations (VAR, CONST, TYPE before BEGIN)
    // Save and reset lastDeclKeyword to prevent contamination from outer scope
    const savedLastDeclKeyword = this.lastDeclKeyword;
    this.lastDeclKeyword = null;

    const localDeclarations: Declaration[] = [];
    while (!this.check(TokenType.BEGIN) && !this.check(TokenType.END) && !this.isAtEnd()) {
      // Only accept VAR, CONST, TYPE keywords or their continuations
      if (!this.check(TokenType.VAR) && !this.check(TokenType.CONST) && !this.check(TokenType.TYPE) && !this.check(TokenType.IDENTIFIER)) {
        break;
      }
      // Check for empty VAR/CONST/TYPE section (keyword followed by BEGIN/END)
      if ((this.check(TokenType.VAR) || this.check(TokenType.CONST) || this.check(TokenType.TYPE)) &&
          (this.peekNext()?.type === TokenType.BEGIN || this.peekNext()?.type === TokenType.END)) {
        this.advance(); // consume VAR/CONST/TYPE
        continue; // skip to next iteration
      }
      // If identifier, only accept if we're in a VAR/CONST/TYPE section
      if (this.check(TokenType.IDENTIFIER)) {
        const next = this.peekNext();
        // Accept COLON (name : type), EQUAL (name = value), or COMMA (name1, name2 : type)
        if (!next || (next.type !== TokenType.COLON && next.type !== TokenType.EQUAL && next.type !== TokenType.COMMA)) {
          break; // Not a continuation
        }
        // Only parse as continuation if lastDeclKeyword is set
        if (!this.lastDeclKeyword) {
          break; // Not in a declaration section
        }
      }
      localDeclarations.push(this.parseDeclaration());
    }

    // Restore lastDeclKeyword
    this.lastDeclKeyword = savedLastDeclKeyword;

    // Body
    const body = this.parseStatementBlock();

    this.consumeOrRecover(TokenType.END, 'Expected END');
    this.consumeOrRecover(TokenType.PROCEDURE, 'Expected PROCEDURE');
    this.consumeOrRecover(TokenType.SEMICOLON, 'Expected semicolon');

    return {
      type: 'ProcedureDeclaration',
      name,
      parameters,
      returnType,
      localDeclarations: localDeclarations.length > 0 ? localDeclarations : undefined,
      body,
      start,
      end: this.previous().end,
    };
  }

  private parseObjectDeclaration(): ObjectDeclaration {
    const start = this.advance().start; // OBJECT
    const name = this.consume(TokenType.IDENTIFIER, 'Expected object name').value;

    // Base types
    let baseTypes: string[] | undefined;
    if (this.match(TokenType.LPAREN)) {
      baseTypes = [];
      baseTypes.push(this.consume(TokenType.IDENTIFIER, 'Expected base type name').value);
      while (this.match(TokenType.COMMA)) {
        baseTypes.push(this.consume(TokenType.IDENTIFIER, 'Expected base type name').value);
      }
      this.consume(TokenType.RPAREN, 'Expected )');
    }

    this.consume(TokenType.SEMICOLON, 'Expected semicolon');

    // Fields and methods
    const fields: VarDeclaration[] = [];
    const methods: MethodDeclaration[] = [];
    let privateSection: { fields: VarDeclaration[]; methods: MethodDeclaration[] } | undefined;

    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      if (this.check(TokenType.PRIVATE)) {
        this.advance();
        this.consume(TokenType.SEMICOLON, 'Expected semicolon after PRIVATE');
        privateSection = { fields: [], methods: [] };

        while (!this.check(TokenType.PUBLIC) && !this.check(TokenType.END) && !this.isAtEnd()) {
          if (this.check(TokenType.VAR)) {
            privateSection.fields.push(this.parseVarDeclaration());
          } else if (this.checkMethodType()) {
            privateSection.methods.push(this.parseMethodDeclaration());
            // Skip optional extra semicolons after method (RAMS allows semicolons after comments)
            while (this.match(TokenType.SEMICOLON)) {
              // Skip
            }
          } else if (this.check(TokenType.IDENTIFIER) && this.peekNext()?.type === TokenType.COLON) {
            // RAMS allows field declarations without VAR keyword: fieldName : TYPE ;
            privateSection.fields.push(this.parseVarDeclarationWithoutKeyword());
          } else {
            break;
          }
        }

        if (this.match(TokenType.PUBLIC)) {
          this.consume(TokenType.SEMICOLON, 'Expected semicolon after PUBLIC');
        }
      } else if (this.check(TokenType.VAR)) {
        fields.push(this.parseVarDeclaration());
      } else if (this.checkMethodType()) {
        methods.push(this.parseMethodDeclaration());
        // Skip optional extra semicolons after method (RAMS allows semicolons after comments)
        while (this.match(TokenType.SEMICOLON)) {
          // Skip
        }
      } else if (this.check(TokenType.IDENTIFIER) && this.peekNext()?.type === TokenType.COLON) {
        // RAMS allows field declarations without VAR keyword: fieldName : TYPE ;
        fields.push(this.parseVarDeclarationWithoutKeyword());
      } else {
        break;
      }
    }

    this.consumeOrRecover(TokenType.END, 'Expected END');
    this.consumeOrRecover(TokenType.OBJECT, 'Expected OBJECT');
    this.consumeOrRecover(TokenType.SEMICOLON, 'Expected semicolon');

    return {
      type: 'ObjectDeclaration',
      name,
      baseTypes,
      fields,
      methods,
      privateSection,
      start,
      end: this.previous().end,
    };
  }

  // RAMS-specific: PROTO TypeName ; followed by method implementations
  // This is used in implementation modules to provide method bodies for PROTO types
  // Example: PROTO WorkListBoxItemObj ;
  //          ASK METHOD SetObject(...) ; BEGIN ... END METHOD ;
  //          END PROTO ;
  private parseProtoImplementation(): ObjectDeclaration {
    const start = this.advance().start; // PROTO
    const name = this.consume(TokenType.IDENTIFIER, 'Expected proto name').value;
    this.consume(TokenType.SEMICOLON, 'Expected semicolon after proto name');

    // Collect method implementations
    const methods: MethodDeclaration[] = [];

    // Methods continue until we hit END
    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      if (this.checkMethodType()) {
        methods.push(this.parseMethodDeclaration());
      } else {
        // Not a method, stop parsing this PROTO implementation
        break;
      }
    }

    this.consumeOrRecover(TokenType.END, 'Expected END');
    this.consumeOrRecover(TokenType.PROTO, 'Expected PROTO');
    this.consumeOrRecover(TokenType.SEMICOLON, 'Expected semicolon after PROTO');

    return {
      type: 'ObjectDeclaration',
      name,
      baseTypes: undefined,
      fields: [],
      methods,
      privateSection: undefined,
      start,
      end: this.previous().end,
    };
  }

  private parseMethodDeclaration(): MethodDeclaration {
    const start = this.peek().start;
    const methodType = this.match(TokenType.ASK) ? 'ASK'
                      : this.match(TokenType.TELL) ? 'TELL'
                      : this.match(TokenType.LMONITOR) ? 'LMONITOR'
                      : this.match(TokenType.RMONITOR) ? 'RMONITOR'
                      : this.match(TokenType.WAITFOR) ? 'WAITFOR'
                      : this.error('Expected ASK, TELL, LMONITOR, RMONITOR, or WAITFOR');

    const isOverride = this.match(TokenType.OVERRIDE);

    this.consume(TokenType.METHOD, 'Expected METHOD');
    const name = this.consume(TokenType.IDENTIFIER, 'Expected method name').value;

    // Parameters
    const parameters: Parameter[] = [];
    if (this.match(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        do {
          parameters.push(...this.parseParameter()); // parseParameter now returns array
        } while (this.match(TokenType.SEMICOLON));
      }
      this.consume(TokenType.RPAREN, 'Expected )');
    }

    // Return type
    let returnType: TypeSpec | undefined;
    if (this.match(TokenType.COLON)) {
      returnType = this.parseTypeSpec();
    }

    // Semicolon after method signature
    // In OBJECT definitions, semicolons between method signatures are optional
    // But if there's local declarations or a body, semicolon is required
    // For now, make it optional and let the calling code handle it
    this.match(TokenType.SEMICOLON);

    // Local declarations (VAR, CONST, TYPE before BEGIN)
    // Save and reset lastDeclKeyword to prevent contamination from outer scope
    const savedLastDeclKeyword = this.lastDeclKeyword;
    this.lastDeclKeyword = null;

    const localDeclarations: Declaration[] = [];
    while (!this.check(TokenType.BEGIN) && !this.check(TokenType.END) && !this.isAtEnd()) {
      // Only accept VAR, CONST, TYPE keywords or their continuations
      if (!this.check(TokenType.VAR) && !this.check(TokenType.CONST) && !this.check(TokenType.TYPE) && !this.check(TokenType.IDENTIFIER)) {
        break;
      }
      // Check for empty VAR/CONST/TYPE section (keyword followed by BEGIN/END)
      if ((this.check(TokenType.VAR) || this.check(TokenType.CONST) || this.check(TokenType.TYPE)) &&
          (this.peekNext()?.type === TokenType.BEGIN || this.peekNext()?.type === TokenType.END)) {
        this.advance(); // consume VAR/CONST/TYPE
        continue; // skip to next iteration
      }
      // If identifier, only accept if we're in a VAR/CONST/TYPE section
      if (this.check(TokenType.IDENTIFIER)) {
        const next = this.peekNext();
        // Accept COLON (name : type), EQUAL (name = value), or COMMA (name1, name2 : type)
        if (!next || (next.type !== TokenType.COLON && next.type !== TokenType.EQUAL && next.type !== TokenType.COMMA)) {
          break; // Not a continuation
        }
        // Only parse as continuation if lastDeclKeyword is set
        if (!this.lastDeclKeyword) {
          break; // Not in a declaration section
        }
      }
      localDeclarations.push(this.parseDeclaration());
    }

    // Restore lastDeclKeyword
    this.lastDeclKeyword = savedLastDeclKeyword;

    // Body (optional - DEFINITION modules only have signatures)
    let body: Statement[] = [];
    let endPos = this.previous().end;

    if (this.check(TokenType.BEGIN)) {
      body = this.parseStatementBlock();
      this.consume(TokenType.END, 'Expected END');
      this.consume(TokenType.METHOD, 'Expected METHOD');
      this.match(TokenType.SEMICOLON); // Optional semicolon after END METHOD
      endPos = this.previous().end;
    }

    return {
      type: 'MethodDeclaration',
      methodType,
      name,
      parameters,
      returnType,
      isOverride,
      localDeclarations: localDeclarations.length > 0 ? localDeclarations : undefined,
      body,
      start,
      end: endPos,
    };
  }

  private parseParameter(): Parameter[] {
    const start = this.peek().start;
    const mode = this.match(TokenType.IN)
      ? 'IN'
      : this.match(TokenType.OUT)
        ? 'OUT'
        : this.match(TokenType.INOUT)
          ? 'INOUT'
          : this.error('Expected IN, OUT, or INOUT');

    // Parse one or more parameter names (comma-separated)
    // Example: IN x, y, z : REAL creates 3 parameters
    const names: string[] = [];
    names.push(this.consume(TokenType.IDENTIFIER, 'Expected parameter name').value);
    while (this.match(TokenType.COMMA)) {
      names.push(this.consume(TokenType.IDENTIFIER, 'Expected parameter name').value);
    }

    this.consume(TokenType.COLON, 'Expected colon');
    const valueType = this.parseTypeSpec();

    // Create one Parameter object per name
    return names.map(name => ({
      type: 'Parameter' as const,
      mode,
      name,
      valueType,
      start,
      end: this.previous().end,
    }));
  }

  // ====================
  // Type specification parsing
  // ====================

  private parseTypeSpec(): TypeSpec {
    // Check for FIXED keyword (for FIXED ARRAY or FIXED RECORD)
    let isFixed = false;
    if (this.match(TokenType.FIXED)) {
      isFixed = true;
    }

    // Check for monitored types (LMONITORED, RMONITORED, LRMONITORED)
    // Syntax: LMONITORED BaseType BY MonitorType [, MonitorType2, ...]
    if (this.match(TokenType.LMONITORED, TokenType.RMONITORED, TokenType.LRMONITORED)) {
      const monitorKeyword = this.previous().type;
      const baseType = this.parseTypeSpec(); // Recursively parse base type
      this.consume(TokenType.BY, 'Expected BY after monitored base type');

      // Parse monitor types (can be multiple, comma-separated)
      const monitorType = this.parseTypeName();
      while (this.match(TokenType.COMMA)) {
        this.parseTypeName(); // Additional monitor types
      }

      return {
        type: 'MonitoredType',
        monitorKeyword,
        baseType,
        monitorType,
        start: baseType.start,
        end: this.previous().end,
      };
    }

    // Check for MONITOR object types (MONITOR DataType OBJECT)
    // Syntax: MONITOR INTEGER OBJECT(...) ... END OBJECT
    if (this.check(TokenType.IDENTIFIER) && this.peek().value === 'MONITOR') {
      // Look ahead to see if this is MONITOR Type OBJECT pattern
      if (this.peekAhead(2)?.type === TokenType.OBJECT) {
        this.advance(); // consume MONITOR
        this.advance(); // consume the data type (INTEGER, REAL, etc.)
        // Now fall through to parse OBJECT
      }
    }

    // Check for complex types first
    if (this.check(TokenType.ARRAY)) {
      const arrayType = this.parseArrayType() as ArrayType;
      if (isFixed) {
        arrayType.isFixed = true;
      }
      return arrayType;
    }
    if (this.check(TokenType.RECORD)) {
      const recordType = this.parseRecordType() as RecordType;
      if (isFixed) {
        recordType.isFixed = true;
      }
      return recordType;
    }
    if (this.check(TokenType.OBJECT)) {
      return this.parseObjectType();
    }
    if (this.check(TokenType.PROTO)) {
      return this.parseProtoType();
    }
    if (this.check(TokenType.LPAREN)) {
      return this.parseEnumType();
    }
    if (this.check(TokenType.LBRACKET)) {
      return this.parseSubrangeType();
    }
    if (this.check(TokenType.POINTER)) {
      return this.parsePointerType();
    }
    if (this.check(TokenType.SET)) {
      return this.parseSetType();
    }

    // If FIXED was specified but not followed by ARRAY or RECORD, error
    if (isFixed) {
      return this.error('Expected ARRAY or RECORD after FIXED keyword');
    }

    // Simple type - can be identifier or built-in type keyword
    const start = this.peek().start;
    const name = this.parseTypeName();
    return {
      type: 'SimpleType',
      name,
      start,
      end: this.previous().end,
    };
  }

  /**
   * Parse a type name - accepts IDENTIFIER or built-in type keywords
   */
  private parseTypeName(): string {
    // Accept built-in type keywords
    if (
      this.match(
        TokenType.ANYOBJ,
        TokenType.INTEGER,
        TokenType.REAL,
        TokenType.BOOLEAN,
        TokenType.STRING,
        TokenType.NUMBER
      )
    ) {
      return this.previous().value;
    }

    // Accept user-defined type names
    if (this.match(TokenType.IDENTIFIER)) {
      return this.previous().value;
    }

    return this.error('Expected type name');
  }

  private parseArrayType(): TypeSpec {
    const start = this.advance().start; // ARRAY
    const indexRanges: Expression[] = [];

    // MODSIM allows two syntaxes:
    // 1. ARRAY [range, ...] OF type  (with brackets for subranges)
    // 2. ARRAY indexType, ... OF type (without brackets, using type names)
    if (this.check(TokenType.LBRACKET)) {
      // Syntax 1: Bracket-based subranges
      this.consume(TokenType.LBRACKET, 'Expected [');
      indexRanges.push(this.parseRangeExpression());
      while (this.match(TokenType.COMMA)) {
        indexRanges.push(this.parseRangeExpression());
      }
      this.consume(TokenType.RBRACKET, 'Expected ]');
    } else {
      // Syntax 2: Type-based indexing (RAMS style)
      // Parse index types: INTEGER, STRING, user-defined types, etc.
      // Accept both keyword types and user-defined type names
      if (!this.match(TokenType.INTEGER, TokenType.REAL, TokenType.BOOLEAN, TokenType.STRING, TokenType.IDENTIFIER)) {
        throw this.error('Expected index type');
      }
      const indexType = this.previous().value;
      indexRanges.push({
        type: 'IdentifierExpression',
        name: indexType,
        start: this.previous().start,
        end: this.previous().end,
      });
      while (this.match(TokenType.COMMA)) {
        if (!this.match(TokenType.INTEGER, TokenType.REAL, TokenType.BOOLEAN, TokenType.STRING, TokenType.IDENTIFIER)) {
          throw this.error('Expected index type');
        }
        const nextIndexType = this.previous().value;
        indexRanges.push({
          type: 'IdentifierExpression',
          name: nextIndexType,
          start: this.previous().start,
          end: this.previous().end,
        });
      }
    }

    this.consume(TokenType.OF, 'Expected OF');
    const elementType = this.parseTypeSpec();

    return {
      type: 'ArrayType',
      indexRanges,
      elementType,
      start,
      end: this.previous().end,
    };
  }

  private parseRecordType(): TypeSpec {
    const start = this.advance().start; // RECORD

    // Allow optional semicolon after RECORD keyword (RAMS codebase style)
    this.match(TokenType.SEMICOLON);

    const fields: VarDeclaration[] = [];

    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      if (this.check(TokenType.VAR)) {
        // Field with VAR keyword
        fields.push(this.parseVarDeclaration());
      } else if (this.check(TokenType.IDENTIFIER)) {
        // Field without VAR keyword (RAMS TYPE declaration style)
        const fieldStart = this.peek().start;
        const names: string[] = [];

        // Parse comma-separated field names
        do {
          names.push(this.consume(TokenType.IDENTIFIER, 'Expected field name').value);
        } while (this.match(TokenType.COMMA));

        this.consume(TokenType.COLON, 'Expected colon');
        const valueType = this.parseTypeSpec();
        this.consume(TokenType.SEMICOLON, 'Expected semicolon');

        fields.push({
          type: 'VarDeclaration',
          names,
          valueType,
          start: fieldStart,
          end: this.previous().end,
        });
      } else {
        break;
      }
    }

    this.consume(TokenType.END, 'Expected END');
    this.consume(TokenType.RECORD, 'Expected RECORD');

    return {
      type: 'RecordType',
      fields,
      start,
      end: this.previous().end,
    };
  }

  private parseObjectType(): TypeSpec {
    const start = this.advance().start; // OBJECT

    // Base types (with optional parameterized PROTO type substitution)
    let baseTypes: string[] | undefined;
    if (this.match(TokenType.LPAREN)) {
      baseTypes = [];

      // Parse base type name
      let baseTypeName = this.consume(TokenType.IDENTIFIER, 'Expected base type').value;

      // Check for parameterized type: BaseType[Param:Type, Param2:Type2, ...]
      if (this.match(TokenType.LBRACKET)) {
        // Parse one or more parameter substitutions: ParamName : ReplacementType
        do {
          this.consumeIdentifierOrKeyword('Expected parameter name'); // parameter name (can be keyword like ANYOBJ)
          this.consume(TokenType.COLON, 'Expected colon in type parameter');
          // Replacement type may start with # for further derivation (replaceable type in PROTO objects)
          // Syntax: ANYOBJ:#TypeName means TypeName can be replaced in future derivations
          this.match(TokenType.HASH); // Optional # prefix
          this.consumeIdentifierOrKeyword('Expected replacement type');
        } while (this.match(TokenType.COMMA)); // Handle multiple substitutions
        this.consume(TokenType.RBRACKET, 'Expected ]');
        // For now, store the base type name without parameters (AST doesn't track them yet)
      }

      baseTypes.push(baseTypeName);

      // Handle multiple base types
      while (this.match(TokenType.COMMA)) {
        baseTypeName = this.consume(TokenType.IDENTIFIER, 'Expected base type').value;

        // Check for parameterized type on additional bases
        if (this.match(TokenType.LBRACKET)) {
          this.consumeIdentifierOrKeyword('Expected parameter name'); // parameter name (can be keyword like ANYOBJ)
          this.consume(TokenType.COLON, 'Expected colon in type parameter');
          this.consumeIdentifierOrKeyword('Expected replacement type');
          this.consume(TokenType.RBRACKET, 'Expected ]');
        }

        baseTypes.push(baseTypeName);
      }
      this.consume(TokenType.RPAREN, 'Expected )');
    }

    // Optional semicolon after OBJECT header (TYPE declarations)
    this.match(TokenType.SEMICOLON);

    // Check for forward object declaration: OBJECT; FORWARD;
    if (this.check(TokenType.IDENTIFIER) && this.peek().value === 'FORWARD') {
      this.advance(); // consume FORWARD
      // Return a simple type placeholder for forward-declared objects
      return {
        type: 'SimpleType',
        name: '__forward_object__',
        start,
        end: this.previous().end,
      };
    }

    const fields: VarDeclaration[] = [];
    const methods: MethodDeclaration[] = [];

    // Parse fields, methods, OVERRIDE sections, and CLASS sections
    // RAMS allows multiple OVERRIDE and CLASS sections in any order
    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      if (this.checkMethodType()) {
        // Regular method
        methods.push(this.parseMethodDeclaration());
        // Skip optional extra semicolons (RAMS allows semicolons after comments)
        while (this.match(TokenType.SEMICOLON)) {
          // Skip
        }
      } else if (this.check(TokenType.OVERRIDE)) {
        // OVERRIDE section (can appear multiple times)
        this.advance(); // consume OVERRIDE
        while (!this.check(TokenType.END) && !this.check(TokenType.CLASS) && !this.check(TokenType.OVERRIDE) && !this.check(TokenType.PRIVATE) && !this.isAtEnd()) {
          if (this.checkMethodType()) {
            const method = this.parseMethodDeclaration();
            method.isOverride = true; // Mark as override
            methods.push(method);
            // Skip optional extra semicolons after method (RAMS allows semicolons after comments)
            while (this.match(TokenType.SEMICOLON)) {
              // Skip
            }
          } else if (this.check(TokenType.SEMICOLON)) {
            // Skip extra semicolons (RAMS allows semicolons after comment lines)
            this.advance();
          } else {
            break;
          }
        }
      } else if (this.check(TokenType.CLASS)) {
        // CLASS section (can appear multiple times)
        this.advance(); // consume CLASS
        while (!this.check(TokenType.END) && !this.check(TokenType.OVERRIDE) && !this.check(TokenType.CLASS) && !this.check(TokenType.PRIVATE) && !this.isAtEnd()) {
          if (this.checkMethodType()) {
            // Class method
            methods.push(this.parseMethodDeclaration());
            // Skip optional extra semicolons after method (RAMS allows semicolons after comments)
            while (this.match(TokenType.SEMICOLON)) {
              // Skip
            }
          } else if (this.check(TokenType.IDENTIFIER)) {
            // Class field declaration: name : type ;
            const fieldStart = this.peek().start;
            const names: string[] = [this.advance().value];

            while (this.match(TokenType.COMMA)) {
              names.push(this.consume(TokenType.IDENTIFIER, 'Expected field name').value);
            }

            this.consume(TokenType.COLON, 'Expected :');
            const valueType = this.parseTypeSpec();
            this.consume(TokenType.SEMICOLON, 'Expected semicolon');

            fields.push({
              type: 'VarDeclaration',
              names,
              valueType,
              start: fieldStart,
              end: this.previous().end,
            });
          } else if (this.check(TokenType.SEMICOLON)) {
            // Skip extra semicolons (RAMS allows semicolons after comment lines)
            this.advance();
          } else {
            break;
          }
        }
      } else if (this.check(TokenType.PRIVATE)) {
        // PRIVATE section (can appear multiple times)
        this.advance(); // consume PRIVATE
        while (!this.check(TokenType.END) && !this.check(TokenType.OVERRIDE) && !this.check(TokenType.CLASS) && !this.check(TokenType.PRIVATE) && !this.isAtEnd()) {
          if (this.checkMethodType()) {
            // Private method
            methods.push(this.parseMethodDeclaration());
            // Skip optional extra semicolons after method (RAMS allows semicolons after comments)
            while (this.match(TokenType.SEMICOLON)) {
              // Skip
            }
          } else if (this.check(TokenType.IDENTIFIER)) {
            // Private field declaration: name : type ;
            const fieldStart = this.peek().start;
            const names: string[] = [this.advance().value];

            while (this.match(TokenType.COMMA)) {
              names.push(this.consume(TokenType.IDENTIFIER, 'Expected field name').value);
            }

            this.consume(TokenType.COLON, 'Expected :');
            const valueType = this.parseTypeSpec();
            this.match(TokenType.SEMICOLON); // Optional semicolon after field in CLASS

            fields.push({
              type: 'VarDeclaration',
              names,
              valueType,
              start: fieldStart,
              end: this.previous().end,
            });
          } else if (this.check(TokenType.SEMICOLON)) {
            // Skip extra semicolons (RAMS allows semicolons after comment lines)
            this.advance();
          } else {
            break;
          }
        }
      } else if (this.check(TokenType.IDENTIFIER)) {
        // Field declaration (not in CLASS section): name : type ;
        const fieldStart = this.peek().start;
        const names: string[] = [this.advance().value];

        while (this.match(TokenType.COMMA)) {
          names.push(this.consume(TokenType.IDENTIFIER, 'Expected field name').value);
        }

        this.consume(TokenType.COLON, 'Expected :');
        const valueType = this.parseTypeSpec();
        this.match(TokenType.SEMICOLON); // Optional semicolon after field in OBJECT

        fields.push({
          type: 'VarDeclaration',
          names,
          valueType,
          start: fieldStart,
          end: this.previous().end,
        });
      } else if (this.check(TokenType.SEMICOLON)) {
        // Skip extra semicolons (RAMS allows semicolons after comment lines)
        // Example: ASK METHOD Name(params) ;
        //          { comment } ;  <- extra semicolon here
        this.advance(); // consume semicolon
      } else {
        break;
      }
    }

    this.consumeOrRecover(TokenType.END, 'Expected END');
    this.consumeOrRecover(TokenType.OBJECT, 'Expected OBJECT');

    return {
      type: 'ObjectType',
      baseTypes,
      fields,
      methods,
      start,
      end: this.previous().end,
    };
  }

  // PROTO is like OBJECT but uses END PROTO instead of END OBJECT
  private parseProtoType(): TypeSpec {
    const start = this.advance().start; // PROTO

    // Base types (with optional parameterized PROTO type substitution)
    let baseTypes: string[] | undefined;
    if (this.match(TokenType.LPAREN)) {
      baseTypes = [];

      // Parse base type name
      let baseTypeName = this.consume(TokenType.IDENTIFIER, 'Expected base type').value;

      // Check for parameterized type: BaseType[Param:Type, Param2:Type2, ...]
      if (this.match(TokenType.LBRACKET)) {
        // Parse one or more parameter substitutions: ParamName : ReplacementType
        do {
          this.consumeIdentifierOrKeyword('Expected parameter name'); // parameter name (can be keyword like ANYOBJ)
          this.consume(TokenType.COLON, 'Expected colon in type parameter');
          // Replacement type may start with # for further derivation (replaceable type in PROTO objects)
          // Syntax: ANYOBJ:#TypeName means TypeName can be replaced in future derivations
          this.match(TokenType.HASH); // Optional # prefix
          this.consumeIdentifierOrKeyword('Expected replacement type');
        } while (this.match(TokenType.COMMA)); // Handle multiple substitutions
        this.consume(TokenType.RBRACKET, 'Expected ]');
        // For now, store the base type name without parameters (AST doesn't track them yet)
      }

      baseTypes.push(baseTypeName);

      // Handle multiple base types
      while (this.match(TokenType.COMMA)) {
        baseTypeName = this.consume(TokenType.IDENTIFIER, 'Expected base type').value;

        // Check for parameterized type on additional bases
        if (this.match(TokenType.LBRACKET)) {
          this.consumeIdentifierOrKeyword('Expected parameter name'); // parameter name (can be keyword like ANYOBJ)
          this.consume(TokenType.COLON, 'Expected colon in type parameter');
          this.consumeIdentifierOrKeyword('Expected replacement type');
          this.consume(TokenType.RBRACKET, 'Expected ]');
        }

        baseTypes.push(baseTypeName);
      }
      this.consume(TokenType.RPAREN, 'Expected )');
    }

    // Semicolon after PROTO header is optional
    this.match(TokenType.SEMICOLON);

    const fields: VarDeclaration[] = [];
    const methods: MethodDeclaration[] = [];

    // Parse fields and methods - same as OBJECT
    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      if (this.checkMethodType()) {
        methods.push(this.parseMethodDeclaration());
      } else if (this.check(TokenType.OVERRIDE)) {
        this.advance(); // OVERRIDE
        while (!this.check(TokenType.END) && !this.check(TokenType.CLASS) && !this.check(TokenType.OVERRIDE) && !this.check(TokenType.PRIVATE) && !this.isAtEnd()) {
          if (this.checkMethodType()) {
            const method = this.parseMethodDeclaration();
            method.isOverride = true;
            methods.push(method);
          } else if (this.check(TokenType.SEMICOLON)) {
            this.advance();
          } else {
            break;
          }
        }
      } else if (this.check(TokenType.CLASS)) {
        this.advance(); // CLASS
        while (!this.check(TokenType.END) && !this.check(TokenType.OVERRIDE) && !this.check(TokenType.CLASS) && !this.check(TokenType.PRIVATE) && !this.isAtEnd()) {
          if (this.checkMethodType()) {
            methods.push(this.parseMethodDeclaration());
          } else if (this.check(TokenType.IDENTIFIER)) {
            const fieldStart = this.peek().start;
            const names: string[] = [this.advance().value];

            while (this.match(TokenType.COMMA)) {
              names.push(this.consume(TokenType.IDENTIFIER, 'Expected field name').value);
            }

            this.consume(TokenType.COLON, 'Expected :');
            const valueType = this.parseTypeSpec();
            this.consume(TokenType.SEMICOLON, 'Expected semicolon');

            fields.push({
              type: 'VarDeclaration',
              names,
              valueType,
              start: fieldStart,
              end: this.previous().end,
            });
          } else if (this.check(TokenType.SEMICOLON)) {
            this.advance();
          } else {
            break;
          }
        }
      } else if (this.check(TokenType.PRIVATE)) {
        this.advance(); // PRIVATE
        while (!this.check(TokenType.END) && !this.check(TokenType.OVERRIDE) && !this.check(TokenType.CLASS) && !this.check(TokenType.PRIVATE) && !this.isAtEnd()) {
          if (this.checkMethodType()) {
            methods.push(this.parseMethodDeclaration());
          } else if (this.check(TokenType.IDENTIFIER)) {
            const fieldStart = this.peek().start;
            const names: string[] = [this.advance().value];

            while (this.match(TokenType.COMMA)) {
              names.push(this.consume(TokenType.IDENTIFIER, 'Expected field name').value);
            }

            this.consume(TokenType.COLON, 'Expected :');
            const valueType = this.parseTypeSpec();
            this.consume(TokenType.SEMICOLON, 'Expected semicolon');

            fields.push({
              type: 'VarDeclaration',
              names,
              valueType,
              start: fieldStart,
              end: this.previous().end,
            });
          } else if (this.check(TokenType.SEMICOLON)) {
            this.advance();
          } else {
            break;
          }
        }
      } else if (this.check(TokenType.IDENTIFIER)) {
        const fieldStart = this.peek().start;
        const names: string[] = [this.advance().value];

        while (this.match(TokenType.COMMA)) {
          names.push(this.consume(TokenType.IDENTIFIER, 'Expected field name').value);
        }

        this.consume(TokenType.COLON, 'Expected :');
        const valueType = this.parseTypeSpec();
        this.consume(TokenType.SEMICOLON, 'Expected semicolon');

        fields.push({
          type: 'VarDeclaration',
          names,
          valueType,
          start: fieldStart,
          end: this.previous().end,
        });
      } else if (this.check(TokenType.SEMICOLON)) {
        this.advance(); // Skip extra semicolons
      } else {
        break;
      }
    }

    this.consumeOrRecover(TokenType.END, 'Expected END');
    // PROTO can end with either END PROTO or END OBJECT
    if (!this.match(TokenType.PROTO)) {
      this.consumeOrRecover(TokenType.OBJECT, 'Expected PROTO or OBJECT');
    }

    return {
      type: 'ObjectType',  // Use ObjectType for now (PROTO is semantically similar)
      baseTypes,
      fields,
      methods,
      start,
      end: this.previous().end,
    };
  }

  private parseSubrangeType(): TypeSpec {
    const start = this.advance().start; // [
    const low = this.parseExpression();
    this.consume(TokenType.RANGE, 'Expected ..');
    const high = this.parseExpression();
    this.consume(TokenType.RBRACKET, 'Expected ]');

    return {
      type: 'SubrangeType',
      low,
      high,
      start,
      end: this.previous().end,
    };
  }

  private parsePointerType(): TypeSpec {
    const start = this.advance().start; // POINTER
    this.consume(TokenType.TO, 'Expected TO after POINTER');
    const baseType = this.parseTypeSpec();

    return {
      type: 'PointerType',
      baseType,
      start,
      end: this.previous().end,
    };
  }

  private parseSetType(): TypeSpec {
    const start = this.advance().start; // SET
    this.consume(TokenType.OF, 'Expected OF after SET');
    const elementType = this.parseTypeSpec();

    return {
      type: 'SetType',
      elementType,
      start,
      end: this.previous().end,
    };
  }

  private parseEnumType(): TypeSpec {
    const start = this.advance().start; // (
    const values: string[] = [];

    values.push(this.consume(TokenType.IDENTIFIER, 'Expected enum value').value);
    while (this.match(TokenType.COMMA)) {
      values.push(this.consume(TokenType.IDENTIFIER, 'Expected enum value').value);
    }

    this.consume(TokenType.RPAREN, 'Expected )');

    return {
      type: 'EnumType',
      values,
      start,
      end: this.previous().end,
    };
  }

  // ====================
  // Statement parsing (continued in next section due to size)
  // ====================

  private parseStatementBlock(): Statement[] {
    const statements: Statement[] = [];

    if (this.match(TokenType.BEGIN)) {
      while (!this.check(TokenType.END) && !this.isAtEnd()) {
        // Skip standalone semicolons (RAMS allows semicolons after comments)
        if (this.match(TokenType.SEMICOLON)) {
          continue;
        }
        statements.push(this.parseStatement());
        // Semicolons are optional between statements
        this.match(TokenType.SEMICOLON);
      }
    }

    return statements;
  }

  private parseStatement(): Statement {
    // Skip extra semicolons (RAMS source code sometimes has double semicolons)
    while (this.check(TokenType.SEMICOLON)) {
      this.advance();
    }

    // Control flow
    if (this.check(TokenType.IF)) return this.parseIfStatement();
    if (this.check(TokenType.WHILE)) return this.parseWhileStatement();
    if (this.check(TokenType.FOR)) return this.parseForStatement();
    if (this.check(TokenType.FOREACH)) return this.parseForeachStatement();
    if (this.check(TokenType.CASE)) return this.parseCaseStatement();
    if (this.check(TokenType.LOOP)) return this.parseLoopStatement();
    if (this.check(TokenType.REPEAT)) return this.parseRepeatUntilStatement();
    if (this.check(TokenType.WITH)) return this.parseWithStatement();

    // Special statements
    if (this.check(TokenType.WAIT)) return this.parseWaitStatement();
    if (this.check(TokenType.RETURN)) return this.parseReturnStatement();
    if (this.check(TokenType.TERMINATE)) return this.parseTerminateStatement();
    if (this.check(TokenType.EXIT)) return this.parseExitStatement();
    if (this.check(TokenType.INC)) return this.parseIncStatement();
    if (this.check(TokenType.DEC)) return this.parseDecStatement();

    // NEW statement (RAMS allows NEW as a statement)
    if (this.check(TokenType.NEW)) return this.parseNewStatement();

    // DISPOSE statement (memory deallocation)
    if (this.check(TokenType.DISPOSE)) return this.parseDisposeStatement();

    // ASK/TELL or assignment
    if (this.check(TokenType.ASK)) return this.parseAskStatement();
    if (this.check(TokenType.TELL)) return this.parseTellStatement();

    // Block
    if (this.check(TokenType.BEGIN)) return this.parseBlockStatement();

    // Default to assignment or expression statement
    return this.parseAssignmentOrExpressionStatement();
  }

  private parseIfStatement(): Statement {
    const start = this.advance().start; // IF
    const condition = this.parseExpression();
    // THEN is optional in RAMS (can be omitted if body is on next line)
    this.match(TokenType.THEN);
    // If THEN is omitted, there may be a semicolon after the condition
    this.match(TokenType.SEMICOLON);

    const thenBlock: Statement[] = [];
    while (!this.check(TokenType.ELSIF) && !this.check(TokenType.ELSE) && !this.check(TokenType.END) && !this.isAtEnd()) {
      thenBlock.push(this.parseStatement());
      this.match(TokenType.SEMICOLON);
    }

    const elsifClauses: { condition: Expression; block: Statement[] }[] = [];
    while (this.match(TokenType.ELSIF)) {
      const elsifCondition = this.parseExpression();
      // THEN is optional in ELSIF too
      this.match(TokenType.THEN);
      // If THEN is omitted, there may be a semicolon after the condition
      this.match(TokenType.SEMICOLON);
      const elsifBlock: Statement[] = [];
      while (!this.check(TokenType.ELSIF) && !this.check(TokenType.ELSE) && !this.check(TokenType.END) && !this.isAtEnd()) {
        elsifBlock.push(this.parseStatement());
        this.match(TokenType.SEMICOLON);
      }
      elsifClauses.push({ condition: elsifCondition, block: elsifBlock });
    }

    let elseBlock: Statement[] | undefined;
    if (this.match(TokenType.ELSE)) {
      elseBlock = [];
      while (!this.check(TokenType.END) && !this.isAtEnd()) {
        elseBlock.push(this.parseStatement());
        this.match(TokenType.SEMICOLON);
      }
    }

    this.consume(TokenType.END, 'Expected END');
    this.consume(TokenType.IF, 'Expected IF');

    return {
      type: 'IfStatement',
      condition,
      thenBlock,
      elsifClauses,
      elseBlock,
      start,
      end: this.previous().end,
    };
  }

  private parseWhileStatement(): Statement {
    const start = this.advance().start; // WHILE
    const condition = this.parseExpression();
    this.match(TokenType.DO); // DO is optional in RAMS
    // If DO is omitted, there may be a semicolon after the condition
    this.match(TokenType.SEMICOLON);

    const body: Statement[] = [];
    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      // Skip standalone semicolons (RAMS allows semicolons after comments)
      if (this.match(TokenType.SEMICOLON)) {
        continue;
      }
      body.push(this.parseStatement());
      this.match(TokenType.SEMICOLON);
    }

    this.consume(TokenType.END, 'Expected END');
    this.consume(TokenType.WHILE, 'Expected WHILE');

    return {
      type: 'WhileStatement',
      condition,
      body,
      start,
      end: this.previous().end,
    };
  }

  private parseForStatement(): Statement {
    const startPos = this.advance().start; // FOR
    const variable = this.consume(TokenType.IDENTIFIER, 'Expected variable name').value;
    this.consume(TokenType.ASSIGN, 'Expected :=');
    const from = this.parseExpression();

    const direction = this.match(TokenType.TO) ? 'TO' : this.match(TokenType.DOWNTO) ? 'DOWNTO' : this.error('Expected TO or DOWNTO');

    const to = this.parseExpression();

    let step: Expression | undefined;
    if (this.match(TokenType.BY)) {
      step = this.parseExpression();
    }

    this.match(TokenType.DO); // DO is optional in RAMS
    // If DO is omitted, there may be a semicolon after the range expression
    this.match(TokenType.SEMICOLON);

    const body: Statement[] = [];
    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      body.push(this.parseStatement());
      this.match(TokenType.SEMICOLON);
    }

    this.consume(TokenType.END, 'Expected END');
    this.consume(TokenType.FOR, 'Expected FOR');

    return {
      type: 'ForStatement',
      variable,
      from,
      to,
      step,
      direction,
      body,
      start: startPos,
      end: this.previous().end,
    };
  }

  private parseForeachStatement(): Statement {
    const start = this.advance().start; // FOREACH
    const variable = this.consume(TokenType.IDENTIFIER, 'Expected variable name').value;
    this.consume(TokenType.IN, 'Expected IN');
    const collection = this.parseExpression();
    this.match(TokenType.DO); // DO is optional in RAMS
    // If DO is omitted, there may be a semicolon after the collection expression
    this.match(TokenType.SEMICOLON);

    const body: Statement[] = [];
    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      body.push(this.parseStatement());
      this.match(TokenType.SEMICOLON);
    }

    this.consume(TokenType.END, 'Expected END');
    this.consume(TokenType.FOREACH, 'Expected FOREACH');

    return {
      type: 'ForeachStatement',
      variable,
      collection,
      body,
      start,
      end: this.previous().end,
    };
  }

  private parseCaseStatement(): Statement {
    const start = this.advance().start; // CASE
    const expression = this.parseExpression();

    // OF is optional in RAMS (can use WHEN instead)
    this.match(TokenType.OF);

    const cases: { values: Expression[]; block: Statement[] }[] = [];

    while (!this.check(TokenType.OTHERWISE) && !this.check(TokenType.END) && !this.isAtEnd()) {
      // RAMS allows WHEN before each case value
      this.match(TokenType.WHEN);

      const values: Expression[] = [];

      // Parse first value (may be a range: low..high)
      let value = this.parseExpression();
      if (this.match(TokenType.RANGE)) {
        // This is a range: low..high
        const high = this.parseExpression();
        value = {
          type: 'BinaryExpression',
          operator: TokenType.RANGE,
          left: value,
          right: high,
          start: value.start,
          end: high.end,
        };
      }
      values.push(value);

      while (this.match(TokenType.COMMA)) {
        // Parse next value (may also be a range)
        let nextValue = this.parseExpression();
        if (this.match(TokenType.RANGE)) {
          const high = this.parseExpression();
          nextValue = {
            type: 'BinaryExpression',
            operator: TokenType.RANGE,
            left: nextValue,
            right: high,
            start: nextValue.start,
            end: high.end,
          };
        }
        values.push(nextValue);
      }

      this.consume(TokenType.COLON, 'Expected colon');

      // Skip optional semicolon after colon (for empty WHEN blocks)
      this.match(TokenType.SEMICOLON);

      const block: Statement[] = [];
      while (!this.check(TokenType.PIPE) && !this.check(TokenType.WHEN) && !this.check(TokenType.OTHERWISE) && !this.check(TokenType.END) && !this.isAtEnd()) {
        block.push(this.parseStatement());
        this.match(TokenType.SEMICOLON);
      }

      cases.push({ values, block });

      if (this.match(TokenType.PIPE)) {
        // Next case (standard syntax)
        continue;
      }
      // In RAMS WHEN syntax, next case starts with WHEN
      if (this.check(TokenType.WHEN)) {
        continue;
      }
      break;
    }

    let otherwiseBlock: Statement[] | undefined;
    if (this.match(TokenType.OTHERWISE)) {
      // Skip optional semicolon after OTHERWISE
      this.match(TokenType.SEMICOLON);
      otherwiseBlock = [];
      while (!this.check(TokenType.END) && !this.isAtEnd()) {
        otherwiseBlock.push(this.parseStatement());
        this.match(TokenType.SEMICOLON);
      }
    }

    this.consume(TokenType.END, 'Expected END');
    this.consume(TokenType.CASE, 'Expected CASE');

    return {
      type: 'CaseStatement',
      expression,
      cases,
      otherwiseBlock,
      start,
      end: this.previous().end,
    };
  }

  private parseLoopStatement(): Statement {
    const start = this.advance().start; // LOOP

    const body: Statement[] = [];
    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      body.push(this.parseStatement());
      this.match(TokenType.SEMICOLON);
    }

    this.consume(TokenType.END, 'Expected END');
    this.consume(TokenType.LOOP, 'Expected LOOP');

    return {
      type: 'LoopStatement',
      body,
      start,
      end: this.previous().end,
    };
  }

  private parseRepeatUntilStatement(): Statement {
    const start = this.advance().start; // REPEAT

    const body: Statement[] = [];
    while (!this.check(TokenType.UNTIL) && !this.isAtEnd()) {
      body.push(this.parseStatement());
      this.match(TokenType.SEMICOLON);
    }

    this.consume(TokenType.UNTIL, 'Expected UNTIL');
    const condition = this.parseExpression();
    this.consume(TokenType.SEMICOLON, 'Expected semicolon');

    return {
      type: 'RepeatUntilStatement',
      body,
      condition,
      start,
      end: this.previous().end,
    };
  }

  private parseWaitStatement(): Statement {
    const start = this.advance().start; // WAIT

    // Check for WAIT FOR object TO method syntax vs WAIT FOR expression
    // We need to parse the expression first and check if TO follows
    // Syntax: WAIT FOR object TO method(args) vs WAIT FOR expression
    if (this.match(TokenType.FOR)) {
      // Parse the expression/object
      const exprOrObject = this.parseExpression();

      // Check if this is WAIT FOR object TO method
      if (this.check(TokenType.TO)) {
        this.advance(); // consume TO
        const method = this.consume(TokenType.IDENTIFIER, 'Expected method name').value;

        // Parse optional arguments
        const args: Expression[] = [];
        if (this.match(TokenType.LPAREN)) {
          if (!this.check(TokenType.RPAREN)) {
            args.push(this.parseExpression());
            while (this.match(TokenType.COMMA)) {
              args.push(this.parseExpression());
            }
          }
          this.consume(TokenType.RPAREN, 'Expected )');
        }

        const callExpression: Expression = {
          type: 'CallExpression',
          callee: {
            type: 'FieldAccessExpression',
            object: exprOrObject,
            field: method,
            start: exprOrObject.start,
            end: this.previous().end,
          },
          arguments: args,
          start: exprOrObject.start,
          end: this.previous().end,
        };

        // WAIT FOR object TO method can have body and ON INTERRUPT
        // Parse body statements until ON INTERRUPT or END WAIT
        // Optional semicolon after method call (for empty body case)
        this.match(TokenType.SEMICOLON);

        const body: Statement[] = [];
        while (!this.check(TokenType.ON) && !this.check(TokenType.END) && !this.isAtEnd()) {
          body.push(this.parseStatement());
          this.match(TokenType.SEMICOLON);
        }

        let onInterrupt: Statement[] | undefined;
        if (this.match(TokenType.ON)) {
          this.consume(TokenType.INTERRUPT, 'Expected INTERRUPT');
          onInterrupt = [];
          while (!this.check(TokenType.END) && !this.isAtEnd()) {
            onInterrupt.push(this.parseStatement());
            this.match(TokenType.SEMICOLON);
          }
        }

        this.consume(TokenType.END, 'Expected END');
        this.consume(TokenType.WAIT, 'Expected WAIT');

        return {
          type: 'WaitStatement',
          waitType: 'FOR_METHOD',
          expression: callExpression,
          body,
          onInterrupt,
          start,
          end: this.previous().end,
        };
      }

      // This is WAIT FOR expression (not object TO method)
      // WAIT FOR expression can also have body and ON INTERRUPT
      // Optional semicolon after expression (for empty body case)
      this.match(TokenType.SEMICOLON);

      const body: Statement[] = [];
      while (!this.check(TokenType.ON) && !this.check(TokenType.END) && !this.isAtEnd()) {
        body.push(this.parseStatement());
        this.match(TokenType.SEMICOLON);
      }

      let onInterrupt: Statement[] | undefined;
      if (this.match(TokenType.ON)) {
        this.consume(TokenType.INTERRUPT, 'Expected INTERRUPT');
        onInterrupt = [];
        while (!this.check(TokenType.END) && !this.isAtEnd()) {
          onInterrupt.push(this.parseStatement());
          this.match(TokenType.SEMICOLON);
        }
      }

      this.consume(TokenType.END, 'Expected END');
      this.consume(TokenType.WAIT, 'Expected WAIT');

      return {
        type: 'WaitStatement',
        waitType: 'FOR',
        expression: exprOrObject,
        body,
        onInterrupt,
        start,
        end: this.previous().end,
      };
    }

    // WAIT DURATION expression
    const waitType = this.match(TokenType.DURATION) ? 'DURATION' : this.error('Expected DURATION or FOR');
    const expression = this.parseExpression();

    // Check if this is a simple WAIT statement (terminated by semicolon)
    if (this.match(TokenType.SEMICOLON)) {
      // Simple WAIT DURATION expr; statement - no body, no END WAIT
      return {
        type: 'WaitStatement',
        waitType,
        expression,
        body: [],
        onInterrupt: undefined,
        start,
        end: this.previous().end,
      };
    }

    // WAIT DURATION can also have body and ON INTERRUPT (compound form)
    const body: Statement[] = [];
    while (!this.check(TokenType.ON) && !this.check(TokenType.END) && !this.isAtEnd()) {
      body.push(this.parseStatement());
      this.match(TokenType.SEMICOLON);
    }

    let onInterrupt: Statement[] | undefined;
    if (this.match(TokenType.ON)) {
      this.consume(TokenType.INTERRUPT, 'Expected INTERRUPT');
      onInterrupt = [];
      while (!this.check(TokenType.END) && !this.isAtEnd()) {
        onInterrupt.push(this.parseStatement());
        this.match(TokenType.SEMICOLON);
      }
    }

    this.consume(TokenType.END, 'Expected END');
    this.consume(TokenType.WAIT, 'Expected WAIT');

    return {
      type: 'WaitStatement',
      waitType,
      expression,
      body,
      onInterrupt,
      start,
      end: this.previous().end,
    };
  }

  private parseReturnStatement(): Statement {
    const start = this.advance().start; // RETURN

    let value: Expression | undefined;
    if (!this.check(TokenType.SEMICOLON) && !this.check(TokenType.END)) {
      value = this.parseExpression();
    }

    return {
      type: 'ReturnStatement',
      value,
      start,
      end: this.previous().end,
    };
  }

  private parseTerminateStatement(): Statement {
    const start = this.advance().start; // TERMINATE

    return {
      type: 'TerminateStatement',
      start,
      end: this.previous().end,
    };
  }

  private parseExitStatement(): Statement {
    const start = this.advance().start; // EXIT

    return {
      type: 'ExitStatement',
      start,
      end: this.previous().end,
    };
  }

  private parseIncStatement(): Statement {
    const start = this.advance().start; // INC
    this.consume(TokenType.LPAREN, 'Expected ( after INC');

    const variable = this.parseExpression();
    let amount: Expression | undefined;

    if (this.match(TokenType.COMMA)) {
      amount = this.parseExpression();
    }

    this.consume(TokenType.RPAREN, 'Expected ) after INC arguments');

    return {
      type: 'IncStatement',
      variable,
      amount,
      start,
      end: this.previous().end,
    };
  }

  private parseDecStatement(): Statement {
    const start = this.advance().start; // DEC
    this.consume(TokenType.LPAREN, 'Expected ( after DEC');

    const variable = this.parseExpression();
    let amount: Expression | undefined;

    if (this.match(TokenType.COMMA)) {
      amount = this.parseExpression();
    }

    this.consume(TokenType.RPAREN, 'Expected ) after DEC arguments');

    return {
      type: 'DecStatement',
      variable,
      amount,
      start,
      end: this.previous().end,
    };
  }

  private parseNewStatement(): Statement {
    // NEW (variable) is syntactic sugar for creating an object
    // Can also have array dimensions: NEW (variable, 1..10, 1..20)
    const start = this.advance().start; // NEW
    this.consume(TokenType.LPAREN, 'Expected ( after NEW');

    const target = this.parseExpression(); // The variable to assign to
    const args: Expression[] = [];

    // Parse optional constructor arguments or array dimensions (can include ranges like 1..10)
    if (this.match(TokenType.COMMA)) {
      do {
        args.push(this.parseRangeExpression()); // Use parseRangeExpression to support 1..10
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RPAREN, 'Expected ) after NEW arguments');

    // Create a synthetic assignment statement
    // target := NEW (args...)
    return {
      type: 'AssignmentStatement',
      target,
      value: {
        type: 'CallExpression',
        callee: {
          type: 'IdentifierExpression',
          name: 'NEW',
          start,
          end: start,
        },
        arguments: args,
        start,
        end: this.previous().end,
      },
      start,
      end: this.previous().end,
    };
  }

  private parseDisposeStatement(): Statement {
    // DISPOSE (expression) deallocates memory
    // We treat it as a procedure call
    const start = this.advance().start; // DISPOSE
    this.consume(TokenType.LPAREN, 'Expected ( after DISPOSE');
    const arg = this.parseExpression();
    this.consume(TokenType.RPAREN, 'Expected ) after DISPOSE argument');

    // Create a synthetic call expression statement
    return {
      type: 'AssignmentStatement', // Using this as a generic statement
      target: {
        type: 'IdentifierExpression',
        name: 'DISPOSE',
        start,
        end: start,
      },
      value: arg,
      start,
      end: this.previous().end,
    };
  }

  private parseWithStatement(): Statement {
    const start = this.advance().start; // WITH
    const record = this.parseExpression();
    this.match(TokenType.DO); // DO is optional in RAMS

    const body: Statement[] = [];
    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      body.push(this.parseStatement());
      this.match(TokenType.SEMICOLON);
    }

    this.consume(TokenType.END, 'Expected END');
    this.consume(TokenType.WITH, 'Expected WITH after END');

    return {
      type: 'WithStatement',
      record,
      body,
      start,
      end: this.previous().end,
    };
  }

  private parseBlockStatement(): Statement {
    const start = this.advance().start; // BEGIN
    const statements: Statement[] = [];

    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
      this.match(TokenType.SEMICOLON);
    }

    this.consume(TokenType.END, 'Expected END');

    return {
      type: 'BlockStatement',
      statements,
      start,
      end: this.previous().end,
    };
  }

  private parseAskStatement(): Statement {
    const start = this.advance().start; // ASK

    let result: string | undefined;
    // Parse object expression (can be identifier or field access like obj.field)
    const object = this.parsePostfix();

    // Check for result assignment: result := ASK obj TO method
    if (this.check(TokenType.ASSIGN)) {
      // This is actually an assignment like: x := ASK obj Method
      // We need to backtrack this is complex, for now handle simpler case
    }

    // TO keyword is optional in RAMS
    this.match(TokenType.TO);
    const method = this.consume(TokenType.IDENTIFIER, 'Expected method name').value;

    const args: Expression[] = [];
    if (this.match(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        args.push(this.parseExpression());
        while (this.match(TokenType.COMMA)) {
          args.push(this.parseExpression());
        }
      }
      this.consume(TokenType.RPAREN, 'Expected )');
    }

    // Parse optional IN delay clause (for scheduled ASK)
    let delay: Expression | undefined;
    if (this.match(TokenType.IN)) {
      delay = this.parseExpression();
    }

    return {
      type: 'AskStatement',
      object,
      method,
      arguments: args,
      delay,
      result,
      start,
      end: this.previous().end,
    };
  }

  private parseTellStatement(): Statement {
    const start = this.advance().start; // TELL
    // Parse object expression (can be identifier or field access like obj.field)
    const object = this.parsePostfix();
    // TO keyword is optional in RAMS
    this.match(TokenType.TO);
    const method = this.consume(TokenType.IDENTIFIER, 'Expected method name').value;

    const args: Expression[] = [];
    if (this.match(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        args.push(this.parseExpression());
        while (this.match(TokenType.COMMA)) {
          args.push(this.parseExpression());
        }
      }
      this.consume(TokenType.RPAREN, 'Expected )');
    }

    let delay: Expression | undefined;
    if (this.match(TokenType.IN)) {
      delay = this.parseExpression();
    }

    return {
      type: 'TellStatement',
      object,
      method,
      arguments: args,
      delay,
      start,
      end: this.previous().end,
    };
  }

  private parseAssignmentOrExpressionStatement(): Statement {
    const start = this.peek().start;
    const expr = this.parseExpression();

    if (this.match(TokenType.ASSIGN)) {
      const value = this.parseExpression();
      return {
        type: 'AssignmentStatement',
        target: expr,
        value,
        start,
        end: this.previous().end,
      };
    }

    // Just an expression statement (e.g., function call)
    // Wrap it in an assignment to itself (no-op for now)
    return {
      type: 'AssignmentStatement',
      target: expr,
      value: expr,
      start,
      end: this.previous().end,
    };
  }

  // ====================
  // Expression parsing
  // ====================

  private parseExpression(): Expression {
    return this.parseLogicalOr();
  }

  /**
   * Parse a range expression like 1..10 (used in array indices and subranges)
   */
  private parseRangeExpression(): Expression {
    const start = this.peek().start;
    let expr = this.parseAddition(); // Parse the lower bound

    if (this.match(TokenType.RANGE)) {
      const high = this.parseAddition(); // Parse the upper bound
      return {
        type: 'BinaryExpression',
        operator: TokenType.RANGE,
        left: expr,
        right: high,
        start,
        end: high.end,
      };
    }

    return expr;
  }

  private parseLogicalOr(): Expression {
    let expr = this.parseLogicalAnd();

    while (this.match(TokenType.OR, TokenType.XOR)) {
      const operator = this.previous().type;
      const right = this.parseLogicalAnd();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
        start: expr.start,
        end: right.end,
      };
    }

    return expr;
  }

  private parseLogicalAnd(): Expression {
    let expr = this.parseEquality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous().type;
      const right = this.parseEquality();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
        start: expr.start,
        end: right.end,
      };
    }

    return expr;
  }

  private parseEquality(): Expression {
    let expr = this.parseComparison();

    while (this.match(TokenType.EQUAL, TokenType.NOT_EQUAL)) {
      const operator = this.previous().type;
      const right = this.parseComparison();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
        start: expr.start,
        end: right.end,
      };
    }

    return expr;
  }

  private parseComparison(): Expression {
    let expr = this.parseAddition();

    while (
      this.match(
        TokenType.LESS_THAN,
        TokenType.GREATER_THAN,
        TokenType.LESS_EQUAL,
        TokenType.GREATER_EQUAL
      )
    ) {
      const operator = this.previous().type;
      const right = this.parseAddition();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
        start: expr.start,
        end: right.end,
      };
    }

    return expr;
  }

  private parseAddition(): Expression {
    let expr = this.parseMultiplication();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().type;
      const right = this.parseMultiplication();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
        start: expr.start,
        end: right.end,
      };
    }

    return expr;
  }

  private parseMultiplication(): Expression {
    let expr = this.parseUnary();

    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.DIV, TokenType.MOD)) {
      const operator = this.previous().type;
      const right = this.parseUnary();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
        start: expr.start,
        end: right.end,
      };
    }

    return expr;
  }

  private parseUnary(): Expression {
    if (this.match(TokenType.NOT, TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous().type;
      const start = this.previous().start;
      const operand = this.parseUnary();
      return {
        type: 'UnaryExpression',
        operator,
        operand,
        start,
        end: operand.end,
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): Expression {
    let expr = this.parsePrimary();

    while (true) {
      // Special handling for INHERITED MethodName (implicit field access without DOT)
      // Syntax: INHERITED MethodName(args) - calls parent class method
      if (expr.type === 'IdentifierExpression' && expr.name === 'INHERITED' &&
          this.check(TokenType.IDENTIFIER) && !this.check(TokenType.DOT)) {
        const methodName = this.advance().value;
        expr = {
          type: 'FieldAccessExpression',
          object: expr,
          field: methodName,
          start: expr.start,
          end: this.previous().end,
        };
      } else if (this.match(TokenType.DOT)) {
        const field = this.consume(TokenType.IDENTIFIER, 'Expected field name').value;
        expr = {
          type: 'FieldAccessExpression',
          object: expr,
          field,
          start: expr.start,
          end: this.previous().end,
        };
      } else if (this.match(TokenType.LBRACKET)) {
        // Parse array indices (can be multiple for multi-dimensional arrays)
        // Examples: arr[i], arr[i, j], arr[i, j, k]
        const indices: Expression[] = [];
        indices.push(this.parseExpression());
        while (this.match(TokenType.COMMA)) {
          indices.push(this.parseExpression());
        }
        this.consume(TokenType.RBRACKET, 'Expected ]');
        // For AST, store first index (backward compatible)
        expr = {
          type: 'ArrayAccessExpression',
          array: expr,
          index: indices[0], // Primary index for AST compatibility
          start: expr.start,
          end: this.previous().end,
        };
      } else if (this.check(TokenType.LPAREN)) {
        // Function call
        this.advance();
        const args: Expression[] = [];
        if (!this.check(TokenType.RPAREN)) {
          args.push(this.parseExpression());
          while (this.match(TokenType.COMMA)) {
            args.push(this.parseExpression());
          }
        }
        this.consume(TokenType.RPAREN, 'Expected )');
        expr = {
          type: 'CallExpression',
          callee: expr,
          arguments: args,
          start: expr.start,
          end: this.previous().end,
        };

        // RAMS supports WITH clause for formatting functions (e.g., SPRINT)
        // Syntax: SPRINT(args...) WITH formatString
        if (this.match(TokenType.WITH)) {
          const formatExpr = this.parsePrimary(); // Parse the format string/variable
          // Add the format expression as an additional argument
          expr.arguments.push(formatExpr);
          expr.end = this.previous().end;
        }
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): Expression {
    const start = this.peek().start;

    // Literals
    if (this.match(TokenType.INTEGER_LITERAL)) {
      return {
        type: 'LiteralExpression',
        literalType: 'INTEGER',
        value: parseInt(this.previous().value, 10),
        start,
        end: this.previous().end,
      };
    }

    if (this.match(TokenType.REAL_LITERAL)) {
      return {
        type: 'LiteralExpression',
        literalType: 'REAL',
        value: parseFloat(this.previous().value),
        start,
        end: this.previous().end,
      };
    }

    if (this.match(TokenType.STRING_LITERAL)) {
      return {
        type: 'LiteralExpression',
        literalType: 'STRING',
        value: this.previous().value,
        start,
        end: this.previous().end,
      };
    }

    if (this.match(TokenType.CHAR_LITERAL)) {
      return {
        type: 'LiteralExpression',
        literalType: 'CHAR',
        value: this.previous().value,
        start,
        end: this.previous().end,
      };
    }

    if (this.match(TokenType.TRUE, TokenType.FALSE)) {
      return {
        type: 'LiteralExpression',
        literalType: 'BOOLEAN',
        value: this.previous().type === TokenType.TRUE,
        start,
        end: this.previous().end,
      };
    }

    if (this.match(TokenType.NILOBJ, TokenType.NILREC, TokenType.NILARRAY)) {
      return {
        type: 'LiteralExpression',
        literalType: 'NIL',
        value: null,
        start,
        end: this.previous().end,
      };
    }

    // CLONE expression - creates a copy of an object/record
    if (this.match(TokenType.CLONE)) {
      this.consume(TokenType.LPAREN, 'Expected ( after CLONE');
      const argument = this.parseExpression();
      this.consume(TokenType.RPAREN, 'Expected ) after CLONE argument');
      return {
        type: 'CallExpression',
        callee: {
          type: 'IdentifierExpression',
          name: 'CLONE',
          start,
          end: start,
        },
        arguments: [argument],
        start,
        end: this.previous().end,
      };
    }

    // MIN/MAX intrinsic functions - take a type parameter
    // Syntax: MIN(Type) or MAX(Type)
    // Returns the minimum or maximum value for that type
    if (this.check(TokenType.IDENTIFIER) &&
        (this.peek().value === 'MIN' || this.peek().value === 'MAX') &&
        this.peekAhead(1)?.type === TokenType.LPAREN) {
      const funcName = this.advance().value;
      this.consume(TokenType.LPAREN, 'Expected ( after ' + funcName);

      // Parse type name (can be keyword like REAL, INTEGER, etc.)
      const typeName = this.consumeIdentifierOrKeyword('Expected type name');
      this.consume(TokenType.RPAREN, 'Expected ) after type name');

      // Represent as a call expression with the type name as an identifier argument
      return {
        type: 'CallExpression',
        callee: {
          type: 'IdentifierExpression',
          name: funcName,
          start,
          end: start,
        },
        arguments: [{
          type: 'IdentifierExpression',
          name: typeName,
          start,
          end: this.previous().end,
        }],
        start,
        end: this.previous().end,
      };
    }

    // VAL intrinsic function - converts a value to a specific type
    // Syntax: VAL(Type, value)
    // Returns the value converted to the specified type
    if (this.check(TokenType.IDENTIFIER) &&
        this.peek().value === 'VAL' &&
        this.peekAhead(1)?.type === TokenType.LPAREN) {
      this.advance(); // VAL
      this.consume(TokenType.LPAREN, 'Expected ( after VAL');

      // First argument is a type name (can be keyword like REAL, INTEGER)
      const typeName = this.consumeIdentifierOrKeyword('Expected type name');
      this.consume(TokenType.COMMA, 'Expected , after type name');

      // Second argument is an expression
      const valueExpr = this.parseExpression();
      this.consume(TokenType.RPAREN, 'Expected ) after value expression');

      // Represent as a call expression with type name and value
      return {
        type: 'CallExpression',
        callee: {
          type: 'IdentifierExpression',
          name: 'VAL',
          start,
          end: start,
        },
        arguments: [
          {
            type: 'IdentifierExpression',
            name: typeName,
            start,
            end: start,
          },
          valueExpr,
        ],
        start,
        end: this.previous().end,
      };
    }

    // Parenthesized expression
    if (this.match(TokenType.LPAREN)) {
      const expression = this.parseExpression();
      this.consume(TokenType.RPAREN, 'Expected )');
      return {
        type: 'ParenthesizedExpression',
        expression,
        start,
        end: this.previous().end,
      };
    }

    // ASK/TELL expressions
    // RAMS supports both: ASK object Method and ASK object TO Method(args)
    // Also supports IN clause for delayed message sending: TELL object TO Method IN delay
    if (this.match(TokenType.ASK, TokenType.TELL)) {
      const object = this.parsePostfix();

      // Optional TO keyword
      this.match(TokenType.TO);

      // Next token should be method name (identifier)
      const method = this.consume(TokenType.IDENTIFIER, 'Expected method name').value;

      // Parse optional arguments
      const args: Expression[] = [];
      if (this.match(TokenType.LPAREN)) {
        if (!this.check(TokenType.RPAREN)) {
          args.push(this.parseExpression());
          while (this.match(TokenType.COMMA)) {
            args.push(this.parseExpression());
          }
        }
        this.consume(TokenType.RPAREN, 'Expected )');
      }

      // Parse optional IN delay clause (for TELL/ASK)
      // Syntax: TELL object TO Method(...) IN delayExpression
      let delay: Expression | undefined;
      if (this.match(TokenType.IN)) {
        delay = this.parseExpression();
      }

      // Create a call expression that represents the ASK/TELL
      // If there's a delay, we wrap it in a special structure
      const callExpr: Expression = {
        type: 'CallExpression',
        callee: {
          type: 'FieldAccessExpression',
          object,
          field: method,
          start: object.start,
          end: this.previous().end,
        },
        arguments: args,
        start,
        end: this.previous().end,
      };

      // If there's a delay, represent it as an additional property
      // This matches the statement form in parseTellStatement
      if (delay) {
        // Add delay as a pseudo-argument or store it separately
        // For now, we'll add it as an additional argument to keep the AST simple
        return {
          ...callExpr,
          // Store delay in a custom property (may need to update AST type)
          delay,
        };
      }

      return callExpr;
    }

    // INHERITED FROM BaseClass MethodName
    // RAMS allows explicit parent class method calls
    if (this.check(TokenType.INHERITED) && this.peekAhead(1)?.type === TokenType.FROM) {
      this.advance(); // INHERITED
      this.advance(); // FROM
      const baseClass = this.consume(TokenType.IDENTIFIER, 'Expected base class name').value;
      const methodName = this.consume(TokenType.IDENTIFIER, 'Expected method name').value;

      // Parse optional arguments
      const args: Expression[] = [];
      if (this.match(TokenType.LPAREN)) {
        if (!this.check(TokenType.RPAREN)) {
          args.push(this.parseExpression());
          while (this.match(TokenType.COMMA)) {
            args.push(this.parseExpression());
          }
        }
        this.consume(TokenType.RPAREN, 'Expected )');
      }

      // Create a call expression representing INHERITED FROM
      return {
        type: 'CallExpression',
        callee: {
          type: 'FieldAccessExpression',
          object: {
            type: 'IdentifierExpression',
            name: baseClass,
            start,
            end: this.previous().end,
          },
          field: methodName,
          start,
          end: this.previous().end,
        },
        arguments: args,
        start,
        end: this.previous().end,
      };
    }

    // Identifier - also accept SELF/INHERITED/OUTPUT/INPUT/ANYOBJ as special identifiers
    if (this.match(TokenType.IDENTIFIER, TokenType.SELF, TokenType.INHERITED, TokenType.OUTPUT, TokenType.INPUT, TokenType.ANYOBJ)) {
      return {
        type: 'IdentifierExpression',
        name: this.previous().value,
        start,
        end: this.previous().end,
      };
    }

    throw this.error('Expected expression');
  }

  // ====================
  // Helper methods
  // ====================

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  // Check if current token is any method type (ASK, TELL, LMONITOR, RMONITOR, WAITFOR)
  private checkMethodType(): boolean {
    return this.check(TokenType.ASK) || this.check(TokenType.TELL) ||
           this.check(TokenType.LMONITOR) || this.check(TokenType.RMONITOR) ||
           this.check(TokenType.WAITFOR);
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private peekAhead(offset: number): Token | undefined {
    const index = this.current + offset;
    if (index >= this.tokens.length) return undefined;
    return this.tokens[index];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(message);
  }

  /**
   * Consume a token or recover from missing token in error recovery mode
   * Returns a synthetic token if in recovery mode and token is missing
   */
  private consumeOrRecover(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    if (this.errorRecovery) {
      // Record the error but don't throw
      const token = this.peek();
      const error = new ParseError(`${message} at line ${token.start.line}, column ${token.start.column}`, token);
      this.errors.push(error);

      // Return a synthetic token
      return {
        type,
        value: '', // Synthetic token has empty value
        start: token.start,
        end: token.start,
      };
    }

    throw this.error(message);
  }

  /**
   * Consume an identifier or keyword token as a name
   * This allows keywords to be used as identifiers in contexts where they're valid names
   */
  private consumeIdentifierOrKeyword(message: string): string {
    const token = this.peek();
    if (token.type === TokenType.IDENTIFIER || token.type !== TokenType.EOF) {
      // Accept IDENTIFIER or any other non-EOF token (keywords have their own token types)
      // But skip punctuation and operators
      if (token.type === TokenType.IDENTIFIER ||
          (token.value && /^[A-Za-z_][A-Za-z0-9_]*$/.test(token.value))) {
        this.advance();
        return token.value;
      }
    }
    throw this.error(message);
  }

  private error(message: string): never {
    const token = this.peek();
    const error = new ParseError(`${message} at line ${token.start.line}, column ${token.start.column}`, token);
    this.errors.push(error);
    throw error;
  }

  // TODO: Implement error recovery (Task 3.14)
  // private synchronize(): void { ... }
}
