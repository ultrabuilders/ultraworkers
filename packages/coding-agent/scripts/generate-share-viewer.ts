#!/usr/bin/env bun
/**
 * Build the standalone share-viewer page the ultraworkers relay serves at `GET /s/<id>`.
 *
 * Same template as HTML exports, but with no embedded session: share-loader.js
 * (injected right after the empty #session-data tag) fetches the sealed blob
 * (gist or relay store), decrypts it with the `#<key>` fragment in-browser, and
 * hands the JSON to template.js via `window.__OMP_SESSION_DATA__`.
 *
 * The relay repo's build script runs this and embeds the output via go:embed.
 */
import * as path from "node:path";
import { WIRE_NAME } from "@oh-my-pi/pi-utils";
import { generateThemeStyles, getTemplate, substituteTemplateSlot } from "../src/export/html";

const outPath = process.argv[2];
if (!outPath) {
	console.error("usage: bun scripts/generate-share-viewer.ts <output.html>");
	process.exit(2);
}

// share-loader.js runs in the browser and has no constant to import, so the brand
// is substituted here, at the point the script is inlined. Reading it from the
// constant rather than typing it here is what stops the next rebrand from
// silently putting the old name back on every shared session page.
//
// The needle is quote-agnostic: the loader is a browser file that gets
// reformatted, and a needle pinned to one quote style misses the moment the
// formatter changes it. That miss is invisible — `replace` reports nothing, the
// page builds, and every shared session ships titled with the old brand. The
// assertion below is what turns that back into a build failure.
const STALE_BRAND = /(["']) — omp session\1/;
const loaderJs = (
	await Bun.file(new URL("../src/export/html/share-loader.js", import.meta.url).pathname).text()
).replace(STALE_BRAND, `' — ${WIRE_NAME} session'`);

if (STALE_BRAND.test(loaderJs)) throw new Error("share loader brand substitution missed its target");
// Public artifacts use the bundled ultraworkers web themes rather than TUI themes.
const themeStyles = await generateThemeStyles("web");

// The bare `{{SESSION_DATA}}` slot, not `{{SESSION_DATA}}</script>`. The
// combined literal only matches while the template happens to keep the
// placeholder welded to its closing tag; a formatter that puts it on its own
// line breaks the match, and this script then throws on a template that is
// perfectly fine. The slot is emptied and the loader appended after the closing
// `</script>` instead, which holds for both layouts.
//
// `substituteTemplateSlot` throws on a genuine miss, so the two assertions below
// are no longer the only thing standing between a renamed slot and a page that
// ships with no session fetch at all — they now check the part that substitution
// cannot: that the loader actually landed.
const html = [
	["<theme-vars/>", `<style>${themeStyles}</style>`],
	["<title>Session Export</title>", `<title>${WIRE_NAME} session</title>`],
	["{{SESSION_DATA}}", ""],
]
	.reduce((html, [slot, value]) => substituteTemplateSlot(html, slot, () => value), getTemplate())
	.replace(/(<script id="session-data"[^>]*>[\s\S]*?<\/script>)/, () => `$1\n  <script>${loaderJs}</script>`);

if (html.includes("{{SESSION_DATA}}")) throw new Error("session-data placeholder survived substitution");
if (!html.includes("__OMP_SESSION_DATA__")) throw new Error("share loader not injected");

await Bun.write(outPath, html);
console.log(`Generated ${path.resolve(outPath)} (${(html.length / 1024).toFixed(0)} KB)`);
