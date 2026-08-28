# Suggestion lifecycle and demo authorship status

## Decision

The charting workspace models the deterministic suggestion as one of four explicit states: `none`, `active`, `accepted`, or `dismissed`. Only an active suggestion exposes preview text, Tab/Escape guidance, AI-suggestion badges, and “현재 자동완성 근거” linkage. An accepted suggestion keeps its evidence linkage under the distinct “채택한 AI 문장 근거” label. Dismissed and unavailable suggestions expose no linkage and state “활성 제안 없음”; source evidence remains browseable with its own `확인됨` or `최근` state.

Synthetic evidence records carry explicit subjective text for draft seeding. Saved fixture notes are modeled as `signed-fixture`, while notes added during the browser-only demo are `unsigned-demo` and render as `데모 저장 · 서명 전`. Draft validation rejects empty SOAP section bodies and bracketed nurse-review/TODO markers before insertion.

## Reason

A category-derived suggestion object is not enough to describe whether the nurse is currently reviewing, has accepted, or has dismissed that suggestion. Keeping lifecycle, source-record state, suggestion linkage, and signature state explicit prevents the interface from claiming current AI provenance after dismissal or audit completion for an unsigned demo note.

## Alternatives considered

- Keep the existing `suggestionVisible` boolean and add conditional checks in each panel. Rejected because accepted and dismissed suggestions both have no preview but require different provenance behavior.
- Treat every category-matching evidence record as linked. Rejected because category relevance is not the same as support for an active or accepted suggestion.
- Keep `nurseSignature` as the only authorship field and change the displayed suffix. Rejected because it cannot distinguish signed fixtures from newly added unsigned demo records in the model.
- Leave subjective text unresolved for nurse entry. Rejected for evidence-backed demo categories because the initial flow could persist an unfinished marker; categories without evidence instead remain blank and require entry.

## Risks

- Accepted provenance remains attached if the nurse edits the accepted narrative. This is intentional for the MVP: it records which evidence supported the accepted AI text, not a claim that every later character came from AI.
- The deterministic demo uses evidence-level subjective fixtures and does not infer subjective findings from objective chart data.
- `signed-fixture` is presentation metadata for synthetic seeded records only and is not a signing workflow.

## Validation

- Pure domain tests cover unresolved markers, all four empty SOAP bodies, and stable new-first equal-time insertion.
- Component tests cover independent evidence source state/linkage and signed-versus-unsigned note rendering.
- Workspace integration tests cover active, accepted, dismissed-by-Escape, dismissed-by-typing, no-evidence, category/patient reset, unresolved-marker blocking, and same-minute insertion.
- Production Chromium acceptance inspects accepted/dismissed rail state and the first added card’s narrative, order, and unsigned status.
