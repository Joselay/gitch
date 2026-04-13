# Gitch — Git Account Switcher CLI

**Runtime: Bun** — use `bun` / `bunx` for everything (run, test, install, scripts). Bun auto-loads `.env`, so no dotenv.

## APIs

- Prefer `Bun.file` / `Bun.write` over `node:fs`'s readFile/writeFile
- `Bun.$\`cmd\`` (shell tagged template) instead of execa — use `.quiet()` to suppress output, `.cwd()` for directory, `.text()` to capture
- `Bun.spawn()` for subprocesses needing stdin/stdout/stderr control (ssh-keygen, ssh -T, clipboard, browser open)
- `process.stdout.write()` + ansis for normal output; `process.stderr.write()` + ansis for errors/warnings — no `console.log`

## Commands

```bash
bun test              # run all tests
bun test tests/config.test.ts  # run a single test file
bunx tsc --noEmit     # type check
bun run index.ts      # run CLI locally
bun link              # install globally as `gitch` for manual testing
```

## Architecture

Entry point: `index.ts` (shebang `#!/usr/bin/env bun`) — just imports `src/cli.ts`.

```
src/
  cli.ts              # cac program + command registration
  types.ts            # GitchConfig, Profile, DirectoryBinding interfaces
  commands/           # One file per CLI command (add, use, whoami, status, remove, list, bind, unbind, init, resolve)
  core/               # Business logic (config.ts, git.ts, ssh.ts, gh.ts, backup.ts)
  ui/                 # Output formatting (output.ts) with ansis, interactive prompts (prompts.ts) with @clack/prompts
tests/                # bun:test unit tests
```

## Adding a Command

1. Create `src/commands/<name>.ts` — export `register<Name>(program: CAC)`
2. Wire it in `src/cli.ts` with `register<Name>(program)`
3. Add tests in `tests/<name>.test.ts`

## Testing

- Framework: `bun:test` (built-in, no extra deps)
- Test files: `tests/config.test.ts`, `tests/ssh.test.ts`, `tests/bindings.test.ts`
- Config tests use `GITCH_CONFIG_DIR` pointed at a temp directory to avoid touching real config

## Key Patterns

- Commands with interactive prompts must support headless mode via CLI flags (e.g., `--name`, `--email`, `--yes`)
- `git.ts` local config functions accept optional `cwd` parameter — use it when operating on a path other than CWD
- `git.ts` has `unsetLocalConfig(key, cwd?)` for removing local config entries
- Dependencies must be TypeScript-first (written in TS, ships own types — no `@types/` shims)
- Config stored at `~/.gitch/config.json`, override with `GITCH_CONFIG_DIR` env var
- SSH config blocks use `# gitch:<profile> -- START/END` marker comments — never touch lines outside markers
- Config functions are pure (take config, return new config) — only `loadConfig`/`saveConfig` do I/O
- Use `process.stdout.write()` + ansis for output, `process.stderr.write()` + ansis for errors/warnings — no `console.log`
- Commands export `registerX(program: CAC)` and are wired in `cli.ts`
- Mutating commands call `createBackup()` before config changes — max 10 backups in `~/.gitch/backups/`, auto-pruned
- Config and backup files are `chmod 600`, SSH dirs are `chmod 700` — preserve these permissions
- `gh` CLI integration is optional — skip gracefully if not installed
- `noUncheckedIndexedAccess` is enabled in `tsconfig.json` — indexed access returns `T | undefined`, so narrow before using
- CLI version is hardcoded in `cli.ts` (`cli.version("1.0.0")`) separately from `package.json` — update both when bumping
