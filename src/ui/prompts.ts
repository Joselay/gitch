import * as p from "@clack/prompts";
import {
  sshKeyExists,
  expandPath,
  discoverSSHKeys,
  generateSSHKey,
  getPublicKey,
  copyToClipboard,
  openInBrowser,
} from "../core/ssh.ts";
import { isGhInstalled, addSSHKey, currentUser } from "../core/gh.ts";
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

  if (await isGhInstalled()) {
    const s = p.spinner();
    s.start("Adding SSH key to GitHub via gh CLI...");
    try {
      const pubKeyPath = expandPath(sshKeyPath) + ".pub";
      await addSSHKey(pubKeyPath, `gitch:${profileName}`);
      s.stop("SSH key added to GitHub!");
      return;
    } catch {
      s.stop("gh ssh-key add failed — falling back to manual method.");
    }
  }

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

  const gitName = await p.text({
    message: "Git user name",
    placeholder: "John Doe",
    validate: (v) => {
      if (!v?.trim()) return "Name is required";
    },
  });

  if (p.isCancel(gitName)) {
    p.cancel("Profile creation cancelled.");
    process.exit(0);
  }

  const gitEmail = await p.text({
    message: "Git email",
    placeholder: "john@example.com",
    validate: (v) => {
      if (!v?.trim()) return "Email is required";
      if (!v.includes("@")) return "Invalid email";
    },
  });

  if (p.isCancel(gitEmail)) {
    p.cancel("Profile creation cancelled.");
    process.exit(0);
  }

  const sshKeyPath = await promptSSHKey(gitEmail, name);
  if (!sshKeyPath) return null;

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
      const detectedUser = await currentUser();
      if (detectedUser) {
        ghUsername = detectedUser;
        p.log.success(`GitHub account detected: ${detectedUser}`);
        await promptGitHubSetup(sshKeyPath, name);
      } else {
        p.log.warning(
          "Could not detect GitHub user. Run 'gh auth login' first.",
        );
      }
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
