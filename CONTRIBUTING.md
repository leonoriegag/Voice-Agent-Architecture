# Contributing to Voice Agent Architecture

Thank you for your interest in contributing to the Voice Agent Architecture portfolio showcase.

## Architectural Principles

Before submitting a Pull Request, please ensure your changes adhere to the following core constraints:

1. **Hexagonal Architecture (Ports and Adapters)**:
   - Core packages (`src/domain` and `src/application`) must contain **zero imports** from vendor SDKs, databases, web frameworks, or third-party providers.
   - All vendor dependencies (LLM APIs, database drivers, telemetry clients, voice SDKs) must remain isolated in `src/adapters/` and implement interfaces declared in `src/domain/ports/`.

2. **Deterministic Security by Design**:
   - Never commit API keys, private tokens, or real user data.
   - All external endpoints must enforce payload size limits (16 KiB maximum for inbound webhooks), constant-time secret comparison (`timingSafeEqual`), and clock skew validation.
   - Tools must declare strict JSON Schemas (Zod) and enforce input size caps.

3. **Test-Driven & Evaluation-Gated**:
   - All new deterministic features require unit tests in Vitest.
   - All agent, prompt, or tool modifications must pass the evaluation gate (`npm run test:eval-gate`).

## Development Workflow

1. Clone your fork and install dependencies:
   ```bash
   npm install
   cp .env.example .env
   ```

2. Run tests:
   ```bash
   npm test
   ```

3. Validate TypeScript strict types:
   ```bash
   npm run typecheck
   npm run build
   ```

4. Verify architectural boundaries:
   ```bash
   npx vitest run src/architecture.test.ts
   ```

## Commit Conventions

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat:` for new capabilities
- `fix:` for bug fixes
- `test:` for test additions or refactoring
- `docs:` for documentation updates
- `chore:` for tooling and maintenance
