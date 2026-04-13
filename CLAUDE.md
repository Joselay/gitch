# Gitch — Git Account Switcher CLI

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Commands

```bash
bun test              # run all tests
bun test tests/config.test.ts  # run a single test file
bunx tsc --noEmit     # type check
bun run index.ts      # run CLI locally
bun link              # install globally as `gitch` for manual testing
```

## Architecture

```
src/
  cli.ts              # cac program + command registration
  types.ts            # GitchConfig, Profile, DirectoryBinding interfaces
  commands/           # One file per CLI command (add, use, whoami, status, remove, list, bind, unbind, init, resolve)
  core/               # Business logic (config.ts, git.ts, ssh.ts, gh.ts, backup.ts)
  ui/                 # Output formatting (output.ts) with ansis, interactive prompts (prompts.ts) with @clack/prompts
tests/                # bun:test unit tests
```

## Key Patterns

- Dependencies must be TypeScript-first (written in TS, ships own types — no `@types/` shims)
- Config stored at `~/.gitch/config.json`, override with `GITCH_CONFIG_DIR` env var
- SSH config blocks use `# gitch:<profile> -- START/END` marker comments — never touch lines outside markers
- Config functions are pure (take config, return new config) — only `loadConfig`/`saveConfig` do I/O
- Use `process.stdout.write()` + ansis for output — no `console.log`
- Commands export `registerX(program: CAC)` and are wired in `cli.ts`
- `gh` CLI integration is optional — skip gracefully if not installed
