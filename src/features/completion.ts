/**
 * Auto-completion provider
 * Provides context-aware code completion for MODSIM III
 */

import { CompletionItem, CompletionItemKind, InsertTextFormat } from 'vscode-languageserver/node';
import type { Module } from '../language/ast';
import { SymbolTable, SymbolKind } from '../language/symbols';

/**
 * Get completion items at a position
 */
export function getCompletions(
  _ast: Module,
  symbolTable: SymbolTable,
  _line: number,
  _character: number
): CompletionItem[] {
  const completions: CompletionItem[] = [];

  // Add keywords
  completions.push(...getKeywordCompletions());

  // Add symbols from symbol table
  completions.push(...getSymbolCompletions(symbolTable));

  // Add snippets
  completions.push(...getSnippetCompletions());

  return completions;
}

/**
 * Get keyword completions
 */
function getKeywordCompletions(): CompletionItem[] {
  const keywords = [
    'AND', 'ARRAY', 'ASK', 'BEGIN', 'BOOLEAN', 'BY', 'CASE', 'CLONE',
    'CONST', 'DEFINITION', 'DISPOSE', 'DIV', 'DO', 'DOWNTO', 'DURATION',
    'ELSE', 'ELSIF', 'END', 'EXIT', 'FALSE', 'FIRST', 'FOR', 'FOREACH',
    'FROM', 'IF', 'IMPLEMENTATION', 'IMPORT', 'IN', 'INHERITED', 'INOUT',
    'INPUT', 'INTEGER', 'INTERRUPT', 'LAST', 'LOOP', 'METHOD', 'MOD',
    'MODULE', 'NEW', 'NILARRAY', 'NILOBJ', 'NILREC', 'NOT', 'NUMBER',
    'OBJECT', 'OF', 'OR', 'OTHERWISE', 'OUT', 'OUTPUT', 'OVERRIDE',
    'POINTER', 'PROCEDURE', 'REAL', 'RECORD', 'REF', 'REPEAT', 'RETURN',
    'SELF', 'STRING', 'TELL', 'TERMINATE', 'THEN', 'TO', 'TRUE', 'TYPE',
    'UNTIL', 'VAR', 'WAIT', 'WHILE', 'WITH', 'XOR'
  ];

  return keywords.map((keyword) => ({
    label: keyword,
    kind: CompletionItemKind.Keyword,
    detail: 'Keyword',
  }));
}

/**
 * Get symbol completions from symbol table
 */
function getSymbolCompletions(symbolTable: SymbolTable): CompletionItem[] {
  const completions: CompletionItem[] = [];
  const seen = new Set<string>();

  // Get symbols from current scope and all parent scopes
  let scope: typeof symbolTable.currentScope | undefined = symbolTable.currentScope;
  while (scope) {
    for (const [name, symbol] of scope.symbols.entries()) {
      if (seen.has(name)) continue;
      seen.add(name);

      let kind: CompletionItemKind;
      let detail: string;

      switch (symbol.kind) {
        case SymbolKind.TYPE:
          kind = CompletionItemKind.Class;
          detail = 'Type';
          break;
        case SymbolKind.VAR:
          kind = CompletionItemKind.Variable;
          detail = 'Variable';
          break;
        case SymbolKind.CONST:
          kind = CompletionItemKind.Constant;
          detail = 'Constant';
          break;
        case SymbolKind.PROCEDURE:
          kind = CompletionItemKind.Function;
          detail = 'Procedure';
          break;
        case SymbolKind.METHOD:
          kind = CompletionItemKind.Method;
          detail = 'Method';
          break;
        case SymbolKind.PARAMETER:
          kind = CompletionItemKind.Variable;
          detail = 'Parameter';
          break;
        case SymbolKind.FIELD:
          kind = CompletionItemKind.Field;
          detail = 'Field';
          break;
        default:
          kind = CompletionItemKind.Text;
          detail = 'Symbol';
      }

      completions.push({
        label: name,
        kind,
        detail,
      });
    }

    scope = scope.parent;
  }

  return completions;
}

/**
 * Get snippet completions
 */
function getSnippetCompletions(): CompletionItem[] {
  return [
    {
      label: 'IF...END IF',
      kind: CompletionItemKind.Snippet,
      detail: 'IF statement',
      insertText: 'IF ${1:condition} THEN\n\t$0\nEND IF;',
      insertTextFormat: InsertTextFormat.Snippet,
    },
    {
      label: 'WHILE...END WHILE',
      kind: CompletionItemKind.Snippet,
      detail: 'WHILE loop',
      insertText: 'WHILE ${1:condition} DO\n\t$0\nEND WHILE;',
      insertTextFormat: InsertTextFormat.Snippet,
    },
    {
      label: 'FOR...END FOR',
      kind: CompletionItemKind.Snippet,
      detail: 'FOR loop',
      insertText: 'FOR ${1:variable} := ${2:start} TO ${3:end} DO\n\t$0\nEND FOR;',
      insertTextFormat: InsertTextFormat.Snippet,
    },
    {
      label: 'FOREACH...END FOREACH',
      kind: CompletionItemKind.Snippet,
      detail: 'FOREACH loop',
      insertText: 'FOREACH ${1:variable} IN ${2:collection} DO\n\t$0\nEND FOREACH;',
      insertTextFormat: InsertTextFormat.Snippet,
    },
    {
      label: 'CASE...END CASE',
      kind: CompletionItemKind.Snippet,
      detail: 'CASE statement',
      insertText: 'CASE ${1:expression} OF\n\t${2:value}: $0\nOTHERWISE\n\t\nEND CASE;',
      insertTextFormat: InsertTextFormat.Snippet,
    },
    {
      label: 'LOOP...END LOOP',
      kind: CompletionItemKind.Snippet,
      detail: 'LOOP statement',
      insertText: 'LOOP\n\t$0\n\tEXIT;\nEND LOOP;',
      insertTextFormat: InsertTextFormat.Snippet,
    },
    {
      label: 'PROCEDURE',
      kind: CompletionItemKind.Snippet,
      detail: 'Procedure declaration',
      insertText: 'PROCEDURE ${1:name}(${2:parameters});\nBEGIN\n\t$0\nEND PROCEDURE;',
      insertTextFormat: InsertTextFormat.Snippet,
    },
    {
      label: 'ASK METHOD',
      kind: CompletionItemKind.Snippet,
      detail: 'ASK method declaration',
      insertText: 'ASK METHOD ${1:name}(${2:parameters}): ${3:ReturnType};\nBEGIN\n\t$0\n\tRETURN ${4:value};\nEND METHOD;',
      insertTextFormat: InsertTextFormat.Snippet,
    },
    {
      label: 'TELL METHOD',
      kind: CompletionItemKind.Snippet,
      detail: 'TELL method declaration',
      insertText: 'TELL METHOD ${1:name}(${2:parameters});\nBEGIN\n\t$0\nEND METHOD;',
      insertTextFormat: InsertTextFormat.Snippet,
    },
    {
      label: 'OBJECT',
      kind: CompletionItemKind.Snippet,
      detail: 'Object declaration',
      insertText: 'OBJECT ${1:name};\n\t$0\nEND OBJECT;',
      insertTextFormat: InsertTextFormat.Snippet,
    },
    {
      label: 'ASK...TO',
      kind: CompletionItemKind.Snippet,
      detail: 'ASK statement',
      insertText: 'ASK ${1:object} TO ${2:method}(${3:arguments});',
      insertTextFormat: InsertTextFormat.Snippet,
    },
    {
      label: 'TELL...TO',
      kind: CompletionItemKind.Snippet,
      detail: 'TELL statement',
      insertText: 'TELL ${1:object} TO ${2:method}(${3:arguments});',
      insertTextFormat: InsertTextFormat.Snippet,
    },
  ];
}

/**
 * Resolve completion item (add additional details)
 */
export function resolveCompletionItem(item: CompletionItem): CompletionItem {
  // Add documentation if needed
  // For now, just return the item as-is
  return item;
}
