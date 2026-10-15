#!/usr/bin/env node

import { access, cp, mkdtemp, rm, symlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sourceDirectory = process.cwd();
const dependencyCache = "/home/willy/.cache/willtreino-deps/node_modules";
const isWindowsMount = sourceDirectory.startsWith("/mnt/");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      resolve(code ?? (signal ? 1 : 0));
    });
  });
}

const useLinuxWorkspace = isWindowsMount && (await exists(dependencyCache));
const workspace = useLinuxWorkspace
  ? await mkdtemp(join(tmpdir(), "willtreino-emulator-"))
  : sourceDirectory;

try {
  if (useLinuxWorkspace) {
    await cp(sourceDirectory, workspace, {
      filter: (path) =>
        ![".git", ".next", "node_modules"].some((name) => path.endsWith(`/${name}`)),
      recursive: true,
    });
    await symlink(dependencyCache, join(workspace, "node_modules"));
    console.log("Executando Emulator Suite a partir do filesystem Linux do WSL.");
  }

  const environment = {
    ...process.env,
    FUNCTIONS_DISCOVERY_TIMEOUT: "90",
    RESOLVE_PUBLIC_USER_ID_RATE_LIMIT: "3",
    RESOLVE_PUBLIC_USER_ID_RATE_LIMIT_WINDOW_SECONDS: "600",
    SEND_TRAINING_INVITE_RATE_LIMIT: "3",
    SEND_TRAINING_INVITE_RATE_LIMIT_WINDOW_SECONDS: "600",
  };
  const exitCode = await run(
    join(workspace, "node_modules/.bin/firebase"),
    [
      "emulators:exec",
      "--project",
      "willtreino-local",
      "--only",
      "auth,firestore,functions,storage",
      "npm run test:integration",
    ],
    { cwd: workspace, env: environment },
  );
  process.exitCode = exitCode;
} finally {
  if (useLinuxWorkspace) {
    await rm(workspace, { force: true, recursive: true });
  }
}
