I need your help setting up a heuristic and/or set of rules to determine fabric patterns to run against YouTube videos and other media. We'll start with a structure for YouTube videos. The intent of this thread is to analyze, and build out the framework for the analysis. Once we have the framework built and the initial set of deliverables populated, we can begin to iterate on / populate the rules/heuristics needed to enable a series of LLM calls/agents to evaluate, decide, and execute

The intent of the effort is to build a set of rules that can be provided to a large language model to enable repeatable decision making. Note, this is likely going to be operationalized using a combination of Python scripts and n8n. Once we have a working framework and the derived workflow, we will implement the workflow for other media/inputs, so the framework needs to be extensible and as simple as possible.

Here is the approach/structure/framework that I am thinking of. First, a playlist or a single video is processed by YT-dlp (this step is media format specific, but will essentially take the form of an input note to the workflow, and we will change the structure of the input node as media formats change) to pull the transcript and metadata. The transcript is presented to Fabric in multiple parallel requests. One to use the summarize pattern. Another to use a pattern to identify key points. Another to identify the domain and mapping to our KM system’s areas(the key points and domain/area mapping are likely going to be custom patterns). After those are done, the outputs of those operations will be provided to fabric with a pattern (I’m pretty sure this one will be custom) that asks the LLM to evaluate the available context and pick the best pattern and path to run on the input.

To keep things simple and repeatable, I'm thinking we should set up some sort of a system where all the patterns are stored in a RAG database and can be searched using semantic and keyword search methods based on an input prompt. The structure of the input prompt/system-prompt and supporting logic is something we will need to evaluate. What I'm thinking about is to have the summaries, the domain/area, and the associated metadata presented to a large language model along with a system prompt that has multi-shot examples where it asks it to evaluate all of that context and then provide a search query for the RAG based on the context that will return a list of patterns from the RAG database. A new call for a large language model will then be made to have it evaluate the input context and then select the pattern or patterns that are most appropriate to run against the input media. Once that decision is made a new query will be run using the selected fabric pattern or patterns against the original input media and any necessary additional context to produce the final output.

Requested outputs from this discussion: 
## 1. Markdown document containing 
### 1. a logical outline/ structure for the workflow and system
#### 1. Summary of objective/purpose
#### 2. List of stages/steps in the analysis
Each line in the list should cover: node name, expected input, operations/functions, expected output. Do not attempt to build / populate each node/workflow/script. Just provide a high-level outline that we can use as a guide/checklist for development
### 2. A list of questions / gaps in our knowledge or the plan that will need to be addressed/filled to complete the effort
### 3. A list of assumptions implied by the description and architecture

## 2. a markdown document containing
### 1. a list of the fabric patterns that we expect to need in this workflow
#### 1. For each pattern, provide a brief (2-3) line max summary of what it will need to support/perform
#### 2. Identify if the pattern exists in the GitHub repository (https://github.com/danielmiessler/Fabric)

NOTE: do not attempt to build comprehensive documentation. These are meant to be succinct, concise, brief, methodical outlines and checklists that will be used to guide the rest of our discussion and work.
