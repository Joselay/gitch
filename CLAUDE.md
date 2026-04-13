# Gitch — Git Account Switcher CLI

**Runtime: Bun** — use `bun` / `bunx` for everything (run, test, install, scripts). Bun auto-loads `.env`, so no dotenv.

## Before Making Changes

When implementing changes that involve a dependency or API (Bun, cac, @clack/prompts, ansis, git, gh, ssh-keygen, etc.), **always use the context7 MCP server to look up official documentation first**. Verify correct usage, method signatures, and best practices before writing code. Do not rely on memory alone — docs may have changed.

## APIs

- Prefer `Bun.file` / `Bun.write` over `node:fs`'s readFile/writeFile
- Use `node:fs/promises` `mkdir`, `chmod`, `unlink` for filesystem operations — avoid shelling out for basic fs ops
- `Bun.$\`cmd\`` (shell tagged template) instead of execa — use `.quiet()` to suppress output, `.cwd()` for directory, `.text()` to capture
- `Bun.spawn()` for subprocesses needing stdin/stdout/stderr control (ssh-keygen, ssh -T, clipboard, browser open)
- `process.stdout.write()` + ansis for normal output; `process.stderr.write()` + ansis for errors/warnings — no `console.log`

## Commands

```bash
bun test              # run all tests
bun test tests/config.test.ts  # run a single test file
bun run test:coverage # run tests with coverage
bunx tsc --noEmit     # type check
bun run lint          # lint with Biome
bun run lint:fix      # auto-fix lint/format issues
bun run check         # lint + typecheck + test (all at once)
bun --watch run index.ts  # run CLI locally with watch mode
bun run build         # compile standalone binary to dist/gitch
bun link              # install globally as `gitch` for manual testing
```

## Code Style (Biome)

- Line width: 100
- Double quotes, semicolons, trailing commas
- `noConsole: "error"` — enforced by linter, use `process.stdout.write()` / `process.stderr.write()` instead
- Unused variables and imports are errors

## Architecture

Entry point: `index.ts` (shebang `#!/usr/bin/env bun`) — just imports `src/cli.ts`.

```
src/
  cli.ts              # cac program + command registration
  types.ts            # GitchConfig, Profile, DirectoryBinding interfaces
  commands/           # One file per CLI command (add, edit, use, whoami, status, remove, list, doctor, bind, clone, unbind, init, resolve)
  core/               # Business logic (config.ts, git.ts, ssh.ts, gh.ts, backup.ts, doctor.ts)
  ui/                 # Output formatting (output.ts) with ansis, interactive prompts (prompts.ts) with @clack/prompts
tests/                # bun:test unit tests
```

## Adding a Command

1. Create `src/commands/<name>.ts` — export `register<Name>(program: CAC)`
2. Wire it in `src/cli.ts` with `register<Name>(program)`
3. Add tests in `tests/<name>.test.ts`

## Testing

- Framework: `bun:test` (built-in, no extra deps)
- Test files live in `tests/*.test.ts`
- Config tests use `GITCH_CONFIG_DIR` pointed at a temp directory to avoid touching real config

## Key Patterns

- Commands with interactive prompts must support headless mode via CLI flags (e.g., `--name`, `--email`, `--yes`)
- `git.ts` local config functions accept optional `cwd` parameter — use it when operating on a path other than CWD
- `git.ts` has `unsetLocalConfig(key, cwd?)` for removing local config entries
- Dependencies must be TypeScript-first (written in TS, ships own types — no `@types/` shims). Exception: `@types/bun` is the official Bun types package.
- Bun types: use `@types/bun` (not the deprecated `bun-types`) with `"types": ["bun"]` in `tsconfig.json`
- Config stored at `~/.gitch/config.json`, override with `GITCH_CONFIG_DIR` env var
- SSH config blocks use `# gitch:<profile> -- START/END` marker comments — never touch lines outside markers
- Config functions are pure (take config, return new config) — only `loadConfig`/`saveConfig` do I/O
- Commands export `registerX(program: CAC)` and are wired in `cli.ts`
- Mutating commands call `createBackup()` before config changes — max 10 backups in `~/.gitch/backups/`, auto-pruned
- Config and backup files are `chmod 600`, SSH dirs are `chmod 700` — preserve these permissions
- `gh` CLI integration is optional — skip gracefully if not installed
- `noUncheckedIndexedAccess` is enabled in `tsconfig.json` — indexed access returns `T | undefined`, so narrow before using
- cac parses `--flag <value>` as strings at runtime regardless of TS type — coerce and validate numeric options (e.g., `--depth`)
- CLI version is read from `package.json` at runtime via `import pkg from "../package.json"` — only update `package.json` when bumping
