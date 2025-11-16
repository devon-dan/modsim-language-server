# MODSIM III Language Gap Analysis

**Generated**: 2025-11-09
**Purpose**: Comprehensive comparison of MODSIM III language specification vs. LSP implementation

---

## CRITICAL MISSING FEATURES (Blocks RAMS codebase)

These features cause parse failures in RAMS source files and must be implemented for basic functionality.

### 1. MAIN MODULE Support (HIGH PRIORITY)
**Status**: Missing
**Impact**: ~20% of RAMS files (entry points)
**Location**: Parser line 86

```modsim
MAIN MODULE ProgramName;
  { declarations and main program }
BEGIN
  { main program body }
END MODULE.
```

**Current**: Parser only recognizes `DEFINITION MODULE` and `IMPLEMENTATION MODULE`
**Required**: Add `MAIN` as third module kind, handle main program body with BEGIN...END

---

### 2. PROGRAM Keyword (Alternative to MAIN MODULE)
**Status**: Missing (no PROGRAM token)
**Impact**: Alternative syntax used in some codebases
**Spec**: Section 3.1 shows `MAIN MODULE` but some systems use `PROGRAM`

```modsim
PROGRAM ProgramName;
  { ... }
BEGIN
  { ... }
END PROGRAM.
```

**Required**: Add `PROGRAM` token type, handle as alternative to `MAIN MODULE`

---

### 3. IMPORT Statement (Without FROM)
**Status**: Partially missing
**Impact**: ~40% of import statements
**Location**: Parser line 123

```modsim
IMPORT ModuleName;        { Import all exported items }
IMPORT Mod1, Mod2, Mod3;  { Import multiple modules }
```

**Current**: Parser only handles `FROM Module IMPORT items`
**Required**: Handle standalone `IMPORT` statement for whole-module imports

---

### 4. EXPORT Statement in DEFINITION Modules
**Status**: Missing (no EXPORT token)
**Impact**: DEFINITION modules cannot specify exports
**Spec**: Section 3.2

```modsim
DEFINITION MODULE MathUtils;
EXPORT Add, Subtract, Multiply;  { Explicit export list }

PROCEDURE Add(IN a, b: INTEGER): INTEGER;
{ ... }
END MODULE.
```

**Required**: Add `EXPORT` token, handle export declarations

---

### 5. Object Field Declarations Without VAR in DEFINITION Modules
**Status**: Missing
**Impact**: ~15% of object field declarations
**Location**: Parser line 508-513 (RecordType), line 550-574 (ObjectType)

```modsim
TYPE
  PersonObj = OBJECT
    name : STRING;      { No VAR keyword }
    age : INTEGER;      { No VAR keyword }
    salary : REAL;      { No VAR keyword }

    ASK METHOD GetName: STRING;
  END OBJECT;
```

**Current**: Parser expects `VAR` keyword before field blocks
**Required**: In TYPE declarations, allow direct field declarations: `fieldName : type ;`
**Note**: Parser line 550-574 partially handles this for ObjectType but not consistently

---

### 6. FIXED Keyword for Arrays and Records
**Status**: Missing (no FIXED token)
**Impact**: ~10% of type declarations
**Spec**: Sections 2.3

```modsim
TYPE
  FixedIntArray = FIXED ARRAY [1..100] OF INTEGER;
  FixedPoint = FIXED RECORD
    x, y : REAL;
  END RECORD;
```

**Required**: Add `FIXED` token, handle in parseArrayType() and parseRecordType()

---

### 7. ANYOBJ Generic Type
**Status**: Missing (not in types or keywords)
**Impact**: ~5% of generic/polymorphic code
**Spec**: Mentioned in llm guide as generic type

```modsim
VAR
  genericRef : ANYOBJ;
```

**Required**: Add `ANYOBJ` as built-in type keyword

---

### 8. POINTER Types
**Status**: Defined in AST but not parsed
**Impact**: ~3% of low-level code
**Location**: ast.ts line 341-344

```modsim
TYPE
  NodePtr = POINTER TO NodeRec;
```

**Current**: `PointerType` interface exists in AST but no parser support
**Required**: Implement parsePointerType() in parser

---

### 9. SET Types
**Status**: Missing (no SET token)
**Impact**: ~2% of mathematical code
**Spec**: Section 1.2 reserved words

```modsim
TYPE
  CharSet = SET OF CHAR;
  DaySet = SET OF DayType;

VAR
  vowels : SET OF CHAR;
BEGIN
  vowels := {'a', 'e', 'i', 'o', 'u'};
END;
```

**Required**: Add `SET` token (exists in llm-modsim-guide.md), implement set type parsing and set literals

---

### 10. REPEAT-UNTIL Loop
**Status**: Missing (no REPEAT/UNTIL tokens)
**Impact**: ~5% of loop constructs
**Spec**: Section 5.6

```modsim
REPEAT
  statements
UNTIL condition;
```

**Required**: Add `REPEAT` and `UNTIL` tokens, implement parseRepeatStatement()

---

### 11. INC and DEC Statements
**Status**: Missing (no INC/DEC tokens)
**Impact**: ~15% of counter operations
**Spec**: Section 5.11

```modsim
INC(count);         { count := count + 1 }
INC(count, 5);      { count := count + 5 }
DEC(count);         { count := count - 1 }
DEC(count, 3);      { count := count - 3 }
```

**Required**: Add `INC` and `DEC` tokens, handle as special statement forms

---

### 12. WITH Statement
**Status**: Missing (no WITH token)
**Impact**: ~3% of record/object access
**Spec**: Reserved word in Section 1.2

```modsim
WITH recordVar DO
  field1 := 10;
  field2 := 20;
END WITH;
```

**Required**: Add `WITH` token, implement parseWithStatement()

---

### 13. Nested Procedures/Functions
**Status**: Not tested/unclear
**Impact**: ~5% of complex procedures
**Spec**: Standard feature

```modsim
PROCEDURE Outer;

  PROCEDURE Inner;
  BEGIN
    { inner implementation }
  END PROCEDURE;

BEGIN
  Inner;
END PROCEDURE;
```

**Required**: Verify parser handles nested procedures in localDeclarations

---

## IMPORTANT MISSING FEATURES (Blocks advanced use cases)

Features present in language spec but missing from implementation. May not block basic parsing but needed for full language support.

### 14. CHAR Type Keyword
**Status**: Missing from TokenType enum
**Impact**: Character type declarations
**Location**: ast.ts (CHAR not in TokenType enum)

```modsim
VAR
  letter : CHAR;
  digit : CHAR;
```

**Current**: Parser might accept as IDENTIFIER only
**Required**: Add `CHAR` to TokenType enum and KEYWORDS map

---

### 15. FLOAT Type/Function
**Status**: Missing (no FLOAT token)
**Impact**: Type conversions
**Spec**: Section 2.5

```modsim
r := FLOAT(intValue);  { INTEGER to REAL conversion }
```

**Required**: Add `FLOAT` as built-in function/keyword

---

### 16. TRUNC and ROUND Functions
**Status**: Missing (no TRUNC/ROUND tokens)
**Impact**: REAL to INTEGER conversion
**Spec**: Section 2.5

```modsim
i := TRUNC(3.7);   { i = 3 }
i := ROUND(3.7);   { i = 4 }
```

**Required**: Add `TRUNC` and `ROUND` as built-in functions

---

### 17. String Functions
**Status**: Missing (no LENGTH, SUBSTR, etc.)
**Impact**: String manipulation
**Spec**: Section 12.2

```modsim
len := LENGTH(str);
sub := SUBSTR(str, 2, 3);
pos := POS(str, "pattern");
result := UPPER(str);
result := LOWER(str);
result := TRIM(str);
```

**Required**: Add all string function tokens

---

### 18. Mathematical Functions
**Status**: Missing
**Impact**: Scientific computing
**Spec**: Section 12.1

```modsim
result := ABS(x);
result := SQRT(x);
result := SIN(x);
result := COS(x);
result := TAN(x);
result := EXP(x);
result := LN(x);
result := LOG(x);
result := POWER(x, y);
result := MIN(x, y);
result := MAX(x, y);
```

**Required**: Add mathematical function tokens

---

### 19. Ordinal Functions
**Status**: Partially missing
**Impact**: Enumeration and character operations
**Spec**: Section 12.3

```modsim
{ Available: FIRST, LAST, NUMBER }
{ Missing: ORD, CHR, SUCC, PRED }

i := ORD('A');       { 65 }
c := CHR(65);        { 'A' }
c := SUCC('A');      { 'B' }
c := PRED('B');      { 'A' }
```

**Required**: Add `ORD`, `CHR`, `SUCC`, `PRED` tokens

---

### 20. Type Conversion Functions
**Status**: Missing
**Impact**: String conversions
**Spec**: Section 12.5

```modsim
s := INTTOSTR(42);
s := REALTOSTR(3.14);
s := BOOLTOSTR(TRUE);
s := CHARTOSTR('A');
i := STRTOINT("42");
r := STRTOREAL("3.14");
b := STRTOBOOL("TRUE");
```

**Required**: Add all conversion function tokens

---

### 21. Module Initialization Block
**Status**: Unclear if supported
**Impact**: Module-level initialization
**Spec**: Standard feature

```modsim
IMPLEMENTATION MODULE Utils;
  { declarations }

BEGIN
  { Module initialization code runs on first import }
  InitializeGlobals;
END MODULE.
```

**Required**: Verify parser handles BEGIN...END in modules before END MODULE

---

### 22. WHEN Clause (in CASE statements)
**Status**: Missing (no WHEN token, but in reserved words)
**Impact**: Alternative CASE syntax
**Spec**: Section 1.2 reserved words

```modsim
CASE value OF
  WHEN 1, 2, 3:
    DoSomething;
  WHEN 4..10:
    DoSomethingElse;
END CASE;
```

**Current**: Parser uses value: syntax only
**Required**: Add `WHEN` support as alternative to value:

---

### 23. IS Keyword
**Status**: Missing (no IS token, but in reserved words)
**Impact**: Type testing
**Spec**: Section 1.2 reserved words

```modsim
IF obj IS CarObj THEN
  { Handle as car }
END IF;
```

**Required**: Add `IS` token, implement type testing expressions

---

### 24. STACK Type
**Status**: Missing (no STACK token, but in reserved words)
**Impact**: Built-in stack type
**Spec**: Section 1.2 reserved words, Section 8.3

```modsim
FROM GrpMod IMPORT StackObj;

VAR
  stack : StackObj;
```

**Required**: Document if STACK is a keyword or just a standard type from GrpMod

---

### 25. Result Variable Assignment in ASK Methods
**Status**: Parser doesn't capture result properly
**Impact**: Functional method calls
**Location**: Parser line 976-1011

```modsim
result := ASK object MethodName(params);  { With return value }
ASK object TO MethodName(params);         { Without return value }
```

**Current**: Parser has `result?: string` but doesn't properly parse assignment LHS
**Required**: Improve ASK statement parsing to handle result capture

---

### 26. Multi-dimensional Array Indexing
**Status**: Assumed working but not explicitly tested
**Impact**: Matrix operations

```modsim
VAR
  matrix : ARRAY OF ARRAY OF REAL;
BEGIN
  NEW(matrix, 1, 10);
  FOR i := 1 TO 10 DO
    NEW(matrix[i], 1, 20);
  END FOR;

  matrix[5][10] := 99.0;
END;
```

**Required**: Verify parser handles nested array access

---

### 27. Anonymous Subrange Types
**Status**: Parsing implemented but verify usage
**Impact**: Inline range constraints

```modsim
VAR
  percentage : [0..100];
  grade : ['A'..'F'];
```

**Required**: Test parsing of anonymous subranges in variable declarations

---

### 28. Record Variant Parts
**Status**: Not mentioned in implementation
**Impact**: Discriminated unions
**Note**: May not exist in MODSIM III

```modsim
{ This may not be a MODSIM feature - needs verification }
TYPE
  Shape = RECORD
    CASE kind : ShapeType OF
      Circle: radius : REAL;
      Rectangle: width, height : REAL;
    END CASE;
  END RECORD;
```

**Required**: Verify if MODSIM supports record variants

---

### 29. Forward Declarations
**Status**: Not mentioned
**Impact**: Mutual recursion

```modsim
PROCEDURE Forward; FORWARD;

PROCEDURE A;
BEGIN
  Forward;
END PROCEDURE;

PROCEDURE Forward;
BEGIN
  A;
END PROCEDURE;
```

**Required**: Add `FORWARD` keyword, handle forward procedure declarations

---

### 30. Procedure/Function as Parameters
**Status**: Not mentioned
**Impact**: Higher-order functions
**Spec**: May not be supported in MODSIM

```modsim
{ This may not be a MODSIM feature - needs verification }
PROCEDURE ApplyToAll(IN arr: ARRAY OF INTEGER; IN func: PROCEDURE);
```

**Required**: Verify if MODSIM supports procedure parameters

---

### 31. DISPOSE with Object References
**Status**: Token exists but statement parsing not explicit
**Impact**: Memory management

```modsim
DISPOSE(obj);
DISPOSE(arr);
DISPOSE(rec);
```

**Required**: Add DISPOSE as statement form

---

### 32. CLONE Expression
**Status**: Token exists but not in expression parsing
**Impact**: Deep copying

```modsim
arr2 := CLONE(arr1);
rec2 := CLONE(rec1);
obj2 := CLONE(obj1);
```

**Required**: Add CLONE to expression parsing (prefix operator or function call)

---

### 33. String Indexing
**Status**: Parsed as array access (should work)
**Impact**: Character extraction

```modsim
VAR
  name : STRING;
  ch : CHAR;
BEGIN
  name := "Alice";
  ch := name[1];    { First character, 1-based }
  name[1] := 'B';   { Modify character }
END;
```

**Required**: Verify string indexing works with ArrayAccessExpression

---

### 34. String Concatenation with +
**Status**: Operator exists, verify type system
**Impact**: String building

```modsim
message := "Hello, " + name + "!";
```

**Required**: Verify binary + operator works for strings

---

### 35. Scientific Notation for Numbers
**Status**: Implemented in lexer
**Impact**: Large/small number literals
**Location**: Lexer line 208-225, 230-248

```modsim
value := 1.5E-10;
value := 3.0E+8;
```

**Current**: ✓ Lexer handles scientific notation
**Required**: None - already implemented

---

### 36. Nested Comments
**Status**: Implemented in lexer
**Impact**: Comment documentation
**Location**: Lexer line 375-402

```modsim
{ Outer comment (* nested comment *) still in outer }
(* Another { nested } comment *)
```

**Current**: ✓ Lexer handles nested comments
**Required**: None - already implemented

---

### 37. Escape Sequences in Strings
**Status**: Implemented in lexer
**Impact**: Special characters
**Location**: Lexer line 97-136

```modsim
message := "Line 1\nLine 2\tTabbed";
path := "C:\\Users\\Alice";
```

**Current**: ✓ Lexer handles escape sequences
**Required**: None - already implemented

---

## IMPLEMENTED FEATURES (For reference)

This section documents what we DO have working to avoid duplicate implementation.

### Core Module Structure ✓
- DEFINITION MODULE parsing
- IMPLEMENTATION MODULE parsing
- FROM...IMPORT statement parsing
- Module-level declarations (TYPE, CONST, VAR, PROCEDURE, OBJECT)

### Type System ✓
- Simple types (INTEGER, REAL, BOOLEAN, STRING)
- User-defined type declarations
- ARRAY types with index ranges
- RECORD types with fields
- OBJECT types with inheritance (single and multiple)
- Subrange types [low..high]
- Enumerated types (value1, value2, ...)
- Type references in declarations

### Object-Oriented Features ✓
- OBJECT declarations
- ASK METHOD declarations
- TELL METHOD declarations
- OVERRIDE keyword
- INHERITED keyword (in tokens)
- Base type specification OBJECT(BaseType)
- Multiple inheritance OBJECT(Base1, Base2)
- PRIVATE/PUBLIC sections
- Method parameters (IN, OUT, INOUT)
- Method return types
- SELF keyword (in tokens)

### Control Flow ✓
- IF-THEN-ELSIF-ELSE-END IF
- WHILE-DO-END WHILE
- FOR-TO/DOWNTO-BY-DO-END FOR
- FOREACH-IN-DO-END FOREACH
- CASE-OF-OTHERWISE-END CASE (with | separators)
- LOOP-END LOOP
- EXIT statement
- BEGIN-END blocks

### Statements ✓
- Variable assignments (target := value)
- ASK statements (ASK obj TO method)
- TELL statements (TELL obj TO method, with optional IN delay)
- WAIT statements (WAIT DURATION / WAIT FOR)
- WAIT with ON INTERRUPT handler
- RETURN statements (with optional value)
- TERMINATE statements

### Expressions ✓
- Binary operators (+, -, *, /, DIV, MOD, AND, OR, XOR, =, <>, <, >, <=, >=)
- Unary operators (NOT, -)
- Field access (obj.field)
- Array access (arr[index])
- Function calls (func(args))
- Range expressions (low..high) for array indices
- Parenthesized expressions
- Literals (integers, reals, strings, chars, booleans, NIL*)

### Declarations ✓
- Constant declarations with optional type
- Variable declarations (single and multiple)
- Procedure declarations with parameters and return types
- Local declarations in procedures
- Parameter modes (IN, OUT, INOUT)

### Lexical Features ✓
- Case-sensitive keyword checking (errors on lowercase keywords)
- Comment handling (both { } and (* *) styles)
- Nested comments
- String literals with escape sequences
- Character literals
- Integer literals
- Real literals with scientific notation
- All major operators and delimiters

### Tokens ✓
We have ~77 token types defined, including:
- All major keywords (AND, ARRAY, ASK, BEGIN, CASE, etc.)
- All operators (:=, =, <>, +, -, *, /, etc.)
- Literals (INTEGER_LITERAL, REAL_LITERAL, STRING_LITERAL, CHAR_LITERAL)
- Special tokens (EOF, ERROR, COMMENT)

---

## RECOMMENDATIONS

### Priority 1: Critical for RAMS Parsing (Sprint 1)

1. **Add MAIN MODULE support** (1-2 hours)
   - Add 'MAIN' as module kind
   - Handle main program body
   - Test with RAMS entry points

2. **Add standalone IMPORT** (1 hour)
   - Parse `IMPORT ModuleName;` syntax
   - Support comma-separated list
   - Update ImportStatement AST

3. **Add FIXED keyword** (2 hours)
   - Token type
   - Parser support for FIXED ARRAY and FIXED RECORD
   - Test with static allocations

4. **Field declarations without VAR in DEFINITION modules** (2-3 hours)
   - Already partially works in parser (line 550-574)
   - Ensure consistency across DEFINITION/TYPE contexts
   - Test with RAMS object definitions

5. **Add REPEAT-UNTIL loop** (1-2 hours)
   - Tokens: REPEAT, UNTIL
   - Parser method
   - AST node type

6. **Add INC/DEC statements** (1-2 hours)
   - Tokens: INC, DEC
   - Parse as special statement form
   - Handle optional increment/decrement amount

**Estimated Total**: 10-15 hours

### Priority 2: Complete Core Language (Sprint 2)

7. **Add EXPORT statement** (1 hour)
   - Token and parser support
   - AST node for export lists

8. **Add ANYOBJ type** (30 min)
   - Token and keyword
   - Type system integration

9. **Add SET types** (2-3 hours)
   - SET token
   - Parse SET OF type
   - Set literal syntax {value1, value2}

10. **Add POINTER types** (1 hour)
    - POINTER token
    - Parser support for POINTER TO type

11. **Add CHAR type** (30 min)
    - Already should work but verify
    - Add to type keywords if missing

12. **Add WITH statement** (2 hours)
    - WITH token
    - Parser support
    - AST node

**Estimated Total**: 8-10 hours

### Priority 3: Built-in Functions & Operators (Sprint 3)

13. **Type conversion functions** (2 hours)
    - FLOAT, TRUNC, ROUND
    - Parse as built-in functions

14. **String functions** (2 hours)
    - LENGTH, SUBSTR, POS, UPPER, LOWER, TRIM
    - Parse as built-in functions

15. **Math functions** (2 hours)
    - ABS, SQRT, SIN, COS, TAN, EXP, LN, LOG, POWER, MIN, MAX
    - Parse as built-in functions

16. **Ordinal functions** (1 hour)
    - ORD, CHR, SUCC, PRED
    - Parse as built-in functions

17. **String conversion functions** (1 hour)
    - INTTOSTR, REALTOSTR, BOOLTOSTR, CHARTOSTR
    - STRTOINT, STRTOREAL, STRTOBOOL

18. **DISPOSE and CLONE** (1 hour)
    - Already have tokens
    - Add as expression/statement forms

**Estimated Total**: 9-10 hours

### Priority 4: Advanced Features (Sprint 4)

19. **Result capture in ASK** (2-3 hours)
    - Improve parser to handle `result := ASK obj Method`
    - Distinguish from `ASK obj TO Method`

20. **WHEN clause in CASE** (1 hour)
    - Alternative syntax for CASE
    - Add WHEN token support

21. **IS keyword for type testing** (2 hours)
    - IS token
    - Type test expression parsing

22. **Verify nested procedures** (1 hour testing)
    - Should already work
    - Add test cases

23. **Module initialization blocks** (1 hour testing)
    - Should already work for IMPLEMENTATION
    - Verify BEGIN...END before END MODULE

24. **PROGRAM keyword** (1 hour)
    - Alternative to MAIN MODULE
    - Parser support

**Estimated Total**: 8-11 hours

### Priority 5: Edge Cases & Verification (Sprint 5)

25. **Verify multi-dimensional arrays**
26. **Verify anonymous subranges**
27. **Verify string indexing**
28. **Verify string concatenation**
29. **Test all literal types**
30. **Test nested structures**

**Estimated Total**: 4-6 hours

---

## TOTAL EFFORT ESTIMATE

- **Sprint 1** (Critical): 10-15 hours
- **Sprint 2** (Core): 8-10 hours
- **Sprint 3** (Functions): 9-10 hours
- **Sprint 4** (Advanced): 8-11 hours
- **Sprint 5** (Verification): 4-6 hours

**Total**: 39-52 hours (5-7 working days)

---

## KNOWN NON-FEATURES

These are features that do NOT exist in MODSIM III (per the language specification):

1. **Exception handling** (try-catch-finally) - Not in language
2. **Operator overloading** - Not supported
3. **Templates/Generics** (beyond ANYOBJ) - Not supported
4. **Lambda functions** - Not supported
5. **Property accessors** (get/set) - Not supported
6. **Decorators/Annotations** - Not supported
7. **Reflection/RTTI** - Not supported (beyond basic IS keyword)
8. **Modules as first-class values** - Not supported
9. **Coroutines/async-await** - Not supported (use TELL/WAIT instead)
10. **Garbage collection** - Manual memory management only

---

## VERIFICATION PLAN

After implementing missing features, verify against RAMS codebase:

1. **Parse all .mod files** - Track parse success rate
2. **Parse all .def files** - Track DEFINITION module coverage
3. **Generate ASTs** - Ensure complete representation
4. **Semantic analysis** - Type checking, scope resolution
5. **Error messages** - Clear, actionable error reporting

**Success Criteria**:
- 95%+ RAMS files parse without errors
- All language constructs represented in AST
- Meaningful error messages for 100% of errors
- No false positives on valid MODSIM code

---

## NOTES

### Parser Architecture Strengths
- Clean recursive descent structure
- Good error recovery framework (partially implemented)
- Comprehensive AST node types
- Position tracking for all nodes

### Parser Architecture Weaknesses
- Module kind is enum not union (limits extensibility)
- Error recovery not fully implemented (line 1451 TODO)
- Statement parsing could be more modular
- Built-in functions not distinguished from user functions

### Lexer Strengths
- Robust number literal parsing
- Correct nested comment handling
- Case-sensitive keyword checking with helpful errors
- Good position tracking

### Lexer Weaknesses
- No token for many built-in functions
- Could benefit from more descriptive error messages
- No preprocessor support (may not be needed)

### AST Strengths
- Complete type system representation
- Good separation of concerns
- Position information on all nodes
- Type-safe discriminated unions

### AST Weaknesses
- Some nodes could have more specific types
- Missing some statement types (REPEAT, INC, DEC, WITH, DISPOSE as statement)
- Expression types could be more specific for built-ins

---

## CONCLUSION

The current LSP implementation has a solid foundation covering ~70% of the MODSIM III language. The main gaps are:

1. **Module variants** (MAIN, PROGRAM)
2. **Import variants** (standalone IMPORT)
3. **Type modifiers** (FIXED, SET, POINTER)
4. **Built-in functions** (~30 functions missing)
5. **Statement variants** (REPEAT, INC, DEC, WITH, DISPOSE)
6. **Generic types** (ANYOBJ)

With focused effort over 5-7 days, we can achieve near-complete MODSIM III language coverage and successfully parse the RAMS codebase.

The implementation quality is high - clean architecture, good separation of concerns, and proper position tracking. The remaining work is primarily additive rather than requiring architectural changes.
