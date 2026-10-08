# Event & Talent CRM V2 - Implementation To-Do List

## Phase 0 — Initial ADR Generation (Section 118)
- [x] Write ADR: `0008-redis-bullmq-workers.md`
- [x] Write ADR: `0009-transactional-outbox.md`
- [x] Write ADR: `0010-event-session-model.md`
- [x] Write ADR: `0011-qr-checkin-token.md`
- [x] Write ADR: `0012-automation-engine.md`
- [x] Write ADR: `0013-finance-provider-abstraction.md`
- [x] Write ADR: `0014-document-storage-abstraction.md`
- [x] Write ADR: `0015-controlled-ai-actions.md`
- [x] Write ADR: `0016-ai-tool-permission-boundary.md`
- [x] Write ADR: `0017-person-merge-strategy.md`
- [x] Write ADR: `0018-custom-fields.md`
- [x] Write ADR: `0019-segment-filter-dsl.md`
- [x] Write ADR: `0020-multi-brand-preparation.md`

## Phase 1 — Operations Foundation
- [x] Setup Redis
- [~] Setup BullMQ — `common/queue.ts` есть, но не используется: воркеры опрашивают outbox в PostgreSQL по таймеру
- [x] Implement Transactional Outbox pattern
- [x] Create Tasks entity and management
- [x] Build internal Notifications system
- [~] Create Job Monitor dashboard — API `/jobs` есть, экрана на клиенте нет
- [x] Add Integration Health tracking

## Phase 2 — Event Operations
- [~] Create Venues and Rooms domain — API есть, экрана нет
- [~] Create Event Sessions domain — API есть, экрана нет
- [x] Build Schedule Engine
- [x] Implement conflict detection for scheduling (зал и хореограф, пересечение по времени)
- [x] Implement Check-in capability (opaque QR tokens)
- [x] Build session Attendance tracking
- [x] Create Event Command Center UI

## Phase 3 — Talent Management
- [x] Add `ChoreographerProfile` extensions
- [x] Extend `EventChoreographer` assignment tracking
- [x] Implement Choreographer Costs domain
- [x] Track Travel and Hotel statuses
- [x] Create generic Documents architecture
- [~] Build Contract tracking/templates — шаблоны и `Document` типа CONTRACT; отдельной модели Contract, версий и хранилища файлов нет (см. спецификацию хореографов V2.1)

## Phase 4 — Communication Platform
- [x] Create Communication Templates
- [x] Implement dynamic Segments logic
- [x] Build Saved Views for tables
- [x] Build Campaigns scheduling and dispatch
- [x] Implement Delivery Log tracking
- [x] Abstract Communication Provider layer

> Статус на 2026-10-08. Отметка `[x]` — реализовано и проверено (unit-тесты + живой прогон API на локальной БД).
> `[~]` — сделано частично, ограничение указано. `[ ]` — не сделано.
> Миграции: `20261006210000_crm_v2_platform` (фазы 1–9, включая таблицы фаз 1–4, которых не было в baseline)
> и `20261006220000_crm_v2_operations_followup`.

## Phase 5 — Automation
- [x] Triggers: доменные события через transactional outbox → `automations/engine.ts`
- [x] Conditions DSL (`automations/conditions.ts`, all/any + типизированные операторы)
- [~] Actions: ADD_TAG, REMOVE_TAG, CREATE_TASK, CREATE_NOTIFICATION, UPDATE_REGISTRATION, SEND_EMAIL, GENERATE_AI_DRAFT, WEBHOOK. Нет отдельных действий CREATE_EMAIL_DRAFT и RUN_AI_CLASSIFICATION — классификация и подготовка черновика для входящих писем выполняются фоновым конвейером (`ai/inbound-pipeline.ts`, флаги `AI_EMAIL_CLASSIFICATION_ENABLED` + `AI_EMAIL_DRAFT_ENABLED`)
- [x] Automation Runs + ActionRuns (инспекция каждого шага)
- [~] Dry-run: автоматизации, кампании (preview), сегменты, импорт людей, симуляция письма для AI (с историей запусков). Нет: ticket sync mapping
- [~] Automation UI: список, создание (условия/конфиг — JSON), тест, активация/пауза, история запусков. Визуального конструктора нет
- [ ] Триггеры по времени (EVENT_STARTING, SESSION_STARTING, SCHEDULE) — типы объявлены, планировщика нет

## Phase 6 — Finance
- [x] Нормализованный Payment (+ personId, provider, method, metadata) и Refund
- [~] Mollie PaymentProvider (`integrations/payment`): getPayment/createRefund/getRefund + входящий webhook с повторным чтением состояния. Не проверено на реальном Mollie-аккаунте
- [x] Refund workflow: request → approve/reject → process (feature flag `refund_execution`) → sync; аудит на каждом шаге
- [x] Choreographer costs: статус + связь с документом
- [x] Event financial overview с метками actual / pending / estimated
- [ ] FinancialTransaction (отдельная модель из §36) не введена

## Phase 7 — AI Platform
- [x] Реальные адаптеры OpenAI/Ollama вместо заглушек (HTTP, JSON mode, валидация схемой)
- [x] AI Assistant: планировщик → read-only инструменты с проверкой прав → синтез
- [x] AI-черновики писем на RAG v2 (HHDC): интенты и маршрутизация, разделение по годам события, контекст CRM, история переписки, проверка фактов, состояния answerability. Проверено на живой локальной модели (Ollama qwen3:1.7b + bge-m3) 2026-10-07
- [x] Выбор провайдера/модели и версии промпта для одного черновика или симуляции (право `ai.manage`); метрики по этапам
- [x] Read-only tools (13 шт.), без SQL, фильтр по permissions
- [x] AI Review Queue (API + UI)
- [x] Action proposals: только CREATE_TASK, подтверждение владельцем, TTL 15 мин, feature flag `ai_actions`
- [x] Prompt Registry (append-only версии, активация) + UI на `/knowledge-base` с подстановками `{{current_date}}`, `{{replyLanguage}}`, `{{email}}`, `{{emailThread}}`, `{{crmContext}}`, `{{knowledge}}`
- [~] Evaluation: датасет (CRUD), ручная симуляция письма с историей и метриками. Автоматический прогон golden-набора (`hhdc-knowledge-v2/16_test_dataset`) не реализован
- [~] AI Feedback (API). UI-кнопок на драфте нет
- [x] Knowledge versioning (hash → пропуск переиндексации) и visibility-фильтр до ранжирования
- [x] Knowledge sync: загрузка папок `server/knowledge/hhdc-knowledge-v1` и `-v2` с метаданными слоёв (`POST /knowledge/sync-v2`, кнопка на `/knowledge-base`); правки в CRM не перезаписываются без явного флага

## Phase 8 — Data & Platform
- [x] Duplicate candidates: скан по email/телефону, решение человеком
- [x] Person Merge: транзакция, архив источника, PersonMerge + аудит
- [~] Custom Fields: определения, валидация значений, API. В формах Person/Event UI ещё не выводятся
- [~] Import: People (preview → confirm). Нет: Registrations, Choreographers. Export: синхронный CSV до 5000 строк с аудитом; асинхронных больших экспортов нет
- [~] GDPR: export/anonymize (были в V1) + Consent. Права `privacy.*` добавлены в seed. Политика retention не реализована
- [x] API Keys: хеш, показ один раз, отзыв, Bearer-аутентификация с правами ключа
- [x] Outbound Webhooks: HMAC-подпись, backoff, только публичные https-адреса
- [~] Analytics: события (участники, check-in, страны/языки, повторные, финансы). Нет: choreographer / communications / retention отчётов
- [x] Feature Flags
- [x] Multi-brand: модель Brand + Event.brandId, API

## Phase 9 — Hardening
- [x] RBAC review: добавлены недостающие права в seed (раньше `communications.write`, `privacy.*`, `knowledge.manage`, `search.read` не выдавались никому), закрыты правами tasks/jobs, SecurityEvent на отказ
- [ ] Event scoping: модель UserEventAccess есть, централизованного применения в запросах нет
- [~] Performance: пагинация новых списков, индексы; профилирование не проводилось
- [~] Security: SSRF-защита webhooks, CSV-injection, хеш ключей. Redis rate limiting не сделан
- [ ] Backups / DR test / load tests — не выполнялись
- [ ] E2E Playwright для V2-сценариев — не написаны (существующие спеки относятся к legacy-экранам)
- [~] Observability: `/operations/health` + UI. Внешний мониторинг/алерты не настроены

## Сделано сверх фаз (почта)
- [x] Подключение ящиков по IMAP/SMTP наряду с Gmail; синхронизация последних 200 писем по счёту, состояние «прочитано»
- [x] Рабочее место Email: пагинация, поиск, фильтр по ящику, метки «отправлено / новое / открыто»
- [x] Новое письмо в модальном окне, вложения к новым письмам и ответам (до 5 файлов по 10 МБ)
- [x] Удаление и спам сначала в удалённом ящике; диалоги только с отправленными письмами удаляются локально
- [x] HTML-подпись и имя отправителя на уровне ящика
- [x] Telegram-уведомления о свежих входящих и о первом сбое синхронизации ящика

## Известные пробелы вне фаз
- [ ] Клиентские экраны для готового API отсутствуют: площадки и залы, сессии и расписание, шаблоны писем, сегменты, сохранённые виды, документы, профили и затраты хореографов, заказы и билеты, уведомления, монитор задач, custom fields, импорт, GDPR, аналитика, поиск
- [~] Расширение модуля хореографов — отдельная спецификация `docs/spec/choreographer-management-v2.1-agent-spec.md`, прогресс в `docs/spec/choreographer-v2.1/implementation-progress.md`. Phases 0–7 сделаны; Phase 8 частично (нет: проверка в браузере и Playwright, репетиция миграции на копии боевых данных, backup/restore, release notes)
- [ ] Weeztix: адаптер был заглушкой с выдуманными заказами; теперь он явно падает, пока не подключён реальный API (нужны документация и доступы)
- [ ] BullMQ/Redis: `common/queue.ts` есть, но воркеры работают через опрос outbox в PostgreSQL
- [ ] Groups/Teams, SessionRegistration, отдельная модель CheckIn/Attendance со статусами, Contract, Google Drive storage, Organization settings
