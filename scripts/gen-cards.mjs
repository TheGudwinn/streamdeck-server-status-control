// Экспорт карточек (кнопок) плагина как отдельных PNG и контактных листов.
//   docs/assets/cards/<стиль>/<имя>.png   — каждая карточка 576x576, прозрачные углы
//   docs/assets/cards/sheet-<стиль>.png   — общий лист со всеми карточками
// Запуск: node scripts/gen-cards.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import ts from "typescript";

import { makeTiles } from "./lib/samples.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sd-cards-"));
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

const FONT = "'Segoe UI Variable Display','Segoe UI','SF Pro Display',Arial,sans-serif";
const fontOpts = { loadSystemFonts: true, defaultFontFamily: "Segoe UI" };
const decode = (uri) => decodeURIComponent(uri.slice(uri.indexOf(",") + 1));

let counter = 0;
function inline(uri, x, y, size) {
  const n = ++counter;
  const svg = decode(uri).replace(/id="(\w+)"/g, `id="c${n}-$1"`).replace(/url\(#(\w+)\)/g, `url(#c${n}-$1)`);
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 144 144">${svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</svg>`;
}

const outRoot = path.join("docs", "assets", "cards");
let total = 0;

for (const theme of ["glass", "mono"]) {
  r.setTheme(theme);
  const tiles = makeTiles(r);
  const dir = path.join(outRoot, theme);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  // отдельные карточки
  for (const [name, uri] of Object.entries(tiles)) {
    const png = new Resvg(decode(uri), { fitTo: { mode: "width", value: 576 }, font: fontOpts }).render().asPng();
    fs.writeFileSync(path.join(dir, `${name}.png`), png);
    total++;
  }

  // контактный лист
  const names = Object.keys(tiles);
  const cols = 7;
  const tile = 288;
  const gap = 36;
  const pad = 70;
  const label = 46;
  const rows = Math.ceil(names.length / cols);
  const W = pad * 2 + cols * tile + (cols - 1) * gap;
  const H = pad * 2 + rows * (tile + label) + (rows - 1) * gap - gap / 2;
  let body = "";
  names.forEach((name, i) => {
    const x = pad + (i % cols) * (tile + gap);
    const y = pad + Math.floor(i / cols) * (tile + label + gap - 10);
    body += inline(tiles[name], x, y, tile);
    body += `<text x="${x + tile / 2}" y="${y + tile + 30}" text-anchor="middle" font-family="${FONT}" font-size="20" fill="#ffffff" fill-opacity="0.45">${name}</text>`;
  });
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b0c0f"/><stop offset="1" stop-color="#17191d"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>${body}</svg>`;
  fs.writeFileSync(path.join(outRoot, `sheet-${theme}.png`), new Resvg(sheet, { fitTo: { mode: "width", value: W }, font: fontOpts }).render().asPng());
  console.log(`  ${theme}: ${names.length} карточек + sheet-${theme}.png (${W}x${H})`);
}
console.log(`готово: ${total} файлов ->`, path.resolve(outRoot));
