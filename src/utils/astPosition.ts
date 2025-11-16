/**
 * AST Position Tracking
 * Utilities for mapping document positions to AST nodes
 */

import type { ASTNode } from '../language/ast';

export interface Position {
  line: number;
  character: number;
}

/**
 * Check if a position is within a range
 */
export function isPositionInRange(
  position: Position,
  start: { line: number; column: number },
  end: { line: number; column: number }
): boolean {
  // Convert to 0-based coordinates (LSP uses 0-based, AST uses 1-based)
  const startLine = start.line - 1;
  const startChar = start.column - 1;
  const endLine = end.line - 1;
  const endChar = end.column - 1;

  // Check if position is before start
  if (position.line < startLine) return false;
  if (position.line === startLine && position.character < startChar) return false;

  // Check if position is after end
  if (position.line > endLine) return false;
  if (position.line === endLine && position.character > endChar) return false;

  return true;
}

/**
 * Find the AST node at a given position
 */
export function findNodeAtPosition(ast: ASTNode, position: Position): ASTNode | null {
  if (!ast.start || !ast.end) return null;

  // Check if position is in this node
  if (!isPositionInRange(position, ast.start, ast.end)) {
    return null;
  }

  // Check children recursively
  let bestMatch: ASTNode | null = ast;
  let bestMatchSize = getNodeSize(ast);

  const children = getNodeChildren(ast);
  for (const child of children) {
    const childMatch = findNodeAtPosition(child, position);
    if (childMatch) {
      const childSize = getNodeSize(childMatch);
      // Prefer smaller (more specific) nodes
      if (childSize < bestMatchSize) {
        bestMatch = childMatch;
        bestMatchSize = childSize;
      }
    }
  }

  return bestMatch;
}

/**
 * Get the size of a node (for finding most specific node)
 */
function getNodeSize(node: ASTNode): number {
  if (!node.start || !node.end) return Infinity;

  const lines = node.end.line - node.start.line;
  const chars = node.end.column - node.start.column;

  return lines * 1000 + chars;
}

/**
 * Get all children of an AST node
 */
function getNodeChildren(node: ASTNode): ASTNode[] {
  const children: ASTNode[] = [];

  // Handle different node types
  switch (node.type) {
    case 'Module':
      if ('imports' in node && Array.isArray(node.imports)) {
        children.push(...node.imports);
      }
      if ('declarations' in node && Array.isArray(node.declarations)) {
        children.push(...node.declarations);
      }
      break;

    case 'TypeDeclaration':
      if ('typeSpec' in node && node.typeSpec) {
        children.push(node.typeSpec as ASTNode);
      }
      break;

    case 'ObjectType':
      if ('fields' in node && Array.isArray(node.fields)) {
        children.push(...node.fields);
      }
      if ('methods' in node && Array.isArray(node.methods)) {
        children.push(...node.methods);
      }
      break;

    case 'ObjectDeclaration':
      if ('objectType' in node && node.objectType) {
        children.push(node.objectType as ASTNode);
      }
      if ('fields' in node && Array.isArray(node.fields)) {
        children.push(...node.fields);
      }
      if ('methods' in node && Array.isArray(node.methods)) {
        children.push(...node.methods);
      }
      break;

    case 'ProcedureDeclaration':
    case 'MethodDeclaration':
      if ('parameters' in node && Array.isArray(node.parameters)) {
        children.push(...node.parameters);
      }
      if ('localDeclarations' in node && Array.isArray(node.localDeclarations)) {
        children.push(...(node.localDeclarations as ASTNode[]));
      }
      if ('body' in node && Array.isArray(node.body)) {
        children.push(...node.body);
      }
      break;

    case 'IfStatement':
      if ('condition' in node && node.condition) {
        children.push(node.condition as ASTNode);
      }
      if ('thenBranch' in node && Array.isArray(node.thenBranch)) {
        children.push(...node.thenBranch);
      }
      if ('elsifBranches' in node && Array.isArray(node.elsifBranches)) {
        for (const branch of node.elsifBranches as any[]) {
          if (branch.condition) children.push(branch.condition);
          if (Array.isArray(branch.body)) children.push(...branch.body);
        }
      }
      if ('elseBranch' in node && Array.isArray(node.elseBranch)) {
        children.push(...node.elseBranch);
      }
      break;

    case 'WhileStatement':
      if ('condition' in node && node.condition) {
        children.push(node.condition as ASTNode);
      }
      if ('body' in node && Array.isArray(node.body)) {
        children.push(...node.body);
      }
      break;

    case 'ForStatement':
      if ('from' in node && node.from) {
        children.push(node.from as ASTNode);
      }
      if ('to' in node && node.to) {
        children.push(node.to as ASTNode);
      }
      if ('step' in node && node.step) {
        children.push(node.step as ASTNode);
      }
      if ('body' in node && Array.isArray(node.body)) {
        children.push(...node.body);
      }
      break;

    case 'AssignmentStatement':
      if ('target' in node && node.target) {
        children.push(node.target as ASTNode);
      }
      if ('value' in node && node.value) {
        children.push(node.value as ASTNode);
      }
      break;

    case 'CallExpression':
      if ('callee' in node && node.callee) {
        children.push(node.callee as ASTNode);
      }
      if ('arguments' in node && Array.isArray(node.arguments)) {
        children.push(...node.arguments);
      }
      break;

    case 'BinaryExpression':
      if ('left' in node && node.left) {
        children.push(node.left as ASTNode);
      }
      if ('right' in node && node.right) {
        children.push(node.right as ASTNode);
      }
      break;

    case 'UnaryExpression':
      if ('operand' in node && node.operand) {
        children.push(node.operand as ASTNode);
      }
      break;

    case 'FieldAccessExpression':
      if ('object' in node && node.object) {
        children.push(node.object as ASTNode);
      }
      break;

    case 'ArrayAccessExpression':
      if ('array' in node && node.array) {
        children.push(node.array as ASTNode);
      }
      if ('index' in node && node.index) {
        children.push(node.index as ASTNode);
      }
      break;

    default:
      // For unknown node types, try to find array properties
      for (const key in node) {
        const value = (node as any)[key];
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && 'type' in item) {
              children.push(item);
            }
          }
        } else if (value && typeof value === 'object' && 'type' in value) {
          children.push(value);
        }
      }
  }

  return children;
}

/**
 * Find identifier node at position
 */
export function findIdentifierAtPosition(ast: ASTNode, position: Position): ASTNode | null {
  const node = findNodeAtPosition(ast, position);

  if (!node) return null;

  // If we found an identifier, return it
  if (node.type === 'IdentifierExpression') {
    return node;
  }

  // If we found a field access, return the field name
  if (node.type === 'FieldAccessExpression' && 'field' in node) {
    return node;
  }

  return null;
}

/**
 * Get the range of a node in LSP format (0-based)
 */
export function getNodeRange(node: ASTNode): {
  start: Position;
  end: Position;
} | null {
  if (!node.start || !node.end) return null;

  return {
    start: {
      line: node.start.line - 1,
      character: node.start.column - 1,
    },
    end: {
      line: node.end.line - 1,
      character: node.end.column - 1,
    },
  };
}
