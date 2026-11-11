/**
 * Скрипт-коллектор. Отправляется через stdin в `ssh host sh -s -- <units> <docker> <interval>`
 * и крутится на сервере в цикле. Ничего не устанавливается и не пишется на диск.
 * Только чтение: /proc, df, systemctl is-active, docker ps.
 * Каждый тик — блок строк "@тег значение", завершается "@end".
 */
export const COLLECTOR_SCRIPT = `
U="$1"; D="$2"; IV="$3"
case "$IV" in ''|*[!0-9]*) IV=5;; esac
while :; do
echo "@ts $(date +%s)"
echo "@host $(hostname)"
echo "@cpu $(head -1 /proc/stat)"
grep -E '^(MemTotal|MemAvailable|SwapTotal|SwapFree):' /proc/meminfo | sed 's/^/@mem /'
echo "@load $(cut -d' ' -f1-3 /proc/loadavg)"
echo "@up $(cut -d' ' -f1 /proc/uptime)"
echo "@cores $(nproc 2>/dev/null || echo 1)"
df -P -k 2>/dev/null | awk 'NR>1 && $1 ~ /^\\// {print "@df " $6 " " $2 " " $3}'
df -P -i 2>/dev/null | awk 'NR>1 && $1 ~ /^\\// {print "@ino " $6 " " $2 " " $3}'
tail -n +3 /proc/net/dev | sed 's/^ *//' | awk -F'[: ]+' '{print "@net " $1 " " $2 " " $10}'
echo "@failed $(systemctl --failed --no-legend 2>/dev/null | wc -l)"
if [ "$U" != "-" ]; then
for u in $(echo "$U" | tr ',' ' '); do echo "@unit $u $(systemctl is-active "$u" 2>/dev/null)"; done
fi
if [ "$D" = "1" ] && command -v docker >/dev/null 2>&1; then
out=$(docker ps -a --format '@dk {{.Names}}|{{.State}}|{{.Status}}' 2>/dev/null) && { echo "@dkok 1"; [ -n "$out" ] && echo "$out"; }
fi
[ -f /var/run/reboot-required ] && echo "@reboot 1"
echo "@end"
sleep "$IV"
done </dev/null
`;
