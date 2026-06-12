# AI Output Trust & Reliability Platform

An interactive conversational workspace that serves as a **"Trust & Judgment Layer for LLM Outputs"**. It evaluates and inspects generative AI responses in real-time for hallucinations, logical flaws, hidden assumptions, and calibration errors, presenting visual cues and detailed evaluations using a Material Design/Gemini-inspired interface.

---

## 🚀 Key Features

* **Dual-Pane Conversational Workspace**: A seamless Gemini-like chat interface alongside an expandable **Evaluation Sidebar** for progressive disclosure of reliability metrics.
* **Granular Text Highlighting**: Highlight critical spans of LLM responses using category-specific visual indicators (Red for factual contradictions, Indigo for logic errors, and Amber for high-risk assumptions).
* **Multi-Dimensional Reliability Audit**: Automatically evaluates:
  * **Overall Reliability**: A holistic evaluation classification (LOW, MEDIUM, HIGH) with dynamic score aggregation.
  * **Assumption Extractor**: Infers hidden assertions, dependencies, and unstated conditions.
  * **Hallucination Risk**: Identifies fabricated, unsupported, or unverifiable claims.
  * **Logic Quality**: Evaluates contradictions, causal gaps, and reasoning strength.
  * **Calibration & Certainty**: Compares output confidence with actual evidence support.
  * **Bias & Fairness**: Detects framing or demographic bias.
  * **Citation Quality**: Inspects presence and accuracy of reference links.
* **Simulated Reasoning (Chain-of-Thought)**: Reconstructs and visualizes the likely step-by-step reasoning flow of the generative model.
* **Cache Engine**: Optimizes API costs and latency by caching evaluations using SHA-256 hashes generated from the prompt, response, and evaluator configuration.
* **Deterministic Safety Overrides**: Downgrades reliability assessments automatically if severe errors (like factual contradictions) are detected.
* **Multi-User Context Isolation**: Secure login gates supporting Google Authentication and Anonymous Guest mode, connected to Supabase backend storage.

---

## 🛠️ Technology Stack

| Layer | Component | Technology |
| :--- | :--- | :--- |
| **Frontend** | Framework | Next.js (App Router, TypeScript) |
| | State Management | Zustand |
| | Query Fetching | React Query (TanStack) |
| | Styling & Animation | TailwindCSS, Framer Motion |
| | Fonts & Icons | Google Outfit, Lucide React |
| | Visualizations | Recharts, React Markdown |
| **Backend** | Runtime & Server | Node.js, Fastify (TypeScript) |
| | LLM SDK | `@google/genai` (utilizing `gemini-2.5-flash`) |
| | Database & Auth | Supabase Client (RLS-bypass via Service Role) |
| | Validation | Zod |
| | Caching | SHA-256 In-Memory Cache |

---

## 📁 Repository Structure

```text
anti_ai_app/
├── frontend/                # Next.js web client
│   ├── src/
│   │   ├── app/             # App router pages (Login, Dashboard, Chat)
│   │   ├── components/      # UI components (Sidebar, Highlighting, Popovers)
│   │   ├── store/           # Zustand state configuration
│   │   └── tests/           # Frontend unit & store tests
│   └── package.json
├── backend/                 # Fastify HTTP server & evaluation engines
│   ├── src/
│   │   ├── database/        # Local JSON database & Supabase interfaces
│   │   ├── engines/         # Segmenters, cache, and LLM-as-a-judge evaluators
│   │   ├── tests/           # Integration & Phase-wise verification tests
│   │   └── server.ts        # Fastify application routes
│   └── package.json
├── architecture.md          # Architectural specifications
├── project_log.txt          # Detailed phase-wise development log
└── rules.md                 # Development & testing guidelines
```

---

## ⚙️ Installation & Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* Google Gemini API Key
* Supabase Project URL and API Keys

### 1. Configure Environment Variables

#### Backend Configuration
Create a `.env` file inside the `backend/` directory:
```env
PORT=3001
HOST=0.0.0.0

# Gemini API Credential
GEMINI_API_KEY=your_gemini_api_key_here

# Model Routing Setup
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EVAL_MODEL=gemini-2.5-flash

# Supabase Credentials (RLS bypass via Service Role key)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### Frontend Configuration
Create a `.env` file inside the `frontend/` directory:
```env
# API Server Base Path
NEXT_PUBLIC_API_BASE=http://localhost:3001/api

# Supabase Web Client Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

### 2. Install Dependencies & Run Development Servers

#### Setup & Start Backend
Open a terminal in the root directory and execute:
```bash
cd backend
npm install
npm run dev
```
The server will start listening at `http://localhost:3001`.

#### Setup & Start Frontend
Open a separate terminal and execute:
```bash
cd frontend
npm install
npm run dev
```
The Next.js client will start at `http://localhost:3000`.

---

## 🧪 Testing

The repository includes structured automated unit and integration tests across the frontend and backend layers.

### Run Backend Tests
Run the test suites targeting model routing, segmentation, database logs, and caches:
```bash
cd backend
npm run test
```

### Run Frontend Tests
Validate Zustand state updates, message pipelines, and component mounting behaviors:
```bash
cd frontend
npm run test
```
