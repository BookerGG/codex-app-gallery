import { access, cp, mkdir, rm } from "node:fs/promises";
import { relative, resolve } from "node:path";
import type { Plugin } from "vite";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function isGitMetadata(publicRoot: string, sourcePath: string): boolean {
  return relative(publicRoot, sourcePath).split(/[\\/]+/).includes(".git");
}

// Packages Sites metadata and migrations after Vite finishes compiling.
export function sites(): Plugin {
  let root = process.cwd();

  return {
    name: "sites",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    async closeBundle() {
      const publicSource = resolve(root, "public");
      const clientOutput = resolve(root, "dist", "client");
      const outputDirectory = resolve(root, "dist", ".openai");
      const hostingConfig = resolve(root, ".openai", "hosting.json");
      const drizzleSource = resolve(root, "drizzle");

      if (await exists(publicSource)) {
        await mkdir(clientOutput, { recursive: true });
        await cp(publicSource, clientOutput, {
          recursive: true,
          force: true,
          filter: async (sourcePath) => !isGitMetadata(publicSource, sourcePath),
        });
      }

      await rm(outputDirectory, { recursive: true, force: true });
      await mkdir(outputDirectory, { recursive: true });

      if (await exists(hostingConfig)) {
        await cp(hostingConfig, resolve(outputDirectory, "hosting.json"));
      }
      if (await exists(drizzleSource)) {
        await cp(drizzleSource, resolve(outputDirectory, "drizzle"), {
          recursive: true,
        });
      }
    },
  };
}
