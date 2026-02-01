import { spawn, SpawnOptions } from 'child_process';
import * as pty from 'node-pty';

/**
 * Result of running a command
 */
export interface RunResult {
  /** Standard output from the command */
  stdout: string;
  /** Standard error output from the command */
  stderr: string;
  /** Exit code (0 = success, non-zero = error) */
  exitCode: number;
}

/** Debug logging - enable with AIC_DEBUG=1 */
const DEBUG = process.env.AIC_DEBUG === '1';

/**
 * Log debug information when AIC_DEBUG=1 is set
 * @param context - The context/function name for the log
 * @param message - The message to log
 * @param data - Optional data to include
 */
export function debugLog(context: string, message: string, data?: Record<string, unknown>): void {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString().slice(11, 23);
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [${context}] ${message}${dataStr}`);
}

/**
 * Run a command and capture its output (non-interactive).
 *
 * This function spawns a child process and captures stdout/stderr.
 * On Windows, it uses shell execution to properly resolve .cmd files
 * from npm global packages.
 *
 * @param command - The command to run (e.g., 'claude', 'gemini')
 * @param args - Array of arguments to pass to the command
 * @param options - Spawn options (cwd, env, etc.)
 * @param input - Optional input to write to stdin (for passing prompts)
 * @returns Promise resolving to RunResult with stdout, stderr, and exitCode
 * @throws Error if the command fails to spawn (e.g., ENOENT)
 *
 * @example
 * ```typescript
 * const result = await runCommand('claude', ['-p', '--output-format', 'json'], {}, 'Hello');
 * if (result.exitCode === 0) {
 *   console.log(result.stdout);
 * }
 * ```
 */
export async function runCommand(
  command: string,
  args: string[],
  options: SpawnOptions = {},
  input?: string
): Promise<RunResult> {
  debugLog('runCommand', `Executing: ${command}`, { args, hasInput: !!input, cwd: options.cwd });

  return new Promise((resolve, reject) => {
    const hasInput = input !== undefined;

    let proc;
    try {
      proc = spawn(command, args, {
        ...options,
        stdio: [hasInput ? 'pipe' : 'ignore', 'pipe', 'pipe'],
        // On Windows, npm global packages are .cmd files which require shell execution
        shell: process.platform === 'win32',
      });
    } catch (spawnError) {
      debugLog('runCommand', `Spawn failed: ${spawnError}`);
      reject(new Error(`Failed to spawn command "${command}": ${spawnError}`));
      return;
    }

    // Handle stdin with EPIPE protection
    // If the process crashes immediately, writing to stdin throws EPIPE
    if (hasInput && proc.stdin) {
      proc.stdin.on('error', (err: NodeJS.ErrnoException) => {
        // EPIPE errors happen when the process closes before we finish writing
        // This is expected in some error cases - don't crash the parent process
        if (err.code !== 'EPIPE') {
          debugLog('runCommand', `Stdin error: ${err.message}`, { code: err.code });
        }
      });

      try {
        proc.stdin.write(input);
        proc.stdin.end();
      } catch (writeError) {
        debugLog('runCommand', `Stdin write failed: ${writeError}`);
        // Continue execution - let the process exit handling capture the error
      }
    }

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err: NodeJS.ErrnoException) => {
      debugLog('runCommand', `Process error: ${err.message}`, { code: err.code });

      // Provide actionable error messages
      if (err.code === 'ENOENT') {
        reject(new Error(
          `Command "${command}" not found. ` +
          `Please ensure it is installed and available in your PATH.\n` +
          `On Windows, try running: where ${command}\n` +
          `On Unix, try running: which ${command}`
        ));
      } else if (err.code === 'EACCES') {
        reject(new Error(
          `Permission denied executing "${command}". ` +
          `Check file permissions or try running with elevated privileges.`
        ));
      } else {
        reject(err);
      }
    });

    proc.on('close', (code) => {
      debugLog('runCommand', `Process exited`, { exitCode: code, stdoutLen: stdout.length, stderrLen: stderr.length });
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      });
    });
  });
}

/**
 * Result of running a command in a PTY
 */
export interface PtyRunResult {
  /** Combined output from the PTY session */
  output: string;
  /** Exit code of the PTY process */
  exitCode: number;
}

/**
 * Options for running a command in a PTY
 */
export interface PtyRunOptions {
  /** Working directory for the command */
  cwd?: string;
  /** Keep stdin open after command completes (for interactive sessions) */
  keepStdinOpen?: boolean;
  /** Initial input to send to the process after startup */
  initialInput?: string;
}

/**
 * Run a command interactively using a PTY (pseudo-terminal).
 *
 * This provides a full terminal experience with:
 * - Color and formatting preservation
 * - User interaction (approve commands, answer prompts)
 * - Real-time output streaming
 * - Output capture for forwarding
 *
 * @param command - The command to run
 * @param args - Array of arguments
 * @param options - PTY options including cwd, keepStdinOpen, and initialInput
 * @returns Promise resolving to PtyRunResult with output and exitCode
 *
 * @example
 * ```typescript
 * const result = await runCommandPty('claude', ['--session-id', 'abc123']);
 * console.log('Session output:', result.output);
 * ```
 */
export async function runCommandPty(
  command: string,
  args: string[],
  options: PtyRunOptions = {}
): Promise<PtyRunResult> {
  return new Promise((resolve, reject) => {
    let output = '';
    
    // Get terminal size
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;
    
    // Remember stdin state before PTY
    const wasRawMode = process.stdin.isTTY && (process.stdin as any).isRaw;
    
    // Spawn PTY
    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: options.cwd || process.cwd(),
      env: process.env as { [key: string]: string },
    });
    
    // Handle terminal resize
    const onResize = () => {
      ptyProcess.resize(
        process.stdout.columns || 80,
        process.stdout.rows || 24
      );
    };
    process.stdout.on('resize', onResize);
    
    // Stream output to terminal AND capture it
    ptyProcess.onData((data) => {
      output += data;
      process.stdout.write(data);
    });
    
    // Send initial input if provided (e.g., for slash commands)
    if (options.initialInput) {
      // Small delay to let the process start
      setTimeout(() => {
        ptyProcess.write(options.initialInput!);
      }, 100);
    }
    
    // Forward user input to PTY
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    
    const onStdinData = (data: Buffer) => {
      ptyProcess.write(data.toString());
    };
    process.stdin.on('data', onStdinData);
    
    // Handle exit
    ptyProcess.onExit(({ exitCode }) => {
      // Cleanup
      process.stdin.removeListener('data', onStdinData);
      process.stdout.removeListener('resize', onResize);
      
      // Restore stdin state
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(wasRawMode);
      }
      
      // Don't pause stdin if caller wants to keep it open (e.g., interactive session)
      if (!options.keepStdinOpen) {
        process.stdin.pause();
      }
      
      resolve({
        output,
        exitCode,
      });
    });
  });
}

import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Check if a command exists in the system PATH.
 *
 * Uses 'where' on Windows and 'which' on Unix-like systems.
 * Also checks common installation paths as a fallback.
 *
 * @param command - The command name to check (e.g., 'claude', 'gemini')
 * @returns Promise resolving to true if command exists, false otherwise
 *
 * @example
 * ```typescript
 * if (await commandExists('claude')) {
 *   console.log('Claude Code is installed');
 * }
 * ```
 */
export async function commandExists(command: string): Promise<boolean> {
  const resolved = await resolveCommandPath(command);
  return resolved !== null;
}

/**
 * Resolve the absolute path of a command.
 *
 * This function:
 * 1. Validates the command name for security (alphanumeric, dash, underscore only)
 * 2. Uses 'where' (Windows) or 'which' (Unix) to find the command
 * 3. Falls back to checking common installation paths
 * 4. On Windows, checks for .exe, .cmd, and .ps1 extensions
 *
 * @param command - The command name to resolve
 * @returns Promise resolving to the absolute path, or null if not found
 *
 * @example
 * ```typescript
 * const claudePath = await resolveCommandPath('claude');
 * if (claudePath) {
 *   console.log(`Claude found at: ${claudePath}`);
 * }
 * ```
 */
export async function resolveCommandPath(command: string): Promise<string | null> {
  // Security: Validate command name to prevent injection
  // Only allow alphanumeric, dash, and underscore
  // If it contains slashes/backslashes, assume it's already a path and return as is (if valid)
  if (command.includes('/') || command.includes('\\')) {
    return existsSync(command) ? command : null;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(command)) {
    return null;
  }

  // 1. Try 'which' / 'where' first (system PATH)
  try {
    const whichCommand = process.platform === 'win32' ? 'where' : 'which';
    const result = await runCommand(whichCommand, [command]);
    
    if (result.exitCode === 0 && result.stdout.trim().length > 0) {
      // Get first line in case of multiple results
      const lines = result.stdout.trim().split(/\r?\n/);
      const path = lines[0].trim();
      if (path && existsSync(path)) {
        return path;
      }
    }
  } catch {
    // Ignore errors from 'which'
  }

  // 2. Check common locations manually (if 'which' failed or returned invalid path)
  const commonPaths = [
    '/opt/homebrew/bin',          // Apple Silicon Homebrew
    '/usr/local/bin',             // Intel Mac / Linux
    '/usr/bin',                   // Standard System
    join(homedir(), '.npm-global', 'bin'), // Common manual npm global path
    // Add more if needed
  ];

  for (const dir of commonPaths) {
    const fullPath = join(dir, command);
    if (process.platform === 'win32') {
      // On Windows, check for .exe, .cmd, .ps1
      if (existsSync(fullPath + '.exe')) return fullPath + '.exe';
      if (existsSync(fullPath + '.cmd')) return fullPath + '.cmd';
      if (existsSync(fullPath + '.ps1')) return fullPath + '.ps1';
    } else {
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

/**
 * Strip ANSI escape codes from a string.
 *
 * Removes all ANSI escape sequences including:
 * - Color codes (e.g., \x1b[31m for red)
 * - Cursor movement codes
 * - Screen clear codes
 *
 * @param str - The string containing ANSI escape codes
 * @returns The string with all ANSI codes removed
 *
 * @example
 * ```typescript
 * const clean = stripAnsi('\x1b[31mRed Text\x1b[0m');
 * console.log(clean); // "Red Text"
 * ```
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

/**
 * Truncate text to a maximum length with ellipsis.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length including ellipsis
 * @returns The truncated text, or original if under maxLength
 *
 * @example
 * ```typescript
 * truncate('Hello World', 8); // "Hello..."
 * truncate('Short', 10);      // "Short"
 * ```
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format a tool response for display with decorative separators.
 *
 * @param toolName - Name of the tool that generated the response
 * @param response - The response content to format
 * @returns Formatted string with separators and tool name header
 */
export function formatResponse(toolName: string, response: string): string {
  const separator = '─'.repeat(60);
  return `\n${separator}\n[${toolName}]\n${separator}\n${response}\n${separator}\n`;
}

/**
 * Get the version of a CLI tool asynchronously.
 *
 * Runs the command with -v flag and extracts the version number.
 * Uses runCommand to avoid blocking the main thread.
 *
 * @param command - The CLI command to check (e.g., 'claude', 'gemini')
 * @returns Promise resolving to version string, or null if unavailable
 *
 * @example
 * ```typescript
 * const version = await getToolVersionAsync('claude');
 * if (version) {
 *   console.log(`Claude Code version: ${version}`);
 * }
 * ```
 */
export async function getToolVersionAsync(command: string): Promise<string | null> {
  try {
    const { stdout, stderr, exitCode } = await runCommand(command, ['-v']);
    if (exitCode !== 0) return null;

    // Some tools output version to stderr
    const output = (stdout || stderr).trim();
    if (!output) return null;

    // Extract version number (first line, clean up)
    const firstLine = output.split('\n')[0];
    // Handle formats like "2.0.59 (Claude Code)" or just "0.19.1"
    const version = firstLine.split(' ')[0];
    return version || null;
  } catch {
    return null;
  }
}
