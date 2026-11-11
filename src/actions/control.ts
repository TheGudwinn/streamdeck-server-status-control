import { type KeyAction } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";

import { decide, lastLine, type Confirm } from "../core/commands";
import { refOf, type HostRef, type HostSettings } from "../core/hosts";
import { execRemote } from "../core/remote";
import { t } from "../i18n";
import { statusTile } from "../render";
import type { IconName, Tone } from "../theme";
import { KeyBase } from "./base";

/** Что кнопка делает: команда, подпись, способ подтверждения. cmd = null — выполнять нечего (см. error). */
export type Plan = {
  title: string;
  verb: string;
  icon: IconName;
  cmd: string | null;
  error?: string;
  mode: Confirm;
  holdMs: number;
  timeoutMs: number;
  showOutput: boolean;
  okWord?: string;
  tone?: Tone;
};

export const errorPlan = (error: string, icon: IconName): Plan => ({
  title: "",
  verb: "",
  icon,
  cmd: null,
  error,
  mode: "hold",
  holdMs: 1000,
  timeoutMs: 0,
  showOutput: false,
});

type Phase =
  | { kind: "hint" | "armed"; until: number }
  | { kind: "running" }
  | { kind: "done"; until: number; ok: boolean; code: number; ms: number; out: string; timedOut: boolean };

const HINT_MS = 1500;
const ARM_MS = 5000;
const DONE_MS = 6000;

/**
 * Основа кнопок управления: подтверждение (удержание / двойное нажатие), выполнение по SSH, показ результата.
 * Внутри мультидействия команда выполняется сразу, без подтверждений (вы сами собрали цепочку).
 */
export abstract class ControlBase<S extends JsonObject & HostSettings & { label?: string }> extends KeyBase<S> {
  private phases = new Map<string, Phase>();

  protected abstract plan(s: S): Plan;

  protected tickMs(): number {
    return 1000;
  }

  protected override onDetach(id: string): void {
    this.phases.delete(id);
  }

  protected render(act: KeyAction<S>, s: S): string {
    const ref = refOf(s);
    if (!ref) return statusTile({ icon: "server", tone: "idle", lines: [{ text: t("Select a host") }] });
    const p = this.plan(s);
    if (p.error) return statusTile({ icon: p.icon, tone: "idle", lines: [{ text: p.error }] });

    const now = Date.now();
    let ph = this.phases.get(act.id);
    if (ph && ph.kind !== "running" && now >= ph.until) {
      this.phases.delete(act.id);
      ph = undefined;
    }
    if (!ph) {
      return statusTile({ icon: p.icon, tone: p.tone ?? "neutral", lines: [{ text: p.title }, { text: p.verb, accent: true }] });
    }
    switch (ph.kind) {
      case "hint": {
        const sec = p.holdMs / 1000;
        return statusTile({ icon: p.icon, tone: "idle", lines: [{ text: p.title }, { text: t("Hold {n} s", { n: sec % 1 ? sec.toFixed(1) : sec }), accent: true }] });
      }
      case "armed":
        return statusTile({
          icon: "alert",
          tone: "warn",
          meta: `${Math.max(1, Math.ceil((ph.until - now) / 1000))}s`,
          lines: [{ text: p.title }, { text: t("Press again"), accent: true }],
        });
      case "running":
        return statusTile({ icon: "restart", tone: "warn", lines: [{ text: p.title }, { text: "Running…", accent: true }] });
      case "done":
        if (ph.ok) {
          return statusTile({
            icon: "check",
            tone: "up",
            meta: `${(ph.ms / 1000).toFixed(1)}s`,
            lines: [{ text: p.showOutput && ph.out ? ph.out : p.title }, { text: p.okWord ?? "OK", accent: true }],
          });
        }
        return statusTile({
          icon: "x",
          tone: "crit",
          meta: ph.timedOut ? "timeout" : `exit ${ph.code}`,
          lines: [{ text: ph.out || p.title }, { text: "Failed", accent: true }],
        });
    }
  }

  protected override async pressed(act: KeyAction<S>, s: S, heldMs: number): Promise<void> {
    const ref = refOf(s);
    const p = this.plan(s);
    if (!ref || p.error || !p.cmd) {
      await this.refresh(act.id);
      return;
    }
    const cur = this.phases.get(act.id);
    if (cur?.kind === "running") return;

    const now = Date.now();
    const armedUntil = cur?.kind === "armed" ? cur.until : null;
    const d = decide(p.mode, armedUntil, heldMs, p.holdMs, now);
    if (d === "hint") {
      this.phases.set(act.id, { kind: "hint", until: now + HINT_MS });
      await this.refresh(act.id);
    } else if (d === "arm") {
      this.phases.set(act.id, { kind: "armed", until: now + ARM_MS });
      await this.refresh(act.id);
    } else {
      await this.execute(act, ref, p);
    }
  }

  private async execute(act: KeyAction<S>, ref: HostRef, p: Plan): Promise<void> {
    this.phases.set(act.id, { kind: "running" });
    await this.refresh(act.id);
    const r = await execRemote(ref, p.cmd ?? "", p.timeoutMs);
    this.phases.set(act.id, { kind: "done", until: Date.now() + DONE_MS, ok: r.ok, code: r.code, ms: r.ms, out: lastLine(r.out), timedOut: r.timedOut });
    if (r.ok) await act.showOk();
    else await act.showAlert();
    await this.refresh(act.id);
  }

  protected override async onMultiPress(act: KeyAction<S>, s: S): Promise<void> {
    const ref = refOf(s);
    const p = this.plan(s);
    if (!ref || p.error || !p.cmd) return;
    const r = await execRemote(ref, p.cmd, p.timeoutMs);
    try {
      if (r.ok) await act.showOk();
      else await act.showAlert();
    } catch {
      // внутри мультидействия индикация может быть недоступна
    }
  }
}
