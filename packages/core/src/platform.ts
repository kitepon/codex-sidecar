// OS別の対応理由をここに集約する。所有moduleは必要な能力と従来のエラー型だけを指定する。
export function isWin32(): boolean {
  return process.platform === "win32";
}

const posixRequirements = {
  authLease: "auth leases require POSIX hard links",
  processIdentity: "launch requires POSIX",
  processGroup: "process groups require POSIX",
  runTransition: "run transitions require POSIX hard links",
  asyncWork: "async work workers require POSIX process groups",
} as const;

export type PlatformRequirement = keyof typeof posixRequirements;

export function platformLimitation(requirement: PlatformRequirement, platform: NodeJS.Platform = process.platform): string | undefined {
  return platform === "win32" ? posixRequirements[requirement] : undefined;
}

export function requirePlatformCapability(requirement: PlatformRequirement): void {
  const reason = platformLimitation(requirement);
  if (reason) throw Object.assign(new Error(`RUN_UNSUPPORTED_PLATFORM: ${reason}`), { code: "RUN_UNSUPPORTED_PLATFORM" });
}

export function platformCapabilities(platform: NodeJS.Platform = process.platform) {
  const native = (requirement: PlatformRequirement) => {
    const reason = platformLimitation(requirement, platform);
    return reason ? { status: "unsupported" as const, reason, errorCode: "RUN_UNSUPPORTED_PLATFORM" } : { status: "supported" as const };
  };
  return {
    setup: { status: "supported" as const },
    mcpStdio: { status: "supported" as const },
    configurationDiagnostics: { status: "supported" as const },
    runtimeErrorStore: { status: "supported" as const },
    synchronousDryRun: { status: "supported" as const },
    codexExecution: native("authLease"),
    synchronousWork: native("authLease"),
    asynchronousWork: native("asyncWork"),
    authRecovery: native("authLease"),
  };
}
