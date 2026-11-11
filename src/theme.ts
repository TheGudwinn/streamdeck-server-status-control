/**
 * Общие примитивы для всех стилей плиток 144x144: цвета состояний, текст, иконки, шкалы.
 * Сами стили («Стекло» и «Моно») лежат в src/styles/.
 */
export const FONT = "'Segoe UI Variable Display','Segoe UI','SF Pro Display',Arial,sans-serif";
export const FONT_MONO = "'Cascadia Mono','Cascadia Code',Consolas,'SF Mono',Menlo,monospace";

export type Tone = "neutral" | "up" | "warn" | "crit" | "idle";

export const TONES: Record<Tone, { accent: string; edge: string; edgeOp: number; tint: number; hero: string }> = {
  neutral: { accent: "#5eead4", edge: "#ffffff", edgeOp: 0.12, tint: 0, hero: "#ffffff" },
  up: { accent: "#4ade80", edge: "#4ade80", edgeOp: 0.4, tint: 0.1, hero: "#ffffff" },
  warn: { accent: "#fbbf24", edge: "#fbbf24", edgeOp: 0.6, tint: 0.14, hero: "#fbbf24" },
  crit: { accent: "#f87171", edge: "#f87171", edgeOp: 0.7, tint: 0.18, hero: "#f87171" },
  idle: { accent: "#9ca3af", edge: "#ffffff", edgeOp: 0.12, tint: 0, hero: "#ffffff" },
};

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const toDataUri = (svg: string): string => `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;

type TxtOpts = {
  weight?: number;
  fill?: string;
  opacity?: number;
  anchor?: "start" | "middle" | "end";
  spacing?: number;
  mono?: boolean;
};

/** Текст. По умолчанию тонкое начертание (Regular), по центру; mono — для технических подписей. */
export function txt(x: number, y: number, size: number, content: string, o: TxtOpts = {}): string {
  const { weight = 400, fill = "#ffffff", opacity = 1, anchor = "middle", spacing = 0, mono = false } = o;
  const ls = spacing ? ` letter-spacing="${spacing}"` : "";
  return `<text x="${x}" y="${y}" font-family="${mono ? FONT_MONO : FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" fill-opacity="${opacity}" text-anchor="${anchor}"${ls}>${esc(content)}</text>`;
}

export function ellipsize(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s;
}

/** Подбирает размер шрифта, чтобы текст влез в maxW; k — средняя ширина символа в долях размера (моно ≈ 0.6). */
export function fit(text: string, base: number, maxW: number, min = 12, k = 0.58): { text: string; size: number } {
  const size = Math.min(base, Math.floor(maxW / (Math.max(1, text.length) * k)));
  if (size >= min) return { text, size };
  return { text: ellipsize(text, Math.max(1, Math.floor(maxW / (min * k)))), size: min };
}

/** Перенос по словам: не больше maxLines строк по maxChars символов, хвост обрезается многоточием. */
export function wrap(text: string, maxChars: number, maxLines: number): string[] {
  // Длинные имена дополнительно рвутся после - _ / : (без пробела при склейке).
  const toks: { t: string; glue: boolean }[] = [];
  for (const w of text.trim().split(/\s+/).filter(Boolean)) {
    w.split(/(?<=[-_/:])/).forEach((p, i) => toks.push({ t: p, glue: i > 0 }));
  }
  const lines: string[] = [];
  let cur = "";
  let truncated = false;
  for (const tok of toks) {
    const next = cur ? (tok.glue ? cur + tok.t : `${cur} ${tok.t}`) : tok.t;
    if (next.length <= maxChars) {
      cur = next;
      continue;
    }
    if (cur) {
      lines.push(cur);
      if (lines.length === maxLines) {
        cur = "";
        truncated = true;
        break;
      }
    }
    if (tok.t.length > maxChars) truncated = true;
    cur = tok.t.length > maxChars ? tok.t.slice(0, maxChars) : tok.t;
  }
  if (cur) {
    if (lines.length < maxLines) lines.push(cur);
    else truncated = true;
  }
  if (truncated && lines.length) lines[lines.length - 1] = ellipsize(`${lines[lines.length - 1]}…`, maxChars);
  return lines.slice(0, maxLines);
}

/** Самая длинная «часть слова» (с учётом переноса по - _ / :) — по ней подбирается размер шрифта. */
export function longestPart(text: string): number {
  let m = 1;
  for (const w of text.trim().split(/\s+/)) for (const p of w.split(/(?<=[-_/:])/)) m = Math.max(m, p.length);
  return m;
}

/** Контурные иконки на сетке 24x24. */
export const ICONS = {
  check: `<path d="M4 12.5l5 5L20 6.5"/>`,
  x: `<path d="M6 6l12 12M18 6L6 18"/>`,
  alert: `<path d="M12 3.5L22 20H2L12 3.5z"/><path d="M12 10v4.5M12 17.6v.01"/>`,
  bell: `<path d="M6 16v-5a6 6 0 1112 0v5l2 2H4l2-2z"/><path d="M10 21h4"/>`,
  cube: `<path d="M12 2.5l8.5 4.7v9.6L12 21.5l-8.5-4.7V7.2L12 2.5z"/><path d="M3.5 7.2L12 12l8.5-4.8M12 12v9.5"/>`,
  server: `<rect x="3" y="4" width="18" height="6.5" rx="2"/><rect x="3" y="13.5" width="18" height="6.5" rx="2"/><path d="M7 7.2v.01M7 16.8v.01"/>`,
  cpu: `<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>`,
  ram: `<rect x="2.5" y="7" width="19" height="10" rx="2"/><path d="M7 11v2M11 11v2M15 11v2M6 17v3M18 17v3"/>`,
  disk: `<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>`,
  pulse: `<path d="M2 12h4l3-8 5 16 3-8h5"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
  lock: `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>`,
  globe: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18"/>`,
  net: `<path d="M8 20V5M8 5L4.5 8.5M8 5l3.5 3.5M16 4v15M16 19l-3.5-3.5M16 19l3.5-3.5"/>`,
  gear: `<circle cx="12" cy="12" r="3"/><path d="M10.3 2.8h3.4l.5 2.3a7.2 7.2 0 011.9 1.1l2.2-.8 1.7 2.9-1.7 1.6a7.4 7.4 0 010 2.2l1.7 1.6-1.7 2.9-2.2-.8a7.2 7.2 0 01-1.9 1.1l-.5 2.3h-3.4l-.5-2.3a7.2 7.2 0 01-1.9-1.1l-2.2.8-1.7-2.9 1.7-1.6a7.4 7.4 0 010-2.2L4 9.1l1.7-2.9 2.2.8a7.2 7.2 0 011.9-1.1l.5-2.3z"/>`,
  restart: `<path d="M20 12a8 8 0 11-2.6-5.9"/><path d="M20 4v5h-5"/>`,
  plug: `<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0V8zM12 17v4"/>`,
  layers: `<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>`,
  gauge: `<path d="M3.5 17a8.5 8.5 0 1117 0"/><path d="M12 17l4.2-5.2"/><path d="M12 17v.01"/>`,
  terminal: `<path d="M4 17l6-5-6-5M12 19h8"/>`,
  power: `<path d="M12 3v8"/><path d="M6.4 6.6a8 8 0 1011.2 0"/>`,
  play: `<path d="M7 4.5v15l12-7.5z"/>`,
  stop: `<rect x="6" y="6" width="12" height="12" rx="2"/>`,
  ack: `<circle cx="12" cy="12" r="9"/><path d="M7.8 12.4l3 3 5.4-6"/>`,
} as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, x: number, y: number, size: number, color = "#ffffff", stroke = 2): string {
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</g>`;
}

/** Кольцевая шкала с закруглёнными концами. */
export function ring(cx: number, cy: number, r: number, w: number, pct: number, color: string): string {
  const c = 2 * Math.PI * r;
  const len = Math.max(0.5, (c * Math.min(Math.max(pct, 0), 100)) / 100);
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="${w}"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
}

/** Сплошная шкала (везде только сплошные линии, без делений). */
export function hbar(x: number, y: number, w: number, h: number, pct: number, color: string): string {
  const p = Math.min(Math.max(pct, 0), 100);
  const fill = p <= 0 ? 0 : Math.max(h, (w * p) / 100);
  const r = h / 2;
  const track = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#ffffff" fill-opacity="0.1"/>`;
  return fill > 0 ? `${track}
<rect x="${x}" y="${y}" width="${fill.toFixed(1)}" height="${h}" rx="${r}" fill="${color}"/>` : track;
}

/** Тонкая разделительная линия. */
export const rule = (x1: number, x2: number, y: number, opacity = 0.1): string =>
  `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#ffffff" stroke-opacity="${opacity}" stroke-width="1"/>`;

/** Линия истории с лёгкой подложкой. */
export function spark(values: number[], x: number, y: number, w: number, h: number, color = "#ffffff", max?: number, sw = 2.5): string {
  const v = values.slice(-40);
  if (v.length < 2) return "";
  const m = max ?? Math.max(1, ...v);
  const step = w / (v.length - 1);
  const pts = v.map((val, i) => `${(x + i * step).toFixed(1)},${(y + h - (Math.min(val, m) / m) * h).toFixed(1)}`);
  return `<polygon points="${x},${y + h} ${pts.join(" ")} ${x + w},${y + h}" fill="${color}" fill-opacity="0.14"/>
<polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
}
