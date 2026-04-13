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
    END_MARKER(profileName),
  ].join("\n");
}

async function readSSHConfig(): Promise<string> {
  const file = Bun.file(SSH_CONFIG_PATH);
  if (!(await file.exists())) {
    return "";
  }
  return await file.text();
}

async function writeSSHConfig(content: string): Promise<void> {
  await Bun.$`mkdir -p ${SSH_DIR}`.quiet();
  await Bun.write(SSH_CONFIG_PATH, content);
  await Bun.$`chmod 600 ${SSH_CONFIG_PATH}`.quiet();
}

function removeBlock(content: string, profileName: string): string {
  const startMarker = START_MARKER(profileName);
  const endMarker = END_MARKER(profileName);
  const lines = content.split("\n");
  const result: string[] = [];
  let skipping = false;

  for (const line of lines) {
    if (line.trim() === startMarker) {
      skipping = true;
      continue;
    }
    if (line.trim() === endMarker) {
      skipping = false;
      continue;
    }
    if (!skipping) {
      result.push(line);
    }
  }

  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function addHostAlias(
  profileName: string,
  sshKeyPath: string,
): Promise<void> {
  let content = await readSSHConfig();
  content = removeBlock(content, profileName);

  const block = buildHostBlock(profileName, sshKeyPath);

  if (content.length > 0) {
    content = content.trimEnd() + "\n\n" + block + "\n";
  } else {
    content = block + "\n";
  }

  await writeSSHConfig(content);
}

export async function removeHostAlias(profileName: string): Promise<void> {
  const content = await readSSHConfig();
  if (!content) return;

  const updated = removeBlock(content, profileName);
  await writeSSHConfig(updated ? updated + "\n" : "");
}

export async function hasHostAlias(profileName: string): Promise<boolean> {
  const content = await readSSHConfig();
  return content.includes(START_MARKER(profileName));
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
