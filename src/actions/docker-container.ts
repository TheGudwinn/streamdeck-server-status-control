import { action, type KeyAction } from "@elgato/streamdeck";

import { alerts } from "../core/alerts";
import { runRemote, type HostCollector } from "../core/collector";
import { isContainerName, type HostRef } from "../core/hosts";
import { statusTile } from "../render";
import { HostKeyBase, pendingTile } from "./base";
import { t } from "../i18n";

type Settings = {
  host?: string;
  hostManual?: string;
  keyPath?: string;
  label?: string;
  container?: string;
  allowRestart?: boolean;
};

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Docker-контейнер на удалённом сервере (по SSH). Удержание 1 с — перезапуск (если разрешено). */
@action({ UUID: "com.guddion.server-status.docker" })
export class DockerContainer extends HostKeyBase<Settings> {
  protected override needs(): { units: string[]; docker: boolean } {
    return { units: [], docker: true };
  }

  protected renderHost(_act: KeyAction<Settings>, s: Settings, c: HostCollector, _ref: HostRef): string {
    const cname = (s.container ?? "").trim();
    if (!isContainerName(cname)) return statusTile({ icon: "cube", tone: "idle", lines: [{ text: t("Container name") }] });

    const name = (s.label ?? "").trim() || cname;
    const pending = pendingTile(name, c);
    if (pending || !c.snap) return pending ?? "";

    if (c.snap.docker === null) {
      return statusTile({ icon: "cube", tone: "idle", lines: [{ text: name }, { text: t("No Docker"), accent: true }] });
    }
    const key = `${c.key}|ct:${cname}`;
    const ct = c.snap.docker.find((d) => d.name === cname);
    if (!ct) {
      alerts.report(key, t("{name}: container not found", { name }), "crit", { after: 2 });
      return statusTile({ icon: "cube", tone: "crit", lines: [{ text: name }, { text: t("Not found"), accent: true }] });
    }
    if (ct.state === "running") {
      alerts.report(key, "", null);
      return statusTile({ icon: "cube", tone: "up", lines: [{ text: name }, { text: "Running", accent: true }] });
    }
    alerts.report(key, `${name}: ${ct.state}`, "crit", { after: 2 });
    return statusTile({ icon: "cube", tone: "crit", lines: [{ text: name }, { text: cap(ct.state), accent: true }] });
  }

  protected override async pressed(act: KeyAction<Settings>, s: Settings, heldMs: number): Promise<void> {
    const ref = this.refs.get(act.id);
    const cname = (s.container ?? "").trim();
    if (!s.allowRestart || heldMs < 1000 || !ref || !isContainerName(cname)) {
      await this.refresh(act.id);
      return;
    }
    const name = (s.label ?? "").trim() || cname;
    await this.exclusive(act.id, async (show) => {
      await show(statusTile({ icon: "restart", tone: "warn", lines: [{ text: name }, { text: "Restart…", accent: true }] }));
      const r = await runRemote(ref, `docker restart ${cname} || sudo -n docker restart ${cname}`);
      if (r.ok) await act.showOk();
      else await act.showAlert();
    });
  }
}
