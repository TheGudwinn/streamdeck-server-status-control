import streamDeck, {
  SingletonAction,
  type DidReceiveSettingsEvent,
  type KeyAction,
  type KeyDownEvent,
  type KeyUpEvent,
  type SendToPluginEvent,
  type WillAppearEvent,
  type WillDisappearEvent,
} from "@elgato/streamdeck";
import type { JsonObject, JsonValue } from "@elgato/utils";

import { alerts } from "../core/alerts";
import { collectorOf, subscribe, unsubscribe, type HostCollector, type Needs } from "../core/collector";
import { hostItems, refOf, type HostRef, type HostSettings } from "../core/hosts";
import { statusTile } from "../render";
import { t } from "../i18n";

type Ctx<S extends JsonObject> = { act: KeyAction<S>; s: S; timer?: NodeJS.Timeout; last?: string; downAt?: number; busy?: boolean };

/** Общая механика кнопки: таймер перерисовки, замена картинки только при изменении, удержание, список хостов для настроек. */
const instances = new Set<{ repaint(): void }>();

/** Перерисовать все кнопки (например, после смены стиля). */
export function repaintAll(): void {
  for (const i of instances) i.repaint();
}

export abstract class KeyBase<S extends JsonObject> extends SingletonAction<S> {
  protected ctx = new Map<string, Ctx<S>>();

  constructor() {
    super();
    instances.add(this);
  }

  repaint(): void {
    for (const [id, c] of this.ctx) {
      c.last = undefined;
      void this.refresh(id);
    }
  }

  protected abstract tickMs(s: S): number;
  protected abstract render(act: KeyAction<S>, s: S): Promise<string> | string;
  protected onAttach(_act: KeyAction<S>, _s: S): void {}
  protected onDetach(_id: string): void {}

  /** Нажатие закончилось. По умолчанию — обновить кнопку сразу. */
  protected async pressed(act: KeyAction<S>, _s: S, _heldMs: number): Promise<void> {
    await this.refresh(act.id);
  }

  override async onWillAppear(ev: WillAppearEvent<S>): Promise<void> {
    if (ev.action.isKey()) this.attach(ev.action, ev.payload.settings);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<S>): Promise<void> {
    if (ev.action.isKey()) this.attach(ev.action, ev.payload.settings);
  }

  override async onWillDisappear(ev: WillDisappearEvent<S>): Promise<void> {
    this.detach(ev.action.id);
  }

  /** Нажатие внутри мультидействия: кнопки на экране нет, подтверждений нет — выполняем сразу. */
  protected async onMultiPress(_act: KeyAction<S>, _s: S): Promise<void> {}

  override async onKeyDown(ev: KeyDownEvent<S>): Promise<void> {
    if (ev.payload.isInMultiAction) {
      await this.onMultiPress(ev.action as KeyAction<S>, ev.payload.settings);
      return;
    }
    const c = this.ctx.get(ev.action.id);
    if (c) c.downAt = Date.now();
  }

  override async onKeyUp(ev: KeyUpEvent<S>): Promise<void> {
    const c = this.ctx.get(ev.action.id);
    if (!c) return;
    const held = c.downAt ? Date.now() - c.downAt : 0;
    c.downAt = undefined;
    await this.pressed(c.act, c.s, held);
  }

  override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, S>): Promise<void> {
    const p = ev.payload;
    if (p && typeof p === "object" && !Array.isArray(p) && p.event === "getHosts") {
      await streamDeck.ui.sendToPropertyInspector({ event: "getHosts", items: hostItems() });
    }
  }

  private attach(act: KeyAction<S>, s: S): void {
    this.detach(act.id);
    const c: Ctx<S> = { act, s };
    this.ctx.set(act.id, c);
    this.onAttach(act, s);
    void this.refresh(act.id);
    c.timer = setInterval(() => void this.refresh(act.id), Math.max(500, this.tickMs(s)));
  }

  private detach(id: string): void {
    const c = this.ctx.get(id);
    if (!c) return;
    clearInterval(c.timer);
    this.ctx.delete(id);
    this.onDetach(id);
  }

  protected async refresh(id: string): Promise<void> {
    const c = this.ctx.get(id);
    if (!c || c.busy) return;
    c.busy = true;
    try {
      await this.paint(c, await this.render(c.act, c.s));
    } catch (e) {
      streamDeck.logger.error(`render failed: ${(e as Error).message}`);
    } finally {
      c.busy = false;
    }
  }

  /** Блокирует плановую перерисовку на время операции (restart и т.п.). */
  protected async exclusive(id: string, fn: (show: (uri: string) => Promise<void>) => Promise<void>): Promise<void> {
    const c = this.ctx.get(id);
    if (!c) return;
    c.busy = true;
    try {
      await fn((uri) => this.paint(c, uri));
    } finally {
      c.busy = false;
    }
    c.last = undefined;
    await this.refresh(id);
  }

  private async paint(c: Ctx<S>, uri: string): Promise<void> {
    if (uri === c.last) return;
    c.last = uri;
    await c.act.setImage(uri);
  }
}

/** Кнопки, которым нужны данные хоста от коллектора. */
export abstract class HostKeyBase<S extends JsonObject & HostSettings & { label?: string }> extends KeyBase<S> {
  protected refs = new Map<string, HostRef>();
  protected needs(_s: S): { units: string[]; docker: boolean } {
    return { units: [], docker: false };
  }

  protected tickMs(): number {
    return 2000;
  }

  protected override onAttach(act: KeyAction<S>, s: S): void {
    const ref = refOf(s);
    if (!ref) return;
    this.refs.set(act.id, ref);
    const n: Needs = { ...this.needs(s), intervalSec: 5 };
    subscribe(ref, act.id, n);
  }

  protected override onDetach(id: string): void {
    const ref = this.refs.get(id);
    if (ref) unsubscribe(ref, id);
    this.refs.delete(id);
    alerts.clearPrefix(`check:${id}`);
  }

  protected displayName(s: S, ref: HostRef, fallback = ""): string {
    const l = (s.label ?? "").trim();
    return l || fallback || ref.host.split("@").pop() || ref.host;
  }

  protected render(act: KeyAction<S>, s: S): string {
    const ref = this.refs.get(act.id);
    if (!ref) return statusTile({ icon: "server", tone: "idle", lines: [{ text: t("Select a host") }] });
    const c = collectorOf(ref);
    if (!c) return statusTile({ icon: "plug", tone: "idle", lines: [{ text: t("No data") }] });
    return this.renderHost(act, s, c, ref);
  }

  protected abstract renderHost(act: KeyAction<S>, s: S, c: HostCollector, ref: HostRef): string;
}

/** Состояния «ещё нет данных» и «нет связи» — одинаковые для всех хост-кнопок. */
export function pendingTile(name: string, c: HostCollector): string | null {
  if (c.online) return null;
  if (!c.snap && c.status !== "offline") {
    return statusTile({ icon: "plug", tone: "idle", meta: "SSH", lines: [{ text: name }, { text: t("Connecting"), accent: true }] });
  }
  return statusTile({
    icon: "alert",
    tone: "crit",
    meta: "SSH",
    lines: [{ text: name }, { text: "Offline", accent: true }],
  });
}
