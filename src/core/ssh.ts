import { chmod, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const SSH_DIR = join(homedir(), ".ssh");
const SSH_CONFIG_PATH = join(SSH_DIR, "config");

const START_MARKER = (name: string) => `# gitch:${name} -- START`;
const END_MARKER = (name: string) => `# gitch:${name} -- END`;

function buildHostBlock(profileName: string, sshKeyPath: string): string {
  return [
    START_MARKER(profileName),
    `Host github.com-${profileName}`,
    "  HostName github.com",
    "  User git",
    `  IdentityFile ${sshKeyPath}`,
    "  IdentitiesOnly yes",
    "  AddKeysToAgent yes",
    "  PubkeyAuthentication yes",
    END_MARKER(profileName),
  ].join("\n");
}

const SAFE_PROFILE_NAME = /^[a-zA-Z0-9_-]+$/;

export function isValidProfileName(name: string): boolean {
  return SAFE_PROFILE_NAME.test(name) && name.length <= 64;
}

async function readSSHConfig(): Promise<string> {
  const file = Bun.file(SSH_CONFIG_PATH);
  if (!(await file.exists())) {
    return "";
  }
  return await file.text();
}

async function writeSSHConfig(content: string): Promise<void> {
  await mkdir(SSH_DIR, { recursive: true, mode: 0o700 });
  await Bun.write(SSH_CONFIG_PATH, content);
  await chmod(SSH_CONFIG_PATH, 0o600);
}

function removeBlock(content: string, profileName: string): string {
  const startMarker = START_MARKER(profileName);
  const endMarker = END_MARKER(profileName);
  const lines = content.split("\n");
  const result: string[] = [];
  let skipping = false;

  for (const line of lines) {
    if (line.trimEnd() === startMarker) {
      skipping = true;
      continue;
    }
    if (line.trimEnd() === endMarker) {
      skipping = false;
      continue;
    }
    if (!skipping) {
      result.push(line);
    }
  }

  return result
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function addHostAlias(profileName: string, sshKeyPath: string): Promise<void> {
  let content = await readSSHConfig();
  content = removeBlock(content, profileName);

  const block = buildHostBlock(profileName, sshKeyPath);

  if (content.length > 0) {
    content = `${content.trimEnd()}\n\n${block}\n`;
  } else {
    content = `${block}\n`;
  }

  await writeSSHConfig(content);
}

export async function removeHostAlias(profileName: string): Promise<void> {
  const content = await readSSHConfig();
  if (!content) return;

  const updated = removeBlock(content, profileName);
  await writeSSHConfig(updated ? `${updated}\n` : "");
}

export async function hasHostAlias(profileName: string): Promise<boolean> {
  const content = await readSSHConfig();
  return content.includes(START_MARKER(profileName));
}

export function buildSSHCommand(sshKeyPath: string): string {
  const expanded = expandPath(sshKeyPath);
  return `ssh -i ${expanded} -o IdentitiesOnly=yes`;
}

export function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

export async function sshKeyExists(path: string): Promise<boolean> {
  return await Bun.file(expandPath(path)).exists();
}

export async function discoverSSHKeys(): Promise<string[]> {
  const glob = new Bun.Glob("id_*");
  const keys: string[] = [];

  for await (const entry of glob.scan({ cwd: SSH_DIR })) {
    if (entry.includes("/") || entry.includes("..")) continue;
    if (!entry.endsWith(".pub")) {
      const fullPath = join(SSH_DIR, entry);
      const pubExists = await Bun.file(`${fullPath}.pub`).exists();
      if (pubExists) {
        keys.push(`~/.ssh/${entry}`);
      }
    }
  }

  return keys.sort();
}

export async function generateSSHKey(email: string, name: string): Promise<string> {
  const keyPath = join(SSH_DIR, `id_ed25519_${name}`);
  await mkdir(SSH_DIR, { recursive: true, mode: 0o700 });
  const proc = Bun.spawn(["ssh-keygen", "-t", "ed25519", "-C", email, "-f", keyPath, "-N", ""], {
    stdout: "ignore",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`ssh-keygen failed: ${stderr}`);
  }
  await chmod(keyPath, 0o600);
  await chmod(`${keyPath}.pub`, 0o644);
  return `~/.ssh/id_ed25519_${name}`;
}

export async function getPublicKey(privatePath: string): Promise<string> {
  const pubPath = `${expandPath(privatePath)}.pub`;
  return (await Bun.file(pubPath).text()).trim();
}

export async function testSSHConnection(profileName: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(
      ["ssh", "-T", `git@github.com-${profileName}`, "-o", "StrictHostKeyChecking=accept-new"],
      { stdout: "pipe", stderr: "pipe" },
    );
    await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    // GitHub returns exit code 1 but prints "successfully authenticated"
    return stderr.includes("successfully authenticated");
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<void> {
  const cmd =
    process.platform === "darwin"
      ? ["pbcopy"]
      : process.platform === "linux"
        ? ["xclip", "-selection", "clipboard"]
        : null;

  if (!cmd) throw new Error(`Clipboard not supported on ${process.platform}`);

  const proc = Bun.spawn(cmd, { stdin: "pipe" });
  proc.stdin.write(text);
  proc.stdin.end();
  await proc.exited;
}

export async function openInBrowser(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new Error("Only HTTPS URLs are allowed");
  }

  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "linux" ? "xdg-open" : null;

  if (!cmd) throw new Error(`Browser open not supported on ${process.platform}`);

  await Bun.spawn([cmd, url]).exited;
}
