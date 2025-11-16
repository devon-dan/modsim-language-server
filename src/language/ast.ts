/**
 * Abstract Syntax Tree (AST) definitions for MODSIM III
 */

// Token types
export enum TokenType {
  // Keywords
  AND = 'AND',
  ANYOBJ = 'ANYOBJ',
  ARRAY = 'ARRAY',
  AS = 'AS',
  ASK = 'ASK',
  BEGIN = 'BEGIN',
  BOOLEAN = 'BOOLEAN',
  BY = 'BY',
  CASE = 'CASE',
  CLASS = 'CLASS',
  CLONE = 'CLONE',
  CONST = 'CONST',
  DEC = 'DEC',
  DEFINITION = 'DEFINITION',
  DISPOSE = 'DISPOSE',
  DIV = 'DIV',
  DO = 'DO',
  DOWNTO = 'DOWNTO',
  DURATION = 'DURATION',
  ELSE = 'ELSE',
  ELSIF = 'ELSIF',
  END = 'END',
  EXIT = 'EXIT',
  EXPORT = 'EXPORT',
  FALSE = 'FALSE',
  FIRST = 'FIRST',
  FIXED = 'FIXED',
  FOR = 'FOR',
  FOREACH = 'FOREACH',
  FROM = 'FROM',
  IF = 'IF',
  IMPLEMENTATION = 'IMPLEMENTATION',
  IMPORT = 'IMPORT',
  IN = 'IN',
  INC = 'INC',
  INHERITED = 'INHERITED',
  INOUT = 'INOUT',
  INPUT = 'INPUT',
  INTEGER = 'INTEGER',
  INTERRUPT = 'INTERRUPT',
  LAST = 'LAST',
  LIBRARY = 'LIBRARY',
  LMONITOR = 'LMONITOR',
  LMONITORED = 'LMONITORED',
  LRMONITORED = 'LRMONITORED',
  LOOP = 'LOOP',
  MAIN = 'MAIN',
  METHOD = 'METHOD',
  MOD = 'MOD',
  MODULE = 'MODULE',
  NEW = 'NEW',
  NILARRAY = 'NILARRAY',
  NILOBJ = 'NILOBJ',
  NILREC = 'NILREC',
  NOT = 'NOT',
  NUMBER = 'NUMBER',
  OBJECT = 'OBJECT',
  OF = 'OF',
  ON = 'ON',
  OR = 'OR',
  OTHERWISE = 'OTHERWISE',
  OUT = 'OUT',
  OUTPUT = 'OUTPUT',
  OVERRIDE = 'OVERRIDE',
  POINTER = 'POINTER',
  PRIVATE = 'PRIVATE',
  PROCEDURE = 'PROCEDURE',
  PROGRAM = 'PROGRAM',
  PROTO = 'PROTO',
  PUBLIC = 'PUBLIC',
  REAL = 'REAL',
  RECORD = 'RECORD',
  REPEAT = 'REPEAT',
  RETURN = 'RETURN',
  RMONITOR = 'RMONITOR',
  RMONITORED = 'RMONITORED',
  SELF = 'SELF',
  SET = 'SET',
  STRING = 'STRING',
  TELL = 'TELL',
  TERMINATE = 'TERMINATE',
  THEN = 'THEN',
  TO = 'TO',
  TRUE = 'TRUE',
  TYPE = 'TYPE',
  UNTIL = 'UNTIL',
  VAR = 'VAR',
  WAITFOR = 'WAITFOR',
  WAIT = 'WAIT',
  WHEN = 'WHEN',
  WHILE = 'WHILE',
  WITH = 'WITH',
  XOR = 'XOR',

  // Operators
  ASSIGN = ':=',
  EQUAL = '=',
  NOT_EQUAL = '<>',
  LESS_THAN = '<',
  GREATER_THAN = '>',
  LESS_EQUAL = '<=',
  GREATER_EQUAL = '>=',
  PLUS = '+',
  MINUS = '-',
  MULTIPLY = '*',
  DIVIDE = '/',
  DOT = '.',
  COMMA = ',',
  SEMICOLON = ';',
  COLON = ':',
  LPAREN = '(',
  RPAREN = ')',
  LBRACKET = '[',
  RBRACKET = ']',
  PIPE = '|',
  RANGE = '..',
  HASH = '#',

  // Literals
  IDENTIFIER = 'IDENTIFIER',
  INTEGER_LITERAL = 'INTEGER_LITERAL',
  REAL_LITERAL = 'REAL_LITERAL',
  STRING_LITERAL = 'STRING_LITERAL',
  CHAR_LITERAL = 'CHAR_LITERAL',

  // Comments and whitespace
  COMMENT = 'COMMENT',
  WHITESPACE = 'WHITESPACE',

  // Special
  EOF = 'EOF',
  ERROR = 'ERROR',
}

// Position in source code
export interface Position {
  line: number;
  column: number;
  offset: number;
}

// Token
export interface Token {
  type: TokenType;
  value: string;
  start: Position;
  end: Position;
}

// Keywords map (for quick lookup)
export const KEYWORDS: Map<string, TokenType> = new Map([
  ['AND', TokenType.AND],
  ['ANYOBJ', TokenType.ANYOBJ],
  ['ARRAY', TokenType.ARRAY],
  ['AS', TokenType.AS],
  ['ASK', TokenType.ASK],
  ['BEGIN', TokenType.BEGIN],
  ['BOOLEAN', TokenType.BOOLEAN],
  ['BY', TokenType.BY],
  ['CASE', TokenType.CASE],
  ['CLASS', TokenType.CLASS],
  ['CLONE', TokenType.CLONE],
  ['CONST', TokenType.CONST],
  ['DEC', TokenType.DEC],
  ['DEFINITION', TokenType.DEFINITION],
  ['DISPOSE', TokenType.DISPOSE],
  ['DIV', TokenType.DIV],
  ['DO', TokenType.DO],
  ['DOWNTO', TokenType.DOWNTO],
  ['DURATION', TokenType.DURATION],
  ['ELSE', TokenType.ELSE],
  ['ELSIF', TokenType.ELSIF],
  ['END', TokenType.END],
  ['EXIT', TokenType.EXIT],
  ['EXPORT', TokenType.EXPORT],
  ['FALSE', TokenType.FALSE],
  ['FIRST', TokenType.FIRST],
  ['FIXED', TokenType.FIXED],
  ['FOR', TokenType.FOR],
  ['FOREACH', TokenType.FOREACH],
  ['FROM', TokenType.FROM],
  ['IF', TokenType.IF],
  ['IMPLEMENTATION', TokenType.IMPLEMENTATION],
  ['IMPORT', TokenType.IMPORT],
  ['IN', TokenType.IN],
  ['INC', TokenType.INC],
  ['INHERITED', TokenType.INHERITED],
  ['INOUT', TokenType.INOUT],
  ['INPUT', TokenType.INPUT],
  ['INTEGER', TokenType.INTEGER],
  ['INTERRUPT', TokenType.INTERRUPT],
  ['LAST', TokenType.LAST],
  ['LIBRARY', TokenType.LIBRARY],
  ['LMONITOR', TokenType.LMONITOR],
  ['LMONITORED', TokenType.LMONITORED],
  ['LRMONITORED', TokenType.LRMONITORED],
  ['LOOP', TokenType.LOOP],
  ['MAIN', TokenType.MAIN],
  ['METHOD', TokenType.METHOD],
  ['MOD', TokenType.MOD],
  ['MODULE', TokenType.MODULE],
  ['NEW', TokenType.NEW],
  ['NILARRAY', TokenType.NILARRAY],
  ['NILOBJ', TokenType.NILOBJ],
  ['NILREC', TokenType.NILREC],
  ['NOT', TokenType.NOT],
  ['NUMBER', TokenType.NUMBER],
  ['OBJECT', TokenType.OBJECT],
  ['OF', TokenType.OF],
  ['ON', TokenType.ON],
  ['OR', TokenType.OR],
  ['OTHERWISE', TokenType.OTHERWISE],
  ['OUT', TokenType.OUT],
  ['OUTPUT', TokenType.OUTPUT],
  ['OVERRIDE', TokenType.OVERRIDE],
  ['POINTER', TokenType.POINTER],
  ['PRIVATE', TokenType.PRIVATE],
  ['PROCEDURE', TokenType.PROCEDURE],
  ['PROGRAM', TokenType.PROGRAM],
  ['PROTO', TokenType.PROTO],
  ['PUBLIC', TokenType.PUBLIC],
  ['REAL', TokenType.REAL],
  ['RECORD', TokenType.RECORD],
  ['REPEAT', TokenType.REPEAT],
  ['RETURN', TokenType.RETURN],
  ['RMONITOR', TokenType.RMONITOR],
  ['RMONITORED', TokenType.RMONITORED],
  ['SELF', TokenType.SELF],
  ['SET', TokenType.SET],
  ['STRING', TokenType.STRING],
  ['TELL', TokenType.TELL],
  ['TERMINATE', TokenType.TERMINATE],
  ['THEN', TokenType.THEN],
  ['TO', TokenType.TO],
  ['TRUE', TokenType.TRUE],
  ['TYPE', TokenType.TYPE],
  ['UNTIL', TokenType.UNTIL],
  ['VAR', TokenType.VAR],
  ['WAITFOR', TokenType.WAITFOR],
  ['WAIT', TokenType.WAIT],
  ['WHEN', TokenType.WHEN],
  ['WHILE', TokenType.WHILE],
  ['WITH', TokenType.WITH],
  ['XOR', TokenType.XOR],
]);

// ====================
// AST Node Definitions
// ====================

export interface ASTNode {
  type: string;
  start: Position;
  end: Position;
}

// Module structure
export interface Module extends ASTNode {
  type: 'Module';
  kind: 'DEFINITION' | 'IMPLEMENTATION' | 'MAIN';
  name: string;
  imports: ImportStatement[];
  exports?: ExportStatement; // For DEFINITION MODULE only
  declarations: Declaration[];
  mainBody?: Statement[]; // For MAIN MODULE only
}

export interface ImportStatement extends ASTNode {
  type: 'ImportStatement';
  moduleName: string;
  symbols: Array<{ name: string; alias?: string }>;
}

export interface ExportStatement extends ASTNode {
  type: 'ExportStatement';
  symbols: string[];
}

// Declarations
export type Declaration =
  | TypeDeclaration
  | ConstDeclaration
  | VarDeclaration
  | ProcedureDeclaration
  | ObjectDeclaration;

export interface TypeDeclaration extends ASTNode {
  type: 'TypeDeclaration';
  name: string;
  typeSpec: TypeSpec;
}

export interface ConstDeclaration extends ASTNode {
  type: 'ConstDeclaration';
  name: string;
  valueType?: TypeSpec;
  value: Expression;
}

export interface VarDeclaration extends ASTNode {
  type: 'VarDeclaration';
  names: string[];
  valueType: TypeSpec;
}

export interface ProcedureDeclaration extends ASTNode {
  type: 'ProcedureDeclaration';
  name: string;
  parameters: Parameter[];
  returnType?: TypeSpec;
  localDeclarations?: Declaration[]; // VAR, CONST, TYPE inside procedure
  body: Statement[];
}

export interface ObjectDeclaration extends ASTNode {
  type: 'ObjectDeclaration';
  name: string;
  baseTypes?: string[];
  fields: VarDeclaration[];
  methods: MethodDeclaration[];
  privateSection?: {
    fields: VarDeclaration[];
    methods: MethodDeclaration[];
  };
}

export interface MethodDeclaration extends ASTNode {
  type: 'MethodDeclaration';
  methodType: 'ASK' | 'TELL' | 'LMONITOR' | 'RMONITOR' | 'WAITFOR';
  name: string;
  parameters: Parameter[];
  returnType?: TypeSpec;
  isOverride?: boolean;
  localDeclarations?: Declaration[]; // VAR, CONST, TYPE inside method
  body: Statement[];
}

export interface Parameter extends ASTNode {
  type: 'Parameter';
  mode: 'IN' | 'OUT' | 'INOUT';
  name: string;
  valueType: TypeSpec;
}

// Type specifications
export type TypeSpec =
  | SimpleType
  | ArrayType
  | RecordType
  | ObjectType
  | SubrangeType
  | EnumType
  | PointerType
  | SetType
  | MonitoredType;

export interface SimpleType extends ASTNode {
  type: 'SimpleType';
  name: string;
}

export interface ArrayType extends ASTNode {
  type: 'ArrayType';
  isFixed?: boolean;
  indexRanges: Expression[];
  elementType: TypeSpec;
}

export interface RecordType extends ASTNode {
  type: 'RecordType';
  isFixed?: boolean;
  fields: VarDeclaration[];
}

export interface ObjectType extends ASTNode {
  type: 'ObjectType';
  baseTypes?: string[];
  fields: VarDeclaration[];
  methods: MethodDeclaration[];
}

export interface SubrangeType extends ASTNode {
  type: 'SubrangeType';
  low: Expression;
  high: Expression;
}

export interface EnumType extends ASTNode {
  type: 'EnumType';
  values: string[];
}

export interface PointerType extends ASTNode {
  type: 'PointerType';
  baseType: TypeSpec;
}

export interface SetType extends ASTNode {
  type: 'SetType';
  elementType: TypeSpec;
}

export interface MonitoredType extends ASTNode {
  type: 'MonitoredType';
  monitorKeyword: TokenType; // LMONITORED, RMONITORED, or LRMONITORED
  baseType: TypeSpec;
  monitorType: string; // Monitor object type name
}

// Statements
export type Statement =
  | AssignmentStatement
  | AskStatement
  | TellStatement
  | IfStatement
  | WhileStatement
  | ForStatement
  | ForeachStatement
  | CaseStatement
  | LoopStatement
  | RepeatUntilStatement
  | WaitStatement
  | ReturnStatement
  | TerminateStatement
  | ExitStatement
  | IncStatement
  | DecStatement
  | WithStatement
  | BlockStatement;

export interface AssignmentStatement extends ASTNode {
  type: 'AssignmentStatement';
  target: Expression;
  value: Expression;
}

export interface AskStatement extends ASTNode {
  type: 'AskStatement';
  object: Expression;
  method: string;
  arguments: Expression[];
  delay?: Expression; // optional delay for scheduled ASK
  result?: string; // variable name if result is captured
}

export interface TellStatement extends ASTNode {
  type: 'TellStatement';
  object: Expression;
  method: string;
  arguments: Expression[];
  delay?: Expression;
}

export interface IfStatement extends ASTNode {
  type: 'IfStatement';
  condition: Expression;
  thenBlock: Statement[];
  elsifClauses: { condition: Expression; block: Statement[] }[];
  elseBlock?: Statement[];
}

export interface WhileStatement extends ASTNode {
  type: 'WhileStatement';
  condition: Expression;
  body: Statement[];
}

export interface ForStatement extends ASTNode {
  type: 'ForStatement';
  variable: string;
  from: Expression;
  to: Expression;
  step?: Expression;
  direction: 'TO' | 'DOWNTO';
  body: Statement[];
}

export interface ForeachStatement extends ASTNode {
  type: 'ForeachStatement';
  variable: string;
  collection: Expression;
  body: Statement[];
}

export interface CaseStatement extends ASTNode {
  type: 'CaseStatement';
  expression: Expression;
  cases: { values: Expression[]; block: Statement[] }[];
  otherwiseBlock?: Statement[];
}

export interface LoopStatement extends ASTNode {
  type: 'LoopStatement';
  body: Statement[];
}

export interface RepeatUntilStatement extends ASTNode {
  type: 'RepeatUntilStatement';
  body: Statement[];
  condition: Expression;
}

export interface WaitStatement extends ASTNode {
  type: 'WaitStatement';
  waitType: 'DURATION' | 'FOR' | 'FOR_METHOD';
  expression: Expression;
  body?: Statement[];
  onInterrupt?: Statement[];
}

export interface ReturnStatement extends ASTNode {
  type: 'ReturnStatement';
  value?: Expression;
}

export interface TerminateStatement extends ASTNode {
  type: 'TerminateStatement';
}

export interface ExitStatement extends ASTNode {
  type: 'ExitStatement';
}

export interface IncStatement extends ASTNode {
  type: 'IncStatement';
  variable: Expression;
  amount?: Expression;
}

export interface DecStatement extends ASTNode {
  type: 'DecStatement';
  variable: Expression;
  amount?: Expression;
}

export interface WithStatement extends ASTNode {
  type: 'WithStatement';
  record: Expression;
  body: Statement[];
}

export interface BlockStatement extends ASTNode {
  type: 'BlockStatement';
  statements: Statement[];
}

// Expressions
export type Expression =
  | BinaryExpression
  | UnaryExpression
  | CallExpression
  | FieldAccessExpression
  | ArrayAccessExpression
  | IdentifierExpression
  | LiteralExpression
  | ParenthesizedExpression;

export interface BinaryExpression extends ASTNode {
  type: 'BinaryExpression';
  operator: TokenType;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends ASTNode {
  type: 'UnaryExpression';
  operator: TokenType;
  operand: Expression;
}

export interface CallExpression extends ASTNode {
  type: 'CallExpression';
  callee: Expression;
  arguments: Expression[];
  delay?: Expression; // optional delay for ASK/TELL IN clause
}

export interface FieldAccessExpression extends ASTNode {
  type: 'FieldAccessExpression';
  object: Expression;
  field: string;
}

export interface ArrayAccessExpression extends ASTNode {
  type: 'ArrayAccessExpression';
  array: Expression;
  index: Expression;
}

export interface IdentifierExpression extends ASTNode {
  type: 'IdentifierExpression';
  name: string;
}

export interface LiteralExpression extends ASTNode {
  type: 'LiteralExpression';
  literalType: 'INTEGER' | 'REAL' | 'STRING' | 'CHAR' | 'BOOLEAN' | 'NIL';
  value: string | number | boolean | null;
}

export interface ParenthesizedExpression extends ASTNode {
  type: 'ParenthesizedExpression';
  expression: Expression;
}
