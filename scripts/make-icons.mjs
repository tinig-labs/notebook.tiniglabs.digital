// Renders the PWA icons from public/logo.svg: white mark on pandan. Run once after a logo change:
//   node scripts/make-icons.mjs
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const logo = readFileSync("public/logo.svg", "utf8");
const inner = logo.slice(logo.indexOf("<g>"), logo.lastIndexOf("</svg>"));
const PANDAN = "#1f6b4f";

// pad: share of the canvas the mark may use (maskable icons need a safe zone of ~80%).
function icon(size, pad, rounded) {
  const s = 375 * pad;
  const off = (375 - s) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 375 375" width="${size}" height="${size}">
  <rect width="375" height="375" rx="${rounded ? 84 : 0}" fill="${PANDAN}"/>
  <g transform="translate(${off} ${off}) scale(${pad})" fill="#ffffff">${inner}</g></svg>`;
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", icon(192, 0.72, true));
writeFileSync("public/icons/icon-512.png", icon(512, 0.72, true));
writeFileSync("public/icons/maskable-512.png", icon(512, 0.56, false));
writeFileSync("public/icons/apple-touch-icon.png", icon(180, 0.66, false));
console.log("icons written to public/icons");
