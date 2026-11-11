// Демонстрационные плитки для материалов (листинг, баннер, карточки). r — модуль render плагина.
export function makeTiles(r) {
  const hist = (base, amp) => Array.from({ length: 40 }, (_, i) => Math.max(1, base + Math.sin(i / 3) * amp + (i % 5)));

  // Названия и значения — демонстрационные.
  return {
    overview: r.sliderTile({ label: "VPS", rows: [{ name: "CPU", value: "7%", pct: 7 }, { name: "RAM", value: "42%", pct: 42 }], footer: "3.3/7.8 GB" }),
    overviewWarn: r.sliderTile({ label: "VPS", rows: [{ name: "CPU", value: "88%", pct: 88, tone: "warn" }, { name: "RAM", value: "91%", pct: 91, tone: "crit" }], footer: "7.1/7.8 GB", tone: "crit" }),
    cpu: r.gaugeTile({ label: "CPU", big: "61%", lines: ["load 0.19", "VPS"], pct: 61 }),
    ram: r.gaugeTile({ label: "RAM", big: "42%", lines: ["3.3/7.8 GB", "VPS"], pct: 42 }),
    disk: r.gaugeTile({ label: "Disk", big: "64%", lines: ["75/119 GB", "VPS"], pct: 64 }),
    diskCrit: r.gaugeTile({ label: "Disk", big: "96%", lines: ["114/119 GB", "VPS"], pct: 96, tone: "crit" }),
    net: r.gaugeTile({ label: "Network", big: "1.2 MB", lines: ["↑ 310 KB/s"], history: hist(30, 20) }),
    ping: r.gaugeTile({ label: "Ping", big: "42 ms", lines: ["example.com:22"], history: hist(40, 12) }),
    tls: r.gaugeTile({ label: "example.com", big: "23 d", lines: ["until 03.12.26", "certificate"], pct: 25 }),
    tlsWarn: r.gaugeTile({ label: "example.com", big: "9 d", lines: ["until 20.11.26", "certificate"], pct: 10, tone: "warn" }),
    uptime: r.gaugeTile({ label: "Uptime", big: "24 d", lines: ["running", "vps-01"] }),
    httpOk: r.statusTile({ icon: "check", tone: "up", meta: "142 ms", lines: [{ text: "example.com" }, { text: "Online", accent: true }] }),
    httpDown: r.statusTile({ icon: "x", tone: "crit", meta: "503", lines: [{ text: "example.com" }, { text: "Down", accent: true }] }),
    tcp: r.statusTile({ icon: "check", tone: "up", meta: "38 ms", lines: [{ text: "db:5432" }, { text: "Open", accent: true }] }),
    unitOk: r.statusTile({ icon: "check", tone: "up", lines: [{ text: "nginx" }, { text: "Active", accent: true }] }),
    unitFail: r.statusTile({ icon: "x", tone: "crit", lines: [{ text: "api-backend" }, { text: "Failed", accent: true }] }),
    dockerOk: r.statusTile({ icon: "cube", tone: "up", lines: [{ text: "searxng" }, { text: "Running", accent: true }] }),
    dockerBad: r.statusTile({ icon: "cube", tone: "crit", lines: [{ text: "whisper-worker" }, { text: "Exited", accent: true }] }),
    alert: r.statusTile({ icon: "bell", tone: "crit", meta: "1/2", lines: [{ text: "VPS: disk / 96%", maxLines: 3 }] }),
    alertOk: r.statusTile({ icon: "check", tone: "up", lines: [{ text: "Alerts" }, { text: "none", accent: true }] }),
    runIdle: r.statusTile({ icon: "terminal", tone: "neutral", lines: [{ text: "Disk usage" }, { text: "Run", accent: true }] }),
    runDone: r.statusTile({ icon: "check", tone: "up", meta: "1.4s", lines: [{ text: "75G/119G" }, { text: "OK", accent: true }] }),
    svcRestart: r.statusTile({ icon: "restart", tone: "neutral", lines: [{ text: "nginx" }, { text: "Restart", accent: true }] }),
    hold: r.statusTile({ icon: "restart", tone: "idle", lines: [{ text: "nginx" }, { text: "Hold 1 s", accent: true }] }),
    armed: r.statusTile({ icon: "alert", tone: "warn", meta: "4s", lines: [{ text: "vps-01" }, { text: "Press again", accent: true }] }),
    power: r.statusTile({ icon: "power", tone: "neutral", lines: [{ text: "vps-01" }, { text: "Reboot", accent: true }] }),
    dockerRestart: r.statusTile({ icon: "layers", tone: "neutral", lines: [{ text: "searxng" }, { text: "Restart", accent: true }] }),
    running: r.statusTile({ icon: "restart", tone: "warn", lines: [{ text: "Disk usage" }, { text: "Running…", accent: true }] }),
  };
}
