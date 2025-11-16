/**
 * Diagnostic messages for MODSIM III semantic analysis
 */

export enum DiagnosticSeverity {
  Error = 'Error',
  Warning = 'Warning',
  Information = 'Information',
  Hint = 'Hint',
}

export interface Diagnostic {
  severity: DiagnosticSeverity;
  message: string;
  start: {
    line: number;
    column: number;
    offset: number;
  };
  end: {
    line: number;
    column: number;
    offset: number;
  };
  code?: string; // Optional error code
  source?: string; // Optional source (e.g., "modsim-analyzer")
}

/**
 * Create an error diagnostic
 */
export function createError(
  message: string,
  start: { line: number; column: number; offset: number },
  end: { line: number; column: number; offset: number },
  code?: string
): Diagnostic {
  return {
    severity: DiagnosticSeverity.Error,
    message,
    start,
    end,
    code,
    source: 'modsim-analyzer',
  };
}

/**
 * Create a warning diagnostic
 */
export function createWarning(
  message: string,
  start: { line: number; column: number; offset: number },
  end: { line: number; column: number; offset: number },
  code?: string
): Diagnostic {
  return {
    severity: DiagnosticSeverity.Warning,
    message,
    start,
    end,
    code,
    source: 'modsim-analyzer',
  };
}

/**
 * Create an information diagnostic
 */
export function createInfo(
  message: string,
  start: { line: number; column: number; offset: number },
  end: { line: number; column: number; offset: number },
  code?: string
): Diagnostic {
  return {
    severity: DiagnosticSeverity.Information,
    message,
    start,
    end,
    code,
    source: 'modsim-analyzer',
  };
}

/**
 * Create a hint diagnostic
 */
export function createHint(
  message: string,
  start: { line: number; column: number; offset: number },
  end: { line: number; column: number; offset: number },
  code?: string
): Diagnostic {
  return {
    severity: DiagnosticSeverity.Hint,
    message,
    start,
    end,
    code,
    source: 'modsim-analyzer',
  };
}
