import { alerts, type Severity } from "./alerts";
import type { HostCollector } from "./collector";
import { t } from "../i18n";

const sev = (v: number, warn: number, crit: number): Severity | null => (v >= crit ? "crit" : v >= warn ? "warn" : null);

/** Типовые правила для хоста. Вызываются при отрисовке любой кнопки этого хоста (повторы безвредны). */
export function evalHostAlerts(c: HostCollector, name: string): void {
  const k = c.key;
  if (!c.online) {
    if (c.snap || c.status === "offline") alerts.report(`${k}|offline`, t("{name}: offline", { name }), "crit", { after: 2 });
    return;
  }
  alerts.report(`${k}|offline`, "", null);

  if (c.cpu !== null) alerts.report(`${k}|cpu`, `${name}: CPU ${Math.round(c.cpu)}%`, sev(c.cpu, 85, 95), { after: 3 });
  alerts.report(`${k}|ram`, `${name}: RAM ${Math.round(c.ramPct)}%`, sev(c.ramPct, 90, 97), { after: 3 });

  const snap = c.snap;
  if (!snap) return;
  for (const d of snap.disks) {
    if (d.mount.startsWith("/snap") || d.totalKb <= 0) continue;
    const p = (d.usedKb / d.totalKb) * 100;
    alerts.report(`${k}|disk:${d.mount}`, t("{name}: disk {mount} {p}%", { name, mount: d.mount, p: Math.round(p) }), sev(p, 85, 95), { after: 2 });
  }
  if (snap.failedUnits > 0) {
    alerts.report(`${k}|failed`, t("{name}: {n} failed services", { name, n: snap.failedUnits }), "warn", { after: 2 });
  } else {
    alerts.report(`${k}|failed`, "", null);
  }
}
