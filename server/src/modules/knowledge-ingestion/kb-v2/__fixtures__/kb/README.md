---
category: meta
dynamic: false
id: kb_root
last_verified: 2026-10-01
priority: rules
version: 2
---

# Talent Center DDC --- Knowledge Base v2

Knowledge base for DDC customer-support RAG: email, Telegram, WhatsApp
and admin-assisted replies.

## Core architecture

RAG v2 separates context into four layers:

1.  **Facts** --- current factual information: locations, schedule,
    styles, pricing and camp data.
2.  **Business rules** --- how DDC handles a situation and what the
    assistant may or may not conclude.
3.  **FAQ** --- reusable answers to common customer intents.
4.  **Response examples** --- examples of tone and structure. Examples
    are never authoritative factual sources.

## Retrieval priority

`business rules → current facts → FAQ → response examples`

For dynamic facts such as schedule, price, address, dates and
availability, the newest verified factual document always overrides
FAQ/examples.

## Main folders

-   `_meta/` --- retrieval, freshness, metadata and validation rules.
-   `01_brand/` --- DDC public identity and contacts.
-   `02_locations/` --- location facts.
-   `03_dance_styles/` --- style facts.
-   `04_classes/` --- class-related facts.
-   `05_schedule/` --- current schedule.
-   `06_registration/` --- registration flow.
-   `07_pricing_payments/` --- payment knowledge and unknowns.
-   `08_faq/` --- expanded intent-based FAQ.
-   `09_lito_dance_camp/` --- camp facts.
-   `10_business_rules/` --- decision and escalation rules.
-   `11_response_examples/` --- multilingual response patterns.
-   `12_response_style/` --- DDC tone and channel rules.
-   `13_sources/` --- source registry.

## RAG rule

Never retrieve the whole knowledge base for a normal customer message.
Classify first, filter by metadata, retrieve the smallest relevant
fact/rule set, and add at most a small number of response examples.

## Dynamic-data warning

Schedule, prices, addresses, dates, availability and commercial terms
require freshness checks. Never let a response example override a
current factual record.
