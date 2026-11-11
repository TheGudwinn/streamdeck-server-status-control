import { action, type KeyAction } from "@elgato/streamdeck";

import { alerts } from "../core/alerts";
import { tcpCheck } from "../core/checks";
import { refOf, type HostSettings } from "../core/hosts";
import { resolveEndpoint } from "../core/sshconfig";
import { gaugeTile, statusTile } from "../render";
import { KeyBase } from "./base";
import { t } from "../i18n";

type Settings = HostSettings & { label?: string; port?: string };

/** Задержка до хоста: время TCP-соединения (по умолчанию порт SSH), с историей. */
@action({ UUID: "com.guddion.server-status.latency" })
export class Latency extends KeyBase<Settings> {
  private history = new Map<string, number[]>();

  protected tickMs(): number {
    return 5000;
  }

  protected override onDetach(id: string): void {
    this.history.delete(id);
    alerts.clearPrefix(`check:${id}`);
  }

  protected async render(act: KeyAction<Settings>, s: Settings): Promise<string> {
    const ref = refOf(s);
    if (!ref) return statusTile({ icon: "pulse", tone: "idle", lines: [{ text: t("Select a host") }] });

    const ep = resolveEndpoint(ref.host);
    const port = Number(s.port) || ep.port;
    const name = (s.label ?? "").trim() || ep.hostname;
    const r = await tcpCheck(ep.hostname, port, 3000);
    const hist = this.history.get(act.id) ?? [];
    this.history.set(act.id, hist);

    if (!r.up) {
      alerts.report(`check:${act.id}`, t("{name}: unreachable", { name }), "crit", { after: 3 });
      return statusTile({ icon: "x", tone: "crit", meta: r.error, lines: [{ text: name }, { text: "Down", accent: true }] });
    }
    alerts.report(`check:${act.id}`, "", null);
    const ms = r.ms ?? 0;
    hist.push(ms);
    if (hist.length > 60) hist.shift();
    return gaugeTile({
      label: "Ping",
      big: t("{ms} ms", { ms }),
      lines: [`${name}:${port}`],
      history: hist,
      tone: ms > 300 ? "warn" : "neutral",
    });
  }
}
