# architecture.md

# AI Output Trust & Reliability Platform

## Detailed System Architecture (Gemini-Style Workspace UX)

Version: MVP v1
Architecture Style: AI Workspace + Evaluation Sidebar
Frontend Paradigm: Gemini-like Conversational Workspace
Backend Paradigm: Modular Evaluation Infrastructure

---

# 1. Product Vision

## Objective

Build an AI workspace where users:

1. interact with a primary LLM
2. generate responses normally
3. optionally inspect trust & reliability analysis
4. open an expandable evaluation sidebar
5. explore assumptions, hallucinations, logic flaws, calibration, and reliability metrics

The system acts as:

# “Trust & Judgment Layer for LLM Outputs”

---

# 2. UX Philosophy

The platform should feel like:

* Gemini
* Claude
* Cursor
* Perplexity

where:

* chat interaction is primary
* evaluation is secondary
* analysis is layered
* users progressively inspect details

---

# 3. UX Architecture

# 3.1 Main Workspace Layout

```text id="2wdhlu"
┌────────────────────────────────────────────────────────────┐
│                         TOP NAV                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                                                            │
│                    MAIN CHAT AREA                          │
│                                                            │
│  User Prompt                                               │
│                                                            │
│  AI Generated Output                                       │
│                                                            │
│  [ Output Eval ]                                           │
│                                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

# 3.2 Evaluation Sidebar Layout

When user clicks:

```text id="4jpkgi"
[ Output Eval ]
```

Right evaluation panel opens:

```text id="jup1d3"
┌──────────────────────────────┐
│ Trust Dashboard              │
├──────────────────────────────┤
│ Overall Reliability          │
│ Hallucination Risk           │
│ Logic Quality                │
│ Calibration                  │
├──────────────────────────────┤
│ Tabs                         │
│                              │
│ [Overview]                   │
│ [Assumptions]                │
│ [Hallucinations]             │
│ [Logic]                      │
│ [Bias]                       │
│ [Judge]                      │
│ [Calibration]                │
│ [Citations]                  │
└──────────────────────────────┘
```

---

# 4. High-Level System Architecture

```text id="2x3h8n"
┌────────────────────────────────────────────┐
│                Frontend App                │
│                                            │
│  - Chat Workspace                          │
│  - Model Selector                          │
│  - Response Viewer                         │
│  - Evaluation Sidebar                      │
│  - Segment Highlighting                    │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│               Backend API                  │
│                                            │
│  - Request Orchestrator                    │
│  - Evaluation Framework                    │
│  - Evaluator Pipeline                      │
│  - Aggregation Engine                      │
│  - Cache Layer                             │
│  - Report Generator                        │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│                 AI Layer                   │
│                                            │
│  Main Models                               │
│  - Claude                                  │
│  - Gemini                                  │
│  - GPT                                     │
│                                            │
│  Evaluator Models                          │
│  - Trust Evaluator                         │
│  - Judge Models                            │
│  - Assumption Extractor                    │
│  - Hallucination Evaluator                 │
└────────────────────────────────────────────┘
```

---

# 5. Core Architectural Principles

# 5.1 Workspace-First Design

Primary experience:

* conversation
* prompting
* AI generation

Secondary experience:

* reliability analysis

---

# 5.2 Evaluation-As-Layer

The evaluation system must behave as:

* optional
* expandable
* contextual

NOT:

* overwhelming
* dashboard-heavy

---

# 5.3 Modular Intelligence System

Each evaluator:

* isolated
* replaceable
* versioned
* benchmarkable

---

# 5.4 Deterministic Evaluation

Evaluation must minimize randomness.

Use:

* structured rubrics
* strict JSON schemas
* evaluator versioning
* low temperature

---

# 6. Frontend Architecture

# 6.1 Frontend Stack

| Component  | Technology     |
| ---------- | -------------- |
| framework  | Next.js        |
| language   | TypeScript     |
| styling    | TailwindCSS    |
| animations | Framer Motion  |
| state      | Zustand        |
| fetching   | React Query    |
| markdown   | react-markdown |
| charts     | Recharts       |
| icons      | Lucide         |

---

# 6.2 Frontend Modules

```text id="p0fcfe"
Frontend
│
├── Workspace Layout
├── Chat Interface
├── Prompt Composer
├── Model Selector
├── Response Renderer
├── Evaluation Sidebar
├── Segment Inspector
├── Report Explorer
├── Attention Highlights
└── Settings Manager
```

---

# 6.3 Workspace Layout

## Responsibilities

* manage responsive layout
* handle sidebar open/close
* orchestrate global state

---

# 6.4 Chat Interface

## Responsibilities

* render conversations
* stream responses
* manage prompts
* maintain session state

---

# 6.5 Model Selector

## Supported Models

| Provider  | Models |
| --------- | ------ |
| Anthropic | Claude |
| OpenAI    | GPT    |
| Google    | Gemini |

---

# 6.6 Response Renderer

## Responsibilities

Render:

* markdown
* code blocks
* citations
* highlighted sections

---

# 6.7 Evaluation Sidebar

## Responsibilities

Display:

* trust summary
* reliability metrics
* evaluator outputs
* reports
* segment analysis

---

# 6.8 Segment Inspector

## Purpose

Inspect:

* local reliability
* logic flaws
* unsupported claims
* calibration mismatches

---

# 6.9 Attention Highlight System

## Purpose

Highlight:

* risky sections
* speculative claims
* unsupported reasoning

---

# Example

```text id="s79yjh"
This financial projection assumes unrealistic growth.
```

Highlighted:

* orange
* clickable

---

# 7. Backend Architecture

# 7.1 Backend Stack

| Layer      | Technology |
| ---------- | ---------- |
| runtime    | Node.js    |
| framework  | Fastify    |
| validation | Zod        |
| queue      | BullMQ     |
| cache      | Redis      |
| db         | PostgreSQL |
| deployment | Docker     |

---

# 7.2 Backend Modules

```text id="1r8mbw"
Backend
│
├── API Gateway
├── Request Orchestrator
├── Segmentation Engine
├── Evaluation Framework Layer
├── Evaluator Manager
├── Aggregation Engine
├── Scoring Engine
├── Report Generator
├── Cache Manager
└── Model Router
```

---

# 8. Request Flow

# 8.1 Generation Flow

```text id="wwjlwm"
User Prompt
        ↓
Main Model Request
        ↓
LLM Response
        ↓
Response Rendered
```

---

# 8.2 Evaluation Flow

```text id="igqvhl"
User clicks "Output Eval"
        ↓
Cache Lookup
        ↓
If cached:
    return cached report

Else:
    run evaluation pipeline
        ↓
Store evaluation
        ↓
Render sidebar
```

---

# 9. Evaluation Framework Layer

# MOST IMPORTANT COMPONENT

This layer stabilizes evaluations.

---

# 9.1 Responsibilities

Defines:

* metric definitions
* evaluation rubrics
* thresholds
* scoring logic
* schemas
* evaluator configs

---

# 9.2 Why This Layer Exists

Without it:

* evaluators drift
* scores fluctuate
* judges become inconsistent

---

# 9.3 Example Rubric

## Hallucination Rubric

| Level  | Definition                       |
| ------ | -------------------------------- |
| LOW    | grounded claims                  |
| MEDIUM | some unverifiable content        |
| HIGH   | fabricated or unsupported claims |

---

# 9.4 Evaluator Versioning

Each evaluator must support versions.

Example:

```text id="3xok0u"
hallucination_v1
logic_v2
trust_v3
```

Critical for reproducibility.

---

# 10. Segmentation Engine

# Purpose

Break outputs into:

* claims
* paragraphs
* logical sections
* reasoning chains

---

# Segment Types

| Type           | Example    |
| -------------- | ---------- |
| factual        | statistics |
| reasoning      | analysis   |
| recommendation | advice     |
| speculative    | forecasts  |
| emotional      | empathy    |

---

# 11. Evaluator Modules

All evaluators operate independently.

---

# 11.1 Trust Evaluator

## Purpose

Generate:

* overall reliability
* risk summaries
* trust categorization

---

# 11.2 Assumption Extractor

## Purpose

Infer:

* hidden assumptions
* dependencies
* unstated conditions

---

# 11.3 Hallucination Analyzer

## Purpose

Detect:

* fabricated claims
* unsupported assertions
* unverifiable references

---

# 11.4 Logic Analyzer

## Purpose

Identify:

* contradictions
* unsupported conclusions
* causal gaps
* weak reasoning

---

# 11.5 Calibration Analyzer

## Purpose

Check whether:

* certainty matches evidence strength

---

# 11.6 Bias & Fairness Analyzer

## Purpose

Evaluate:

* demographic bias
* framing bias
* cultural assumptions
* unfair generalizations

---

# 11.7 Citation Analyzer

## Purpose

Analyze:

* citation presence
* source quality
* unsupported references

---

# 11.8 Task Alignment Analyzer

## Purpose

Determine:

* whether user intent was fulfilled
* missing deliverables

---

# 11.9 Empathy Analyzer

## Purpose

Evaluate:

* tone
* emotional appropriateness
* sensitivity

---

# 11.10 LLM-as-a-Judge

## Purpose

Meta-evaluation for:

* coherence
* completeness
* usefulness
* clarity

---

# Important

Judge outputs are:

* probabilistic
* advisory
* non-authoritative

---

# 12. Aggregation Engine

# Purpose

Combine:

* evaluator outputs
* heuristics
* scoring signals

into:

* final reliability assessment

---

# Example

```text id="u5mxan"
Logic: HIGH
Hallucination: MEDIUM
Calibration: LOW

→ Overall Reliability: MEDIUM
```

---

# 13. Cache Architecture

# VERY IMPORTANT

Prevents:

* repeated API costs
* unnecessary evaluations

---

# 13.1 Cache Key

```text id="4yjpd7"
hash(
  prompt +
  response +
  evaluator_version
)
```

---

# 13.2 Cache Flow

```text id="9q6o4r"
Evaluation Request
        ↓
Hash Generated
        ↓
Cache Lookup
        ↓
Cache Hit:
    return cached result

Cache Miss:
    run evaluators
```

---

# 14. Scoring System

# 14.1 Philosophy

Avoid fake precision.

Prefer:

* LOW
* MEDIUM
* HIGH

---

# 14.2 Scoring Dimensions

| Metric        | Meaning            |
| ------------- | ------------------ |
| trust         | reliability        |
| logic         | reasoning quality  |
| hallucination | unsupported claims |
| calibration   | confidence realism |
| fairness      | bias risk          |
| empathy       | emotional quality  |

---

# 15. Log Probability Support

# Optional Advanced Feature

Supported for:

* Gemini
* OpenAI
* selected APIs

---

# Purpose

Use log probabilities for:

* uncertainty estimation
* ambiguity heatmaps
* low-confidence highlighting

---

# Important

Logprobs:

* are NOT truth confidence
* only token certainty indicators

---

# 16. Chain-of-Thought Handling

# IMPORTANT

True hidden chain-of-thought:

* NOT accessible
* intentionally hidden by providers

---

# Supported Alternative

## Simulated Reasoning Reconstruction

Example:

```text id="lq9k6f"
Likely reasoning flow:
1. problem decomposition
2. comparative analysis
3. probabilistic estimation
```

---

# 17. Database Design

# MVP Database

| Purpose   | Technology |
| --------- | ---------- |
| users     | PostgreSQL |
| sessions  | PostgreSQL |
| cache     | Redis      |
| analytics | PostgreSQL |

---

# 18. Security & Privacy

# Principles

Users may input:

* sensitive prompts
* business data
* private content

---

# Required Controls

```text id="5n3qln"
[✓] Store Sessions
[✓] Cloud Evaluation
[ ] Local-Only Mode
```

---

# 19. Performance Optimization

# Strategies

* aggressive caching
* evaluator batching
* parallel evaluator execution
* debounce evaluations
* chunk large responses

---

# 20. Error Handling

# Required Handling

* evaluator failures
* malformed outputs
* partial analysis failures
* API timeouts
* rate limits

---

# 21. Future Roadmap

# Phase 2

## Browser Extension

Integrate:

* Claude
* Gemini
* ChatGPT

---

# Phase 3

## Consensus Evaluation

```text id="ojymqq"
Claude Judge
+
GPT Judge
+
Gemini Judge
```

---

# Phase 4

## Real-Time Verification

* web retrieval
* citation validation
* live fact checking

---

# Phase 5

## Enterprise Governance

* evaluation analytics
* policy enforcement
* audit systems

---

# 22. Development Roadmap

# Phase 1

Core workspace UI.

---

# Phase 2

Generation pipeline.

---

# Phase 3

Evaluation framework layer.

---

# Phase 4

Evaluator modules.

---

# Phase 5

Aggregation engine.

---

# Phase 6

Trust dashboard.

---

# Phase 7

Segment highlighting.

---

# Phase 8

Caching & optimization.

---

# 23. Final System Definition

```text id="jlwmr5"
An AI Workspace Platform that enables users to
generate responses using multiple LLM providers
and inspect structured trust, reasoning, hallucination,
calibration, fairness, and reliability analysis through
an expandable Gemini-style evaluation sidebar.
```
