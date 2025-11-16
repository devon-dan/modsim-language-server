/**
 * Rename Provider
 * Provides symbol renaming with validation and cross-file support
 */

import {
  WorkspaceEdit,
  TextEdit,
  Range,
  ResponseError,
  ErrorCodes,
} from 'vscode-languageserver/node';

import type { Module } from '../language/ast';
import { SymbolTable } from '../language/symbols';
import { findNodeAtPosition } from '../utils/astPosition';
import { findReferences } from './references';
import { WorkspaceManager } from '../utils/workspace';
import { extractSymbolInfo } from '../utils/symbolExtraction';

/**
 * Prepare rename - check if rename is valid at this position
 */
export function prepareRename(
  ast: Module,
  symbolTable: SymbolTable,
  line: number,
  character: number
): Range | { range: Range; placeholder: string } | null {
  const node = findNodeAtPosition(ast, { line, character });
  if (!node) {
    return null;
  }

  // Extract symbol name and range based on node type
  const symbolInfo = extractSymbolInfo(node, line, character);
  if (!symbolInfo) {
    return null;
  }

  const { name, range } = symbolInfo;

  // Look up the symbol to verify it exists
  // Note: Methods may not be in the symbol table, but we can verify from the AST node
  const allSymbols = symbolTable.getAllSymbols();
  const symbol = allSymbols.find(s => s.name === name);

  // For methods, skip symbol table check since they might not be tracked
  const isMethod = node.type === 'MethodDeclaration';

  if (!symbol && !isMethod) {
    return null;
  }

  // Don't allow renaming built-in types
  if (isBuiltInType(name)) {
    return null;
  }

  return {
    range,
    placeholder: name
  };
}

/**
 * Perform rename
 */
export function getRename(
  ast: Module,
  symbolTable: SymbolTable,
  line: number,
  character: number,
  newName: string,
  documentUri: string,
  workspaceManager: WorkspaceManager
): WorkspaceEdit | null {
  const node = findNodeAtPosition(ast, { line, character });
  if (!node) {
    throw new ResponseError(
      ErrorCodes.InvalidParams,
      'Cannot rename at this position'
    );
  }

  // Extract symbol name from node
  const symbolInfo = extractSymbolInfo(node, line, character);
  if (!symbolInfo) {
    throw new ResponseError(
      ErrorCodes.InvalidParams,
      'Cannot rename at this position'
    );
  }

  const oldName = symbolInfo.name;

  // Validate new name
  const validationError = validateNewName(newName, oldName, symbolTable);
  if (validationError) {
    throw new ResponseError(ErrorCodes.InvalidParams, validationError);
  }

  // Don't allow renaming built-in types
  if (isBuiltInType(oldName)) {
    throw new ResponseError(
      ErrorCodes.InvalidParams,
      `Cannot rename built-in type '${oldName}'`
    );
  }

  // Look up the symbol to verify it exists
  // Note: Methods may not be in the symbol table, but we can verify from the AST node
  const allSymbols = symbolTable.getAllSymbols();
  const symbol = allSymbols.find(s => s.name === oldName);

  // For methods, skip symbol table check since they might not be tracked
  const isMethod = node.type === 'MethodDeclaration';

  if (!symbol && !isMethod) {
    throw new ResponseError(
      ErrorCodes.InvalidParams,
      `Symbol '${oldName}' not found`
    );
  }

  // Find all references to this symbol
  const references = findReferences(
    ast,
    symbolTable,
    line,
    character,
    documentUri,
    true, // includeDeclaration
    workspaceManager
  );

  if (!references || references.length === 0) {
    return null;
  }

  // Group edits by document URI
  const changes: { [uri: string]: TextEdit[] } = {};

  for (const ref of references) {
    if (!changes[ref.uri]) {
      changes[ref.uri] = [];
    }

    changes[ref.uri].push({
      range: ref.range,
      newText: newName
    });
  }

  return { changes };
}

/**
 * Validate new name
 */
function validateNewName(
  newName: string,
  oldName: string,
  symbolTable: SymbolTable
): string | null {
  // Check if new name is the same as old name
  if (newName === oldName) {
    return 'New name is the same as the old name';
  }

  // Check if new name is empty
  if (!newName || newName.trim() === '') {
    return 'New name cannot be empty';
  }

  // Check if new name is a valid identifier
  if (!isValidIdentifier(newName)) {
    return `'${newName}' is not a valid identifier`;
  }

  // Check if new name is a keyword
  if (isKeyword(newName)) {
    return `'${newName}' is a keyword and cannot be used as an identifier`;
  }

  // Check if new name is a built-in type
  if (isBuiltInType(newName)) {
    return `'${newName}' is a built-in type and cannot be used as an identifier`;
  }

  // Check for naming conflicts in current scope
  // Note: This is a simplified check. A full implementation would check
  // if the new name conflicts with any symbol in the same scope.
  const allSymbols = symbolTable.getAllSymbols();
  const conflict = allSymbols.find(s => s.name === newName);

  if (conflict) {
    return `A symbol named '${newName}' already exists`;
  }

  return null;
}

/**
 * Check if identifier is valid
 */
function isValidIdentifier(name: string): boolean {
  // MODSIM III identifiers: start with letter or underscore, followed by letters, digits, or underscores
  const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return identifierRegex.test(name);
}

/**
 * Check if name is a keyword
 */
function isKeyword(name: string): boolean {
  const keywords = new Set([
    'MODULE', 'IMPLEMENTATION', 'DEFINITION', 'END',
    'PROCEDURE', 'FUNCTION', 'BEGIN', 'RETURN',
    'VAR', 'CONST', 'TYPE',
    'IF', 'THEN', 'ELSE', 'ELSIF',
    'WHILE', 'DO', 'FOR', 'TO', 'BY',
    'CASE', 'OF',
    'OBJECT', 'CLASS', 'RECORD', 'ARRAY',
    'ASK', 'TELL', 'METHOD', 'OVERRIDE', 'INHERITED',
    'IN', 'OUT', 'INOUT',
    'IMPORT', 'EXPORT', 'FROM',
    'POINTER', 'NIL',
    'AND', 'OR', 'NOT', 'DIV', 'MOD',
    'TRUE', 'FALSE',
    'WAIT', 'SCHEDULE', 'CANCEL', 'PRIORITY',
    'NEW', 'DISPOSE',
    'LOOP', 'EXIT', 'REPEAT', 'UNTIL',
    'WITH'
  ]);

  return keywords.has(name.toUpperCase());
}

/**
 * Check if name is a built-in type
 */
function isBuiltInType(name: string): boolean {
  const builtInTypes = new Set([
    'INTEGER', 'REAL', 'BOOLEAN', 'CHAR', 'STRING', 'NUMBER'
  ]);

  return builtInTypes.has(name.toUpperCase());
}
