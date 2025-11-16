/**
 * Code Action Provider
 * Provides quick fixes and refactorings
 */

import {
  CodeAction,
  CodeActionKind,
  Diagnostic,
  Range,
  TextEdit,
} from 'vscode-languageserver/node';

import type { Module } from '../language/ast';
import { SymbolTable } from '../language/symbols';
import { findNodeAtPosition } from '../utils/astPosition';

/**
 * Get code actions for a range
 */
export function getCodeActions(
  ast: Module,
  symbolTable: SymbolTable,
  range: Range,
  diagnostics: Diagnostic[],
  documentUri: string,
  documentText: string
): CodeAction[] {
  const actions: CodeAction[] = [];

  // Quick fixes based on diagnostics
  for (const diagnostic of diagnostics) {
    // Check if diagnostic overlaps with the requested range
    if (rangesOverlap(diagnostic.range, range)) {
      actions.push(...getQuickFixes(diagnostic, documentUri, documentText, ast, symbolTable));
    }
  }

  // Refactorings based on selection
  const line = range.start.line;
  const character = range.start.character;
  const node = findNodeAtPosition(ast, { line, character });

  if (node) {
    actions.push(...getRefactorings(node, range, documentUri, documentText, ast, symbolTable));
  }

  return actions;
}

/**
 * Check if two ranges overlap
 */
function rangesOverlap(r1: Range, r2: Range): boolean {
  if (r1.end.line < r2.start.line) return false;
  if (r1.start.line > r2.end.line) return false;
  if (r1.end.line === r2.start.line && r1.end.character < r2.start.character) return false;
  if (r1.start.line === r2.end.line && r1.start.character > r2.end.character) return false;
  return true;
}

/**
 * Get quick fixes for a diagnostic
 */
function getQuickFixes(
  diagnostic: Diagnostic,
  documentUri: string,
  documentText: string,
  _ast: Module,
  _symbolTable: SymbolTable
): CodeAction[] {
  const actions: CodeAction[] = [];

  const message = diagnostic.message;

  // Convert lowercase keyword to uppercase
  if (message.includes('Keyword') && message.includes('must be uppercase')) {
    const match = message.match(/Keyword '(\w+)' must be uppercase/);
    if (match) {
      const lowercaseKeyword = match[1];
      const uppercaseKeyword = lowercaseKeyword.toUpperCase();

      const action: CodeAction = {
        title: `Convert '${lowercaseKeyword}' to '${uppercaseKeyword}'`,
        kind: CodeActionKind.QuickFix,
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [documentUri]: [
              TextEdit.replace(diagnostic.range, uppercaseKeyword)
            ]
          }
        }
      };
      actions.push(action);
    }
  }

  // Add missing OVERRIDE
  if (message.includes('must be marked with OVERRIDE')) {
    const match = message.match(/Method '(\w+)'/);
    if (match) {
      const methodName = match[1];

      // Find the method declaration line
      const line = diagnostic.range.start.line;
      const lineText = getLineText(documentText, line);

      // Insert OVERRIDE before METHOD keyword
      const methodIndex = lineText.indexOf('METHOD');
      if (methodIndex !== -1) {
        const insertPosition = {
          line,
          character: methodIndex
        };

        const action: CodeAction = {
          title: `Add OVERRIDE to method '${methodName}'`,
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          edit: {
            changes: {
              [documentUri]: [
                TextEdit.insert(insertPosition, 'OVERRIDE ')
              ]
            }
          }
        };
        actions.push(action);
      }
    }
  }

  // Remove unused variable
  if (message.includes('is declared but never used')) {
    const match = message.match(/(Variable|Parameter) '(\w+)'/);
    if (match) {
      const symbolType = match[1];
      const symbolName = match[2];

      // For variables, remove the entire VAR declaration line
      if (symbolType === 'Variable') {
        const action: CodeAction = {
          title: `Remove unused variable '${symbolName}'`,
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          edit: {
            changes: {
              [documentUri]: [
                // Delete the entire line including newline
                TextEdit.del({
                  start: { line: diagnostic.range.start.line, character: 0 },
                  end: { line: diagnostic.range.start.line + 1, character: 0 }
                })
              ]
            }
          }
        };
        actions.push(action);
      }
    }
  }

  // Add missing END
  if (message.includes('Expected END') || message.includes('Unexpected end of file')) {
    // Try to determine what kind of END is needed
    let endKeyword = 'END';

    if (message.includes('MODULE')) {
      endKeyword = 'END MODULE';
    } else if (message.includes('PROCEDURE')) {
      endKeyword = 'END PROCEDURE';
    } else if (message.includes('OBJECT')) {
      endKeyword = 'END OBJECT';
    } else if (message.includes('METHOD')) {
      endKeyword = 'END METHOD';
    }

    const action: CodeAction = {
      title: `Add missing ${endKeyword}`,
      kind: CodeActionKind.QuickFix,
      diagnostics: [diagnostic],
      edit: {
        changes: {
          [documentUri]: [
            TextEdit.insert(diagnostic.range.end, `\n${endKeyword};\n`)
          ]
        }
      }
    };
    actions.push(action);
  }

  return actions;
}

/**
 * Get refactorings for a node
 */
function getRefactorings(
  node: any,
  range: Range,
  documentUri: string,
  documentText: string,
  ast: Module,
  symbolTable: SymbolTable
): CodeAction[] {
  const actions: CodeAction[] = [];

  // Extract variable - only for expressions
  if (isExpression(node) && !isSimpleIdentifier(node)) {
    const action = createExtractVariableAction(node, range, documentUri, documentText);
    if (action) {
      actions.push(action);
    }
  }

  // Inline variable - only for identifier references
  if (node.type === 'IdentifierExpression') {
    const action = createInlineVariableAction(node, documentUri, documentText, ast, symbolTable);
    if (action) {
      actions.push(action);
    }
  }

  // Extract method - for statement sequences
  if (isStatement(node)) {
    const action = createExtractMethodAction(node, range, documentUri, documentText);
    if (action) {
      actions.push(action);
    }
  }

  return actions;
}

/**
 * Check if node is an expression
 */
function isExpression(node: any): boolean {
  const expressionTypes = [
    'BinaryExpression',
    'UnaryExpression',
    'CallExpression',
    'IdentifierExpression',
    'LiteralExpression',
    'MemberExpression',
  ];
  return expressionTypes.includes(node.type);
}

/**
 * Check if node is a simple identifier
 */
function isSimpleIdentifier(node: any): boolean {
  return node.type === 'IdentifierExpression';
}

/**
 * Check if node is a statement
 */
function isStatement(node: any): boolean {
  const statementTypes = [
    'AssignmentStatement',
    'CallStatement',
    'IfStatement',
    'WhileStatement',
    'ForStatement',
    'ReturnStatement',
    'AskStatement',
    'TellStatement',
  ];
  return statementTypes.includes(node.type);
}

/**
 * Create extract variable refactoring
 */
function createExtractVariableAction(
  node: any,
  range: Range,
  documentUri: string,
  documentText: string
): CodeAction | null {
  if (!node.start || !node.end) return null;

  // Get the expression text
  const exprText = getTextInRange(
    documentText,
    {
      start: { line: node.start.line - 1, character: node.start.column - 1 },
      end: { line: node.end.line - 1, character: node.end.column - 1 }
    }
  );

  // Generate a variable name
  const varName = 'extractedVar';

  // Find the containing procedure to insert the VAR declaration
  const line = range.start.line;
  const lineText = getLineText(documentText, line);
  const indent = getIndentation(lineText);

  // Replace expression with variable name
  const replaceEdit = TextEdit.replace(
    {
      start: { line: node.start.line - 1, character: node.start.column - 1 },
      end: { line: node.end.line - 1, character: node.end.column - 1 }
    },
    varName
  );

  // Insert variable declaration and assignment before the current line
  const insertEdit = TextEdit.insert(
    { line: range.start.line, character: 0 },
    `${indent}VAR ${varName}: INTEGER; (* TODO: Fix type *)\n${indent}${varName} := ${exprText};\n`
  );

  return {
    title: `Extract to variable '${varName}'`,
    kind: CodeActionKind.RefactorExtract,
    edit: {
      changes: {
        [documentUri]: [insertEdit, replaceEdit]
      }
    }
  };
}

/**
 * Create inline variable refactoring
 */
function createInlineVariableAction(
  node: any,
  documentUri: string,
  _documentText: string,
  _ast: Module,
  symbolTable: SymbolTable
): CodeAction | null {
  const varName = node.name;

  // Look up the variable in the symbol table
  const allSymbols = symbolTable.getAllSymbols();
  const symbol = allSymbols.find(s => s.name === varName && s.kind === 'VAR');

  if (!symbol) return null;

  // For now, just provide a placeholder action
  // Full implementation would need to find the assignment and replace all references
  return {
    title: `Inline variable '${varName}'`,
    kind: CodeActionKind.RefactorInline,
    edit: {
      changes: {
        [documentUri]: []
      }
    }
  };
}

/**
 * Create extract method refactoring
 */
function createExtractMethodAction(
  node: any,
  range: Range,
  documentUri: string,
  documentText: string
): CodeAction | null {
  // Get the statement text
  if (!node.start || !node.end) return null;

  const stmtText = getTextInRange(
    documentText,
    {
      start: { line: node.start.line - 1, character: node.start.column - 1 },
      end: { line: node.end.line - 1, character: node.end.column - 1 }
    }
  );

  const methodName = 'ExtractedMethod';

  // Replace statement with method call
  const replaceEdit = TextEdit.replace(
    {
      start: { line: node.start.line - 1, character: 0 },
      end: { line: node.end.line - 1, character: node.end.column - 1 }
    },
    `${methodName}()`
  );

  // Insert method declaration at the end of module (placeholder)
  const insertPosition = { line: range.end.line + 5, character: 0 };
  const insertEdit = TextEdit.insert(
    insertPosition,
    `\nPROCEDURE ${methodName}();\nBEGIN\n  ${stmtText}\nEND PROCEDURE;\n`
  );

  return {
    title: `Extract to method '${methodName}'`,
    kind: CodeActionKind.RefactorExtract,
    edit: {
      changes: {
        [documentUri]: [replaceEdit, insertEdit]
      }
    }
  };
}

/**
 * Get text in a range
 */
function getTextInRange(text: string, range: Range): string {
  const lines = text.split('\n');

  if (range.start.line === range.end.line) {
    return lines[range.start.line].substring(range.start.character, range.end.character);
  }

  let result = lines[range.start.line].substring(range.start.character) + '\n';
  for (let i = range.start.line + 1; i < range.end.line; i++) {
    result += lines[i] + '\n';
  }
  result += lines[range.end.line].substring(0, range.end.character);

  return result;
}

/**
 * Get text of a specific line
 */
function getLineText(text: string, line: number): string {
  const lines = text.split('\n');
  return lines[line] || '';
}

/**
 * Get indentation of a line
 */
function getIndentation(lineText: string): string {
  const match = lineText.match(/^(\s*)/);
  return match ? match[1] : '';
}
