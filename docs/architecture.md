# Voice Agent Architecture — Technical Reference

## 1. Architectural Philosophy

This project implements a production-grade, spec-driven **Voice AI Agent Runtime** based on **Hexagonal (Ports and Adapters) Architecture** and **Clean Architecture**.

```
+-------------------------------------------------------------------------+
|                              Adapters                                   |
|                                                                         |
|   +-----------------------+                    +--------------------+   |
|   | Voice Interaction     |                    | Persistence        |   |
|   | (Vapi / Webhook /     |                    | (PostgreSQL /      |   |
|   |  Telephony Gateway)   |                    |  Supabase /        |   |
|   +-----------+-----------+                    |  In-Memory)        |   |
|               |                                +---------+----------+   |
|               v                                          ^              |
|   +------------------------------------------------------+----------+   |
|   |                         Application                             |   |
|   |                                                                 |   |
|   |  * handleVoiceTurn             * executeChannelToolInvocation   |   |
|   |  * handleAgentTurn             * runQualityGate                 |   |
|   |  * handleOrchestratedTurn      * scoreSessionCall               |   |
|   |                                                                 |   |
|   |   +---------------------------------------------------------+   |   |
|   |   |                           Domain                        |   |   |
|   |   |                                                         |   |   |
|   |   |   * Pure Models: VoiceTurn, VoiceReply, AgentDecision   |   |   |
|   |   |   * Core Ports: LlmPort, ToolPort, RetrievalPort,       |   |   |
|   |   |                 ObservabilityPort, PersistencePort      |   |   |
|   |   |   * State Machines & Deterministic Security Guardrails  |   |   |
|   |   +---------------------------------------------------------+   |   |
|   +-----------------------------------------------------------------+   |
|               |                                          ^              |
|               v                                          |              |
|   +-----------+-----------+                    +---------+----------+   |
|   | LLM & Reasoning       |                    | Observability      |   |
|   | (OpenAI HTTP /        |                    | (Structured JSON   |   |
|   |  In-Process Fakes)    |                    |  Tracer & Logger)  |   |
|   +-----------------------+                    +--------------------+   |
+-------------------------------------------------------------------------+
```

### Core Invariants

1. **Vendor Independence**: Domain entities and application use cases have **zero imports** from vendor SDKs (no Vapi SDK, no proprietary LLM SDKs, no external telemetry vendor SDKs, and no ORM/database drivers). All external I/O lives exclusively inside adapters behind strongly-typed port interfaces.
2. **Channel as Adapter**: Telephony, WebRTC, and speech engines (such as Vapi, Twilio, or Deepgram) are interaction channels. They provide ingress and audio streaming, but they never dictate core domain state, business policies, tool definitions, or authorization boundaries.
3. **Controlled Autonomy**: LLM reasoning is treated as untrusted, stochastic I/O. The runtime governs agent transitions, validates tool schemas using Zod before invocation, enforces rate limiting, caps context budgets, and asserts quality and safety gates before changes reach production.
4. **Reproducible Traceability**: Every turn generates an end-to-end `traceId`. All operations emit structured log entries with latency, token usage, cost, and redacted arguments. No raw PII or prompt secrets are logged.

---

## 2. Ports and Adapters Breakdown

| Port Interface | Responsibility | Production Adapter | Local / Test Adapter |
| :--- | :--- | :--- | :--- |
| **`LlmPort`** | Text completion, streaming, structured JSON output, embeddings | `HttpLlm` (OpenAI-compatible HTTP completion endpoint) | `FakeLlm` (Deterministic script runner and offline lexical embedder) |
| **`ToolPort`** | Authorization, schema validation, rate-limiting, and tool execution | `NativeToolPort` wrapping `ToolRegistry` with strict Zod schemas | `NativeToolPort` with canned domain directory fixtures |
| **`RetrievalPort`** | Ingesting documents and retrieving context with scores and locators | `InMemoryRetrieval` / pgvector SQL migration foundation | `FakeRetrieval` with canned chunk fixtures |
| **`PersistencePort`** | Idempotent turn recording, tool call audit, session status, evaluation | `PostgresPersistence` / `SupabasePersistence` with RLS policies | `MemoryPersistence` with synchronous report generation |
| **`ObservabilityPort`** | Emitting correlation spans with latencies, tokens, and redacted payloads | `LoggingObservability` (JSON lines stdout formatter) | `MemoryObservability` (test assertion span accumulator) |
| **`LoggerPort`** | Operation-level audit logging with regex-based credential redaction | `JsonLogger` (standard error / out JSON stream) | In-memory silent / test logger |
| **`SpeechPort`** | Audio transcription and synthesis abstraction (when channel offloaded) | Offloaded to interaction adapter (Vapi/WebRTC) | Synthetic mock |

---

## 3. Dual Execution Ownership Modes

The runtime supports two decoupled operational modes configured via `VOICE_REASONING_OWNER`:

### Option A: Runtime-Centric Reasoning (`VOICE_REASONING_OWNER=runtime`)
- **Flow**: Incoming speech transcript is sent by the voice channel via `POST /adapters/voice/inbound`.
- **Control**: The runtime executes `handleVoiceTurn` -> `handleAgentTurn`. The in-house LLM port reasons, decides whether to query retrieval or invoke tools, and constructs the response.
- **Reply**: The runtime returns a synchronous JSON reply `{ message, locale, status }` for the voice adapter to synthesize and speak.

### Option B: Provider-Centric Reasoning with Secure Tool RPC (`VOICE_REASONING_OWNER=provider`)
- **Flow**: The telephony/voice provider's hosted assistant manages the conversational reasoning loop.
- **Control**: When the provider triggers a function/tool call, it executes a secure webhook to `POST /adapters/voice/tools`.
- **Security**: The runtime validates the shared secret (`x-voice-inbound-secret`), verifies the tool against an explicit allowlist, strictly parses input schemas, executes the tool, logs traces, and returns compliant JSON results. Inbound transcripts only record lifecycle and turn history without triggering duplicate LLM turns.

---

## 4. Multi-Agent Orchestration

The runtime features a deterministic orchestrator (`handleOrchestratedTurn`) demonstrating controlled intent routing:

1. **Intents**: Closed intents (`normalize`, `classify`).
2. **Budgeting**: `SpecialistBudget` strictly enforces maximum tool hops (`MAX_SPECIALIST_INVOCATIONS = 1`) and step limits (`MAX_ORCHESTRATION_STEPS = 4`), preventing runaway agent loops and token exhaustion.
3. **Specialist Handoffs**: Correlated with parent `traceId`, maintaining explicit state transitions (`receiving` -> `routing` -> `awaiting_specialist` -> `completed` / `failed`).
4. **Guardrails**: Automated redacting and post-generation safety checks preventing sensitive data leakage.

---

## 5. Offline Quality & Safety Evaluation Gate

Following AI Engineering best practices, model updates and prompt iterations cannot reach production without passing deterministic offline quality gates (`src/application/run-quality-gate.ts`):

- **Frozen Suites**: Tested across knowledge retrieval accuracy, single-turn agent reasoning, multi-agent orchestration, and voice channel error handling.
- **Deterministic Assertion**: Fakes test against hardcoded edge cases (prompt injection attempts, out-of-scope requests, tool argument fuzzing, rate limit skew).
- **Execution Script**: Run standalone in CI via `npm run test:eval-gate`. Emits a standardized `EvaluationRun` report.
