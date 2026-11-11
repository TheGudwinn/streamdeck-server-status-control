import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type SshHost = {
  alias: string;
  hostName?: string;
  user?: string;
  port?: number;
  identityFile?: string;
};

/** Разбирает текст ~/.ssh/config: берёт именованные Host (без масок * ? !). */
export function parseSshConfig(text: string): SshHost[] {
  const hosts: SshHost[] = [];
  let current: SshHost[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(\S+?)(?:\s*=\s*|\s+)(.+)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim().replace(/^"(.*)"$/, "$1");

    if (key === "host") {
      current = val
        .split(/\s+/)
        .filter((a) => a && !/[*?!]/.test(a))
        .map((alias) => {
          const h: SshHost = { alias };
          hosts.push(h);
          return h;
        });
    } else if (key === "match") {
      current = [];
    } else {
      for (const h of current) {
        if (key === "hostname") h.hostName = val;
        else if (key === "user") h.user = val;
        else if (key === "port") h.port = Number(val) || undefined;
        else if (key === "identityfile" && !h.identityFile) h.identityFile = val;
      }
    }
  }
  return hosts;
}

export function loadSshHosts(): SshHost[] {
  try {
    const file = join(homedir(), ".ssh", "config");
    if (!existsSync(file)) return [];
    return parseSshConfig(readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

export function expandHome(p: string): string {
  return p.replace(/^~(?=$|[\\/])/, homedir());
}

/** Адрес и порт для прямых проверок (TCP, пинг) по алиасу из ssh config или user@host. */
export function resolveEndpoint(host: string, hosts: SshHost[] = loadSshHosts()): { hostname: string; port: number } {
  const h = hosts.find((x) => x.alias === host);
  if (h) return { hostname: h.hostName ?? h.alias, port: h.port ?? 22 };
  const at = host.lastIndexOf("@");
  return { hostname: at >= 0 ? host.slice(at + 1) : host, port: 22 };
}
