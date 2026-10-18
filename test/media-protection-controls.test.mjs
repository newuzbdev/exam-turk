import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { JSDOM } = require(require.resolve("jsdom", { paths: [process.cwd(), path.resolve("../admin")] }));
const source = readFileSync(new URL("../src/utils/mediaProtection.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

async function protectedDocument(html) {
  const dom = new JSDOM(html);
  const { window } = dom;
  if (window.document.readyState === "loading") {
    await new Promise((resolve) => window.document.addEventListener("DOMContentLoaded", resolve, { once: true }));
  }
  const context = { exports: {} };
  for (const name of ["window", "document", "Element", "HTMLImageElement", "HTMLMediaElement", "HTMLVideoElement", "MutationObserver"]) {
    context[name] = name === "window" ? window : window[name];
  }
  vm.runInNewContext(compiled, context);
  context.exports.installMediaProtection();
  return { window, document: window.document, install: context.exports.installMediaProtection, close: () => window.close() };
}

const controls = (media) => media.getAttribute("controlsList").trim().split(/\s+/).sort();

test("practice audio keeps its hidden native speed menu while media protection is added", async () => {
  const page = await protectedDocument('<audio controls controlsList="noplaybackrate"></audio>');
  try {
    const audio = page.document.querySelector("audio");
    assert.deepEqual(controls(audio), ["nodownload", "noplaybackrate", "noremoteplayback"]);
    assert.equal(audio.disableRemotePlayback, true);
  } finally { page.close(); }
});

test("new video retains its fullscreen restriction without duplicating protection tokens", async () => {
  const page = await protectedDocument("<main></main>");
  try {
    const group = page.document.createElement("div");
    group.innerHTML = '<video controls controlsList="nofullscreen nodownload nodownload"></video>';
    page.document.querySelector("main").append(group);
    await Promise.resolve();
    const video = group.querySelector("video");
    assert.deepEqual(controls(video), ["nodownload", "nofullscreen", "noremoteplayback"]);
    assert.equal(video.disableRemotePlayback, true);
    assert.equal(video.disablePictureInPicture, true);
  } finally { page.close(); }
});

test("audio without extra settings still gets both protections when installation is repeated", async () => {
  const page = await protectedDocument("<audio controls></audio>");
  try {
    page.install();
    assert.deepEqual(controls(page.document.querySelector("audio")), ["nodownload", "noremoteplayback"]);
  } finally { page.close(); }
});
