# Claude Code Guidelines for AI Code Connect

## Commands
- **Run (Dev)**: `npm run dev` (runs `tsx src/index.ts`)
- **Build**: `npm run build` (runs `tsc`)
- **Start (Prod)**: `npm start` (runs `node dist/index.js`)
- **Test**: `npm test` (runs `vitest run`)
- **Test (Watch)**: `npm run test:watch`
- **Type Check**: `npx tsc --noEmit`

## Code Style & Structure
- **Language**: TypeScript (ESModules).
- **Style**:
  - Use relative imports with `.js` extension (e.g., `./base.js`, `../utils.js`).
  - Use `export class` for adapters implementing `ToolAdapter`.
  - Prefer `const` over `let`.
  - Use `async/await` for asynchronous operations.
  - Extract magic numbers to named constants.
  - Use `try/finally` for resource cleanup.
- **Project Structure**:
  - `src/index.ts`: CLI entry point (Commander).
  - `src/sdk-session.ts`: Interactive session and command handling.
  - `src/adapters/`: Tool adapters (Claude, Gemini, etc.).
  - `src/utils.ts`: Utility functions (PTY, command checking).
  - `src/config.ts`: Configuration handling (~/.aic/).
  - `src/version.ts`: Version from package.json (single source of truth).

## Architecture
- **Adapter Pattern**: New tools implement `ToolAdapter` interface in `src/adapters/base.ts`.
- **Registration**: Adapters registered in `src/adapters/index.ts` and `src/index.ts`.
- **Session**: `SDKSession` class orchestrates user-adapter interaction.
- **Version**: Always use `VERSION` from `src/version.ts`, never hardcode.

## Security
- Validate command names with regex before shell execution.
- Use `spawn()` with arrays, never `exec()` with string interpolation.
- Config files should use mode `0o600`.
- when commiting changes to git DO NOT add Generated nu Claude or Co-Authored by Claude messages