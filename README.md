# gitch

Switch between multiple Git accounts in seconds. Manage SSH keys, git configs, and GitHub CLI auth per profile.

## Install

```bash
bun install -g gitch
```

Or clone and link locally:

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
| `gitch remove <profile>` | Delete a profile |
| `gitch bind <profile> [path]` | Bind a directory to a profile |
| `gitch unbind [path]` | Remove a directory binding |
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

### Shell Hook (auto-switch on `cd`)

Add to your `~/.zshrc`:

```bash
eval "$(gitch init zsh)"
```

Or `~/.bashrc`:

```bash
eval "$(gitch init bash)"
```

Now gitch automatically switches your local git identity when you enter a bound directory.

## Headless Mode

All commands work non-interactively for scripts, CI, and AI agents:

```bash
# Add profile without prompts
gitch add work \
  --name "John Doe" \
  --email "john@company.com" \
  --ssh-key ~/.ssh/id_ed25519_work \
  --gh-username johndoe

# Generate SSH key automatically
gitch add deploy --name "Deploy" --email "deploy@ci.com" --generate-key

# Remove without confirmation
gitch remove old-profile --yes
```

## How It Works

- Profiles are stored in `~/.gitch/config.json`
- Each profile gets an SSH host alias in `~/.ssh/config` (managed via marker comments)
- `gitch use` sets `git config --global user.name/email` and optionally switches `gh auth`
- `gitch bind` sets `git config --local user.name/email` for per-directory identity
- Automatic backups are created before every config change

## Development

```bash
bun install          # install dependencies
bun test             # run tests
bunx tsc --noEmit    # type check
bun run index.ts     # run locally
```

## License

[MIT](LICENSE)
