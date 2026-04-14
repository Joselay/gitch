# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in gitego, please report it responsibly:

1. **Do not** open a public issue
2. Email the maintainer or use [GitHub's private vulnerability reporting](https://github.com/Joselay/gitego/security/advisories/new)
3. Include steps to reproduce, impact assessment, and any suggested fixes

You should receive a response within 72 hours.

## Security Model

gitego manages sensitive credentials (SSH keys, git config, GitHub CLI auth). The following security measures are in place:

- **File permissions**: Config files are `chmod 600`, SSH directories are `chmod 700`
- **Input validation**: Profile names are restricted to `[a-zA-Z0-9_-]`, SSH key paths are validated against shell injection characters
- **SSH config isolation**: Each profile's SSH block is contained within `# gitego:<profile> -- START/END` markers — gitego never modifies lines outside these markers
- **Automatic backups**: Every mutating operation creates a backup before modifying config (max 10 retained)
- **No secrets in config**: gitego stores key *paths*, not key contents. Private keys are never read or copied.

## Supported Versions

Only the latest release is actively supported with security updates.
