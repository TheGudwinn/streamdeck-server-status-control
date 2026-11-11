import { action, type KeyAction } from "@elgato/streamdeck";

import type { HostCollector } from "../core/collector";
import type { HostRef } from "../core/hosts";
import { evalHostAlerts } from "../core/hostalerts";
import { fmtRate, fmtUptime, gb, gaugeTile, pct, statusTile } from "../render";
import { HostKeyBase, pendingTile } from "./base";
import { toneBy } from "./host-overview";
import { t } from "../i18n";

type Settings = {
  host?: string;
  hostManual?: string;
  keyPath?: string;
  label?: string;
  metric?: "cpu" | "ram" | "swap" | "load" | "disk" | "net" | "uptime";
  mount?: string;
};

@action({ UUID: "com.guddion.server-status.metric" })
export class Metric extends HostKeyBase<Settings> {
  protected renderHost(_act: KeyAction<Settings>, s: Settings, c: HostCollector, ref: HostRef): string {
    const name = this.displayName(s, ref, "VPS");
    evalHostAlerts(c, name);
    const pending = pendingTile(name, c);
    if (pending || !c.snap) return pending ?? "";
    const snap = c.snap;
    const kind = s.metric ?? "cpu";

    switch (kind) {
      case "cpu": {
        const v = c.cpu ?? 0;
        return gaugeTile({ label: "CPU", big: pct(v), lines: [`load ${snap.load[0].toFixed(2)}`, name], pct: v, tone: toneBy(v, 85, 95) });
      }
      case "ram": {
        const v = c.ramPct;
        const used = snap.memTotalKb - snap.memAvailKb;
        return gaugeTile({ label: "RAM", big: pct(v), lines: [`${gb(used)}/${gb(snap.memTotalKb)} ${t("GB")}`, name], pct: v, tone: toneBy(v, 90, 97) });
      }
      case "swap": {
        if (snap.swapTotalKb <= 0) return statusTile({ icon: "ram", tone: "idle", lines: [{ text: "Swap" }, { text: t("none"), accent: true }] });
        const v = c.swapPct;
        const used = snap.swapTotalKb - snap.swapFreeKb;
        return gaugeTile({ label: "Swap", big: pct(v), lines: [`${gb(used)}/${gb(snap.swapTotalKb)} ${t("GB")}`, name], pct: v, tone: toneBy(v, 50, 80) });
      }
      case "load": {
        const per = (snap.load[0] / snap.cores) * 100;
        return gaugeTile({
          label: "Load",
          big: snap.load[0].toFixed(2),
          lines: [t("5m {v}", { v: snap.load[1].toFixed(2) }), t("{n} cores", { n: snap.cores })],
          pct: Math.min(per, 100),
          tone: toneBy(per, 100, 200),
        });
      }
      case "disk": {
        const mount = (s.mount ?? "").trim() || "/";
        const d = snap.disks.find((x) => x.mount === mount);
        if (!d) return statusTile({ icon: "disk", tone: "idle", lines: [{ text: mount }, { text: t("not found"), accent: true }] });
        const v = d.totalKb > 0 ? (d.usedKb / d.totalKb) * 100 : 0;
        return gaugeTile({
          label: mount === "/" ? t("Disk") : mount,
          big: pct(v),
          lines: [`${gb(d.usedKb)}/${gb(d.totalKb)} ${t("GB")}`, name],
          pct: v,
          tone: toneBy(v, 85, 95),
        });
      }
      case "net": {
        const r = c.netRate;
        return gaugeTile({
          label: t("Network"),
          big: r ? fmtRate(r.rx).replace(/\/[^/]+$/, "") : "…",
          lines: [r ? `↑ ${fmtRate(r.tx)}` : name],
          history: c.history.net,
        });
      }
      case "uptime":
        return gaugeTile({
          label: "Uptime",
          big: fmtUptime(snap.uptimeSec),
          lines: [snap.rebootRequired ? t("reboot needed") : t("running"), snap.hostname || name],
          tone: snap.rebootRequired ? "warn" : "neutral",
        });
    }
  }
}
