import { action, type KeyAction } from "@elgato/streamdeck";

import type { HostCollector } from "../core/collector";
import type { HostRef } from "../core/hosts";
import { evalHostAlerts } from "../core/hostalerts";
import { gb, gaugeTile, pct, sliderTile } from "../render";
import type { Tone } from "../theme";
import { HostKeyBase, pendingTile } from "./base";
import { t } from "../i18n";

type Settings = {
  host?: string;
  hostManual?: string;
  keyPath?: string;
  label?: string;
  metric?: "both" | "cpu" | "ram";
};

export const toneBy = (v: number, warn: number, crit: number): Tone => (v >= crit ? "crit" : v >= warn ? "warn" : "neutral");

@action({ UUID: "com.guddion.server-status.resources" })
export class HostOverview extends HostKeyBase<Settings> {
  protected renderHost(_act: KeyAction<Settings>, s: Settings, c: HostCollector, ref: HostRef): string {
    const name = this.displayName(s, ref, "VPS");
    evalHostAlerts(c, name);
    const pending = pendingTile(name, c);
    if (pending || !c.snap) return pending ?? "";

    const cpu = c.cpu ?? 0;
    const ram = c.ramPct;
    const snap = c.snap;
    const used = snap.memTotalKb - snap.memAvailKb;
    const tone: Tone =
      cpu >= 95 || ram >= 97 ? "crit" : cpu >= 85 || ram >= 90 ? "warn" : "neutral";
    const mode = s.metric ?? "both";

    if (mode === "cpu") {
      return gaugeTile({ label: "CPU", big: pct(cpu), lines: [`load ${snap.load[0].toFixed(2)}`, name], pct: cpu, tone: toneBy(cpu, 85, 95) });
    }
    if (mode === "ram") {
      return gaugeTile({
        label: "RAM",
        big: pct(ram),
        lines: [`${gb(used)}/${gb(snap.memTotalKb)} ${t("GB")}`, name],
        pct: ram,
        tone: toneBy(ram, 90, 97),
      });
    }
    return sliderTile({
      icon: "server",
      label: name,
      rows: [
        { name: "CPU", value: pct(cpu), pct: cpu, tone: toneBy(cpu, 85, 95) },
        { name: "RAM", value: pct(ram), pct: ram, tone: toneBy(ram, 90, 97) },
      ],
      footer: `${gb(used)}/${gb(snap.memTotalKb)} ${t("GB")}`,
      tone,
    });
  }
}
