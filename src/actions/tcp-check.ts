import { action, type KeyAction } from "@elgato/streamdeck";

import { alerts } from "../core/alerts";
import { tcpCheck } from "../core/checks";
import { refOf, type HostSettings } from "../core/hosts";
import { resolveEndpoint } from "../core/sshconfig";
import { statusTile } from "../render";
import { KeyBase } from "./base";
import { t } from "../i18n";

type Settings = HostSettings & { label?: string; port?: string; intervalSec?: string | number };

/** Проверка, что порт на хосте открыт (SSH, БД, почта и т.п.). */
@action({ UUID: "com.guddion.server-status.tcp" })
export class TcpCheck extends KeyBase<Settings> {
  protected tickMs(s: Settings): number {
    return Math.max(5, Number(s.intervalSec) || 15) * 1000;
  }

  protected override onDetach(id: string): void {
    alerts.clearPrefix(`check:${id}`);
  }

  protected async render(act: KeyAction<Settings>, s: Settings): Promise<string> {
    const ref = refOf(s);
    const port = Number(s.port);
    if (!ref || !port) return statusTile({ icon: "plug", tone: "idle", lines: [{ text: t("Host and port") }] });

    const ep = resolveEndpoint(ref.host);
    const name = (s.label ?? "").trim() || `${ep.hostname}:${port}`;
    const r = await tcpCheck(ep.hostname, port, 3000);

    if (r.up) {
      alerts.report(`check:${act.id}`, "", null);
      return statusTile({ icon: "check", tone: "up", meta: t("{ms} ms", { ms: r.ms ?? 0 }), lines: [{ text: name }, { text: "Open", accent: true }] });
    }
    alerts.report(`check:${act.id}`, t("{name}: port closed", { name }), "crit", { after: 2 });
    return statusTile({ icon: "x", tone: "crit", meta: r.error, lines: [{ text: name }, { text: "Closed", accent: true }] });
  }
}
