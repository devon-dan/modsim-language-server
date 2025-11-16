IMPLEMENTATION MODULE SampleProcedure;

(* This is a sample MODSIM III module for testing procedures and statements *)

FROM Types IMPORT INTEGER, REAL, BOOLEAN, STRING;
FROM Math IMPORT Sqrt, Abs;

CONST
  MAX_ITERATIONS = 100;

VAR
  result : REAL;
  errorFlag : BOOLEAN;

PROCEDURE Calculate(IN x : REAL; IN y : REAL) : REAL;
VAR
  temp : REAL;
BEGIN
  IF x < 0.0 THEN
    temp := Abs(x);
  ELSE
    temp := x;
  END IF;

  IF y = 0.0 THEN
    RETURN 0.0;
  ELSE
    RETURN temp / y;
  END IF;
END PROCEDURE;

PROCEDURE ProcessArray(INOUT arr : ARRAY [1..10] OF INTEGER);
VAR
  i : INTEGER;
  sum : INTEGER;
BEGIN
  sum := 0;

  FOR i := 1 TO 10 DO
    sum := sum + arr[i];
  END FOR;

  FOR i := 1 TO 10 DO
    arr[i] := arr[i] * 2;
  END FOR;
END PROCEDURE;

PROCEDURE FindMax(IN arr : ARRAY [1..100] OF REAL; IN size : INTEGER) : REAL;
VAR
  i : INTEGER;
  maxVal : REAL;
BEGIN
  maxVal := arr[1];

  FOR i := 2 TO size DO
    IF arr[i] > maxVal THEN
      maxVal := arr[i];
    END IF;
  END FOR;

  RETURN maxVal;
END PROCEDURE;

PROCEDURE IterativeSearch(IN target : INTEGER) : BOOLEAN;
VAR
  i : INTEGER;
  found : BOOLEAN;
BEGIN
  found := FALSE;
  i := 1;

  WHILE (i <= MAX_ITERATIONS) AND (NOT found) DO
    IF i = target THEN
      found := TRUE;
    ELSE
      INC(i);
    END IF;
  END WHILE;

  RETURN found;
END PROCEDURE;

PROCEDURE ProcessStatus(IN status : INTEGER);
BEGIN
  CASE status OF
    WHEN 0..10:
      result := 0.0;
    WHEN 11..50:
      result := 0.5;
    WHEN 51..100:
      result := 1.0;
    OTHERWISE
      errorFlag := TRUE;
  END CASE;
END PROCEDURE;

PROCEDURE CountDown(IN start : INTEGER);
VAR
  count : INTEGER;
BEGIN
  count := start;

  REPEAT
    DEC(count);
  UNTIL count <= 0;
END PROCEDURE;

END MODULE.
