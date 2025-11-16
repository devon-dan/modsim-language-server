/**
 * Hover information provider - shows type info and documentation on hover
 */

import {
  Hover,
  MarkupKind,
} from 'vscode-languageserver/node';

import type { Module } from '../language/ast';
import { SymbolTable, AnySymbol, SymbolKind } from '../language/symbols';
import { Type, TypeKind, ObjectType as SemanticObjectType } from '../language/types';
import { findIdentifierAtPosition as findIdNode } from '../utils/astPosition';

/**
 * Get hover information for a position
 */
export function getHover(
  ast: Module,
  symbolTable: SymbolTable,
  line: number,
  character: number,
  documentUri?: string
): Hover | null {
  // Find the identifier at the position
  const identifier = findIdentifierAtPosition(ast, line, character);
  if (!identifier) {
    return null;
  }

  // Look up the symbol
  const symbol = symbolTable.lookup(identifier);
  if (!symbol) {
    return null;
  }

  // Generate hover content
  const content = generateHoverContent(symbol, documentUri);
  if (!content) {
    return null;
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: content,
    },
  };
}

/**
 * Find identifier at position
 */
function findIdentifierAtPosition(
  ast: Module,
  line: number,
  character: number
): string | null {
  // Use AST position tracking to find the node at this position
  const node = findIdNode(ast, { line, character });
  if (!node) {
    return null;
  }

  // Extract identifier name from the node
  if (node.type === 'IdentifierExpression' && 'name' in node) {
    return node.name as string;
  }

  if (node.type === 'FieldAccessExpression' && 'field' in node) {
    return node.field as string;
  }

  return null;
}

/**
 * Generate hover content for a symbol
 */
function generateHoverContent(symbol: AnySymbol, documentUri?: string): string | null {
  switch (symbol.kind) {
    case SymbolKind.TYPE:
      return generateTypeHover(symbol, documentUri);
    case SymbolKind.CONST:
      return generateConstHover(symbol, documentUri);
    case SymbolKind.VAR:
    case SymbolKind.PARAMETER:
      return generateVarHover(symbol, documentUri);
    case SymbolKind.PROCEDURE:
      return generateProcedureHover(symbol, documentUri);
    case SymbolKind.METHOD:
      return generateMethodHover(symbol, documentUri);
    case SymbolKind.FIELD:
      return generateFieldHover(symbol, documentUri);
    case SymbolKind.MODULE:
      return generateModuleHover(symbol, documentUri);
    default:
      return null;
  }
}

/**
 * Format file location for display
 */
function formatLocation(symbol: AnySymbol, documentUri?: string): string {
  const line = symbol.declaration.line;

  if (documentUri) {
    // Extract filename from URI
    const filename = documentUri.split('/').pop() || documentUri;
    return `*Defined in: ${filename}:${line}*`;
  }

  return `*Declared at line ${line}*`;
}

/**
 * Generate hover for type
 */
function generateTypeHover(symbol: AnySymbol, documentUri?: string): string {
  const lines: string[] = [];

  lines.push('```modsim');
  lines.push(`TYPE ${symbol.name}`);
  lines.push('```');
  lines.push('');
  lines.push(`**Kind:** ${symbol.type.kind}`);

  if (symbol.type.kind === TypeKind.OBJECT) {
    const objType = symbol.type as SemanticObjectType;
    lines.push('');
    lines.push(`**Fields:** ${objType.fields.size}`);
    lines.push(`**Methods:** ${objType.methods.size}`);

    if (objType.baseTypes && objType.baseTypes.length > 0) {
      lines.push('');
      lines.push('**Inherits from:**');
      for (const base of objType.baseTypes) {
        lines.push(`- ${base.name || 'Unknown'}`);
      }
    }
  }

  lines.push('');
  lines.push(formatLocation(symbol, documentUri));

  return lines.join('\n');
}

/**
 * Generate hover for constant
 */
function generateConstHover(symbol: AnySymbol, documentUri?: string): string {
  const lines: string[] = [];

  lines.push('```modsim');
  lines.push(`CONST ${symbol.name}`);
  lines.push('```');
  lines.push('');
  lines.push(`**Type:** ${formatType(symbol.type)}`);
  lines.push('');
  lines.push(formatLocation(symbol, documentUri));

  return lines.join('\n');
}

/**
 * Generate hover for variable or parameter
 */
function generateVarHover(symbol: AnySymbol, documentUri?: string): string {
  const lines: string[] = [];

  const kind = symbol.kind === SymbolKind.PARAMETER ? 'Parameter' : 'Variable';

  lines.push('```modsim');
  lines.push(`${kind}: ${symbol.name}`);
  lines.push('```');
  lines.push('');
  lines.push(`**Type:** ${formatType(symbol.type)}`);

  if (symbol.kind === SymbolKind.PARAMETER) {
    const param = symbol as any;
    if (param.mode) {
      lines.push(`**Mode:** ${param.mode}`);
    }
  }

  lines.push('');
  lines.push(formatLocation(symbol, documentUri));

  return lines.join('\n');
}

/**
 * Generate hover for procedure
 */
function generateProcedureHover(symbol: AnySymbol, documentUri?: string): string {
  const lines: string[] = [];
  const proc = symbol as any;

  lines.push('```modsim');

  // Build signature
  let sig = `PROCEDURE ${symbol.name}`;

  if (proc.parameters && proc.parameters.length > 0) {
    const params = proc.parameters.map((p: any) =>
      `${p.mode} ${p.name}: ${formatType(p.type)}`
    ).join('; ');
    sig += `(${params})`;
  }

  if (proc.returnType && proc.returnType.kind !== TypeKind.VOID) {
    sig += `: ${formatType(proc.returnType)}`;
  }

  lines.push(sig);
  lines.push('```');
  lines.push('');

  if (proc.parameters && proc.parameters.length > 0) {
    lines.push('**Parameters:**');
    for (const param of proc.parameters) {
      lines.push(`- \`${param.name}\` (${param.mode}): ${formatType(param.type)}`);
    }
    lines.push('');
  }

  if (proc.returnType && proc.returnType.kind !== TypeKind.VOID) {
    lines.push(`**Returns:** ${formatType(proc.returnType)}`);
    lines.push('');
  }

  lines.push(formatLocation(symbol, documentUri));

  return lines.join('\n');
}

/**
 * Generate hover for method
 */
function generateMethodHover(symbol: AnySymbol, documentUri?: string): string {
  const lines: string[] = [];
  const method = symbol as any;

  lines.push('```modsim');

  // Build signature
  let sig = `${method.methodType} METHOD ${symbol.name}`;

  if (method.parameters && method.parameters.length > 0) {
    const params = method.parameters.map((p: any) =>
      `${p.mode} ${p.name}: ${formatType(p.type)}`
    ).join('; ');
    sig += `(${params})`;
  }

  if (method.returnType && method.returnType.kind !== TypeKind.VOID) {
    sig += `: ${formatType(method.returnType)}`;
  }

  lines.push(sig);
  lines.push('```');
  lines.push('');

  lines.push(`**Method type:** ${method.methodType}`);

  if (method.isOverride) {
    lines.push(`**Override:** Yes`);
  }

  if (method.parameters && method.parameters.length > 0) {
    lines.push('');
    lines.push('**Parameters:**');
    for (const param of method.parameters) {
      lines.push(`- \`${param.name}\` (${param.mode}): ${formatType(param.type)}`);
    }
  }

  if (method.returnType && method.returnType.kind !== TypeKind.VOID) {
    lines.push('');
    lines.push(`**Returns:** ${formatType(method.returnType)}`);
  }

  lines.push('');
  lines.push(formatLocation(symbol, documentUri));

  return lines.join('\n');
}

/**
 * Generate hover for field
 */
function generateFieldHover(symbol: AnySymbol, documentUri?: string): string {
  const lines: string[] = [];

  lines.push('```modsim');
  lines.push(`${symbol.name}: ${formatType(symbol.type)}`);
  lines.push('```');
  lines.push('');
  lines.push('**Field**');
  lines.push('');
  lines.push(formatLocation(symbol, documentUri));

  return lines.join('\n');
}

/**
 * Generate hover for module
 */
function generateModuleHover(symbol: AnySymbol, _documentUri?: string): string {
  const lines: string[] = [];
  const mod = symbol as any;

  lines.push('```modsim');
  lines.push(`${mod.moduleKind} MODULE ${symbol.name}`);
  lines.push('```');
  lines.push('');
  lines.push(`**Type:** ${mod.moduleKind} Module`);

  return lines.join('\n');
}

/**
 * Format a type for display
 */
function formatType(type: Type): string {
  if (!type) {
    return 'Unknown';
  }

  switch (type.kind) {
    case TypeKind.INTEGER:
      return 'INTEGER';
    case TypeKind.REAL:
      return 'REAL';
    case TypeKind.BOOLEAN:
      return 'BOOLEAN';
    case TypeKind.STRING:
      return 'STRING';
    case TypeKind.CHAR:
      return 'CHAR';
    case TypeKind.ARRAY:
      return 'ARRAY';
    case TypeKind.RECORD:
      return 'RECORD';
    case TypeKind.OBJECT:
      return type.name || 'OBJECT';
    case TypeKind.VOID:
      return 'VOID';
    default:
      return type.name || type.kind;
  }
}
