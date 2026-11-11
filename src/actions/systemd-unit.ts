import { action, type KeyAction } from "@elgato/streamdeck";

import { alerts } from "../core/alerts";
import { runRemote, type HostCollector } from "../core/collector";
import { isUnitName, type HostRef } from "../core/hosts";
import { statusTile } from "../render";
import { HostKeyBase, pendingTile } from "./base";
import { t } from "../i18n";

type Settings = {
  host?: string;
  hostManual?: string;
  keyPath?: string;
  label?: string;
  unit?: string;
  allowRestart?: boolean;
};

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Состояние службы systemd. Удержание 1 с — перезапуск (если разрешено в настройках). */
@action({ UUID: "com.guddion.server-status.unit" })
export class SystemdUnit extends HostKeyBase<Settings> {
  protected override needs(s: Settings): { units: string[]; docker: boolean } {
    const u = (s.unit ?? "").trim();
    return { units: isUnitName(u) ? [u] : [], docker: false };
  }

  protected renderHost(_act: KeyAction<Settings>, s: Settings, c: HostCollector, ref: HostRef): string {
    const unit = (s.unit ?? "").trim();
    if (!isUnitName(unit)) return statusTile({ icon: "gear", tone: "idle", lines: [{ text: t("Enter service") }] });

    const name = (s.label ?? "").trim() || unit.replace(/\.service$/, "");
    const pending = pendingTile(name, c);
    if (pending || !c.snap) return pending ?? "";

    const state = c.snap.units[unit] ?? "unknown";
    const key = `${c.key}|unit:${unit}`;
    if (state === "active") {
      alerts.report(key, "", null);
      return statusTile({ icon: "check", tone: "up", lines: [{ text: name }, { text: "Active", accent: true }] });
    }
    if (state === "activating" || state === "reloading") {
      alerts.report(key, `${name}: ${state}`, "warn", { after: 3 });
      return statusTile({ icon: "restart", tone: "warn", lines: [{ text: name }, { text: cap(state), accent: true }] });
    }
    alerts.report(key, `${name}: ${state}`, "crit", { after: 2 });
    return statusTile({ icon: "x", tone: "crit", lines: [{ text: name }, { text: cap(state), accent: true }] });
  }

  protected override async pressed(act: KeyAction<Settings>, s: Settings, heldMs: number): Promise<void> {
    const ref = this.refs.get(act.id);
    const unit = (s.unit ?? "").trim();
    if (!s.allowRestart || heldMs < 1000 || !ref || !isUnitName(unit)) {
      await this.refresh(act.id);
      return;
    }
    const name = (s.label ?? "").trim() || unit.replace(/\.service$/, "");
    await this.exclusive(act.id, async (show) => {
      await show(statusTile({ icon: "restart", tone: "warn", lines: [{ text: name }, { text: "Restart…", accent: true }] }));
      const cmd = `if [ "$(id -u)" = 0 ]; then systemctl restart ${unit}; else sudo -n systemctl restart ${unit}; fi`;
      const r = await runRemote(ref, cmd);
      if (r.ok) await act.showOk();
      else await act.showAlert();
    });
  }
}
