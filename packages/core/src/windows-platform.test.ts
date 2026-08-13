import assert from "node:assert/strict";
import test from "node:test";

import { startWorkRun } from "./work-run-service.js";

test("Windows nativeは永続状態を作る前にasync workをunsupportedとして返す", {
  skip: process.platform !== "win32" ? "Windows固有契約" : false,
}, async () => {
  let configLoaded = false;
  const result = await startWorkRun(async () => {
    configLoaded = true;
    throw new Error("Windowsではconfigを読まない");
  }, {
    projectRoot: "C:\\repo",
    idempotencyKey: "abcdefghijklmnopqrstuv",
    prompt: "change README",
  });

  assert.equal(configLoaded, false);
  assert.equal(result.kind, "run_error");
  if (result.kind !== "run_error") throw new Error("run_errorではありません");
  assert.equal(result.error.code, "RUN_UNSUPPORTED_PLATFORM");
  assert.equal(result.retryable, false);
});
