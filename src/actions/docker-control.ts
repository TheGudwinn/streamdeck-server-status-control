import { action } from "@elgato/streamdeck";

import { asConfirm } from "../core/commands";
import { isContainerName, type HostSettings } from "../core/hosts";
import { t } from "../i18n";
import type { IconName } from "../theme";
import { ControlBase, errorPlan, type Plan } from "./control";

type Op = "restart" | "start" | "stop";

type Settings = HostSettings & { label?: string; container?: string; op?: Op; confirm?: string };

const OPS: Record<Op, { verb: string; icon: IconName }> = {
  restart: { verb: "Restart", icon: "restart" },
  start: { verb: "Start", icon: "play" },
  stop: { verb: "Stop", icon: "stop" },
};

/** Управление Docker-контейнером: restart / start / stop. Подходит и для мультидействий. */
@action({ UUID: "com.guddion.server-status.dockerctl" })
export class DockerControl extends ControlBase<Settings> {
  protected plan(s: Settings): Plan {
    const name = (s.container ?? "").trim();
    if (!isContainerName(name)) return errorPlan(t("Container name"), "layers");

    const op: Op = s.op && s.op in OPS ? s.op : "restart";
    const { verb, icon } = OPS[op];
    return {
      title: (s.label ?? "").trim() || name,
      verb,
      icon,
      cmd: `docker ${op} ${name} 2>&1 || sudo -n docker ${op} ${name} 2>&1`,
      mode: asConfirm(s.confirm, "hold"),
      holdMs: 1000,
      timeoutMs: 60000,
      showOutput: false,
    };
  }
}
