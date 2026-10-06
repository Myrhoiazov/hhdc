# Skylos — чек-лист: почему `skylos-check` был красным и что исправлено

Отдельный чек-лист для находок, из-за которых job `skylos-check` падал на каждом PR и
push. Находки в коде из волн 1–8 разобраны в
[SKYLOS_FINDINGS_CHECKLIST.md](SKYLOS_FINDINGS_CHECKLIST.md) и сюда не дублируются.

Дата: **2026-10-04**, ветка `chore/skylos-pipeline-green`, база — `develop` @ `c5779b8`.
Локальный Skylos — 4.39.2; CI ставит `skylos>=4.35.0`, то есть последнюю версию (4.43.2 в
последнем прогоне, 4.44.0 на момент проверки). Все выводы ниже перепроверены на 4.44.0.

## Причина красного job

Job падал с **exit 2 и пустым выводом**. Причина — не количество уязвимостей, а статус
скана зависимостей `incomplete`:

- в `client/package-lock.json` у пакетов `ansi-html@0.0.9` и `ansi-html-community@0.0.8`
  поле `engines` записано массивом (`["node >= 0.8.0"]`) — так оно опубликовано в их
  `package.json`;
- Skylos принимает `engines` только объектом, помечает запись как
  `invalid_package_metadata`, а весь SCA-скан — как `incomplete`;
- незавершённый скан = exit 2, независимо от того, есть ли находки.

Чем подтверждено:

| Проверка | Результат |
|---|---|
| `analysis_summary.sca_coverage` в JSON-отчёте | `status: incomplete`, `lockfile_issues`: обе записи с `field: engines` |
| Скан `server/` отдельно (1 уязвимость, lock-файл без таких записей) | exit 0 |
| Тот же diff-scan после замены двух `engines` на объект | exit 0 на 4.39.2 |
| diff-scan без `--sca` | exit 0 |

Вывод волны 8 («job красный из-за уязвимостей в зависимостях») неверен: уязвимости сами
по себе код возврата не меняли.

## Что найдено прогоном

Полный аудит на `develop` (Skylos 4.39.2, `-a --baseline`):

| Правило | Находок | Статус |
|---|---|---|
| `SKY-SCA-*` | 131 (53 пакета) | исправлено до 1, см. ниже |
| `SKY-Q802` / `SKY-Q803` / `SKY-Q804` | 327 / 210 / 21 | advisory, не входят в gate |
| Остальные правила | 0 | — |

Skylos 4.44.0 дополнительно находит в коде то, чего 4.39.2 не показывал:

- [x] `SKY-C304` — `client/src/pages/ScheduleSettingsPage/ui/CreateGroupModal/CreateGroupModalFields.tsx`,
  компонент на 86 строк. Разбит на `NameField` / `ReferenceSelects` / `LevelAndPricingRow`.
- [ ] `SKY-S101` — `playwright.config.ts:3`, `docker-compose.e2e.yml:9-10`: пароль
  одноразовой E2E-базы `hhdc-e2e`. Не секрет, но построчного `skylos: ignore` там нет —
  находка появится в CI, когда PR затронет эти файлы.
- `SKY-S101` в `.env` — файл локальный, в репозиторий и в CI не попадает.
- `SKY-U001` / `SKY-U003` / `SKY-U004` в `client/config/**` — уже описанный класс false
  positive.

## Что сделано

### Пайплайн

- [x] `client/package-lock.json`: `engines` у `ansi-html` и `ansi-html-community`
  записан объектом (`{"node": ">= 0.8.0"}`). Проверено: `npm install`, `npm ci` и
  `npm install <пакет>` правку сохраняют. Она вернётся, только если npm переустановит
  сам этот пакет.
- [x] `scripts/check-skylos.sh`: предупреждение, если в lock-файле снова появился
  `engines` массивом, — чтобы exit 2 с пустым выводом больше не приходилось расследовать.
- [x] `.skylos/baseline.json` перегенерирован (`skylos baseline . --sca`, 4.44.0). Раньше
  команда отказывалась сохранять baseline из-за того же `incomplete`. Старый файл на 2016
  записей содержал 1835 записей из `node_modules/.package-lock.json`; новый — 59.
- [x] `scripts/check-skylos.sh`: `--baseline-ref` вместо `--baseline`. В CI Skylos
  применяет `dependency_baseline` только с доверенной ревизии. Доверенная ревизия —
  целевая ветка; `HEAD` используется, только пока в целевой ветке baseline ещё нет
  (этот PR и первый Release PR в `main`).

### Зависимости: 131 → 1

- [x] **server** (8 → 0): `nodemailer` 9.0.6 → 10.0.14 (major, требует Node ≥ 20 —
  образы и CI на Node 20); `deepmerge-ts` 7.1.5 → 8.0.2 через `overrides` для
  `@prisma/config` (у `prisma` 6.19.3 версия закреплена точно).
- [x] **plugins/eslint-plugin-fix-path-plugin** (5 → 0): `npm audit fix`, `mocha` 11 → 12,
  `eslint-doc-generator` 2.2.2 → 2.4.0.
- [x] **client, runtime**: `@tiptap/*` 3.27.3 → 3.31.4 (все пять прямых зависимостей
  одной версией — иначе в дереве оказываются две копии `@tiptap/core`).
- [x] **client, dev** (118 → 1): `npm audit fix`; `copy-webpack-plugin` 13 → 14;
  `overrides`: `uuid` → 11.1.1 для `sockjs` и `@storybook/addon-actions`,
  `webpack-dev-middleware` → 7.4.6 для `@storybook/builder-webpack5`.
- [x] `client/config/build/buildPlugins.ts`: массиву `plugins` задан тип
  `webpack.WebpackPluginInstance[]`. Без этого после обновления webpack не собирается
  `build:prod` — на этом в волне 8 `npm audit fix` был откачен.

### Осталось

- [ ] `braces@3.0.3` — `GHSA-vfj7-8cjw-p6xm` (HIGH, DoS на глубоко вложенных шаблонах).
  Исправленной версии нет: 3.0.3 — последняя. Приходит транзитивно через `micromatch` /
  `chokidar` (stylelint, jest, webpack-dev-server, nodemon), только dev-зависимости.
  Принято в `dependency_baseline`. Когда выйдет исправление — обновить и перегенерировать
  baseline.

## Не проверено

- **Storybook.** `storybook dev --smoke-test` падает на 129 ошибках `Module not found` для
  алиаса `@/` — в `client/config/storybook` алиас не настроен. Поэтому `override`
  `webpack-dev-middleware` 6 → 7 для Storybook в работе не проверен.
- **Тесты и линт плагина** `eslint-plugin-fix-path-plugin` падают и до правок (1 failing
  тест; `lint:js` — `Plugin config "mixed-esm-and-cjs" not found`). В CI плагин не
  проверяется.
- **E2E** локально не запускался, прогонится в CI на PR.

## Как перегенерировать baseline

```bash
skylos baseline . --sca
```

Команда сохраняет файл, только если скан завершён (`status` не `incomplete`). Записи о
находках в коде содержат абсолютные пути машины, где baseline собран, и в CI не
совпадают; `dependency_baseline` от пути не зависит.
