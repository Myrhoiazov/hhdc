# Todo: AI email assistant with RAG V2

- [x] Task 1: Knowledge base V2 parsing, layer metadata on chunks and the "Load knowledge base" sync.
- [x] Task 2: RAG V2 pipeline (understanding, plan, layered retrieval, context, grounding check).
- [x] Task 3: "Generate AI draft" runs on RAG V2; confidence and staff-review flag shown on the draft.
- [x] Task 4: Background classification and draft preparation for fresh incoming mail (off by default).
- [x] Task 5: Email simulation and prompt versions on `/knowledge-base`.
- [x] Task 6: Domain model switched to HHDC (intents, classifier, routing, event-year separation, CRM context, answerability).
- [x] Task 7: Provider and model choice for a simulation, per-stage metrics and the simulation history.
- [x] Task 8: Local setup — Ollama provider connected, both knowledge folders loaded and embedded, background drafting switched on.
- [x] Checks: server build + tests, client lint + tests.
- [x] Live check on local Ollama (qwen3:1.7b + bge-m3): classification, retrieval, draft, evidence gate and history work end to end.
- [ ] Browser QA of `/knowledge-base` and the draft badges (light/dark, mobile).
- [ ] Ready for PR.
