import { describe, expect, test } from "bun:test";
import { addProfile } from "../src/core/config.ts";
import type { GitchConfig, Profile } from "../src/types.ts";
import { createDefaultConfig } from "../src/types.ts";

// Test the pure renameProfileInConfig logic extracted inline
function renameProfileInConfig(config: GitchConfig, oldName: string, newName: string): GitchConfig {
  const oldProfile = config.profiles[oldName];
  if (!oldProfile) return config;

  const { [oldName]: _, ...rest } = config.profiles;

  return {
    ...config,
    profiles: {
      ...rest,
      [newName]: { ...oldProfile, name: newName },
    },
    activeProfile: config.activeProfile === oldName ? newName : config.activeProfile,
    bindings: config.bindings.map((b) => (b.profile === oldName ? { ...b, profile: newName } : b)),
  };
}

const mockProfile: Profile = {
  name: "work",
  gitName: "John Doe",
  gitEmail: "john@work.com",
  sshKeyPath: "~/.ssh/id_ed25519_work",
  ghUsername: "johndoe",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("renameProfileInConfig", () => {
  test("renames profile key and name field", () => {
    const config = addProfile(createDefaultConfig(), mockProfile);
    const renamed = renameProfileInConfig(config, "work", "job");
    expect(renamed.profiles.job).toBeDefined();
    expect(renamed.profiles.job?.name).toBe("job");
    expect(renamed.profiles.work).toBeUndefined();
  });

  test("preserves all other profile fields", () => {
    const config = addProfile(createDefaultConfig(), mockProfile);
    const renamed = renameProfileInConfig(config, "work", "job");
    const p = renamed.profiles.job;
    expect(p?.gitName).toBe("John Doe");
    expect(p?.gitEmail).toBe("john@work.com");
    expect(p?.sshKeyPath).toBe("~/.ssh/id_ed25519_work");
    expect(p?.ghUsername).toBe("johndoe");
    expect(p?.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  test("updates activeProfile when renaming active profile", () => {
    let config = addProfile(createDefaultConfig(), mockProfile);
    config = { ...config, activeProfile: "work" };
    const renamed = renameProfileInConfig(config, "work", "job");
    expect(renamed.activeProfile).toBe("job");
  });

  test("preserves activeProfile when renaming non-active profile", () => {
    let config = addProfile(createDefaultConfig(), mockProfile);
    config = { ...config, activeProfile: "other" };
    const renamed = renameProfileInConfig(config, "work", "job");
    expect(renamed.activeProfile).toBe("other");
  });

  test("updates bindings referencing the old name", () => {
    let config = addProfile(createDefaultConfig(), mockProfile);
    config = {
      ...config,
      bindings: [
        { path: "/home/user/project", profile: "work" },
        { path: "/home/user/other", profile: "personal" },
      ],
    };
    const renamed = renameProfileInConfig(config, "work", "job");
    expect(renamed.bindings).toEqual([
      { path: "/home/user/project", profile: "job" },
      { path: "/home/user/other", profile: "personal" },
    ]);
  });

  test("returns unchanged config for nonexistent profile", () => {
    const config = addProfile(createDefaultConfig(), mockProfile);
    const renamed = renameProfileInConfig(config, "nonexistent", "job");
    expect(renamed).toEqual(config);
  });
});
