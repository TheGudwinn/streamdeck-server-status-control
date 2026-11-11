import { action, type KeyAction } from "@elgato/streamdeck";

import { alerts } from "../core/alerts";
import { httpCheck } from "../core/checks";
import { statusTile } from "../render";
import { KeyBase } from "./base";
import { t } from "../i18n";

type Settings = {
  url?: string;
  label?: string;
  keyword?: string;
  intervalSec?: string | number;
  timeoutMs?: string | number;
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** Проверка сайта по HTTP: код, время ответа, при необходимости ключевое слово в ответе. */
@action({ UUID: "com.guddion.server-status.check" })
export class HttpCheck extends KeyBase<Settings> {
  protected tickMs(s: Settings): number {
    return Math.max(5, Number(s.intervalSec) || 30) * 1000;
  }

  protected override onDetach(id: string): void {
    alerts.clearPrefix(`check:${id}`);
  }

  protected async render(act: KeyAction<Settings>, s: Settings): Promise<string> {
    const url = (s.url ?? "").trim();
    if (!url) return statusTile({ icon: "globe", tone: "idle", lines: [{ text: t("Enter URL") }] });

    const name = (s.label ?? "").trim() || hostOf(url) || t("Site");
    const r = await httpCheck(url, Number(s.timeoutMs) || 5000, (s.keyword ?? "").trim() || undefined);

    if (r.up) {
      alerts.report(`check:${act.id}`, "", null);
      return statusTile({ icon: "check", tone: "up", meta: t("{ms} ms", { ms: r.ms ?? 0 }), lines: [{ text: name }, { text: "Online", accent: true }] });
    }
    const why = r.code ? String(r.code) : (r.error ?? "");
    alerts.report(`check:${act.id}`, `${t("{name}: unreachable", { name })}${why ? ` (${why})` : ""}`, "crit", { after: 2 });
    return statusTile({ icon: "x", tone: "crit", meta: why, lines: [{ text: name }, { text: "Down", accent: true }] });
  }
}
