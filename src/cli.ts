#!/usr/bin/env node
import { program } from 'commander';

const packageJson = require('../package.json');

program
  .name('modsim-language-server')
  .description('Language Server Protocol implementation for MODSIM III')
  .version(packageJson.version);

program
  .option('--stdio', 'Use stdio for communication (default)', true)
  .option('--socket <port>', 'Use TCP socket on specified port')
  .option('--pipe <name>', 'Use named pipe for communication')
  .option('--log-level <level>', 'Logging level (error, warn, info, debug)', 'info')
  .option('--log-file <path>', 'Write logs to file')
  .action((options) => {
    if (options.socket || options.pipe) {
      console.error('Socket and pipe modes not yet implemented. Use --stdio (default).');
      process.exit(1);
    }

    // Start the LSP server in stdio mode
    // The server.ts file automatically starts listening when imported
    require('./server');
  });

program.parse(process.argv);
