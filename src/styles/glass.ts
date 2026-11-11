import { ellipsize, esc, fit, FONT, hbar, icon, longestPart, ring, spark, TONES, toDataUri, txt, wrap, type Tone } from "../theme";
import type { GaugeTile, LevelTile, SliderTile, StatusTile, Style } from "./types";

/** «Стекло»: графитовый градиент, тонкая цветная кромка, мягкий блик; лёгкие начертания. */
function surface(body: string, tone: Tone, dot: boolean): string {
  const t = TONES[tone];
  return toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#202226"/><stop offset="1" stop-color="#0a0a0c"/></linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.08"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
<radialGradient id="tint" cx="0.5" cy="0" r="1"><stop offset="0" stop-color="${t.accent}" stop-opacity="${t.tint}"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient>
<filter id="blur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>
<rect width="144" height="144" rx="24" fill="url(#bg)"/>
<rect width="144" height="144" rx="24" fill="url(#tint)"/>
<rect width="144" height="144" rx="24" fill="url(#sheen)"/>
<rect x="1.5" y="1.5" width="141" height="141" rx="22.5" fill="none" stroke="${t.edge}" stroke-opacity="${t.edgeOp}" stroke-width="2"/>
${dot ? `<circle cx="124" cy="20" r="8" fill="${t.accent}" opacity="0.55" filter="url(#blur)"/><circle cx="124" cy="20" r="4" fill="${t.accent}"/>` : ""}
${body}
</svg>`);
}

const sub = (x: number, y: number, size: number, text: string, opacity = 0.55): string => txt(x, y, size, text, { weight: 400, opacity });
const bigSize = (s: string): number => (s.length <= 3 ? 56 : s.length <= 4 ? 50 : s.length <= 5 ? 42 : s.length <= 6 ? 36 : 30);
const isAlarm = (t: Tone): boolean => t === "warn" || t === "crit";

function gaugeTile(t: GaugeTile): string {
  const tone = t.tone ?? "neutral";
  const tn = TONES[tone];
  const lab = fit(t.label.toUpperCase(), 13, 104, 10);
  const big = fit(t.big, bigSize(t.big), 120, 22);
  const lines = t.lines ?? [];

  let body = txt(72, 27, lab.size, lab.text, { weight: 500, opacity: 0.6, spacing: 1 });
  body += txt(72, t.history ? 77 : 82, big.size, big.text, { weight: 300, fill: tn.hero });

  if (t.history) {
    body += spark(t.history, 18, 88, 108, 24, tn.accent, t.histMax, 2);
    if (lines[0]) {
      const f = fit(lines[0], 14, 120, 11);
      body += sub(72, 134, f.size, f.text);
    }
  } else {
    const hasBar = t.pct !== undefined;
    if (hasBar) body += hbar(24, 94, 96, 4, t.pct ?? 0, tn.accent);
    if (lines[0]) {
      const f = fit(lines[0], 15, 120, 11);
      body += sub(72, hasBar ? 117 : 108, f.size, f.text);
    }
    if (lines[1]) {
      const f = fit(lines[1], 13, 120, 10);
      body += sub(72, hasBar ? 134 : 127, f.size, f.text, 0.4);
    }
  }
  return surface(body, tone, isAlarm(tone));
}

function statusTile(t: StatusTile): string {
  const tn = TONES[t.tone];
  let body = icon(t.icon, 59, 14, 26, tn.accent, 1.8);

  const titles = t.lines.filter((l) => !l.accent);
  const state = t.lines.find((l) => l.accent);
  const titleText = titles.map((l) => l.text).join(" ");
  const longest = longestPart(titleText);
  const size = longest <= 8 ? 22 : longest <= 11 ? 19 : 16;
  const maxChars = size === 22 ? 9 : size === 19 ? 11 : 13;
  const maxLines = state ? 2 : (titles[0]?.maxLines ?? 3);
  const lines = wrap(titleText, maxChars, maxLines);
  const lh = Math.round(size * 1.15);
  const bottom = state ? 100 : 118;
  lines.forEach((l, i) => {
    body += txt(72, bottom - (lines.length - 1 - i) * lh, size, l, { weight: 400 });
  });

  if (state) {
    const meta = t.meta ? ` · ${t.meta}` : "";
    const f = fit(state.text + meta, 16, 124, 11);
    const spans =
      f.text === state.text + meta
        ? `<tspan font-weight="500" fill="${tn.accent}">${esc(state.text)}</tspan><tspan font-weight="400" fill="#ffffff" fill-opacity="0.55">${esc(meta)}</tspan>`
        : `<tspan font-weight="500" fill="${tn.accent}">${esc(ellipsize(state.text, 12))}</tspan>`;
    body += `<text x="72" y="127" font-family="${FONT}" font-size="${f.size}" text-anchor="middle">${spans}</text>`;
  } else if (t.meta) {
    body += txt(128, 24, 14, ellipsize(t.meta, 6), { weight: 400, opacity: 0.55, anchor: "end" });
  }
  return surface(body, t.tone, false);
}

function levelTile(t: LevelTile): string {
  const tone = t.tone ?? "neutral";
  const tn = TONES[tone];
  let body = icon(t.icon, 59, 14, 26, tn.accent, 1.8);
  const f = fit(t.title, 22, 120, 14);
  body += txt(72, 88, f.size, f.text, { weight: 400 });
  const share = (Math.max(0, Math.min(t.filled, t.total)) / Math.max(1, t.total)) * 100;
  body += hbar(24, 106, 96, 5, share, tn.accent);
  return surface(body, tone, false);
}

function sliderTile(t: SliderTile): string {
  const tone = t.tone ?? "neutral";
  const lab = fit(t.label.toUpperCase(), 13, 104, 10);
  let body = txt(72, 27, lab.size, lab.text, { weight: 500, opacity: 0.6, spacing: 1 });

  const rows = t.rows.slice(0, 2);
  const xs = rows.length === 1 ? [72] : [38, 106];
  const r = rows.length === 1 ? 27 : 22;
  rows.forEach((row, i) => {
    const rt = TONES[row.tone ?? "neutral"];
    const cx = xs[i];
    body += ring(cx, 72, r, 5, row.pct, rt.accent);
    body += txt(cx, 77, 15, row.value, { weight: 500, fill: rt.hero });
    body += txt(cx, 113, 12, row.name.toUpperCase(), { weight: 400, opacity: 0.5, spacing: 0.8 });
  });
  if (t.footer) {
    const f = fit(t.footer, 13, 120, 10);
    body += sub(72, 134, f.size, f.text, 0.4);
  }
  return surface(body, tone, isAlarm(tone));
}

export const glass: Style = { gaugeTile, statusTile, levelTile, sliderTile };
