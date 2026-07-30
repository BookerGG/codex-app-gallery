#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import http from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const galleryRoot = path.resolve(path.dirname(scriptPath), "..");
const codexRoot = path.resolve(process.env.CODEX_APPS_ROOT ?? path.join(galleryRoot, "..", ".."));
const publicAppsRoot = path.join(galleryRoot, "public", "apps");
const generatedDataPath = path.join(galleryRoot, "app", "app-projects.ts");
const statePath = path.join(galleryRoot, "scripts", "codex-gallery-state.json");

const accents = ["teal", "coral", "indigo", "amber"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const skipDirectoryNames = new Set([
  ".git",
  "node_modules",
  ".next",
  ".vinext",
  ".wrangler",
  ".cache",
]);

function toUrlPath(value) {
  return value.split(path.sep).join("/");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function writeTextIfChanged(filePath, nextText) {
  const current = await readText(filePath);
  if (current === nextText) {
    return false;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, nextText);
  return true;
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function hashFile(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

async function listFiles(root, options = {}) {
  const files = [];
  const skipGitMetadata = options.skipGitMetadata ?? true;

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (skipDirectoryNames.has(entry.name)) {
          continue;
        }
        if (skipGitMetadata && entry.name === ".git") {
          continue;
        }
        await walk(entryPath);
        continue;
      }
      if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  await walk(root);
  files.sort();
  return files;
}

async function signatureForDirectory(sourceRoot) {
  const hash = createHash("sha256");
  const files = await listFiles(sourceRoot);
  for (const filePath of files) {
    const relative = toUrlPath(path.relative(sourceRoot, filePath));
    hash.update(relative);
    hash.update("\0");
    hash.update(await hashFile(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function findCodexAppSources() {
  const candidates = [];

  async function walk(current, depth) {
    if (depth > 7) {
      return;
    }
    if (current !== codexRoot && isInside(galleryRoot, current)) {
      return;
    }

    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
    const isOutputsDirectory =
      path.basename(current).toLowerCase() === "outputs" &&
      path.basename(path.dirname(current)).toLowerCase() === "build";

    if (isOutputsDirectory) {
      for (const entry of entries) {
        if (!entry.isDirectory() || skipDirectoryNames.has(entry.name)) {
          continue;
        }
        const appPath = path.join(current, entry.name);
        if (await exists(path.join(appPath, "index.html"))) {
          candidates.push(appPath);
        }
      }
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || skipDirectoryNames.has(entry.name)) {
        continue;
      }
      await walk(path.join(current, entry.name), depth + 1);
    }
  }

  await walk(codexRoot, 0);
  return candidates.sort();
}

function titleFromHtml(html) {
  return html.match(/<title>(.*?)<\/title>/i)?.[1]?.trim() ?? "";
}

function firstHeading(readme) {
  return readme.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
}

function firstParagraph(readme) {
  const withoutTitle = readme.replace(/^#\s+.+$/m, "").trim();
  const paragraphs = withoutTitle
    .split(/\n\s*\n/g)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((part) => !part.startsWith("##"))
    .filter((part) => !part.startsWith("-"))
    .filter((part) => !part.startsWith("```"));

  return paragraphs[0] ?? "";
}

function bulletsForSection(readme, heading) {
  const lines = readme.split(/\r?\n/);
  const headingIndex = lines.findIndex(
    (line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase(),
  );
  if (headingIndex < 0) {
    return [];
  }
  const sectionLines = [];
  for (const line of lines.slice(headingIndex + 1)) {
    if (/^##\s+/.test(line)) {
      break;
    }
    sectionLines.push(line);
  }

  return sectionLines
    .map((line) => line.match(/^\s*-\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean)
    .map((line) => line.replace(/\.$/, ""))
    .slice(0, 3);
}

function dateFromSourcePath(sourcePath) {
  const match = sourcePath.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return "Synced from Codex";
  }
  const [, year, month, day] = match;
  return `Started ${monthNames[Number(month) - 1]} ${Number(day)}, ${year}`;
}

function eyebrowForTitle(title) {
  if (/ticket|support|queue|crm|admin|ops/i.test(title)) {
    return "Internal tool";
  }
  if (/job|habit|tracker|personal|journal/i.test(title)) {
    return "Personal workflow";
  }
  return "Codex app";
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function statusCounts(dataText) {
  const counts = new Map();
  for (const match of dataText.matchAll(/status:\s*["']([^"']+)["']/g)) {
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  return counts;
}

function priorityCounts(dataText) {
  const counts = new Map();
  for (const match of dataText.matchAll(/priority:\s*["']([^"']+)["']/g)) {
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  return counts;
}

async function statsForApp(sourcePath, title) {
  const dataText = await readText(path.join(sourcePath, "src", "data.js"));
  const statuses = statusCounts(dataText);
  const priorities = priorityCounts(dataText);
  const recordCount = countMatches(dataText, /\bid:\s*["']/g);

  if (/ticket|support/i.test(title)) {
    return [
      { label: "Open", value: String(statuses.get("Open") ?? 0) },
      { label: "Urgent", value: String(priorities.get("Urgent") ?? 0) },
      {
        label: "Resolved",
        value: String((statuses.get("Resolved") ?? 0) + (statuses.get("Closed") ?? 0)),
      },
    ];
  }

  if (/job|application/i.test(title)) {
    return [
      { label: "Applications", value: String(recordCount) },
      { label: "Interviewing", value: String(statuses.get("Interviewing") ?? 0) },
      { label: "Offers", value: String(statuses.get("Offer") ?? 0) },
    ];
  }

  return [
    { label: "Records", value: String(recordCount) },
    { label: "Files", value: String((await listFiles(sourcePath)).length) },
    {
      label: "Tests",
      value: String((await listFiles(path.join(sourcePath, "tests")).catch(() => [])).length),
    },
  ];
}

async function metadataForSource(sourcePath, index, usedSlugs) {
  const readme = await readText(path.join(sourcePath, "README.md"));
  const html = await readText(path.join(sourcePath, "index.html"));
  const title =
    firstHeading(readme) ||
    titleFromHtml(html) ||
    path.basename(sourcePath).replace(/[-_]+/g, " ");
  const baseSlug = slugify(path.basename(sourcePath)) || slugify(title) || `codex-app-${index + 1}`;
  let slug = baseSlug;
  let suffix = 2;
  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  usedSlugs.add(slug);

  const highlightSections = [
    bulletsForSection(readme, "MVP Features"),
    bulletsForSection(readme, "Current Milestone"),
    bulletsForSection(readme, "Features"),
  ].find((items) => items.length > 0);

  return {
    title,
    eyebrow: eyebrowForTitle(title),
    status: "Live demo",
    date: dateFromSourcePath(sourcePath),
    href: `/apps/${slug}/index.html`,
    image: `/apps/${slug}/preview.png`,
    accent: accents[index % accents.length],
    summary:
      firstParagraph(readme) ||
      `A Codex-built app synced automatically from ${path.basename(sourcePath)}.`,
    stats: await statsForApp(sourcePath, title),
    highlights: highlightSections ?? [
      "Synced from the Codex source project",
      "Packaged as a live static demo",
      "Included in automatic gallery refreshes",
    ],
    slug,
    sourceKey: toUrlPath(path.relative(codexRoot, sourcePath)),
    sourcePath,
    signature: await signatureForDirectory(sourcePath),
  };
}

async function copyFileIfChanged(sourcePath, targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  if (await exists(targetPath)) {
    const [sourceHash, targetHash] = await Promise.all([
      hashFile(sourcePath),
      hashFile(targetPath),
    ]);
    if (sourceHash === targetHash) {
      return false;
    }
  }
  await fs.copyFile(sourcePath, targetPath);
  return true;
}

async function removeStaleTargetFiles(targetRoot, desiredRelatives) {
  if (!(await exists(targetRoot))) {
    return;
  }

  const files = await listFiles(targetRoot);
  for (const filePath of files) {
    const relative = toUrlPath(path.relative(targetRoot, filePath));
    if (!desiredRelatives.has(relative)) {
      await fs.rm(filePath, { force: true });
    }
  }

  async function removeEmptyDirectories(current) {
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== ".git") {
        await removeEmptyDirectories(path.join(current, entry.name));
      }
    }
    if (current !== targetRoot) {
      const remaining = await fs.readdir(current).catch(() => []);
      if (remaining.length === 0) {
        await fs.rmdir(current);
      }
    }
  }

  await removeEmptyDirectories(targetRoot);
}

async function mirrorApp(project) {
  const targetRoot = path.join(publicAppsRoot, project.slug);
  if (!isInside(publicAppsRoot, targetRoot)) {
    throw new Error(`Refusing to sync outside public app root: ${targetRoot}`);
  }

  const desiredRelatives = new Set(["preview.png"]);
  const sourceFiles = await listFiles(project.sourcePath);
  let changed = false;

  for (const sourceFile of sourceFiles) {
    const relative = toUrlPath(path.relative(project.sourcePath, sourceFile));
    desiredRelatives.add(relative);
    const targetFile = path.join(targetRoot, ...relative.split("/"));
    changed = (await copyFileIfChanged(sourceFile, targetFile)) || changed;
  }

  await removeStaleTargetFiles(targetRoot, desiredRelatives);
  return changed;
}

function mimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml; charset=utf-8",
    }[extension] ?? "application/octet-stream"
  );
}

async function findBrowserExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const moduleRoots = [
      process.env.PLAYWRIGHT_NODE_MODULES,
      path.join(
        os.homedir(),
        ".cache",
        "codex-runtimes",
        "codex-primary-runtime",
        "dependencies",
        "node",
        "node_modules",
      ),
    ].filter(Boolean);

    for (const moduleRoot of moduleRoots) {
      try {
        const requireFromRoot = createRequire(path.join(moduleRoot, "playwright", "package.json"));
        return requireFromRoot("playwright");
      } catch {
        // Try the next known module root.
      }
    }
  }
  return null;
}

async function capturePreviews(projects, changedSlugs) {
  const targets = [];
  for (const project of projects) {
    if (
      changedSlugs.has(project.slug) ||
      !(await exists(path.join(publicAppsRoot, project.slug, "preview.png")))
    ) {
      targets.push(project);
    }
  }
  if (targets.length === 0) {
    return;
  }

  const playwright = await loadPlaywright();
  const executablePath = await findBrowserExecutable();
  if (!playwright || !executablePath) {
    console.warn("Skipping preview screenshots because Playwright or Chrome is unavailable.");
    return;
  }

  const server = http.createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
      let relative = requestPath.replace(/^\/+/, "");
      if (!relative || relative.endsWith("/")) {
        relative += "index.html";
      }
      const filePath = path.resolve(publicAppsRoot, ...relative.split("/"));
      if (!isInside(publicAppsRoot, filePath)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      const body = await fs.readFile(filePath);
      response.writeHead(200, { "content-type": mimeType(filePath) });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const { port } = server.address();
    browser = await playwright.chromium.launch({ executablePath });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
      deviceScaleFactor: 1,
    });

    for (const project of targets) {
      try {
        await page.goto(`http://127.0.0.1:${port}/${project.slug}/index.html`, {
          waitUntil: "networkidle",
        });
        await page.screenshot({
          path: path.join(publicAppsRoot, project.slug, "preview.png"),
          fullPage: false,
        });
      } catch (error) {
        console.warn(`Could not capture ${project.title}: ${error.message}`);
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

function generatedData(projects) {
  const publicProjects = projects.map(
    ({ sourcePath, sourceKey, signature, slug, ...project }) => project,
  );
  return `// Generated by scripts/sync-codex-apps.mjs. Do not edit manually.

export type AppProject = {
  title: string;
  eyebrow: string;
  status: string;
  date: string;
  href: string;
  image: string;
  accent: string;
  summary: string;
  stats: Array<{ label: string; value: string }>;
  highlights: string[];
};

export const appProjects: AppProject[] = ${JSON.stringify(publicProjects, null, 2)};
`;
}

async function main() {
  await fs.mkdir(publicAppsRoot, { recursive: true });
  const previousState = await readJson(statePath, { sources: {} });
  const sourcePaths = await findCodexAppSources();
  const usedSlugs = new Set();
  const projects = [];

  for (const [index, sourcePath] of sourcePaths.entries()) {
    projects.push(await metadataForSource(sourcePath, index, usedSlugs));
  }

  const changedSlugs = new Set(
    projects
      .filter((project) => previousState.sources?.[project.sourceKey] !== project.signature)
      .map((project) => project.slug),
  );

  let copiedAny = false;
  for (const project of projects) {
    copiedAny = (await mirrorApp(project)) || copiedAny;
  }

  await capturePreviews(projects, changedSlugs);

  const dataChanged = await writeTextIfChanged(generatedDataPath, generatedData(projects));
  const nextState = {
    sources: Object.fromEntries(projects.map((project) => [project.sourceKey, project.signature])),
  };
  const stateChanged = await writeTextIfChanged(statePath, `${JSON.stringify(nextState, null, 2)}\n`);

  const changed = changedSlugs.size > 0 || copiedAny || dataChanged || stateChanged;
  console.log(
    `${changed ? "Synced" : "No changes for"} ${projects.length} Codex app${projects.length === 1 ? "" : "s"}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
