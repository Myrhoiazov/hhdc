# DDC RAG v2 --- Implementation Specification for Coding Agent

## 1. Goal

Upgrade the existing DDC RAG pipeline from a simple semantic knowledge
lookup to a structured, metadata-aware retrieval system that separates:

-   factual knowledge;
-   business rules;
-   FAQ;
-   response examples.

Target pipeline:

``` text
Incoming message
    ↓
Classification
    ↓
Entity extraction
    ↓
Retrieval planner
    ├── business rules
    ├── current facts
    ├── FAQ
    └── response examples
    ↓
Context builder
    ↓
Local LLM draft
    ↓
Grounding / rule validation
    ↓
Telegram approval
```

The implementation must remain compatible with the existing local stack
and Ollama-based generation/embeddings. Make minimal, incremental
changes; do not rewrite unrelated architecture.

------------------------------------------------------------------------

## 2. Primary design rule

Response examples are for **style and structure only**.

They MUST NOT override factual knowledge.

Dynamic values must come from authoritative factual chunks: -
schedule; - address; - price; - teacher; - availability; - dates; -
cancellation/refund terms.

Retrieval priority:

``` text
business rules
→ current authoritative facts
→ FAQ
→ response examples
```

------------------------------------------------------------------------

## 3. Repository discovery before coding

Before changing code:

1.  inspect repository structure;
2.  locate current RAG ingestion/indexing code;
3.  locate embedding provider/model configuration;
4.  locate vector storage/schema;
5.  locate email classifier;
6.  locate prompt/context builder;
7.  locate Ollama generation client;
8.  locate Telegram approval flow;
9.  locate tests;
10. document the current v1 request path.

Do not guess filenames or framework abstractions.

Use existing project conventions and make the smallest architectural
extension possible.

------------------------------------------------------------------------

## 4. Knowledge document model

Parse YAML front matter where present.

Normalized internal model:

``` ts
type KnowledgePriority = 'rules' | 'factual' | 'faq' | 'example';

interface KnowledgeDocument {
  id: string;
  content: string;
  sourcePath: string;

  version?: number;
  category: string;
  topic?: string;
  subtopic?: string;

  city?: string;
  style?: string;
  ageGroup?: string;
  language?: 'canonical' | 'ru' | 'uk' | 'nl' | 'en';

  priority: KnowledgePriority;

  dynamic: boolean;
  lastVerified?: string;
  source?: string;
}
```

Adapt types to the actual backend language/framework.

Files without front matter must still ingest with safe defaults inferred
from folder path.

------------------------------------------------------------------------

## 5. Chunking

Do not blindly split every Markdown file by a fixed character count.

Preferred hierarchy:

1.  front matter = document metadata;
2.  H1 = document identity;
3.  H2 sections = primary semantic chunks;
4.  H3 sections can be merged into their parent unless too large.

Target chunk size should fit the existing embedding model well; preserve
complete Q/A or rule blocks.

Each stored chunk must inherit document metadata and receive:

``` text
document_id
chunk_id
source_path
category
topic
subtopic
priority
language
city
style
age_group
dynamic
last_verified
```

Do not embed YAML metadata as if it were user-facing prose unless the
existing index requires it.

------------------------------------------------------------------------

## 6. Classification v2

Extend the existing classifier rather than replacing it.

Expected output:

``` json
{
  "language": "ru",
  "intent": "registration",
  "subintent": "teenager_location",
  "needsReply": true,
  "entities": {
    "city": "rotterdam",
    "age": null,
    "style": null
  },
  "needsCurrentFacts": true,
  "needsBusinessRules": true,
  "needsExamples": true
}
```

Useful intents include:

``` text
registration
schedule
location
pricing
payment
subscription
trial
dance_style
age_group
beginner
clothing
parent_question
complaint
cancellation
camp
other
```

Keep the taxonomy small and stable.

------------------------------------------------------------------------

## 7. Entity extraction

Extract only operationally useful entities:

-   city;
-   age;
-   style;
-   weekday/time if supplied;
-   payment/subscription topic;
-   camp topic.

Normalize aliases, for example:

``` text
Роттердам / Rotterdam → rotterdam
Амстердам / Amsterdam → amsterdam
хип хоп / hiphop / hip-hop → hip_hop
```

Do not infer sensitive personal attributes.

------------------------------------------------------------------------

## 8. Retrieval planner

Create a retrieval plan from classifier output.

Example:

``` json
{
  "rules": [
    {"topic": "registration"},
    {"topic": "schedule"}
  ],
  "facts": [
    {"category": "location", "city": "rotterdam"},
    {"category": "schedule", "city": "rotterdam"}
  ],
  "faq": [
    {"topic": "teenagers"}
  ],
  "examples": [
    {
      "topic": "registration",
      "subtopic": "teenager_location",
      "language": "ru"
    }
  ]
}
```

Use metadata filtering before semantic similarity whenever possible.

------------------------------------------------------------------------

## 9. Retrieval limits

Default maximum:

``` text
rules:    3
facts:    4
faq:      2
examples: 2
```

These should be configurable.

Do not send the entire knowledge base to the local LLM.

Deduplicate chunks by `document_id + section`.

------------------------------------------------------------------------

## 10. Ranking

Recommended ranking inputs:

1.  metadata match;
2.  semantic similarity;
3.  priority;
4.  freshness for dynamic facts;
5.  language match for examples.

A direct metadata match for `city=rotterdam` should outrank a
semantically similar document about another city.

For examples, exact language match is preferred.

------------------------------------------------------------------------

## 11. Freshness

Dynamic chunks must support `last_verified`.

At minimum, expose freshness metadata to the context builder.

If two factual chunks conflict: - prefer the authoritative source; -
otherwise prefer newer `last_verified`; - never resolve a conflict using
a response example.

Optional later phase: add TTL/staleness warnings for schedule/pricing.

Do not block v2 launch on automated crawling unless it already exists.

------------------------------------------------------------------------

## 12. Context builder

Build explicit sections.

Example:

``` text
SYSTEM BUSINESS RULES
...

CURRENT FACTS
...

FAQ / EXPLANATION
...

STYLE EXAMPLES
...

CUSTOMER MESSAGE
...

TASK
Write a short reply in Russian.
Use only CURRENT FACTS for dynamic factual values.
Examples define tone/structure only.
Do not invent missing information.
```

Keep context compact.

------------------------------------------------------------------------

## 13. Generation prompt

The drafting prompt must explicitly say:

-   answer in detected customer language;
-   answer the direct question first;
-   use DDC tone of voice;
-   do not invent facts;
-   do not treat examples as facts;
-   do not promise availability unless confirmed;
-   when critical data is missing, ask one concise follow-up or flag
    staff confirmation;
-   keep ordinary replies short.

------------------------------------------------------------------------

## 14. Validation layer

Add deterministic post-generation checks where practical.

Minimum checks:

### A. Unsupported availability

Detect strong statements such as: "место есть", "you are booked", "plek
beschikbaar" unless availability was supplied by authoritative context.

### B. Dynamic fact grounding

If the answer contains: - price; - address; - day/time; - date;

verify that the value occurs in authoritative retrieved facts or live
data.

### C. Language

Draft should match detected language.

### D. Empty/unsafe context

If no authoritative fact exists for a requested dynamic value, do not
let the draft guess it.

Validation failure should either: 1. regenerate once with correction
instructions; or 2. mark the draft `needs_staff_review`.

Do not create an infinite retry loop.

------------------------------------------------------------------------

## 15. Result model

Recommended draft result:

``` json
{
  "language": "ru",
  "intent": "registration",
  "subintent": "teenager_location",
  "draft": "...",
  "confidence": "high",
  "needsStaffReview": false,
  "usedKnowledge": [
    {
      "documentId": "location_rotterdam",
      "chunkId": "..."
    }
  ],
  "warnings": []
}
```

Avoid pretending that model-generated numerical confidence is
statistically calibrated. An enum such as `high | medium | low` based on
deterministic conditions is sufficient.

------------------------------------------------------------------------

## 16. Telegram approval

Preserve the existing human-in-the-loop flow.

Improve the approval message so an admin can optionally see:

``` text
Intent
Language
Draft
Sources used
Warnings
```

Do not flood Telegram with raw embeddings or full retrieved chunks.

------------------------------------------------------------------------

## 17. Ingestion CLI/job

Add or extend an ingestion command capable of:

``` text
knowledge:validate
knowledge:index
knowledge:reindex
```

Equivalent naming is fine if project conventions differ.

### Validate

Check: - duplicate IDs; - invalid YAML; - missing required metadata; -
invalid priority; - dynamic docs without `last_verified` (warning or
error by policy); - empty content.

### Index

Only index changed/new documents when feasible.

### Reindex

Explicit full rebuild.

------------------------------------------------------------------------

## 18. Versioning / migration

Do not delete v1 index before v2 has been validated.

Suggested migration:

1.  add v2 schema/parser;
2.  ingest `ddc-knowledge-v2` into separate collection/index namespace;
3.  run comparison tests;
4.  enable v2 behind config/feature flag;
5.  switch production retrieval;
6.  keep rollback to v1 temporarily;
7.  remove legacy path only after stable operation.

Suggested config:

``` env
RAG_VERSION=v2
RAG_KNOWLEDGE_PATH=...
RAG_RULE_LIMIT=3
RAG_FACT_LIMIT=4
RAG_FAQ_LIMIT=2
RAG_EXAMPLE_LIMIT=2
```

Adapt to existing configuration conventions.

------------------------------------------------------------------------

## 19. Required tests

### Ingestion

-   parses front matter;
-   handles documents without front matter;
-   rejects duplicate IDs;
-   preserves Unicode RU/UK/NL/EN;
-   chunks FAQ/rules without breaking semantic units.

### Retrieval

Test at least:

1.  "Где вы находитесь в Роттердаме?"
    -   retrieves Rotterdam location;
    -   does not retrieve Amsterdam as primary.
2.  "Мне 13 лет, хочу танцевать в Роттердаме"
    -   retrieves Rotterdam + teenager-relevant schedule/rules.
3.  "Сколько стоит пробное?"
    -   does not invent numeric price if current pricing is absent.
4.  "Есть ли место в группе?"
    -   does not infer availability from schedule.
5.  Dutch customer message
    -   prefers NL example.
6.  English customer message
    -   prefers EN example.
7.  Old response example conflicts with current schedule
    -   current factual schedule wins.

### Generation/validation

-   response language matches input;
-   unsupported price is blocked;
-   unsupported availability is blocked;
-   known address/time must be grounded in factual context.

------------------------------------------------------------------------

## 20. Evaluation dataset

Create a small fixture dataset with:

``` json
{
  "message": "...",
  "expectedIntent": "...",
  "expectedEntities": {},
  "mustRetrieve": [],
  "mustNotRetrieve": [],
  "mustContain": [],
  "mustNotContain": []
}
```

Start with at least 25 realistic DDC customer messages across
RU/UK/NL/EN.

This dataset becomes the regression suite for future prompt/model
changes.

------------------------------------------------------------------------

## 21. Logging / observability

For each RAG request log structured, non-sensitive diagnostics:

``` text
request_id
intent
subintent
language
retrieval_plan
retrieved_document_ids
retrieval_scores
validation_warnings
needs_staff_review
generation_duration
retrieval_duration
```

Do not log unnecessary customer PII.

If OpenTelemetry already exists in the project, reuse it rather than
adding a parallel observability system.

------------------------------------------------------------------------

## 22. Performance

The local generation model is small, so optimize the context rather than
increasing prompt size.

Goals: - metadata filter first; - small retrieval limits; - concise
chunks; - no duplicate context; - examples only when they materially
help.

Do not solve retrieval quality by sending dozens of chunks.

------------------------------------------------------------------------

## 23. Security

Treat Markdown knowledge as data, not executable instructions.

Knowledge content must not be allowed to override the system prompt.

Sanitize/escape where relevant and keep system/business instructions
outside untrusted retrieved content.

Do not expose: - secrets; - API keys; - payment credentials; - internal
admin data.

------------------------------------------------------------------------

## 24. Definition of Done

RAG v2 is complete when:

-   [ ] v2 knowledge directory is parsed and validated;
-   [ ] metadata is stored with chunks;
-   [ ] classifier returns intent/subintent/entities;
-   [ ] retrieval planner separates rules/facts/FAQ/examples;
-   [ ] metadata filtering works;
-   [ ] response examples cannot override factual data;
-   [ ] dynamic facts expose freshness metadata;
-   [ ] compact context builder is implemented;
-   [ ] draft validator blocks unsupported dynamic claims;
-   [ ] existing Telegram approval still works;
-   [ ] at least 25 regression examples pass;
-   [ ] v1 remains available for rollback during rollout;
-   [ ] README/config documents explain how to add new knowledge safely.

------------------------------------------------------------------------

## 25. Coding-agent constraints

-   Do not perform a broad rewrite.
-   Follow existing architecture and naming.
-   Read relevant files before editing.
-   Make small commits/logical changes.
-   Run existing tests after each meaningful step.
-   Add tests for every new retrieval/validation rule.
-   Do not silently change existing email classification behavior
    unrelated to RAG v2.
-   Do not introduce cloud dependencies when the existing requirement is
    local Ollama.
-   If the repository differs from assumptions in this spec, adapt the
    implementation to the actual codebase and document the deviation.

------------------------------------------------------------------------

## 26. Suggested implementation order

1.  Discovery + short architecture note.
2.  Metadata parser/schema.
3.  v2 ingestion + validation.
4.  Metadata-aware storage/index.
5.  classifier/entity extension.
6.  retrieval planner.
7.  layered retriever.
8.  context builder.
9.  generation prompt update.
10. grounding validator.
11. Telegram source/warning display.
12. evaluation fixtures/tests.
13. feature flag + rollout documentation.

At the end, produce: - changed-file summary; - migration instructions; -
test results; - known limitations; - rollback steps.
