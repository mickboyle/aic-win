#!/usr/bin/env node

import { Command } from 'commander';
import { AdapterRegistry, ClaudeAdapter, GeminiAdapter } from './adapters/index.js';
import { loadConfig, getDefaultTool, setDefaultTool, getConfigPath } from './config.js';
import { startSDKSession } from './sdk-session.js';
import { VERSION } from './version.js';

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
  /claude               Switch to Claude Code
  /gemini               Switch to Gemini CLI
  /i                    Enter interactive mode (Ctrl+] to detach)
  /forward [tool] [msg] Forward last response to another tool
  /history              Show conversation history
  /status               Show running processes
  /default <tool>       Set default tool (saved permanently)
  /clear                Clear sessions and history
  /quit, /cya           Exit

Tool Commands:
  //command             Run /command in interactive mode (e.g., //status, //cost)

Configuration:
  aic config default [tool]   Get or set default tool
  AIC_DEFAULT_TOOL=gemini     Override via environment variable

Forward Behavior:
  With 2 tools:  /forward            Auto-selects the other tool
  With 3+ tools: /forward <tool>     Target tool required

Examples:
  aic                         Launch interactive session
  aic tools                   List available AI tools
  aic config default gemini   Set Gemini as default tool
`;

program
  .name('aic')
  .description('AIC² - AI Code Connect\nBridge Claude Code and Gemini CLI')
  .version(VERSION)
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

// Config command
const configCmd = program
  .command('config')
  .description('Manage AIC² configuration');

configCmd
  .command('default [tool]')
  .description('Get or set the default tool (claude, gemini)')
  .action((tool?: string) => {
    if (tool) {
      // Set default tool
      const result = setDefaultTool(tool);
      if (result.success) {
        console.log(`✓ ${result.message}`);
      } else {
        console.error(`✗ ${result.message}`);
        process.exit(1);
      }
    } else {
      // Show current default
      const currentDefault = getDefaultTool();
      const configPath = getConfigPath();
      console.log(`Default tool: ${currentDefault}`);
      console.log(`Config file: ${configPath}`);
      
      // Check if env var is overriding
      if (process.env.AIC_DEFAULT_TOOL) {
        console.log(`(Overridden by AIC_DEFAULT_TOOL environment variable)`);
      }
    }
  });

// Default action - start interactive session
program
  .action(async () => {
    await startSDKSession(registry);
  });

program.parse();
