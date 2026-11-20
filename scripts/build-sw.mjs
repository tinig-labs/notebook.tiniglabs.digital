// Builds the service worker after `opennextjs-cloudflare build`: bundles src/sw/sw.ts and injects
// the list of static assets to precache. Output: .open-next/assets/sw.js (served as a static asset).
//   node scripts/build-sw.mjs
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = ".open-next/assets";
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const assets = walk(root)
  .map((p) => "/" + relative(root, p).split(sep).join("/"))
  .filter((u) => /^\/(_next\/static\/|worklets\/|icons\/|logo\.svg$)/.test(u))
  .filter((u) => !u.endsWith(".map"))
  .sort();

const version = createHash("sha256").update(assets.join("\n")).digest("hex").slice(0, 12);

await build({
  entryPoints: ["src/sw/sw.ts"],
  outfile: join(root, "sw.js"),
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  define: { __PRECACHE__: JSON.stringify(assets), __VERSION__: JSON.stringify(version) },
});
console.log(`sw.js ${version}: ${assets.length} assets precached`);
