// Живой тест коллектора против реального сервера (только чтение).
// Запуск: node scripts/live-test.mts <host> [keyPath] [units] [docker 0|1]
import { spawn } from "node:child_process";
import { homedir } from "node:os";

import { parseBlock, cpuPercent, ramPercent } from "../src/core/parse.ts";
import { COLLECTOR_SCRIPT } from "../src/core/script.ts";

const [host, keyPath, units = "-", docker = "0"] = process.argv.slice(2);
if (!host) {
  console.error("usage: node scripts/live-test.mts <host> [keyPath] [units] [docker]");
  process.exit(2);
}

const args = ["-T", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8"];
if (keyPath) args.push("-i", keyPath.replace(/^~/, homedir()), "-o", "IdentitiesOnly=yes");
args.push(host, "sh", "-s", "--", units, docker, "3");

const p = spawn("ssh", args, { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
p.stdin.write(`${COLLECTOR_SCRIPT}\n`);

let buf = "";
let block: string[] = [];
const snaps: NonNullable<ReturnType<typeof parseBlock>>[] = [];
const started = Date.now();

p.stdout.setEncoding("utf8");
p.stdout.on("data", (d: string) => {
  buf += d;
  let i: number;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).replace(/\r$/, "");
    buf = buf.slice(i + 1);
    if (line === "@end") {
      const s = parseBlock(block);
      block = [];
      if (s) snaps.push(s);
      if (snaps.length === 3) finish();
    } else block.push(line);
  }
});
p.stderr.on("data", (d) => console.error("stderr:", String(d).trim()));
setTimeout(() => {
  console.error("TIMEOUT: получено блоков:", snaps.length);
  finish(1);
}, 25000);

function finish(code = 0): void {
  p.kill();
  const [a, b, c] = snaps;
  if (c) {
    console.log("host      :", c.hostname);
    console.log("cpu %     :", cpuPercent(b.cpuLine, c.cpuLine)?.toFixed(1));
    console.log("ram %     :", ramPercent(c).toFixed(1), `(${(c.memTotalKb / 1048576).toFixed(1)} ГБ)`);
    console.log("load/cores:", c.load.join(" "), "/", c.cores);
    console.log("uptime d  :", (c.uptimeSec / 86400).toFixed(1));
    console.log("disks     :", c.disks.filter((d) => !d.mount.startsWith("/snap")).map((d) => `${d.mount} ${Math.round((d.usedKb / d.totalKb) * 100)}%`).join(", "));
    console.log("net ifaces:", c.net.map((n) => n.iface).join(", "));
    console.log("failed    :", c.failedUnits);
    console.log("units     :", JSON.stringify(c.units));
    console.log("docker    :", c.docker === null ? "нет" : c.docker.map((d) => `${d.name}=${d.state}`).join(", ") || "пусто");
    console.log("reboot req:", c.rebootRequired);
    console.log("блоков за", ((Date.now() - started) / 1000).toFixed(1), "с, интервал ts:", c.ts - b.ts, "с");
    void a;
  }
  process.exit(code);
}
