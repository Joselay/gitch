import { resolve } from "node:path";
import type { Command } from "commander";
import {
  loadConfig,
  saveConfig,
  getBindingForPath,
  removeBinding,
} from "../core/config.ts";
import { createBackup } from "../core/backup.ts";
import * as out from "../ui/output.ts";

export function registerUnbind(program: Command): void {
  program
    .command("unbind")
    .argument("[path]", "directory to unbind", ".")
    .description("Remove directory binding")
    .action(async (path: string) => {
      const absolutePath = resolve(path);
      const config = await loadConfig();

      const binding = getBindingForPath(config, absolutePath);
      if (!binding) {
        out.error(`No binding found for "${absolutePath}".`);
        process.exit(1);
      }

      await createBackup();

      try {
        await Bun.$`git config --local --unset user.name`.quiet();
        await Bun.$`git config --local --unset user.email`.quiet();
      } catch {
        // local config may already be unset, that's fine
      }

      const updated = removeBinding(config, absolutePath);
      await saveConfig(updated);

      out.success(`Unbound "${absolutePath}" from "${binding.profile}".`);
    });
}
