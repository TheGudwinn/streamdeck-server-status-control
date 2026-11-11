import { action } from "@elgato/streamdeck";

import { asConfirm, wrapRoot } from "../core/commands";
import { isUnitName, type HostSettings } from "../core/hosts";
import { t } from "../i18n";
import type { IconName } from "../theme";
import { ControlBase, errorPlan, type Plan } from "./control";

type Op = "restart" | "start" | "stop" | "reload";

type Settings = HostSettings & { label?: string; unit?: string; op?: Op; confirm?: string };

const OPS: Record<Op, { verb: string; icon: IconName }> = {
  restart: { verb: "Restart", icon: "restart" },
  start: { verb: "Start", icon: "play" },
  stop: { verb: "Stop", icon: "stop" },
  reload: { verb: "Reload", icon: "restart" },
};

/** Управление службой systemd: restart / start / stop / reload. Подходит и для мультидействий. */
@action({ UUID: "com.guddion.server-status.service" })
export class ServiceControl extends ControlBase<Settings> {
  protected plan(s: Settings): Plan {
    const unit = (s.unit ?? "").trim();
    if (!isUnitName(unit)) return errorPlan(t("Enter service"), "restart");

    const op: Op = s.op && s.op in OPS ? s.op : "restart";
    const { verb, icon } = OPS[op];
    // Показываем итоговое состояние службы; is-active для остановленной службы возвращает ненулевой код — это не ошибка.
    const cmd = wrapRoot(`systemctl ${op} ${unit} && (systemctl is-active ${unit} || true)`);
    return {
      title: (s.label ?? "").trim() || unit.replace(/\.service$/, ""),
      verb,
      icon,
      cmd,
      mode: asConfirm(s.confirm, "hold"),
      holdMs: 1000,
      timeoutMs: 40000,
      showOutput: true,
    };
  }
}
