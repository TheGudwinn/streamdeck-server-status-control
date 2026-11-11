# Карточка в Elgato Marketplace — Server Status & Control

Всё ниже готово к копированию в Maker Console. Требования сверены с руководствами Elgato (ноябрь 2026): docs.elgato.com/guidelines/submissions и /guidelines/stream-deck/plugins.

## Поля формы

| Поле | Значение |
|---|---|
| Тип продукта | Stream Deck plugin |
| Файл | `dist/com.guddion.server-status.streamDeckPlugin` (105 КБ, версия 1.0.0.0) |
| Название (нельзя изменить после отправки) | **Server Status & Control** (23 символа) |
| Цена | **Free** (монетизацию в Maker Console потом изменить нельзя — только через maker@elgato.com) |
| Иконка приложения | `listing/app-icon-288.png` (288×288) |
| Обложка (thumbnail) | `listing/thumbnail.png` (1920×960) |
| Галерея | `listing/gallery-1.png` … `gallery-5.png` (1920×960, нужно 3–10) + видео-демо (см. ниже) |
| Поддерживаемые ОС | Windows 10+ (macOS не проверялся) |
| Ссылки (Additional links) | Support / Setup guide / Source: https://github.com/TheGudwinn/streamdeck-server-status-control (лицензия MIT) |

## Описание (английский, 250–1500 символов)

```text
Monitor and control your servers from Stream Deck. See CPU, RAM, disk, network and latency of any Linux server over SSH, check websites, ports and TLS certificates, watch systemd services and Docker containers, and get alerts when something breaks.

Control them too: run commands and ready-made presets, restart services and containers, reload nginx safely (the config is tested first), or reboot a server. Risky actions need a hold or a second press, dangerous commands are blocked by default, and every control action also works inside Stream Deck multi actions.

Nothing is installed on your server. The plugin uses the SSH client already on your computer and your ~/.ssh/config. No accounts, no API keys, no telemetry.

Includes 14 actions: Host Overview, Metric, Latency, HTTP Check, TCP Port, TLS Expiry, systemd Unit, Docker Container, Alert Hub, Acknowledge, Run Command, Power, Service Control, Docker Control. Two key styles (Glass and Mono), English and Russian.

Requirements: Windows 10 or later, Stream Deck 7.1 or later. Server monitoring and control need SSH key login to a Linux server (systemd and Docker features need systemd and Docker on the server). HTTP, TCP, Latency and TLS checks work without SSH.

AI disclosure: the plugin code, listing text and gallery images were created with the help of an AI assistant (Claude by Anthropic) under the author's direction and testing.
```

## Заметки к релизу (Release notes, обязательное поле)

```text
Initial release.
- 14 actions for monitoring and controlling Linux servers over SSH
- HTTP, TCP, TLS and latency checks that work without SSH
- Alert Hub with acknowledge, hold-to-confirm for risky actions, multi action support
- Glass and Mono styles, English and Russian
```

## Для ревьюера (вставить в заметки, если есть поле для комментария)

```text
Quick test without any server (no SSH needed): add "HTTP Check" with https://example.com, "TCP Port" with custom address example.com and port 443, "Latency" with custom address example.com and port 443, and "TLS Expiry" with domain example.com.
SSH features (Host Overview, Metric, systemd Unit, Docker Container, Run Command, Power, Service Control, Docker Control) need a Linux server with key-based SSH login. A demonstration video of these features on a real server is attached to the gallery.
The property inspector loads the official sdpi-components library from sdpi-components.dev, as in Elgato's samples. The plugin sends no data anywhere else.
```

## Видео-демо (рекомендуется, для плагинов с внешними сервисами оно обязательно)

MP4, 1920×1080 или меньше, до 250 MB. Сценарий на 60–90 секунд:

1. Перетащить Host Overview на кнопку, выбрать сервер из списка — на кнопке CPU/RAM.
2. Добавить Metric (диск), Latency, HTTP Check с вашим сайтом, systemd Unit (nginx), Docker Container.
3. Показать тревогу: остановить тестовую службу (или подставить заведомо несуществующую) — Alert Hub загорается, Acknowledge принимает.
4. Run Command с пресетом «Disk usage»: удержание, результат на кнопке.
5. Service Control: удержание — перезапуск тестовой службы; показать подсказку «Hold 1 s».
6. Power: удержание → «Press again» (не подтверждать).
7. Мультидействие: «Run Command → Service Control» одной кнопкой.
8. Переключить стиль Glass ↔ Mono и язык в настройках.

Не показывать на видео реальные IP-адреса, имена хостов, ключи и содержимое ~/.ssh.

## Соответствие требованиям Elgato

| Требование | Статус |
|---|---|
| UUID содержит автора и название, действия с префиксом плагина | да: `com.guddion.server-status[.…]` |
| Действий от 2 до 30, имена до ~30 символов, у всех есть подсказки | да: 14 |
| Категория совпадает с названием плагина, без имени автора | да: «Server Status & Control» |
| Иконка плагина 256 и 512 PNG | да |
| Иконки категории 28/56, действий 20 (SVG), белые, прозрачный фон | да |
| Иконки кнопок 72/144 (SVG) | да |
| Не больше 10 обновлений картинки в секунду | да: только при изменении, ~1 раз в секунду на кнопку |
| `showAlert` при ошибке действия | да (кнопки управления) |
| Настройки: чекбоксы для логики, списки для выбора, автосохранение, без кнопки «Сохранить», без донат-ссылок | да |
| Валидация полей | частично: обязательные поля помечены `required` |
| Ссылка на справку по настройке в настройках | да: «Help → Setup guide» ведёт на README репозитория |
| Название уникально | проверено поиском 11.11.2026: совпадений нет (есть «Server Watch» и игровые «… Server Status») |
| Раскрытие использования ИИ | в описании, см. ниже |
| Сбор данных | не собираются: политика конфиденциальности не требуется |

## Важное про ИИ

Elgato требует раскрывать использование ИИ и не принимает продукты, созданные **целиком** ИИ. Плагин написан с помощью ИИ-ассистента, но по вашему заданию, с вашими дизайн-решениями и проверкой на реальном сервере. Формулировка в описании это отражает; решение о том, насколько она точна для вас, — за вами.
