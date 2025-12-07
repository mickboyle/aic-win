# AIC² - AI Code Connect

```
     █████╗ ██╗ ██████╗  ^2
    ██╔══██╗██║██╔════╝
    ███████║██║██║     
    ██╔══██║██║██║     
    ██║  ██║██║╚██████╗
    ╚═╝  ╚═╝╚═╝ ╚═════╝
```

A CLI tool that connects **Claude Code** and **Gemini CLI**, eliminating manual copy-paste between AI coding assistants.

**AIC²** = **A**I **C**ode **C**onnect (the two C's = ²)

## The Problem

When working with multiple AI coding tools:
1. Ask Gemini for a proposal
2. Copy the response
3. Paste into Claude for review
4. Copy Claude's feedback
5. Paste back to Gemini...

This is tedious and breaks your flow.

## The Solution

`aic` bridges both tools in a single interactive session with:
- **Persistent sessions** - Both tools remember context
- **One-command forwarding** - Send responses between tools instantly
- **Interactive mode** - Full access to slash commands and approvals
- **Detach/reattach** - Keep tools running in background

## Installation

```bash
npm install -g ai-code-connect
```

That's it! The `aic` command is now available globally.

### Alternative: Install from Source

```bash
git clone https://github.com/jacob-bd/ai-code-connect.git
cd ai-code-connect
npm install
npm run build
npm link
```

## Prerequisites

Install both AI CLI tools:

- **Claude Code**: `npm install -g @anthropic-ai/claude-code`
- **Gemini CLI**: `npm install -g @google/gemini-cli`

Verify:
```bash
aic tools
# Should show both as "✓ available"
```

## Quick Start

```bash
aic
```

That's it! This launches the interactive session.

## Usage

### Basic Commands

| Command | Description |
|---------|-------------|
| `/claude` | Switch to Claude Code |
| `/gemini` | Switch to Gemini CLI |
| `/i` | Enter interactive mode (full tool access) |
| `/forward` | Forward last response to other tool (auto-selects if 2 tools) |
| `/forward [tool]` | Forward to specific tool (required if 3+ tools) |
| `/forward [tool] [msg]` | Forward with additional context |
| `/history` | Show conversation history |
| `/status` | Show running processes |
| `/clear` | Clear sessions and history |
| `/quit` or `/cya` | Exit |

### Tool Slash Commands

Use double slash (`//`) to run tool-specific slash commands:

| Input | What Happens |
|-------|--------------|
| `//cost` | Opens interactive mode, runs `/cost`, you see output |
| `//status` | Opens interactive mode, runs `/status`, you can interact |
| `//config` | Opens interactive mode, runs `/config`, full control |

When you type `//command`:
1. AIC enters interactive mode with the tool
2. Sends the `/command` for you
3. You see the full output and can interact
4. Press `Ctrl+]` when done to return to AIC

This approach ensures you can fully view and interact with commands like `/status` that show interactive UIs.

### Command Menu

Type `/` to see a command menu. Use ↓ arrow to select, or keep typing.

### Example Session

```
❯ claude → How should I implement caching for this API?

⠹ Claude is thinking...
I suggest implementing a Redis-based caching layer...

❯ claude → /forward What do you think of this approach?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
↗ Forwarding from Claude Code → Gemini CLI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gemini CLI responds:

The Redis approach is solid. I'd also consider...

❯ gemini → /claude
● Switched to Claude Code

❯ claude → Can you implement that?
```

### Interactive Mode

For full tool access (approvals, multi-turn interactions, etc.):

```bash
❯ claude → /i

▶ Starting Claude Code interactive mode...
Press Ctrl+] to detach • /exit to terminate

> (interact with Claude directly)
> (press Ctrl+])           # Detach back to aic

⏸ Detached from Claude Code (still running)
Use /i to re-attach

❯ claude → /i              # Re-attach to same session
↩ Re-attaching to Claude Code...
```

**Key bindings in interactive mode:**
- `Ctrl+]` - Detach (tool keeps running)
- `/exit` - Terminate the tool session

> **Tip:** Use `//status` or `//cost` to quickly run tool commands—AIC will enter interactive mode, run the command, and you press `Ctrl+]` when done.

> **Note:** Messages exchanged while in interactive mode (after `/i`) are not captured for forwarding. Use regular mode for conversations you want to forward between tools.

### Session Persistence

Sessions persist automatically:
- **Claude**: Uses `--continue` flag
- **Gemini**: Uses `--resume latest` flag

Your conversation context is maintained across messages.

## CLI Options

```bash
aic                         # Launch interactive session
aic tools                   # List available AI tools
aic config default          # Show current default tool
aic config default gemini   # Set Gemini as default tool
aic --version               # Show version
aic --help                  # Show help
```

## Configuration

### Default Tool

Set which tool loads by default when you start AIC²:

**Option 1: CLI command**
```bash
aic config default gemini
```

**Option 2: Inside AIC²**
```
❯ claude → /default gemini
✓ Default tool set to "gemini". Will be used on next launch.
```

**Option 3: Environment variable (temporary override)**
```bash
AIC_DEFAULT_TOOL=gemini aic
```

Configuration is stored in `~/.aic/config.json`.

## Architecture

```
src/
├── adapters/
│   ├── base.ts              # ToolAdapter interface
│   ├── claude.ts            # Claude Code adapter
│   ├── gemini.ts            # Gemini CLI adapter
│   └── template.ts.example  # Template for new adapters
├── sdk-session.ts           # Interactive session logic
├── index.ts                 # CLI entry point
├── config.ts                # Configuration management
├── utils.ts                 # Utilities
└── version.ts               # Version from package.json
```

## Adding New Tools

AIC² is modular. To add a new AI CLI (e.g., OpenAI Codex):

1. Copy the template: `cp src/adapters/template.ts.example src/adapters/codex.ts`
2. Implement the `ToolAdapter` interface
3. Register in `src/adapters/index.ts` and `src/index.ts`
4. Add to `src/sdk-session.ts`

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions.

## Features

- ✅ **Colorful UI** - ASCII banner, colored prompts, status indicators
- ✅ **Rainbow animations** - Animated rainbow effect on slash commands
- ✅ **Spinner** - Visual feedback while waiting for responses
- ✅ **Session persistence** - Context maintained across messages
- ✅ **Interactive mode** - Full tool access with detach/reattach
- ✅ **Command menu** - Type `/` for autocomplete suggestions
- ✅ **Forward responses** - One command to send between tools
- ✅ **Modular adapters** - Easy to add new AI tools
- ✅ **Cross-platform** - Works on macOS, Linux, and Windows
- ✅ **Request locking** - Prevents concurrent request issues
- ✅ **Memory safe** - Conversation history limits prevent memory leaks

## Development

```bash
# Development mode
npm run dev

# Build
npm run build

# Run
aic
```

## Testing

AIC² uses [Vitest](https://vitest.dev/) for testing.

```bash
# Run tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

### What's Tested

| File | Tests | Description |
|------|-------|-------------|
| `src/utils.test.ts` | 17 | Pure utility functions: `stripAnsi`, `truncate`, `formatResponse` |
| `src/config.test.ts` | 18 | Config loading, saving, defaults, environment variable handling |

### Adding Tests

Test files live alongside source files with a `.test.ts` suffix:
- `src/utils.ts` → `src/utils.test.ts`
- `src/config.ts` → `src/config.test.ts`

Tests are excluded from the build output (`dist/`) but are committed to git.

## License

MIT
