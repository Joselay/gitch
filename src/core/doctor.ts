import type { EgoConfig } from "../types.ts";
import { getConfigPath } from "./config.ts";
import { isGhInstalled } from "./gh.ts";
import { getGlobalConfig } from "./git.ts";
import { expandPath, hasHostAlias, sshKeyExists, testSSHConnection } from "./ssh.ts";

export interface DiagnosticResult {
  label: string;
  status: "pass" | "fail" | "warn";
  hint?: string;
}

export interface DoctorReport {
  global: DiagnosticResult[];
  profiles: Record<string, DiagnosticResult[]>;
}

export async function runDiagnostics(config: EgoConfig): Promise<DoctorReport> {
  const entries = Object.entries(config.profiles);
  const [global, ...profileResults] = await Promise.all([
    runGlobalChecks(config),
    ...entries.map(([name, profile]) => runProfileChecks(name, profile)),
  ]);

  const profiles: Record<string, DiagnosticResult[]> = {};
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const result = profileResults[i];
    if (entry && result) {
      profiles[entry[0]] = result;
    }
  }

  return { global, profiles };
}

async function runGlobalChecks(config: EgoConfig): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // Check config file exists
  const configExists = await Bun.file(getConfigPath()).exists();
  results.push(
    configExists
      ? { label: "Config file exists", status: "pass" }
      : {
          label: "Config file missing",
          status: "warn",
          hint: "Run 'gitego add <profile>' to create one.",
        },
  );

  // Check active profile
  if (config.activeProfile) {
    const profileExists = config.activeProfile in config.profiles;
    results.push(
      profileExists
        ? { label: `Active profile: ${config.activeProfile}`, status: "pass" }
        : {
            label: `Active profile "${config.activeProfile}" not found in config`,
            status: "fail",
            hint: "Run 'gitego use <profile>' with an existing profile.",
          },
    );

    // Check global git config matches active profile
    if (profileExists) {
      const profile = config.profiles[config.activeProfile];
      if (profile) {
        const [globalName, globalEmail] = await Promise.all([
          getGlobalConfig("user.name"),
          getGlobalConfig("user.email"),
        ]);

        const nameMatch = globalName === profile.gitName;
        const emailMatch = globalEmail === profile.gitEmail;

        if (nameMatch && emailMatch) {
          results.push({ label: "Global git config matches active profile", status: "pass" });
        } else {
          results.push({
            label: "Global git config does not match active profile",
            status: "fail",
            hint: `Run 'gitego use ${config.activeProfile}' to re-apply.`,
          });
        }
      }
    }
  } else {
    results.push({
      label: "No active profile set",
      status: "warn",
      hint: "Run 'gitego use <profile>' to set one.",
    });
  }

  return results;
}

async function runProfileChecks(
  name: string,
  profile: { sshKeyPath: string; ghUsername?: string },
): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // SSH private key exists
  const privateKeyExists = await sshKeyExists(profile.sshKeyPath);
  results.push(
    privateKeyExists
      ? { label: "SSH private key exists", status: "pass" }
      : {
          label: "SSH private key missing",
          status: "fail",
          hint: `Key not found at ${profile.sshKeyPath}. Update with 'gitego edit ${name} --ssh-key <path>'.`,
        },
  );

  // SSH public key exists
  const pubPath = `${expandPath(profile.sshKeyPath)}.pub`;
  const publicKeyExists = await Bun.file(pubPath).exists();
  results.push(
    publicKeyExists
      ? { label: "SSH public key exists", status: "pass" }
      : {
          label: "SSH public key missing",
          status: "fail",
          hint: `Regenerate with: ssh-keygen -y -f ${profile.sshKeyPath} > ${profile.sshKeyPath}.pub`,
        },
  );

  // SSH config block exists
  const aliasExists = await hasHostAlias(name);
  results.push(
    aliasExists
      ? { label: "SSH config block exists", status: "pass" }
      : {
          label: "SSH config block missing",
          status: "fail",
          hint: `Run 'gitego edit ${name} --ssh-key ${profile.sshKeyPath}' to regenerate it.`,
        },
  );

  // SSH connection test
  if (privateKeyExists && aliasExists) {
    const sshWorks = await testSSHConnection(name);
    results.push(
      sshWorks
        ? { label: "SSH connection to GitHub works", status: "pass" }
        : {
            label: "SSH connection to GitHub failed",
            status: "fail",
            hint: "Ensure the SSH key is added to your GitHub account.",
          },
    );
  }

  // gh CLI check (only if profile has ghUsername)
  if (profile.ghUsername) {
    const ghInstalled = await isGhInstalled();
    results.push(
      ghInstalled
        ? { label: `gh CLI installed (GitHub: ${profile.ghUsername})`, status: "pass" }
        : {
            label: "gh CLI not installed",
            status: "warn",
            hint: "Install gh: https://cli.github.com",
          },
    );
  }

  return results;
}
