# Voice Agent Architecture

[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Hexagonal%20%2F%20Clean-emerald)](./docs/architecture.md)
[![Testing](https://img.shields.io/badge/Tests-Vitest%20(336%2B%20Passing)-brightgreen)](https://vitest.dev/)
[![Security](https://img.shields.io/badge/Security-Timing--Safe%20Auth%20%7C%20Redacted%20Logs-red)](#13-security-considerations)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A production-grade, spec-driven **Voice AI Agent Runtime** architected with strict **Hexagonal (Ports and Adapters)** principles. This system decouples conversational intelligence, multi-agent orchestration, tool execution, and context retrieval from underlying voice telephony providers (e.g., Vapi, WebRTC gateways) and LLM vendors.

---

## 1. Project Overview

**Voice Agent Architecture** is an enterprise-oriented AI Engineering demonstration that treats voice channels as untrusted interaction adapters rather than the core application. While traditional voice-bot implementations tightly couple agent business logic directly to proprietary telephony SDKs or platform-specific prompt templates, this runtime establishes a resilient backend kernel that owns session state, tool authorization, quality evaluation gates, and end-to-end auditability.

> [!NOTE]
> **Independent Portfolio Showcase**: This repository is an original, independent technical demonstration authored by Leonardo Noriega. The customer-service scenario uses the fictional brand **NOVA Telecom** with synthetic, canned fixtures (`1-555-000-0000`). It is not affiliated with, endorsed by, or deployed for any commercial telecom entity.

The project includes:
- **A bootable Node.js / Fastify runtime** with synchronous inbound webhook adapters and asynchronous tool execution RPC endpoints.
- **Controlled Multi-Agent Orchestrator** supporting deterministic intent routing, hop limits, and specialist context handoffs.
- **Offline Evaluation Gate** running reproducible quality, safety, and security suites before deployment.
- **Persistent Session & Call History** backed by PostgreSQL / Supabase with Row Level Security (RLS) and automatic call-quality evaluation.
- **A companion WebRTC / Voice Demo Frontend** (React 19 + Tailwind CSS) providing live call interaction, real-time waveform visualization, and instant post-call technical scoring.

---

## 2. Problem Statement

Most production voice-agent systems suffer from significant architectural antipatterns:
1. **Vendor Lock-in**: Application logic, tool execution, and prompt templates are locked into a single proprietary voice platform (such as Vapi, Retell, or Bland AI). Switching telephony providers or LLM engines requires a complete rewrite.
2. **Fragile Tool Execution**: Telephony platforms are often given direct, unconstrained access to backend databases or internal APIs without strict schema validation, argument redaction, rate limits, or risk classification.
3. **Lack of Deterministic Governance**: Multi-turn voice agents frequently get trapped in infinite execution loops or hallucinated tool-calling sequences due to absence of step budgets.
4. **No Offline Quality Gates**: Prompt and retrieval changes are deployed directly to production without automated regression testing against known security risks (e.g., prompt injections, boundary bypasses, PII leakage).

---

## 3. Architectural Objectives

- **Strict Hexagonal Separation**: Zero vendor SDK imports inside core domain and application use cases. All third-party providers (LLMs, databases, speech engines, observability tools) are accessed exclusively via TypeScript ports.
- **Controlled Autonomy**: Enforce hard execution budgets (hop counts, step limits, string length caps, timeouts) around probabilistic LLM outputs.
- **Dual Execution Ownership**: Seamlessly toggle between:
  - **Runtime-Owned Reasoning**: Inbound speech transcripts are processed by the runtime's internal LLM loop.
  - **Provider-Owned Reasoning with Tool RPC**: The telephony provider runs the voice conversation loop while delegating authorized function calls securely back to this runtime.
- **Zero-Trust Input Sanitization**: Constant-time authentication, clock skew validation, strictly bounded request bodies, and automatic redaction of sensitive parameters in logs.

---

## 4. Key Features

- **Decoupled Interaction Adapters**: Inbound voice adapter (`POST /adapters/voice/inbound`) and channel tool RPC adapter (`POST /adapters/voice/tools`) supporting Vapi and custom WebRTC providers.
- **Pluggable Model Layer (`LlmPort`)**: Features an in-process deterministic `FakeLlm` for instantaneous zero-cost local testing and CI, alongside an OpenAI-compatible HTTP adapter for production deployments.
- **Robust Tool Governance (`ToolPort`)**: In-process `ToolRegistry` with Zod schema validation, argument length caps (2048 chars), execution timeouts, and allowlist enforcement.
- **Context Retrieval Engine (`RetrievalPort`)**: In-memory cosine similarity retrieval with lexical embedding, readily swappable with pgvector PostgreSQL implementations.
- **Reconstructable Runtime Observability (`ObservabilityPort`)**: Generates distributed `traceId` correlation across HTTP ingress, agent workflows, LLM inferences, retrieval queries, and tool executions.
- **Deterministic Post-Call Quality Scoring**: Automatic evaluation of completed voice calls across four dimensions: **Goal Completion**, **Tool Compliance**, **Guardrail Integrity**, and **Call Latency**.

---

## 5. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Runtime & Language** | Node.js (>= 20.19.0), TypeScript 5.x (Strict Mode, `exactOptionalPropertyTypes`) |
| **HTTP Framework** | Fastify 5.x with native schema validation |
| **Domain Validation** | Zod 3.x / 4.x for strict contract boundary checks |
| **Persistence** | PostgreSQL 16 (pgvector), Supabase Cloud driver, in-memory fallback |
| **Testing & Evaluation** | Vitest 4.x (336+ unit, integration, and architecture boundary tests), Tsx |
| **Frontend Demo UI** | React 19, Vite 7, Tailwind CSS, Radix UI, Lucide Icons, Vapi Web SDK |
| **Containerization** | Docker, Docker Compose (isolated loopback database configuration) |

---

## 6. Architecture Diagram

```mermaid
flowchart TD
    subgraph Clients ["Ingress Channels"]
        Browser["Web Demo UI (React 19)"]
        Telephony["Voice Platform / Vapi Telephony Gateway"]
    end

    subgraph Adapters_Ingress ["Inbound Interaction Adapters"]
        InboundRoute["POST /adapters/voice/inbound\n(Timing-Safe Secret + Skew Check)"]
        ToolsRoute["POST /adapters/voice/tools\n(Channel Tool RPC Gateway)"]
        HealthRoute["GET /health/live | /ready | /voice"]
        SessionsRoute["GET /sessions | /sessions/:id"]
    end

    subgraph Application ["Application Core (Use Cases)"]
        HVT["handleVoiceTurn()"]
        HAT["handleAgentTurn()"]
        HOT["handleOrchestratedTurn()"]
        ETI["executeChannelToolInvocation()"]
        QG["runQualityGate()"]
        Eval["scoreSessionCall()"]
    end

    subgraph Domain ["Domain Model & Ports (Zero Vendor Imports)"]
        Entities["VoiceTurn | VoiceReply | AgentDecision"]
        P_LLM["LlmPort"]
        P_Tool["ToolPort"]
        P_Ret["RetrievalPort"]
        P_Obs["ObservabilityPort"]
        P_Pers["PersistencePort"]
    end

    subgraph Adapters_Egress ["Infrastructure & Vendor Adapters"]
        HttpLLM["HttpLlm / FakeLlm"]
        NativeTools["NativeToolPort (Telco + System Allowlist)"]
        MemRet["InMemoryRetrieval (Cosine Similarity)"]
        JSONLog["LoggingObservability (Structured JSON stdout)"]
        PG["PostgresPersistence / Supabase (RLS Protected)"]
    end

    Browser -->|WebRTC Audio| Telephony
    Browser -->|Fetch Report| SessionsRoute
    Telephony -->|Webhook Transcript| InboundRoute
    Telephony -->|Tool Call RPC| ToolsRoute

    InboundRoute --> HVT
    ToolsRoute --> ETI
    SessionsRoute --> Eval

    HVT --> HAT
    HAT --> P_LLM
    HAT --> P_Tool
    HAT --> P_Ret
    HOT --> P_LLM
    ETI --> P_Tool
    QG --> P_LLM

    P_LLM -.-> HttpLLM
    P_Tool -.-> NativeTools
    P_Ret -.-> MemRet
    P_Obs -.-> JSONLog
    P_Pers -.-> PG
```

---

## 7. Component Descriptions

- **`src/domain/`**: Enterprise core. Defines pure contracts, error envelopes (`ErrorEnvelope`), state transitions, and abstract port interfaces (`llm-port.ts`, `tool-port.ts`, `retrieval-port.ts`, `persistence-port.ts`, `observability-port.ts`). Contains zero framework or database code.
- **`src/application/`**: Business orchestrations.
  - `handle-voice-turn.ts`: Validates inbound session UUIDs, checks idempotency keys, manages lifecycle events (`call_started`, `call_ended`), and coordinates agent reasoning.
  - `handle-agent-turn.ts`: Implements the core agent loop with retrieval grounding, model call retry budget, and output guardrails.
  - `handle-orchestrated-turn.ts`: Orchestrates multi-agent routing between specialized agents (`demo-normalize` and `demo-classify`) with step budgeting.
  - `execute-channel-tool-invocation.ts`: Authorizes external tool requests from voice channels.
  - `score-session-call.ts`: Deterministic four-point call quality evaluation engine.
- **`src/adapters/voice/`**: Mappers translating raw voice platform payloads into domain-safe `VoiceTurn` representations.
- **`src/adapters/tools/`**: `NativeToolPort` and `ToolRegistry` managing registered tools (e.g., text normalization, telecom service queries).
- **`src/adapters/persistence/`**: Durable persistence layer featuring PostgreSQL driver with connection pooling and Supabase client with graceful in-memory fallback.
- **`web/`**: Lightweight interview and demonstration web interface with responsive audio status and post-call diagnostics.

---

## 8. Data and Conversation Flow

### Inbound Voice Conversation Flow (Option A: Runtime Reasoning)
1. **Audio Ingress**: Caller speaks into the microphone; the voice platform synthesizes text via STT.
2. **Webhook Ingress**: Channel sends a POST request to `/adapters/voice/inbound` with payload containing `inputText`, `sessionId`, and `occurredAt`.
3. **Security Interception**:
   - Compares `x-voice-inbound-secret` using constant-time `crypto.timingSafeEqual`.
   - Rejects stale timestamps outside the 60-second skew window.
   - Enforces sliding-window rate limit (30 turns/minute).
4. **Retrieval**: `InMemoryRetrieval` calculates lexical query embeddings and fetches top-$k$ relevant knowledge chunks above score threshold.
5. **Agent Inference**: `handleAgentTurn` constructs prompt with strict boundary delimiters (`UNTRUSTED_USER_TEXT`) and invokes `LlmPort`.
6. **Tool Execution (Optional)**: If model requests a tool, arguments are verified against the registered Zod schema and executed through `ToolPort`.
7. **Reply Generation**: Final synthesized text reply is returned synchronously (`200 OK`) to the voice channel for immediate TTS playback.
8. **Asynchronous Persistence & Audit**: Turn, execution events, and latency spans are committed to PostgreSQL using an idempotency key.

---

## 9. Installation Instructions

### Prerequisites
- **Node.js** >= 20.19.0 (check `.nvmrc`)
- **npm** >= 10.0.0
- **Docker & Docker Compose** (optional, for local PostgreSQL persistence)

### Step-by-Step Setup
```bash
# 1. Clone repository
git clone https://github.com/your-username/Voice-Agent-Architecture-Public.git
cd Voice-Agent-Architecture-Public

# 2. Install backend dependencies
npm ci

# 3. Configure environment variables
cp .env.example .env

# 4. (Optional) Start local PostgreSQL database
docker compose up -d
```

---

## 10. Environment Configuration

All settings are configured via environment variables. Copy `.env.example` to `.env`:

```ini
# Runtime Environment
NODE_ENV=development
PORT=3000
LISTEN_HOST=127.0.0.1
DATABASE_URL=postgresql://voice_agent:voice_agent@127.0.0.1:5433/voice_agent

# Voice Inbound Security (Optional for local testing, mandatory for public webhooks)
VOICE_INBOUND_SECRET=
DEMO_ORCHESTRATE_SECRET=
DEMO_PUBLIC_TOKEN=

# Model Execution Mode (Empty LLM_BASE_URL defaults to in-process deterministic FakeLlm)
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL_ID=fake
LLM_TIMEOUT_MS=1500

# Voice Reasoning Mode:
# 'runtime'  = Runtime owns LLM reasoning on inbound transcripts (default)
# 'provider' = Telephony platform owns reasoning; tools call /adapters/voice/tools
VOICE_SESSION_OWNER=runtime-demo
VOICE_REASONING_OWNER=runtime

# Hosted Persistence (Optional)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 11. Execution Instructions

### Development Mode
```bash
# Run server with live TypeScript compilation
npm run dev
```

### Production Build & Run
```bash
# Compile strict TypeScript output
npm run build

# Start production server
npm start
```

### Health Check Probes
```bash
curl http://127.0.0.1:3000/health/live    # Returns {"status":"alive"}
curl http://127.0.0.1:3000/health/ready   # Returns readiness status
curl http://127.0.0.1:3000/health/voice   # Returns voice configuration status
```

---

## 12. Testing Instructions

The repository maintains comprehensive test coverage across unit tests, architecture boundary constraints, and offline evaluation gates.

```bash
# Run automated test suites (336 in-process tests passing)
npm test

# Run strict TypeScript verification (zero compiler errors)
npm run typecheck

# Run architectural boundary test (verifies hexagonal isolation)
npx vitest run src/architecture.test.ts

# Execute the frozen offline quality & safety evaluation gate
npm run test:eval-gate
```

### Test Suite Execution & Infrastructure Notes
- **336 In-Process Tests**: Unit, security hygiene, multi-agent orchestration, and memory persistence tests execute hermetically using in-process fakes (`FakeLlm`, `NativeToolPort`, `MemoryPersistence`, `MemoryObservability`) with zero cloud or API requirements.
- **1 Optional Live Database Integration Test**: `src/adapters/persistence/postgres-persistence.test.ts` includes a live connection ping test against the local Docker Compose PostgreSQL instance on port `5433` (`docker compose up -d`). If Docker is not running, this test fails closed with `PERSISTENCE_UNAVAILABLE` by design, confirming resilient fail-closed dependency handling. To run it, start the Compose service:
  ```bash
  docker compose up -d
  npx vitest run src/adapters/persistence/postgres-persistence.test.ts
  ```

---

## 13. Security Considerations

- **Timing-Safe Secret Verification**: Shared secrets (`x-voice-inbound-secret`, `x-demo-orchestrate-secret`) are checked using SHA-256 digests and `crypto.timingSafeEqual` to prevent side-channel timing attacks.
- **Request Body & String Caps**: HTTP request bodies are strictly limited to 16 KiB. String inputs to tools and agent outputs are capped at 2,048 characters to prevent buffer exhaustion.
- **Prompt Injection Defense**: Untrusted user transcripts and external tool outputs are isolated inside explicit system delimiter blocks (`UNTRUSTED_USER_TEXT:`, `UNTRUSTED_TOOL_RESULT:`).
- **Log Hygiene & Redaction**: The structured `JsonLogger` automatically masks API keys, bearer tokens, passwords, and sensitive subscriber numbers before emitting to stdout.
- **PostgreSQL Row Level Security (RLS)**: Public or anonymous database roles have zero read/write access. All persistence queries require elevated service-role privileges managed strictly on the backend.

---

## 14. Known Limitations

- **Streaming Audio**: Audio stream encoding (Opus/PCM) is delegated to the interaction adapter layer. The runtime communicates via structured transcript/tool-call JSON webhooks rather than raw RTP/WebRTC audio streams.
- **Lexical Embedding**: The default offline embedding provider uses a deterministic lexical hash vectorizer (dimension: 64). In production environments, replace with an external dense vector embedding adapter (e.g., text-embedding-3-small).
- **Single-Turn Speech Model**: In inbound webhook mode, turns are processed synchronously. Real-time agent interruption (barge-in) relies on the voice channel adapter's media-level interruption controls.

---

## 15. Future Improvements

- [ ] **Native WebSocket Audio Streaming**: Introduce an audio streaming adapter supporting bi-directional PCM streaming with WebRTC.
- [ ] **Distributed pgvector Store**: Native integration of pgvector for large-scale enterprise semantic document search.
- [ ] **OpenTelemetry Exporter**: Additional adapter mapping internal `TraceSpan` events directly to OTLP collectors (Datadog, Langfuse, Grafana Tempo).
- [ ] **Dynamic Multi-Hop Tool Chains**: Enable stateful multi-step tool execution with human-in-the-loop confirmation for high-risk operations.

---

## 16. License

This project is open-source software licensed under the [MIT License](./LICENSE).
