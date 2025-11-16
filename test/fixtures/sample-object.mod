IMPLEMENTATION MODULE SampleObject;

(* This is a sample MODSIM III object for testing object-oriented features *)

FROM Types IMPORT INTEGER, REAL, BOOLEAN;

TYPE
  BaseObj = OBJECT
    VAR
      id : INTEGER;
      name : STRING;
      active : BOOLEAN;

    ASK METHOD GetId() : INTEGER;
    ASK METHOD GetName() : STRING;
    ASK METHOD IsActive() : BOOLEAN;
    TELL METHOD SetActive(IN value : BOOLEAN);
    TELL METHOD Initialize(IN newId : INTEGER; IN newName : STRING);
  END OBJECT;

  DerivedObj = OBJECT(BaseObj)
    VAR
      data : REAL;
      count : INTEGER;

    { OVERRIDE }
    ASK METHOD GetId() : INTEGER;

    ASK METHOD GetData() : REAL;
    TELL METHOD SetData(IN value : REAL);
    TELL METHOD Process();
  END OBJECT;

IMPLEMENTATION BaseObj;

  ASK METHOD GetId() : INTEGER;
  BEGIN
    RETURN id;
  END METHOD;

  ASK METHOD GetName() : STRING;
  BEGIN
    RETURN name;
  END METHOD;

  ASK METHOD IsActive() : BOOLEAN;
  BEGIN
    RETURN active;
  END METHOD;

  TELL METHOD SetActive(IN value : BOOLEAN);
  BEGIN
    active := value;
  END METHOD;

  TELL METHOD Initialize(IN newId : INTEGER; IN newName : STRING);
  BEGIN
    id := newId;
    name := newName;
    active := FALSE;
  END METHOD;

END OBJECT;

IMPLEMENTATION DerivedObj;

  { OVERRIDE }
  ASK METHOD GetId() : INTEGER;
  BEGIN
    RETURN INHERITED GetId() + 1000;
  END METHOD;

  ASK METHOD GetData() : REAL;
  BEGIN
    RETURN data;
  END METHOD;

  TELL METHOD SetData(IN value : REAL);
  BEGIN
    data := value;
    INC(count);
  END METHOD;

  TELL METHOD Process();
  VAR
    i : INTEGER;
  BEGIN
    FOR i := 1 TO count DO
      data := data * 1.1;
    END FOR;
  END METHOD;

END OBJECT;

END MODULE.
