/**
 * Go-to-definition provider - navigate to symbol definitions
 */

import { Location } from 'vscode-languageserver/node';

import type { Module, ASTNode } from '../language/ast';
import { SymbolTable } from '../language/symbols';
import { findIdentifierAtPosition as findIdNode } from '../utils/astPosition';

/**
 * Get definition location for a symbol at a position
 */
export function getDefinition(
  ast: Module,
  symbolTable: SymbolTable,
  line: number,
  character: number,
  documentUri: string
): Location | Location[] | null {
  // Find the identifier at the position
  const identifierNode = findIdNode(ast, { line, character });
  if (!identifierNode) {
    return null;
  }

  // Extract identifier name
  const identifier = getIdentifierName(identifierNode);
  if (!identifier) {
    return null;
  }

  // Look up the symbol
  const symbol = symbolTable.lookup(identifier);
  if (!symbol || !symbol.declaration) {
    return null;
  }

  // Return location of the symbol's declaration
  return {
    uri: documentUri, // TODO: Handle cross-file definitions with workspace manager
    range: {
      start: {
        line: symbol.declaration.line - 1, // Convert to 0-based
        character: symbol.declaration.column - 1,
      },
      end: {
        line: symbol.declaration.line - 1,
        character: symbol.declaration.column - 1 + identifier.length,
      },
    },
  };
}

/**
 * Extract identifier name from AST node
 */
function getIdentifierName(node: ASTNode): string | null {
  if (node.type === 'IdentifierExpression' && 'name' in node) {
    return node.name as string;
  }

  if (node.type === 'FieldAccessExpression' && 'field' in node) {
    return node.field as string;
  }

  return null;
}
