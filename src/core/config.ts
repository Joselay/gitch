import { chmod, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { EgoConfig, Profile } from "../types.ts";
import { createDefaultConfig } from "../types.ts";

function configWarn(message: string): void {
  process.stderr.write(`⚠ ${message}\n`);
}

function getConfigDir(): string {
  return Bun.env.GITEGO_CONFIG_DIR ?? join(homedir(), ".gitego");
}

export function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

export function getBackupsDir(): string {
  return join(getConfigDir(), "backups");
}

export async function ensureConfigDir(): Promise<void> {
  await mkdir(getConfigDir(), { recursive: true, mode: 0o700 });
  await mkdir(getBackupsDir(), { recursive: true, mode: 0o700 });
}

export async function loadConfig(): Promise<EgoConfig> {
  const file = Bun.file(getConfigPath());
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

  const config = raw as EgoConfig;
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

export async function saveConfig(config: EgoConfig): Promise<void> {
  await ensureConfigDir();
  await Bun.write(getConfigPath(), `${JSON.stringify(config, null, 2)}\n`);
  await chmod(getConfigPath(), 0o600);
}

export function getProfile(config: EgoConfig, name: string): Profile | undefined {
  return config.profiles[name];
}

export function addProfile(config: EgoConfig, profile: Profile): EgoConfig {
  return {
    ...config,
    profiles: {
      ...config.profiles,
      [profile.name]: profile,
    },
  };
}

export function removeProfile(config: EgoConfig, name: string): EgoConfig {
  const { [name]: _, ...rest } = config.profiles;
  return {
    ...config,
    profiles: rest,
    activeProfile: config.activeProfile === name ? null : config.activeProfile,
    bindings: config.bindings.filter((b) => b.profile !== name),
  };
}

export function setActiveProfile(config: EgoConfig, name: string | null): EgoConfig {
  return {
    ...config,
    activeProfile: name,
  };
}

export function updateProfile(
  config: EgoConfig,
  name: string,
  updates: Partial<Omit<Profile, "name" | "createdAt">>,
): EgoConfig {
  const existing = config.profiles[name];
  if (!existing) return config;
  const merged = { ...existing, ...updates, name: existing.name, createdAt: existing.createdAt };
  // Strip undefined values so they don't persist as null in JSON
  for (const key of Object.keys(merged) as (keyof typeof merged)[]) {
    if (merged[key] === undefined) {
      delete merged[key];
    }
  }
  return {
    ...config,
    profiles: {
      ...config.profiles,
      [name]: merged,
    },
  };
}

export function profileExists(config: EgoConfig, name: string): boolean {
  return name in config.profiles;
}

export function getProfileNames(config: EgoConfig): string[] {
  return Object.keys(config.profiles);
}

export function addBinding(config: EgoConfig, path: string, profileName: string): EgoConfig {
  const normalized = path.replace(/\/+$/, "");
  const filtered = config.bindings.filter((b) => b.path !== normalized);
  return {
    ...config,
    bindings: [...filtered, { path: normalized, profile: profileName }],
  };
}

export function removeBinding(config: EgoConfig, path: string): EgoConfig {
  return {
    ...config,
    bindings: config.bindings.filter((b) => b.path !== path),
  };
}

export function getBindingForPath(
  config: EgoConfig,
  path: string,
): { path: string; profile: string } | undefined {
  return config.bindings
    .filter((b) => path === b.path || path.startsWith(`${b.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
}
