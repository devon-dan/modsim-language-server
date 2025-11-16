/**
 * Semantic Tokens Provider
 * Provides semantic highlighting for MODSIM III code
 */

import { SemanticTokensBuilder } from 'vscode-languageserver/node';
import type { Module, Declaration, Statement, Expression } from '../language/ast';

// Token types (must match order in server capabilities)
export enum TokenType {
  KEYWORD = 0,
  TYPE = 1,
  CLASS = 2,
  FUNCTION = 3,
  VARIABLE = 4,
  PARAMETER = 5,
  PROPERTY = 6,
  STRING = 7,
  NUMBER = 8,
  COMMENT = 9,
}

// Token modifiers (bitflags)
export enum TokenModifier {
  DECLARATION = 0,
  DEFINITION = 1,
  READONLY = 2,
}

/**
 * Get semantic tokens for a module
 */
export function getSemanticTokens(ast: Module): number[] {
  const builder = new SemanticTokensBuilder();

  // Process module imports
  if (ast.imports) {
    for (const importStmt of ast.imports) {
      visitImportStatement(importStmt as any, builder);
    }
  }

  // Process module declarations
  if (ast.declarations) {
    for (const decl of ast.declarations) {
      visitDeclaration(decl, builder);
    }
  }

  return builder.build().data;
}

/**
 * Visit an import statement
 */
function visitImportStatement(stmt: any, builder: SemanticTokensBuilder): void {
  if (!stmt.start || !stmt.end) return;

  // Highlight module name
  if (stmt.moduleName && stmt.start) {
    builder.push(
      stmt.start.line - 1,
      stmt.start.column - 1,
      stmt.moduleName.length,
      TokenType.CLASS,
      0
    );
  }

  // Highlight imported symbols
  if (stmt.symbols && Array.isArray(stmt.symbols)) {
    for (const symbol of stmt.symbols) {
      if (typeof symbol === 'string') {
        // Position would need to be tracked in AST
        // For now, skip
      }
    }
  }
}

/**
 * Visit a declaration
 */
function visitDeclaration(decl: Declaration, builder: SemanticTokensBuilder): void {
  switch (decl.type) {
    case 'TypeDeclaration':
      visitTypeDeclaration(decl as any, builder);
      break;
    case 'ConstDeclaration':
      visitConstDeclaration(decl as any, builder);
      break;
    case 'VarDeclaration':
      visitVarDeclaration(decl as any, builder);
      break;
    case 'ProcedureDeclaration':
      visitProcedureDeclaration(decl as any, builder);
      break;
    case 'ObjectDeclaration':
      visitObjectDeclaration(decl as any, builder);
      break;
  }
}

/**
 * Visit a type declaration
 */
function visitTypeDeclaration(decl: any, builder: SemanticTokensBuilder): void {
  if (!decl.start) return;

  // Highlight type name
  if (decl.name) {
    builder.push(
      decl.start.line - 1,
      decl.start.column - 1,
      decl.name.length,
      TokenType.TYPE,
      1 << TokenModifier.DECLARATION
    );
  }

  // Visit type specification
  if (decl.typeSpec) {
    visitTypeSpec(decl.typeSpec, builder);
  }
}

/**
 * Visit a type specification
 */
function visitTypeSpec(typeSpec: any, builder: SemanticTokensBuilder): void {
  if (!typeSpec) return;

  switch (typeSpec.type) {
    case 'ObjectType':
      visitObjectType(typeSpec, builder);
      break;
    case 'ArrayType':
      if (typeSpec.elementType) {
        visitTypeSpec(typeSpec.elementType, builder);
      }
      break;
    case 'RecordType':
      if (typeSpec.fields && Array.isArray(typeSpec.fields)) {
        for (const field of typeSpec.fields) {
          visitVarDeclaration(field, builder);
        }
      }
      break;
  }
}

/**
 * Visit an object type
 */
function visitObjectType(objType: any, builder: SemanticTokensBuilder): void {
  // Visit fields
  if (objType.fields && Array.isArray(objType.fields)) {
    for (const field of objType.fields) {
      visitVarDeclaration(field, builder);
    }
  }

  // Visit methods
  if (objType.methods && Array.isArray(objType.methods)) {
    for (const method of objType.methods) {
      visitMethodDeclaration(method, builder);
    }
  }
}

/**
 * Visit a method declaration
 */
function visitMethodDeclaration(method: any, builder: SemanticTokensBuilder): void {
  if (!method.start) return;

  // Highlight method name
  if (method.name) {
    builder.push(
      method.start.line - 1,
      method.start.column - 1,
      method.name.length,
      TokenType.FUNCTION,
      1 << TokenModifier.DECLARATION
    );
  }

  // Visit parameters
  if (method.parameters && Array.isArray(method.parameters)) {
    for (const param of method.parameters) {
      visitParameter(param, builder);
    }
  }

  // Visit body
  if (method.body && Array.isArray(method.body)) {
    for (const stmt of method.body) {
      visitStatement(stmt, builder);
    }
  }
}

/**
 * Visit a constant declaration
 */
function visitConstDeclaration(decl: any, builder: SemanticTokensBuilder): void {
  if (!decl.start) return;

  // Highlight constant name
  if (decl.name) {
    builder.push(
      decl.start.line - 1,
      decl.start.column - 1,
      decl.name.length,
      TokenType.VARIABLE,
      (1 << TokenModifier.DECLARATION) | (1 << TokenModifier.READONLY)
    );
  }

  // Visit value expression
  if (decl.value) {
    visitExpression(decl.value, builder);
  }
}

/**
 * Visit a variable declaration
 */
function visitVarDeclaration(decl: any, builder: SemanticTokensBuilder): void {
  if (!decl.start) return;

  // Highlight variable name
  if (decl.name) {
    builder.push(
      decl.start.line - 1,
      decl.start.column - 1,
      decl.name.length,
      TokenType.VARIABLE,
      1 << TokenModifier.DECLARATION
    );
  }
}

/**
 * Visit a parameter
 */
function visitParameter(param: any, builder: SemanticTokensBuilder): void {
  if (!param.start) return;

  // Highlight parameter name
  if (param.name) {
    builder.push(
      param.start.line - 1,
      param.start.column - 1,
      param.name.length,
      TokenType.PARAMETER,
      1 << TokenModifier.DECLARATION
    );
  }
}

/**
 * Visit a procedure declaration
 */
function visitProcedureDeclaration(decl: any, builder: SemanticTokensBuilder): void {
  if (!decl.start) return;

  // Highlight procedure name
  if (decl.name) {
    builder.push(
      decl.start.line - 1,
      decl.start.column - 1,
      decl.name.length,
      TokenType.FUNCTION,
      1 << TokenModifier.DECLARATION
    );
  }

  // Visit parameters
  if (decl.parameters && Array.isArray(decl.parameters)) {
    for (const param of decl.parameters) {
      visitParameter(param, builder);
    }
  }

  // Visit body
  if (decl.body && Array.isArray(decl.body)) {
    for (const stmt of decl.body) {
      visitStatement(stmt, builder);
    }
  }
}

/**
 * Visit an object declaration
 */
function visitObjectDeclaration(decl: any, builder: SemanticTokensBuilder): void {
  if (!decl.start) return;

  // Highlight object name
  if (decl.name) {
    builder.push(
      decl.start.line - 1,
      decl.start.column - 1,
      decl.name.length,
      TokenType.CLASS,
      1 << TokenModifier.DECLARATION
    );
  }

  // Visit object type
  if (decl.objectType) {
    visitObjectType(decl.objectType, builder);
  }
}

/**
 * Visit a statement
 */
function visitStatement(stmt: Statement, builder: SemanticTokensBuilder): void {
  switch (stmt.type) {
    case 'AssignmentStatement':
      visitAssignmentStatement(stmt as any, builder);
      break;
    case 'IfStatement':
      visitIfStatement(stmt as any, builder);
      break;
    case 'WhileStatement':
      visitWhileStatement(stmt as any, builder);
      break;
    case 'ForStatement':
      visitForStatement(stmt as any, builder);
      break;
    case 'ReturnStatement':
      visitReturnStatement(stmt as any, builder);
      break;
    case 'AskStatement':
      visitAskStatement(stmt as any, builder);
      break;
    case 'TellStatement':
      visitTellStatement(stmt as any, builder);
      break;
  }
}

/**
 * Visit an assignment statement
 */
function visitAssignmentStatement(stmt: any, builder: SemanticTokensBuilder): void {
  if (stmt.target) {
    visitExpression(stmt.target, builder);
  }
  if (stmt.value) {
    visitExpression(stmt.value, builder);
  }
}

/**
 * Visit an if statement
 */
function visitIfStatement(stmt: any, builder: SemanticTokensBuilder): void {
  if (stmt.condition) {
    visitExpression(stmt.condition, builder);
  }
  if (stmt.thenBranch && Array.isArray(stmt.thenBranch)) {
    for (const s of stmt.thenBranch) {
      visitStatement(s, builder);
    }
  }
  if (stmt.elseBranch && Array.isArray(stmt.elseBranch)) {
    for (const s of stmt.elseBranch) {
      visitStatement(s, builder);
    }
  }
}

/**
 * Visit a while statement
 */
function visitWhileStatement(stmt: any, builder: SemanticTokensBuilder): void {
  if (stmt.condition) {
    visitExpression(stmt.condition, builder);
  }
  if (stmt.body && Array.isArray(stmt.body)) {
    for (const s of stmt.body) {
      visitStatement(s, builder);
    }
  }
}

/**
 * Visit a for statement
 */
function visitForStatement(stmt: any, builder: SemanticTokensBuilder): void {
  if (stmt.from) {
    visitExpression(stmt.from, builder);
  }
  if (stmt.to) {
    visitExpression(stmt.to, builder);
  }
  if (stmt.step) {
    visitExpression(stmt.step, builder);
  }
  if (stmt.body && Array.isArray(stmt.body)) {
    for (const s of stmt.body) {
      visitStatement(s, builder);
    }
  }
}

/**
 * Visit a return statement
 */
function visitReturnStatement(stmt: any, builder: SemanticTokensBuilder): void {
  if (stmt.value) {
    visitExpression(stmt.value, builder);
  }
}

/**
 * Visit an ASK statement
 */
function visitAskStatement(stmt: any, builder: SemanticTokensBuilder): void {
  if (stmt.object) {
    visitExpression(stmt.object, builder);
  }
  if (stmt.arguments && Array.isArray(stmt.arguments)) {
    for (const arg of stmt.arguments) {
      visitExpression(arg, builder);
    }
  }
}

/**
 * Visit a TELL statement
 */
function visitTellStatement(stmt: any, builder: SemanticTokensBuilder): void {
  if (stmt.object) {
    visitExpression(stmt.object, builder);
  }
  if (stmt.arguments && Array.isArray(stmt.arguments)) {
    for (const arg of stmt.arguments) {
      visitExpression(arg, builder);
    }
  }
}

/**
 * Visit an expression
 */
function visitExpression(expr: Expression, builder: SemanticTokensBuilder): void {
  if (!expr) return;

  switch (expr.type) {
    case 'IdentifierExpression':
      visitIdentifierExpression(expr as any, builder);
      break;
    case 'LiteralExpression':
      visitLiteralExpression(expr as any, builder);
      break;
    case 'BinaryExpression':
      visitBinaryExpression(expr as any, builder);
      break;
    case 'UnaryExpression':
      visitUnaryExpression(expr as any, builder);
      break;
    case 'CallExpression':
      visitCallExpression(expr as any, builder);
      break;
    case 'FieldAccessExpression':
      visitFieldAccessExpression(expr as any, builder);
      break;
    case 'ArrayAccessExpression':
      visitArrayAccessExpression(expr as any, builder);
      break;
  }
}

/**
 * Visit an identifier expression
 */
function visitIdentifierExpression(expr: any, builder: SemanticTokensBuilder): void {
  if (!expr.start) return;

  if (expr.name) {
    builder.push(
      expr.start.line - 1,
      expr.start.column - 1,
      expr.name.length,
      TokenType.VARIABLE,
      0
    );
  }
}

/**
 * Visit a literal expression
 */
function visitLiteralExpression(expr: any, builder: SemanticTokensBuilder): void {
  if (!expr.start || !expr.end) return;

  const length = expr.end.column - expr.start.column;

  if (expr.valueType === 'string') {
    builder.push(
      expr.start.line - 1,
      expr.start.column - 1,
      length,
      TokenType.STRING,
      0
    );
  } else if (expr.valueType === 'number' || expr.valueType === 'integer' || expr.valueType === 'real') {
    builder.push(
      expr.start.line - 1,
      expr.start.column - 1,
      length,
      TokenType.NUMBER,
      0
    );
  }
}

/**
 * Visit a binary expression
 */
function visitBinaryExpression(expr: any, builder: SemanticTokensBuilder): void {
  if (expr.left) {
    visitExpression(expr.left, builder);
  }
  if (expr.right) {
    visitExpression(expr.right, builder);
  }
}

/**
 * Visit a unary expression
 */
function visitUnaryExpression(expr: any, builder: SemanticTokensBuilder): void {
  if (expr.operand) {
    visitExpression(expr.operand, builder);
  }
}

/**
 * Visit a call expression
 */
function visitCallExpression(expr: any, builder: SemanticTokensBuilder): void {
  if (expr.callee) {
    visitExpression(expr.callee, builder);
  }
  if (expr.arguments && Array.isArray(expr.arguments)) {
    for (const arg of expr.arguments) {
      visitExpression(arg, builder);
    }
  }
}

/**
 * Visit a field access expression
 */
function visitFieldAccessExpression(expr: any, builder: SemanticTokensBuilder): void {
  if (expr.object) {
    visitExpression(expr.object, builder);
  }
  if (expr.field && expr.start) {
    // Field name would need position tracking in AST
    // For now, skip
  }
}

/**
 * Visit an array access expression
 */
function visitArrayAccessExpression(expr: any, builder: SemanticTokensBuilder): void {
  if (expr.array) {
    visitExpression(expr.array, builder);
  }
  if (expr.index) {
    visitExpression(expr.index, builder);
  }
}
