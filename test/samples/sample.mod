(*
  Sample MODSIM III Module for Integration Testing
  Tests advanced LSP features: rename, document highlight, folding ranges
*)

IMPLEMENTATION MODULE SimulationDemo;

CONST
  MAX_CAPACITY = 100;

TYPE
  ItemCount = INTEGER;

OBJECT Queue;
  VAR capacity: INTEGER;
  VAR itemCount: ItemCount;
  VAR isActive: BOOLEAN;

  ASK METHOD Initialize(IN maxCap: INTEGER);
  BEGIN
    capacity := maxCap;
    itemCount := 0;
    isActive := TRUE;
  END METHOD;

  ASK METHOD Enqueue(): BOOLEAN;
  BEGIN
    IF itemCount < capacity THEN
      itemCount := itemCount + 1;
      RETURN TRUE;
    ELSE
      RETURN FALSE;
    END IF;
  END METHOD;

  ASK METHOD Dequeue(): BOOLEAN;
  BEGIN
    IF itemCount > 0 THEN
      itemCount := itemCount - 1;
      RETURN TRUE;
    ELSE
      RETURN FALSE;
    END IF;
  END METHOD;

  ASK METHOD GetCount(): INTEGER;
  BEGIN
    RETURN itemCount;
  END METHOD;

  TELL METHOD Shutdown();
  BEGIN
    isActive := FALSE;
    itemCount := 0;
  END METHOD;
END OBJECT;

PROCEDURE ProcessItems(IN queue: Queue; IN count: INTEGER): INTEGER;
VAR i: INTEGER;
VAR processed: INTEGER;
VAR result: BOOLEAN;
BEGIN
  processed := 0;

  FOR i := 1 TO count DO
    ASK queue TO Enqueue() RETURNING result;
    IF result THEN
      processed := processed + 1;
    END IF;
  END FOR;

  RETURN processed;
END PROCEDURE;

PROCEDURE RunSimulation();
VAR mainQueue: Queue;
VAR totalProcessed: INTEGER;
VAR currentCount: INTEGER;
BEGIN
  (* Initialize the queue *)
  ASK mainQueue TO Initialize(MAX_CAPACITY);

  (* Process some items *)
  totalProcessed := ProcessItems(mainQueue, 50);

  (* Check current state *)
  ASK mainQueue TO GetCount() RETURNING currentCount;

  WHILE currentCount > 0 DO
    ASK mainQueue TO Dequeue();
    currentCount := currentCount - 1;
  END WHILE;

  (* Shutdown *)
  TELL mainQueue TO Shutdown();
END PROCEDURE;

END MODULE;
