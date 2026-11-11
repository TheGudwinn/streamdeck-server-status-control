// Превью виджетов в обоих стилях: node scripts/preview.mjs <выходная_папка>
// Транспилирует src/theme.ts, src/styles/*.ts, src/render.ts и собирает preview.html.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

const out = process.argv[2];
if (!out) {
  console.error("usage: node scripts/preview.mjs <out-dir>");
  process.exit(2);
}
fs.mkdirSync(path.join(out, "styles"), { recursive: true });
fs.writeFileSync(path.join(out, "package.json"), '{ "type": "module" }');

for (const f of ["theme", "i18n", "render", "styles/types", "styles/glass", "styles/mono"]) {
  const src = fs.readFileSync(path.join("src", `${f}.ts`), "utf8");
  let js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  js = js.replace(/from "(\.{1,2}\/[^"]+)"/g, 'from "$1.js"');
  fs.writeFileSync(path.join(out, `${f}.js`), js);
}

const r = await import(pathToFileURL(path.join(out, "render.js")).href);
const hist = (base, amp) => Array.from({ length: 40 }, (_, i) => Math.max(1, base + Math.sin(i / 3) * amp + (i % 5)));

const samples = () => [
  ["Host Overview", r.sliderTile({ label: "VPS", rows: [{ name: "CPU", value: "7%", pct: 7 }, { name: "RAM", value: "42%", pct: 42 }], footer: "3.3/7.8 ГБ" })],
  ["Overview (alarm)", r.sliderTile({ label: "VPS", rows: [{ name: "CPU", value: "88%", pct: 88, tone: "warn" }, { name: "RAM", value: "91%", pct: 91, tone: "crit" }], footer: "7.1/7.8 ГБ", tone: "crit" })],
  ["Metric: CPU", r.gaugeTile({ label: "CPU", big: "61%", lines: ["load 0.19", "VPS"], pct: 61 })],
  ["Metric: Диск", r.gaugeTile({ label: "Диск", big: "64%", lines: ["18.4/28.7 ГБ", "VPS"], pct: 64 })],
  ["Диск (crit)", r.gaugeTile({ label: "Диск", big: "96%", lines: ["27.5/28.7 ГБ", "VPS"], pct: 96, tone: "crit" })],
  ["Metric: Сеть", r.gaugeTile({ label: "Сеть", big: "1.2 МБ", lines: ["↑ 310 КБ/с"], history: hist(30, 20) })],
  ["Latency", r.gaugeTile({ label: "Ping", big: "42 мс", lines: ["example.com:22"], history: hist(40, 12) })],
  ["TLS Expiry", r.gaugeTile({ label: "guddion.ru", big: "23 д", lines: ["до 03.12.26", "сертификат"], pct: 25 })],
  ["TLS (warn)", r.gaugeTile({ label: "guddion.ru", big: "9 д", lines: ["до 20.11.26", "сертификат"], pct: 10, tone: "warn" })],
  ["HTTP Online", r.statusTile({ icon: "check", tone: "up", meta: "142 мс", lines: [{ text: "guddion.ru" }, { text: "Online", accent: true }] })],
  ["HTTP Down", r.statusTile({ icon: "x", tone: "crit", meta: "503", lines: [{ text: "guddion.ru" }, { text: "Down", accent: true }] })],
  ["systemd Active", r.statusTile({ icon: "check", tone: "up", lines: [{ text: "nginx" }, { text: "Active", accent: true }] })],
  ["systemd Failed", r.statusTile({ icon: "x", tone: "crit", lines: [{ text: "guddion-backend" }, { text: "Failed", accent: true }] })],
  ["Docker Running", r.statusTile({ icon: "cube", tone: "up", lines: [{ text: "searxng" }, { text: "Running", accent: true }] })],
  ["Docker Exited", r.statusTile({ icon: "cube", tone: "crit", lines: [{ text: "reaction-whisper" }, { text: "Exited", accent: true }] })],
  ["Restart…", r.statusTile({ icon: "restart", tone: "warn", lines: [{ text: "nginx" }, { text: "Restart…", accent: true }] })],
  ["Alert Hub", r.statusTile({ icon: "bell", tone: "crit", meta: "1/3", lines: [{ text: "VPS: диск / 96%", maxLines: 3 }] })],
  ["Alert (длинный)", r.statusTile({ icon: "bell", tone: "warn", meta: "2/3", lines: [{ text: "reaction-whisper: exited", maxLines: 3 }] })],
  ["Alert: нет", r.statusTile({ icon: "check", tone: "up", lines: [{ text: "Тревог" }, { text: "нет", accent: true }] })],
  ["Acknowledge", r.statusTile({ icon: "bell", tone: "warn", lines: [{ text: "Принять" }, { text: "3 шт", accent: true }] })],
  ["Offline", r.statusTile({ icon: "alert", tone: "crit", meta: "SSH", lines: [{ text: "VPS" }, { text: "Offline", accent: true }] })],
];

const sections = ["glass", "mono"].map((name) => {
  r.setTheme(name);
  const cells = samples().map(([n, uri]) => `<div class="c"><img src="${uri}"><span>${n}</span></div>`).join("");
  return `<h2>${name === "glass" ? "Стекло" : "Моно"}</h2><div class="g">${cells}</div>`;
});

const html = `<!doctype html><meta charset="utf-8"><title>Превью виджетов</title>
<style>body{margin:0;padding:24px;background:#1c1c1f;color:#aaa;font:13px Segoe UI,Arial}
h2{color:#ddd;font-weight:400;margin:28px 0 14px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:18px}
.c{display:flex;flex-direction:column;align-items:center;gap:8px}
.c img{width:140px;height:140px;border-radius:26px;box-shadow:0 0 0 4px #000}</style>
${sections.join("")}`;
fs.writeFileSync(path.join(out, "preview.html"), html);
console.log(path.join(out, "preview.html"));
