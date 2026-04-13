import * as p from "@clack/prompts";
import {
  sshKeyExists,
  expandPath,
  discoverSSHKeys,
  generateSSHKey,
  getPublicKey,
  copyToClipboard,
  openInBrowser,
  addHostAlias,
  testSSHConnection,
} from "../core/ssh.ts";
import { isGhInstalled, addSSHKey, getUserInfo } from "../core/gh.ts";
import type { GhUserInfo } from "../core/gh.ts";
import type { Profile } from "../types.ts";

async function promptSSHKey(
  email: string,
  profileName: string,
): Promise<string | null> {
  const existingKeys = await discoverSSHKeys();

  const GENERATE_NEW = "__generate__";
  const ENTER_MANUAL = "__manual__";

  const options: { value: string; label: string; hint?: string }[] =
    existingKeys.map((key) => ({
      value: key,
      label: key,
    }));

  options.push({
    value: GENERATE_NEW,
    label: "Generate a new SSH key",
    hint: `creates ~/.ssh/id_ed25519_${profileName}`,
  });

  options.push({
    value: ENTER_MANUAL,
    label: "Enter path manually",
  });

  const choice = await p.select({
    message: "SSH private key",
    options,
  });

  if (p.isCancel(choice)) {
    p.cancel("Profile creation cancelled.");
    process.exit(0);
  }

  if (choice === GENERATE_NEW) {
    const s = p.spinner();
    s.start("Generating SSH key...");
    try {
      const keyPath = await generateSSHKey(email, profileName);
      s.stop(`SSH key generated: ${keyPath}`);
      return keyPath;
    } catch (err) {
      s.stop("Failed to generate SSH key.");
      p.log.error(
        err instanceof Error ? err.message : "Unknown error",
      );
      return null;
    }
  }

  if (choice === ENTER_MANUAL) {
    const path = await p.text({
      message: "SSH private key path",
      placeholder: "~/.ssh/id_ed25519",
      validate: (v) => {
        if (!v?.trim()) return "SSH key path is required";
      },
    });

    if (p.isCancel(path)) {
      p.cancel("Profile creation cancelled.");
      process.exit(0);
    }

    const expanded = expandPath(path);
    if (!(await sshKeyExists(expanded))) {
      p.cancel(`SSH key not found: ${expanded}`);
      return null;
    }

    return path;
  }

  return choice as string;
}

async function promptGitHubSetup(
  sshKeyPath: string,
  profileName: string,
): Promise<void> {
  const addToGitHub = await p.confirm({
    message: "Add this SSH key to GitHub?",
    initialValue: true,
  });

  if (p.isCancel(addToGitHub) || !addToGitHub) return;

  const s = p.spinner();
  s.start("Adding SSH key to GitHub via gh CLI...");
  try {
    const pubKeyPath = expandPath(sshKeyPath) + ".pub";
    await addSSHKey(pubKeyPath, `gitch:${profileName}`);
    s.stop("SSH key added to GitHub!");
  } catch (err: unknown) {
    const stderr = (err as { stderr?: Buffer })?.stderr?.toString() ?? "";
    const msg = stderr || (err instanceof Error ? err.message : String(err));
    if (msg.includes("already in use") || msg.includes("already exists")) {
      s.stop("SSH key already on GitHub — no upload needed.");
    } else if (msg.includes("scope") || msg.includes("admin:public_key")) {
      s.stop("gh CLI missing SSH key permissions — falling back to manual.");
      p.log.info("To fix this, run: gh auth refresh -h github.com -s admin:public_key");
      await manualKeyUpload(sshKeyPath);
    } else {
      s.stop("Could not add SSH key via gh CLI.");
      await manualKeyUpload(sshKeyPath);
    }
  }
}

async function manualKeyUpload(sshKeyPath: string): Promise<void> {
  try {
    const pubKey = await getPublicKey(sshKeyPath);
    await copyToClipboard(pubKey);
    p.log.success("Public key copied to clipboard!");
    p.log.info("Opening GitHub SSH settings...");
    await openInBrowser("https://github.com/settings/ssh/new");
    p.log.info("Paste your key in the browser and click \"Add SSH key\".");
  } catch {
    p.log.warning("Could not copy key or open browser. Add it manually:");
    try {
      const pubKey = await getPublicKey(sshKeyPath);
      p.log.info(pubKey);
      p.log.info("Go to: https://github.com/settings/ssh/new");
    } catch {
      p.log.warning(`Could not read public key at ${sshKeyPath}.pub`);
    }
  }
}

export async function promptProfile(name: string): Promise<Profile | null> {
  p.intro(`Creating profile: ${name}`);

  // Step 1: Detect GitHub account first to pre-fill fields
  let ghInfo: GhUserInfo | null = null;
  let ghUsername: string | undefined;

  if (await isGhInstalled()) {
    const linkGh = await p.confirm({
      message: "Link to GitHub account?",
      initialValue: true,
    });

    if (p.isCancel(linkGh)) {
      p.cancel("Profile creation cancelled.");
      process.exit(0);
    }

    if (linkGh) {
      ghInfo = await getUserInfo();
      if (ghInfo) {
        ghUsername = ghInfo.login;
        p.log.success(`GitHub account detected: ${ghInfo.login}`);
      } else {
        p.log.warning(
          "Could not detect GitHub user. Run 'gh auth login' first.",
        );
      }
    }
  }

  // Step 2: Git name (pre-filled from GitHub if available)
  const gitName = await p.text({
    message: "Git user name",
    placeholder: "John Doe",
    defaultValue: ghInfo?.name ?? undefined,
    validate: (v) => {
      if (!v?.trim()) return "Name is required";
    },
  });

  if (p.isCancel(gitName)) {
    p.cancel("Profile creation cancelled.");
    process.exit(0);
  }

  // Step 3: Git email (pre-filled from GitHub if available)
  const gitEmail = await p.text({
    message: "Git email",
    placeholder: "john@example.com",
    defaultValue: ghInfo?.email ?? undefined,
    validate: (v) => {
      if (!v?.trim()) return "Email is required";
      if (!v.includes("@")) return "Invalid email";
    },
  });

  if (p.isCancel(gitEmail)) {
    p.cancel("Profile creation cancelled.");
    process.exit(0);
  }

  // Step 4: SSH key
  const sshKeyPath = await promptSSHKey(gitEmail, name);
  if (!sshKeyPath) return null;

  // Step 5: Upload SSH key to GitHub (skip if already working)
  if (ghUsername) {
    // Set up host alias first so we can test the connection
    await addHostAlias(name, sshKeyPath);
    const s = p.spinner();
    s.start("Testing SSH connection...");
    const sshWorks = await testSSHConnection(name);
    if (sshWorks) {
      s.stop("SSH key already works with GitHub — no upload needed.");
    } else {
      s.stop("SSH key not yet on GitHub.");
      await promptGitHubSetup(sshKeyPath, name);
    }
  }

  p.outro("Profile created!");

  return {
    name,
    gitName,
    gitEmail,
    sshKeyPath,
    ghUsername,
    createdAt: new Date().toISOString(),
  };
}

export async function confirmAction(message: string): Promise<boolean> {
  const result = await p.confirm({ message });
  if (p.isCancel(result)) return false;
  return result;
}
