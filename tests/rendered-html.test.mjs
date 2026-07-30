import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
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
}

test("server-renders the Codex app gallery", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Codex App Gallery<\/title>/i);
  assert.match(html, /A launchpad for every app in progress\./);
  assert.match(html, /Job Hunt Tracker/);
  assert.match(html, /Support Ticket System/);
  assert.match(html, /\/apps\/job-hunt-tracker\/index\.html/);
  assert.match(html, /\/apps\/support-ticket-system\/index\.html/);
  assert.match(html, /\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("ships demo apps and removes starter-only files from product code", async () => {
  const [page, appProjectData, layout, packageJson, jobHtml, supportHtml] =
    await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/app-projects.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(
      new URL("../public/apps/job-hunt-tracker/index.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../public/apps/support-ticket-system/index.html", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(page, /from "\.\/app-projects"/);
  assert.match(appProjectData, /Job Hunt Tracker/);
  assert.match(appProjectData, /Support Ticket System/);
  assert.match(appProjectData, /preview\.png/);
  assert.doesNotMatch(appProjectData, /C:\\\\Users|sourcePath|signature/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /summary_large_image/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton|site-creator-vinext-starter/);
  assert.match(packageJson, /"sync:apps"/);
  assert.match(jobHtml, /dist\/app\.bundle\.js/);
  assert.match(supportHtml, /type="module" src="\.\/src\/app\.js"/);

  await Promise.all([
    access(new URL("../scripts/sync-codex-apps.mjs", import.meta.url)),
    access(new URL("../public/apps/job-hunt-tracker/preview.png", import.meta.url)),
    access(
      new URL("../public/apps/support-ticket-system/preview.png", import.meta.url),
    ),
    access(new URL("../public/og.png", import.meta.url)),
  ]);

  await assert.rejects(
    access(
      new URL("../dist/client/apps/support-ticket-system/.git", import.meta.url),
    ),
  );
});
