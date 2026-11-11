# Промпты для баннера с маскотом

Цель: широкий баннер для README и страницы плагина с вашим маскотом (обезьянка в кепке с «G»). Сначала генерируется **начальный кадр**, затем из него **видео**.

## Что прикладывать к запросу

| Файл | Зачем |
|---|---|
| картинка маскота (`docs/assets/mascot.png`) | чтобы персонаж остался тем же |
| `docs/assets/cards/sheet-glass.png` | лист со всеми кнопками плагина: модель видит реальный стиль карточек |
| по желанию отдельные карточки из `docs/assets/cards/glass/`: `overview.png`, `cpu.png`, `httpOk.png`, `dockerOk.png`, `alert.png`, `runDone.png` | если нужно, чтобы именно они светились на «экранах» в сцене |

Все карточки в стиле «Моно» лежат рядом: `docs/assets/cards/mono/` и `sheet-mono.png`.

## 1. Начальный кадр (картинка)

```text
Use the first attached image as the character reference: the same monkey, face, black cap with the glowing "G", leaf necklace and curly tail. Do not redesign it. The other attached images are the real on-screen keys of the product: reuse their look, colors and style for the glowing keys in the scene.

Create a wide hero banner (16:9) for the README and product page of "Server Status & Control", a Stream Deck plugin that lets people monitor and control their servers from physical keys: status lights, alerts, restarts. The mascot is the friendly operator who looks after the servers. The idea should read instantly without any text.

Style: polished premium illustration that matches the character, dark graphite background with a soft teal-mint glow (#5eead4), calm tech atmosphere. Leave calm empty space on one side so a title can be placed over it later. No text, no logos except the "G" on the cap. This is the first frame of a short looping video, so keep the composition clean and stable, with the full character visible.
```

## 2. Видео из этого кадра

Загрузите готовый начальный кадр как первый кадр видео.

```text
Animate the attached first frame into a seamless 8-second loop for a README banner. The character stays identical and never morphs. Natural, friendly idle motion: blinking, a gentle tail sway, a small ear twitch, and a moment where the mascot presses one of the glowing keys. The indicator lights react: a green light turns amber and back to green, soft glow pulses. Very slow camera push-in of 2 to 3 percent. Same dark graphite and teal-mint palette, same lighting, 16:9, 24 fps, no text, no cuts, the last frame matches the first so it loops.
```

## 3. Что делать с результатом

1. Пришлите мне картинку и видео.
2. Я сделаю из видео облегчённый GIF/WebP (ffmpeg установлен), подключу в README вместо статичного баннера и положу поверх него заголовок.
3. Запасной баннер `docs/assets/banner.png` уже в README (создаётся `node scripts/gen-banner.mjs`), карточки — `node scripts/gen-cards.mjs`.
