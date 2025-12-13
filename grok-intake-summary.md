Workflow and System Outline
1. Summary of objective/purpose
Build extensible framework using Fabric patterns for repeatable LLM-based analysis of YouTube videos/media: extract transcript/metadata, generate summaries/key points/domain mappings, select optimal patterns via RAG/LLM, execute for outputs. Operationalize via Python/n8n for multi-media extensibility.
2. List of stages/steps in the analysis
	•	Input Node: Expected input: YouTube URL/playlist. Operations: YT-dlp fetch. Expected output: Transcript + metadata (title, duration, tags).
	•	Parallel Processing Node: Expected input: Transcript. Operations: Run Fabric summarize, key_points, domain_mapping patterns. Expected output: Summary, key points list, domain/area tags.
	•	Context Aggregation Node: Expected input: Summary + key points + domain + metadata. Operations: Compile into context bundle. Expected output: Unified context document.
	•	Pattern Suggestion Node: Expected input: Context bundle. Operations: LLM with multi-shot prompt generates RAG query; semantic/keyword search RAG DB for patterns. Expected output: Candidate patterns list.
	•	Pattern Selection Node: Expected input: Candidate patterns + context. Operations: LLM evaluates/selects best pattern(s). Expected output: Selected pattern ID(s).
	•	Execution Node: Expected input: Original transcript + selected pattern(s) + context. Operations: Run Fabric pattern(s) on input. Expected output: Final analyzed outputs (e.g., insights, classifications).
	•	Output Node: Expected input: Final outputs. Operations: Store/format for KM integration. Expected output: Processed media artifact.
3. List of questions/gaps
	•	How to structure RAG DB schema for patterns (e.g., metadata fields for search)?
	•	Optimal multi-shot examples for pattern suggestion prompt?
	•	Thresholds for pattern selection (e.g., confidence scores)?
	•	Handling multi-pattern chains/dependencies?
	•	Integration points for n8n/Python (e.g., API calls to Fabric)?
	•	Scalability for long transcripts (chunking)?
	•	Evaluation metrics for pattern accuracy?
4. List of assumptions
	•	Fabric CLI/API accessible via Python/n8n.
	•	RAG DB (e.g., vector store) supports hybrid search.
	•	LLM handles context windows for aggregated inputs.
	•	Custom patterns follow Fabric MD template.
	•	Media inputs yield extractable transcripts/metadata.
	•	Single-video focus extensible to playlists via batching.
Fabric Patterns List
	•	summarize: Condenses input to core sentence, bullet points, takeaways in Markdown. Exists: Yes.
	•	key_points: Extracts main ideas, themes, actionable items from transcript. Exists: No (custom).
	•	domain_mapping: Classifies content to KM areas/domains with relevance scores. Exists: No (custom).
	•	suggest_pattern: Generates RAG query from context to retrieve relevant patterns. Exists: Yes (adapt for RAG integration).
	•	pattern_selector: Evaluates candidates against context; selects/ranks optimal patterns. Exists: No (custom).
