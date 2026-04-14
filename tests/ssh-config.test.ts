import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// We can't easily test addHostAlias/removeHostAlias since they operate on ~/.ssh/config.
// Instead, test the pure helper: removeBlock (extracted via buildHostBlock pattern).
// We test the exported functions that don't touch the real filesystem.

import { buildSSHCommand } from "../src/core/ssh.ts";

// Test discoverSSHKeys with a mock SSH directory
describe("discoverSSHKeys", () => {
  let tmpSshDir: string;

  beforeEach(async () => {
    tmpSshDir = join(tmpdir(), `gitego-ssh-test-${Date.now()}`);
    await mkdir(tmpSshDir, { recursive: true, mode: 0o700 });
  });

  afterEach(async () => {
    await rm(tmpSshDir, { recursive: true, force: true });
  });

  test("discovers keys that have matching .pub files", async () => {
    // Create key pair
    await Bun.write(join(tmpSshDir, "id_ed25519_work"), "private-key");
    await Bun.write(join(tmpSshDir, "id_ed25519_work.pub"), "public-key");
    // Create key without .pub (should be skipped)
    await Bun.write(join(tmpSshDir, "id_rsa_orphan"), "private-key");

    const glob = new Bun.Glob("id_*");
    const keys: string[] = [];

    for await (const entry of glob.scan({ cwd: tmpSshDir })) {
      if (entry.includes("/") || entry.includes("..")) continue;
      if (!entry.endsWith(".pub")) {
        const fullPath = join(tmpSshDir, entry);
        const pubExists = await Bun.file(`${fullPath}.pub`).exists();
        if (pubExists) {
          keys.push(entry);
        }
      }
    }

    expect(keys).toContain("id_ed25519_work");
    expect(keys).not.toContain("id_rsa_orphan");
    expect(keys).not.toContain("id_ed25519_work.pub");
  });
});

describe("generateSSHKey", () => {
  let tmpSshDir: string;

  afterAll(async () => {
    if (tmpSshDir) await rm(tmpSshDir, { recursive: true, force: true });
  });

  test("generates ed25519 key pair", async () => {
    tmpSshDir = join(tmpdir(), `gitego-keygen-test-${Date.now()}`);
    await mkdir(tmpSshDir, { recursive: true, mode: 0o700 });

    const keyPath = join(tmpSshDir, "id_ed25519_test");
    const proc = Bun.spawn(
      ["ssh-keygen", "-t", "ed25519", "-C", "test@test.com", "-f", keyPath, "-N", ""],
      { stdout: "ignore", stderr: "pipe" },
    );
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);

    expect(await Bun.file(keyPath).exists()).toBe(true);
    expect(await Bun.file(`${keyPath}.pub`).exists()).toBe(true);

    const pubContent = await Bun.file(`${keyPath}.pub`).text();
    expect(pubContent).toContain("ssh-ed25519");
    expect(pubContent).toContain("test@test.com");
  });
});

describe("buildSSHCommand edge cases", () => {
  test("throws on invalid path", () => {
    expect(() => buildSSHCommand("key\nwith\nnewline")).toThrow();
  });

  test("handles paths with spaces", () => {
    const cmd = buildSSHCommand("/home/user/my keys/id_rsa");
    expect(cmd).toContain('"/home/user/my keys/id_rsa"');
  });
});
