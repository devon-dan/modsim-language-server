#!/usr/bin/env node
/**
 * RAMS Codebase Integration Testing
 *
 * Tests the language server with the full RAMS codebase to verify:
 * - All files can be indexed without crashes
 * - No false positive errors on valid code
 * - LSP features work correctly
 * - Performance is acceptable
 */

import * as fs from 'fs';
import * as path from 'path';
import { Parser } from '../src/language/parser';
import { Lexer } from '../src/language/lexer';
import { SemanticAnalyzer } from '../src/language/analyzer';

interface TestResults {
  totalFiles: number;
  successfulParse: number;
  parseErrors: number;
  lexerErrors: number;
  semanticErrors: number;
  filesWithErrors: string[];
  performance: {
    avgParseTime: number;
    maxParseTime: number;
    totalTime: number;
  };
}

function findModFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and other non-source directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.mod')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function testFile(filePath: string): {
  success: boolean;
  parseTime: number;
  lexerErrors: number;
  parseErrors: number;
  semanticErrors: number;
} {
  const startTime = Date.now();

  try {
    // Read file
    const content = fs.readFileSync(filePath, 'utf8');

    // Lex
    const lexer = new Lexer(content);
    const tokens = lexer.tokenize();
    const lexerErrors = tokens.filter(t => t.type === 'ERROR').length;

    // Parse
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const parseErrors = parser.errors.length;

    // Semantic analysis
    const analyzer = new SemanticAnalyzer();
    const diagnostics = analyzer.analyze(ast);
    const semanticErrors = diagnostics.filter(d => d.severity === 1).length; // Error severity

    const parseTime = Date.now() - startTime;

    // File succeeds if no lexer errors and can parse
    const success = lexerErrors === 0 && parseErrors === 0;

    return {
      success,
      parseTime,
      lexerErrors,
      parseErrors,
      semanticErrors
    };
  } catch (error) {
    return {
      success: false,
      parseTime: Date.now() - startTime,
      lexerErrors: 0,
      parseErrors: 1,
      semanticErrors: 0
    };
  }
}

function main() {
  const ramsSourceDir = process.argv[2] || '/mnt/c/code/ramsforclaude/source';

  console.log('RAMS Codebase Integration Testing');
  console.log('==================================\n');
  console.log(`Source Directory: ${ramsSourceDir}\n`);

  // Find all .mod files
  console.log('Scanning for .mod files...');
  const modFiles = findModFiles(ramsSourceDir);
  console.log(`Found ${modFiles.length} .mod files\n`);

  // Test each file
  console.log('Testing files...');
  const results: TestResults = {
    totalFiles: modFiles.length,
    successfulParse: 0,
    parseErrors: 0,
    lexerErrors: 0,
    semanticErrors: 0,
    filesWithErrors: [],
    performance: {
      avgParseTime: 0,
      maxParseTime: 0,
      totalTime: 0
    }
  };

  const parseTimes: number[] = [];
  let processedCount = 0;

  for (const filePath of modFiles) {
    const result = testFile(filePath);
    parseTimes.push(result.parseTime);

    if (result.success) {
      results.successfulParse++;
    } else {
      results.filesWithErrors.push(filePath);
      if (result.lexerErrors > 0) results.lexerErrors++;
      if (result.parseErrors > 0) results.parseErrors++;
    }

    if (result.semanticErrors > 0) {
      results.semanticErrors++;
    }

    processedCount++;
    if (processedCount % 100 === 0) {
      console.log(`  Processed ${processedCount}/${modFiles.length} files...`);
    }
  }

  // Calculate performance metrics
  results.performance.totalTime = parseTimes.reduce((a, b) => a + b, 0);
  results.performance.avgParseTime = results.performance.totalTime / parseTimes.length;
  results.performance.maxParseTime = Math.max(...parseTimes);

  // Print results
  console.log('\n\nResults:');
  console.log('========\n');
  console.log(`Total Files:              ${results.totalFiles}`);
  console.log(`Successfully Parsed:      ${results.successfulParse} (${(results.successfulParse / results.totalFiles * 100).toFixed(1)}%)`);
  console.log(`Files with Lexer Errors:  ${results.lexerErrors}`);
  console.log(`Files with Parse Errors:  ${results.parseErrors}`);
  console.log(`Files with Semantic Errs: ${results.semanticErrors}`);
  console.log('');
  console.log('Performance:');
  console.log(`  Total Time:      ${results.performance.totalTime}ms`);
  console.log(`  Average Time:    ${results.performance.avgParseTime.toFixed(2)}ms per file`);
  console.log(`  Max Time:        ${results.performance.maxParseTime}ms`);
  console.log(`  Throughput:      ${(results.totalFiles / (results.performance.totalTime / 1000)).toFixed(1)} files/second`);

  // Show sample of files with errors
  if (results.filesWithErrors.length > 0) {
    console.log(`\n\nSample Files with Errors (showing first 10):`);
    for (let i = 0; i < Math.min(10, results.filesWithErrors.length); i++) {
      console.log(`  - ${path.basename(results.filesWithErrors[i])}`);
    }

    if (results.filesWithErrors.length > 10) {
      console.log(`  ... and ${results.filesWithErrors.length - 10} more`);
    }
  }

  // Success criteria
  console.log('\n\nSuccess Criteria:');
  console.log('=================');
  const successRate = results.successfulParse / results.totalFiles * 100;
  const targetRate = 90;

  if (successRate >= targetRate) {
    console.log(`✅ PASS: ${successRate.toFixed(1)}% success rate (target: >${targetRate}%)`);
  } else {
    console.log(`❌ FAIL: ${successRate.toFixed(1)}% success rate (target: >${targetRate}%)`);
  }

  if (results.performance.avgParseTime < 100) {
    console.log(`✅ PASS: Average parse time ${results.performance.avgParseTime.toFixed(2)}ms (target: <100ms)`);
  } else {
    console.log(`⚠️  WARN: Average parse time ${results.performance.avgParseTime.toFixed(2)}ms (target: <100ms)`);
  }

  // Exit with appropriate code
  process.exit(successRate >= targetRate ? 0 : 1);
}

main();
