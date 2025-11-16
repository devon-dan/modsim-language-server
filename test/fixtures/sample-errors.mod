IMPLEMENTATION MODULE SampleErrors;

(* This module contains deliberate errors for testing diagnostic capabilities *)

FROM Types IMPORT INTEGER, REAL, BOOLEAN;

TYPE
  Status = (IDLE, running, STOPPED);  (* Error: lowercase keyword 'running' should be RUNNING *)

VAR
  counter : INTEGER;
  unused : REAL;  (* Warning: unused variable *)

PROCEDURE TestUndefinedSymbol();
VAR
  x : INTEGER;
BEGIN
  x := undefinedVariable;  (* Error: undefined symbol *)
  y := 10;  (* Error: undefined symbol 'y' *)
END PROCEDURE;

PROCEDURE TestTypeMismatch();
VAR
  x : INTEGER;
  y : REAL;
  flag : BOOLEAN;
BEGIN
  x := y;  (* Error: type mismatch - REAL to INTEGER without conversion *)
  flag := x;  (* Error: type mismatch - INTEGER to BOOLEAN *)
END PROCEDURE;

PROCEDURE TestWrongParameterCount(IN x : INTEGER; IN y : INTEGER) : INTEGER;
BEGIN
  RETURN x + y;
END PROCEDURE;

PROCEDURE CallWithWrongArgs();
VAR
  result : INTEGER;
BEGIN
  result := TestWrongParameterCount(10);  (* Error: wrong argument count - expects 2, got 1 *)
  result := TestWrongParameterCount(10, 20, 30);  (* Error: wrong argument count - expects 2, got 3 *)
END PROCEDURE;

PROCEDURE TestReturnTypeMismatch() : INTEGER;
BEGIN
  RETURN 3.14;  (* Error: return type mismatch - REAL to INTEGER *)
END PROCEDURE;

PROCEDURE TestMissingReturn() : INTEGER;
BEGIN
  counter := 10;
  (* Error: missing RETURN statement *)
END PROCEDURE;

TYPE
  TestObj = OBJECT
    VAR
      value : INTEGER;

    TELL METHOD ProcessWithReturn() : INTEGER;  (* Error: TELL method cannot have return type *)
    ASK METHOD GetValue() : INTEGER;
  END OBJECT;

IMPLEMENTATION TestObj;

  TELL METHOD ProcessWithReturn() : INTEGER;
  BEGIN
    RETURN value;  (* Error: TELL method cannot return value *)
  END METHOD;

  ASK METHOD GetValue() : INTEGER;
  BEGIN
    WAIT DURATION 10.0;  (* Error: WAIT not allowed in ASK method *)
    RETURN value;
  END METHOD;

END OBJECT;

PROCEDURE TestParameterModes(IN x : INTEGER; OUT y : INTEGER);
BEGIN
  x := 10;  (* Error: cannot assign to IN parameter *)
END PROCEDURE;

(* Missing END MODULE - Error: unexpected EOF *)
