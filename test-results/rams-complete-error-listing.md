# Complete RAMS Error Listing

**Total Files with Errors**: 59 (after parser fixes)
**Parse Success Rate**: 929/988 (94.0%)

## CRITICAL: Root Cause Analysis

Investigation revealed that **many reported errors are cascade failures** from 5 genuine source code typos. When the lexer encounters an unterminated string, all subsequent parsing becomes corrupted.

### Priority 1: Fix These 5 Files to Eliminate ~30 Cascade Failures

#### 1. IFileManagement.mod - Line 1590
**Error**: Triple quote
```modsim
ReadData ("FLIGHTLEVELSTRATEGY", InputFilesObj.GetFile ("FLIGHTLEVELSTRATEGY"")) ;
                                                                            ^^^ 3 quotes
```
**Fix**: Remove one quote → `("FLIGHTLEVELSTRATEGY")`

**Cascade Impact**: Causes 31 false reports of backslash errors in Windows paths on line 2008

---

#### 2. IFlightPlan.mod - Line 2645
**Error**: Missing opening quote
```modsim
ASK meterEndNode TO SetName ("#EO" + insertMeterNodes") ;
                                     ^^^^^^^^^^^^^^^^^ missing opening quote
```
**Fix**: Either `("#EO" + "insertMeterNodes")` or `("#EO" + insertMeterNodes)` (if variable)

**Cascade Impact**: Causes 44 false reports of hash characters through line 4416

---

#### 3. IHistory.mod - Line 906
**Error**: ESC character (hex 1B) + missing semicolon
```modsim
options [n] := "#CP" <ESC>
                    ^^^ stray ESC character, missing semicolon
```
**Fix**: Remove ESC character and add semicolon → `"#CP" ;`

**Cascade Impact**: Causes 31 "Invalid number format" errors and other cascades

---

#### 4. IORCI.mod - Line 6736
**Error**: Extra closing quote
```modsim
SetLabel ("ORCI HITL " + orci.ORCIAirport.Name + "  " + orci.ORCIRunway.Name") ;
                                                                             ^ extra quote
```
**Fix**: Remove extra quote → `orci.ORCIRunway.Name)`

**Cascade Impact**: Causes unterminated string error reported at line 6818

---

#### 5. IRestrictedZone.mod - Line 806
**Error**: Extra closing quote
```modsim
ASK exitNode TO SetName ("#RZX_" + type") ;
                                       ^ extra quote
```
**Fix**: Remove extra quote → `("#RZX_" + type)`

**Cascade Impact**: Causes all 12 lexer errors (!, %, character literals) through line 6027

---

## Lexer Errors (After Cascade Analysis)

The files listed below contain lexer errors. Note that many errors in IFileManagement.mod, IFlightPlan.mod, IHistory.mod, IORCI.mod, and IRestrictedZone.mod are **cascade failures** from the 5 root causes identified above.

### DATMResource.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 81, Col 57: `IntermediateResourceObj = OBJECT (ResourceObj[ANYOBJ:#IdObj]...`

---

### DAirspaceDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 2

**Sample Locations**:
- Line 160, Col 16: `Object : #WorkObj ;`
- Line 161, Col 41: `ASK METHOD SetObject (IN object : #WorkObj) ;`

---

### DAirspaceTreeDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 2

**Sample Locations**:
- Line 49, Col 16: `Object : #WorkObj ;`
- Line 55, Col 41: `ASK METHOD SetObject (IN object : #WorkObj) ;`

---

### DAltitudeRestrictionDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 7

**Sample Locations**:
- Line 27, Col 75: `AltitudeRestrictionItemObj = PROTO (RestrictionItemObj [Rest...`
- Line 41, Col 44: `ASK METHOD SetObject (IN object : #RouteSegAltitudeRestricti...`
- Line 45, Col 78: `AltitudeRestrictionDBoxObj = PROTO (RestrictionDBoxObj[Restr...`
- *(4 more occurrences)*

---

### DBasicNode.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 101, Col 48: `BasicNodeBTreeObj = PROTO (BTreeIdObj[IdObj:#BasicNodeObj]) ...`

---

### DBox.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 54, Col 52: `ASK METHOD Eval(IN alist : AssocListObj) : #BoxObj;`

---

### DController.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 57, Col 63: `ControllerObj = OBJECT (PrimitiveControlObj [BasicGroupObj:#...`

---

### DDataIntegrity.mod

**Error Type**: Unexpected character
**Occurrences**: 6

**Sample Locations**:
- Line 17, Col 34: `ASK METHOD Dependents () : #DataIntegrityQueueObj ;`
- Line 26, Col 14: `: #DataIntegrityQueueObj ;`
- Line 30, Col 52: `ASK METHOD ReturnDependentList (IN list : #DataIntegrityQueu...`
- *(3 more occurrences)*

---

### DDetailDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 34, Col 41: `ASK METHOD SetObject (IN object : #ANYOBJ) ;`

---

### DDialogQueue.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 17, Col 45: `DialogQueueObj = OBJECT (QueueObj[ANYOBJ:#PlacementDBoxObj])`

---

### DDistributionDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 151, Col 35: `PROTO (IdListBoxItemObj [IdObj:#DistributionObj]) ;`

---

### DDynamicConflictClass.mod

**Error Type**: Unexpected character
**Occurrences**: 2

**Sample Locations**:
- Line 35, Col 54: `ConflictClassRankedObj = PROTO (RankedIdObj[IdObj:#ConflictC...`
- Line 37, Col 83: `ASK METHOD GetConflictClassification (IN conflictClassificat...`

---

### DEditListDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 17

**Sample Locations**:
- Line 22, Col 16: `Object : #ANYOBJ ;`
- Line 25, Col 41: `ASK METHOD SetObject (IN object : #ANYOBJ) ;`
- Line 31, Col 50: `EditListDBoxObj = PROTO (ObjectDBoxObj[ANYOBJ:#BasicGroupObj...`
- *(14 more occurrences)*

---

### DFlightIcon.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 37, Col 49: `FlightPairQueueObj = OBJECT (QueueObj[ANYOBJ:#ClosestPairObj...`

---

### DGrp.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 99, Col 46: `GrpPatternObj = PROTO(GrpMemoryObj[MemoryObj:#PatternObj])`

---

### DGrpId.mod

**Error Type**: Unexpected character
**Occurrences**: 101

**Sample Locations**:
- Line 26, Col 44: `BTreeIdObj = PROTO (IdObj, BTreeObj[ANYOBJ:#IdObj])`
- Line 27, Col 37: `ASK METHOD AddIfNew (IN member : #IdObj) ;`
- Line 31, Col 35: `ASK METHOD Add (IN member : #IdObj) ;`
- *(98 more occurrences)*

---

### DGrpMod.mod

**Error Type**: Unexpected character
**Occurrences**: 43

**Sample Locations**:
- Line 134, Col 34: `ASK METHOD Add(IN NewMember: #ANYOBJ)`
- Line 140, Col 27: `ASK METHOD Remove() : #ANYOBJ`
- Line 146, Col 26: `ASK METHOD First() : #ANYOBJ`
- *(40 more occurrences)*

---

### DISAEnvoy.mod

**Error Type**: Unexpected character
**Occurrences**: 3

**Sample Locations**:
- Line 20, Col 46: `IN flightplan : #ANYOBJ) : #ANYOBJ;`
- Line 20, Col 57: `IN flightplan : #ANYOBJ) : #ANYOBJ;`
- Line 28, Col 26: `ASK METHOD result() : #ANYOBJ ;`

---

### DLevelBand.mod

**Error Type**: Unexpected character
**Occurrences**: 7

**Sample Locations**:
- Line 49, Col 50: `LevelBandRankedObj = PROTO (RankedIdObj[IdObj:#LevelBandObj]...`
- Line 55, Col 43: `ASK METHOD CopyLevelBand (IN from : #LevelBandObj ;`
- Line 56, Col 43: `IN to   : #LevelBandObj) ;`
- *(4 more occurrences)*

---

### DListMod.mod

**Error Type**: Unexpected character
**Occurrences**: 31

**Sample Locations**:
- Line 103, Col 27: `ASK METHOD Remove() : #ANYREC`
- Line 109, Col 26: `ASK METHOD First() : #ANYREC`
- Line 115, Col 25: `ASK METHOD Last() : #ANYREC`
- *(28 more occurrences)*

---

### DMasterClock.mod

**Error Type**: Unexpected character
**Occurrences**: 2

**Sample Locations**:
- Line 31, Col 46: `PassengerListObj = PROTO (BTreeObj[ANYOBJ:#PassengerObj]) ;`
- Line 33, Col 38: `ASK METHOD Key (IN member : #PassengerObj) : STRING ;`

---

### DMemory.mod

**Error Type**: Unexpected character
**Occurrences**: 7

**Sample Locations**:
- Line 74, Col 40: `QueueObj [ANYOBJ:#MemoryObj]) ;`
- Line 76, Col 41: `ASK METHOD AddIfNew(IN member : #MemoryObj);`
- Line 77, Col 56: `ASK METHOD AtPosition(IN position : INTEGER) : #MemoryObj;`
- *(4 more occurrences)*

---

### DMergeCorner.mod

**Error Type**: Unexpected character
**Occurrences**: 3

**Sample Locations**:
- Line 53, Col 44: `BoundaryBTreeObj = OBJECT (BTreeObj[ANYOBJ:#BoundaryObj]) ;`
- Line 58, Col 42: `CornerBTreeObj = OBJECT (BTreeObj[ANYOBJ:#CornerObj]) ;`
- Line 63, Col 43: `CornerRankedObj = PROTO (RankedObj[ANYOBJ:#CornerObj]) ;`

---

### DMyProto.mod

**Error Type**: Unexpected character
**Occurrences**: 9

**Sample Locations**:
- Line 19, Col 52: `ParentBTreeObj = PROTO (ParentObj, BTreeObj[ANYOBJ:#ParentOb...`
- Line 21, Col 35: `ASK METHOD Add (IN member : #ParentObj) ;`
- Line 22, Col 35: `ASK METHOD Key (IN member : #ParentObj) : STRING ;`
- *(6 more occurrences)*

---

### DObjectDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 2

**Sample Locations**:
- Line 18, Col 26: `Object           : #ANYOBJ ;`
- Line 33, Col 41: `ASK METHOD SetObject (IN object : #ANYOBJ) ;`

---

### DPrimitiveControl.mod

**Error Type**: Unexpected character
**Occurrences**: 4

**Sample Locations**:
- Line 28, Col 24: `InfoWindow     : #BasicGroupObj ;`
- Line 29, Col 24: `ControlWindow  : #BasicGroupObj ;`
- Line 63, Col 46: `ASK METHOD SetControlWindow (IN list : #BasicGroupObj) ;`
- *(1 more occurrences)*

---

### DQuadTree.mod

**Error Type**: Unexpected character
**Occurrences**: 4

**Sample Locations**:
- Line 16, Col 19: `QuadTreeRoot : #BasicQuadTreeNodeObj ;`
- Line 36, Col 48: `IN length : REAL) : #BasicQuadTreeNodeObj ;`
- Line 37, Col 49: `ASK METHOD GetNode (IN index : IndexArray) : #BasicQuadTreeN...`
- *(1 more occurrences)*

---

### DResMod.mod

**Error Type**: Unexpected character
**Occurrences**: 11

**Sample Locations**:
- Line 167, Col 46: `ASK METHOD NumberAllocatedTo(IN Object : #ANYOBJ) : INTEGER`
- Line 191, Col 33: `WAITFOR METHOD Give(IN Me : #ANYOBJ; IN numberDesired : INTE...`
- Line 198, Col 49: `WAITFOR METHOD TimedGive(IN Me            : #ANYOBJ;`
- *(8 more occurrences)*

---

### DRestrictionDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 6

**Sample Locations**:
- Line 23, Col 58: `RestrictionItemObj = PROTO (EditListBoxItemObj[ANYOBJ:#Restr...`
- Line 32, Col 37: `ASK METHOD SetObject (IN object : #RestrictionObj) ;`
- Line 36, Col 67: `RestrictionDBoxObj = PROTO (EditListDBoxObj[EditListBoxItemO...`
- *(3 more occurrences)*

---

### DSlidingWorkload.mod

**Error Type**: Unexpected character
**Occurrences**: 6

**Sample Locations**:
- Line 11, Col 44: `ActivityBTreeObj = OBJECT (BTreeObj[ANYOBJ:#ATCActivityObj])`
- Line 13, Col 35: `ASK METHOD Key (IN member : #ATCActivityObj) : STRING ;`
- Line 16, Col 44: `CategoryBTreeObj = OBJECT (BTreeObj[ANYOBJ:#ATCCategoryObj])`
- *(3 more occurrences)*

---

### DSlidingWorkoad.mod

**Error Type**: Unexpected character
**Occurrences**: 4

**Sample Locations**:
- Line 10, Col 44: `ActivityBTreeObj = OBJECT (BTreeObj[ANYOBJ:#ATCActivityObj])`
- Line 12, Col 35: `ASK METHOD Key (IN member : #ATCActivity) : STRING ;`
- Line 15, Col 44: `CategoryBTreeObj = OBJECT (BTreeObj[ANYOBJ:#ATCCategoryObj])`
- *(1 more occurrences)*

---

### DTMARoute.mod

**Error Type**: Unexpected character
**Occurrences**: 2

**Sample Locations**:
- Line 45, Col 48: `TMARouteBTreeObj = PROTO ( BTreeIdObj[IdObj:#TMARouteObj] )`
- Line 48, Col 48: `TMARouteQueueObj = PROTO ( QueueIdObj[IdObj:#TMARouteObj] )`

---

### IATCFlightPlanCalculator.mod

**Error Type**: Unexpected character
**Occurrences**: 3

**Sample Locations**:
- Line 2381, Col 84: `beyond a bit of run-time to add or re-add the runway decel p...`
- Line 2891, Col 81: `beyond a bit of run-time to add or re-add the runway decel p...`
- Line 6953, Col 81: `beyond a bit of run-time to add or re-add the runway decel p...`

---

### IAirGate.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 844, Col 47: `airgate := CreateNewAirGate (name) ; }`

---

### IAirWay.mod

**Error Type**: Unexpected character
**Occurrences**: 2

**Sample Locations**:
- Line 4278, Col 27: `}`
- Line 5209, Col 27: `}`

---

### IBasicSimControl.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 735, Col 4: `}`

---

### IBasicTokenIO.mod

**Error Type**: Unterminated character literal
**Occurrences**: 4

**Sample Locations**:
- Line 570, Col 43: `RETURN (TestChar = '/') OR (TestChar = '\') {PCNT} ;`
- Line 1511, Col 27: `OR (BufferChar = '\') { PCNT }`
- Line 2030, Col 42: `SpecialCharacterArray [i, 1] := '''' ;`
- *(1 more occurrences)*

---

### IControllerDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 1302, Col 5: `}`

---

### IExternalFlight - Copy.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 4150, Col 10: `}`

---

### IExternalFlight.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 6578, Col 10: `}`

---

### IFileManagement.mod

**Error Type**: Unexpected character
**Occurrences**: 31

**Sample Locations**:
- Line 2008, Col 47: `ASK FrontierObj TO ReadAnyFormat ("C:\rams\development\confi...`
- Line 2008, Col 52: `ASK FrontierObj TO ReadAnyFormat ("C:\rams\development\confi...`
- Line 2008, Col 64: `ASK FrontierObj TO ReadAnyFormat ("C:\rams\development\confi...`
- *(28 more occurrences)*

**Error Type**: Invalid number format
**Occurrences**: 1

**Sample Locations**:
- Line 2100, Col 36: `ASK airspaceKML TO SetOpacity ("7e") ;`

**Error Type**: Unterminated string literal
**Occurrences**: 1

**Sample Locations**:
- Line 4409, Col 46: `message := "The file does not exist:" ;`

---

### IFlight.mod

**Error Type**: Unexpected character
**Occurrences**: 4

**Sample Locations**:
- Line 688, Col 64: `ASK IntentSnakes TO AddGraphic (ProjectionIcon) ; }`
- Line 3196, Col 24: `}`
- Line 16584, Col 15: `}`
- *(1 more occurrences)*

---

### IFlightPlan.09.06.29.mod

**Error Type**: Unexpected character
**Occurrences**: 7

**Sample Locations**:
- Line 1843, Col 34: `IF (POSITION (impactName, "#") = 1)`
- Line 2008, Col 27: `IF directionFlag = "#WX"`
- Line 2021, Col 35: `IF  (directionFlag = "#WX")`
- *(4 more occurrences)*

**Error Type**: Unterminated string literal
**Occurrences**: 1

**Sample Locations**:
- Line 3202, Col 24: `WHEN "NoseOutSpoolUp" : RETURN AttitudeNoseOutSpoolUp ;`

---

### IFlightPlan.mod

**Error Type**: Unexpected character
**Occurrences**: 44

**Sample Locations**:
- Line 2653, Col 40: `IF (POSITION (impactName, "#") = 1)`
- Line 2843, Col 27: `IF directionFlag = "#WX"`
- Line 2856, Col 35: `IF  (directionFlag = "#WX")`
- *(41 more occurrences)*

**Error Type**: Unterminated string literal
**Occurrences**: 1

**Sample Locations**:
- Line 4416, Col 48: `OR (POSITION (point.Node.Name, "#SC") = 1)`

---

### IFlowDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 3

**Sample Locations**:
- Line 821, Col 47: `ASK ListBoxSort TO AddAlpha (item) ; }`
- Line 2633, Col 4: `}`
- Line 2644, Col 47: `ASK ListBoxSort TO AddAlpha (item) ; }`

---

### IGetDBox.mod

**Error Type**: Unterminated character literal
**Occurrences**: 1

**Sample Locations**:
- Line 369, Col 31: `check := GetValueCheck () ;'`

---

### IGrpId.mod

**Error Type**: Unexpected character
**Occurrences**: 2

**Sample Locations**:
- Line 1039, Col 47: `ASK METHOD ConnectedElements (IN element1 : #ANYOBJ ;`
- Line 1040, Col 47: `IN element2 : #ANYOBJ) : BOOLEAN ;`

---

### IHistory.mod

**Error Type**: Unexpected character
**Occurrences**: 3

**Sample Locations**:
- Line 906, Col 28: `options [n] := "#CP" `
- Line 1101, Col 84: `status := SystemCallAsynchronous (GetEditor () + " " + exter...`
- Line 4124, Col 65: `ASK stream TO WriteString ("This may require an entry to the...`

**Error Type**: Invalid number format
**Occurrences**: 29

**Sample Locations**:
- Line 3212, Col 19: `" 6EntryTimeHHMMSS" " +`
- Line 3216, Col 19: `" 8EntryAFL" +`
- Line 3218, Col 19: `" 9EntrySpeedNmHr" +`
- *(26 more occurrences)*

**Error Type**: Unterminated character literal
**Occurrences**: 1

**Sample Locations**:
- Line 4146, Col 82: `ASK stream TO WriteString ("ALTITUDECFL and CFL are the same...`

---

### IHistoryQVCS.mod

**Error Type**: Invalid number format
**Occurrences**: 16

**Sample Locations**:
- Line 946, Col 19: `" 15EntryAFL" +`
- Line 948, Col 19: `" 16EntrySpeed" +`
- Line 950, Col 19: `" 17EntryAttitude" +`
- *(13 more occurrences)*

**Error Type**: Unterminated string literal
**Occurrences**: 1

**Sample Locations**:
- Line 1381, Col 63: `WarningMessage ("File " + fileName + " is NOT opened.") ;`

---

### IHoldStackIcon.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 190, Col 8: `}`

---

### ILevelBand.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 154, Col 56: `ASK METHOD GetOrCreateLevelBand (IN level : REAL) : #LevelBa...`

---

### IMeterDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 3

**Sample Locations**:
- Line 1151, Col 71: `ASK combo TO SetText (INTTOSTR (pathobject.POPriority)) ; }`
- Line 1261, Col 74: `ASK pathobject TO SetPOPriority (STRTOINT (combo.Text)) ; }`
- Line 1263, Col 83: `ASK pathobject TO SetPOPriority (TRUNC (STRTOREAL (combo.Tex...`

---

### IMetering.mod

**Error Type**: Unexpected character
**Occurrences**: 2

**Sample Locations**:
- Line 803, Col 4: `}`
- Line 1305, Col 4: `}`

---

### IMissionGeneratorDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 2

**Sample Locations**:
- Line 355, Col 47: `ASK ListBoxSort TO AddAlpha (item) ; }`
- Line 457, Col 4: `}`

---

### IMyProto.mod

**Error Type**: Unexpected character
**Occurrences**: 8

**Sample Locations**:
- Line 25, Col 32: `ASK METHOD Add (IN member : #ParentObj) ;`
- Line 30, Col 32: `ASK METHOD Key (IN member : #ParentObj) : STRING ;`
- Line 35, Col 32: `ASK METHOD Next (IN member: #ParentObj) : #ParentObj;`
- *(5 more occurrences)*

---

### IORCI.mod

**Error Type**: Unterminated string literal
**Occurrences**: 1

**Sample Locations**:
- Line 6818, Col 64: `option := ASK EditDefaultObj TO GetDefaultReal ("AIRDELAYINC...`

---

### IRestoreFlightPlan.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 336, Col 7: `}`

---

### IRestrictedZone.mod

**Error Type**: Unexpected character
**Occurrences**: 28

**Sample Locations**:
- Line 670, Col 86: `allowEntry := ASK IdAcceptCriteria TO CriteriaOKor (flight, ...`
- Line 912, Col 54: `{ This operation says "if any (NOT ALL!) criteria is matched...`
- Line 1437, Col 33: `ASK node0 TO SetName ("#Avoidance0") ; { Stays }`
- *(25 more occurrences)*

**Error Type**: Unterminated character literal
**Occurrences**: 4

**Sample Locations**:
- Line 1039, Col 53: `" due to this zone's priorities") ;`
- Line 1144, Col 53: `" due to this zone's priorities") ;`
- Line 2693, Col 82: `ASK StatusWindow TO ShowMessage ("point " + point.Node.Name ...`
- *(1 more occurrences)*

**Error Type**: Unterminated string literal
**Occurrences**: 1

**Sample Locations**:
- Line 6027, Col 71: `pointB := ASK AirBoundaryPointObj TO FindOrCreatePoint ("tem...`

---

### IRuleSystemDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 62, Col 54: `RulePriorityRankedObj = OBJECT (RankedObj [ANYOBJ:#RuleListB...`

---

### IRuleTree.mod

**Error Type**: Unexpected character
**Occurrences**: 2

**Sample Locations**:
- Line 570, Col 121: `ASK ResolutionManager TO TestForResolutionConflictsGiven (Cu...`
- Line 641, Col 121: `ASK ResolutionManager TO TestForResolutionConflictsGiven (Cu...`

---

### ISlidingWorkload.mod

**Error Type**: Unexpected character
**Occurrences**: 3

**Sample Locations**:
- Line 31, Col 32: `ASK METHOD Key (IN member : #ATCActivityObj) : STRING ;`
- Line 39, Col 32: `ASK METHOD Key (IN member : #ATCCategoryObj) : STRING ;`
- Line 47, Col 32: `ASK METHOD Key (IN member : #SectorObj) : STRING ;`

---

### ITaskDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 491, Col 47: `ASK ListBoxSort TO AddAlpha (item) ; }`

---

### ITrafficDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 1076, Col 47: `ASK ListBoxSort TO AddAlpha (item) ; }`

---

### IValidateDBox.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 251, Col 27: `IF (List.numberIn > 0) }`

---

### IVectorTo.mod

**Error Type**: Unexpected character
**Occurrences**: 5

**Sample Locations**:
- Line 1026, Col 81: `vectorParallel1 := AddToInitialFlightPlanAfter (insertPoint,...`
- Line 1039, Col 84: `vectorParallel2 := AddToInitialFlightPlanAfter (insertPoint,...`
- Line 2143, Col 31: `IF (fpp.Node.Name = "#STARE")`
- *(2 more occurrences)*

**Error Type**: Unterminated string literal
**Occurrences**: 1

**Sample Locations**:
- Line 2440, Col 48: `ASK file TO WriteString ("VectorToGate") ;`

---

### IWarningArea.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 1189, Col 4: `}`

---

### IWindGrid.mod

**Error Type**: Unexpected character
**Occurrences**: 2

**Sample Locations**:
- Line 1200, Col 115: `WindGridArray[day-arrayInc, ilatFlipped, ilong, ilevel].Comp...`
- Line 1692, Col 95: `WindGridArray[day, ilatFlipped, ilong, ilevel].ComponentV :=...`

---

### IWorkload.mod

**Error Type**: Unexpected character
**Occurrences**: 1

**Sample Locations**:
- Line 5887, Col 9: `}`

---

## Parser Errors (22 files)

These files have structural syntax errors that prevent parsing.

### Expected expression (9 files)

#### ICalcConflict.mod

- **Location**: Line 135, Column 10
- **Error**: Expected expression at line 135, column 10
- **Context**: `ELSE`

#### IFlightPlanCalculator.mod

- **Location**: Line 531, Column 7
- **Error**: Expected expression at line 531, column 7
- **Context**: `END IF ;`

#### IHoldStack.mod

- **Location**: Line 2955, Column 6
- **Error**: Expected expression at line 2955, column 6
- **Context**: `ON INTERRUPT`

#### IId.mod

- **Location**: Line 255, Column 7
- **Error**: Expected expression at line 255, column 7
- **Context**: `ON INTERRUPT`

#### IReader.mod

- **Location**: Line 970, Column 7
- **Error**: Expected expression at line 970, column 7
- **Context**: `END IF ;`

#### IRunway.mod

- **Location**: Line 2079, Column 4
- **Error**: Expected expression at line 2079, column 4
- **Context**: `END IF ;`

#### ISmoothFPC.mod

- **Location**: Line 1552, Column 7
- **Error**: Expected expression at line 1552, column 7
- **Context**: `END IF ;`

#### IWindowPierce.mod

- **Location**: Line 5117, Column 4
- **Error**: Expected expression at line 5117, column 4
- **Context**: `VAR`

#### IXEventTrack.mod

- **Location**: Line 615, Column 37
- **Error**: Expected expression at line 615, column 37
- **Context**: `synchroniseClock (time) IN 0.0 ;`

---

### Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM (4 files)

#### DFligthPlan.mod

- **Location**: Line 1, Column 1
- **Error**: Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM at line 1, column 1
- **Context**: `t`

#### INewFlightLevelKDM.mod

- **Location**: Line 3, Column 4
- **Error**: Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM at line 3, column 4
- **Context**: `ASK METHOD ConstraintWithinLimit (IN constraint : TupleObj) : BOOLEAN ;`

#### IRunwayKDM.mod

- **Location**: Line 1, Column 4
- **Error**: Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM at line 1, column 4
- **Context**: `ASK METHOD NextAvailableWindowDependency (IN flight        : FlightObj ;`

#### ITempFlightLevelKDM.mod

- **Location**: Line 3, Column 4
- **Error**: Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM at line 3, column 4
- **Context**: `ASK METHOD ConstraintWithinLimit (IN constraint : TupleObj) : BOOLEAN ;`

---

### Expected PROCEDURE (4 files)

#### IMath.mod

- **Location**: Line 204, Column 8
- **Error**: Expected PROCEDURE at line 204, column 8
- **Context**: `END METHOD ; {PerpendicularPointNM}`

#### IMathKDM.mod

- **Location**: Line 209, Column 5
- **Error**: Expected PROCEDURE at line 209, column 5
- **Context**: `END METHOD ; { AreColinear }`

#### ITrafficExchange.mod

- **Location**: Line 77, Column 5
- **Error**: Expected PROCEDURE at line 77, column 5
- **Context**: `END METHOD ; { IsHHMMSSColons }`

#### IWiredFlight.mod

- **Location**: Line 239, Column 5
- **Error**: Expected PROCEDURE at line 239, column 5
- **Context**: `END METHOD ; { ClearWiredProfile }`

---

### Expected END (3 files)

#### DCaissInterfaceTypes.mod

- **Location**: Line 133, Column 1
- **Error**: Expected END at line 133, column 1

#### IFlightPlanPoint.mod

- **Location**: Line 463, Column 4
- **Error**: Expected END at line 463, column 4
- **Context**: `BEGIN`

#### IGetSeparation.mod

- **Location**: Line 237, Column 1
- **Error**: Expected END at line 237, column 1
- **Context**: `BEGIN`

---

### Expected semicolon (1 files)

#### IFlightIcon.mod

- **Location**: Line 108, Column 2
- **Error**: Expected semicolon at line 108, column 2
- **Context**: `OBJECT FlightIconObj ;`

---

### Expected METHOD (1 files)

#### ILicenseManager.mod

- **Location**: Line 592, Column 5
- **Error**: Expected METHOD at line 592, column 5
- **Context**: `END PROCEDURE ;  { LoadNothingMode }`

---

## Summary Table

| File | Error Type | Line | Error Message |
|------|------------|------|---------------|
| DATMResource.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| DAirspaceDBox.mod | Lexer: Unexpected character | Multiple (2) | Unexpected character |
| DAirspaceTreeDBox.mod | Lexer: Unexpected character | Multiple (2) | Unexpected character |
| DAltitudeRestrictionDBox.mod | Lexer: Unexpected character | Multiple (7) | Unexpected character |
| DBasicNode.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| DBox.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| DController.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| DDataIntegrity.mod | Lexer: Unexpected character | Multiple (6) | Unexpected character |
| DDetailDBox.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| DDialogQueue.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| DDistributionDBox.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| DDynamicConflictClass.mod | Lexer: Unexpected character | Multiple (2) | Unexpected character |
| DEditListDBox.mod | Lexer: Unexpected character | Multiple (17) | Unexpected character |
| DFlightIcon.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| DGrp.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| DGrpId.mod | Lexer: Unexpected character | Multiple (101) | Unexpected character |
| DGrpMod.mod | Lexer: Unexpected character | Multiple (43) | Unexpected character |
| DISAEnvoy.mod | Lexer: Unexpected character | Multiple (3) | Unexpected character |
| DLevelBand.mod | Lexer: Unexpected character | Multiple (7) | Unexpected character |
| DListMod.mod | Lexer: Unexpected character | Multiple (31) | Unexpected character |
| DMasterClock.mod | Lexer: Unexpected character | Multiple (2) | Unexpected character |
| DMemory.mod | Lexer: Unexpected character | Multiple (7) | Unexpected character |
| DMergeCorner.mod | Lexer: Unexpected character | Multiple (3) | Unexpected character |
| DMyProto.mod | Lexer: Unexpected character | Multiple (9) | Unexpected character |
| DObjectDBox.mod | Lexer: Unexpected character | Multiple (2) | Unexpected character |
| DPrimitiveControl.mod | Lexer: Unexpected character | Multiple (4) | Unexpected character |
| DQuadTree.mod | Lexer: Unexpected character | Multiple (4) | Unexpected character |
| DResMod.mod | Lexer: Unexpected character | Multiple (11) | Unexpected character |
| DRestrictionDBox.mod | Lexer: Unexpected character | Multiple (6) | Unexpected character |
| DSlidingWorkload.mod | Lexer: Unexpected character | Multiple (6) | Unexpected character |
| DSlidingWorkoad.mod | Lexer: Unexpected character | Multiple (4) | Unexpected character |
| DTMARoute.mod | Lexer: Unexpected character | Multiple (2) | Unexpected character |
| IATCFlightPlanCalculator.mod | Lexer: Unexpected character | Multiple (3) | Unexpected character |
| IAirGate.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| IAirWay.mod | Lexer: Unexpected character | Multiple (2) | Unexpected character |
| IBasicSimControl.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| IBasicTokenIO.mod | Lexer: Unterminated character literal | Multiple (4) | Unterminated character literal |
| IControllerDBox.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| IExternalFlight - Copy.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| IExternalFlight.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| IFileManagement.mod | Lexer: Unexpected character | Multiple (33) | Unexpected character |
| IFlight.mod | Lexer: Unexpected character | Multiple (4) | Unexpected character |
| IFlightPlan.09.06.29.mod | Lexer: Unexpected character | Multiple (8) | Unexpected character |
| IFlightPlan.mod | Lexer: Unexpected character | Multiple (45) | Unexpected character |
| IFlowDBox.mod | Lexer: Unexpected character | Multiple (3) | Unexpected character |
| IGetDBox.mod | Lexer: Unterminated character literal | Multiple (1) | Unterminated character literal |
| IGrpId.mod | Lexer: Unexpected character | Multiple (2) | Unexpected character |
| IHistory.mod | Lexer: Unexpected character | Multiple (33) | Unexpected character |
| IHistoryQVCS.mod | Lexer: Invalid number format | Multiple (17) | Invalid number format |
| IHoldStackIcon.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| ILevelBand.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| IMeterDBox.mod | Lexer: Unexpected character | Multiple (3) | Unexpected character |
| IMetering.mod | Lexer: Unexpected character | Multiple (2) | Unexpected character |
| IMissionGeneratorDBox.mod | Lexer: Unexpected character | Multiple (2) | Unexpected character |
| IMyProto.mod | Lexer: Unexpected character | Multiple (8) | Unexpected character |
| IORCI.mod | Lexer: Unterminated string literal | Multiple (1) | Unterminated string literal |
| IRestoreFlightPlan.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| IRestrictedZone.mod | Lexer: Unexpected character | Multiple (33) | Unexpected character |
| IRuleSystemDBox.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| IRuleTree.mod | Lexer: Unexpected character | Multiple (2) | Unexpected character |
| ISlidingWorkload.mod | Lexer: Unexpected character | Multiple (3) | Unexpected character |
| ITaskDBox.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| ITrafficDBox.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| IValidateDBox.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| IVectorTo.mod | Lexer: Unexpected character | Multiple (6) | Unexpected character |
| IWarningArea.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| IWindGrid.mod | Lexer: Unexpected character | Multiple (2) | Unexpected character |
| IWorkload.mod | Lexer: Unexpected character | Multiple (1) | Unexpected character |
| DCaissInterfaceTypes.mod | Parser: Expected END | 133 | Expected END |
| DFligthPlan.mod | Parser: Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM | 1 | Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM |
| ICalcConflict.mod | Parser: Expected expression | 135 | Expected expression |
| IFlightIcon.mod | Parser: Expected semicolon | 108 | Expected semicolon |
| IFlightPlanCalculator.mod | Parser: Expected expression | 531 | Expected expression |
| IFlightPlanPoint.mod | Parser: Expected END | 463 | Expected END |
| IGetSeparation.mod | Parser: Expected END | 237 | Expected END |
| IHoldStack.mod | Parser: Expected expression | 2955 | Expected expression |
| IId.mod | Parser: Expected expression | 255 | Expected expression |
| ILicenseManager.mod | Parser: Expected METHOD | 592 | Expected METHOD |
| IMath.mod | Parser: Expected PROCEDURE | 204 | Expected PROCEDURE |
| IMathKDM.mod | Parser: Expected PROCEDURE | 209 | Expected PROCEDURE |
| INewFlightLevelKDM.mod | Parser: Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM | 3 | Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM |
| IReader.mod | Parser: Expected expression | 970 | Expected expression |
| IRunway.mod | Parser: Expected expression | 2079 | Expected expression |
| IRunwayKDM.mod | Parser: Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM | 1 | Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM |
| ISmoothFPC.mod | Parser: Expected expression | 1552 | Expected expression |
| ITempFlightLevelKDM.mod | Parser: Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM | 3 | Expected DEFINITION, IMPLEMENTATION, MAIN, or PROGRAM |
| ITrafficExchange.mod | Parser: Expected PROCEDURE | 77 | Expected PROCEDURE |
| IWindowPierce.mod | Parser: Expected expression | 5117 | Expected expression |
| IWiredFlight.mod | Parser: Expected PROCEDURE | 239 | Expected PROCEDURE |
| IXEventTrack.mod | Parser: Expected expression | 615 | Expected expression |


