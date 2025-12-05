#!/usr/bin/env node

import { Command } from 'commander';
import { AdapterRegistry, ClaudeAdapter, GeminiAdapter } from './adapters/index.js';
import { loadConfig } from './config.js';
import { startSDKSession } from './sdk-session.js';

const program = new Command();

// Initialize adapters
const registry = new AdapterRegistry();
registry.register(new ClaudeAdapter());
registry.register(new GeminiAdapter());

// Load config
const config = loadConfig();

const HELP_TEXT = `
AIC² - AI Code Connect
Bridge Claude Code and Gemini CLI in a single session.

Session Commands:
  //claude              Switch to Claude Code
  //gemini              Switch to Gemini CLI
  //i                   Enter interactive mode (Ctrl+] to detach)
  //forward [tool] [msg] Forward last response to another tool
  //history             Show conversation history
  //status              Show running processes
  //clear               Clear sessions and history
  //quit, //cya         Exit

Forward Behavior:
  With 2 tools:  //forward           Auto-selects the other tool
  With 3+ tools: //forward <tool>    Target tool required

Examples:
  aic                   Launch interactive session
  aic tools             List available AI tools
`;

program
  .name('aic')
  .description('AIC² - AI Code Connect\nBridge Claude Code and Gemini CLI')
  .version('1.0.0')
  .addHelpText('after', HELP_TEXT);

// Tools command - list available tools
program
  .command('tools')
  .description('List available AI tools and their status')
  .action(async () => {
    console.log('Available tools:\n');
    for (const adapter of registry.getAll()) {
      const available = await adapter.isAvailable();
      const status = available ? '✓ available' : '✗ not found';
      console.log(`  ${adapter.name.padEnd(10)} ${adapter.displayName.padEnd(15)} ${status}`);
    }
  });

// Default action - start interactive session
program
  .action(async () => {
    await startSDKSession();
  });

program.parse();
