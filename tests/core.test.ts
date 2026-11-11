import assert from "node:assert/strict";
import { test } from "node:test";

import { AlertStore } from "../src/core/alerts.ts";
import { cpuPercent, netTotals, parseBlock, ramPercent } from "../src/core/parse.ts";
import { parseSshConfig } from "../src/core/sshconfig.ts";

const BLOCK = [
  "@ts 1730000000",
  "@host vps1",
  "@cpu cpu  100 0 50 800 50 0 0 0 0 0",
  "@mem MemTotal:        8000000 kB",
  "@mem MemAvailable:    2000000 kB",
  "@mem SwapTotal:       1000000 kB",
  "@mem SwapFree:        1000000 kB",
  "@load 0.50 0.40 0.30",
  "@up 90061.5",
  "@cores 4",
  "@df / 100000000 40000000",
  "@df /boot 500000 100000",
  "@ino / 1000 100",
  "@net lo 5000 5000",
  "@net eth0 1000 2000",
  "@net docker0 700 700",
  "@failed 1",
  "@unit nginx.service active",
  "@unit pm2-app.service failed",
  "@dkok 1",
  "@dk web|running|Up 3 days",
  "@dk db|exited|Exited (0) 2 hours ago",
  "@reboot 1",
];

test("parseBlock: полный блок", () => {
  const s = parseBlock(BLOCK, 123);
  assert.ok(s);
  assert.equal(s.hostname, "vps1");
  assert.equal(s.memTotalKb, 8000000);
  assert.equal(Math.round(ramPercent(s)), 75);
  assert.deepEqual(s.load, [0.5, 0.4, 0.3]);
  assert.equal(s.cores, 4);
  assert.equal(s.disks.length, 2);
  assert.equal(s.disks[0].mount, "/");
  assert.equal(s.inodes[0].used, 100);
  assert.equal(s.failedUnits, 1);
  assert.equal(s.units["nginx.service"], "active");
  assert.equal(s.units["pm2-app.service"], "failed");
  assert.equal(s.docker?.length, 2);
  assert.equal(s.docker?.[1].status, "Exited (0) 2 hours ago");
  assert.equal(s.rebootRequired, true);
});

test("parseBlock: без docker -> null, битый блок -> null", () => {
  const s = parseBlock(BLOCK.filter((l) => !l.startsWith("@dk")), 1);
  assert.equal(s?.docker, null);
  assert.equal(parseBlock(["@ts 1"]), null);
});

test("netTotals игнорирует lo и docker*", () => {
  const s = parseBlock(BLOCK, 1);
  assert.ok(s);
  assert.deepEqual(netTotals(s), { rx: 1000, tx: 2000 });
});

test("cpuPercent считает дельту", () => {
  const a = "cpu  100 0 50 800 50 0 0 0 0 0"; // total 1000, idle 850
  const b = "cpu  150 0 70 880 60 0 0 0 0 0"; // total 1160, idle 940
  const v = cpuPercent(a, b);
  assert.ok(v !== null);
  assert.equal(Math.round(v), 44); // (1 - 90/160) = 43.75
  assert.equal(cpuPercent(a, a), null);
});

test("AlertStore: дребезг, принятие, повышение серьёзности", () => {
  const st = new AlertStore();
  st.report("k", "cpu 90%", "warn", { after: 2 });
  assert.equal(st.list().length, 0); // ещё рано
  st.report("k", "cpu 90%", "warn", { after: 2 });
  assert.equal(st.list().length, 1);
  assert.equal(st.unacked().length, 1);

  assert.equal(st.ackAll(), 1);
  assert.equal(st.unacked().length, 0);

  st.report("k", "cpu 99%", "crit", { after: 2 }); // эскалация снимает «принято»
  assert.equal(st.unacked().length, 1);
  assert.equal(st.list()[0].severity, "crit");

  st.report("k", "", null);
  assert.equal(st.list().length, 0);
});

test("AlertStore: clearPrefix и сортировка (crit первыми)", () => {
  const st = new AlertStore();
  st.report("h|a", "a", "warn", { after: 1 });
  st.report("h|b", "b", "crit", { after: 1 });
  st.report("x|c", "c", "warn", { after: 1 });
  assert.deepEqual(st.list().map((a) => a.key), ["h|b", "h|a", "x|c"]);
  st.clearPrefix("h|");
  assert.deepEqual(st.list().map((a) => a.key), ["x|c"]);
});

test("parseSshConfig", () => {
  const hosts = parseSshConfig(`
# комментарий
Host *
  ServerAliveInterval 30

Host vps prod
  HostName 10.0.0.5
  User root
  Port 2222
  IdentityFile ~/.ssh/key1
  IdentityFile ~/.ssh/key2

Host *.internal !bad
  User x

Host=eq
  HostName=eq.example.com
`);
  assert.deepEqual(hosts.map((h) => h.alias), ["vps", "prod", "eq"]);
  assert.equal(hosts[0].hostName, "10.0.0.5");
  assert.equal(hosts[0].port, 2222);
  assert.equal(hosts[0].identityFile, "~/.ssh/key1");
  assert.equal(hosts[2].hostName, "eq.example.com");
});

test("wrap: перенос по дефису, домен не рвётся по точке", async () => {
  const { wrap, longestPart } = await import("../src/theme.ts");
  assert.deepEqual(wrap("guddion-backend", 9, 2), ["guddion-", "backend"]);
  assert.deepEqual(wrap("guddion.ru", 11, 2), ["guddion.ru"]);
  assert.deepEqual(wrap("VPS: диск / 96%", 9, 2), ["VPS: диск", "/ 96%"]);
  const cut = wrap("очень-длинное-название-службы-сервера", 9, 2);
  assert.equal(cut.length, 2);
  assert.ok(cut[1].endsWith("…"));
  assert.equal(longestPart("guddion-backend"), 8);
});

test("i18n: подстановки и язык", async () => {
  const { t, setLang, getLang } = await import("../src/i18n.ts");
  setLang("en");
  assert.equal(t("{ms} ms", { ms: 42 }), "42 ms");
  setLang("ru");
  assert.equal(getLang(), "ru");
  assert.equal(t("{ms} ms", { ms: 42 }), "42 мс");
  assert.equal(t("Нет такого ключа"), "Нет такого ключа"); // неизвестный ключ возвращается как есть
  setLang("en");
});

test("i18n: у каждой фразы t(\"...\") в коде есть русский перевод, плейсхолдеры совпадают", async () => {
  const { readdirSync, readFileSync } = await import("node:fs");
  const { RU } = await import("../src/i18n.ts");
  const files = (readdirSync("src", { recursive: true }) as string[]).filter((f) => f.endsWith(".ts") && !f.endsWith("i18n.ts"));
  const used = new Set<string>();
  for (const f of files) {
    for (const m of readFileSync(`src/${f}`, "utf8").matchAll(/\bt\(\s*"([^"]+)"/g)) used.add(m[1]);
  }
  assert.ok(used.size > 20, `найдено фраз: ${used.size}`);
  const missing = [...used].filter((k) => !(k in RU));
  assert.deepEqual(missing, [], `нет перевода: ${missing.join(" | ")}`);
  const ph = (s: string): string => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
  for (const [en, ru] of Object.entries(RU)) assert.equal(ph(ru), ph(en), `плейсхолдеры: ${en}`);
});

test("hbar: сплошная шкала без делений", async () => {
  const { hbar } = await import("../src/theme.ts");
  assert.equal((hbar(0, 0, 100, 6, 50, "#fff").match(/<rect/g) ?? []).length, 2); // дорожка + заливка
  assert.equal((hbar(0, 0, 100, 6, 0, "#fff").match(/<rect/g) ?? []).length, 1); // пустая — только дорожка
});

test("decide: способы подтверждения", async () => {
  const { decide } = await import("../src/core/commands.ts");
  const now = 1000;
  assert.equal(decide("none", null, 0, 1000, now), "run");
  assert.equal(decide("hold", null, 200, 1000, now), "hint");
  assert.equal(decide("hold", null, 1200, 1000, now), "run");
  assert.equal(decide("twice", null, 50, 1000, now), "arm");
  assert.equal(decide("twice", now + 3000, 50, 1000, now), "run"); // взведено
  assert.equal(decide("twice", now - 1, 50, 1000, now), "arm"); // взвод истёк
  assert.equal(decide("holdTwice", null, 200, 1500, now), "hint");
  assert.equal(decide("holdTwice", null, 1600, 1500, now), "arm");
  assert.equal(decide("holdTwice", now + 3000, 10, 1500, now), "run");
});

test("команды: sudo-обёртка, экранирование, пресеты", async () => {
  const { shellQuote, wrapRoot, buildCommand, lastLine, PRESETS } = await import("../src/core/commands.ts");
  assert.equal(shellQuote("it's"), String.raw`'it'\''s'`);
  assert.ok(wrapRoot("echo hi").includes("sudo -n sh -c 'echo hi'"));
  const own = buildCommand("custom", "  uptime  ", false);
  assert.equal(own?.cmd, "uptime");
  assert.equal(buildCommand("custom", "", false), null);
  assert.equal(buildCommand("custom", "x".repeat(2001), false), null);
  const reload = buildCommand("nginxreload", "ignored", false);
  assert.ok(reload?.cmd.startsWith("if [ "), "пресет с root обёрнут в sudo");
  assert.equal(reload?.presetName, "nginx reload");
  assert.equal(lastLine("a\n\n\x1b[32mdone\x1b[0m\n"), "done");
  assert.equal(lastLine("x".repeat(100), 10), "xxxxxxxxx…");
  assert.ok(Object.keys(PRESETS).length >= 8);
});

test("защита: опасные команды ловятся, обычные нет", async () => {
  const { dangerOf } = await import("../src/core/commands.ts");
  for (const bad of ["rm -rf /", "rm -rf /*", "sudo rm -rf ~", "mkfs.ext4 /dev/sda1", "dd if=/dev/zero of=/dev/sda", "echo x > /dev/sda", "reboot", "systemctl poweroff", ":(){ :|:& };:", "init 6", "chmod -R 777 /"]) {
    assert.ok(dangerOf(bad), `должна быть опасной: ${bad}`);
  }
  for (const ok of ["uptime", "df -h /", "rm /tmp/file.txt", "rm -rf /tmp/build", "systemctl restart nginx", "docker ps -q | wc -l", "journalctl -p err --since '10 min ago'"]) {
    assert.equal(dangerOf(ok), null, `не должна быть опасной: ${ok}`);
  }
});

test("i18n: названия пресетов переведены", async () => {
  const { PRESETS } = await import("../src/core/commands.ts");
  const { RU } = await import("../src/i18n.ts");
  const missing = Object.values(PRESETS).map((p) => p.name).filter((n) => !(n in RU));
  assert.deepEqual(missing, []);
});
