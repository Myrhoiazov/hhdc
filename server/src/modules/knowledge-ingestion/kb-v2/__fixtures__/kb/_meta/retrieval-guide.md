---
category: meta
dynamic: false
id: retrieval_guide
priority: rules
---

# Retrieval Guide

## Recommended query flow

1.  Detect language.
2.  Classify `intent` and `subintent`.
3.  Extract entities: city, age, style, day, payment topic, camp topic.
4.  Retrieve one or more **business-rule** chunks.
5.  Retrieve matching **facts**, filtering by entity metadata where
    possible.
6.  Retrieve FAQ only if it adds useful explanation.
7.  Retrieve 0--2 response examples for style/structure.
8.  Build a compact context package for the drafting model.
9.  Validate the draft against facts and forbidden assumptions.

## Suggested retrieval limits

-   Rules: 1--3 chunks
-   Facts: 1--4 chunks
-   FAQ: 0--2 chunks
-   Examples: 0--2 chunks
-   Avoid large unfiltered context.

## Examples are non-authoritative

Never copy from examples as facts: - prices; - schedule; - addresses; -
teacher names; - availability; - dates; - cancellation/refund terms.

Use current factual chunks for those values.
