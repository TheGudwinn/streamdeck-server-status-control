import { action, type KeyAction } from "@elgato/streamdeck";

import { alerts } from "../core/alerts";
import { statusTile } from "../render";
import { KeyBase } from "./base";
import { t } from "../i18n";

type Settings = Record<string, never>;

/** Общий ключ тревог: число активных проблем; мигает, пока есть непринятые. Нажатие — следующая тревога. */
@action({ UUID: "com.guddion.server-status.alerts" })
export class AlertHub extends KeyBase<Settings> {
  private index = new Map<string, number>();

  protected tickMs(): number {
    return 1000;
  }

  protected override onDetach(id: string): void {
    this.index.delete(id);
  }

  protected override async pressed(act: KeyAction<Settings>): Promise<void> {
    this.index.set(act.id, (this.index.get(act.id) ?? 0) + 1);
    await this.refresh(act.id);
  }

  protected render(act: KeyAction<Settings>): string {
    const list = alerts.list();
    if (list.length === 0) {
      return statusTile({ icon: "check", tone: "up", lines: [{ text: t("Alerts") }, { text: t("none"), accent: true }] });
    }
    const i = (this.index.get(act.id) ?? 0) % list.length;
    const a = list[i];
    const blink = alerts.unacked().length > 0 && Math.floor(Date.now() / 1000) % 2 === 1;
    const tone = blink ? "neutral" : a.severity === "crit" ? "crit" : "warn";
    return statusTile({
      icon: "bell",
      tone,
      meta: list.length > 1 ? `${i + 1}/${list.length}` : undefined,
      lines: [{ text: a.label, maxLines: 3 }],
    });
  }
}
