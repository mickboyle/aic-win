import { ToolAdapter, SendOptions } from './base.js';
import { runCommand, commandExists, stripAnsi, debugLog } from '../utils.js';

/**
 * Adapter for Google's Gemini CLI.
 *
 * This adapter provides integration with Google's Gemini CLI tool.
 *
 * Features:
 * - Non-interactive mode via positional query argument
 * - Output formats: text, json, stream-json (via -o/--output-format)
 * - Session resume via -r/--resume for conversation continuity
 * - YOLO mode via -y/--yolo for auto-approval
 *
 * Installation:
 * ```bash
 * npm install -g @google/gemini-cli
 * ```
 *
 * @see https://github.com/google/gemini-cli
 */
export class GeminiAdapter implements ToolAdapter {
  readonly name = 'gemini';
  readonly displayName = 'Gemini CLI';
  readonly color = '\x1b[95m'; // brightMagenta

  // Gemini shows > at start of line when ready for input
  readonly promptPattern = /^>\s*$/m;

  // Fallback: if no output for 1.5 seconds, assume response complete
  readonly idleTimeout = 1500;

  // Gemini is slower to start (~8 seconds for first launch due to auth/loading)
  readonly startupDelay = 8000;

  private hasActiveSession = false;
  private hasStartedInteractiveSession = false;

  async isAvailable(): Promise<boolean> {
    return commandExists('gemini');
  }
  
  getCommand(prompt: string, options?: SendOptions): string[] {
    const args: string[] = [];

    // JSON output for clean response extraction
    args.push('--output-format', 'json');

    // Resume previous session if we've already made a call (non-interactive or interactive)
    const shouldContinue = options?.continueSession !== false &&
      (this.hasActiveSession || this.hasStartedInteractiveSession);
    if (shouldContinue) {
      args.push('--resume', 'latest');
    }

    // Note: Don't use --include-directories here because it takes an array and would
    // consume the prompt. The cwd is set when spawning the process.

    // Add the prompt as the last argument (positional)
    args.push(prompt);

    return ['gemini', ...args];
  }

  getInteractiveCommand(options?: SendOptions): string[] {
    const args: string[] = [];
    // Resume session if we have one (non-interactive or interactive)
    if (options?.continueSession !== false &&
        (this.hasActiveSession || this.hasStartedInteractiveSession)) {
      args.push('--resume', 'latest');
    }
    return ['gemini', ...args];
  }

  getPersistentArgs(): string[] {
    // Resume previous session if we have one from regular mode OR
    // if we've already started an interactive session (for respawns after exit)
    if (this.hasActiveSession || this.hasStartedInteractiveSession) {
      return ['--resume', 'latest'];
    }
    return [];
  }

  cleanResponse(rawOutput: string): string {
    let output = rawOutput;

    // Remove all ANSI escape sequences first
    output = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    output = output.replace(/\x1b\[\??\d+[hl]/g, '');
    output = output.replace(/\x1b\[\d* ?q/g, '');
    output = output.replace(/\x1b\][^\x07]*\x07/g, ''); // OSC sequences

    // Remove "Loaded cached credentials." line
    output = output.replace(/Loaded cached credentials\.?\s*/g, '');

    // Remove spinner frames (all variants including status indicators)
    output = output.replace(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏·✢✳✶✻✽∴⏺]/g, '');

    // Remove box drawing characters and lines made of them
    output = output.replace(/[╭╮╰╯│─┌┐└┘├┤┬┴┼║═╔╗╚╝╠╣╦╩╬]/g, '');

    // Remove Gemini UI-specific lines
    output = output.replace(/^\s*Using:.*MCP servers?\s*$/gm, '');
    output = output.replace(/^\s*~\/.*\(main\*?\).*$/gm, ''); // Directory status line
    output = output.replace(/^\s*~\/[^\n]*$/gm, ''); // Any directory path line
    output = output.replace(/^\s*no sandbox.*$/gim, '');
    output = output.replace(/^\s*auto\s*$/gm, '');
    output = output.replace(/^\s*Reading.*\(esc to cancel.*\)\s*$/gm, '');
    output = output.replace(/^\s*Type your message or @path.*$/gm, '');
    output = output.replace(/^\s*>\s*Type your message.*$/gm, '');
    output = output.replace(/^\s*\?\s*for shortcuts\s*$/gm, '');
    output = output.replace(/^\s*Try ".*"\s*$/gm, ''); // Suggestion lines

    // Remove thinking/incubating indicators
    output = output.replace(/^\s*∴ Thought for.*$/gm, '');
    output = output.replace(/^\s*✽ Incubating.*$/gm, '');
    output = output.replace(/\(ctrl\+o to show thinking\)/gi, '');
    output = output.replace(/\(esc to interrupt\)/gi, '');
    output = output.replace(/\(esc to cancel.*\)/gi, '');

    // Remove tool status lines (✓ ReadFolder, ✓ ReadFile, etc.)
    output = output.replace(/^\s*[✓✗]\s+\w+.*$/gm, '');

    // Remove the prompt character
    output = output.replace(/^>\s*$/gm, '');

    // Remove "... generating more ..." markers
    output = output.replace(/\.\.\.\s*generating more\s*\.\.\./gi, '');

    // GEMINI-SPECIFIC: Gemini streams code progressively with status indicators.
    // Each indicator is followed by a progressively more complete code block.
    // Unlike Claude (which streams text progressively), Gemini REDRAWS from the beginning.
    // We need to find the LAST occurrence and keep only that final complete block.
    const streamingPatterns = [
      /Defining the Response Strategy/gi,
      /Formulating\s+\w+\s+Code/gi,
      /Formulating\s+\w+\s+Response/gi,
      /Considering\s+the\s+Response\s+Format/gi,
      /Presenting\s+the\s+Code/gi,
      /Presenting\s+the\s+Response/gi,
      /Providing\s+\w+\s+Code\s+Example/gi,
      /Generating\s+\w+\s+Code/gi,
      /Writing\s+the\s+Code/gi,
    ];

    // Find the position after the LAST streaming indicator
    let lastIndicatorEnd = 0;
    for (const pattern of streamingPatterns) {
      const regex = new RegExp(pattern.source, 'gi');
      let match;
      while ((match = regex.exec(output)) !== null) {
        const endPos = match.index + match[0].length;
        if (endPos > lastIndicatorEnd) {
          lastIndicatorEnd = endPos;
        }
      }
    }

    // If we found streaming indicators, take only content after the last one
    if (lastIndicatorEnd > 0) {
      output = output.substring(lastIndicatorEnd).trim();
    } else {
      // Fallback: try the ✦ marker
      const lastMarkerIndex = output.lastIndexOf('✦');
      if (lastMarkerIndex >= 0) {
        output = output.substring(lastMarkerIndex + 1).trim();
      }
    }

    // Remove user prompt lines (lines starting with > followed by the user's message)
    output = output.replace(/^>\s+.+$/gm, '');

    // Clean up any remaining line-based garbage
    const cleanedLines = output.split('\n').filter(line => {
      const trimmed = line.trim();
      // Skip empty UI elements
      if (trimmed.match(/^[\s│─╭╮╰╯]*$/) && trimmed.length < 3) return false;
      return true;
    });
    output = cleanedLines.join('\n');

    // Remove duplicate consecutive lines (from progressive streaming)
    const lines = output.split('\n');
    const dedupedLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const prevLine = dedupedLines[dedupedLines.length - 1];
      // Skip if this line is same as previous (ignoring whitespace)
      if (prevLine !== undefined && line.trim() === prevLine.trim() && line.trim().length > 0) {
        continue;
      }
      dedupedLines.push(line);
    }
    output = dedupedLines.join('\n');

    // Final cleanup
    output = output.replace(/\n{3,}/g, '\n\n');
    output = output.replace(/^\s+$/gm, ''); // Lines with only whitespace

    return output.trim();
  }

  /**
   * Send a prompt to Gemini CLI and get a response.
   *
   * Uses JSON output format for clean response extraction.
   *
   * @param prompt - The prompt to send
   * @param options - Options including cwd, continueSession, timeout
   * @returns Promise resolving to the response text
   * @throws Error if Gemini CLI fails or returns an error
   */
  async send(prompt: string, options?: SendOptions): Promise<string> {
    debugLog('GeminiAdapter.send', 'Sending prompt', {
      promptLength: prompt.length,
      continueSession: options?.continueSession,
    });

    // Use non-interactive runCommand to avoid messing with stdin
    const args = this.getCommand(prompt, options).slice(1); // Remove 'gemini' from start

    debugLog('GeminiAdapter.send', 'Executing command', { argsCount: args.length });

    let result;
    try {
      result = await runCommand('gemini', args, {
        cwd: options?.cwd || process.cwd(),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      debugLog('GeminiAdapter.send', 'Command execution failed', { error: errorMsg });

      // Provide helpful error messages
      if (errorMsg.includes('not found') || errorMsg.includes('ENOENT')) {
        throw new Error(
          'Gemini CLI is not installed or not in PATH.\n' +
          'Install it with: npm install -g @google/gemini-cli\n' +
          'Then run "gemini" once to complete authentication.'
        );
      }
      throw error;
    }

    if (result.exitCode !== 0) {
      debugLog('GeminiAdapter.send', 'Non-zero exit code', {
        exitCode: result.exitCode,
        stderr: result.stderr.slice(0, 200),
      });

      // Try to parse error from JSON response
      try {
        const errorJson = JSON.parse(result.stdout);
        if (errorJson.response) {
          throw new Error(errorJson.response);
        }
      } catch {
        // Fall back to raw error message
      }

      const errorMsg = result.stderr.trim() || result.stdout.trim() || 'Unknown error';

      // Provide specific guidance for common errors
      if (errorMsg.includes('authentication') || errorMsg.includes('credentials')) {
        throw new Error(
          `Gemini CLI authentication error: ${errorMsg}\n` +
          'Run "gemini" interactively to authenticate with your Google account.'
        );
      }

      throw new Error(`Gemini CLI exited with code ${result.exitCode}: ${errorMsg}`);
    }

    // Mark that we now have an active session
    this.hasActiveSession = true;

    // Parse JSON response and extract the response field
    try {
      const jsonResponse = JSON.parse(result.stdout);
      debugLog('GeminiAdapter.send', 'Response received', { resultLength: (jsonResponse.response || '').length });
      return jsonResponse.response || '';
    } catch (parseError) {
      // Fallback: if JSON parsing fails, return raw output (for compatibility)
      debugLog('GeminiAdapter.send', 'JSON parse failed, using raw output');
      return result.stdout.trim();
    }
  }
  
  resetContext(): void {
    this.hasActiveSession = false;
    this.hasStartedInteractiveSession = false;
  }

  /** Mark that an interactive session has been started (for PTY respawns) */
  markInteractiveSessionStarted(): void {
    this.hasStartedInteractiveSession = true;
  }

  /** Check if there's an active session */
  hasSession(): boolean {
    return this.hasActiveSession;
  }

  /** Mark that a session exists (for loading from persisted state) */
  setHasSession(value: boolean): void {
    this.hasActiveSession = value;
  }
}
