import { expandHome, loadSshHosts } from "./sshconfig";

export type HostRef = { host: string; keyPath?: string };

export type HostSettings = {
  host?: string;
  hostManual?: string;
  keyPath?: string;
};

const HOST_RE = /^[A-Za-z0-9_][A-Za-z0-9._@-]*$/;
export const validHost = (h: string): boolean => HOST_RE.test(h) && h.length <= 253;

/** Хост из настроек кнопки: ручной адрес важнее выбранного алиаса. */
export function refOf(s: HostSettings): HostRef | null {
  const host = (s.hostManual ?? "").trim() || (s.host ?? "").trim();
  if (!host || !validHost(host)) return null;
  const key = (s.keyPath ?? "").trim();
  return key ? { host, keyPath: key } : { host };
}

export const hostKey = (r: HostRef): string => `${r.host}|${r.keyPath ?? ""}`;

export function sshBaseArgs(ref: HostRef): string[] {
  const a = [
    "-T",
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=8",
    "-o", "ServerAliveInterval=10",
    "-o", "ServerAliveCountMax=2",
  ];
  if (ref.keyPath) a.push("-i", expandHome(ref.keyPath), "-o", "IdentitiesOnly=yes");
  a.push(ref.host);
  return a;
}

/** Данные для выпадающего списка в Property Inspector. */
export function hostItems(): { label: string; value: string }[] {
  return loadSshHosts().map((h) => ({
    label: h.hostName && h.hostName !== h.alias ? `${h.alias} (${h.hostName})` : h.alias,
    value: h.alias,
  }));
}

export const isUnitName = (s: string): boolean => /^[A-Za-z0-9@._:-]{1,120}$/.test(s);
export const isContainerName = (s: string): boolean => /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(s);
