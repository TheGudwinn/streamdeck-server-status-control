// Материалы для карточки Elgato Marketplace (папка listing/):
//   app-icon-288.png (288x288), thumbnail.png (1920x960), gallery-1..5.png (1920x960)
// Плитки рисуются теми же функциями, что и в плагине. Запуск: node scripts/gen-listing.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import ts from "typescript";

import { makeTiles } from "./lib/samples.mjs";

const out = "listing";
fs.mkdirSync(out, { recursive: true });

// --- плитки: транспилируем исходники плагина во временную папку
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sd-listing-"));
fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
fs.writeFileSync(path.join(tmp, "package.json"), '{ "type": "module" }');
for (const f of ["theme", "i18n", "render", "styles/types", "styles/glass", "styles/mono"]) {
  const src = fs.readFileSync(path.join("src", `${f}.ts`), "utf8");
  let js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  js = js.replace(/from "(\.{1,2}\/[^"]+)"/g, 'from "$1.js"');
  fs.writeFileSync(path.join(tmp, `${f}.js`), js);
}
const r = await import(pathToFileURL(path.join(tmp, "render.js")).href);
const { ICONS } = await import(pathToFileURL(path.join(tmp, "theme.js")).href);

const tiles = () => makeTiles(r);

const FONT = "'Segoe UI Variable Display','Segoe UI','SF Pro Display',Arial,sans-serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let tileCounter = 0;

/** Вставляет плитку (data URI) как вложенный <svg>: так текст рисуется системными шрифтами. id градиентов делаем уникальными. */
function inline(uri, x, y, size) {
  const n = ++tileCounter;
  const svg = decodeURIComponent(uri.slice(uri.indexOf(",") + 1))
    .replace(/id="(\w+)"/g, `id="p${n}-$1"`)
    .replace(/url\(#(\w+)\)/g, `url(#p${n}-$1)`);
  const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 144 144">${inner}</svg>`;
}

/** Холст 1920x960: фон, заголовок, подзаголовок и ряды плиток. */
function slide({ title, subtitle, rows, tile = 220, gap = 36, top = 330 }) {
  let body = "";
  rows.forEach((row, ri) => {
    const width = row.length * tile + (row.length - 1) * gap;
    const x0 = (1920 - width) / 2;
    const y = top + ri * (tile + gap + (rows[0].length > 6 ? 0 : 0));
    row.forEach((uri, i) => {
      const x = x0 + i * (tile + gap);
      body += `<rect x="${x - 4}" y="${y - 4}" width="${tile + 8}" height="${tile + 8}" rx="${tile * 0.2}" fill="#000000" fill-opacity="0.55"/>`;
      body += inline(uri, x, y, tile);
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="960" viewBox="0 0 1920 960">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b0c0f"/><stop offset="1" stop-color="#1a1c21"/></linearGradient>
<radialGradient id="glow" cx="0.12" cy="0" r="0.8"><stop offset="0" stop-color="#5eead4" stop-opacity="0.16"/><stop offset="1" stop-color="#5eead4" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1920" height="960" fill="url(#bg)"/><rect width="1920" height="960" fill="url(#glow)"/>
<text x="960" y="150" text-anchor="middle" font-family="${FONT}" font-size="84" font-weight="300" fill="#ffffff">${esc(title)}</text>
<text x="960" y="215" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="400" fill="#ffffff" fill-opacity="0.62">${esc(subtitle)}</text>
${body}
</svg>`;
}

const png = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: "width", value: width }, font: { loadSystemFonts: true, defaultFontFamily: "Segoe UI" } }).render().asPng();

const save = (name, svg, w = 1920) => {
  fs.writeFileSync(path.join(out, name), png(svg, w));
  console.log("  ", name);
};

// --- слайды (стекло)
r.setTheme("glass");
const g = tiles();
save(
  "gallery-1.png",
  slide({
    title: "Server Status & Control",
    subtitle: "Monitor and control your servers right from Stream Deck",
    rows: [[g.overview, g.cpu, g.disk, g.httpOk, g.dockerOk, g.alert]],
    tile: 240,
    top: 435,
  }),
);
save(
  "gallery-2.png",
  slide({
    title: "Live server health",
    subtitle: "CPU, RAM, disk, network, latency and uptime over SSH",
    rows: [
      [g.overview, g.cpu, g.ram, g.disk, g.net],
      [g.ping, g.tls, g.uptime, g.overviewWarn, g.diskCrit],
    ],
    tile: 200,
    gap: 40,
    top: 345,
  }),
);
save(
  "gallery-3.png",
  slide({
    title: "Sites, services and containers",
    subtitle: "HTTP, TCP, TLS, systemd and Docker at a glance, with alerts",
    rows: [
      [g.httpOk, g.httpDown, g.tcp, g.tlsWarn, g.alertOk],
      [g.unitOk, g.unitFail, g.dockerOk, g.dockerBad, g.alert],
    ],
    tile: 200,
    gap: 40,
    top: 345,
  }),
);
save(
  "gallery-4.png",
  slide({
    title: "Control from the deck",
    subtitle: "Run commands, restart services and containers, reboot. Hold to confirm. Works in multi actions",
    rows: [
      [g.runIdle, g.running, g.runDone, g.svcRestart],
      [g.hold, g.armed, g.power, g.dockerRestart],
    ],
    tile: 200,
    gap: 40,
    top: 345,
  }),
);

// --- слайд со стилями
r.setTheme("glass");
const glassSet = tiles();
r.setTheme("mono");
const monoSet = tiles();
r.setTheme("glass");
save(
  "gallery-5.png",
  slide({
    title: "Two styles",
    subtitle: "Glass and Mono. English and Russian. Switch any time in the settings",
    rows: [
      [glassSet.overview, glassSet.cpu, glassSet.httpOk, glassSet.unitFail, glassSet.alert],
      [monoSet.overview, monoSet.cpu, monoSet.httpOk, monoSet.unitFail, monoSet.alert],
    ],
    tile: 200,
    gap: 40,
    top: 345,
  }),
);

// --- обложка (thumbnail)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25272c"/><stop offset="1" stop-color="#08080a"/></linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.1"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>
<rect width="256" height="256" rx="56" fill="url(#bg)"/><rect width="256" height="256" rx="56" fill="url(#sheen)"/>
<rect x="3" y="3" width="250" height="250" rx="53" fill="none" stroke="#5eead4" stroke-opacity="0.35" stroke-width="3"/>
<g transform="translate(62 62) scale(5.33)" fill="none" stroke="#5eead4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS.server}</g>
<circle cx="188" cy="76" r="9" fill="#5eead4"/></svg>`;
const dataUri = (svg) => `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
const thumb = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="960" viewBox="0 0 1920 960">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b0c0f"/><stop offset="1" stop-color="#1a1c21"/></linearGradient>
<radialGradient id="glow" cx="0.2" cy="0.3" r="0.7"><stop offset="0" stop-color="#5eead4" stop-opacity="0.18"/><stop offset="1" stop-color="#5eead4" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1920" height="960" fill="url(#bg)"/><rect width="1920" height="960" fill="url(#glow)"/>
<image x="150" y="214" width="260" height="260" href="${dataUri(iconSvg)}"/>
<text x="150" y="590" font-family="${FONT}" font-size="104" font-weight="300" fill="#ffffff">Server Status</text>
<text x="150" y="702" font-family="${FONT}" font-size="104" font-weight="300" fill="#5eead4">&amp; Control</text>
<text x="154" y="780" font-family="${FONT}" font-size="38" font-weight="400" fill="#ffffff" fill-opacity="0.62">Stream Deck plugin for your servers</text>
${[g.overview, g.httpOk, g.dockerOk, g.cpu, g.alert, g.unitOk]
  .map((uri, i) => {
    const x = 1010 + (i % 2) * 380;
    const y = 150 + Math.floor(i / 2) * 230 + (i % 2) * 40;
    return `<rect x="${x + 36}" y="${y - 4}" width="208" height="208" rx="40" fill="#000000" fill-opacity="0.55"/>${inline(uri, x + 40, y, 200)}`;
  })
  .join("")}
</svg>`;
save("thumbnail.png", thumb);

// --- иконка приложения 288x288
fs.writeFileSync(path.join(out, "app-icon-288.png"), png(iconSvg, 288));
console.log("   app-icon-288.png");
console.log("готово ->", path.resolve(out));
