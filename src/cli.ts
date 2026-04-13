import { Command } from "commander";
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

const program = new Command()
  .name("gitch")
  .description("Git account switcher — manage multiple Git identities")
  .version("1.0.0");

registerAdd(program);
registerUse(program);
registerWhoami(program);
registerStatus(program);
registerRemove(program);
registerList(program);
registerBind(program);
registerUnbind(program);
registerInit(program);
registerResolve(program);

program.parse();
