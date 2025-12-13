Good clarifications. Let me update both documents to reflect these decisions and tighten them up.

-----

## Document 1: Workflow Architecture & Analysis (Revised)

```markdown
# YouTube Media Analysis Workflow Framework
## Version: 0.2

---

## 1. Objective Summary

Build a repeatable, extensible workflow that:
- Ingests YouTube videos/playlists via yt-dlp
- Performs parallel initial analysis using Fabric patterns (all against original transcript)
- Uses analysis outputs to query pattern RAG and select appropriate patterns
- Executes selected patterns against source material
- Produces markdown file outputs on disk

**Design principles**: Fail-fast with logging. No built-in feedback loops (tuning is operational).

---

## 2. Workflow Stages

| Stage | Node | Input | Operations | Output |
|-------|------|-------|------------|--------|
| 0 | `input_receiver` | YouTube URL, params | Validate URL, determine single/playlist, queue jobs | Job request(s): `{url, job_id, flags}` |
| 1 | `yt_dlp_extractor` | Job request | yt-dlp transcript + metadata extraction | `{transcript, title, description, channel, duration, upload_date, tags}` |
| 2 | `parallel_analysis` | Transcript + metadata | Fan-out to 3 Fabric calls (parallel, all use original input) | Aggregated: `{summary, keypoints, domain_classification}` |
| 3a | `query_generator` | Stage 2 outputs | LLM generates RAG search query | Search query string |
| 3b | `rag_retriever` | Search query | Vector + keyword search on pattern index | Top-k candidate patterns with metadata |
| 3c | `pattern_evaluator` | Candidates + Stage 2 context | LLM selects pattern(s) from candidates | Ordered pattern list with rationale |
| 4 | `pattern_executor` | Selected patterns + original transcript | Execute each pattern via Fabric | Array of results keyed by pattern_id |
| 5 | `output_writer` | Pattern results + metadata | Format markdown, write to disk | Markdown file(s) at configured path |

### Stage 2 Sub-nodes (Parallel)

| Sub-node | Pattern | Output |
|----------|---------|--------|
| `summarize_call` | `summarize` | Concise summary |
| `keypoints_call` | `extract_keypoints` (custom) | Structured key points list |
| `domain_classify_call` | `classify_domain` (custom) | Domain label + PARA area mapping |

---

## 3. Knowledge Gaps / Open Questions

| ID | Gap | Resolution Approach |
|----|-----|---------------------|
| G1 | Pattern RAG schema undefined | Define: `{pattern_name, description, use_cases, input_type, output_type, tags}` |
| G2 | Multi-shot examples for `pattern_evaluator` not authored | Author 5-10 examples covering different domains |
| G3 | Domain taxonomy for `classify_domain` not defined | Define taxonomy aligned to PARA areas |
| G4 | yt-dlp failure modes (no transcript, auto-generated) | Define fail-fast behavior: log error, skip item |
| G5 | RAG embedding model not selected | Evaluate local options (sentence-transformers) |
| G6 | Logging implementation (structured vs flat) | Define log schema for troubleshooting |
| G7 | Output file naming convention undefined | Define: `{date}_{video_id}_{pattern}.md` or similar |

---

## 4. Assumptions

| ID | Assumption | Risk if Invalid |
|----|------------|-----------------|
| A1 | yt-dlp reliably extracts transcripts for target content | Workflow fails; need alternative source |
| A2 | Fabric patterns invocable programmatically | Need wrapper if CLI-only |
| A3 | Single LLM provider (LM Studio local) | May hit capacity limits |
| A4 | Pattern RAG queryable with acceptable latency | Add caching if slow |
| A5 | Domain taxonomy is predefined and stable | Retrain `classify_domain` if changed |
| A6 | Transcripts are English | Add language detection if multilingual |
| A7 | Whole-pattern RAG indexing is sufficient | Enhance with component-level indexing if results poor |
| A8 | No human approval required per-video | Batch operation assumed |

---

## 5. Future Enhancements (Captured, Not In Scope)

- Component-level RAG indexing (system prompt, examples, output format separately)
- Built-in feedback capture for pattern selection quality
- Multi-provider LLM routing
- Graceful degradation / fallback behaviors
```

-----

## Document 2: Required Fabric Patterns (Revised)

```markdown
# Fabric Patterns Inventory
## YouTube Media Analysis Workflow v0.2

---

## Existing Patterns (Verify in Fabric Repo)

| Pattern | Purpose | Repo Status |
|---------|---------|-------------|
| `summarize` | Concise summary of transcript. Primary Stage 2 pattern. | ✅ Core pattern |
| `extract_wisdom` | Extract insights, quotes, recommendations. Educational/informational content. | ✅ Core pattern |
| `extract_ideas` | Pull discrete concepts. Brainstorming/creative content. | ✅ Core pattern |
| `extract_main_idea` | Single central thesis. Focused argumentative content. | ✅ Exists |
| `analyze_claims` | Evaluate factual claims. News/opinion content. | ✅ Exists |
| `extract_recommendations` | Actionable recommendations. How-to/advice content. | ✅ Exists |
| `create_summary` | Alternative summary structure. | ✅ Exists |
| `analyze_presentation` | Structured presentation analysis. | ⚠️ Verify |
| `extract_sponsors` | Identify sponsored segments. | ⚠️ Verify |

**Verification**: https://github.com/danielmiessler/fabric/tree/main/patterns

---

## Custom Patterns (Need to Author)

| Pattern | Purpose | Priority |
|---------|---------|----------|
| `classify_domain` | Classify into domain taxonomy, map to PARA areas, output confidence score. Requires domain taxonomy definition. | P0 - Blocks routing |
| `select_patterns` | Meta-pattern: evaluate context, recommend patterns to run. Multi-shot examples critical. | P0 - Core decision logic |
| `extract_keypoints` | Extract 5-10 explicit key points (distinct from inferred ideas). Structured output. | P1 - May adapt existing |
| `generate_rag_query` | Generate semantic search query optimized for pattern retrieval. | P1 - Simple prompt engineering |

---

## Authoring Checklist

| Pattern | Taxonomy Defined | System Prompt | Multi-shot Examples | Output Schema | Tested |
|---------|------------------|---------------|---------------------|---------------|--------|
| `classify_domain` | ☐ | ☐ | ☐ | ☐ | ☐ |
| `select_patterns` | N/A | ☐ | ☐ | ☐ | ☐ |
| `extract_keypoints` | N/A | ☐ | ☐ | ☐ | ☐ |
| `generate_rag_query` | N/A | ☐ | ☐ | ☐ | ☐ |

---

## Pattern → Content Type Mapping (Initial Heuristic)

| Content Type | Primary Patterns | Signals |
|--------------|------------------|---------|
| Tutorial/How-to | `extract_recommendations`, `extract_keypoints` | "how to", actionable steps, demonstrations |
| Educational/Lecture | `extract_wisdom`, `extract_ideas` | concepts, explanations, frameworks |
| News/Commentary | `analyze_claims`, `summarize` | current events, opinions, claims |
| Interview/Conversation | `extract_wisdom`, `extract_keypoints` | Q&A format, multiple speakers |
| Product Review | `extract_recommendations`, `analyze_claims` | comparisons, verdicts, specs |
| Presentation/Talk | `analyze_presentation`, `extract_main_idea` | slides, single speaker, thesis |

This mapping informs multi-shot examples for `select_patterns`.
```

-----

**Ready to proceed. Recommended next steps in order:**

1. **Define domain taxonomy** for `classify_domain` (blocks P0 pattern)
1. **Verify existing patterns** against current Fabric repo
1. **Author `classify_domain`** system prompt + output schema
1. **Author `select_patterns`** with multi-shot examples using the content type mapping

Which would you like to tackle first?​​​​​​​​​​​​​​​​