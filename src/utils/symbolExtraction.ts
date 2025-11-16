/**
 * Symbol Extraction Utilities
 * Shared utilities for extracting symbol information from AST nodes
 */

import { Range } from 'vscode-languageserver/node';

/**
 * Symbol information extracted from a node
 */
export interface SymbolInfo {
  name: string;
  range: Range;
}

/**
 * Check if a position is within a range
 */
export function isPositionInRange(position: { line: number; character: number }, range: Range): boolean {
  if (position.line < range.start.line || position.line > range.end.line) {
    return false;
  }
  if (position.line === range.start.line && position.character < range.start.character) {
    return false;
  }
  if (position.line === range.end.line && position.character > range.end.character) {
    return false;
  }
  return true;
}

/**
 * Extract symbol name and range from a node
 * Validates that the cursor position (line, character) falls within the symbol's range
 */
export function extractSymbolInfo(node: any, line: number, character: number): SymbolInfo | null {
  // Handle identifier expressions (usages)
  if (node.type === 'IdentifierExpression') {
    const range = {
      start: { line: node.start.line - 1, character: node.start.column - 1 },
      end: { line: node.end.line - 1, character: node.end.column - 1 }
    };

    // Verify cursor is within the identifier range
    if (!isPositionInRange({ line, character }, range)) {
      return null;
    }

    return { name: node.name, range };
  }

  // Handle type declarations
  if (node.type === 'TypeDeclaration') {
    // Calculate the range for the type name
    // The name appears after "TYPE " keyword
    const nameStart = node.start.column + 5; // "TYPE ".length
    const nameEnd = nameStart + node.name.length;

    const range = {
      start: { line: node.start.line - 1, character: nameStart - 1 },
      end: { line: node.start.line - 1, character: nameEnd - 1 }
    };

    // Verify cursor is within the type name range
    if (!isPositionInRange({ line, character }, range)) {
      return null;
    }

    return { name: node.name, range };
  }

  // Handle variable declarations
  if (node.type === 'VarDeclaration') {
    // VarDeclaration has names array
    // Find which name the cursor is on
    for (const name of node.names) {
      // Estimate position (this is approximate - ideally we'd have position info for each name)
      // For now, just use the first name
      const nameStart = node.start.column + 4; // "VAR ".length
      const nameEnd = nameStart + name.length;

      const range = {
        start: { line: node.start.line - 1, character: nameStart - 1 },
        end: { line: node.start.line - 1, character: nameEnd - 1 }
      };

      // Check if cursor is within THIS variable name
      if (isPositionInRange({ line, character }, range)) {
        return { name: name, range };
      }
    }
    // Cursor not within any variable name
    return null;
  }

  // Handle const declarations
  if (node.type === 'ConstDeclaration') {
    const nameStart = node.start.column + 6; // "CONST ".length
    const nameEnd = nameStart + node.name.length;

    const range = {
      start: { line: node.start.line - 1, character: nameStart - 1 },
      end: { line: node.start.line - 1, character: nameEnd - 1 }
    };

    // Verify cursor is within the const name range
    if (!isPositionInRange({ line, character }, range)) {
      return null;
    }

    return { name: node.name, range };
  }

  // Handle procedure declarations
  if (node.type === 'ProcedureDeclaration') {
    const nameStart = node.start.column + 10; // "PROCEDURE ".length
    const nameEnd = nameStart + node.name.length;

    const range = {
      start: { line: node.start.line - 1, character: nameStart - 1 },
      end: { line: node.start.line - 1, character: nameEnd - 1 }
    };

    // Verify cursor is within the procedure name range
    if (!isPositionInRange({ line, character }, range)) {
      return null;
    }

    return { name: node.name, range };
  }

  // Handle method declarations
  if (node.type === 'MethodDeclaration') {
    // For methods, use a simplified range calculation
    // The exact position calculation is complex due to indentation and OVERRIDE prefix
    // If findNodeAtPosition found this node, the user likely wants to rename the method
    const range = {
      start: { line: node.start.line - 1, character: node.start.column - 1 },
      end: { line: node.start.line - 1, character: node.start.column + node.name.length - 1 }
    };

    return { name: node.name, range };
  }

  // Handle simple type references (e.g., "Counter" in "VAR c: Counter;")
  if (node.type === 'SimpleType') {
    const range = {
      start: { line: node.start.line - 1, character: node.start.column - 1 },
      end: { line: node.end.line - 1, character: node.end.column - 1 }
    };

    // Verify cursor is within the type name range
    if (!isPositionInRange({ line, character }, range)) {
      return null;
    }

    return { name: node.name, range };
  }

  return null;
}
