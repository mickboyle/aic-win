# AIC-Win: Windows-Optimized AI CLI Bridge

[![npm version](https://img.shields.io/npm/v/@mickboyle/aic-win.svg)](https://www.npmjs.com/package/@mickboyle/aic-win)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Windows](https://img.shields.io/badge/OS-Windows-blue)](https://www.microsoft.com/windows)

**AIC-Win** (`aic`) is a robust command-line bridge that connects **Claude Code** and **Gemini CLI** into a single, unified workflow. It eliminates the friction of copy-pasting between terminals, enabling a seamless "Architect vs. Implementer" workflow directly in your shell.

This fork is specifically optimized for **Windows** environments, fixing common issues with path resolution, prompt truncation, and session context management that plague the original tool on Windows.

## ✨ Features

*   **Zero Copy-Paste:** Forward responses instantly between Gemini and Claude with `/forward`.
*   **Windows Native Support:** Correctly handles `.cmd` executables, shell escaping, and path resolution.
*   **Unified Interface:** Switch between tools (`/gemini`, `/claude`) without losing context.
*   **Interactive Mode:** Drop into full interactive sessions (`/i`) for complex tasks, then detach (`Ctrl+]`) to keep them running in the background.
*   **Context-Aware Forwarding:** Automatically includes your original prompt + the AI's response when forwarding, ensuring the receiving AI has full context.
*   **Session Isolation:** Prevents hallucination by ensuring forwarded messages don't bleed stale context from previous sessions.

## 🚀 Installation

### Prerequisites
*   Node.js v20.0.0 or higher
*   [Claude Code CLI](https://docs.anthropic.com/claude-code) (`npm install -g @anthropic-ai/claude-code`)
*   [Gemini CLI](https://github.com/google/gemini-cli) (`npm install -g @google/gemini-cli`)

### Install via NPM
```bash
npm install -g @mickboyle/aic-win
```

### Install from Source
```bash
git clone https://github.com/mickboyle/aic-win.git
cd aic-win
npm install
npm run build
npm link
```

## 🎮 Quick Start

1.  **Start the bridge:**
    ```bash
    aic
    ```

2.  **Ask Gemini to Architect a solution:**
    ```
    /gemini
    Architect a scalable REST API structure for a Todo app using Express.js.
    ```

3.  **Forward the plan to Claude to Implement:**
    ```
    /forward Review this architecture. If it looks solid, implement the basic server setup.
    ```

4.  **Validate the implementation with Gemini:**
    ```
    /forward Does this implementation match your original architecture? Any security risks?
    ```

## 📖 Command Reference

| Command | Description | 
| :--- | :--- | 
| `/gemini` | Switch active tool to Gemini CLI. Add `-i` to enter interactive mode immediately. | 
| `/claude` | Switch active tool to Claude Code. Add `-i` to enter interactive mode immediately. | 
| `/forward [msg]` | Forward the last AI response to the *other* tool. Optionally add a message (e.g., `/forward critique this`). | 
| `/forwardi` | Forward the last response and immediately enter interactive mode with the target tool. | 
| `/i` | Enter full interactive mode with the current tool. | 
| `/history` | Show the conversation history. | 
| `/clear` | Clear conversation history and reset tool sessions. | 
| `/status` | Show status of background processes (PIDs, active state). | 
| `/quit` | Exit the application (alias: `/cya`). | 

### Keyboard Shortcuts
*   **In Interactive Mode:**
    *   `Ctrl+]` or `Ctrl+\` : **Detach** (keep session running in background).
    *   `Ctrl+6` or `Ctrl+Q` : **Toggle** quickly between tools.

## 🔧 Configuration

AIC-Win works out of the box. However, for advanced debugging, you can enable verbose logging:

**PowerShell:**
```powershell
$env:AIC_DEBUG="1"
aic
```

**CMD:**
```cmd
set AIC_DEBUG=1
aic
```

## ❓ Troubleshooting

### "Command not found: aic"
Ensure your global npm bin folder is in your PATH.
Run `npm config get prefix` to see where it is, and add that path to your environment variables.

### "spawn ... ENOENT"
This usually means one of the underlying CLIs (Claude or Gemini) is not installed or not in your PATH.
Run `where claude` and `where gemini` in PowerShell to verify they exist.

### Claude is hallucinating / referencing old tasks
AIC-Win uses session isolation logic to prevent this. If it happens, run `/clear` to force a complete reset of all session contexts.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1.  Fork the repo
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

## 🙏 Acknowledgments

*   Originally forked from [jacob-bd/ai-code-connect](https://github.com/jacob-bd/ai-code-connect).
*   Windows compatibility fixes and enhancements by [Mick Boyle](https://github.com/mickboyle).