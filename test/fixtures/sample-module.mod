DEFINITION MODULE SampleModule;

(* This is a sample MODSIM III module for testing basic module structure *)

FROM Types IMPORT INTEGER, REAL, STRING;

CONST
  MAX_SIZE = 100;
  PI = 3.14159;

TYPE
  Status = (IDLE, RUNNING, STOPPED, ERROR);
  Counter = [0..MAX_SIZE];

VAR
  globalCounter : INTEGER;
  moduleStatus : Status;

PROCEDURE Initialize();
PROCEDURE GetStatus() : Status;
PROCEDURE SetCounter(IN value : INTEGER);

END MODULE.
