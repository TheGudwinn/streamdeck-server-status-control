import { action } from "@elgato/streamdeck";

import { wrapRoot } from "../core/commands";
import { refOf, type HostSettings } from "../core/hosts";
import { t } from "../i18n";
import { ControlBase, errorPlan, type Plan } from "./control";

type Settings = HostSettings & { label?: string; op?: "reboot" | "shutdown" };

/** Перезагрузка или выключение сервера. Защита: удержание 1,5 с, затем второе нажатие в течение 5 с. */
@action({ UUID: "com.guddion.server-status.power" })
export class Power extends ControlBase<Settings> {
  protected plan(s: Settings): Plan {
    const ref = refOf(s);
    if (!ref) return errorPlan(t("Select a host"), "power");

    const op = s.op === "shutdown" ? "shutdown" : "reboot";
    const unitCmd = op === "shutdown" ? "poweroff" : "reboot";
    // Команда уходит в фон: SSH-сессия закрывается чисто, а сервер перезагружается через 2 секунды.
    const cmd = wrapRoot(`nohup sh -c "sleep 2; systemctl ${unitCmd}" >/dev/null 2>&1 &`);
    return {
      title: (s.label ?? "").trim() || ref.host.split("@").pop() || ref.host,
      verb: op === "shutdown" ? "Shutdown" : "Reboot",
      icon: "power",
      cmd,
      mode: "holdTwice",
      holdMs: 1500,
      timeoutMs: 20000,
      showOutput: false,
      okWord: t("Sent"),
    };
  }
}
