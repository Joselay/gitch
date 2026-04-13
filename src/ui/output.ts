import pc from "picocolors";

function write(message: string): void {
  process.stdout.write(`${message}\n`);
}

export function success(message: string): void {
  write(pc.green(`✓ ${message}`));
}

export function error(message: string): void {
  process.stderr.write(`${pc.red(`✗ ${message}`)}\n`);
}

export function warn(message: string): void {
  write(pc.yellow(`⚠ ${message}`));
}

export function info(message: string): void {
  write(pc.cyan(message));
}

export function dim(message: string): void {
  write(pc.dim(message));
}

export function label(key: string, value: string): void {
  write(`  ${pc.bold(key)}: ${value}`);
}

export function heading(message: string): void {
  write(pc.bold(message));
}

export function profileCard(
  name: string,
  email: string,
  sshKey: string,
  ghUser: string | undefined,
  isActive: boolean,
): void {
  const marker = isActive ? pc.green("● ") : pc.dim("○ ");
  const profileName = isActive ? pc.green(pc.bold(name)) : pc.bold(name);
  write(`${marker}${profileName}`);
  label("  Email", email);
  label("  SSH Key", sshKey);
  if (ghUser) {
    label("  GitHub", ghUser);
  }
}
