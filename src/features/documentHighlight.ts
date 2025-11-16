/**
 * Document Highlight Provider
 * Highlights all occurrences of a symbol in the current document
 */

import { DocumentHighlight, DocumentHighlightKind } from 'vscode-languageserver/node';
import type { Module } from '../language/ast';
import { SymbolTable } from '../language/symbols';
import { findReferences } from './references';
import { WorkspaceManager } from '../utils/workspace';

/**
 * Get document highlights for a symbol at a position
 * Returns all occurrences of the symbol in the current document
 */
export function getDocumentHighlights(
  ast: Module,
  symbolTable: SymbolTable,
  line: number,
  character: number,
  documentUri: string,
  workspaceManager?: WorkspaceManager
): DocumentHighlight[] {
  // Find all references including the declaration
  const references = findReferences(
    ast,
    symbolTable,
    line,
    character,
    documentUri,
    true, // includeDeclaration
    workspaceManager
  );

  // Filter to only references in the current document and convert to DocumentHighlight
  const highlights: DocumentHighlight[] = references
    .filter(ref => ref.uri === documentUri)
    .map(ref => ({
      range: ref.range,
      // For now, mark all as Text. Could enhance to distinguish Read vs Write
      kind: DocumentHighlightKind.Text,
    }));

  return highlights;
}

/**
 * Enhanced version that categorizes highlights as Read or Write
 * This would require analyzing the AST context of each reference
 */
export function getDocumentHighlightsEnhanced(
  ast: Module,
  symbolTable: SymbolTable,
  line: number,
  character: number,
  documentUri: string,
  workspaceManager?: WorkspaceManager
): DocumentHighlight[] {
  const highlights = getDocumentHighlights(
    ast,
    symbolTable,
    line,
    character,
    documentUri,
    workspaceManager
  );

  // TODO: Enhance to analyze AST context and determine Read vs Write
  // - AssignmentStatement target = Write
  // - Everything else = Read
  // For now, just return Text highlights

  return highlights;
}
