import type { CAC } from "cac";
import { loadConfig } from "../core/config.ts";
import type { DiagnosticResult } from "../core/doctor.ts";
import { runDiagnostics } from "../core/doctor.ts";
import * as out from "../ui/output.ts";

function renderResult(result: DiagnosticResult): void {
  switch (result.status) {
    case "pass":
      out.success(result.label);
      break;
    case "fail":
      out.error(result.label);
      break;
    case "warn":
      out.warn(result.label);
      break;
  }
  if (result.hint) {
    out.dim(`    ${result.hint}`);
  }
}

export function registerDoctor(program: CAC): void {
  program.command("doctor", "Check system health and profile validity").action(async () => {
    const config = await loadConfig();

    const report = await runDiagnostics(config);

    out.heading("Global\n");
    for (const result of report.global) {
      renderResult(result);
    }

    for (const [name, results] of Object.entries(report.profiles)) {
      process.stdout.write("\n");
      out.heading(`Profile: ${name}\n`);
      for (const result of results) {
        renderResult(result);
      }
    }

    const allResults = [...report.global, ...Object.values(report.profiles).flat()];
    const failures = allResults.filter((r) => r.status === "fail").length;

    process.stdout.write("\n");
    if (failures === 0) {
      out.success("All checks passed!");
    } else {
      out.error(`${failures} issue${failures > 1 ? "s" : ""} found.`);
    }
  });
}
