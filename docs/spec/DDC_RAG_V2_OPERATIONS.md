# DDC RAG v2: эксплуатация и добавление знаний

Как устроен layered RAG v2 у AI Email Assistant, как добавлять знания, как индексировать,
включать и откатывать. Требования лежат в `docs/spec/DDC_RAG_V2_IMPLEMENTATION_SPEC.md`. Общий
контур ассистента описан в `DDC_LOCAL_AI_EMAIL_ASSISTANT_SPEC.md` и `..._OPERATIONS.md`.

## 1. Что меняет v2

v1 делает один семантический поиск по всей базе знаний, и в промпт попадает плоский список
`ЗНАНИЯ: - …`. v2 работает так:

```text
Письмо → LLM-классификация (без изменений: spam / needsReply / language / intent v1)
  → query understanding (детерминированно: intent v2, subintent, сущности)
  → retrieval planner (что искать в каждом слое)
  → layered retriever: фильтр по метаданным ДО семантики
        BUSINESS RULES (≤3) → CURRENT FACTS (≤4) → FAQ (≤2) → STYLE EXAMPLES (≤2)
  → context builder (секции, last_verified, бюджет под контекст выбранного провайдера)
  → выбранный draft-провайдер: Ollama или OpenAI (только текст письма)
  → grounding validator → при ошибке одна регенерация → при повторной ошибке needs staff review
  → черновик + rag_trace → Telegram approval (Sources / Warnings)
```

Приоритет источников: `business rules → current facts → FAQ → response examples`. Примеры
задают только тон и структуру. Цены, расписание, адреса, даты и наличие мест модель берёт
исключительно из CURRENT FACTS, и валидатор это проверяет.

## 2. Код

| Слой | Файлы |
|---|---|
| Документы KB, front matter, вывод метаданных из пути | `server/src/modules/knowledge-ingestion/kb-v2/{front-matter,path-metadata,kb-document}.ts` |
| Структурный chunking (H2 = чанк, H3 внутри родителя, Q/A и правила целиком, город из H2) | `kb-v2/markdown-chunker.ts` |
| Загрузка, игнор-лист, валидация, индексация | `kb-v2/{kb-loader,kb-validator,kb-indexer,kb-v2.repository}.ts`, CLI `server/scripts/knowledge-v2.ts` |
| Алиасы сущностей (город/стиль), общие для ingestion и запроса | `kb-v2/entity-aliases.ts` |
| Query understanding, ключевые слова RU/UK/NL/EN | `server/src/modules/ai-email-assistant/rag-v2/{query-understanding,entity-extraction,intent-keywords}.ts` |
| Планировщик, ретривер | `rag-v2/{retrieval-planner,layered-retriever}.ts` |
| Контекст, фильтр по возрасту, валидатор | `rag-v2/{context-builder,age-focus,grounding-validator}.ts` |
| Оркестрация и wiring | `rag-v2/{rag-v2-draft.service,rag-v2.factory}.ts`, `draft-pipeline.service.ts`, `draft-pipeline.cron.service.ts`, `simulation.service.ts` |
| Regression dataset | `rag-v2/__fixtures__/rag-v2-regression.json`, `rag-v2/rag-v2.regression.ts` |

Хранение: те же таблицы, что у v1. `knowledge_documents.kb_version = 'v2'` и `source_type =
'kb_v2'`, метаданные чанка лежат в `knowledge_chunks.metadata` (JSON), диагностика черновика —
в `ai_email_drafts.rag_trace`. Поиск v1 фильтрует `kb_version = 'v1'`, поэтому корпуса не
смешиваются.

## 3. Как добавить или изменить знание

База знаний лежит в `server/knowledge/ddc-knowledge-v2/`. Папка gitignored, но на сервер попадает
при `npm run deploy`: deploy-скрипт делает `rsync` рабочей папки, а не git-дерева. В backend-контейнер
она смонтирована только на чтение как `/app/knowledge` (см. §6).

1. Положите `.md` в папку нужного слоя. Папка задаёт метаданные по умолчанию:

   | Папка | category / priority | Что из имени файла |
   |---|---|---|
   | `02_locations/<city>.md` | location / factual, dynamic | `city` |
   | `03_dance_styles/<style>.md` | style / factual | `style` |
   | `04_classes/`, `08_faq/`, `10_business_rules/` | class / factual, faq / faq, rule / rules | `topic` |
   | `05_schedule/` | schedule / factual, dynamic | город берётся из `## <Город>` |
   | `07_pricing_payments/` | pricing / factual, dynamic | — |
   | `08_lito_dance_camp/` | camp / factual (`pricing`, `booking` — dynamic) | — |
   | `11_response_examples/<topic>/<name>-<ru\|uk\|nl\|en>.md` | example / example | `topic`, `subtopic`, `language` |

2. Для фактов, которые меняются (расписание, адреса, цены, даты лагеря), добавьте front matter
   с датой проверки:

   ```yaml
   ---
   id: location_rotterdam
   category: location
   city: rotterdam
   language: canonical
   priority: factual
   dynamic: true
   last_verified: 2026-10-01
   source: website
   ---
   ```

   Front matter перекрывает значения, выведенные из пути, поле за полем. Поддерживаются поля
   `id, version, category, topic, subtopic, city, style, age_group, language, priority
   (rules|factual|faq|example), dynamic, last_verified (YYYY-MM-DD), source`.
3. Структура: один смысловой блок (вопрос/ответ FAQ, правило, город расписания) — это одна
   секция `##`. Строки расписания пишите в виде `- 17:00–18:00 — Street Jazz / Hip-Hop — 12+`:
   возрастной диапазон в конце строки нужен фильтру по возрасту.
4. Пример ответа — шаблон, а не факт. Значения пишите плейсхолдерами (`[АКТУАЛЬНЫЙ АДРЕС]`).
   Если модель скопирует плейсхолдер в ответ, валидатор это поймает.
5. Не индексируются: `_meta/`, корневой `README.md`, `RAG_V2_IMPLEMENTATION_SPEC.md`, файлы с
   префиксом `_` (например `_bad-examples.md`) и папки-остатки v1 `07_faq/`,
   `09_business_rules/`, `10_sources/` (их заменили `08_faq/`, `10_business_rules/`,
   `13_sources/`).
6. Запустите `npm run knowledge:validate`, затем `npm run knowledge:index`.

## 4. Команды (из `server/`)

| Команда | Что делает |
|---|---|
| `npm run knowledge:validate [-- <path>]` | Проверяет дубли id, невалидный YAML, неизвестные priority/category/language, обязательные метаданные, пустой контент. `dynamic: true` без `last_verified` — ошибка, если объявлено в front matter, и предупреждение, если выведено из папки. Факты старше 90 дней дают предупреждение. В БД и Ollama не ходит. |
| `npm run knowledge:index [-- <path>]` | Сначала validate. Переэмбеддит только новые и изменённые файлы (по sha256 файла и модели эмбеддингов), удаляет из индекса документы, которых больше нет в папке. |
| `npm run knowledge:reindex [-- <path>]` | Полная переиндексация namespace v2. Индекс не пустеет: старые строки заменяются по одной. |
| `npm run knowledge:eval [-- <id-substring>]` | Живой прогон regression-кейсов через Ollama и индекс v2: ретривал + `mustContain`/`mustNotContain` по реальному черновику. `EVAL_VERBOSE=true` печатает черновики. В CI не входит. |

Путь по умолчанию — `RAG_KNOWLEDGE_PATH` (`knowledge/ddc-knowledge-v2`).

`npm run knowledge:*` запускаются через `ts-node` и работают локально и в dev-контейнере. В
production-образе `ts-node` нет (`npm ci --omit=dev`), там используется скомпилированный CLI с теми
же командами:

```bash
docker exec <backend> node build/scripts/knowledge-v2.js validate
docker exec <backend> node build/scripts/knowledge-v2.js index
docker exec <backend> node build/scripts/knowledge-v2.js reindex
```

`knowledge:eval` в production-образ не входит: это локальная проверка качества.

## 5. Конфигурация

| ENV | Default | Назначение |
|---|---|---|
| `RAG_VERSION` | `v1` | `v2` включает layered-пайплайн в draft cron и в «Симуляции письма» |
| `RAG_KNOWLEDGE_PATH` | `knowledge/ddc-knowledge-v2` | Корень KB v2 для CLI |
| `RAG_RULE_LIMIT` / `RAG_FACT_LIMIT` / `RAG_FAQ_LIMIT` / `RAG_EXAMPLE_LIMIT` | 3 / 4 / 2 / 2 | Лимиты слоёв |
| `OPENAI_CONTEXT_LENGTH` | 16000 | Контекст в токенах для бюджета промпта, когда черновик пишет OpenAI |

Бюджет промпта считается на каждый черновик из контекста того провайдера, который выбран в
настройках ассистента: `(контекст − 350) × 3.3` символа. Для Ollama контекст — это
`LLM_CONTEXT_LENGTH` (он же `num_ctx` локальной модели), для OpenAI — `OPENAI_CONTEXT_LENGTH`.
Переключение провайдера в админке меняет бюджет без перезапуска. Классификация и эмбеддинги
всегда идут через локальный Ollama и от этой настройки не зависят. Коэффициент
3.3 взят из замера `prompt_eval_count` qwen3 (≈3.47). Если промпт не влезает, сначала
вырезается FAQ, потом примеры сверх первого, потом правила сверх первого, потом последний пример,
и только потом факты сверх первого. Что именно вырезано, видно в `rag_trace.trimmedChunkIds`.
Админская persona из слота `DRAFT_BODY` сейчас занимает ~3 КБ. У Ollama при `num_ctx=2048` это
заметно урезает контекст, при 4096 почти ничего не режется (см. §8). У OpenAI при значении по
умолчанию лимиты слоёв помещаются целиком.

## 6. Включение (rollout)

1. Задеплоить код. Миграция `20261001120000_add_rag_v2_metadata` аддитивная (две nullable
   колонки и `kb_version DEFAULT 'v1'`), v1 продолжает работать без изменений.
2. База знаний приезжает тем же деплоем: `rsync` кладёт `server/knowledge/` на хост, а
   `docker-compose.prod.yml` монтирует её в backend как `/app/knowledge` (read-only). На сервере
   выполнить `docker exec <backend> node build/scripts/knowledge-v2.js index` (перед индексацией
   команда сама запускает validate).
3. Проверить: локально `npm run knowledge:eval`, на сервере несколько реальных писем в «Симуляции
   письма» с `RAG_VERSION=v2` в env backend'а.
4. Выставить `RAG_VERSION=v2` в `.env` и перезапустить backend.
5. Наблюдать за строками `[RagV2]` в `logs/combined.log` (request_id, intent, план,
   использованные chunk id, scores, warnings, needs_staff_review, длительности; без текста
   письма и адресов). В Telegram у v2-черновиков есть блоки `Sources` и `Warnings`.
6. Обновление знаний после включения: поправить `.md` локально, `npm run deploy`, затем снова
   `node build/scripts/knowledge-v2.js index` в контейнере. Переэмбеддятся только изменённые файлы,
   удалённые из папки документы уйдут из индекса. Загрузка файлов через UI базы знаний пишет в
   корпус v1 и в v2 не попадает.
7. Удалять v1 (`kb_version='v1'`, ветку `knowledgeProvider`) можно только после стабильной
   работы v2.

## 7. Откат

`RAG_VERSION=v1` и перезапуск backend. Строки v1 в индексе не трогались. Черновики v2
сохраняют `rag_trace`, v1 эти данные просто игнорирует. Откатывать миграцию не нужно: колонки
nullable или со значением по умолчанию.

## 8. Известные ограничения

- Понимание запроса построено на словарях и regex. Редкие перефразировки и опечатки без
  ключевых слов уходят в intent от LLM или в `other`, тогда работают только общие правила и
  семантика внутри слоёв. Новые формулировки добавляются в `intent-keywords.ts`, новые города и
  стили — в `entity-aliases.ts`.
- Валидатор ловит буквальные значения: цену с €/euro, время HH:MM, дни недели, даты с месяцем
  или в числовом виде, NL-индексы и улицы на `-straat/-weg/-hof/…`. Пересказ без цифр («вечером
  в начале недели») он не поймает.
- Данных о наличии мест в системе нет, поэтому любое обещание места блокируется, а вопрос о
  местах всегда уходит сотруднику (`staff_confirmation_topic`).
- Примеры используются только на языке письма. Сейчас примеры на NL/EN/UK есть лишь для
  `registration/teenager_location`.
- С локальным провайдером качество текста ограничено моделью (qwen3 0.6B/1.7B). При
  `num_ctx=2048` и длинной persona заметная часть контекста вырезается. Замер на 28 кейсах (qwen3:1.7b): при 2048 —
  27/28, 4 черновика с уверенностью `high`; при 4096 — 27/28, 14 черновиков `high`.
