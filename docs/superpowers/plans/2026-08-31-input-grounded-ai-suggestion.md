# Input-Grounded AI SOAP Suggestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static-only demo with an input-aware, server-generated SOAP suggestion while preserving a deterministic, always-available demo fallback.

**Architecture:** Framework-free domain code validates request and model output; a Vercel function owns the OpenAI key and Structured Output call; the React feature keeps the deterministic suggestion visible while a debounced, abortable request attempts to upgrade it. Invalid or stale model output is never rendered.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Vitest, Vercel Node Functions, official OpenAI JavaScript SDK, Responses API Structured Outputs.

**Spec:** `docs/superpowers/specs/2026-08-31-input-grounded-ai-suggestion-design.md`

## Global Constraints

- Only synthetic patient facts may be sent to the model; the UI must state `실환자 정보 입력 금지`.
- One saved record remains `timestamp + category + one unified SOAP narrative`.
- AI output is suggestion-only and requires explicit nurse acceptance.
- Never generate diagnoses, acuity decisions, orders, tests, or treatment recommendations.
- The immediate deterministic fallback must remain available throughout loading and failure.
- The OpenAI key is server-only through `OPENAI_API_KEY`; set `store: false`.

---

### Task 1: Domain contract and grounding validator

**Files:**
- Create: `src/domain/aiSuggestion.ts`
- Create: `src/domain/aiSuggestion.test.ts`

**Interfaces:**
- Produces: `AiSuggestionRequest`, `AiSuggestionResult`, `StructuredSoapSections`, `buildFallbackSuggestion(request)`, `parseAiSuggestionRequest(value)`, and `validateStructuredSuggestion(request, sections)`.

- [ ] **Step 1: Write the failing tests** for a deterministic unified SOAP result, malformed request rejection, unsupported evidence IDs, hallucinated numeric/Latin clinical tokens, and unsafe recommendation language.
- [ ] **Step 2: Run `npm run test:run -- src/domain/aiSuggestion.test.ts`** and confirm failure because `aiSuggestion.ts` does not exist.
- [ ] **Step 3: Implement the minimal framework-free types, parsers, formatter, fallback builder, and validation functions.** `validateStructuredSuggestion` returns a model result only when every section is non-empty, referenced evidence is supplied, and extracted clinical tokens are grounded.
- [ ] **Step 4: Run the focused test again** and confirm all new domain tests pass with no warnings.
- [ ] **Step 5: Commit** `src/domain/aiSuggestion.ts` and its test with `feat: validate grounded SOAP suggestions`.

### Task 2: Vercel OpenAI function

**Files:**
- Create: `api/suggest.ts`
- Create: `api/suggest.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.node.json`
- Modify: `eslint.config.js`
- Create: `.env.example`

**Interfaces:**
- Consumes: Task 1 domain contracts and validators.
- Produces: `createSuggestionHandler(dependencies)` and a default Vercel `fetch(request)` export.

- [ ] **Step 1: Install the official `openai` package and write failing API tests** using an injected generator for verified model output, invalid JSON body, missing API key fallback, generator failure fallback, rejected output fallback, and rate-limit fallback.
- [ ] **Step 2: Run `npm run test:run -- api/suggest.test.ts`** and confirm failure because the route handler is missing.
- [ ] **Step 3: Implement the minimal handler.** Accept POST only, cap request size, validate the body, apply a best-effort IP/window limiter, invoke Responses Structured Outputs with `store: false`, and return a validated model result or explicit fallback.
- [ ] **Step 4: Extend Node TypeScript and ESLint coverage to `api/**/*.ts`, add placeholder-only `.env.example`, and run the focused test plus `npm run lint`.**
- [ ] **Step 5: Commit** the route, configuration, dependency lock, and tests with `feat: add server-side AI suggestion route`.

### Task 3: Browser suggestion client

**Files:**
- Create: `src/services/suggestionClient.ts`
- Create: `src/services/suggestionClient.test.ts`

**Interfaces:**
- Consumes: `AiSuggestionRequest` and `AiSuggestionResult`.
- Produces: `requestAiSuggestion(request, options?)`, supporting an external `AbortSignal` and a bounded timeout.

- [ ] **Step 1: Write failing tests** proving the current draft is serialized, non-2xx responses fail, malformed responses fail, and an external abort cancels the request.
- [ ] **Step 2: Run `npm run test:run -- src/services/suggestionClient.test.ts`** and confirm failure because the client does not exist.
- [ ] **Step 3: Implement one POST client** with JSON headers, signal composition, response shape checking, and timeout cleanup.
- [ ] **Step 4: Run the focused tests** and confirm they pass without timer or console warnings.
- [ ] **Step 5: Commit** the client and tests with `feat: add abortable suggestion client`.

### Task 4: Input-aware editor workflow

**Files:**
- Modify: `src/features/charting/ChartingWorkspace.tsx`
- Modify: `src/features/charting/ChartingWorkspace.test.tsx`
- Modify: `src/features/charting/ChartingWorkspace.tour.test.tsx`
- Modify: `src/features/charting/charting-workspace.css`
- Modify: `src/styles/tokens.css` only if a new semantic status token is required.

**Interfaces:**
- Consumes: `buildFallbackSuggestion` and `requestAiSuggestion`.
- Produces: immediate fallback, debounced server upgrade, latest-request-only rendering, and explicit source/loading/failure copy.

- [ ] **Step 1: Write failing UI tests** proving the edited text reaches the HTTP boundary, fallback stays visible during loading, verified model text replaces it, failure keeps fallback, and a late old response is ignored.
- [ ] **Step 2: Run the focused workspace tests** and confirm each new behavior fails for the expected missing integration.
- [ ] **Step 3: Implement the minimal effect/state workflow** with a 700 ms debounce and `AbortController`; reset to fallback on patient/category/input changes and retain `Tab`/`Escape` semantics.
- [ ] **Step 4: Add compact Korean status copy and `실환자 정보 입력 금지`; keep focus and reduced-motion behavior intact.**
- [ ] **Step 5: Run all workspace and tour tests** and refactor only after green.
- [ ] **Step 6: Commit** feature, CSS, and tests with `feat: upgrade SOAP suggestions from nurse input`.

### Task 5: Product docs, verification, and integration

**Files:**
- Modify: `docs/specs/soap-charting-mvp.md`
- Create: `docs/decisions/2026-08-31-input-grounded-server-ai.md`
- Modify: `docs/verification/mvp-acceptance.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: completed Tasks 1-4.
- Produces: an auditable scope change, deployment prerequisites, and release evidence.

- [ ] **Step 1: Update the approved MVP spec and harness rules** to allow exactly one server-side suggestion route while retaining synthetic-only and nurse-authorship invariants.
- [ ] **Step 2: Record the decision, alternatives, risks, and validation method** in the decision log, including why deterministic fallback remains.
- [ ] **Step 3: Run `npm run verify`** and resolve every warning or failure.
- [ ] **Step 4: Inspect `git diff --check`, `git status --short`, and the final diff** to ensure no secret or `docs/portfolio/` artifact is staged.
- [ ] **Step 5: Commit** documentation and verification evidence with `docs: record input-grounded AI architecture`.
- [ ] **Step 6: Merge the feature branch into `main`, push `main`, and verify the Vercel deployment.** The live model upgrade remains fallback-only until the deploy owner configures `OPENAI_API_KEY` and the external cost controls.

