// Генератор иконок из единого набора контуров (src/theme.ts -> ICONS).
// Запуск: node scripts/gen-icons.mjs [папка_превью]
//   imgs/actions/<slug>/icon.svg  — иконка в списке действий (белая, прозрачный фон)
//   imgs/actions/<slug>/key.svg   — картинка кнопки по умолчанию (стиль «Стекло»)
//   imgs/plugin-icon(.@2x).png    — иконка плагина (256 и 512)
//   imgs/category-icon(.@2x).png  — иконка категории (28 и 56)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import ts from "typescript";

const imgs = path.join("com.guddion.server-status.sdPlugin", "imgs");
const previewDir = process.argv[2];

// Контуры берём прямо из theme.ts, чтобы иконки на кнопках и в списке всегда совпадали.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sd-icons-"));
fs.writeFileSync(path.join(tmp, "package.json"), '{ "type": "module" }');
const js = ts.transpileModule(fs.readFileSync("src/theme.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
fs.writeFileSync(path.join(tmp, "theme.js"), js);
const { ICONS } = await import(pathToFileURL(path.join(tmp, "theme.js")).href);

const ACTIONS = [
  ["host-overview", "server", "Host Overview"],
  ["metric", "gauge", "Metric"],
  ["latency", "pulse", "Latency"],
  ["http-check", "globe", "HTTP Check"],
  ["tcp-port", "plug", "TCP Port"],
  ["tls-expiry", "lock", "TLS Expiry"],
  ["systemd-unit", "gear", "systemd Unit"],
  ["docker-container", "cube", "Docker Container"],
  ["alert-hub", "bell", "Alert Hub"],
  ["acknowledge", "ack", "Acknowledge"],
  ["run-command", "terminal", "Run Command"],
  ["power", "power", "Power"],
  ["service-control", "restart", "Service Control"],
  ["docker-control", "layers", "Docker Control"],
];

const MINT = "#5eead4";
const FONT = "'Segoe UI Variable Display','Segoe UI','SF Pro Display',Arial,sans-serif";
const stroke = (color, w) => `fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

const listIcon = (name) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" ${stroke("#FFFFFF", 1.75)}>${ICONS[name]}</svg>\n`;

const keyImage = (name, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#202226"/><stop offset="1" stop-color="#0a0a0c"/></linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.08"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
</defs>
<rect width="144" height="144" rx="24" fill="url(#bg)"/>
<rect width="144" height="144" rx="24" fill="url(#sheen)"/>
<rect x="1.5" y="1.5" width="141" height="141" rx="22.5" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>
<g transform="translate(45.6 24) scale(2.2)" ${stroke(MINT, 1.6)}>${ICONS[name]}</g>
<text x="72" y="118" font-family="${FONT}" font-size="15" font-weight="400" fill="#ffffff" fill-opacity="0.6" text-anchor="middle">${label}</text>
</svg>
`;

const pluginIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25272c"/><stop offset="1" stop-color="#08080a"/></linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.1"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
</defs>
<rect width="256" height="256" rx="56" fill="url(#bg)"/>
<rect width="256" height="256" rx="56" fill="url(#sheen)"/>
<rect x="3" y="3" width="250" height="250" rx="53" fill="none" stroke="${MINT}" stroke-opacity="0.35" stroke-width="3"/>
<g transform="translate(62 62) scale(5.33)" ${stroke(MINT, 1.5)}>${ICONS.server}</g>
<circle cx="188" cy="76" r="9" fill="${MINT}"/>
</svg>
`;

const categoryIcon = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" ${stroke("#FFFFFF", 1.75)}>${ICONS.server}</svg>`;

const png = (svg, width) => new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();

// --- запись файлов
fs.rmSync(path.join(imgs, "actions"), { recursive: true, force: true });
for (const [slug, name, label] of ACTIONS) {
  const dir = path.join(imgs, "actions", slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "icon.svg"), listIcon(name));
  fs.writeFileSync(path.join(dir, "key.svg"), keyImage(name, label));
}
fs.writeFileSync(path.join(imgs, "plugin-icon.png"), png(pluginIcon(), 256));
fs.writeFileSync(path.join(imgs, "plugin-icon@2x.png"), png(pluginIcon(), 512));
fs.writeFileSync(path.join(imgs, "category-icon.png"), png(categoryIcon(), 28));
fs.writeFileSync(path.join(imgs, "category-icon@2x.png"), png(categoryIcon(), 56));
console.log(`готово: ${ACTIONS.length} действий, plugin-icon, category-icon`);

// --- превью-страница
if (previewDir) {
  fs.mkdirSync(previewDir, { recursive: true });
  const uri = (svg) => `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
  const rows = ACTIONS.map(
    ([, name, label]) =>
      `<div class="r"><span class="i"><img src="${uri(listIcon(name))}" width="20" height="20"></span><span>${label}</span><img class="k" src="${uri(keyImage(name, label))}"></div>`,
  ).join("");
  const big = ACTIONS.map(([, name]) => `<img src="${uri(listIcon(name).replace('width="20" height="20"', 'width="64" height="64"'))}" width="64" height="64">`).join("");
  const html = `<!doctype html><meta charset="utf-8"><title>Иконки</title>
<style>body{margin:0;padding:24px;background:#1c1c1f;color:#ddd;font:14px Segoe UI,Arial}
.panel{background:#2b2b2d;border-radius:8px;padding:12px;width:520px;margin-bottom:20px}
.r{display:flex;align-items:center;gap:12px;padding:6px 8px}.i{width:28px;height:28px;border-radius:4px;background:#111;display:flex;align-items:center;justify-content:center}
.k{width:56px;height:56px;border-radius:10px;margin-left:auto}.row{display:flex;gap:18px;align-items:center;margin:14px 0}</style>
<div class="panel">${rows}</div>
<div class="row">${big}</div>
<div class="row"><img src="${uri(pluginIcon())}" width="128" height="128"><span>plugin-icon</span><img src="${uri(categoryIcon())}" width="28" height="28" style="background:#111;padding:4px;border-radius:4px"><span>category-icon</span></div>`;
  fs.writeFileSync(path.join(previewDir, "icons.html"), html);
  console.log(path.join(previewDir, "icons.html"));
}
