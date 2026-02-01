# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.3-win.1] - 2026-02-01

### Fixed
- **Windows Compatibility:**
    - Added `shell: true` option to `spawn` calls on Windows platforms. This fixes the critical `ENOENT` error where Node.js could not resolve `.cmd` shims for global npm packages (like `claude.cmd` and `gemini.cmd`).
    - Updated `resolveCommandPath` to explicitly check for `.cmd` and `.ps1` extensions on Windows.
- **Prompt Truncation:** Refactored `runCommand` and `ClaudeAdapter` to pass prompts via `stdin` rather than command-line arguments. This bypasses Windows shell command length limits and escaping issues with special characters/newlines.
- **Context Bleed:** `handleForward` now forces a fresh session UUID (`continueSession: false`) when sending forwarded content. This prevents Claude Code from hallucinating context from previous, unrelated sessions.
- **Hallucinations:** Updated forward prompt templates to use neutral delimiters (`[FORWARDED]`) instead of trigger words like "Another AI", which were causing model confusion.

### Added
- **Context Awareness:** The `/forward` command logic was improved to search backwards for the user's *original query* that prompted the AI's response. Both the user query and the AI response are now forwarded, giving the target AI full context of the interaction.
- **Debug Logging:** Added a `debugLog` utility enabled via `AIC_DEBUG=1` env var, providing detailed traces of command execution, arguments, and exit codes for easier troubleshooting.
- **Input Validation:** Added strict role checks for forwarding to ensure only valid User -> Assistant pairs are sent.
- **Error Handling:** Added `EPIPE` error handling for stdin writes to prevent parent process crashes if a child CLI exits early.

### Changed
- **Package Name:** Renamed to `@mickboyle/aic-win` for scoped release.
- **Repository:** Updated to point to `https://github.com/mickboyle/aic-win`.