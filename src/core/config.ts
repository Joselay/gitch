import { homedir } from "node:os";
import { join } from "node:path";
import type { GitchConfig, Profile } from "../types.ts";
import { createDefaultConfig } from "../types.ts";

const CONFIG_DIR = Bun.env.GITCH_CONFIG_DIR ?? join(homedir(), ".gitch");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");
const BACKUPS_DIR = join(CONFIG_DIR, "backups");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function getBackupsDir(): string {
  return BACKUPS_DIR;
}

export async function ensureConfigDir(): Promise<void> {
  await Bun.$`mkdir -p ${CONFIG_DIR} ${BACKUPS_DIR}`.quiet();
}

export async function loadConfig(): Promise<GitchConfig> {
  const file = Bun.file(CONFIG_PATH);
  if (!(await file.exists())) {
    return createDefaultConfig();
  }
  return (await file.json()) as GitchConfig;
}

export async function saveConfig(config: GitchConfig): Promise<void> {
  await ensureConfigDir();
  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

export function getProfile(
  config: GitchConfig,
  name: string,
): Profile | undefined {
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

export function removeProfile(
  config: GitchConfig,
  name: string,
): GitchConfig {
  const { [name]: _, ...rest } = config.profiles;
  return {
    ...config,
    profiles: rest,
    activeProfile: config.activeProfile === name ? null : config.activeProfile,
    bindings: config.bindings.filter((b) => b.profile !== name),
  };
}

export function setActiveProfile(
  config: GitchConfig,
  name: string | null,
): GitchConfig {
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

export function addBinding(
  config: GitchConfig,
  path: string,
  profileName: string,
): GitchConfig {
  const filtered = config.bindings.filter((b) => b.path !== path);
  return {
    ...config,
    bindings: [...filtered, { path, profile: profileName }],
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
  return config.bindings.find((b) => b.path === path);
}
