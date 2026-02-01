# Changelog

## [0.3.3-win.1] - 2026-02-01

### Fixed
- **Windows Compatibility:** Added `shell: true` option to spawn calls on Windows platforms to correctly resolve `.cmd` shims.
- **Prompt Truncation:** Refactored `runCommand` and `ClaudeAdapter` to pass prompts via `stdin` rather than CLI arguments, preventing shell escaping issues and length limits.
- **Context Bleed:** `handleForward` now forces a fresh session UUID (`continueSession: false`) to prevent Claude Code from hallucinating context from previous sessions.
- **Hallucinations:** Updated forward prompt templates to use neutral delimiters (`[FORWARDED]`) instead of trigger words like "Another AI", which caused model confusion.

### Added
- **Context Awareness:** The `/forward` command now includes the user's original query alongside the AI's response for better context.
