# Adding New AI CLI Tools to AIC²

AIC² uses a modular adapter pattern that makes it easy to add new AI CLI tools.

## Architecture

```
src/adapters/
├── base.ts          # ToolAdapter interface & registry
├── claude.ts        # Claude Code adapter
├── gemini.ts        # Gemini CLI adapter
├── index.ts         # Exports all adapters
└── template.ts.example  # Template for new adapters
```

## Step-by-Step Guide

### Step 1: Create the Adapter

Copy the template and create your adapter:

```bash
cp src/adapters/template.ts.example src/adapters/codex.ts
```

Edit `src/adapters/codex.ts`:

```typescript
import { ToolAdapter, SendOptions } from './base.js';
import { commandExists, stripAnsi } from '../utils.js';
import { spawn } from 'child_process';

export class CodexAdapter implements ToolAdapter {
  readonly name = 'codex';           // Used in //codex command
  readonly displayName = 'OpenAI Codex';  // Shown in UI
  
  private hasActiveSession = false;

  async isAvailable(): Promise<boolean> {
    return commandExists('codex');  // Check if CLI is installed
  }

  getCommand(prompt: string, options?: SendOptions): string[] {
    const args: string[] = [];
    
    // Add your tool's session continuation flag
    if (this.hasActiveSession) {
      args.push('--continue');  // Adjust for your tool
    }

    args.push(prompt);
    return ['codex', ...args];
  }

  async send(prompt: string, options?: SendOptions): Promise<string> {
    // Implement sending prompt and capturing response
    // See template.ts.example for full implementation
  }

  resetContext(): void {
    this.hasActiveSession = false;
  }

  hasSession(): boolean {
    return this.hasActiveSession;
  }

  setHasSession(value: boolean): void {
    this.hasActiveSession = value;
  }
}
```

### Step 2: Register the Adapter

Edit `src/adapters/index.ts`:

```typescript
export { ToolAdapter, SendOptions, AdapterRegistry } from './base.js';
export { ClaudeAdapter } from './claude.js';
export { GeminiAdapter } from './gemini.js';
export { CodexAdapter } from './codex.js';  // Add this line
```

Edit `src/index.ts`:

```typescript
import { AdapterRegistry, ClaudeAdapter, GeminiAdapter, CodexAdapter } from './adapters/index.js';

const registry = new AdapterRegistry();
registry.register(new ClaudeAdapter());
registry.register(new GeminiAdapter());
registry.register(new CodexAdapter());  // Add this line
```

### Step 3: Add to SDK Session

Edit `src/sdk-session.ts`:

1. **Add to AVAILABLE_TOOLS array** (near the top of the file):
```typescript
const AVAILABLE_TOOLS: ToolConfig[] = [
  { name: 'claude', displayName: 'Claude Code', color: colors.brightCyan },
  { name: 'gemini', displayName: 'Gemini CLI', color: colors.brightMagenta },
  { name: 'codex', displayName: 'OpenAI Codex', color: colors.brightGreen },  // Add this
];
```

2. **Add the tool type** to activeTool:
```typescript
private activeTool: 'claude' | 'gemini' | 'codex' = 'claude';
```

3. **Add session tracking**:
```typescript
private codexHasSession = false;
```

4. **Add to `sendToTool()`**:
```typescript
if (this.activeTool === 'codex') {
  response = await this.sendToCodex(message);
}
```

5. Add the send method (copy from sendToClaude/sendToGemini as template)

6. **Add to command menu** (AIC_COMMANDS array):
```typescript
{ value: '//codex', name: '//codex        Switch to Codex', description: 'Switch to OpenAI Codex' },
```

7. **Add to handleMetaCommand switch**:
```typescript
case 'codex':
  this.activeTool = 'codex';
  console.log(`Switched to OpenAI Codex`);
  break;
```

### Step 3b: Add to Interactive Session (optional)

If you also want the tool in daemon mode, edit `src/interactive.ts`:

Add to `TOOL_CONFIGS` array:
```typescript
const TOOL_CONFIGS: ToolConfig[] = [
  // ... existing tools ...
  {
    daemon: {
      name: 'codex',
      displayName: 'OpenAI Codex',
      command: 'codex',
      args: [],
      responseTimeout: 3000,
    },
  },
];
```

### Step 4: Build and Test

```bash
npm run build
aic tools  # Verify new tool shows up
aic        # Test switching to new tool with //codex
```

## Key Considerations

### Session Continuation
Each CLI tool handles session continuation differently:
- **Claude Code**: `--continue` flag
- **Gemini CLI**: `--resume latest` flag
- **Your tool**: Check your tool's documentation

### Forward Behavior
The `//forward` command behavior changes based on how many tools are registered:
- **2 tools**: `//forward` auto-selects the other tool (no argument needed)
- **3+ tools**: User must specify target: `//forward <tool> [message]`

This is handled automatically—no additional code needed when adding tools.

### Interactive Mode
For interactive mode (//i), the tool needs to support running in a PTY.
Most CLI tools do, but check if yours has any special requirements.

### Colors
Pick a distinctive color for your tool's UI elements.
Available: `brightCyan`, `brightMagenta`, `brightYellow`, `brightGreen`, `brightBlue`, `brightRed`

## Example: Full Codex Integration

See the template file for a complete working example:
```
src/adapters/template.ts.example
```

## Questions?

The adapter pattern is designed to be flexible. If your tool has unique requirements,
you can extend the `ToolAdapter` interface or add tool-specific methods.

