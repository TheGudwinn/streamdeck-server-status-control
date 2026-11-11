import { action, type KeyAction } from "@elgato/streamdeck";

import { alerts, type Severity } from "../core/alerts";
import { tlsDaysLeft } from "../core/checks";
import { gaugeTile, statusTile } from "../render";
import { KeyBase } from "./base";
import { t } from "../i18n";

type Settings = { domain?: string; port?: string; label?: string };

const dd = (n: number): string => String(n).padStart(2, "0");

/** Сколько дней осталось до окончания TLS-сертификата. */
@action({ UUID: "com.guddion.server-status.tls" })
export class TlsExpiry extends KeyBase<Settings> {
  protected tickMs(): number {
    return 3600_000; // раз в час; нажатие — проверить сейчас
  }

  protected override onDetach(id: string): void {
    alerts.clearPrefix(`check:${id}`);
  }

  protected async render(act: KeyAction<Settings>, s: Settings): Promise<string> {
    const domain = (s.domain ?? "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain) return statusTile({ icon: "lock", tone: "idle", lines: [{ text: t("Enter domain") }] });

    const name = (s.label ?? "").trim() || domain;
    const r = await tlsDaysLeft(domain, Number(s.port) || 443, 6000);

    if (!r.ok || r.days === undefined || !r.validTo) {
      alerts.report(`check:${act.id}`, t("{name}: TLS unavailable", { name }), "crit", { after: 1 });
      return statusTile({ icon: "lock", tone: "crit", meta: r.error, lines: [{ text: name }, { text: t("No TLS"), accent: true }] });
    }

    const sev: Severity | null = r.days < 7 ? "crit" : r.days < 14 ? "warn" : null;
    alerts.report(`check:${act.id}`, t("{name}: TLS {days} d.", { name, days: r.days }), sev, { after: 1 });
    const v = r.validTo;
    return gaugeTile({
      label: name,
      big: t("{days} d", { days: r.days }),
      lines: [t("until {date}", { date: `${dd(v.getDate())}.${dd(v.getMonth() + 1)}.${String(v.getFullYear()).slice(2)}` }), t("certificate")],
      pct: Math.min(100, (Math.max(r.days, 0) / 90) * 100),
      tone: sev === "crit" ? "crit" : sev === "warn" ? "warn" : "neutral",
    });
  }
}
