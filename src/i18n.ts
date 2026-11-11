/**
 * Минимальная локализация плиток и тревог. Ключ — английская фраза (она же текст по умолчанию),
 * значения других языков — в таблицах ниже. Подстановки: {name}, {n} и т.п.
 * Манифест Stream Deck русский не поддерживает, поэтому язык выбирается в настройках плагина (`language`).
 */
export type Lang = "en" | "ru";

export const LANGS: readonly Lang[] = ["en", "ru"];

let current: Lang = "en";

/** Возвращает true, если язык действительно сменился. */
export function setLang(value: unknown): boolean {
  const next: Lang = value === "ru" ? "ru" : "en";
  const changed = next !== current;
  current = next;
  return changed;
}

export const getLang = (): Lang => current;

/** Язык системы: русская локаль -> ru, иначе en. Используется как значение по умолчанию при первом запуске. */
export function systemLang(): Lang {
  try {
    return /^ru\b/i.test(Intl.DateTimeFormat().resolvedOptions().locale) ? "ru" : "en";
  } catch {
    return "en";
  }
}

export const RU: Record<string, string> = {
  // состояния и подсказки на плитках
  "Select a host": "Выберите хост",
  "No data": "Нет данных",
  Connecting: "Подключение",
  "Container name": "Имя контейнера",
  "No Docker": "Нет Docker",
  "Not found": "Не найден",
  "Enter URL": "Укажите URL",
  "Enter service": "Укажите службу",
  "Enter domain": "Укажите домен",
  "Host and port": "Хост и порт",
  "No TLS": "Нет TLS",
  Site: "Сайт",
  none: "нет",
  nothing: "нечего",
  "not found": "не найден",
  Alerts: "Тревог",
  Acknowledge: "Принять",
  // кнопки управления
  "Hold {n} s": "Держите {n} с",
  "Press again": "Нажмите ещё раз",
  "Enter command": "Укажите команду",
  Blocked: "Заблокировано",
  Sent: "Отправлено",
  Uptime: "Аптайм",
  "Disk usage": "Диск",
  "Top process": "Топ процесс",
  "Errors, 10 min": "Ошибки, 10 мин",
  "nginx test": "Проверка nginx",
  "nginx reload": "Перезагрузка nginx",
  "Docker running": "Docker запущено",
  "Free cache": "Очистка кэша",
  // метрики
  Disk: "Диск",
  Network: "Сеть",
  "5m {v}": "5м {v}",
  "{n} cores": "{n} ядер",
  "reboot needed": "нужен reboot",
  running: "работает",
  certificate: "сертификат",
  "until {date}": "до {date}",
  // единицы
  "{ms} ms": "{ms} мс",
  "{days} d": "{days} д",
  "{n} pcs": "{n} шт",
  GB: "ГБ",
  B: "Б",
  KB: "КБ",
  MB: "МБ",
  TB: "ТБ",
  "{v}/s": "{v}/с",
  "{n} d": "{n} д",
  "{n} h": "{n} ч",
  "{n} min": "{n} м",
  // тревоги
  "{name}: offline": "{name}: нет связи",
  "{name}: disk {mount} {p}%": "{name}: диск {mount} {p}%",
  "{name}: {n} failed services": "{name}: упало служб {n}",
  "{name}: unreachable": "{name}: недоступен",
  "{name}: port closed": "{name}: порт закрыт",
  "{name}: container not found": "{name}: контейнер не найден",
  "{name}: TLS unavailable": "{name}: TLS недоступен",
  "{name}: TLS {days} d.": "{name}: TLS {days} дн.",
};

/** Перевод с подстановками. Неизвестная фраза возвращается как есть (английский). */
export function t(en: string, vars?: Record<string, string | number>): string {
  let s = current === "ru" ? (RU[en] ?? en) : en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
