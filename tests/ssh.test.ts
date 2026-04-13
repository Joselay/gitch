import { describe, expect, test } from "bun:test";
import { homedir } from "node:os";
import {
  buildSSHCommand,
  expandPath,
  isValidProfileName,
  isValidSSHKeyPath,
} from "../src/core/ssh.ts";

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

describe("isValidSSHKeyPath", () => {
  test("accepts normal paths", () => {
    expect(isValidSSHKeyPath("~/.ssh/id_ed25519")).toBe(true);
    expect(isValidSSHKeyPath("/home/user/.ssh/key")).toBe(true);
    expect(isValidSSHKeyPath("~/.ssh/id_ed25519_work")).toBe(true);
  });

  test("accepts paths with spaces", () => {
    expect(isValidSSHKeyPath("/home/user/my keys/id_rsa")).toBe(true);
  });

  test("rejects paths with newlines", () => {
    expect(isValidSSHKeyPath("/home/user/.ssh/key\nHost *")).toBe(false);
    expect(isValidSSHKeyPath("key\rpath")).toBe(false);
  });

  test("rejects paths with quotes and backticks", () => {
    expect(isValidSSHKeyPath('/home/"key')).toBe(false);
    expect(isValidSSHKeyPath("/home/'key")).toBe(false);
    expect(isValidSSHKeyPath("/home/`key")).toBe(false);
  });

  test("rejects paths with shell metacharacters", () => {
    expect(isValidSSHKeyPath("/home/$USER/key")).toBe(false);
    expect(isValidSSHKeyPath(`/home/\${USER}/key`)).toBe(false);
    expect(isValidSSHKeyPath("key\\path")).toBe(false);
  });

  test("rejects paths with control characters", () => {
    expect(isValidSSHKeyPath("/home/key\0")).toBe(false);
    expect(isValidSSHKeyPath("/home/key\t")).toBe(false);
  });

  test("rejects empty or whitespace-only paths", () => {
    expect(isValidSSHKeyPath("")).toBe(false);
    expect(isValidSSHKeyPath("   ")).toBe(false);
  });

  test("rejects paths longer than 4096 characters", () => {
    expect(isValidSSHKeyPath("/a".repeat(2048))).toBe(true);
    expect(isValidSSHKeyPath("a".repeat(4097))).toBe(false);
  });
});

describe("buildSSHCommand", () => {
  test("builds command with tilde path", () => {
    const cmd = buildSSHCommand("~/.ssh/id_ed25519_work");
    expect(cmd).toBe(`ssh -i "${homedir()}/.ssh/id_ed25519_work" -o IdentitiesOnly=yes`);
  });

  test("builds command with absolute path", () => {
    const cmd = buildSSHCommand("/home/user/.ssh/key");
    expect(cmd).toBe('ssh -i "/home/user/.ssh/key" -o IdentitiesOnly=yes');
  });
});
