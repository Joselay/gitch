import { chmod, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { GitchConfig, Profile } from "../types.ts";
import { createDefaultConfig } from "../types.ts";

function configWarn(message: string): void {
  process.stderr.write(`⚠ ${message}\n`);
}

const CONFIG_DIR = Bun.env.GITCH_CONFIG_DIR ?? join(homedir(), ".gitch");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");
const BACKUPS_DIR = join(CONFIG_DIR, "backups");

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function getBackupsDir(): string {
  return BACKUPS_DIR;
}

export async function ensureConfigDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await mkdir(BACKUPS_DIR, { recursive: true, mode: 0o700 });
}

export async function loadConfig(): Promise<GitchConfig> {
  const file = Bun.file(CONFIG_PATH);
  if (!(await file.exists())) {
    return createDefaultConfig();
  }
  let raw: unknown;
  try {
    raw = await file.json();
  } catch {
    configWarn("Config file is corrupted — starting with a fresh config.");
    return createDefaultConfig();
  }
  if (
    !raw ||
    typeof raw !== "object" ||
    !Array.isArray((raw as Record<string, unknown>).bindings) ||
    typeof (raw as Record<string, unknown>).profiles !== "object" ||
    (raw as Record<string, unknown>).profiles === null
  ) {
    configWarn("Config file has an invalid structure — starting with a fresh config.");
    return createDefaultConfig();
  }
  const version = (raw as Record<string, unknown>).version;
  if (version !== 1) {
    configWarn(
      `Config version ${String(version)} is not supported (expected 1) — starting with a fresh config.`,
    );
    return createDefaultConfig();
  }

  const rawProfiles = (raw as Record<string, unknown>).profiles as Record<string, unknown>;
  const validatedProfiles: Record<string, Profile> = {};
  for (const [key, value] of Object.entries(rawProfiles)) {
    if (isValidProfile(value)) {
      validatedProfiles[key] = value;
    } else {
      configWarn(`Profile "${key}" has missing or invalid fields — skipping it.`);
    }
  }

  const config = raw as GitchConfig;
  config.profiles = validatedProfiles;

  if (config.activeProfile && !(config.activeProfile in validatedProfiles)) {
    config.activeProfile = null;
  }

  return config;
}

function isValidProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.name === "string" &&
    typeof p.gitName === "string" &&
    typeof p.gitEmail === "string" &&
    typeof p.sshKeyPath === "string" &&
    typeof p.createdAt === "string"
  );
}

export async function saveConfig(config: GitchConfig): Promise<void> {
  await ensureConfigDir();
  await Bun.write(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
  await chmod(CONFIG_PATH, 0o600);
}

export function getProfile(config: GitchConfig, name: string): Profile | undefined {
  return config.profiles[name];
}

export function addProfile(config: GitchConfig, profile: Profile): GitchConfig {
  return {
    ...config,
    profiles: {
      ...config.profiles,
      [profile.name]: profile,
    },
  };
}

export function removeProfile(config: GitchConfig, name: string): GitchConfig {
  const { [name]: _, ...rest } = config.profiles;
  return {
    ...config,
    profiles: rest,
    activeProfile: config.activeProfile === name ? null : config.activeProfile,
    bindings: config.bindings.filter((b) => b.profile !== name),
  };
}

export function setActiveProfile(config: GitchConfig, name: string | null): GitchConfig {
  return {
    ...config,
    activeProfile: name,
  };
}

export function profileExists(config: GitchConfig, name: string): boolean {
  return name in config.profiles;
}

export function getProfileNames(config: GitchConfig): string[] {
  return Object.keys(config.profiles);
}

export function addBinding(config: GitchConfig, path: string, profileName: string): GitchConfig {
  const normalized = path.replace(/\/+$/, "");
  const filtered = config.bindings.filter((b) => b.path !== normalized);
  return {
    ...config,
    bindings: [...filtered, { path: normalized, profile: profileName }],
  };
}

export function removeBinding(config: GitchConfig, path: string): GitchConfig {
  return {
    ...config,
    bindings: config.bindings.filter((b) => b.path !== path),
  };
}

export function getBindingForPath(
  config: GitchConfig,
  path: string,
): { path: string; profile: string } | undefined {
  return config.bindings
    .filter((b) => path === b.path || path.startsWith(`${b.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
}
