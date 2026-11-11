import { connect as netConnect } from "node:net";
import { connect as tlsConnect } from "node:tls";

export type HttpResult = { up: boolean; code?: number; ms?: number; error?: string };

/** GET по URL. 4xx — сервер жив, 5xx и сбои — недоступен. keyword — строка, которая должна быть в ответе. */
export async function httpCheck(url: string, timeoutMs: number, keyword?: string): Promise<HttpResult> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { up: false, error: "bad url" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { up: false, error: "bad url" };

  const started = performance.now();
  try {
    const res = await fetch(u, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
    let ok = res.status < 500;
    if (ok && keyword) ok = (await res.text()).includes(keyword);
    const ms = Math.round(performance.now() - started);
    return { up: ok, code: res.status, ms, error: ok ? undefined : keyword && res.status < 500 ? "no keyword" : undefined };
  } catch (e) {
    return { up: false, error: (e as Error).name === "TimeoutError" ? "timeout" : "no conn" };
  }
}

export type TcpResult = { up: boolean; ms?: number; error?: string };

export function tcpCheck(host: string, port: number, timeoutMs: number): Promise<TcpResult> {
  return new Promise((resolve) => {
    const started = performance.now();
    const sock = netConnect({ host, port });
    let done = false;
    const finish = (r: TcpResult): void => {
      if (done) return;
      done = true;
      sock.destroy();
      resolve(r);
    };
    sock.setTimeout(timeoutMs);
    sock.once("connect", () => finish({ up: true, ms: Math.round(performance.now() - started) }));
    sock.once("timeout", () => finish({ up: false, error: "timeout" }));
    sock.once("error", () => finish({ up: false, error: "refused" }));
  });
}

export type TlsResult = { ok: boolean; days?: number; validTo?: Date; error?: string };

/** Сколько дней осталось до окончания TLS-сертификата (проверка идёт без валидации цепочки). */
export function tlsDaysLeft(host: string, port: number, timeoutMs: number): Promise<TlsResult> {
  return new Promise((resolve) => {
    let done = false;
    const sock = tlsConnect({ host, port, servername: host, rejectUnauthorized: false, timeout: timeoutMs }, () => {
      const cert = sock.getPeerCertificate();
      if (!cert || !cert.valid_to) return finish({ ok: false, error: "no cert" });
      const validTo = new Date(cert.valid_to);
      finish({ ok: true, validTo, days: Math.floor((validTo.getTime() - Date.now()) / 86400000) });
    });
    const finish = (r: TlsResult): void => {
      if (done) return;
      done = true;
      sock.destroy();
      resolve(r);
    };
    sock.once("timeout", () => finish({ ok: false, error: "timeout" }));
    sock.once("error", () => finish({ ok: false, error: "no conn" }));
  });
}
