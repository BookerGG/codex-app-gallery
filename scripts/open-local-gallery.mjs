#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const args = new Set(process.argv.slice(2));

function optionValue(name, fallback) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }

  return fallback;
}

const requestedPort = Number(optionValue("--port", "30730"));
const timeoutMs = Number(optionValue("--timeout-ms", "60000"));
const skipSync = args.has("--skip-sync");
const noBrowser = args.has("--no-browser");
const smokeTest = args.has("--smoke-test");

function bundledPath(...parts) {
  return path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", ...parts);
}

function existingPath(...candidates) {
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function withRuntimePath(env = process.env) {
  const additions = [
    bundledPath("node", "bin"),
    bundledPath("bin", "fallback"),
    bundledPath("native", "git", "mingw64", "bin"),
    bundledPath("native", "git", "cmd"),
  ].filter((candidate) => fs.existsSync(candidate));

  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "Path";
  const nextEnv = { ...env };
  nextEnv[pathKey] = [...additions, nextEnv[pathKey] ?? ""].filter(Boolean).join(path.delimiter);
  nextEnv.GIT_EXEC_PATH = bundledPath("native", "git", "mingw64", "bin");
  nextEnv.GIT_SSL_BACKEND = "openssl";
  return nextEnv;
}

const env = withRuntimePath();
const pnpm = existingPath(bundledPath("bin", "fallback", "pnpm.cmd"), "pnpm");
const vinextCli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");

if (!pnpm) {
  console.error("Could not find pnpm. Install pnpm or run this from the Codex runtime workspace.");
  process.exit(1);
}

function runChecked(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: projectRoot,
    env,
    shell: process.platform === "win32" && command.toLowerCase().endsWith(".cmd"),
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(" ")} failed with exit code ${result.status}.`);
  }
}

function portAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function choosePort(startPort) {
  let port = startPort;
  while (!(await portAvailable(port))) {
    port += 1;
  }
  return port;
}

function requestGallery(url) {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: 2000 }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve(response.statusCode === 200 && body.includes("Codex App Gallery"));
      });
    });

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

async function waitForGallery(url, child) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Local gallery server exited early with code ${child.exitCode}.`);
    }

    if (await requestGallery(url)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd.exe", ["/d", "/c", "start", "", url], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return;
  }

  const command = process.platform === "darwin" ? "open" : "xdg-open";
  spawn(command, [url], { detached: true, stdio: "ignore" }).unref();
}

function stopServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill(process.platform === "win32" ? "SIGTERM" : "SIGTERM");
}

async function main() {
  process.chdir(projectRoot);
  console.log("");
  console.log("Codex App Gallery local launcher");

  if (!fs.existsSync(path.join(projectRoot, "node_modules"))) {
    console.log("Installing dependencies...");
    runChecked(pnpm, ["install"]);
  }

  if (!skipSync) {
    console.log("Syncing Codex apps...");
    runChecked(process.execPath, [path.join("scripts", "sync-codex-apps.mjs")]);
  }

  if (!fs.existsSync(vinextCli)) {
    throw new Error("Could not find Vinext. Run pnpm install, then try again.");
  }

  const port = await choosePort(requestedPort);
  const url = `http://127.0.0.1:${port}/`;

  if (port !== requestedPort) {
    console.log(`Port ${requestedPort} is busy, using ${port}.`);
  }

  console.log(`Starting local gallery at ${url}`);
  const child = spawn(
    process.execPath,
    [vinextCli, "dev", "--port", String(port), "--hostname", "127.0.0.1"],
    {
      cwd: projectRoot,
      env,
      stdio: "inherit",
    },
  );

  const stop = () => stopServer(child);
  process.once("SIGINT", () => {
    stop();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    stop();
    process.exit(143);
  });
  process.once("exit", stop);

  try {
    await waitForGallery(url, child);
  } catch (error) {
    stop();
    throw error;
  }

  console.log(`Codex App Gallery is ready: ${url}`);
  if (!noBrowser) {
    openBrowser(url);
  }

  if (smokeTest) {
    stop();
    await new Promise((resolve) => setTimeout(resolve, 500));
    return;
  }

  console.log("Keep this window open while you use the local app.");
  console.log("Close this window or press Ctrl+C to stop the local server.");

  await new Promise((resolve) => {
    child.once("exit", resolve);
  });
}

main().catch((error) => {
  console.error("");
  console.error("Could not open the local gallery:");
  console.error(error.message);
  process.exit(1);
});
