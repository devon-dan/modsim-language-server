/**
 * Document symbols provider - shows outline/structure of MODSIM file
 */

import {
  DocumentSymbol,
  SymbolKind,
  Range,
} from 'vscode-languageserver/node';

import type {
  Module,
  Declaration,
  TypeDeclaration,
  ConstDeclaration,
  VarDeclaration,
  ProcedureDeclaration,
  ObjectDeclaration,
  ObjectType,
} from '../language/ast';

/**
 * Get document symbols for a module
 */
export function getDocumentSymbols(ast: Module): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];

  // Add module itself as top-level symbol
  const moduleSymbol: DocumentSymbol = {
    name: ast.name,
    kind: SymbolKind.Module,
    range: toRange(ast.start, ast.end),
    selectionRange: toRange(ast.start, ast.start),
    children: [],
  };

  // Process declarations
  for (const decl of ast.declarations) {
    const symbol = declarationToSymbol(decl);
    if (symbol) {
      moduleSymbol.children!.push(symbol);
    }
  }

  symbols.push(moduleSymbol);
  return symbols;
}

/**
 * Convert a declaration to a document symbol
 */
function declarationToSymbol(decl: Declaration): DocumentSymbol | null {
  switch (decl.type) {
    case 'TypeDeclaration':
      return typeDeclarationToSymbol(decl);
    case 'ConstDeclaration':
      return constDeclarationToSymbol(decl);
    case 'VarDeclaration':
      return varDeclarationToSymbol(decl);
    case 'ProcedureDeclaration':
      return procedureDeclarationToSymbol(decl);
    case 'ObjectDeclaration':
      return objectDeclarationToSymbol(decl);
    default:
      return null;
  }
}

/**
 * Convert type declaration to symbol
 */
function typeDeclarationToSymbol(decl: TypeDeclaration): DocumentSymbol {
  const symbol: DocumentSymbol = {
    name: decl.name,
    kind: getTypeSymbolKind(decl.typeSpec.type),
    range: toRange(decl.start, decl.end),
    selectionRange: toRange(decl.start, decl.start),
  };

  // If it's an object type, add fields and methods as children
  if (decl.typeSpec.type === 'ObjectType') {
    const objectType = decl.typeSpec as ObjectType;
    symbol.children = [];

    // Add fields
    for (const field of objectType.fields) {
      for (const name of field.names) {
        symbol.children.push({
          name,
          kind: SymbolKind.Field,
          range: toRange(field.start, field.end),
          selectionRange: toRange(field.start, field.start),
        });
      }
    }

    // Add methods
    for (const method of objectType.methods) {
      symbol.children.push({
        name: method.name,
        kind: SymbolKind.Method,
        range: toRange(method.start, method.end),
        selectionRange: toRange(method.start, method.start),
        detail: method.methodType, // ASK or TELL
      });
    }
  }

  return symbol;
}

/**
 * Get symbol kind for type specification
 */
function getTypeSymbolKind(typeSpecType: string): SymbolKind {
  switch (typeSpecType) {
    case 'ObjectType':
      return SymbolKind.Class;
    case 'RecordType':
      return SymbolKind.Struct;
    case 'EnumType':
      return SymbolKind.Enum;
    case 'ArrayType':
      return SymbolKind.Array;
    default:
      return SymbolKind.TypeParameter;
  }
}

/**
 * Convert const declaration to symbol
 */
function constDeclarationToSymbol(decl: ConstDeclaration): DocumentSymbol {
  return {
    name: decl.name,
    kind: SymbolKind.Constant,
    range: toRange(decl.start, decl.end),
    selectionRange: toRange(decl.start, decl.start),
  };
}

/**
 * Convert var declaration to symbol (creates one symbol per variable)
 */
function varDeclarationToSymbol(decl: VarDeclaration): DocumentSymbol {
  // For multiple variables, return the first one (could return array in future)
  return {
    name: decl.names.join(', '),
    kind: SymbolKind.Variable,
    range: toRange(decl.start, decl.end),
    selectionRange: toRange(decl.start, decl.start),
  };
}

/**
 * Convert procedure declaration to symbol
 */
function procedureDeclarationToSymbol(decl: ProcedureDeclaration): DocumentSymbol {
  const symbol: DocumentSymbol = {
    name: decl.name,
    kind: SymbolKind.Function,
    range: toRange(decl.start, decl.end),
    selectionRange: toRange(decl.start, decl.start),
    children: [],
  };

  // Add parameters as children
  for (const param of decl.parameters) {
    symbol.children!.push({
      name: param.name,
      kind: SymbolKind.Variable,
      range: toRange(param.start, param.end),
      selectionRange: toRange(param.start, param.start),
      detail: param.mode, // IN, OUT, INOUT
    });
  }

  // Add local declarations
  if (decl.localDeclarations) {
    for (const localDecl of decl.localDeclarations) {
      const localSymbol = declarationToSymbol(localDecl);
      if (localSymbol) {
        symbol.children!.push(localSymbol);
      }
    }
  }

  return symbol;
}

/**
 * Convert object declaration to symbol
 */
function objectDeclarationToSymbol(decl: ObjectDeclaration): DocumentSymbol {
  return {
    name: 'ObjectInstance',
    kind: SymbolKind.Object,
    range: toRange(decl.start, decl.end),
    selectionRange: toRange(decl.start, decl.start),
  };
}

/**
 * Convert AST position to LSP Range
 */
function toRange(
  start: { line: number; column: number },
  end: { line: number; column: number }
): Range {
  return {
    start: { line: start.line - 1, character: start.column - 1 }, // LSP is 0-based
    end: { line: end.line - 1, character: end.column - 1 },
  };
}
