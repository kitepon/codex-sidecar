import { readFileSync } from "node:fs";
import { platformCapabilities } from "./platform.js";

export function sidecarProductStatus() {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
  return { schemaVersion: "1" as const, status: "ok" as const, coreVersion: manifest.version, platform: process.platform, capabilities: platformCapabilities() };
}
