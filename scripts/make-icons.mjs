// Renders the PWA icons, favicon and email logo from the approved logo files in public/brand.
// The marks are never redrawn here: the app icon SVG is rasterised as is, and the maskable icon
// places the reversed Arch n file on a full-bleed pandan square (Android crops it to its own shape).
// Run once after a logo change:
//   node scripts/make-icons.mjs
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const read = (f) => readFileSync(`public/brand/${f}`, "utf8");
const png = (svg, size) => new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
const PANDAN = "#1F6B4F";

/** The reversed mark's inner markup, scaled into the maskable safe zone (inner 80% circle). */
function maskable(size) {
  const mark = read("notebook-mark-reversed.svg");
  const inner = mark.slice(mark.indexOf(">", mark.indexOf("<svg")) + 1, mark.lastIndexOf("</svg>")).replace(/<title>.*?<\/title>/, "");
  const scale = 0.56;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}">
  <rect width="120" height="120" fill="${PANDAN}"/>
  <g transform="translate(60 60) scale(${scale}) translate(-60 -60)">${inner}</g></svg>`;
  return png(svg, size);
}

const appIcon = read("notebook-app-icon.svg");
mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", png(appIcon, 192));
writeFileSync("public/icons/icon-512.png", readFileSync("public/brand/notebook-app-icon-512.png"));
writeFileSync("public/icons/apple-touch-icon.png", readFileSync("public/brand/notebook-app-icon-180.png"));
writeFileSync("public/icons/maskable-512.png", maskable(512));
// Emails show the mark at 32 px; 64 px keeps it sharp on high-density screens.
writeFileSync("public/email-logo.png", png(read("notebook-mark.svg"), 64));
console.log("icons written to public/icons and public/email-logo.png");
