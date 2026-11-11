// Живой тест кнопок управления против реального сервера. Выполняет ТОЛЬКО безопасные команды.
// Запуск: node scripts/live-exec.mts <host> [keyPath]
import { execFile } from "node:child_process";
import { homedir } from "node:os";

import { buildCommand, lastLine, wrapRoot } from "../src/core/commands.ts";

const [host, keyPath] = process.argv.slice(2);
if (!host) {
  console.error("usage: node scripts/live-exec.mts <host> [keyPath]");
  process.exit(2);
}

const base = ["-T", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8"];
if (keyPath) base.push("-i", keyPath.replace(/^~/, homedir()), "-o", "IdentitiesOnly=yes");

function run(cmd: string, timeoutMs = 20000): Promise<{ code: number; out: string; ms: number; killed: boolean }> {
  const t0 = performance.now();
  return new Promise((resolve) => {
    execFile("ssh", [...base, host, cmd], { timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      const e = err as (Error & { code?: number | string; killed?: boolean }) | null;
      resolve({ code: !e ? 0 : e.killed ? 124 : typeof e.code === "number" ? e.code : 1, out: `${stdout}${stderr}`.trim(), ms: Math.round(performance.now() - t0), killed: !!e?.killed });
    });
  });
}

// Только чтение. nginxreload и freecache меняют состояние — их не запускаем.
for (const id of ["uptime", "disk", "topproc", "errors", "nginxtest", "dockerup"]) {
  const b = buildCommand(id, undefined, false);
  const r = await run(b?.cmd ?? "false");
  console.log(`${id.padEnd(10)} code=${r.code} ${String(r.ms).padStart(5)}мс  ->  ${lastLine(r.out)}`);
}

const q = await run(wrapRoot("echo quoted-ok 'with quote'"));
console.log(`wrapRoot   code=${q.code}  ->  ${lastLine(q.out)}`);

const bad = await run("exit 3");
console.log(`exit 3     code=${bad.code}`);

const slow = await run("sleep 10", 3000);
console.log(`timeout    code=${slow.code} killed=${slow.killed} ${slow.ms}мс`);
