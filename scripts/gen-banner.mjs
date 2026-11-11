// Баннер для README: docs/assets/banner.png (1800x680).
// Слева сгенерированный кадр с маскотом (docs/assets/banner-frame.png), справа плавно переходящий в фон
// заголовок, подзаголовок, плашки и живые карточки плагина.
// Если кадра нет, используется запасной вариант: портрет маскота (docs/assets/mascot.png).
// Запуск: node scripts/gen-banner.mjs
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
const W = 1800;
const H = 680;
const esc = (s) => s.replace(/&/g, "&amp;");

// левая часть: кадр или портрет
const frameFile = "docs/assets/banner-frame.png";
const hasFrame = fs.existsSync(frameFile);
let left = "";
if (hasFrame) {
  const b64 = fs.readFileSync(frameFile).toString("base64");
  const fw = Math.round(H * (1249 / 694)); // ширина кадра при высоте H
  left = `<image x="0" y="0" width="${fw}" height="${H}" mask="url(#fade)" preserveAspectRatio="xMidYMid slice" href="data:image/png;base64,${b64}"/>`;
} else {
  const b64 = fs.readFileSync("docs/assets/mascot.png").toString("base64");
  const mh = 560;
  const mw = Math.round((mh * 474) / 632);
  left = `<clipPath id="mc"><rect x="80" y="60" width="${mw}" height="${mh}" rx="44"/></clipPath><image x="80" y="60" width="${mw}" height="${mh}" clip-path="url(#mc)" href="data:image/png;base64,${b64}"/>`;
}

const tx = 840;
const pills = ["SSH, no agent", "14 actions", "Glass & Mono", "EN / RU"];
let px = tx;
const pillsSvg = pills
  .map((p) => {
    const w = p.length * 13.5 + 44;
    const s = `<rect x="${px}" y="392" width="${w}" height="46" rx="23" fill="#5eead4" fill-opacity="0.08" stroke="#5eead4" stroke-opacity="0.45" stroke-width="1.5"/><text x="${px + w / 2}" y="423" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="500" fill="#bff7ee">${esc(p)}</text>`;
    px += w + 16;
    return s;
  })
  .join("");

const tile = 150;
const gap = 26;
const ty = 480;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#101619"/><stop offset="1" stop-color="#15191d"/></linearGradient>
<radialGradient id="glow" cx="0.78" cy="0.25" r="0.6"><stop offset="0" stop-color="#5eead4" stop-opacity="0.16"/><stop offset="1" stop-color="#5eead4" stop-opacity="0"/></radialGradient>
<linearGradient id="fadeg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="0.62" stop-color="#ffffff"/><stop offset="1" stop-color="#000000"/></linearGradient>
<mask id="fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${Math.round(H * (1249 / 694))}" height="${H}" fill="url(#fadeg)"/></mask>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
${left}
<text x="${tx}" y="118" font-family="${FONT}" font-size="24" font-weight="600" letter-spacing="6" fill="#5eead4">STREAM DECK PLUGIN</text>
<text x="${tx - 5}" y="222" font-family="${FONT}" font-size="104" font-weight="300" fill="#ffffff">Server Status</text>
<text x="${tx - 5}" y="326" font-family="${FONT}" font-size="104" font-weight="300" fill="#5eead4">&amp; Control</text>
<text x="${tx}" y="372" font-family="${FONT}" font-size="30" font-weight="400" fill="#ffffff" fill-opacity="0.66">Monitor and control your servers from your keys</text>
${pillsSvg}
${tiles.map((uri, i) => `<rect x="${tx + i * (tile + gap) - 3}" y="${ty - 3}" width="${tile + 6}" height="${tile + 6}" rx="32" fill="#000000" fill-opacity="0.5"/>${inline(uri, tx + i * (tile + gap), ty, tile)}`).join("")}
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: "width", value: W }, font: { loadSystemFonts: true, defaultFontFamily: "Segoe UI" } }).render().asPng();
fs.writeFileSync("docs/assets/banner.png", png);
console.log("готово: docs/assets/banner.png", `${W}x${H}`, hasFrame ? "(с кадром)" : "(запасной)");
