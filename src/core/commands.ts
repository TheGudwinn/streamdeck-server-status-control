/**
 * Чистая логика кнопок управления (без внутренних импортов — тестируется отдельно):
 * способы подтверждения, пресеты команд, защита от опасных команд, обёртка sudo.
 */

/** none — сразу по нажатию; hold — удержание; twice — второе нажатие в течение 4–5 с; holdTwice — удержание, затем второе нажатие. */
export type Confirm = "none" | "hold" | "twice" | "holdTwice";

const CONFIRMS: readonly Confirm[] = ["none", "hold", "twice", "holdTwice"];

export const asConfirm = (v: unknown, fallback: Confirm): Confirm => (CONFIRMS.includes(v as Confirm) ? (v as Confirm) : fallback);

export type Decision = "run" | "hint" | "arm";

/** Что делать при очередном нажатии. armedUntil — до какого момента кнопка «взведена» (или null). */
export function decide(mode: Confirm, armedUntil: number | null, heldMs: number, holdMs: number, now: number): Decision {
  const armed = armedUntil !== null && now < armedUntil;
  switch (mode) {
    case "none":
      return "run";
    case "hold":
      return heldMs >= holdMs ? "run" : "hint";
    case "twice":
      return armed ? "run" : "arm";
    case "holdTwice":
      return armed ? "run" : heldMs >= holdMs ? "arm" : "hint";
  }
}

/** Экранирование строки для оболочки: в одинарных кавычках. */
export const shellQuote = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

/** Выполнить от root: напрямую, если мы root, иначе через `sudo -n` (без запроса пароля). */
export function wrapRoot(cmd: string): string {
  const q = shellQuote(cmd);
  return `if [ "$(id -u)" = 0 ]; then sh -c ${q}; else sudo -n sh -c ${q}; fi`;
}

export type Preset = { name: string; cmd: string; root?: boolean };

/** Готовые безопасные команды. Название (name) — английская фраза для перевода. */
export const PRESETS: Record<string, Preset> = {
  uptime: { name: "Uptime", cmd: "uptime -p" },
  disk: { name: "Disk usage", cmd: `df -h / | awk 'NR==2 {print $3 "/" $2}'` },
  topproc: { name: "Top process", cmd: `ps -eo comm,%mem --sort=-%mem | awk 'NR==2 {print $1 " " $2 "%"}'` },
  errors: { name: "Errors, 10 min", cmd: `journalctl -p err --since "10 min ago" --no-pager -q | wc -l` },
  nginxtest: { name: "nginx test", cmd: "nginx -t 2>&1 | tail -1", root: true },
  nginxreload: { name: "nginx reload", cmd: "nginx -t 2>&1 && systemctl reload nginx && echo reloaded", root: true },
  dockerup: { name: "Docker running", cmd: "docker ps -q | wc -l" },
  freecache: { name: "Free cache", cmd: "sync; echo 3 > /proc/sys/vm/drop_caches && echo freed", root: true },
};

const DANGEROUS: [RegExp, string][] = [
  [/\brm\s+(-\S+\s+)*(\/|\/\*|~|\$HOME)(\s|$)/, "rm of / or home"],
  [/\bmkfs(\.\w+)?\b/, "mkfs"],
  [/\bdd\s+[^|;&]*\bof=\/dev\//, "dd to a device"],
  [/>\s*\/dev\/(sd|nvme|vd|xvd)\w*/, "write to a disk device"],
  [/:\(\)\s*\{\s*:\|:&\s*\};:/, "fork bomb"],
  [/\b(shutdown|poweroff|halt|reboot)\b/, "power command (use the Power action)"],
  [/\binit\s+[06]\b/, "init 0/6"],
  [/\bchmod\s+-R\s+\S*\s*\/(\s|$)/, "chmod -R /"],
];

/** Причина, по которой команду считаем опасной (или null). */
export function dangerOf(cmd: string): string | null {
  for (const [re, why] of DANGEROUS) if (re.test(cmd)) return why;
  return null;
}

export type Built = { cmd: string; raw: string; presetName?: string };

/** Итоговая команда: пресет или своя; при необходимости обёрнута в sudo. null — команды нет или она слишком длинная. */
export function buildCommand(preset: string | undefined, custom: string | undefined, asRoot: boolean): Built | null {
  const p = preset && preset !== "custom" ? PRESETS[preset] : undefined;
  const raw = (p ? p.cmd : (custom ?? "")).trim();
  if (!raw || raw.length > 2000) return null;
  const root = p ? !!p.root : asRoot;
  return { cmd: root ? wrapRoot(raw) : raw, raw, presetName: p?.name };
}

/** Последняя непустая строка вывода без ANSI-кодов, обрезанная для плитки. */
export function lastLine(out: string, max = 60): string {
  const clean = out.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
  const line = clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop() ?? "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}
