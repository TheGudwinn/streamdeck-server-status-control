export type Snapshot = {
  ts: number;
  recvAt: number;
  hostname: string;
  cpuLine: string;
  memTotalKb: number;
  memAvailKb: number;
  swapTotalKb: number;
  swapFreeKb: number;
  load: [number, number, number];
  uptimeSec: number;
  cores: number;
  disks: { mount: string; totalKb: number; usedKb: number }[];
  inodes: { mount: string; total: number; used: number }[];
  net: { iface: string; rx: number; tx: number }[];
  units: Record<string, string>;
  failedUnits: number;
  docker: { name: string; state: string; status: string }[] | null;
  rebootRequired: boolean;
};

/** Разбирает один блок строк коллектора (от @ts до @end). */
export function parseBlock(lines: string[], recvAt: number = Date.now()): Snapshot | null {
  const s: Snapshot = {
    ts: 0,
    recvAt,
    hostname: "",
    cpuLine: "",
    memTotalKb: 0,
    memAvailKb: 0,
    swapTotalKb: 0,
    swapFreeKb: 0,
    load: [0, 0, 0],
    uptimeSec: 0,
    cores: 1,
    disks: [],
    inodes: [],
    net: [],
    units: {},
    failedUnits: 0,
    docker: null,
    rebootRequired: false,
  };
  let seenCpu = false;

  for (const raw of lines) {
    if (!raw.startsWith("@")) continue;
    const sp = raw.indexOf(" ");
    const tag = sp > 0 ? raw.slice(1, sp) : raw.slice(1);
    const rest = sp > 0 ? raw.slice(sp + 1).trim() : "";

    switch (tag) {
      case "ts":
        s.ts = Number(rest) || 0;
        break;
      case "host":
        s.hostname = rest;
        break;
      case "cpu":
        s.cpuLine = rest;
        seenCpu = true;
        break;
      case "mem": {
        const m = rest.match(/^(\w+):\s+(\d+)/);
        if (!m) break;
        const kb = Number(m[2]);
        if (m[1] === "MemTotal") s.memTotalKb = kb;
        else if (m[1] === "MemAvailable") s.memAvailKb = kb;
        else if (m[1] === "SwapTotal") s.swapTotalKb = kb;
        else if (m[1] === "SwapFree") s.swapFreeKb = kb;
        break;
      }
      case "load": {
        const p = rest.split(/\s+/).map(Number);
        s.load = [p[0] || 0, p[1] || 0, p[2] || 0];
        break;
      }
      case "up":
        s.uptimeSec = Number(rest) || 0;
        break;
      case "cores":
        s.cores = Number(rest) || 1;
        break;
      case "df": {
        const p = rest.split(/\s+/);
        const total = Number(p[1]);
        const used = Number(p[2]);
        if (p[0] && Number.isFinite(total) && Number.isFinite(used)) s.disks.push({ mount: p[0], totalKb: total, usedKb: used });
        break;
      }
      case "ino": {
        const p = rest.split(/\s+/);
        const total = Number(p[1]);
        const used = Number(p[2]);
        if (p[0] && total > 0 && Number.isFinite(used)) s.inodes.push({ mount: p[0], total, used });
        break;
      }
      case "net": {
        const p = rest.split(/\s+/);
        const rx = Number(p[1]);
        const tx = Number(p[2]);
        if (p[0] && Number.isFinite(rx) && Number.isFinite(tx)) s.net.push({ iface: p[0], rx, tx });
        break;
      }
      case "failed":
        s.failedUnits = Number(rest) || 0;
        break;
      case "unit": {
        const i = rest.indexOf(" ");
        const name = i > 0 ? rest.slice(0, i) : rest;
        s.units[name] = i > 0 ? rest.slice(i + 1).trim() || "unknown" : "unknown";
        break;
      }
      case "dkok":
        s.docker = s.docker ?? [];
        break;
      case "dk": {
        const [name, state, ...status] = rest.split("|");
        if (name) (s.docker ??= []).push({ name, state: state ?? "", status: status.join("|") });
        break;
      }
      case "reboot":
        s.rebootRequired = true;
        break;
    }
  }

  if (!seenCpu || s.memTotalKb <= 0) return null;
  return s;
}

function cpuTimes(line: string): { idle: number; total: number } | null {
  const parts = line.trim().split(/\s+/);
  if (parts[0] !== "cpu") return null;
  const n = parts.slice(1, 9).map(Number);
  if (n.length < 4 || n.some((x) => !Number.isFinite(x))) return null;
  return { idle: (n[3] ?? 0) + (n[4] ?? 0), total: n.reduce((a, b) => a + b, 0) };
}

/** Загрузка CPU (%) между двумя строками /proc/stat. */
export function cpuPercent(prevLine: string, curLine: string): number | null {
  const a = cpuTimes(prevLine);
  const b = cpuTimes(curLine);
  if (!a || !b) return null;
  const dTotal = b.total - a.total;
  if (dTotal <= 0) return null;
  return Math.min(100, Math.max(0, (1 - (b.idle - a.idle) / dTotal) * 100));
}

const VIRTUAL_IFACE = /^(lo|docker\d*|br-.*|veth.*|virbr.*|cni.*|flannel.*|tun\d*|tap.*|tailscale\d*|wg\d*|pelican\d*|zt.*)$/;

/** Суммарные счётчики по физическим интерфейсам. */
export function netTotals(s: Snapshot): { rx: number; tx: number } {
  let rx = 0;
  let tx = 0;
  for (const n of s.net) {
    if (VIRTUAL_IFACE.test(n.iface)) continue;
    rx += n.rx;
    tx += n.tx;
  }
  return { rx, tx };
}

export const ramPercent = (s: Snapshot): number => (s.memTotalKb > 0 ? (1 - s.memAvailKb / s.memTotalKb) * 100 : 0);
export const swapPercent = (s: Snapshot): number =>
  s.swapTotalKb > 0 ? (1 - s.swapFreeKb / s.swapTotalKb) * 100 : 0;
