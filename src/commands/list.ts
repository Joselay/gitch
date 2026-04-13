import type { CAC } from "cac";
import { getProfileNames, loadConfig } from "../core/config.ts";
import * as out from "../ui/output.ts";

export function registerList(program: CAC): void {
  program.command("list", "List all profile names").action(async () => {
    const config = await loadConfig();
    const names = getProfileNames(config);

    if (names.length === 0) {
      out.emptyProfiles();
      return;
    }

    for (const name of names) {
      out.listItem(name, config.activeProfile === name);
    }
  });
}
