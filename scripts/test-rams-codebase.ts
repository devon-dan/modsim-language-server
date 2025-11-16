/**
 * RAMS Codebase LSP Feature Validation Script
 * Tests all advanced LSP features against the 988 .mod files in the RAMS codebase
 */

import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from '../src/language/lexer';
import { Parser } from '../src/language/parser';
import { SemanticAnalyzer } from '../src/language/analyzer';
import { getFoldingRanges } from '../src/features/foldingRanges';
import { getDocumentHighlights } from '../src/features/documentHighlight';
import { prepareRename } from '../src/features/rename';
import { WorkspaceManager } from '../src/utils/workspace';

interface FileStats {
  filePath: string;
  lines: number;
  symbols: number;
  foldingRanges: number;
  parseSuccess: boolean;
  parseError?: string;
  lexerErrors: number;
  analyzerErrors: number;
}

interface Summary {
  totalFiles: number;
  successfulParses: number;
  failedParses: number;
  totalLines: number;
  totalSymbols: number;
  totalFoldingRanges: number;
  totalLexerErrors: number;
  totalAnalyzerErrors: number;
  largestFile: { path: string; lines: number };
  mostSymbols: { path: string; symbols: number };
  failedFiles: string[];
}

const RAMS_SOURCE_DIR = path.join(__dirname, '../../source');
const workspaceManager = new WorkspaceManager();

/**
 * Get all .mod files in the RAMS source directory
 */
function getAllModFiles(): string[] {
  const files: string[] = [];

  function traverseDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        traverseDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.mod')) {
        files.push(fullPath);
      }
    }
  }

  traverseDir(RAMS_SOURCE_DIR);
  return files;
}

/**
 * Test a single .mod file
 */
function testFile(filePath: string): FileStats {
  const stats: FileStats = {
    filePath: path.relative(RAMS_SOURCE_DIR, filePath),
    lines: 0,
    symbols: 0,
    foldingRanges: 0,
    parseSuccess: false,
    lexerErrors: 0,
    analyzerErrors: 0,
  };

  try {
    // Read file
    const content = fs.readFileSync(filePath, 'utf-8');
    stats.lines = content.split('\n').length;

    // Lexer
    const lexer = new Lexer(content);
    const tokens = lexer.tokenize();
    stats.lexerErrors = tokens.filter(t => t.type === 'ERROR').length;

    // Parser
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // Semantic Analysis
    const analyzer = new SemanticAnalyzer();
    const diagnostics = analyzer.analyze(ast);
    stats.analyzerErrors = diagnostics.filter(d => d.severity === 'Error').length;

    const symbolTable = analyzer.getSymbolTable();
    stats.symbols = symbolTable.getAllSymbols().length;

    // Folding Ranges
    const foldingRanges = getFoldingRanges(ast);
    stats.foldingRanges = foldingRanges.length;

    stats.parseSuccess = true;
  } catch (error: any) {
    stats.parseSuccess = false;
    stats.parseError = error.message;
  }

  return stats;
}

/**
 * Test a sample of files with document highlight and rename
 */
function testAdvancedFeatures(files: string[], sampleSize: number = 10): void {
  console.log(`\n${'='.repeat(80)}`);
  console.log('TESTING ADVANCED FEATURES (Sample of files)');
  console.log('='.repeat(80));

  // Select random sample
  const sample = files
    .sort(() => 0.5 - Math.random())
    .slice(0, sampleSize);

  let highlightTests = 0;
  let highlightSuccesses = 0;
  let renameTests = 0;
  let renameSuccesses = 0;

  for (const filePath of sample) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);

      // Lexer & Parser
      const lexer = new Lexer(content);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Semantic Analysis
      const analyzer = new SemanticAnalyzer();
      analyzer.analyze(ast);
      const symbolTable = analyzer.getSymbolTable();

      const symbols = symbolTable.getAllSymbols();
      if (symbols.length === 0) continue;

      // Test document highlight on first symbol
      const firstSymbol = symbols[0];
      highlightTests++;
      try {
        const highlights = getDocumentHighlights(
          ast,
          symbolTable,
          firstSymbol.declaration.line - 1,
          firstSymbol.declaration.column - 1,
          `file://${filePath}`,
          workspaceManager
        );

        if (highlights && highlights.length > 0) {
          highlightSuccesses++;
          console.log(`  ✓ ${fileName}: Document highlight for '${firstSymbol.name}' (${highlights.length} occurrences)`);
        }
      } catch (error: any) {
        console.log(`  ✗ ${fileName}: Document highlight failed - ${error.message}`);
      }

      // Test rename preparation on second symbol (if available)
      if (symbols.length > 1) {
        const secondSymbol = symbols[1];
        renameTests++;
        try {
          const renameRange = prepareRename(
            ast,
            symbolTable,
            secondSymbol.declaration.line - 1,
            secondSymbol.declaration.column - 1
          );

          if (renameRange) {
            renameSuccesses++;
            console.log(`  ✓ ${fileName}: Rename prepared for '${secondSymbol.name}'`);
          }
        } catch (error: any) {
          console.log(`  ✗ ${fileName}: Rename preparation failed - ${error.message}`);
        }
      }
    } catch (error: any) {
      // Skip files with parse errors
      continue;
    }
  }

  console.log(`\nAdvanced Features Summary:`);
  console.log(`  Document Highlight: ${highlightSuccesses}/${highlightTests} successful`);
  console.log(`  Rename Preparation: ${renameSuccesses}/${renameTests} successful`);
}

/**
 * Main test execution
 */
function main() {
  console.log('='.repeat(80));
  console.log('RAMS CODEBASE LSP FEATURE VALIDATION');
  console.log('='.repeat(80));
  console.log(`Source directory: ${RAMS_SOURCE_DIR}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  // Get all .mod files
  const modFiles = getAllModFiles();
  console.log(`Found ${modFiles.length} .mod files\n`);

  // Initialize summary
  const summary: Summary = {
    totalFiles: modFiles.length,
    successfulParses: 0,
    failedParses: 0,
    totalLines: 0,
    totalSymbols: 0,
    totalFoldingRanges: 0,
    totalLexerErrors: 0,
    totalAnalyzerErrors: 0,
    largestFile: { path: '', lines: 0 },
    mostSymbols: { path: '', symbols: 0 },
    failedFiles: [],
  };

  // Test all files
  console.log('Testing all files...');
  const startTime = Date.now();
  const allStats: FileStats[] = [];

  for (let i = 0; i < modFiles.length; i++) {
    const filePath = modFiles[i];
    const stats = testFile(filePath);
    allStats.push(stats);

    // Update summary
    if (stats.parseSuccess) {
      summary.successfulParses++;
      summary.totalLines += stats.lines;
      summary.totalSymbols += stats.symbols;
      summary.totalFoldingRanges += stats.foldingRanges;
      summary.totalLexerErrors += stats.lexerErrors;
      summary.totalAnalyzerErrors += stats.analyzerErrors;

      if (stats.lines > summary.largestFile.lines) {
        summary.largestFile = { path: stats.filePath, lines: stats.lines };
      }

      if (stats.symbols > summary.mostSymbols.symbols) {
        summary.mostSymbols = { path: stats.filePath, symbols: stats.symbols };
      }
    } else {
      summary.failedParses++;
      summary.failedFiles.push(stats.filePath);
    }

    // Progress indicator
    if ((i + 1) % 100 === 0 || i === modFiles.length - 1) {
      const progress = ((i + 1) / modFiles.length * 100).toFixed(1);
      process.stdout.write(`\rProgress: ${i + 1}/${modFiles.length} (${progress}%) - Successes: ${summary.successfulParses}, Failures: ${summary.failedParses}`);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`\n\nCompleted in ${duration} seconds\n`);

  // Print summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total files:            ${summary.totalFiles}`);
  console.log(`Successful parses:      ${summary.successfulParses} (${(summary.successfulParses / summary.totalFiles * 100).toFixed(1)}%)`);
  console.log(`Failed parses:          ${summary.failedParses} (${(summary.failedParses / summary.totalFiles * 100).toFixed(1)}%)`);
  console.log(`\nCode Statistics:`);
  console.log(`  Total lines:          ${summary.totalLines.toLocaleString()}`);
  console.log(`  Total symbols:        ${summary.totalSymbols.toLocaleString()}`);
  console.log(`  Total folding ranges: ${summary.totalFoldingRanges.toLocaleString()}`);
  console.log(`  Lexer errors:         ${summary.totalLexerErrors.toLocaleString()}`);
  console.log(`  Analyzer errors:      ${summary.totalAnalyzerErrors.toLocaleString()}`);
  console.log(`\nFile Records:`);
  console.log(`  Largest file:         ${summary.largestFile.path} (${summary.largestFile.lines.toLocaleString()} lines)`);
  console.log(`  Most symbols:         ${summary.mostSymbols.path} (${summary.mostSymbols.symbols.toLocaleString()} symbols)`);

  // Show failed files
  if (summary.failedFiles.length > 0) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('FAILED FILES');
    console.log('='.repeat(80));

    // Group by error type
    const errorGroups = new Map<string, string[]>();

    for (const stats of allStats) {
      if (!stats.parseSuccess && stats.parseError) {
        const errorKey = stats.parseError.split('\n')[0]; // First line of error
        if (!errorGroups.has(errorKey)) {
          errorGroups.set(errorKey, []);
        }
        errorGroups.get(errorKey)!.push(stats.filePath);
      }
    }

    for (const [error, files] of errorGroups) {
      console.log(`\n${error} (${files.length} files):`);
      files.slice(0, 5).forEach(f => console.log(`  - ${f}`));
      if (files.length > 5) {
        console.log(`  ... and ${files.length - 5} more`);
      }
    }
  }

  // Test advanced features on sample
  if (summary.successfulParses > 0) {
    const successfulFiles = modFiles.filter((_, i) => allStats[i].parseSuccess);
    testAdvancedFeatures(successfulFiles, Math.min(20, successfulFiles.length));
  }

  // Save detailed results
  const resultsPath = path.join(__dirname, '../../test-results/rams-validation-results.json');
  const resultsDir = path.dirname(resultsPath);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(
    resultsPath,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      duration,
      summary,
      detailedStats: allStats,
    }, null, 2)
  );

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Detailed results saved to: ${path.relative(process.cwd(), resultsPath)}`);
  console.log('='.repeat(80));

  // Exit code based on success rate
  const successRate = summary.successfulParses / summary.totalFiles;
  if (successRate >= 0.95) {
    console.log('\n✓ VALIDATION PASSED (≥95% success rate)');
    process.exit(0);
  } else if (successRate >= 0.90) {
    console.log('\n⚠ VALIDATION PARTIAL (≥90% success rate)');
    process.exit(0);
  } else {
    console.log('\n✗ VALIDATION FAILED (<90% success rate)');
    process.exit(1);
  }
}

// Run the validation
main();
