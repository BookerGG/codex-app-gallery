import { copyFile, mkdir, writeFile } from "node:fs/promises";

const outputDir = new URL("../dist/client/", import.meta.url);
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("staticExport", `${process.pid}-${Date.now()}`);

const siteOrigin = (process.env.STATIC_EXPORT_ORIGIN ?? "https://bookergg.github.io").replace(
  /\/$/,
  "",
);
const basePath = normalizeBasePath(
  process.env.STATIC_EXPORT_BASE_PATH ?? "/codex-app-gallery",
);
const requestHost = new URL(siteOrigin).host;

const { default: worker } = await import(workerUrl.href);

const response = await worker.fetch(
  new Request(`${siteOrigin}/`, {
    headers: {
      accept: "text/html",
      "x-forwarded-host": requestHost,
      "x-forwarded-proto": "https",
    },
  }),
  {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  },
  {
    waitUntil() {},
    passThroughOnException() {},
  },
);

if (!response.ok) {
  throw new Error(`Static export render failed with HTTP ${response.status}`);
}

const html = applyBasePath(await response.text(), siteOrigin, basePath);

await mkdir(outputDir, { recursive: true });
await writeFile(new URL("index.html", outputDir), html);
await copyFile(new URL("index.html", outputDir), new URL("404.html", outputDir));

console.log(`Exported static gallery to ${new URL("index.html", outputDir).pathname}`);

function normalizeBasePath(value) {
  if (!value || value === "/") {
    return "";
  }

  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}

function applyBasePath(html, origin, base) {
  if (!base) {
    return html;
  }

  return html
    .replaceAll(`${origin}/`, `${origin}${base}/`)
    .replaceAll('href="/', `href="${base}/`)
    .replaceAll('src="/', `src="${base}/`)
    .replaceAll('content="/', `content="${base}/`)
    .replaceAll('srcset="/', `srcset="${base}/`)
    .replaceAll('"/assets/', `"${base}/assets/`)
    .replaceAll('"/apps/', `"${base}/apps/`)
    .replaceAll('\\"/assets/', `\\"${base}/assets/`)
    .replaceAll('\\"/apps/', `\\"${base}/apps/`)
    .replaceAll('import("/assets/', `import("${base}/assets/`);
}
