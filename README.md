# gitch

[![CI](https://github.com/Joselay/gitch/actions/workflows/ci.yml/badge.svg)](https://github.com/Joselay/gitch/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Switch between multiple Git accounts in seconds. Manage SSH keys, git configs, and GitHub CLI auth per profile.

## Why gitch?

Managing multiple Git accounts (work, personal, open source) usually means manually editing `~/.ssh/config`, juggling `git config --global`, and hoping you don't push to the wrong repo with the wrong identity. gitch automates all of this:

- **One command to switch** — `gitch use work` sets your global git identity, SSH routing, and GitHub CLI auth in one shot
- **Per-directory identities** — bind a profile to a directory and it auto-activates when you `cd` into it
- **SSH key isolation** — each profile gets its own SSH host alias with `IdentitiesOnly yes`, following [GitHub's official best practices](https://docs.github.com/en/account-and-profile/how-tos/account-management/managing-multiple-accounts)
- **Headless mode** — every command works non-interactively for CI, scripts, and AI agents
- **Automatic backups** — every config change is backed up, and you can restore with `gitch restore`

## Install

Requires [Bun](https://bun.sh) runtime. Until this package is published under a name you control, install from source:

```bash
git clone https://github.com/Joselay/gitch.git
cd gitch
bun install
bun link
```

## Quick Start

```bash
# Create a profile (interactive)
gitch add work

# Create a profile (headless — for CI/scripts)
gitch add work --name "John Doe" --email "john@company.com" --generate-key

# Switch global identity
gitch use work

# See who you are
gitch whoami

# List all profiles
gitch list
```

## Commands

| Command | Description |
|---|---|
| `gitch add <profile>` | Create a new git profile |
| `gitch use <profile>` | Switch global git identity |
| `gitch whoami` | Show active profile |
| `gitch list` | List all profile names |
| `gitch status` | Detailed view of profiles and bindings |
| `gitch edit <profile>` | Edit an existing profile |
| `gitch rename <old> <new>` | Rename a profile (preserves SSH config and bindings) |
| `gitch remove <profile>` | Delete a profile |
| `gitch bind <profile> [path]` | Bind a directory to a profile |
| `gitch unbind [path]` | Remove a directory binding |
| `gitch clone <profile> <repo>` | Clone a repo with a profile's SSH routing |
| `gitch doctor` | Check system health and profile validity |
| `gitch restore [backup]` | Restore config from a backup |
| `gitch init <shell>` | Output shell hook for auto-switching |

## Directory Bindings

Bind a profile to a directory so it auto-activates when you `cd` into it:

```bash
# Bind current directory
gitch bind work

# Bind a specific path
gitch bind personal ~/projects/side-project

# Remove a binding
gitch unbind ~/projects/side-project
```

## Shell Integration

Add auto-switching so gitch applies the correct profile when you `cd` into a bound directory.

**zsh** — add to `~/.zshrc`:

```bash
eval "$(gitch init zsh)"
```

**bash** — add to `~/.bashrc`:

```bash
eval "$(gitch init bash)"
```

**fish** — add to `~/.config/fish/config.fish`:

```fish
gitch init fish | source
```

Once configured, gitch automatically switches your local git identity when you enter a bound directory.

## Headless Mode

All commands work non-interactively for scripts, CI, and AI agents:

```bash
# Add profile without prompts
gitch add work \
  --name "John Doe" \
  --email "john@company.com" \
  --ssh-key ~/.ssh/id_ed25519_work \
  --gh-username johndoe

# Generate SSH key and add it to GitHub automatically
gitch add deploy --name "Deploy" --email "deploy@ci.com" --generate-key --add-to-github

# Test SSH connection after setup
gitch add work --name "John" --email "john@work.com" --generate-key --test-ssh

# Remove without confirmation
gitch remove old-profile --yes
```

## How It Works

- Profiles are stored in `~/.gitch/config.json`
- Each profile gets an SSH host alias in `~/.ssh/config` with `IdentitiesOnly yes` (prevents key conflicts)
- `gitch use` sets `git config --global user.name/email`, applies `url.*.insteadOf` rewriting (so existing clones use the correct SSH key), and optionally switches `gh auth`
- `gitch bind` sets `git config --local user.name/email` for per-directory identity
- `gitch add --add-to-github` uses `gh ssh-key add` to register keys programmatically
- `gitch add --test-ssh` verifies the SSH connection works after setup
- Automatic backups are created before every config change (max 10 retained)

## Development

```bash
bun install          # install dependencies
bun test             # run tests
bun run lint         # lint with Biome
bun run typecheck    # type check
bun run check        # lint + typecheck + test (all at once)
bun run build        # compile standalone binary to dist/gitch
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## License

[MIT](LICENSE)
