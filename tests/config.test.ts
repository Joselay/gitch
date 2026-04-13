import { describe, expect, test } from "bun:test";
import {
  addProfile,
  getProfile,
  getProfileNames,
  profileExists,
  removeProfile,
  setActiveProfile,
} from "../src/core/config.ts";
import type { Profile } from "../src/types.ts";
import { createDefaultConfig } from "../src/types.ts";

const mockProfile: Profile = {
  name: "work",
  gitName: "John Doe",
  gitEmail: "john@work.com",
  sshKeyPath: "~/.ssh/id_ed25519_work",
  ghUsername: "johndoe",
  createdAt: "2024-01-01T00:00:00.000Z",
};

const mockProfile2: Profile = {
  name: "personal",
  gitName: "John",
  gitEmail: "john@personal.com",
  sshKeyPath: "~/.ssh/id_ed25519_personal",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("config", () => {
  test("createDefaultConfig returns empty config", () => {
    const config = createDefaultConfig();
    expect(config.version).toBe(1);
    expect(config.activeProfile).toBeNull();
    expect(config.profiles).toEqual({});
    expect(config.bindings).toEqual([]);
  });

  test("addProfile adds a profile", () => {
    const config = createDefaultConfig();
    const updated = addProfile(config, mockProfile);
    expect(updated.profiles.work).toEqual(mockProfile);
    expect(Object.keys(updated.profiles)).toHaveLength(1);
  });

  test("addProfile does not mutate original", () => {
    const config = createDefaultConfig();
    addProfile(config, mockProfile);
    expect(Object.keys(config.profiles)).toHaveLength(0);
  });

  test("getProfile returns profile by name", () => {
    const config = addProfile(createDefaultConfig(), mockProfile);
    expect(getProfile(config, "work")).toEqual(mockProfile);
    expect(getProfile(config, "nonexistent")).toBeUndefined();
  });

  test("profileExists checks correctly", () => {
    const config = addProfile(createDefaultConfig(), mockProfile);
    expect(profileExists(config, "work")).toBe(true);
    expect(profileExists(config, "nope")).toBe(false);
  });

  test("removeProfile removes and clears activeProfile if matching", () => {
    let config = addProfile(createDefaultConfig(), mockProfile);
    config = addProfile(config, mockProfile2);
    config = setActiveProfile(config, "work");

    const updated = removeProfile(config, "work");
    expect(updated.profiles.work).toBeUndefined();
    expect(updated.activeProfile).toBeNull();
    expect(updated.profiles.personal).toEqual(mockProfile2);
  });

  test("removeProfile preserves activeProfile if not matching", () => {
    let config = addProfile(createDefaultConfig(), mockProfile);
    config = addProfile(config, mockProfile2);
    config = setActiveProfile(config, "personal");

    const updated = removeProfile(config, "work");
    expect(updated.activeProfile).toBe("personal");
  });

  test("removeProfile cleans up bindings", () => {
    let config = addProfile(createDefaultConfig(), mockProfile);
    config = {
      ...config,
      bindings: [
        { path: "/home/user/project", profile: "work" },
        { path: "/home/user/other", profile: "personal" },
      ],
    };

    const updated = removeProfile(config, "work");
    expect(updated.bindings).toEqual([{ path: "/home/user/other", profile: "personal" }]);
  });

  test("setActiveProfile updates active", () => {
    const config = addProfile(createDefaultConfig(), mockProfile);
    const updated = setActiveProfile(config, "work");
    expect(updated.activeProfile).toBe("work");
  });

  test("getProfileNames returns all names", () => {
    let config = addProfile(createDefaultConfig(), mockProfile);
    config = addProfile(config, mockProfile2);
    expect(getProfileNames(config)).toEqual(["work", "personal"]);
  });
});
