/**
 * Folding Ranges Provider
 * Provides code folding ranges for collapsible regions
 */

import { FoldingRange, FoldingRangeKind } from 'vscode-languageserver/node';
import type { Module, ASTNode } from '../language/ast';

/**
 * Get folding ranges for a document
 */
export function getFoldingRanges(ast: Module): FoldingRange[] {
  const ranges: FoldingRange[] = [];
  collectFoldingRanges(ast, ranges);
  return ranges;
}

/**
 * Recursively collect folding ranges from AST
 */
function collectFoldingRanges(node: ASTNode, ranges: FoldingRange[]): void {
  if (!node.start || !node.end) {
    return;
  }

  // Handle different node types
  switch (node.type) {
    case 'Module':
      // Fold entire module body (from first declaration to END MODULE)
      if ('declarations' in node && Array.isArray(node.declarations) && node.declarations.length > 0) {
        ranges.push({
          startLine: node.start.line - 1,
          endLine: node.end.line - 1,
          kind: FoldingRangeKind.Region,
        });
      }
      break;

    case 'ObjectDeclaration':
      // Fold object body (from OBJECT line to END OBJECT)
      ranges.push({
        startLine: node.start.line - 1,
        endLine: node.end.line - 1,
        kind: FoldingRangeKind.Region,
      });
      break;

    case 'ProcedureDeclaration':
    case 'MethodDeclaration':
      // Fold procedure/method body (from declaration line to END PROCEDURE/METHOD)
      ranges.push({
        startLine: node.start.line - 1,
        endLine: node.end.line - 1,
        kind: FoldingRangeKind.Region,
      });
      break;

    case 'IfStatement':
      // Fold if statement (from IF to END IF)
      ranges.push({
        startLine: node.start.line - 1,
        endLine: node.end.line - 1,
        kind: FoldingRangeKind.Region,
      });

      // Also fold elsif branches if they exist
      if ('elsifBranches' in node && Array.isArray(node.elsifBranches)) {
        for (const branch of node.elsifBranches as any[]) {
          if (branch.start && branch.end) {
            ranges.push({
              startLine: branch.start.line - 1,
              endLine: branch.end.line - 1,
              kind: FoldingRangeKind.Region,
            });
          }
        }
      }

      // Fold else branch if it exists
      if ('elseBranch' in node && Array.isArray(node.elseBranch) && node.elseBranch.length > 0) {
        const firstStmt = node.elseBranch[0] as ASTNode;
        const lastStmt = node.elseBranch[node.elseBranch.length - 1] as ASTNode;
        if (firstStmt.start && lastStmt.end) {
          ranges.push({
            startLine: firstStmt.start.line - 2, // Include ELSE keyword line
            endLine: lastStmt.end.line - 1,
            kind: FoldingRangeKind.Region,
          });
        }
      }
      break;

    case 'WhileStatement':
    case 'RepeatStatement':
      // Fold while/repeat body
      ranges.push({
        startLine: node.start.line - 1,
        endLine: node.end.line - 1,
        kind: FoldingRangeKind.Region,
      });
      break;

    case 'ForStatement':
    case 'ForEachStatement':
      // Fold for/foreach body
      ranges.push({
        startLine: node.start.line - 1,
        endLine: node.end.line - 1,
        kind: FoldingRangeKind.Region,
      });
      break;

    case 'CaseStatement':
      // Fold case statement
      ranges.push({
        startLine: node.start.line - 1,
        endLine: node.end.line - 1,
        kind: FoldingRangeKind.Region,
      });

      // Also fold individual case branches
      if ('cases' in node && Array.isArray(node.cases)) {
        for (const caseItem of node.cases as any[]) {
          if (caseItem.body && Array.isArray(caseItem.body) && caseItem.body.length > 0) {
            const firstStmt = caseItem.body[0];
            const lastStmt = caseItem.body[caseItem.body.length - 1];
            if (firstStmt.start && lastStmt.end) {
              ranges.push({
                startLine: firstStmt.start.line - 1,
                endLine: lastStmt.end.line - 1,
                kind: FoldingRangeKind.Region,
              });
            }
          }
        }
      }

      // Fold otherwise branch if it exists
      if ('otherwise' in node && Array.isArray(node.otherwise) && node.otherwise.length > 0) {
        const firstStmt = node.otherwise[0] as ASTNode;
        const lastStmt = node.otherwise[node.otherwise.length - 1] as ASTNode;
        if (firstStmt.start && lastStmt.end) {
          ranges.push({
            startLine: firstStmt.start.line - 2, // Include OTHERWISE keyword line
            endLine: lastStmt.end.line - 1,
            kind: FoldingRangeKind.Region,
          });
        }
      }
      break;
  }

  // Recursively process children
  const children = getNodeChildren(node);
  for (const child of children) {
    collectFoldingRanges(child, ranges);
  }
}

/**
 * Get all children of an AST node
 */
function getNodeChildren(node: ASTNode): ASTNode[] {
  const children: ASTNode[] = [];

  switch (node.type) {
    case 'Module':
      if ('imports' in node && Array.isArray(node.imports)) {
        children.push(...node.imports);
      }
      if ('declarations' in node && Array.isArray(node.declarations)) {
        children.push(...node.declarations);
      }
      break;

    case 'ObjectDeclaration':
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
    case 'RepeatStatement':
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

    case 'ForEachStatement':
      if ('collection' in node && node.collection) {
        children.push(node.collection as ASTNode);
      }
      if ('body' in node && Array.isArray(node.body)) {
        children.push(...node.body);
      }
      break;

    case 'CaseStatement':
      if ('expression' in node && node.expression) {
        children.push(node.expression as ASTNode);
      }
      if ('cases' in node && Array.isArray(node.cases)) {
        for (const caseItem of node.cases as any[]) {
          if (Array.isArray(caseItem.body)) {
            children.push(...caseItem.body);
          }
        }
      }
      if ('otherwise' in node && Array.isArray(node.otherwise)) {
        children.push(...node.otherwise);
      }
      break;

    default:
      // For other node types, try to find array properties
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
