Here are the two requested markdown documents to structure your Fabric analysis workflow.
Document 1: Workflow Framework & Architecture
1. Logical Outline / Structure
1.1 Summary of Objective
The objective is to build a scalable, automated framework that ingests media (starting with YouTube), performs a preliminary "triage" analysis to understand the content's domain and structure, and then uses an LLM to dynamically select and execute the most appropriate Fabric analysis patterns. This creates a "Smart Agent" that decides how to analyze a video based on what the video actually is, rather than running a static set of prompts on everything.
1.2 List of Stages/Steps in the Analysis
| Node Name | Expected Input | Operations / Functions | Expected Output |
|---|---|---|---|
| Ingest Media | YouTube URL | Run yt-dlp to extract metadata (title, channel, duration) and download the transcript (VTT/JSON). | media_metadata (JSON), raw_transcript (Text) |
| Parallel Analysis: Summary | raw_transcript | Execute Fabric Pattern: summarize. | content_summary (Text) |
| Parallel Analysis: Key Points | raw_transcript | Execute Fabric Pattern: extract_wisdom (or similar). | key_points (Text) |
| Parallel Analysis: Domain Map | raw_transcript, content_summary | Execute Custom Pattern: map_to_km (Classify content against KM taxonomy). | domain_classification (JSON/Text) |
| Context Aggregation | Outputs from previous 3 nodes + media_metadata | Concatenate all triage data into a single context object. | triage_context (Text block) |
| RAG Query Generation | triage_context | Execute Custom Pattern: generate_rag_query. Asks LLM to formulate a search string for the Pattern Database based on the triage context. | pattern_search_query (String) |
| Pattern Retrieval | pattern_search_query | Query Vector/RAG Database of Fabric Patterns. | candidate_patterns_list (List of Pattern Names + Descriptions) |
| Decision Engine (Selector) | triage_context, candidate_patterns_list | Execute Custom Pattern: decide_pattern_path. Asks LLM to review the context and available candidates, then select the best pattern(s) to run. | selected_patterns (JSON Array of Pattern Names) |
| Execution Router | selected_patterns, raw_transcript | Loop/Map over selected_patterns and trigger the specific Fabric calls. | analysis_results (Array of Text Outputs) |
| Final Synthesis | analysis_results | Combine all outputs into a final formatted Markdown report or JSON payload for the KM system. | final_artifact (Markdown/JSON) |
2. Questions / Gaps in Knowledge
 * RAG Granularity: How granular should the pattern descriptions in the RAG be? (e.g., Should we index the entire system.md of the pattern or just a curated meta-description?)
 * Context Window Limits: For extremely long videos (1hr+), the transcript might exceed the context window of the "Triage" or "Decision" LLM. Do we need an intermediate chunking strategy before the preliminary summary?
 * Feedback Loop: If the "Decision Engine" selects a pattern that produces poor output, is there a mechanism for the user to flag this so the RAG/Decision logic improves?
 * Taxonomy Source: Where does the "KM System Areas" list live? Does it need to be hardcoded into the map_to_km pattern, or can it be dynamically injected from an external database?
3. List of Assumptions
 * Transcript Availability: We assume the YouTube video has a transcript (auto-generated or manual). If not, we assume a "fail" state or need a Whisper audio-to-text fallback node.
 * Statelessness: We assume each video analysis is independent (the system does not need to know about the previous video processed to decide on the current one).
 * Pattern Independence: We assume patterns can be run meaningfully on the raw transcript alone without requiring external internet access (unless the pattern specifically uses a tool like search).
 * JSON Output Reliability: We assume the LLM can reliably output JSON for the "Decision Engine" node to allow programmatic routing in n8n/Python.
Document 2: Fabric Pattern Requirements
1. List of Fabric Patterns
1. summarize
 * Summary: Produces a high-level summary of the input text. Used in the "Triage" phase to give the Decision Engine a general understanding of the content.
 * Exists in Repo: Yes (Standard Fabric pattern).
2. extract_wisdom
 * Summary: Extracts key insights, quotes, and actionable takeaways from the content. Used in the "Triage" phase to highlight the density and type of information (e.g., conceptual vs. tactical).
 * Exists in Repo: Yes (Standard Fabric pattern).
3. map_to_km (Domain Mapper)
 * Summary: Analyzes the content and maps it to a specific area of your Personal Knowledge Management (KM) system (e.g., "Coding," "Health," "Finance"). Needs your specific KM taxonomy as part of the system prompt.
 * Exists in Repo: No (Custom pattern required).
4. generate_rag_query
 * Summary: Analyzes the triage context (summary + metadata) and generates a semantic search query optimized for a Vector DB to find relevant analysis patterns.
 * Exists in Repo: No (Custom pattern required).
5. decide_pattern_path (The Selector)
 * Summary: Acts as the "Router." Takes the triage context and the list of candidate patterns from RAG, then outputs a JSON list of the specific patterns that should be executed.
 * Exists in Repo: No (Custom pattern required).
6. analyze_tech_video (Example Specific Pattern)
 * Summary: A deep-dive analysis for technical tutorials, extracting code snippets, installation steps, and configuration requirements.
 * Exists in Repo: Maybe (Similar to extract_instructions or analyze_code, but likely needs a custom blend for video tutorials).
7. analyze_presentation (Example Specific Pattern)
 * Summary: Focuses on extracting the thesis, supporting arguments, and slide content from a spoken presentation or keynote.
 * Exists in Repo: Yes (Patterns like analyze_presentation or extract_article_wisdom often exist or cover this).
To help you visualize how existing patterns function within a workflow like this, this video demonstrates the practical application of summarize and extract_wisdom on video transcripts.
AI Productivity Lab Demo 9 | fabric summarize, extract_wisdom
This video is relevant because it shows the exact "Triage" steps (summarize and extract_wisdom) being run on a transcript, which is the foundational first step in your proposed architecture.
