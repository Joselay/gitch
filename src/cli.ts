import cac from "cac";
import ansis from "ansis";
import { registerAdd } from "./commands/add.ts";
import { registerUse } from "./commands/use.ts";
import { registerWhoami } from "./commands/whoami.ts";
import { registerStatus } from "./commands/status.ts";
import { registerRemove } from "./commands/remove.ts";
import { registerList } from "./commands/list.ts";
import { registerBind } from "./commands/bind.ts";
import { registerUnbind } from "./commands/unbind.ts";
import { registerInit } from "./commands/init.ts";
import { registerResolve } from "./commands/resolve.ts";

const cli = cac("gitch");

registerAdd(cli);
registerUse(cli);
registerWhoami(cli);
registerStatus(cli);
registerRemove(cli);
registerList(cli);
registerBind(cli);
registerUnbind(cli);
registerInit(cli);
registerResolve(cli);

cli.help();
cli.version("1.0.0");

try {
  cli.parse();
} catch (err) {
  process.stderr.write(
    `${ansis.red(`✗ ${err instanceof Error ? err.message : "An unexpected error occurred."}`)}\n`,
  );
  process.exit(1);
}
