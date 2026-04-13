import ansis from "ansis";

function write(message: string): void {
  process.stdout.write(`${message}\n`);
}

export function success(message: string): void {
  write(ansis.green(`✓ ${message}`));
}

export function error(message: string): void {
  process.stderr.write(`${ansis.red(`✗ ${message}`)}\n`);
}

export function warn(message: string): void {
  process.stderr.write(`${ansis.yellow(`⚠ ${message}`)}\n`);
}

export function info(message: string): void {
  write(ansis.cyan(message));
}

export function dim(message: string): void {
  write(ansis.dim(message));
}

export function label(key: string, value: string): void {
  write(`  ${ansis.bold(key)}: ${value}`);
}

export function heading(message: string): void {
  write(ansis.bold(message));
}

export function listItem(name: string, isActive: boolean): void {
  const marker = isActive ? ansis.green("● ") : "  ";
  const label = isActive ? ansis.green.bold(name) : name;
  write(`${marker}${label}`);
}

export function profileCard(
  name: string,
  email: string,
  sshKey: string,
  ghUser: string | undefined,
  isActive: boolean,
): void {
  const marker = isActive ? ansis.green("● ") : ansis.dim("○ ");
  const profileName = isActive ? ansis.green.bold(name) : ansis.bold(name);
  write(`${marker}${profileName}`);
  label("Email", email);
  label("SSH Key", sshKey);
  if (ghUser) {
    label("GitHub", ghUser);
  }
}
