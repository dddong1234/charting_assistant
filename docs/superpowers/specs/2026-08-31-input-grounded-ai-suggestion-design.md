# Input-Grounded AI SOAP Suggestion Design

Status: Approved for implementation on 2026-08-31  
Product owner approval: `ㄱㄱ 만들어`

## Problem

The current demo keeps a deterministic SOAP suggestion visible while a nurse edits facts, but the suggestion does not semantically change with the edited text. That protects the live demo from failure, yet it cannot prove the core product claim that the system understands the nurse's current input.

## Goal

Use the nurse's current synthetic fact text and the visible synthetic chart evidence to request one Korean SOAP nursing-note suggestion from a server-side model. Keep an immediate deterministic suggestion on screen and replace it only when the model result passes grounding and safety validation.

## Success criteria

- The request sent to the server contains the current editor text, selected category, and only the evidence needed for the suggestion.
- Editing the text schedules a new request and a stale response can never replace a newer suggestion.
- The UI never loses the active suggestion while waiting for or failing to receive a model response.
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

- Every returned evidence ID must exist in the request.
- Every numeric clinical token and non-standard Latin medication token in the output must appear in the nurse text or supplied evidence.
- S/O/A/P sections must all be non-empty and in order.
- Existing unsafe-language rules reject diagnoses, orders, treatment changes, and clinical recommendations.
- The assessment is limited to a nurse-observed state; the plan is limited to care already performed or observation explicitly present in the supplied facts.
- A rejected model response is never partially shown; the deterministic result remains active.

## Interaction states

- `규칙 기반 즉시 제안`: shown immediately and during local Vite development or any API failure.
- `AI 분석 중`: shown while the existing deterministic suggestion remains usable.
- `입력 기반 AI 제안`: shown only after server validation succeeds.
- `AI 연결 없음 · 규칙 기반 유지`: non-blocking status after a failed request.

The guided demo remains deterministic: a visitor can finish all three steps even if the server is slow or unavailable.

## Privacy, cost, and deployment

- The interface says `실환자 정보 입력 금지` and the project remains synthetic-only.
- OpenAI API content is not used to train models by default, but default abuse-monitoring retention can be up to 30 days; therefore this build is not approved for PHI.
- Payloads are size-limited and the function has a short timeout and best-effort request throttling.
- The deploy owner must configure an OpenAI project budget and Vercel rate limiting before enabling the public model route. In-memory throttling alone is not a security boundary.
- `OPENAI_API_KEY` and optional `OPENAI_MODEL` are Vercel server environment variables. Secrets are never committed or pasted into client code.

## Validation

- Domain unit tests cover fallback construction, request validation, unsupported evidence IDs, unsupported numeric/medication tokens, and unsafe text.
- API tests inject a fake generator and cover success, malformed input, missing key, rate limit, model error, and invalid output without contacting OpenAI.
- UI tests mock only the HTTP boundary and cover loading, successful replacement, fallback retention, and stale-response cancellation.
- `npm run verify` is the release gate.

