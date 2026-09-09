import { execFile } from "node:child_process";
import { requirePlatformCapability } from "./platform.js";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ProcessIdentity { pid: number; startIdentity: string; }

export async function currentProcessIdentity(): Promise<ProcessIdentity> {
  requirePlatformCapability("processIdentity");
  return { pid: process.pid, startIdentity: await processStartIdentity(process.pid) };
}

export async function processStartIdentity(pid: number): Promise<string> {
  requirePlatformCapability("processIdentity");
  const { stdout } = await execFileAsync("ps", ["-p", String(pid), "-o", "lstart="], { encoding: "utf8" });
  const value = stdout.trim();
  if (!value) throw new Error(`process ${pid} is not observable`);
  return value;
}

export async function matchesProcessIdentity(identity: ProcessIdentity): Promise<boolean> {
  try { return (await processStartIdentity(identity.pid)) === identity.startIdentity; } catch { return false; }
}
