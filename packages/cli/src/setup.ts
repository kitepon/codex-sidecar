import { resolve } from "node:path";
import { SETUP_CLIENTS, setupSidecar, type SetupClient, type SetupOptions } from "codex-sidecar-core";

export async function runSetupCli(args: string[], cliVersion: string) {
  const options: SetupOptions = { cliVersion };
  let projectRoot: string | undefined;
  let configFile = ".codex-sidecar.yml";
  const value = (index: number, flag: string) => {
    if (!args[index] || args[index].startsWith("--")) throw new Error(flag + "の値が必要です。");
    return args[index];
  };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--check") options.check = true;
    else if (arg === "--json") continue;
    else if (arg === "--ai") {
      const selected = value(++index, arg);
      const clients = selected === "all" ? [...SETUP_CLIENTS] : selected.split(",");
      if (options.clients || clients.some((ai) => !SETUP_CLIENTS.includes(ai as SetupClient)) || new Set(clients).size !== clients.length) throw new Error("--aiはallまたはclaude,codex,grok,cursorの重複しない一覧を一度だけ指定してください。");
      options.clients = clients as SetupClient[];
    } else if (arg === "--project" || arg === "--project-root") projectRoot = resolve(value(++index, arg));
    else if (arg === "--config") configFile = value(++index, arg);
    else throw new Error("setupの未対応オプションです: " + arg);
  }
  if (configFile !== ".codex-sidecar.yml" && !projectRoot) throw new Error("setupの--configには--projectが必要です。");
  if (projectRoot) options.project = { root: projectRoot, configFile };
  return setupSidecar(options);
}
