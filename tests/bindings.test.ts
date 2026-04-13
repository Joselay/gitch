import { describe, expect, test } from "bun:test";
import { addBinding, getBindingForPath, removeBinding } from "../src/core/config.ts";
import { createDefaultConfig } from "../src/types.ts";

describe("bindings", () => {
  test("addBinding adds a new binding", () => {
    const config = createDefaultConfig();
    const updated = addBinding(config, "/home/user/work", "work");
    expect(updated.bindings).toEqual([{ path: "/home/user/work", profile: "work" }]);
  });

  test("addBinding replaces existing binding for same path", () => {
    let config = createDefaultConfig();
    config = addBinding(config, "/home/user/project", "work");
    config = addBinding(config, "/home/user/project", "personal");
    expect(config.bindings).toEqual([{ path: "/home/user/project", profile: "personal" }]);
  });

  test("addBinding does not mutate original", () => {
    const config = createDefaultConfig();
    addBinding(config, "/home/user/work", "work");
    expect(config.bindings).toEqual([]);
  });

  test("removeBinding removes by path", () => {
    let config = createDefaultConfig();
    config = addBinding(config, "/home/user/work", "work");
    config = addBinding(config, "/home/user/personal", "personal");
    const updated = removeBinding(config, "/home/user/work");
    expect(updated.bindings).toEqual([{ path: "/home/user/personal", profile: "personal" }]);
  });

  test("removeBinding on non-existent path is a no-op", () => {
    const config = createDefaultConfig();
    const updated = removeBinding(config, "/nonexistent");
    expect(updated.bindings).toEqual([]);
  });

  test("getBindingForPath finds matching binding", () => {
    let config = createDefaultConfig();
    config = addBinding(config, "/home/user/work", "work");
    const binding = getBindingForPath(config, "/home/user/work");
    expect(binding).toEqual({ path: "/home/user/work", profile: "work" });
  });

  test("getBindingForPath returns undefined for no match", () => {
    const config = createDefaultConfig();
    expect(getBindingForPath(config, "/nonexistent")).toBeUndefined();
  });

  test("getBindingForPath matches subdirectories", () => {
    let config = createDefaultConfig();
    config = addBinding(config, "/home/user/work", "work");
    const binding = getBindingForPath(config, "/home/user/work/project/src");
    expect(binding).toEqual({ path: "/home/user/work", profile: "work" });
  });

  test("getBindingForPath picks longest matching path", () => {
    let config = createDefaultConfig();
    config = addBinding(config, "/home/user/work", "work");
    config = addBinding(config, "/home/user/work/special", "special");
    const binding = getBindingForPath(config, "/home/user/work/special/src");
    expect(binding).toEqual({
      path: "/home/user/work/special",
      profile: "special",
    });
  });

  test("getBindingForPath does not match partial directory names", () => {
    let config = createDefaultConfig();
    config = addBinding(config, "/home/user/work", "work");
    expect(getBindingForPath(config, "/home/user/workspace")).toBeUndefined();
  });
});
