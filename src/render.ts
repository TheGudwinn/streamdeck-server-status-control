import { glass } from "./styles/glass";
import { monoStyle } from "./styles/mono";
import type { GaugeTile, LevelTile, SliderTile, StatusTile, Style } from "./styles/types";
import { t } from "./i18n";

export type { GaugeTile, LevelTile, SliderTile, StatusTile } from "./styles/types";

/** Доступные стили плиток. Выбор хранится в глобальных настройках плагина (`theme`). */
export type ThemeName = "glass" | "mono";

let current: ThemeName = "glass";

/** Возвращает true, если стиль действительно сменился. */
export function setTheme(value: unknown): boolean {
  const next: ThemeName = value === "mono" ? "mono" : "glass";
  const changed = next !== current;
  current = next;
  return changed;
}

export const getTheme = (): ThemeName => current;

const style = (): Style => (current === "mono" ? monoStyle : glass);

export const gaugeTile = (t: GaugeTile): string => style().gaugeTile(t);
export const statusTile = (t: StatusTile): string => style().statusTile(t);
export const levelTile = (t: LevelTile): string => style().levelTile(t);
export const sliderTile = (t: SliderTile): string => style().sliderTile(t);

export function fmtBytes(b: number): string {
  const u = [t("B"), t("KB"), t("MB"), t("GB"), t("TB")];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${u[i]}`;
}

export const fmtRate = (bytesPerSec: number): string => t("{v}/s", { v: fmtBytes(bytesPerSec) });

export function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  if (d >= 1) return t("{n} d", { n: d });
  const h = Math.floor(sec / 3600);
  if (h >= 1) return t("{n} h", { n: h });
  return t("{n} min", { n: Math.floor(sec / 60) });
}

export const gb = (kb: number): string => (kb / 1048576).toFixed(1);
export const pct = (n: number): string => `${Math.round(n)}%`;
