import { describe, expect, test } from "bun:test";
import type { DoctorReport } from "../src/core/doctor.ts";
import { runDiagnostics } from "../src/core/doctor.ts";
import { createDefaultConfig } from "../src/types.ts";

describe("doctor diagnostics", () => {
  test("returns global checks for empty config", async () => {
    const config = createDefaultConfig();
    const report: DoctorReport = await runDiagnostics(config);

    expect(report.global).toBeDefined();
    expect(report.global.length).toBeGreaterThan(0);
    expect(report.profiles).toEqual({});
  });

  test("warns when no active profile is set", async () => {
    const config = createDefaultConfig();
    const report = await runDiagnostics(config);

    const noActiveCheck = report.global.find((r) => r.label.includes("No active profile"));
    expect(noActiveCheck).toBeDefined();
    expect(noActiveCheck?.status).toBe("warn");
  });

  test("fails when active profile references nonexistent profile", async () => {
    const config = {
      ...createDefaultConfig(),
      activeProfile: "ghost",
    };
    const report = await runDiagnostics(config);

    const missingCheck = report.global.find((r) => r.label.includes("ghost"));
    expect(missingCheck).toBeDefined();
    expect(missingCheck?.status).toBe("fail");
  });

  test("runs profile checks for each profile", async () => {
    const config = {
      ...createDefaultConfig(),
      profiles: {
        work: {
          name: "work",
          gitName: "John",
          gitEmail: "john@work.com",
          sshKeyPath: "~/.ssh/id_nonexistent_test_key",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      },
    };

    const report = await runDiagnostics(config);
    const workResults = report.profiles.work;
    expect(workResults).toBeDefined();
    expect(workResults?.length).toBeGreaterThan(0);

    // SSH key should fail since it doesn't exist
    const keyCheck = workResults?.find((r) => r.label.includes("SSH private key"));
    expect(keyCheck?.status).toBe("fail");
  });
});
