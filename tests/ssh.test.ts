import { describe, expect, test } from "bun:test";
import { homedir } from "node:os";
import { buildSSHCommand, expandPath, isValidProfileName } from "../src/core/ssh.ts";

describe("ssh", () => {
  test("expandPath expands ~ to homedir", () => {
    expect(expandPath("~/.ssh/id_ed25519")).toBe(`${homedir()}/.ssh/id_ed25519`);
  });

  test("expandPath leaves absolute paths unchanged", () => {
    expect(expandPath("/home/user/.ssh/key")).toBe("/home/user/.ssh/key");
  });

  test("expandPath leaves relative paths unchanged", () => {
    expect(expandPath("some/path")).toBe("some/path");
  });
});

describe("isValidProfileName", () => {
  test("accepts alphanumeric names", () => {
    expect(isValidProfileName("work")).toBe(true);
    expect(isValidProfileName("personal123")).toBe(true);
  });

  test("accepts hyphens and underscores", () => {
    expect(isValidProfileName("my-work")).toBe(true);
    expect(isValidProfileName("my_work")).toBe(true);
    expect(isValidProfileName("a-b_c-1")).toBe(true);
  });

  test("rejects names with spaces", () => {
    expect(isValidProfileName("my work")).toBe(false);
  });

  test("rejects names with special characters", () => {
    expect(isValidProfileName("work@home")).toBe(false);
    expect(isValidProfileName("work.dev")).toBe(false);
    expect(isValidProfileName("work/dev")).toBe(false);
  });

  test("rejects empty string", () => {
    expect(isValidProfileName("")).toBe(false);
  });

  test("rejects names longer than 64 characters", () => {
    expect(isValidProfileName("a".repeat(64))).toBe(true);
    expect(isValidProfileName("a".repeat(65))).toBe(false);
  });
});

describe("buildSSHCommand", () => {
  test("builds command with tilde path", () => {
    const cmd = buildSSHCommand("~/.ssh/id_ed25519_work");
    expect(cmd).toBe(`ssh -i ${homedir()}/.ssh/id_ed25519_work -o IdentitiesOnly=yes`);
  });

  test("builds command with absolute path", () => {
    const cmd = buildSSHCommand("/home/user/.ssh/key");
    expect(cmd).toBe("ssh -i /home/user/.ssh/key -o IdentitiesOnly=yes");
  });
});
