import { basename, resolve } from "node:path";
import type { CAC } from "cac";
import { createBackup } from "../core/backup.ts";
import { addBinding, getProfile, loadConfig, saveConfig } from "../core/config.ts";
import { applyProfileLocally } from "../core/git.ts";
import { buildSSHCommand } from "../core/ssh.ts";
import * as out from "../ui/output.ts";

interface CloneOptions {
  depth?: number;
  branch?: string;
  singleBranch?: boolean;
  dir?: string;
}

export function resolveRepoUrl(repo: string, profileName: string): string {
  // Shorthand: owner/repo
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo)) {
    return `git@github.com-${profileName}:${repo}.git`;
  }

  // SSH URL: git@github.com:owner/repo.git
  if (repo.startsWith("git@github.com:")) {
    return repo.replace("git@github.com:", `git@github.com-${profileName}:`);
  }

  // HTTPS URL: https://github.com/owner/repo[.git]
  const httpsMatch = repo.match(/^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
  if (httpsMatch?.[1]) {
    return `git@github.com-${profileName}:${httpsMatch[1]}.git`;
  }

  // Other URLs: pass through unchanged
  return repo;
}

export function extractDirName(repo: string, customDir?: string): string {
  if (customDir) return customDir;
  // Extract repo name from various URL formats
  const cleaned = repo.replace(/\.git$/, "");
  const afterColon = cleaned.split(":").at(-1) ?? cleaned;
  return basename(cleaned.includes(":") ? afterColon : cleaned);
}

export function registerClone(program: CAC): void {
  program
    .command("clone <profile> <repo>", "Clone a repo with a profile's SSH routing")
    .option("--depth <n>", "Shallow clone depth")
    .option("--branch <name>", "Branch to clone")
    .option("--single-branch", "Clone only one branch")
    .option("--dir <path>", "Target directory")
    .action(async (profileName: string, repo: string, options: CloneOptions) => {
      const config = await loadConfig();
      const profile = getProfile(config, profileName);

      if (!profile) {
        out.error(`Profile "${profileName}" not found.`);
        out.dim("  Run 'gitego list' to see available profiles.");
        process.exit(1);
      }

      const resolvedUrl = resolveRepoUrl(repo, profileName);
      const sshCommand = buildSSHCommand(profile.sshKeyPath);

      const args = ["git", "clone", resolvedUrl];
      if (options.depth != null) {
        const depth = Number(options.depth);
        if (!Number.isInteger(depth) || depth < 1) {
          out.error("--depth must be a positive integer.");
          process.exit(1);
        }
        args.push("--depth", String(depth));
      }
      if (options.branch) args.push("--branch", options.branch);
      if (options.singleBranch) args.push("--single-branch");
      if (options.dir) args.push(options.dir);

      out.info(`Cloning ${resolvedUrl} as ${profileName}...`);

      const proc = Bun.spawn(args, {
        env: { ...process.env, GIT_SSH_COMMAND: sshCommand },
        stdout: "inherit",
        stderr: "inherit",
      });
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        out.error("Clone failed.");
        process.exit(exitCode);
      }

      const dirName = extractDirName(resolvedUrl, options.dir);
      const absolutePath = resolve(dirName);

      try {
        await applyProfileLocally(profile.gitName, profile.gitEmail, sshCommand, absolutePath);
      } catch {
        out.warn("Could not set local git config in cloned repo.");
      }

      await createBackup();
      const updated = addBinding(config, absolutePath, profileName);
      await saveConfig(updated);

      out.success(`Cloned and bound to "${profileName}".`);
      out.dim(`  ${absolutePath}`);
    });
}
