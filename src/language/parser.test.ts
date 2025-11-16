/**
 * Unit tests for MODSIM III Parser
 */

import { Lexer } from './lexer';
import { Parser } from './parser';
import type { Module, ProcedureDeclaration, IfStatement, ForStatement } from './ast';

describe('Parser', () => {
  function parse(source: string): Module {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  describe('Module Structure', () => {
    it('should parse a simple DEFINITION MODULE', () => {
      const source = `
DEFINITION MODULE Test;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.type).toBe('Module');
      expect(ast.kind).toBe('DEFINITION');
      expect(ast.name).toBe('Test');
      expect(ast.imports).toHaveLength(0);
      expect(ast.declarations).toHaveLength(0);
    });

    it('should parse DEFINITION MODULE with TYPE object fields without VAR', () => {
      const source = `
DEFINITION MODULE TestChart;
TYPE
  ChartObj = OBJECT (WindowObj);
    ResultsList : TreeIdObj;
    ChartColor : ColorType;
  END OBJECT;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.kind).toBe('DEFINITION');
      expect(ast.declarations).toHaveLength(1);
      expect(ast.declarations[0].type).toBe('TypeDeclaration');
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.name).toBe('ChartObj');
      expect(typeDecl.typeSpec.type).toBe('ObjectType');
      expect(typeDecl.typeSpec.fields).toHaveLength(2);
      expect(typeDecl.typeSpec.fields[0].names).toEqual(['ResultsList']);
      expect(typeDecl.typeSpec.fields[1].names).toEqual(['ChartColor']);
    });

    it('should parse DEFINITION MODULE with methods without bodies', () => {
      const source = `
DEFINITION MODULE TestChart;
TYPE
  ChartObj = OBJECT (WindowObj);
    ASK METHOD GetValue(IN index: INTEGER): REAL;
    TELL METHOD SetValue(IN index: INTEGER; IN value: REAL);
  END OBJECT;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.kind).toBe('DEFINITION');
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.typeSpec.methods).toHaveLength(2);
      expect(typeDecl.typeSpec.methods[0].methodType).toBe('ASK');
      expect(typeDecl.typeSpec.methods[0].name).toBe('GetValue');
      expect(typeDecl.typeSpec.methods[0].body).toHaveLength(0);
      expect(typeDecl.typeSpec.methods[1].methodType).toBe('TELL');
      expect(typeDecl.typeSpec.methods[1].name).toBe('SetValue');
      expect(typeDecl.typeSpec.methods[1].body).toHaveLength(0);
    });

    it('should parse realistic DEFINITION MODULE (RAMS-style)', () => {
      const source = `
DEFINITION MODULE ABAChart;
FROM GrpId IMPORT BTreeIdObj;
FROM GTypes IMPORT ColorType;
FROM Window IMPORT WindowObj;
TYPE
  ABAChartObj = OBJECT (WindowObj);
    ResultsList : BTreeIdObj;
    ChartColor : ColorType;
    ASK METHOD SetStoreResults(IN flag: BOOLEAN);
    TELL METHOD UpdateDisplay;
  END OBJECT;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.kind).toBe('DEFINITION');
      expect(ast.name).toBe('ABAChart');
      expect(ast.imports).toHaveLength(3);
      expect(ast.imports[0].moduleName).toBe('GrpId');
      expect(ast.imports[0].symbols).toEqual([{ name: 'BTreeIdObj' }]);
      expect(ast.declarations).toHaveLength(1);
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.typeSpec.fields).toHaveLength(2);
      expect(typeDecl.typeSpec.methods).toHaveLength(2);
      expect(typeDecl.typeSpec.methods[0].body).toHaveLength(0);
      expect(typeDecl.typeSpec.methods[1].body).toHaveLength(0);
    });

    it('should parse an IMPLEMENTATION MODULE', () => {
      const source = `
IMPLEMENTATION MODULE Test;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.kind).toBe('IMPLEMENTATION');
      expect(ast.name).toBe('Test');
    });

    it('should parse a simple MAIN MODULE', () => {
      const source = `
MAIN MODULE TestMain;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.type).toBe('Module');
      expect(ast.kind).toBe('MAIN');
      expect(ast.name).toBe('TestMain');
      expect(ast.imports).toHaveLength(0);
      expect(ast.declarations).toHaveLength(0);
      expect(ast.mainBody).toBeUndefined();
    });

    it('should parse a MAIN MODULE with BEGIN...END block', () => {
      const source = `
MAIN MODULE TestMain;
BEGIN
  x := 5;
  y := 10;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.kind).toBe('MAIN');
      expect(ast.name).toBe('TestMain');
      expect(ast.mainBody).toBeDefined();
      expect(ast.mainBody).toHaveLength(2);
      expect(ast.mainBody![0].type).toBe('AssignmentStatement');
      expect(ast.mainBody![1].type).toBe('AssignmentStatement');
    });

    it('should parse a MAIN MODULE with declarations and BEGIN...END block', () => {
      const source = `
MAIN MODULE TestMain;
VAR x: INTEGER;
VAR message: STRING;
BEGIN
  x := 10;
  message := "Test";
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.kind).toBe('MAIN');
      expect(ast.name).toBe('TestMain');
      expect(ast.declarations).toHaveLength(2);
      expect(ast.mainBody).toBeDefined();
      expect(ast.mainBody).toHaveLength(2);
    });

    it('should parse a simple PROGRAM (alternative syntax)', () => {
      const source = `
PROGRAM TestProg;
END PROGRAM;
      `.trim();

      const ast = parse(source);
      expect(ast.type).toBe('Module');
      expect(ast.kind).toBe('MAIN');
      expect(ast.name).toBe('TestProg');
      expect(ast.imports).toHaveLength(0);
      expect(ast.declarations).toHaveLength(0);
      expect(ast.mainBody).toBeUndefined();
    });

    it('should parse a PROGRAM with BEGIN...END block', () => {
      const source = `
PROGRAM TestProg;
BEGIN
  x := 5;
  y := 10;
END PROGRAM;
      `.trim();

      const ast = parse(source);
      expect(ast.kind).toBe('MAIN');
      expect(ast.name).toBe('TestProg');
      expect(ast.mainBody).toBeDefined();
      expect(ast.mainBody).toHaveLength(2);
      expect(ast.mainBody![0].type).toBe('AssignmentStatement');
      expect(ast.mainBody![1].type).toBe('AssignmentStatement');
    });

    it('should parse a PROGRAM with declarations and BEGIN...END block', () => {
      const source = `
PROGRAM TestProg;
VAR x: INTEGER;
VAR message: STRING;
BEGIN
  x := 10;
  message := "Test";
END PROGRAM;
      `.trim();

      const ast = parse(source);
      expect(ast.kind).toBe('MAIN');
      expect(ast.name).toBe('TestProg');
      expect(ast.declarations).toHaveLength(2);
      expect(ast.mainBody).toBeDefined();
      expect(ast.mainBody).toHaveLength(2);
    });

    it('should parse module with imports', () => {
      const source = `
DEFINITION MODULE Test;
FROM Util IMPORT Helper, Tool;
FROM Math IMPORT Add, Sub;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.imports).toHaveLength(2);
      expect(ast.imports[0].moduleName).toBe('Util');
      expect(ast.imports[0].symbols).toEqual([{ name: 'Helper' }, { name: 'Tool' }]);
      expect(ast.imports[1].moduleName).toBe('Math');
      expect(ast.imports[1].symbols).toEqual([{ name: 'Add' }, { name: 'Sub' }]);
    });

    it('should parse imports with AS keyword (qualified imports)', () => {
      const source = `
DEFINITION MODULE Test;
FROM IO IMPORT System AS zaksAsyncCall;
FROM BasicTokenIO IMPORT AddSpaces AS addSpaces, WriteToken;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.imports).toHaveLength(2);
      expect(ast.imports[0].moduleName).toBe('IO');
      expect(ast.imports[0].symbols).toEqual([{ name: 'System', alias: 'zaksAsyncCall' }]);
      expect(ast.imports[1].moduleName).toBe('BasicTokenIO');
      expect(ast.imports[1].symbols).toEqual([
        { name: 'AddSpaces', alias: 'addSpaces' },
        { name: 'WriteToken' },
      ]);
    });

    it('should parse imports mixing aliased and non-aliased symbols', () => {
      const source = `
DEFINITION MODULE Test;
FROM MathMod IMPORT SIN AS sine, COS AS cosine, pi;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.imports).toHaveLength(1);
      expect(ast.imports[0].symbols).toEqual([
        { name: 'SIN', alias: 'sine' },
        { name: 'COS', alias: 'cosine' },
        { name: 'pi' },
      ]);
    });

    it('should parse EXPORT statement with single symbol', () => {
      const source = `
DEFINITION MODULE Test;
EXPORT Helper;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.exports).toBeDefined();
      expect(ast.exports?.symbols).toEqual(['Helper']);
    });

    it('should parse EXPORT statement with multiple symbols', () => {
      const source = `
DEFINITION MODULE Test;
EXPORT Helper, Tool, Utility;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.exports).toBeDefined();
      expect(ast.exports?.symbols).toEqual(['Helper', 'Tool', 'Utility']);
    });

    it('should parse module with imports and exports', () => {
      const source = `
DEFINITION MODULE Test;
FROM IO IMPORT Stream;
EXPORT Helper, Tool;
TYPE Helper = INTEGER;
TYPE Tool = REAL;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.imports).toHaveLength(1);
      expect(ast.exports).toBeDefined();
      expect(ast.exports?.symbols).toEqual(['Helper', 'Tool']);
      expect(ast.declarations).toHaveLength(2);
    });

    it('should parse standalone IMPORT with single module', () => {
      const source = `
IMPLEMENTATION MODULE Test;
IMPORT IO;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.imports).toHaveLength(1);
      expect(ast.imports[0].moduleName).toBe('IO');
      expect(ast.imports[0].symbols).toEqual([]);
    });

    it('should parse standalone IMPORT with multiple modules', () => {
      const source = `
IMPLEMENTATION MODULE Test;
IMPORT IO, MathLib, StringUtil;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.imports).toHaveLength(3);
      expect(ast.imports[0].moduleName).toBe('IO');
      expect(ast.imports[0].symbols).toEqual([]);
      expect(ast.imports[1].moduleName).toBe('MathLib');
      expect(ast.imports[1].symbols).toEqual([]);
      expect(ast.imports[2].moduleName).toBe('StringUtil');
      expect(ast.imports[2].symbols).toEqual([]);
    });

    it('should parse mixed FROM...IMPORT and standalone IMPORT', () => {
      const source = `
IMPLEMENTATION MODULE Test;
FROM IO IMPORT Stream, File;
IMPORT MathLib;
FROM StringUtil IMPORT Length;
IMPORT Util, Helper;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.imports).toHaveLength(5);

      // First: FROM IO IMPORT Stream, File
      expect(ast.imports[0].moduleName).toBe('IO');
      expect(ast.imports[0].symbols).toHaveLength(2);
      expect(ast.imports[0].symbols[0].name).toBe('Stream');
      expect(ast.imports[0].symbols[1].name).toBe('File');

      // Second: IMPORT MathLib
      expect(ast.imports[1].moduleName).toBe('MathLib');
      expect(ast.imports[1].symbols).toEqual([]);

      // Third: FROM StringUtil IMPORT Length
      expect(ast.imports[2].moduleName).toBe('StringUtil');
      expect(ast.imports[2].symbols).toHaveLength(1);
      expect(ast.imports[2].symbols[0].name).toBe('Length');

      // Fourth and Fifth: IMPORT Util, Helper
      expect(ast.imports[3].moduleName).toBe('Util');
      expect(ast.imports[3].symbols).toEqual([]);
      expect(ast.imports[4].moduleName).toBe('Helper');
      expect(ast.imports[4].symbols).toEqual([]);
    });

    it('should parse INC statement with variable only', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  INC(counter);
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as any;
      const incStmt = proc.body[0] as any;
      expect(incStmt.type).toBe('IncStatement');
      expect(incStmt.variable.type).toBe('IdentifierExpression');
      expect(incStmt.variable.name).toBe('counter');
      expect(incStmt.amount).toBeUndefined();
    });

    it('should parse INC statement with amount', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  INC(counter, 5);
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as any;
      const incStmt = proc.body[0] as any;
      expect(incStmt.type).toBe('IncStatement');
      expect(incStmt.variable.type).toBe('IdentifierExpression');
      expect(incStmt.variable.name).toBe('counter');
      expect(incStmt.amount).toBeDefined();
      expect(incStmt.amount.type).toBe('LiteralExpression');
      expect(incStmt.amount.value).toBe(5);
    });

    it('should parse DEC statement with amount', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  DEC(value, 10);
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as any;
      const decStmt = proc.body[0] as any;
      expect(decStmt.type).toBe('DecStatement');
      expect(decStmt.variable.type).toBe('IdentifierExpression');
      expect(decStmt.variable.name).toBe('value');
      expect(decStmt.amount).toBeDefined();
      expect(decStmt.amount.type).toBe('LiteralExpression');
      expect(decStmt.amount.value).toBe(10);
    });
  });

  describe('Type Declarations', () => {
    it('should parse simple type declaration', () => {
      const source = `
DEFINITION MODULE Test;
TYPE Age = INTEGER;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.declarations).toHaveLength(1);
      expect(ast.declarations[0].type).toBe('TypeDeclaration');
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.name).toBe('Age');
      expect(typeDecl.typeSpec.type).toBe('SimpleType');
      expect(typeDecl.typeSpec.name).toBe('INTEGER');
    });

    it('should parse array type', () => {
      const source = `
DEFINITION MODULE Test;
TYPE Matrix = ARRAY [1..10, 1..10] OF REAL;
END MODULE;
      `.trim();

      const ast = parse(source);
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.typeSpec.type).toBe('ArrayType');
      expect(typeDecl.typeSpec.indexRanges).toHaveLength(2);
      expect(typeDecl.typeSpec.elementType.name).toBe('REAL');
    });

    it('should parse enum type', () => {
      const source = `
DEFINITION MODULE Test;
TYPE Color = (RED, GREEN, BLUE);
END MODULE;
      `.trim();

      const ast = parse(source);
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.typeSpec.type).toBe('EnumType');
      expect(typeDecl.typeSpec.values).toEqual(['RED', 'GREEN', 'BLUE']);
    });

    it('should parse subrange type', () => {
      const source = `
DEFINITION MODULE Test;
TYPE Percentage = [0..100];
END MODULE;
      `.trim();

      const ast = parse(source);
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.typeSpec.type).toBe('SubrangeType');
    });

    it('should parse FIXED ARRAY type', () => {
      const source = `
DEFINITION MODULE Test;
TYPE
  CStringType = FIXED ARRAY [0..254] OF CHAR;
END MODULE;
      `.trim();

      const ast = parse(source);
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.typeSpec.type).toBe('ArrayType');
      expect(typeDecl.typeSpec.isFixed).toBe(true);
    });

    it('should parse FIXED RECORD type', () => {
      const source = `
DEFINITION MODULE Test;
TYPE
  PointType = FIXED RECORD
    VAR x: REAL;
    VAR y: REAL;
  END RECORD;
END MODULE;
      `.trim();

      const ast = parse(source);
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.typeSpec.type).toBe('RecordType');
      expect(typeDecl.typeSpec.isFixed).toBe(true);
      expect(typeDecl.typeSpec.fields).toHaveLength(2);
    });

    it('should parse ANYOBJ as return type', () => {
      const source = `
IMPLEMENTATION MODULE Test;
TYPE
  Factory = OBJECT
    ASK METHOD NewObject() : ANYOBJ;
  END OBJECT;
END MODULE;
      `.trim();

      const ast = parse(source);
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.type).toBe('TypeDeclaration');
      const objType = typeDecl.typeSpec;
      expect(objType.type).toBe('ObjectType');
      const method = objType.methods[0];
      expect(method.returnType.name).toBe('ANYOBJ');
    });

    it('should parse ANYOBJ as parameter type', () => {
      const source = `
IMPLEMENTATION MODULE Test;
TYPE
  Disposer = OBJECT
    ASK METHOD DisposeMember(IN member : ANYOBJ);
  END OBJECT;
END MODULE;
      `.trim();

      const ast = parse(source);
      const typeDecl = ast.declarations[0] as any;
      const objType = typeDecl.typeSpec;
      const method = objType.methods[0];
      expect(method.parameters[0].valueType.name).toBe('ANYOBJ');
    });

    it('should parse ANYOBJ as cast expression', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Compare();
VAR obj1, obj2 : ANYOBJ;
BEGIN
  IF ANYOBJ(obj1) = ANYOBJ(obj2) THEN
  END IF;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const procDecl = ast.declarations[0] as any;
      const ifStmt = procDecl.body[0];
      expect(ifStmt.type).toBe('IfStatement');
      expect(ifStmt.condition.type).toBe('BinaryExpression');
      expect(ifStmt.condition.left.type).toBe('CallExpression');
      expect(ifStmt.condition.left.callee.name).toBe('ANYOBJ');
    });
  });

  describe('POINTER types', () => {
    it('should parse POINTER TO simple type', () => {
      const source = `
IMPLEMENTATION MODULE Test;
TYPE
  IntPtr = POINTER TO INTEGER;
END MODULE;
      `.trim();

      const ast = parse(source);
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.type).toBe('TypeDeclaration');
      expect(typeDecl.name).toBe('IntPtr');
      expect(typeDecl.typeSpec.type).toBe('PointerType');
      expect(typeDecl.typeSpec.baseType.type).toBe('SimpleType');
      expect(typeDecl.typeSpec.baseType.name).toBe('INTEGER');
    });

    it('should parse POINTER TO user-defined type', () => {
      const source = `
IMPLEMENTATION MODULE Test;
TYPE
  NodePtr = POINTER TO Node;
END MODULE;
      `.trim();

      const ast = parse(source);
      const ptrDecl = ast.declarations[0] as any;
      expect(ptrDecl.type).toBe('TypeDeclaration');
      expect(ptrDecl.name).toBe('NodePtr');
      expect(ptrDecl.typeSpec.type).toBe('PointerType');
      expect(ptrDecl.typeSpec.baseType.type).toBe('SimpleType');
      expect(ptrDecl.typeSpec.baseType.name).toBe('Node');
    });

    it('should parse nested POINTER types', () => {
      const source = `
IMPLEMENTATION MODULE Test;
TYPE
  PtrPtr = POINTER TO POINTER TO REAL;
END MODULE;
      `.trim();

      const ast = parse(source);
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.type).toBe('TypeDeclaration');
      expect(typeDecl.typeSpec.type).toBe('PointerType');
      expect(typeDecl.typeSpec.baseType.type).toBe('PointerType');
      expect(typeDecl.typeSpec.baseType.baseType.type).toBe('SimpleType');
      expect(typeDecl.typeSpec.baseType.baseType.name).toBe('REAL');
    });
  });

  describe('SET types', () => {
    it('should parse SET OF simple type', () => {
      const source = `
IMPLEMENTATION MODULE Test;
TYPE
  CharSet = SET OF CHAR;
END MODULE;
      `.trim();

      const ast = parse(source);
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.type).toBe('TypeDeclaration');
      expect(typeDecl.name).toBe('CharSet');
      expect(typeDecl.typeSpec.type).toBe('SetType');
      expect(typeDecl.typeSpec.elementType.type).toBe('SimpleType');
      expect(typeDecl.typeSpec.elementType.name).toBe('CHAR');
    });

    it('should parse SET OF user-defined type', () => {
      const source = `
IMPLEMENTATION MODULE Test;
TYPE
  NodeSet = SET OF Node;
END MODULE;
      `.trim();

      const ast = parse(source);
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.type).toBe('TypeDeclaration');
      expect(typeDecl.name).toBe('NodeSet');
      expect(typeDecl.typeSpec.type).toBe('SetType');
      expect(typeDecl.typeSpec.elementType.type).toBe('SimpleType');
      expect(typeDecl.typeSpec.elementType.name).toBe('Node');
    });

    it('should parse SET OF subrange type', () => {
      const source = `
IMPLEMENTATION MODULE Test;
TYPE
  DigitSet = SET OF [0..9];
END MODULE;
      `.trim();

      const ast = parse(source);
      const typeDecl = ast.declarations[0] as any;
      expect(typeDecl.type).toBe('TypeDeclaration');
      expect(typeDecl.typeSpec.type).toBe('SetType');
      expect(typeDecl.typeSpec.elementType.type).toBe('SubrangeType');
    });
  });

  describe('Const and Var Declarations', () => {
    it('should parse constant declaration', () => {
      const source = `
DEFINITION MODULE Test;
CONST PI = 3.14159;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.declarations[0].type).toBe('ConstDeclaration');
      const constDecl = ast.declarations[0] as any;
      expect(constDecl.name).toBe('PI');
      expect(constDecl.value.value).toBeCloseTo(3.14159);
    });

    it('should parse variable declaration', () => {
      const source = `
DEFINITION MODULE Test;
VAR x, y, z: INTEGER;
END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.declarations[0].type).toBe('VarDeclaration');
      const varDecl = ast.declarations[0] as any;
      expect(varDecl.names).toEqual(['x', 'y', 'z']);
      expect(varDecl.valueType.name).toBe('INTEGER');
    });
  });

  describe('Procedure Declarations', () => {
    it('should parse simple procedure', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Greet;
BEGIN
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      expect(proc.type).toBe('ProcedureDeclaration');
      expect(proc.name).toBe('Greet');
      expect(proc.parameters).toHaveLength(0);
      expect(proc.returnType).toBeUndefined();
    });

    it('should parse procedure with parameters and return type', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Add(IN a: INTEGER; IN b: INTEGER): INTEGER;
BEGIN
  RETURN a + b;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      expect(proc.parameters).toHaveLength(2);
      expect(proc.parameters[0].name).toBe('a');
      expect(proc.parameters[0].mode).toBe('IN');
      expect(proc.parameters[1].name).toBe('b');
      expect(proc.returnType).toBeDefined();
    });
  });

  describe('Object Declarations', () => {
    it('should parse simple object', () => {
      const source = `
DEFINITION MODULE Test;
OBJECT MyObject;
  VAR id: INTEGER;
  ASK METHOD GetID: INTEGER;
END OBJECT;
END MODULE;
      `.trim();

      const ast = parse(source);
      const obj = ast.declarations[0] as any;
      expect(obj.type).toBe('ObjectDeclaration');
      expect(obj.name).toBe('MyObject');
      expect(obj.fields).toHaveLength(1);
      expect(obj.methods).toHaveLength(1);
      expect(obj.methods[0].methodType).toBe('ASK');
      expect(obj.methods[0].name).toBe('GetID');
    });

    it('should parse object with inheritance', () => {
      const source = `
DEFINITION MODULE Test;
OBJECT DerivedObj(BaseObj);
  VAR extra: STRING;
END OBJECT;
END MODULE;
      `.trim();

      const ast = parse(source);
      const obj = ast.declarations[0] as any;
      expect(obj.baseTypes).toEqual(['BaseObj']);
    });
  });

  describe('Statements', () => {
    it('should parse assignment statement', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  x := 10;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      expect(proc.body).toHaveLength(1);
      expect(proc.body[0].type).toBe('AssignmentStatement');
    });

    it('should parse IF statement', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  IF x = 10 THEN
    OUTPUT("ten");
  ELSIF x > 10 THEN
    OUTPUT("more");
  ELSE
    OUTPUT("less");
  END IF;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      const ifStmt = proc.body[0] as IfStatement;
      expect(ifStmt.type).toBe('IfStatement');
      expect(ifStmt.thenBlock).toHaveLength(1);
      expect(ifStmt.elsifClauses).toHaveLength(1);
      expect(ifStmt.elseBlock).toHaveLength(1);
    });

    it('should parse WHILE statement', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  WHILE x < 10 DO
    x := x + 1;
  END WHILE;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      expect(proc.body[0].type).toBe('WhileStatement');
    });

    it('should parse FOR statement', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  FOR i := 1 TO 10 DO
    OUTPUT(i);
  END FOR;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      const forStmt = proc.body[0] as ForStatement;
      expect(forStmt.type).toBe('ForStatement');
      expect(forStmt.variable).toBe('i');
      expect(forStmt.direction).toBe('TO');
    });

    it('should parse FOR statement with BY clause', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  FOR i := 10 DOWNTO 1 BY 2 DO
    OUTPUT(i);
  END FOR;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      const forStmt = proc.body[0] as ForStatement;
      expect(forStmt.direction).toBe('DOWNTO');
      expect(forStmt.step).toBeDefined();
    });

    it('should parse FOREACH statement', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  FOREACH item IN collection DO
    OUTPUT(item);
  END FOREACH;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      expect(proc.body[0].type).toBe('ForeachStatement');
    });

    it('should parse CASE statement', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  CASE x OF
    1, 2: OUTPUT("one or two");
  |
    3: OUTPUT("three");
  OTHERWISE
    OUTPUT("other");
  END CASE;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      const caseStmt = proc.body[0] as any;
      expect(caseStmt.type).toBe('CaseStatement');
      expect(caseStmt.cases).toHaveLength(2);
      expect(caseStmt.otherwiseBlock).toHaveLength(1);
    });

    it('should parse LOOP statement', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  LOOP
    IF done THEN
      EXIT;
    END IF;
  END LOOP;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      expect(proc.body[0].type).toBe('LoopStatement');
    });

    it('should parse REPEAT-UNTIL statement', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE CalcDistance;
VAR point, prevpoint, startPoint : INTEGER;
BEGIN
  REPEAT
    point := prevpoint;
    prevpoint := point - 1;
  UNTIL prevpoint = startPoint ;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as any;
      expect(proc.body[0].type).toBe('RepeatUntilStatement');
      expect(proc.body[0].body).toHaveLength(2);
      expect(proc.body[0].condition.type).toBe('BinaryExpression');
    });

    it('should parse WAIT statement', () => {
      const source = `
IMPLEMENTATION MODULE Test;
OBJECT Test;
  TELL METHOD Process;
  BEGIN
    WAIT DURATION 10.0;
  END METHOD;
END OBJECT;
END MODULE;
      `.trim();

      const ast = parse(source);
      const obj = ast.declarations[0] as any;
      const method = obj.methods[0];
      expect(method.body[0].type).toBe('WaitStatement');
      expect(method.body[0].waitType).toBe('DURATION');
    });

    it('should parse RETURN statement', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test: INTEGER;
BEGIN
  RETURN 42;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      expect(proc.body[0].type).toBe('ReturnStatement');
    });

    it('should parse WITH statement', () => {
      const source = `
IMPLEMENTATION MODULE Test;
TYPE PointType = RECORD
  VAR x: REAL;
  VAR y: REAL;
END RECORD;
PROCEDURE Test;
VAR point: PointType;
BEGIN
  WITH point DO
    x := 10.0;
  END WITH;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[1] as any;
      const withStmt = proc.body[0] as any;
      expect(withStmt.type).toBe('WithStatement');
      expect(withStmt.record.type).toBe('IdentifierExpression');
      expect(withStmt.record.name).toBe('point');
      expect(withStmt.body).toHaveLength(1);
      expect(withStmt.body[0].type).toBe('AssignmentStatement');
    });

    it('should parse WITH statement with multiple statements', () => {
      const source = `
IMPLEMENTATION MODULE Test;
TYPE PointType = RECORD
  VAR x: REAL;
  VAR y: REAL;
  VAR z: REAL;
END RECORD;
PROCEDURE Test;
VAR point: PointType;
BEGIN
  WITH point DO
    x := 1.0;
    y := 2.0;
    z := 3.0;
  END WITH;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[1] as any;
      const withStmt = proc.body[0] as any;
      expect(withStmt.type).toBe('WithStatement');
      expect(withStmt.body).toHaveLength(3);
    });

    it('should parse nested WITH statements', () => {
      const source = `
IMPLEMENTATION MODULE Test;
TYPE RecType = RECORD
  VAR value: INTEGER;
END RECORD;
PROCEDURE Test;
VAR outer: RecType;
VAR inner: RecType;
BEGIN
  WITH outer DO
    WITH inner DO
      value := 42;
    END WITH;
  END WITH;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[1] as any;
      const outerWith = proc.body[0] as any;
      expect(outerWith.type).toBe('WithStatement');
      expect(outerWith.body).toHaveLength(1);
      const innerWith = outerWith.body[0] as any;
      expect(innerWith.type).toBe('WithStatement');
      expect(innerWith.body).toHaveLength(1);
    });
  });

  describe('Expressions', () => {
    it('should parse arithmetic expressions', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  x := 1 + 2 * 3 - 4 / 5;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      const assignment = proc.body[0] as any;
      expect(assignment.value.type).toBe('BinaryExpression');
    });

    it('should parse comparison expressions', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  IF x = 10 AND y <> 20 THEN
    done := TRUE;
  END IF;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      const ifStmt = proc.body[0] as IfStatement;
      expect(ifStmt.condition.type).toBe('BinaryExpression');
    });

    it('should parse field access', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  x := obj.field;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      const assignment = proc.body[0] as any;
      expect(assignment.value.type).toBe('FieldAccessExpression');
    });

    it('should parse array access', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  x := arr[5];
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      const assignment = proc.body[0] as any;
      expect(assignment.value.type).toBe('ArrayAccessExpression');
    });

    it('should parse function calls', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  x := Calculate(1, 2, 3);
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      const assignment = proc.body[0] as any;
      expect(assignment.value.type).toBe('CallExpression');
      expect(assignment.value.arguments).toHaveLength(3);
    });

    it('should parse boolean literals', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  done := TRUE;
  active := FALSE;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      expect(proc.body).toHaveLength(2);
      const assign1 = proc.body[0] as any;
      expect(assign1.value.literalType).toBe('BOOLEAN');
      expect(assign1.value.value).toBe(true);
    });

    it('should parse NIL literals', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  obj := NILOBJ;
  rec := NILREC;
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      const assign1 = proc.body[0] as any;
      expect(assign1.value.literalType).toBe('NIL');
      expect(assign1.value.value).toBeNull();
    });
  });

  describe('Complex Code', () => {
    it('should parse a realistic procedure', () => {
      const source = `
IMPLEMENTATION MODULE Math;

PROCEDURE Factorial(IN n: INTEGER): INTEGER;
VAR result: INTEGER;
BEGIN
  result := 1;
  FOR i := 1 TO n DO
    result := result * i;
  END FOR;
  RETURN result;
END PROCEDURE;

END MODULE;
      `.trim();

      const ast = parse(source);
      expect(ast.declarations).toHaveLength(1);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      expect(proc.name).toBe('Factorial');
      expect(proc.parameters).toHaveLength(1);
      expect(proc.body).toHaveLength(3); // assignment, for loop, return
    });

    it('should parse ASK and TELL statements', () => {
      const source = `
IMPLEMENTATION MODULE Test;
PROCEDURE Test;
BEGIN
  ASK obj TO Initialize();
  TELL obj TO StartProcess();
END PROCEDURE;
END MODULE;
      `.trim();

      const ast = parse(source);
      const proc = ast.declarations[0] as ProcedureDeclaration;
      expect(proc.body[0].type).toBe('AskStatement');
      expect(proc.body[1].type).toBe('TellStatement');
    });
  });
});
