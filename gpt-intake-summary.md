Document 1 — YouTube Media Analysis & Fabric Pattern-Routing Workflow

1. Summary of objective/purpose

Build a repeatable, extensible workflow that ingests a YouTube video (or playlist), extracts transcript + metadata, runs a small set of baseline Fabric patterns in parallel, and then uses the resulting context (summary, key points/insights, domain/taxonomy mapping, metadata) to deterministically route the media to the most appropriate Fabric pattern(s) for deeper processing and downstream knowledge capture.

The system should be media-type extensible (YouTube → podcasts → meetings → PDFs), and operationalizable via Python + n8n, with Fabric patterns stored in a pattern library index (RAG) for hybrid retrieval (semantic + keyword) and controlled selection. Fabric usage examples in the repo include running patterns like summarize, analyze_claims, and extract_wisdom from stdin or directly against YouTube with -y.  ￼

2. Stages/steps in the analysis

Each line: node name | expected input | operations/functions | expected output
	1.	00_Input_Trigger | Video/playlist URL + optional run config (forced patterns, KM target, priority) | Validate URL, create job/run-id, set defaults | Job spec {run_id, media_type=youtube, url(s), config}
	2.	01_YT_Transcript_Metadata_Extract | Job spec | Run yt-dlp (or equivalent) to fetch transcript + video metadata (title, channel, publish date, duration, description, tags, etc.) | Raw transcript + metadata JSON
	3.	02_Transcript_Normalize_Segment | Raw transcript + metadata | Clean transcript, normalize whitespace, remove artifacts, preserve/derive timestamps, create segments/chunks | Normalized transcript object {full_text, segments[], timestamps[], language?}
	4.	03_Context_Feature_Extraction | Normalized transcript + metadata | Compute lightweight features (token length, segment count, speaker cues if available, presence of code/links, etc.) | Feature vector + “context packet” scaffold
	5.	04A_Fabric_Summarize | Transcript text | Run Fabric summarize to generate a medium summary | Summary markdown/text  ￼
	6.	04B_Fabric_Micro_Summary | Transcript text | Run Fabric create_micro_summary for short routing-friendly gist | Micro-summary  ￼
	7.	04C_Fabric_Insights_KeyPoints | Transcript text | Run Fabric extract_wisdom to extract insights/ideas/takeaways (serves as default “key points” extractor) | Structured insight/key-points output  ￼
	8.	04D_Fabric_Video_Chapters | Transcript w/ timestamps (or segments) | Run Fabric create_video_chapters to identify topics/chapters with timestamps | Chapter list (time ranges + labels)  ￼
	9.	04E_Domain_Area_Mapping_Custom | Summary + micro-summary + key points + metadata + KM taxonomy | Custom pattern/classifier: infer domain(s), map to KM “areas”, assign confidence + rationale | {domains[], km_areas[], confidence, rationale} (structured)
	10.	05_Routing_Context_Assemble | Outputs of 03–04E | Consolidate into a single routing context document (strict schema) | routing_context.json/md (canonical input to routing/selection)
	11.	06_Pattern_Library_Query_Generator_Custom | Routing context | LLM produces hybrid search query + filters (media_type, domain tags, desired output type) for the pattern RAG | {query, filters, must_have, exclude, top_k}
	12.	07_RAG_Retrieve_Candidate_Patterns | {query, filters} | Hybrid retrieval against pattern index (semantic + keyword), return candidate patterns w/ metadata/snippets | Candidate list {pattern_name, description, tags, prompt_snippet, score}
	13.	08_Pattern_Select_And_Plan_Custom | Routing context + candidate list | LLM selects best pattern(s) + ordering; emits execution plan with inputs, chunking rules, and stop conditions | Deterministic plan JSON {steps:[{pattern, inputs, chunking, expected_output}]}
	14.	09_Execute_Pattern_Plan | Plan + original transcript/segments + metadata | Execute Fabric patterns per plan (sequential or DAG), manage chunking/session strategy | Per-step raw outputs + execution logs
	15.	10_Postprocess_Quality_Gate | Raw outputs + routing context | Normalize formatting, enforce schemas, optional self-check pass (custom), attach provenance (video URL, timestamps) | Final artifacts (MD/JSON) + QC flags
	16.	11_KM_Save_And_Index | Final artifacts + metadata + km mapping | Write into KM system (vault/db), add frontmatter, backlinks, IDs; generate embeddings for retrieval | Persisted note(s)/records + index IDs
	17.	12_Observability_Audit | Logs, costs, pattern choices, QC flags | Persist run telemetry, failures, pattern-performance stats for iteration | Run record for analytics + debugging
	18.	99_Pattern_Library_Sync (scheduled/system) | Fabric repo patterns + your custom patterns | Pull/update pattern sources, generate metadata/embeddings, version snapshots | Updated pattern RAG index (supports retrieval in node 07)

3. Questions / gaps to address
	1.	Transcript availability & fallback: What is the fallback when YouTube transcripts are unavailable/poor (Whisper, external ASR, or skip)?
	2.	Chunking strategy: What are the rules for splitting long transcripts (by tokens, timestamps, semantic boundaries), and how do you preserve global context?
	3.	Session vs stateless calls: Do you want Fabric/LLM calls to share a session/context across chunks, or be stateless with a merge step?
	4.	Determinism requirements: What must be strictly deterministic (e.g., temperature=0, fixed top_k, stable filters) vs allowed probabilistic behavior?
	5.	Pattern metadata schema: What metadata must be stored for each pattern in RAG (domains, supported media, input requirements, output schema, cost profile)?
	6.	Pattern descriptions: How will you generate/maintain human-usable + model-usable pattern descriptions (manual vs auto-summarized from system.md)?
	7.	KM taxonomy definition: What is the authoritative list of KM “areas”, and what are the mapping rules (single vs multi-label, hierarchical)?
	8.	Domain confidence thresholds: What confidence cutoff routes to “default/general” processing vs “domain-specific” processing?
	9.	Output formats: What are the required output schemas for KM ingestion (Obsidian frontmatter, JSON for DB, both)?
	10.	Quality gates: What checks determine “good enough” (coverage, coherence, hallucination risk, missing sections, timestamp coverage)?
	11.	Pattern sequencing rules: When should multiple patterns run (pipeline) vs single pattern (one-shot)?
	12.	Human-in-the-loop: Where do you want optional approvals/overrides (pattern selection, taxonomy mapping, final publish)?
	13.	Playlist rollups: Should playlists be processed per-video then aggregated, or treated as one corpus? How do you represent cross-video summary?
	14.	Security & privacy: Do you need PII detection/redaction before sending text to certain vendors/models?
	15.	Evaluation harness: How will you measure/compare routing decisions (gold labels, regression tests, spot-check sampling)?
	16.	Failure handling: Retry logic, vendor/model fallback, partial outputs, and circuit breakers (token/cost ceilings).
	17.	Pattern lifecycle: How will you version/freeze patterns (commit hash snapshots) to avoid drift impacting repeatability?
	18.	Multi-media extensibility: What must be abstracted as a “media adapter” interface (transcript extraction, metadata normalization, timestamp model)?

4. Assumptions implied by the description/architecture
	1.	You can reliably extract a usable transcript + metadata via yt-dlp (or equivalent) for most target videos.
	2.	Baseline analysis outputs (summary, micro-summary, insights, chapters) are sufficient context for robust routing.
	3.	A pattern library stored in a RAG index provides better control/scale than hardcoding pattern-selection logic.
	4.	Patterns can be treated as “tools” with discoverable intent via name + prompt content + derived metadata.
	5.	Hybrid retrieval (semantic + keyword) will produce a manageable candidate set (top_k) for deterministic selection.
	6.	The routing/selection LLM steps can be constrained enough (schema outputs, low temperature, rubric) to be repeatable.
	7.	Your KM taxonomy is stable enough to encode as rules/examples in a custom domain-mapping pattern.
	8.	The system will need chunking and/or staged summarization for long transcripts to fit model context limits.
	9.	Fabric patterns are the primary mechanism for “analysis behaviors,” while Python/n8n orchestrate control flow.
	10.	Downstream KM ingestion benefits from structured outputs (frontmatter + links + timestamps), not just prose.
	11.	Pattern execution quality is acceptable across chosen models/vendors, or you will enforce model selection per step.
	12.	You will maintain a small number of custom patterns (routing, taxonomy mapping, query generation) that are specific to your KM system.

⸻

Document 2 — Expected Fabric Pattern Set for the YouTube Workflow

Below are the patterns that are likely needed to implement the workflow above (baseline extraction + routing + deeper analysis). For each: brief summary + whether it exists in the Fabric repo.

1. Baseline “always run” patterns (YouTube transcript → context)
	•	summarize (Exists in repo: Yes) — Produces a general-purpose summary suitable for humans and for downstream routing context. Use as the default “medium summary” output.  ￼
	•	create_micro_summary (Exists in repo: Yes) — Produces a very short gist used for fast classification/routing and for compact KM previews. Useful when token budget is tight.  ￼
	•	extract_wisdom (Exists in repo: Yes) — Extracts structured insights/takeaways (can function as your “key points” extractor initially). Good default for “what matters” distillation from transcripts.  ￼
	•	create_video_chapters (Exists in repo: Yes) — Generates topic/chapter structure (ideally with timestamps) to support navigation, chunking, and more targeted downstream patterns.  ￼

2. Optional baseline “quality / verification” pattern
	•	analyze_claims (Exists in repo: Yes) — Identifies and evaluates claims; useful for news/politics/health/finance videos or any content where factuality checks matter before KM capture.  ￼

3. Output-shaping / utility patterns (useful for building + maintaining your system)
	•	create_5_sentence_summary (Exists in repo: Yes) — Produces a strict short summary format (useful as a routing input, KM preview, or regression-test artifact for consistency).  ￼
	•	improve_prompt (Exists in repo: Yes) — Useful during iteration: refine your custom routing/taxonomy patterns by improving clarity/structure of prompts and enforcing Fabric’s prompt style.  ￼

4. Patterns referenced historically that appear missing/renamed
	•	video_summarize_micro (Exists in repo: No at expected path) — Referenced in issues/discussions as a “short video summary” pattern, but not found at data/patterns/video_summarize_micro/system.md in the current repo structure. Treat as deprecated/renamed until located.  ￼

5. Custom patterns you will likely need (not in upstream Fabric)

These are the “control-plane” patterns that make routing repeatable and KM-specific.
	•	km_domain_area_mapper (Custom: Not in repo) — Classifies the transcript into your KM domains/areas (multi-label + confidence) using your taxonomy and examples; outputs strict JSON for downstream automation.
	•	pattern_rag_query_generator (Custom: Not in repo) — Given routing context, produces a search query + filters (domain, media-type, output schema) to retrieve candidate patterns from your pattern RAG index.
	•	pattern_router_and_plan (Custom: Not in repo) — Consumes routing context + candidate pattern list and outputs an execution plan (selected pattern(s), order, inputs, chunking strategy, expected outputs).
	•	km_note_formatter (Custom: Not in repo) — Converts final outputs into your KM note format (frontmatter fields, backlinks, tags, source URL, timestamps, IDs), minimizing post-processing code.
	•	output_quality_gate (Custom: Not in repo) — Validates outputs against required sections/schemas and flags missing elements; can output “PASS/FAIL + reasons + fix instructions” for automated retries.
	•	pattern_metadata_summarizer (Custom: Not in repo) — Generates short descriptions/tags for patterns (both built-in and your custom ones) to populate the pattern RAG store and improve retrieval quality.

6. Notes on where “patterns live” in the repo

The Fabric repo’s README shows patterns stored as markdown prompts and provides an example pointing to data/patterns/.../system.md and example usage of patterns like summarize, analyze_claims, and running extract_wisdom against YouTube with -y.  ￼