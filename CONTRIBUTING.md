# Contributing to gitch

Thanks for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/Joselay/gitch.git
cd gitch
bun install
bun link    # makes `gitch` available globally
```

## Project Structure

```
src/
  cli.ts              # cac program + command registration
  types.ts            # Shared interfaces
  commands/           # One file per CLI command
  core/               # Business logic (config, git, ssh, gh, backup, doctor)
  ui/                 # Terminal output (output.ts) and interactive prompts (prompts.ts)
tests/                # bun:test unit tests
```

## Workflow

1. Create a branch from `main`
2. Make your changes
3. Run the full check suite: `bun run check` (lint + typecheck + test)
4. Submit a pull request

## Adding a Command

1. Create `src/commands/<name>.ts` — export `register<Name>(program: CAC)`
2. Wire it in `src/cli.ts` with `register<Name>(program)`
3. Add tests in `tests/<name>.test.ts`

## Code Conventions

- **Runtime**: Bun only — use `Bun.$`, `Bun.file`, `Bun.write`, `Bun.spawn`
- **Output**: `process.stdout.write()` / `process.stderr.write()` — no `console.log` (enforced by Biome)
- **Config functions**: pure (take config, return new config) — only `loadConfig`/`saveConfig` do I/O
- **Headless mode**: every interactive command must also support CLI flags for scripting
- **Dependencies**: must be TypeScript-first (ships own types, no `@types/` shims)

## Testing

```bash
bun test                        # all tests
bun test tests/config.test.ts   # single file
bun run test:coverage           # with coverage
```

Tests use `GITCH_CONFIG_DIR` pointed at a temp directory to avoid touching real config.
