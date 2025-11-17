/**
 * Type system definitions for MODSIM III
 */

// Basic type categories
export enum TypeKind {
  INTEGER = 'INTEGER',
  REAL = 'REAL',
  BOOLEAN = 'BOOLEAN',
  STRING = 'STRING',
  CHAR = 'CHAR',
  NUMBER = 'NUMBER', // Union of INTEGER and REAL
  ANYOBJ = 'ANYOBJ', // Universal object type
  ARRAY = 'ARRAY',
  RECORD = 'RECORD',
  OBJECT = 'OBJECT',
  POINTER = 'POINTER',
  ENUM = 'ENUM',
  SUBRANGE = 'SUBRANGE',
  VOID = 'VOID', // For procedures without return type
  UNKNOWN = 'UNKNOWN', // For unresolved types
  ERROR = 'ERROR', // For type errors
}

// Base type interface
export interface Type {
  kind: TypeKind;
  name?: string; // Optional name for user-defined types
}

// Primitive types
export interface PrimitiveType extends Type {
  kind: TypeKind.INTEGER | TypeKind.REAL | TypeKind.BOOLEAN | TypeKind.STRING | TypeKind.CHAR | TypeKind.NUMBER | TypeKind.ANYOBJ;
}

// Array type
export interface ArrayType extends Type {
  kind: TypeKind.ARRAY;
  dimensions: number; // Number of dimensions
  indexTypes: Type[]; // Type of each index (usually subrange)
  elementType: Type; // Type of array elements
}

// Record type
export interface RecordType extends Type {
  kind: TypeKind.RECORD;
  fields: Map<string, FieldInfo>; // Field name -> field info
}

export interface FieldInfo {
  type: Type;
  offset?: number; // Optional offset for memory layout
}

// Object type
export interface ObjectType extends Type {
  kind: TypeKind.OBJECT;
  baseTypes?: ObjectType[]; // Inheritance (multiple inheritance supported)
  fields: Map<string, FieldInfo>; // Instance variables
  methods: Map<string, MethodInfo>; // Methods
  privateFields?: Map<string, FieldInfo>; // Private fields
  privateMethods?: Map<string, MethodInfo>; // Private methods
}

export interface MethodInfo {
  methodType: 'ASK' | 'TELL' | 'LMONITOR' | 'RMONITOR' | 'WAITFOR';
  parameters: ParameterInfo[];
  returnType?: Type; // Only for ASK/WAITFOR methods
  isOverride: boolean;
}

export interface ParameterInfo {
  name: string;
  type: Type;
  mode: 'IN' | 'OUT' | 'INOUT';
}

// Pointer/Reference type
export interface PointerType extends Type {
  kind: TypeKind.POINTER;
  baseType: Type; // Type being pointed to
}

// Enumeration type
export interface EnumType extends Type {
  kind: TypeKind.ENUM;
  values: string[]; // Enum constant names
}

// Subrange type
export interface SubrangeType extends Type {
  kind: TypeKind.SUBRANGE;
  baseType: Type; // Usually INTEGER
  low: number;
  high: number;
}

// Void type (procedures without return)
export interface VoidType extends Type {
  kind: TypeKind.VOID;
}

// Unknown type (unresolved references)
export interface UnknownType extends Type {
  kind: TypeKind.UNKNOWN;
}

// Error type (type checking errors)
export interface ErrorType extends Type {
  kind: TypeKind.ERROR;
  message: string;
}

// Union type for all type variants
export type ModsimType =
  | PrimitiveType
  | ArrayType
  | RecordType
  | ObjectType
  | PointerType
  | EnumType
  | SubrangeType
  | VoidType
  | UnknownType
  | ErrorType;

// Built-in types
export const BUILTIN_TYPES: Map<string, Type> = new Map([
  ['INTEGER', { kind: TypeKind.INTEGER, name: 'INTEGER' }],
  ['REAL', { kind: TypeKind.REAL, name: 'REAL' }],
  ['BOOLEAN', { kind: TypeKind.BOOLEAN, name: 'BOOLEAN' }],
  ['STRING', { kind: TypeKind.STRING, name: 'STRING' }],
  ['CHAR', { kind: TypeKind.CHAR, name: 'CHAR' }],
  ['NUMBER', { kind: TypeKind.NUMBER, name: 'NUMBER' }],
  ['ANYOBJ', { kind: TypeKind.ANYOBJ, name: 'ANYOBJ' }],
]);

// NIL types
export const NILOBJ_TYPE: Type = { kind: TypeKind.UNKNOWN, name: 'NILOBJ' };
export const NILREC_TYPE: Type = { kind: TypeKind.UNKNOWN, name: 'NILREC' };
export const NILARRAY_TYPE: Type = { kind: TypeKind.UNKNOWN, name: 'NILARRAY' };

/**
 * Check if a type is assignable to another type
 */
export function isAssignable(target: Type, source: Type): boolean {
  // Same type
  if (target === source) return true;
  if (target.kind === source.kind && target.name === source.name) return true;

  // Error types are assignable to anything (to prevent cascading errors)
  if (source.kind === TypeKind.ERROR || target.kind === TypeKind.ERROR) return true;

  // Unknown types are assignable to anything
  if (source.kind === TypeKind.UNKNOWN || target.kind === TypeKind.UNKNOWN) return true;

  // NUMBER can accept INTEGER or REAL
  if (target.kind === TypeKind.NUMBER && (source.kind === TypeKind.INTEGER || source.kind === TypeKind.REAL)) {
    return true;
  }

  // INTEGER can be assigned to REAL (implicit conversion)
  if (target.kind === TypeKind.REAL && source.kind === TypeKind.INTEGER) {
    return true;
  }

  // NILOBJ can be assigned to any OBJECT type
  if (target.kind === TypeKind.OBJECT && source.name === 'NILOBJ') {
    return true;
  }

  // NILREC can be assigned to any RECORD type
  if (target.kind === TypeKind.RECORD && source.name === 'NILREC') {
    return true;
  }

  // NILARRAY can be assigned to any ARRAY type
  if (target.kind === TypeKind.ARRAY && source.name === 'NILARRAY') {
    return true;
  }

  // Object inheritance - source object can be assigned to target if it inherits from it
  if (target.kind === TypeKind.OBJECT && source.kind === TypeKind.OBJECT) {
    return isSubtypeOf(source as ObjectType, target as ObjectType);
  }

  return false;
}

/**
 * Check if source object type is a subtype of target object type (inheritance)
 */
function isSubtypeOf(source: ObjectType, target: ObjectType): boolean {
  if (source === target) return true;
  if (source.name === target.name) return true;

  // Check if source inherits from target
  if (source.baseTypes) {
    for (const baseType of source.baseTypes) {
      if (isSubtypeOf(baseType, target)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get the result type of a binary operation
 */
export function getBinaryOpResultType(operator: string, left: Type, right: Type): Type {
  // Arithmetic operators
  if (['+', '-', '*', '/', 'DIV', 'MOD'].includes(operator)) {
    // If either operand is REAL, result is REAL
    if (left.kind === TypeKind.REAL || right.kind === TypeKind.REAL) {
      return { kind: TypeKind.REAL, name: 'REAL' };
    }
    // Otherwise INTEGER
    if (left.kind === TypeKind.INTEGER && right.kind === TypeKind.INTEGER) {
      return { kind: TypeKind.INTEGER, name: 'INTEGER' };
    }
    // NUMBER type propagates
    if (left.kind === TypeKind.NUMBER || right.kind === TypeKind.NUMBER) {
      return { kind: TypeKind.NUMBER, name: 'NUMBER' };
    }
    return { kind: TypeKind.ERROR, message: `Invalid operands for ${operator}` } as ErrorType;
  }

  // Relational operators
  if (['=', '<>', '<', '>', '<=', '>='].includes(operator)) {
    // Can compare numbers with numbers, strings with strings, etc.
    if (
      (left.kind === TypeKind.INTEGER || left.kind === TypeKind.REAL || left.kind === TypeKind.NUMBER) &&
      (right.kind === TypeKind.INTEGER || right.kind === TypeKind.REAL || right.kind === TypeKind.NUMBER)
    ) {
      return { kind: TypeKind.BOOLEAN, name: 'BOOLEAN' };
    }
    if (left.kind === right.kind) {
      return { kind: TypeKind.BOOLEAN, name: 'BOOLEAN' };
    }
    return { kind: TypeKind.ERROR, message: `Cannot compare ${left.kind} with ${right.kind}` } as ErrorType;
  }

  // Logical operators
  if (['AND', 'OR', 'XOR'].includes(operator)) {
    if (left.kind === TypeKind.BOOLEAN && right.kind === TypeKind.BOOLEAN) {
      return { kind: TypeKind.BOOLEAN, name: 'BOOLEAN' };
    }
    return { kind: TypeKind.ERROR, message: `Logical operators require BOOLEAN operands` } as ErrorType;
  }

  return { kind: TypeKind.ERROR, message: `Unknown operator ${operator}` } as ErrorType;
}

/**
 * Get the result type of a unary operation
 */
export function getUnaryOpResultType(operator: string, operand: Type): Type {
  if (operator === 'NOT') {
    if (operand.kind === TypeKind.BOOLEAN) {
      return { kind: TypeKind.BOOLEAN, name: 'BOOLEAN' };
    }
    return { kind: TypeKind.ERROR, message: 'NOT requires BOOLEAN operand' } as ErrorType;
  }

  if (operator === '-') {
    if (operand.kind === TypeKind.INTEGER || operand.kind === TypeKind.REAL || operand.kind === TypeKind.NUMBER) {
      return operand;
    }
    return { kind: TypeKind.ERROR, message: 'Unary minus requires numeric operand' } as ErrorType;
  }

  return { kind: TypeKind.ERROR, message: `Unknown unary operator ${operator}` } as ErrorType;
}

/**
 * Type-safe type guards
 */
export function isPrimitiveType(type: Type): type is PrimitiveType {
  return [TypeKind.INTEGER, TypeKind.REAL, TypeKind.BOOLEAN, TypeKind.STRING, TypeKind.CHAR, TypeKind.NUMBER].includes(
    type.kind
  );
}

export function isArrayType(type: Type): type is ArrayType {
  return type.kind === TypeKind.ARRAY;
}

export function isRecordType(type: Type): type is RecordType {
  return type.kind === TypeKind.RECORD;
}

export function isObjectType(type: Type): type is ObjectType {
  return type.kind === TypeKind.OBJECT;
}

export function isPointerType(type: Type): type is PointerType {
  return type.kind === TypeKind.POINTER;
}

export function isEnumType(type: Type): type is EnumType {
  return type.kind === TypeKind.ENUM;
}

export function isSubrangeType(type: Type): type is SubrangeType {
  return type.kind === TypeKind.SUBRANGE;
}

export function isErrorType(type: Type): type is ErrorType {
  return type.kind === TypeKind.ERROR;
}
