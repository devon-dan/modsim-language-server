/**
 * Find References Provider
 * Finds all references to a symbol across the workspace
 */

import { Location } from 'vscode-languageserver/node';
import type { Module, ASTNode } from '../language/ast';
import { SymbolTable } from '../language/symbols';
import { findNodeAtPosition } from '../utils/astPosition';
import { extractSymbolInfo } from '../utils/symbolExtraction';
import type { WorkspaceManager } from '../utils/workspace';

/**
 * Find all references to a symbol at a position
 */
export function findReferences(
  ast: Module,
  symbolTable: SymbolTable,
  line: number,
  character: number,
  documentUri: string,
  includeDeclaration: boolean,
  workspaceManager?: WorkspaceManager
): Location[] {
  const locations: Location[] = [];

  // Find the node at the position (could be identifier or declaration)
  const node = findNodeAtPosition(ast, { line, character });
  if (!node) {
    return locations;
  }

  // Extract symbol info from the node
  const symbolInfo = extractSymbolInfo(node, line, character);
  if (!symbolInfo) {
    return locations;
  }

  const identifier = symbolInfo.name;

  // Look up the symbol to verify it exists
  // Use getAllSymbols() since lookup() only checks current scope
  // Note: Methods may not be in the symbol table, but we can verify from the AST node
  const allSymbols = symbolTable.getAllSymbols();
  const symbol = allSymbols.find(s => s.name === identifier);

  // For methods, skip symbol table check since they might not be tracked
  const isMethod = node.type === 'MethodDeclaration';

  if (!symbol && !isMethod) {
    return locations;
  }

  // Add declaration location if requested
  if (includeDeclaration && symbol && symbol.declaration) {
    locations.push({
      uri: documentUri,
      range: {
        start: {
          line: symbol.declaration.line - 1,
          character: symbol.declaration.column - 1,
        },
        end: {
          line: symbol.declaration.line - 1,
          character: symbol.declaration.column - 1 + identifier.length,
        },
      },
    });
  }

  // For methods, add the declaration from the node itself if requested
  if (includeDeclaration && isMethod && node.start) {
    locations.push({
      uri: documentUri,
      range: symbolInfo.range,
    });
  }

  // Find all references in the current document
  findReferencesInAST(ast, identifier, documentUri, locations);

  // If workspace manager is provided, search all workspace documents
  if (workspaceManager) {
    const allDocuments = workspaceManager.getAllDocuments();
    for (const docState of allDocuments) {
      // Skip the current document (already searched)
      if (docState.uri === documentUri) {
        continue;
      }

      // Search this document if it has an AST
      if (docState.ast) {
        findReferencesInAST(docState.ast, identifier, docState.uri, locations);
      }
    }
  }

  return locations;
}

/**
 * Find all references to a symbol in an AST
 */
function findReferencesInAST(
  node: ASTNode,
  identifier: string,
  documentUri: string,
  locations: Location[]
): void {
  // Check if this node is an identifier reference
  if (node.type === 'IdentifierExpression') {
    const nodeName = getIdentifierName(node);
    if (nodeName === identifier && node.start && node.end) {
      locations.push({
        uri: documentUri,
        range: {
          start: {
            line: node.start.line - 1,
            character: node.start.column - 1,
          },
          end: {
            line: node.end.line - 1,
            character: node.end.column - 1,
          },
        },
      });
    }
  }

  // Check field access expressions
  if (node.type === 'FieldAccessExpression' && 'field' in node) {
    const fieldName = node.field as string;
    if (fieldName === identifier && node.start && node.end) {
      locations.push({
        uri: documentUri,
        range: {
          start: {
            line: node.start.line - 1,
            character: node.start.column - 1,
          },
          end: {
            line: node.end.line - 1,
            character: node.end.column - 1,
          },
        },
      });
    }
  }

  // Check simple type references (e.g., "Counter" in "VAR c: Counter;")
  if (node.type === 'SimpleType' && 'name' in node) {
    const typeName = node.name as string;
    if (typeName === identifier && node.start && node.end) {
      locations.push({
        uri: documentUri,
        range: {
          start: {
            line: node.start.line - 1,
            character: node.start.column - 1,
          },
          end: {
            line: node.end.line - 1,
            character: node.end.column - 1,
          },
        },
      });
    }
  }

  // Check ASK statements for method calls
  if (node.type === 'AskStatement' && 'method' in node && 'object' in node) {
    const methodName = node.method as string;
    if (methodName === identifier && node.object && (node.object as any).end) {
      // Estimate method position: after "ASK <object> TO "
      // Method name starts approximately at object.end + " TO ".length (4 characters)
      const objectEnd = (node.object as any).end;
      const methodStart = objectEnd.column + 4; // " TO ".length
      const methodEnd = methodStart + methodName.length;

      locations.push({
        uri: documentUri,
        range: {
          start: {
            line: objectEnd.line - 1,
            character: methodStart - 1,
          },
          end: {
            line: objectEnd.line - 1,
            character: methodEnd - 1,
          },
        },
      });
    }
  }

  // Check TELL statements for method calls
  if (node.type === 'TellStatement' && 'method' in node && 'object' in node) {
    const methodName = node.method as string;
    if (methodName === identifier && node.object && (node.object as any).end) {
      // Estimate method position: after "TELL <object> TO "
      // Method name starts approximately at object.end + " TO ".length (4 characters)
      const objectEnd = (node.object as any).end;
      const methodStart = objectEnd.column + 4; // " TO ".length
      const methodEnd = methodStart + methodName.length;

      locations.push({
        uri: documentUri,
        range: {
          start: {
            line: objectEnd.line - 1,
            character: methodStart - 1,
          },
          end: {
            line: objectEnd.line - 1,
            character: methodEnd - 1,
          },
        },
      });
    }
  }

  // Recursively search children
  const children = getNodeChildren(node);
  for (const child of children) {
    findReferencesInAST(child, identifier, documentUri, locations);
  }
}

/**
 * Get identifier name from a node
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

    case 'VarDeclaration':
      if ('valueType' in node && node.valueType) {
        children.push(node.valueType as ASTNode);
      }
      break;

    case 'ConstDeclaration':
      if ('value' in node && node.value) {
        children.push(node.value as ASTNode);
      }
      break;

    case 'AskStatement':
    case 'TellStatement':
      if ('object' in node && node.object) {
        children.push(node.object as ASTNode);
      }
      if ('arguments' in node && Array.isArray(node.arguments)) {
        children.push(...node.arguments);
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

    case 'AssignmentStatement':
      if ('target' in node && node.target) {
        children.push(node.target as ASTNode);
      }
      if ('value' in node && node.value) {
        children.push(node.value as ASTNode);
      }
      break;

    case 'ReturnStatement':
      if ('value' in node && node.value) {
        children.push(node.value as ASTNode);
      }
      break;

    case 'AskStatement':
    case 'TellStatement':
      if ('object' in node && node.object) {
        children.push(node.object as ASTNode);
      }
      if ('arguments' in node && Array.isArray(node.arguments)) {
        children.push(...node.arguments);
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
 * Group references by file (for future workspace-wide search)
 */
export interface ReferenceGroup {
  uri: string;
  locations: Location[];
}

export function groupReferencesByFile(locations: Location[]): ReferenceGroup[] {
  const groups = new Map<string, Location[]>();

  for (const location of locations) {
    const existing = groups.get(location.uri);
    if (existing) {
      existing.push(location);
    } else {
      groups.set(location.uri, [location]);
    }
  }

  return Array.from(groups.entries()).map(([uri, locations]) => ({
    uri,
    locations,
  }));
}
