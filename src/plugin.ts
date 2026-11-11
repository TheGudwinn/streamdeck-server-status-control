import streamDeck from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";

import { Acknowledge } from "./actions/acknowledge";
import { AlertHub } from "./actions/alert-hub";
import { repaintAll } from "./actions/base";
import { DockerContainer } from "./actions/docker-container";
import { DockerControl } from "./actions/docker-control";
import { HostOverview } from "./actions/host-overview";
import { HttpCheck } from "./actions/http-check";
import { Latency } from "./actions/latency";
import { Metric } from "./actions/metric";
import { Power } from "./actions/power";
import { RunCommand } from "./actions/run-command";
import { ServiceControl } from "./actions/service-control";
import { SystemdUnit } from "./actions/systemd-unit";
import { TcpCheck } from "./actions/tcp-check";
import { TlsExpiry } from "./actions/tls-expiry";
import { setLang, systemLang } from "./i18n";
import { setTheme } from "./render";

streamDeck.logger.setLevel("info");

for (const a of [
  new HostOverview(),
  new Metric(),
  new Latency(),
  new HttpCheck(),
  new TcpCheck(),
  new TlsExpiry(),
  new SystemdUnit(),
  new DockerContainer(),
  new AlertHub(),
  new Acknowledge(),
  new RunCommand(),
  new Power(),
  new ServiceControl(),
  new DockerControl(),
]) {
  streamDeck.actions.registerAction(a);
}

/** Глобальные настройки: `theme` ("glass" | "mono") и `language` ("en" | "ru"); при смене перерисовываем все кнопки. */
const applyGlobals = (g: JsonObject): void => {
  const themeChanged = setTheme(g.theme);
  const langChanged = setLang(g.language);
  if (themeChanged || langChanged) repaintAll();
};

streamDeck.settings.onDidReceiveGlobalSettings((ev) => applyGlobals(ev.settings));

void streamDeck.connect().then(async () => {
  const g = await streamDeck.settings.getGlobalSettings();
  // Первый запуск: язык по умолчанию берём из локали системы и сохраняем, чтобы страницы настроек показывали то же самое.
  if (g.language !== "en" && g.language !== "ru") {
    g.language = systemLang();
    await streamDeck.settings.setGlobalSettings(g);
  }
  applyGlobals(g);
});
