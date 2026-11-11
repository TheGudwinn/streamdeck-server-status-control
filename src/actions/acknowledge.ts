import { action, type KeyAction } from "@elgato/streamdeck";

import { alerts } from "../core/alerts";
import { statusTile } from "../render";
import { KeyBase } from "./base";
import { t } from "../i18n";

type Settings = Record<string, never>;

/** Принять все активные тревоги (останавливает мигание общего ключа). */
@action({ UUID: "com.guddion.server-status.ack" })
export class Acknowledge extends KeyBase<Settings> {
  protected tickMs(): number {
    return 1000;
  }

  protected override async pressed(act: KeyAction<Settings>): Promise<void> {
    if (alerts.ackAll() > 0) await act.showOk();
    await this.refresh(act.id);
  }

  protected render(): string {
    const n = alerts.unacked().length;
    if (n === 0) return statusTile({ icon: "check", tone: "idle", lines: [{ text: t("Acknowledge") }, { text: t("nothing"), accent: true }] });
    return statusTile({ icon: "bell", tone: "warn", lines: [{ text: t("Acknowledge") }, { text: t("{n} pcs", { n }), accent: true }] });
  }
}
