import type { IconName, Tone } from "../theme";

/** Показатель: подпись, крупное число, шкала или график, мелкие строки. */
export type GaugeTile = {
  label: string;
  big: string;
  lines?: string[];
  pct?: number; // шкала под числом
  history?: number[]; // вместо шкалы — линия истории
  histMax?: number;
  tone?: Tone;
};

/** Статус: название, состояние (цветом) и справка. */
export type StatusTile = {
  icon: IconName;
  tone: Tone;
  meta?: string;
  lines: { text: string; accent?: boolean; maxLines?: number }[];
};

/** Уровень в сегментах. */
export type LevelTile = {
  icon: IconName;
  title: string;
  total: number;
  filled: number;
  tone?: Tone;
};

/** Одна-две шкалы с подписями («CPU 7% / RAM 42%»). */
export type SliderTile = {
  icon?: IconName;
  label: string;
  rows: { name: string; value: string; pct: number; tone?: Tone }[];
  footer?: string;
  tone?: Tone;
};

export type Style = {
  gaugeTile(t: GaugeTile): string;
  statusTile(t: StatusTile): string;
  levelTile(t: LevelTile): string;
  sliderTile(t: SliderTile): string;
};
