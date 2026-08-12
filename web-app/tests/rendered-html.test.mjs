import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("한국어 모바일 앱 셸을 서버 렌더링한다", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html[^>]*lang="ko"/i);
  assert.match(html, /<title>앱 이름 \| 안전 전동킥보드<\/title>/i);
  assert.match(html, /앱을 준비하고 있어요/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("클라이언트 경로도 동일한 앱 셸로 제공한다", async () => {
  const response = await render("/safety-check");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /안전 전동킥보드/);
});

test("안전 게이트와 빈 데이터 원칙을 소스에 유지한다", async () => {
  const [sensorTypes, safetyHook, emptyData, mapSource, packageJson] = await Promise.all([
    readFile(new URL("../app/types/sensor.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/hooks/useSafetyCheck.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/types/domain.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/LocationMap.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  for (const status of ["notWorn", "sensorUnavailable", "stale", "multiplePressureRegions", "multipleRiderSuspected", "attentionRequired", "success", "riding"]) {
    assert.match(sensorTypes, new RegExp(`\\b${status}\\b`));
  }
  assert.match(safetyHook, /DEFAULT_SAFETY_STABLE_DURATION_MS\s*=\s*2_500/);
  assert.match(safetyHook, /helmetStatus\s*===\s*"worn"/);
  assert.match(safetyHook, /footDetectionStatus\s*===\s*"normal"/);
  assert.match(emptyData, /batteryPercent:\s*null/);
  assert.match(emptyData, /rideCount:\s*null/);
  assert.match(mapSource, /https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
