import { action } from "@elgato/streamdeck";

import { asConfirm, buildCommand, dangerOf, PRESETS } from "../core/commands";
import type { HostSettings } from "../core/hosts";
import { t } from "../i18n";
import { ellipsize } from "../theme";
import { ControlBase, errorPlan, type Plan } from "./control";

type Settings = HostSettings & {
  label?: string;
  preset?: string;
  command?: string;
  asRoot?: boolean;
  confirm?: string;
  timeoutSec?: string | number;
  allowDangerous?: boolean;
};

/** Выполнить команду на сервере: свою или из готовых пресетов. Результат (последняя строка) показывается на кнопке. */
@action({ UUID: "com.guddion.server-status.command" })
export class RunCommand extends ControlBase<Settings> {
  protected plan(s: Settings): Plan {
    const built = buildCommand(s.preset, s.command, !!s.asRoot);
    if (!built) return errorPlan(t("Enter command"), "terminal");

    if (!s.allowDangerous && dangerOf(built.raw)) return errorPlan(t("Blocked"), "alert");

    const first = built.raw.split(/\s+/)[0] ?? "";
    const preset = s.preset && s.preset !== "custom" ? PRESETS[s.preset] : undefined;
    const title = (s.label ?? "").trim() || (preset ? t(preset.name) : ellipsize(first, 14));
    const timeoutSec = Math.min(600, Math.max(1, Number(s.timeoutSec) || 30));
    return {
      title,
      verb: "Run",
      icon: "terminal",
      cmd: built.cmd,
      mode: asConfirm(s.confirm, "hold"),
      holdMs: 1000,
      timeoutMs: timeoutSec * 1000,
      showOutput: true,
    };
  }
}
