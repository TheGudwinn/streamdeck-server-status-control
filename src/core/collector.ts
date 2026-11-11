import { execFile, spawn, type ChildProcess } from "node:child_process";

import { alerts } from "./alerts";
import { hostKey, sshBaseArgs, type HostRef } from "./hosts";
import { cpuPercent, netTotals, ramPercent, swapPercent, parseBlock, type Snapshot } from "./parse";
import { COLLECTOR_SCRIPT } from "./script";

export type Needs = { units: string[]; docker: boolean; intervalSec: number };

const HISTORY = 120;
const push = (arr: number[], v: number): void => {
  arr.push(v);
  if (arr.length > HISTORY) arr.shift();
};

/** Один долгоживущий SSH-поток метрик на хост. Агент на сервере не нужен. */
export class HostCollector {
  status: "connecting" | "online" | "offline" = "connecting";
  error = "";
  snap: Snapshot | null = null;
  cpu: number | null = null;
  netRate: { rx: number; tx: number } | null = null;
  history = { cpu: [] as number[], ram: [] as number[], net: [] as number[] };

  private needs = new Map<string, Needs>();
  private proc?: ChildProcess;
  private sig = "";
  private buf = "";
  private block: string[] = [];
  private lastRx = 0;
  private backoff = 3000;
  private reconnectTimer?: NodeJS.Timeout;
  private applyTimer?: NodeJS.Timeout;
  private watchdog?: NodeJS.Timeout;
  private stopped = false;

  constructor(readonly ref: HostRef) {}

  get key(): string {
    return hostKey(this.ref);
  }

  setNeeds(id: string, n: Needs): void {
    this.needs.set(id, n);
    this.scheduleApply();
  }

  /** true, если подписчиков не осталось и коллектор остановлен. */
  removeNeeds(id: string): boolean {
    this.needs.delete(id);
    if (this.needs.size === 0) {
      this.stop();
      return true;
    }
    this.scheduleApply();
    return false;
  }

  /** Данные свежие: поток жив и блок приходил недавно. */
  get online(): boolean {
    if (this.status !== "online" || !this.snap) return false;
    return Date.now() - this.snap.recvAt < this.config().interval * 4000 + 8000;
  }

  get ramPct(): number {
    return this.snap ? ramPercent(this.snap) : 0;
  }

  get swapPct(): number {
    return this.snap ? swapPercent(this.snap) : 0;
  }

  private config(): { units: string[]; docker: boolean; interval: number } {
    const units = new Set<string>();
    let docker = false;
    let interval = 5;
    for (const n of this.needs.values()) {
      n.units.forEach((u) => units.add(u));
      docker ||= n.docker;
      interval = Math.min(interval, Math.max(3, Math.min(60, n.intervalSec || 5)));
    }
    return { units: [...units].sort(), docker, interval };
  }

  private scheduleApply(): void {
    clearTimeout(this.applyTimer);
    this.applyTimer = setTimeout(() => this.apply(), 400);
  }

  private apply(): void {
    if (this.stopped) return;
    const sig = JSON.stringify(this.config());
    if (this.proc && sig === this.sig) return;
    this.restart();
  }

  private restart(): void {
    clearTimeout(this.reconnectTimer);
    this.killProc();
    this.connect();
  }

  private connect(): void {
    if (this.stopped || this.needs.size === 0) return;
    const cfg = this.config();
    this.sig = JSON.stringify(cfg);
    const args = [
      ...sshBaseArgs(this.ref),
      "sh", "-s", "--",
      cfg.units.length ? cfg.units.join(",") : "-",
      cfg.docker ? "1" : "0",
      String(cfg.interval),
    ];
    if (!this.snap) this.status = "connecting";
    this.buf = "";
    this.block = [];
    this.lastRx = Date.now();

    const p = spawn("ssh", args, { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    this.proc = p;
    p.stdin?.on("error", () => {});
    p.stdin?.write(`${COLLECTOR_SCRIPT}\n`);
    p.stdout?.setEncoding("utf8");
    p.stdout?.on("data", (d: string) => this.onData(d));
    p.stderr?.setEncoding("utf8");
    p.stderr?.on("data", (d: string) => {
      const last = d.trim().split(/\r?\n/).pop();
      if (last) this.error = last.slice(0, 120);
    });
    p.on("error", (e) => {
      this.error = e.message;
    });
    p.on("close", () => {
      if (this.proc !== p) return;
      this.proc = undefined;
      this.status = "offline";
      this.scheduleReconnect();
    });

    clearInterval(this.watchdog);
    this.watchdog = setInterval(() => {
      if (this.proc && Date.now() - this.lastRx > cfg.interval * 3000 + 15000) {
        this.error = "no data";
        this.proc.kill();
      }
    }, 5000);
  }

  private onData(chunk: string): void {
    this.buf += chunk;
    let i: number;
    while ((i = this.buf.indexOf("\n")) >= 0) {
      const line = this.buf.slice(0, i).replace(/\r$/, "");
      this.buf = this.buf.slice(i + 1);
      if (line === "@end") {
        this.handleBlock(this.block);
        this.block = [];
      } else {
        this.block.push(line);
      }
    }
  }

  private handleBlock(lines: string[]): void {
    const snap = parseBlock(lines);
    if (!snap) return;
    const prev = this.snap;
    this.lastRx = Date.now();
    this.backoff = 3000;
    this.error = "";
    this.status = "online";

    if (prev) {
      this.cpu = cpuPercent(prev.cpuLine, snap.cpuLine);
      const dt = snap.ts - prev.ts;
      if (dt > 0) {
        const a = netTotals(prev);
        const b = netTotals(snap);
        this.netRate = { rx: Math.max(0, (b.rx - a.rx) / dt), tx: Math.max(0, (b.tx - a.tx) / dt) };
        push(this.history.net, this.netRate.rx);
      }
    }
    if (this.cpu !== null) push(this.history.cpu, this.cpu);
    push(this.history.ram, ramPercent(snap));
    this.snap = snap;
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.needs.size === 0) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), this.backoff);
    this.backoff = Math.min(this.backoff * 2, 60000);
  }

  private killProc(): void {
    const p = this.proc;
    this.proc = undefined;
    p?.kill();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    clearTimeout(this.applyTimer);
    clearInterval(this.watchdog);
    this.killProc();
    alerts.clearPrefix(`${this.key}|`);
  }
}

const collectors = new Map<string, HostCollector>();

export function subscribe(ref: HostRef, id: string, needs: Needs): HostCollector {
  const k = hostKey(ref);
  let c = collectors.get(k);
  if (!c) {
    c = new HostCollector(ref);
    collectors.set(k, c);
  }
  c.setNeeds(id, needs);
  return c;
}

export function unsubscribe(ref: HostRef, id: string): void {
  const k = hostKey(ref);
  const c = collectors.get(k);
  if (c?.removeNeeds(id)) collectors.delete(k);
}

export function collectorOf(ref: HostRef): HostCollector | undefined {
  return collectors.get(hostKey(ref));
}

/** Разовая команда на сервере (restart и т.п.). Команда собирается только из проверенных имён. */
export function runRemote(ref: HostRef, command: string, timeoutMs = 25000): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) => {
    execFile("ssh", [...sshBaseArgs(ref), command], { timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: `${stdout}${stderr}`.trim().slice(-300) });
    });
  });
}
