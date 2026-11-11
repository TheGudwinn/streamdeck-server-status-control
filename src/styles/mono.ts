import { ellipsize, fit, icon, longestPart, hbar, rule, spark, TONES, toDataUri, txt, wrap, type IconName, type Tone } from "../theme";
import type { GaugeTile, LevelTile, SliderTile, StatusTile, Style } from "./types";

/** «Моно»: технический стиль с моноширинным шрифтом Regular, сплошными шкалами и тонкими линиями. */
function surface(body: string, tone: Tone): string {
  const t = TONES[tone];
  const edgeOp = tone === "neutral" || tone === "idle" ? 0.1 : tone === "up" ? 0.22 : 0.42;
  return toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#18191c"/><stop offset="1" stop-color="#0e0f11"/></linearGradient></defs>
<rect width="144" height="144" rx="20" fill="url(#bg)"/>
<rect x="1" y="1" width="142" height="142" rx="19" fill="none" stroke="${t.edge}" stroke-opacity="${edgeOp}" stroke-width="1.5"/>
${body}
</svg>`);
}

const mono = (x: number, y: number, size: number, text: string, o: { opacity?: number; fill?: string; anchor?: "start" | "middle" | "end"; spacing?: number } = {}): string =>
  txt(x, y, size, text, { mono: true, weight: 400, ...o });

const label = (text: string, y = 25): string => {
  const f = fit(text.toUpperCase(), 12, 112, 9, 0.62);
  return mono(72, y, f.size, f.text, { opacity: 0.55, spacing: 1.2 });
};

const DEFAULT_HEADER: Partial<Record<IconName, string>> = {
  bell: "alert",
  check: "ok",
  x: "down",
  alert: "offline",
  plug: "connect",
  cube: "docker",
  server: "host",
  globe: "http",
  lock: "tls",
  gear: "unit",
  restart: "restart",
};

/** Заполнение полосы состояния, %: чем хуже состояние, тем короче полоса. */
const FILLED: Record<Tone, number> = { up: 100, warn: 55, crit: 20, idle: 0, neutral: 100 };

function gaugeTile(t: GaugeTile): string {
  const tone = t.tone ?? "neutral";
  const tn = TONES[tone];
  const lines = t.lines ?? [];
  const big = fit(t.big, 40, 124, 20, 0.62);

  let body = label(t.label) + rule(16, 128, 34);
  body += txt(72, 80, big.size, big.text, { mono: true, weight: 300, fill: tn.hero });

  if (t.history) {
    body += spark(t.history, 16, 88, 112, 22, tn.accent, t.histMax, 1.6);
    if (lines[0]) {
      const f = fit(lines[0], 13, 124, 10, 0.62);
      body += mono(72, 132, f.size, f.text, { opacity: 0.5 });
    }
  } else {
    const hasBar = t.pct !== undefined;
    if (hasBar) body += hbar(16, 92, 112, 6, t.pct ?? 0, tn.accent);
    if (lines[0]) {
      const f = fit(lines[0], 13, 124, 10, 0.62);
      body += mono(72, hasBar ? 116 : 106, f.size, f.text, { opacity: 0.55 });
    }
    if (lines[1]) {
      const f = fit(lines[1], 11, 124, 9, 0.62);
      body += mono(72, hasBar ? 131 : 123, f.size, f.text, { opacity: 0.38 });
    }
  }
  return surface(body, tone);
}

function statusTile(t: StatusTile): string {
  const tn = TONES[t.tone];
  const titles = t.lines.filter((l) => !l.accent);
  const state = t.lines.find((l) => l.accent);

  const header = (state?.text ?? DEFAULT_HEADER[t.icon] ?? "").toUpperCase();
  const hf = fit(header, 12, 112, 9, 0.62);
  let body = mono(72, 25, hf.size, hf.text, { fill: state ? tn.accent : "#ffffff", opacity: state ? 1 : 0.55, spacing: 1.2 });
  body += hbar(16, 34, 112, 4, FILLED[t.tone], tn.accent);

  const titleText = titles.map((l) => l.text).join(" ");
  const longest = longestPart(titleText);
  const size = longest <= 10 ? 18 : longest <= 12 ? 16 : 14;
  const maxChars = Math.floor(118 / (size * 0.6));
  const maxLines = state ? 2 : (titles[0]?.maxLines ?? 3);
  const lines = wrap(titleText, maxChars, maxLines);
  const lh = size + 5;
  // Название по центру свободной области между шкалой состояния и нижней справкой.
  const mid = t.meta && state ? 82 : 90;
  const first = mid + size * 0.35 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => {
    body += mono(72, first + i * lh, size, l);
  });

  if (t.meta) {
    if (state) body += mono(72, 132, 13, ellipsize(t.meta, 14), { opacity: 0.55 });
    else body += mono(128, 25, 12, ellipsize(t.meta, 6), { anchor: "end", opacity: 0.55 });
  }
  return surface(body, t.tone);
}

function levelTile(t: LevelTile): string {
  const tone = t.tone ?? "neutral";
  const tn = TONES[tone];
  const f = fit(t.title, 18, 120, 12, 0.62);
  let body = label(t.icon) + rule(16, 128, 34);
  body += mono(72, 78, f.size, f.text);
  body += hbar(16, 94, 112, 6, (Math.max(0, Math.min(t.filled, t.total)) / Math.max(1, t.total)) * 100, tn.accent);
  return surface(body, tone);
}

function sliderTile(t: SliderTile): string {
  const tone = t.tone ?? "neutral";
  let body = label(t.label) + rule(16, 128, 34);

  const rows = t.rows.slice(0, 2);
  const ys = rows.length === 1 ? [74] : [60, 98];
  rows.forEach((row, i) => {
    const rt = TONES[row.tone ?? "neutral"];
    const y = ys[i];
    body += mono(16, y, 12, row.name.toUpperCase(), { anchor: "start", opacity: 0.55, spacing: 1 });
    body += mono(128, y, 16, row.value, { anchor: "end", fill: rt.hero });
    body += hbar(16, y + 7, 112, 6, row.pct, rt.accent);
  });
  if (t.footer) {
    const f = fit(t.footer, 11, 124, 9, 0.62);
    body += mono(72, 134, f.size, f.text, { opacity: 0.4 });
  }
  return surface(body, tone);
}

export const monoStyle: Style = { gaugeTile, statusTile, levelTile, sliderTile };
