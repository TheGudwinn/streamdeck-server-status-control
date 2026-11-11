import { execFile } from "node:child_process";

import { sshBaseArgs, type HostRef } from "./hosts";

export type ExecResult = { ok: boolean; code: number; out: string; ms: number; timedOut: boolean };

/** Одна команда на сервере по SSH с кодом возврата и временем. Команду формирует вызывающий код. */
export function execRemote(ref: HostRef, command: string, timeoutMs: number): Promise<ExecResult> {
  const started = performance.now();
  return new Promise((resolve) => {
    execFile(
      "ssh",
      [...sshBaseArgs(ref), command],
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 256 * 1024 },
      (err, stdout, stderr) => {
        const out = `${stdout}${stderr}`.trim();
        const e = err as (Error & { code?: number | string; killed?: boolean }) | null;
        const timedOut = !!e?.killed;
        const code = !e ? 0 : timedOut ? 124 : typeof e.code === "number" ? e.code : 1;
        resolve({ ok: !e, code, out, ms: Math.round(performance.now() - started), timedOut });
      },
    );
  });
}
