export type Severity = "warn" | "crit";

export type Alert = {
  key: string;
  label: string;
  severity: Severity;
  since: number;
  acked: boolean;
};

/**
 * Хранилище активных алертов с защитой от «дребезга»: условие должно повториться
 * `after` раз подряд, чтобы стать алертом; снимается, как только условие пропало.
 */
export class AlertStore {
  private active = new Map<string, Alert>();
  private streak = new Map<string, number>();
  private listeners = new Set<() => void>();

  /** severity = null — условие в норме. */
  report(key: string, label: string, severity: Severity | null, opts: { after?: number } = {}): void {
    const after = opts.after ?? 2;
    if (severity === null) {
      this.streak.delete(key);
      if (this.active.delete(key)) this.emit();
      return;
    }
    const n = (this.streak.get(key) ?? 0) + 1;
    this.streak.set(key, n);
    if (n < after) return;

    const cur = this.active.get(key);
    if (!cur) {
      this.active.set(key, { key, label, severity, since: Date.now(), acked: false });
      this.emit();
    } else if (cur.label !== label || cur.severity !== severity) {
      const escalated = cur.severity === "warn" && severity === "crit";
      this.active.set(key, { ...cur, label, severity, acked: escalated ? false : cur.acked });
      this.emit();
    }
  }

  clear(key: string): void {
    this.streak.delete(key);
    if (this.active.delete(key)) this.emit();
  }

  clearPrefix(prefix: string): void {
    let changed = false;
    for (const k of [...this.active.keys()]) {
      if (k.startsWith(prefix)) {
        this.active.delete(k);
        changed = true;
      }
    }
    for (const k of [...this.streak.keys()]) if (k.startsWith(prefix)) this.streak.delete(k);
    if (changed) this.emit();
  }

  /** Все активные: сначала критичные, затем по времени возникновения. */
  list(): Alert[] {
    return [...this.active.values()].sort(
      (a, b) => Number(b.severity === "crit") - Number(a.severity === "crit") || a.since - b.since,
    );
  }

  unacked(): Alert[] {
    return this.list().filter((a) => !a.acked);
  }

  ackAll(): number {
    let n = 0;
    for (const a of this.active.values()) {
      if (!a.acked) {
        a.acked = true;
        n++;
      }
    }
    if (n) this.emit();
    return n;
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}

export const alerts = new AlertStore();
