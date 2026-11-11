// Перевод страниц настроек: разметка английская, русские строки подставляются, когда в глобальной
// настройке «Language» выбран русский. Определяется опросом значения селектора (не зависит от API библиотеки).
(function () {
  var RU = {
    "Server": "Сервер",
    "Custom address": "Свой адрес",
    "SSH key": "SSH-ключ",
    "Display": "Показывать",
    "CPU only": "Только CPU",
    "RAM only": "Только RAM",
    "Label": "Подпись",
    "Style": "Стиль",
    "Glass": "Стекло",
    "Mono": "Моно",
    "Language": "Язык",
    "Metric": "Показатель",
    "Load average": "Load average",
    "Disk": "Диск",
    "Network (in)": "Сеть (вход)",
    "Disk mount": "Раздел диска",
    "Port": "Порт",
    "Keyword": "Слово в ответе",
    "Interval, s": "Интервал, с",
    "Timeout, ms": "Таймаут, мс",
    "Domain": "Домен",
    "Service": "Служба",
    "Container": "Контейнер",
    "Restart": "Перезапуск",
    "Allow by holding for 1 second": "Разрешить удержанием 1 секунду",
    "Preset": "Пресет",
    "Custom command": "Своя команда",
    "Uptime": "Аптайм",
    "Disk usage": "Диск",
    "Top process": "Топ процесс",
    "Errors, 10 min": "Ошибки, 10 мин",
    "nginx test": "Проверка nginx",
    "nginx reload": "Перезагрузка nginx",
    "Docker running": "Docker запущено",
    "Free cache": "Очистка кэша",
    "Command": "Команда",
    "Root": "Root",
    "Run as root (sudo)": "От root (sudo)",
    "Confirmation": "Подтверждение",
    "Hold 1 second": "Удержание 1 секунда",
    "Press twice": "Нажать дважды",
    "Press (no confirmation)": "Нажатие (без подтверждения)",
    "Timeout, s": "Таймаут, с",
    "Dangerous commands": "Опасные команды",
    "Allow (rm -rf /, mkfs, dd, reboot…)": "Разрешить (rm -rf /, mkfs, dd, reboot…)",
    "Operation": "Операция",
    "Reboot": "Перезагрузка",
    "Shutdown": "Выключение",
    "Start": "Запуск",
    "Stop": "Остановка",
    "Reload": "Перезагрузка конфигурации",
    "one-line shell command": "однострочная команда оболочки",
    "default: preset or command": "по умолчанию — пресет или команда",
    "default: host name": "по умолчанию — имя хоста",
    "Help": "Справка",
    "Setup guide": "Руководство по настройке",
    "Loading…": "Загрузка…",
    "from ~/.ssh/config": "из ~/.ssh/config",
    "user@host (if not in ssh config)": "user@host (если нет в ssh config)",
    "~/.ssh/key (if not in ssh config)": "~/.ssh/key (если нет в ssh config)",
    "default: domain": "по умолчанию — домен",
    "host or user@host": "host или user@host",
    "port from ssh config or 22": "порт из ssh config или 22",
    "default: address": "по умолчанию — адрес",
    "optional: text that must be on the page": "необязательно: текст, который должен быть на странице",
    "host (any address)": "host (любой адрес)",
    "e.g. 5432": "например 5432",
    "default: address:port": "по умолчанию — адрес:порт",
    "default: service name": "по умолчанию — имя службы",
    "container name from docker ps": "имя из docker ps",
    "default: container name": "по умолчанию — имя контейнера"
  };
  var ATTRS = ["label", "placeholder", "loading"];

  function pick(en, lang) {
    return lang === "ru" && RU[en] ? RU[en] : en;
  }

  function apply(lang) {
    var all = document.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      for (var j = 0; j < ATTRS.length; j++) {
        var a = ATTRS[j];
        if (!el.hasAttribute(a)) continue;
        var key = "data-en-" + a;
        if (!el.hasAttribute(key)) el.setAttribute(key, el.getAttribute(a));
        el.setAttribute(a, pick(el.getAttribute(key), lang));
      }
      if (el.hasAttribute("data-t")) {
        if (!el.hasAttribute("data-en")) el.setAttribute("data-en", el.textContent);
        el.textContent = pick(el.getAttribute("data-en"), lang);
      }
      if (el.tagName === "OPTION") {
        if (!el.hasAttribute("data-en")) el.setAttribute("data-en", el.textContent);
        el.textContent = pick(el.getAttribute("data-en"), lang);
      }
    }
  }

  function selected() {
    var sel = document.querySelector('sdpi-select[setting="language"]');
    var v = sel && (sel.value || sel.getAttribute("value"));
    return v === "ru" || v === "en" ? v : null;
  }

  var last = null;
  function tick() {
    var lang = selected() || last || (/^ru/i.test(navigator.language || "") ? "ru" : "en");
    if (lang !== last) {
      last = lang;
      apply(lang);
    }
  }

  document.addEventListener("DOMContentLoaded", tick);
  setInterval(tick, 400);
})();
