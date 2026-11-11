// Баннер для README: docs/assets/banner.png (1600x620) с маскотом и плитками плагина.
// Запуск: node scripts/gen-banner.mjs
// Маскот берётся из docs/assets/mascot.png. Позже баннер можно заменить своим файлом с тем же именем.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import ts from "typescript";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sd-banner-"));
fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
fs.writeFileSync(path.join(tmp, "package.json"), '{ "type": "module" }');
for (const f of ["theme", "i18n", "render", "styles/types", "styles/glass", "styles/mono"]) {
  let js = ts.transpileModule(fs.readFileSync(path.join("src", `${f}.ts`), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  js = js.replace(/from "(\.{1,2}\/[^"]+)"/g, 'from "$1.js"');
  fs.writeFileSync(path.join(tmp, `${f}.js`), js);
}
const r = await import(pathToFileURL(path.join(tmp, "render.js")).href);
r.setTheme("glass");

const hist = Array.from({ length: 40 }, (_, i) => 30 + Math.sin(i / 3) * 18 + (i % 5));
const tiles = [
  r.sliderTile({ label: "VPS", rows: [{ name: "CPU", value: "7%", pct: 7 }, { name: "RAM", value: "42%", pct: 42 }], footer: "3.3/7.8 GB" }),
  r.gaugeTile({ label: "Ping", big: "42 ms", lines: ["example.com:22"], history: hist }),
  r.statusTile({ icon: "check", tone: "up", meta: "142 ms", lines: [{ text: "example.com" }, { text: "Online", accent: true }] }),
  r.statusTile({ icon: "cube", tone: "up", lines: [{ text: "searxng" }, { text: "Running", accent: true }] }),
  r.statusTile({ icon: "bell", tone: "crit", meta: "1/2", lines: [{ text: "VPS: disk / 96%", maxLines: 3 }] }),
];

let counter = 0;
function inline(uri, x, y, size) {
  const n = ++counter;
  const svg = decodeURIComponent(uri.slice(uri.indexOf(",") + 1))
    .replace(/id="(\w+)"/g, `id="b${n}-$1"`)
    .replace(/url\(#(\w+)\)/g, `url(#b${n}-$1)`);
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 144 144">${svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</svg>`;
}

const FONT = "'Segoe UI Variable Display','Segoe UI','SF Pro Display',Arial,sans-serif";
const W = 1600;
const H = 620;

// маскот: карточка со скруглением слева
const mascot = fs.readFileSync("docs/assets/mascot.png").toString("base64");
const mh = 540;
const mw = Math.round((mh * 474) / 632);
const mx = 80;
const my = (H - mh) / 2;

const tile = 168;
const gap = 28;
const tx = 560;
const ty = 400;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#090a0d"/><stop offset="1" stop-color="#181a1f"/></linearGradient>
<radialGradient id="glow" cx="0.2" cy="0.35" r="0.75"><stop offset="0" stop-color="#5eead4" stop-opacity="0.2"/><stop offset="1" stop-color="#5eead4" stop-opacity="0"/></radialGradient>
<clipPath id="mclip"><rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="44"/></clipPath>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
<image x="${mx}" y="${my}" width="${mw}" height="${mh}" clip-path="url(#mclip)" preserveAspectRatio="xMidYMid slice" href="data:image/png;base64,${mascot}"/>
<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="44" fill="none" stroke="#5eead4" stroke-opacity="0.45" stroke-width="3"/>
<text x="${tx}" y="118" font-family="${FONT}" font-size="22" font-weight="600" letter-spacing="5" fill="#5eead4">STREAM DECK PLUGIN</text>
<text x="${tx - 4}" y="212" font-family="${FONT}" font-size="92" font-weight="300" fill="#ffffff">Server Status</text>
<text x="${tx - 4}" y="306" font-family="${FONT}" font-size="92" font-weight="300" fill="#5eead4">&amp; Control</text>
<text x="${tx}" y="362" font-family="${FONT}" font-size="30" font-weight="400" fill="#ffffff" fill-opacity="0.62">Monitor and control your servers from your keys</text>
${tiles.map((uri, i) => `<rect x="${tx + i * (tile + gap) - 3}" y="${ty - 3}" width="${tile + 6}" height="${tile + 6}" rx="36" fill="#000000" fill-opacity="0.55"/>${inline(uri, tx + i * (tile + gap), ty, tile)}`).join("")}
</svg>`;

fs.mkdirSync("docs/assets", { recursive: true });
const png = new Resvg(svg, { fitTo: { mode: "width", value: W }, font: { loadSystemFonts: true, defaultFontFamily: "Segoe UI" } }).render().asPng();
fs.writeFileSync("docs/assets/banner.png", png);
console.log("готово: docs/assets/banner.png", `${W}x${H}`);
