# Contributing to AIC-Win

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features

## Development Setup

### Prerequisites
- Node.js >= 20.0.0
- npm

### Installation
1.  Fork the repo and clone it locally:
    ```bash
    git clone https://github.com/YOUR-USERNAME/aic-win.git
    cd aic-win
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Link the binary for local testing:
    ```bash
    npm run build
    npm link
    ```
    Now you can run `aic` in your terminal to test your changes.

## Workflow

1.  **Create a branch:** `git checkout -b fix/my-fix`
2.  **Make changes:** Edit the TypeScript files in `src/`.
3.  **Build:** Run `npm run build` to compile TypeScript to `dist/`.
4.  **Test:** Run `npm test` to ensure no regressions.
5.  **Manual Test:** Run `aic` and verify the fix works as expected.

## Testing

We use [Vitest](https://vitest.dev/) for testing.

*   Run all tests: `npm test`
*   Run tests in watch mode: `npm run test:watch`

Please ensure you add tests for any new features or bug fixes.

## Pull Request Process

1.  Update the `README.md` with details of changes to the interface (if applicable).
2.  Update `CHANGELOG.md` with a summary of your changes.
3.  Ensure the build passes and tests pass.
4.  Submit your PR!

## License

By contributing, you agree that your contributions will be licensed under its MIT License.