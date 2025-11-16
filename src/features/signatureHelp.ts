/**
 * Signature Help Provider
 * Provides parameter information when typing function/method calls
 */

import {
  SignatureHelp,
  SignatureInformation,
  ParameterInformation,
  MarkupKind,
} from 'vscode-languageserver/node';

import type { Module, ASTNode } from '../language/ast';
import { SymbolTable, SymbolKind } from '../language/symbols';
import { findNodeAtPosition } from '../utils/astPosition';

/**
 * Get signature help at a position
 */
export function getSignatureHelp(
  ast: Module,
  symbolTable: SymbolTable,
  line: number,
  character: number
): SignatureHelp | null {
  // Find the node at the position
  const node = findNodeAtPosition(ast, { line, character });
  if (!node) {
    return null;
  }

  // Find the enclosing call expression
  const callNode = findEnclosingCallExpression(ast, { line, character });
  if (!callNode) {
    return null;
  }

  // Get the function/method being called
  const calleeName = getCalleeName(callNode);
  if (!calleeName) {
    return null;
  }

  // Handle ASK/TELL statements differently - need to look up the method in the object's type
  if (callNode.type === 'AskStatement' || callNode.type === 'TellStatement') {
    const askOrTellNode = callNode as any;
    const objectExpr = askOrTellNode.object;

    // Infer the type of the object
    const objectType = inferExpressionType(objectExpr, symbolTable);
    if (!objectType || objectType.kind !== 'OBJECT') {
      return null;
    }

    // Find the method in the object type
    const methodInfo = (objectType as any).methods?.get(calleeName);
    if (!methodInfo) {
      return null;
    }

    // Determine which parameter is active
    const activeParameter = determineActiveParameter(callNode, line, character);

    // Build signature from method info
    const signature = buildMethodSignature(calleeName, methodInfo);

    return {
      signatures: [signature],
      activeSignature: 0,
      activeParameter: activeParameter,
    };
  }

  // For regular procedure calls, look up the symbol
  const allSymbols = symbolTable.getAllSymbols();
  const symbol = allSymbols.find(s => s.name === calleeName);
  if (!symbol) {
    return null;
  }

  // Generate signature help based on symbol kind
  if (symbol.kind === SymbolKind.PROCEDURE || symbol.kind === SymbolKind.METHOD) {
    const procSymbol = symbol as any;

    // Determine which parameter is active
    const activeParameter = determineActiveParameter(callNode, line, character);

    // Build signature information
    const signature = buildSignature(procSymbol);

    return {
      signatures: [signature],
      activeSignature: 0,
      activeParameter: activeParameter,
    };
  }

  return null;
}

/**
 * Find enclosing call expression
 * Returns the innermost (most specific) call that contains the position
 */
function findEnclosingCallExpression(
  node: ASTNode,
  position: { line: number; character: number }
): ASTNode | null {
  // First, recursively search children to find innermost call
  const children = getNodeChildren(node);
  for (const child of children) {
    const result = findEnclosingCallExpression(child, position);
    if (result) {
      return result;  // Found a more specific (inner) call
    }
  }

  // No child calls found, check if this node is a call that contains the position
  if (node.type === 'CallExpression') {
    if (isPositionInRange(position, node.start, node.end)) {
      return node;
    }
  }

  // Check ASK and TELL statements
  if (node.type === 'AskStatement' || node.type === 'TellStatement') {
    if (isPositionInRange(position, node.start, node.end)) {
      return node;
    }
  }

  return null;
}

/**
 * Check if a position is within a range
 */
function isPositionInRange(
  position: { line: number; character: number },
  start?: { line: number; column: number },
  end?: { line: number; column: number }
): boolean {
  if (!start || !end) return false;

  const startLine = start.line - 1;
  const startChar = start.column - 1;
  const endLine = end.line - 1;
  const endChar = end.column - 1;

  if (position.line < startLine) return false;
  if (position.line === startLine && position.character < startChar) return false;
  if (position.line > endLine) return false;
  if (position.line === endLine && position.character > endChar) return false;

  return true;
}

/**
 * Get callee name from a call expression
 */
function getCalleeName(node: ASTNode): string | null {
  if (node.type === 'CallExpression') {
    const callee = (node as any).callee;
    if (callee && callee.type === 'IdentifierExpression') {
      return callee.name;
    }
  }

  if (node.type === 'AskStatement' || node.type === 'TellStatement') {
    return (node as any).method as string;
  }

  return null;
}

/**
 * Determine which parameter is currently active based on cursor position
 */
function determineActiveParameter(
  callNode: ASTNode,
  line: number,
  character: number
): number {
  const args = (callNode as any).arguments;
  if (!args || !Array.isArray(args) || args.length === 0) {
    return 0;
  }

  // Count commas before the cursor position to determine parameter index
  let activeParam = 0;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.start) continue;

    const argLine = arg.start.line - 1;
    const argChar = arg.start.column - 1;

    // If cursor is before this argument, return previous parameter
    if (line < argLine || (line === argLine && character < argChar)) {
      return Math.max(0, i - 1);
    }

    // If cursor is within this argument, return this parameter
    if (arg.end) {
      const endLine = arg.end.line - 1;
      const endChar = arg.end.column - 1;

      if (
        (line > argLine || (line === argLine && character >= argChar)) &&
        (line < endLine || (line === endLine && character <= endChar))
      ) {
        return i;
      }
    }

    activeParam = i;
  }

  // Cursor is after all arguments
  return Math.min(activeParam + 1, args.length);
}

/**
 * Build signature information from a procedure/method symbol
 */
function buildSignature(symbol: any): SignatureInformation {
  const parameters: ParameterInformation[] = [];
  let label = '';

  // Build label
  if (symbol.kind === SymbolKind.METHOD) {
    label = `${symbol.methodType} METHOD ${symbol.name}`;
  } else {
    label = `PROCEDURE ${symbol.name}`;
  }

  // Add parameters to label and parameter list
  if (symbol.parameters && symbol.parameters.length > 0) {
    const paramStrings = symbol.parameters.map((p: any) => {
      const paramStr = `${p.mode} ${p.name}: ${formatType(p.type)}`;

      // Add to parameter list
      parameters.push({
        label: paramStr,
        documentation: {
          kind: MarkupKind.Markdown,
          value: `**${p.mode}** parameter of type \`${formatType(p.type)}\``,
        },
      });

      return paramStr;
    });

    label += `(${paramStrings.join('; ')})`;
  } else {
    label += '()';
  }

  // Add return type
  if (symbol.returnType && symbol.returnType.kind !== 'VOID') {
    label += `: ${formatType(symbol.returnType)}`;
  }

  return {
    label,
    documentation: {
      kind: MarkupKind.Markdown,
      value: buildSignatureDocumentation(symbol),
    },
    parameters,
  };
}

/**
 * Build documentation for signature
 */
function buildSignatureDocumentation(symbol: any): string {
  const lines: string[] = [];

  if (symbol.kind === SymbolKind.METHOD) {
    lines.push(`${symbol.methodType} method of an object`);
  } else {
    lines.push('Procedure');
  }

  if (symbol.declaration) {
    lines.push('');
    lines.push(`*Declared at line ${symbol.declaration.line}*`);
  }

  return lines.join('\n');
}

/**
 * Format a type for display
 */
function formatType(type: any): string {
  if (!type) return 'Unknown';
  if (typeof type === 'string') return type;
  if (type.kind) return type.kind;
  if (type.name) return type.name;
  return 'Unknown';
}

/**
 * Infer the type of an expression
 */
function inferExpressionType(expr: ASTNode, symbolTable: SymbolTable): any {
  if (expr.type === 'IdentifierExpression') {
    const symbol = symbolTable.getAllSymbols().find(s => s.name === (expr as any).name);
    if (symbol && 'type' in symbol) {
      return (symbol as any).type;
    }
  }
  // Add more expression types as needed
  return null;
}

/**
 * Build signature information from a method info
 */
function buildMethodSignature(methodName: string, methodInfo: any): SignatureInformation {
  const parameters: ParameterInformation[] = [];
  let label = '';

  // Build label
  label = `${methodInfo.methodType} METHOD ${methodName}`;

  // Add parameters to label and parameter list
  if (methodInfo.parameters && methodInfo.parameters.length > 0) {
    const paramStrings = methodInfo.parameters.map((p: any) => {
      const paramStr = `${p.mode} ${p.name}: ${formatType(p.type)}`;

      // Add to parameter list
      parameters.push({
        label: paramStr,
        documentation: {
          kind: MarkupKind.Markdown,
          value: `**${p.mode}** parameter of type \`${formatType(p.type)}\``,
        },
      });

      return paramStr;
    });

    label += `(${paramStrings.join('; ')})`;
  } else {
    label += '()';
  }

  // Add return type
  if (methodInfo.returnType && methodInfo.returnType.kind !== 'VOID') {
    label += `: ${formatType(methodInfo.returnType)}`;
  }

  return {
    label,
    documentation: {
      kind: MarkupKind.Markdown,
      value: `${methodInfo.methodType} method`,
    },
    parameters,
  };
}

/**
 * Get all children of an AST node
 */
function getNodeChildren(node: ASTNode): ASTNode[] {
  const children: ASTNode[] = [];

  switch (node.type) {
    case 'Module':
      if ('declarations' in node && Array.isArray(node.declarations)) {
        children.push(...node.declarations);
      }
      break;

    case 'ObjectDeclaration':
      if ('objectType' in node && node.objectType) {
        children.push(node.objectType as ASTNode);
      }
      break;

    case 'ObjectType':
      if ('methods' in node && Array.isArray(node.methods)) {
        children.push(...node.methods);
      }
      break;

    case 'ProcedureDeclaration':
    case 'MethodDeclaration':
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
      if ('body' in node && Array.isArray(node.body)) {
        children.push(...node.body);
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

    case 'AskStatement':
    case 'TellStatement':
      if ('object' in node && node.object) {
        children.push(node.object as ASTNode);
      }
      if ('arguments' in node && Array.isArray(node.arguments)) {
        children.push(...node.arguments);
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

    case 'BinaryExpression':
      if ('left' in node && node.left) {
        children.push(node.left as ASTNode);
      }
      if ('right' in node && node.right) {
        children.push(node.right as ASTNode);
      }
      break;

    default:
      // For unknown types, try to find array and object properties
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
