# Input-Grounded AI SOAP Suggestion Design

Status: Approved for implementation on 2026-08-31  
Product owner approval: `ㄱㄱ 만들어`

## Problem

The current demo keeps a deterministic SOAP suggestion visible while a nurse edits facts, but the suggestion does not semantically change with the edited text. That protects the live demo from failure, yet it cannot prove the core product claim that the system understands the nurse's current input.

## Goal

Use the nurse's current synthetic fact text and the visible synthetic chart evidence to create one Korean SOAP nursing-note suggestion. A framework-free local interpreter handles common ward shorthand immediately; the server-side model is an optional upgrade. Replace the local result only when the model result passes grounding, semantic-conflict, and safety validation.

## Success criteria

- The request sent to the server contains the current editor text, selected category, and only the evidence needed for the suggestion.
- Editing the text schedules a new request and a stale response can never replace a newer suggestion.
- When a deterministic suggestion exists, the UI never loses it while waiting for or failing to receive a model response. Safe model-only phrasing stays suggestion-free until a verified response arrives.
- Only a non-empty, ordered S/O/A/P narrative whose evidence IDs and clinical tokens are supported by the request may be shown as model output.
- `Tab`, `Escape`, evidence highlighting, timeline insertion, and the guided demo keep their existing behavior.
- Missing API key, timeout, rate limit, malformed output, or network failure visibly falls back to the deterministic demo suggestion.

## Non-goals

- No real patient data, EMR integration, authentication, persistence, diagnosis, acuity classification, orders, or treatment recommendations.
- No claim of production clinical safety or regulatory readiness.
- No model training or custom machine-learning pipeline in this MVP.

## Architecture

1. `src/domain/aiSuggestion.ts` owns request/result types, deterministic fallback construction, runtime request validation, SOAP formatting, and model-output grounding checks. It remains framework- and browser-free.
2. `src/services/suggestionClient.ts` posts a validated, minimal request to `/api/suggest`, applies a timeout, and returns a typed result. Network failures are reported to the feature layer rather than hidden.
3. `api/suggest.ts` is a Vercel Node function. It validates the payload, applies a best-effort per-instance rate limit, calls the OpenAI Responses API with Structured Outputs, validates the returned sections, and returns either a verified model result or an explicit deterministic fallback.
4. `ChartingWorkspace` immediately renders the deterministic suggestion, debounces model requests, aborts stale requests, and swaps in only the latest verified result.
5. `src/domain/localFactInterpreter.ts` normalizes high-confidence Korean shorthand and detects current-versus-prior state conflicts without React, browser APIs, network access, or a machine-learning dependency.

## API-free local interpretation extension

The local path runs before the historical-evidence fallback:

```text
current nurse text
→ whitespace and unit normalization
→ concept/value/polarity match
→ input-aware unified SOAP
→ relevant historical evidence linkage
→ current/prior conflict notice
→ optional POST /api/suggest upgrade
```

The MVP lexicon covers positive/negative sleep, absent nausea, NRS pain scores from 0 to 10, drain volumes in `cc` or `mL`, completed/unavailable ward ambulation shorthand, and absent dyspnea. It is intentionally small and deterministic. Detailed existing facts retain the richer evidence-grounded fallback; an unrecognized or unsafe current draft receives no recycled suggestion. Negated sleep and ambulation are evaluated before positive/completed patterns, and planned ambulation is rejected rather than rewritten as performed care.

Current nurse text represents the present charting moment. Existing evidence represents historical context. The virtual evidence ID `current-draft` represents the editor text itself. Matching historical concept/value pairs may be supporting evidence; different values for the same concept are shown only as conflicts. When their state differs, the current-input SOAP remains reviewable while a separate warning asks the nurse to confirm the state and timestamp. The warning is never part of the note value and therefore cannot be saved accidentally with `Tab`.

Safe Korean observations outside the deterministic lexicon may use the optional server model. The client does not invent a local SOAP while waiting and renders explicit loading/failure text when there is no local fallback. The server rejects negative, decimal, or out-of-range NRS values, planned ambulation, non-Korean noise, and prohibited diagnosis/order/medication-recommendation language before generation. The same unsafe-language validation runs after generation; need/request/start/change/stop phrasing such as `추가 처방 필요`, `추가 투약 필요`, or `진통제 투여 필요` is rejected while factual confirmation such as `처방 확인` and completed administration such as `투약함` remain allowed. Without an API key, model-only input returns no suggestion rather than an unrelated historical fallback.

The server call uses the official OpenAI JavaScript SDK, `store: false`, no tools, a pinned `gpt-5-mini-2025-08-07` default, and `OPENAI_API_KEY` from the server environment only. The browser bundle never receives the key.

## API contract

`POST /api/suggest`

```ts
interface AiSuggestionRequest {
  draftText: string
  category: 'V/S' | 'PRN' | '일반'
  evidence: Array<{
    id: string
    timestamp: string
    category: 'V/S' | 'PRN' | '일반'
    label: string
    detail: string
    subjective: string
    factText?: string
  }>
}

interface AiSuggestionResult {
  source: 'model' | 'fallback'
  narrative: string
  evidenceIds: string[]
  reason?: 'missing-key' | 'model-error' | 'invalid-model-output' | 'rate-limited'
}
```

The model returns structured `subjective`, `objective`, `assessment`, `plan`, and `evidenceIds` fields. The server, not the model, assembles the single editor narrative.

## Grounding and clinical boundaries

- Every returned evidence ID must exist in the request, except the reserved `current-draft` ID that refers to `draftText` in the same request.
- Every numeric clinical token and non-standard Latin medication token in the output must appear in the nurse text or supplied evidence.
- S/O/A/P sections must all be non-empty and in order.
- Existing unsafe-language rules reject diagnoses, orders, treatment changes, and clinical recommendations.
- The assessment is limited to a nurse-observed state; the plan is limited to care already performed or observation explicitly present in the supplied facts.
- A rejected model response is never partially shown; the deterministic result remains active.
- Sleep polarity uses one negative-first classifier for both local rendering and model validation. A model response that reverses a recognized current sleep polarity is rejected as `invalid-model-output`; a correctly negative response for `숙면 못함` or `수면 상태 양호하지 않음` is not falsely rejected.

## Interaction states

- `입력 기반 로컬 제안`: shown immediately for recognized shorthand.
- `AI 분석 중 · 로컬 초안 유지`: shown while the current-input local result remains usable.
- `입력 기반 AI 제안`: shown only after server validation succeeds.
- `AI 연결 없음 · 로컬 제안 유지`: non-blocking status after a failed request for recognized input.
- `규칙 기반 즉시 제안`: retained for detailed fixture text that already has safe, richer evidence mapping.
- Safe model-only input: no local SOAP is shown until a verified model response arrives; missing API access leaves it suggestion-free.

The guided demo remains deterministic: a visitor can finish all three steps even if the server is slow or unavailable.

## Privacy, cost, and deployment

- The interface says `실환자 정보 입력 금지` and the project remains synthetic-only.
- OpenAI API content is not used to train models by default, but default abuse-monitoring retention can be up to 30 days; therefore this build is not approved for PHI.
- Payloads are size-limited and the function has a short timeout and best-effort request throttling.
- The deploy owner must configure an OpenAI project budget and Vercel rate limiting before enabling the public model route. In-memory throttling alone is not a security boundary.
- `OPENAI_API_KEY` and optional `OPENAI_MODEL` are Vercel server environment variables. Secrets are never committed or pasted into client code.

## Validation

- Domain unit tests cover fallback construction, request validation, unsupported evidence IDs, unsupported numeric/medication tokens, and unsafe text.
- Local domain tests cover short positive/negative sleep, negation, pain-score extraction, unit normalization, unavailable/completed ambulation, absent dyspnea, bidirectional historical conflicts, supporting provenance, unsupported-input suppression, and current/model polarity conflict rejection.
- API tests inject a fake generator and cover fallback-backed success, safe model-only success, malformed input, missing key, rate limit, model error, and invalid output without contacting OpenAI.
- UI tests mock only the HTTP boundary and cover local-first loading, model-only success, fallback retention, provenance labels, and stale-response cancellation.
- `npm run verify` is the release gate.

