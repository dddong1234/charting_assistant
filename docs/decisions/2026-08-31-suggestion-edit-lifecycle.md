# Keep evidence-backed suggestions active during fact editing

## Decision

Editing or deleting characters in a non-empty fact draft must not dismiss an evidence-backed unified SOAP suggestion. While the draft is not yet accepted, every text change derives suggestion visibility from two conditions: the fact input is non-empty and the selected category has supporting synthetic evidence.

An empty fact input has no active suggestion. `Escape` still dismisses the current suggestion, and the next fact edit may reopen it. After `Tab` acceptance, ordinary nurse edits retain the accepted state instead of showing the pre-acceptance suggestion again.

## Reason

The previous `onChange` handler converted every active suggestion to `dismissed`. A single Backspace therefore removed the AI review, evidence linkage, and keyboard acceptance controls, making the primary demo flow fragile and contradicting the approved requirement that the nurse may continue editing while using the inline suggestion.

## Alternatives considered

- Dismiss on every change. Rejected because routine typing behaves like an explicit rejection.
- Add a timeout before dismissing. Rejected because it only delays the same incorrect state transition and adds timing instability to the demo.
- Reopen suggestions after every edit, including edits to an accepted SOAP note. Rejected because it would interfere with nurse control over the accepted narrative.
- Add a remote model call for every keystroke. Out of scope for the static MVP due to privacy, latency, cost, and architecture constraints.

## Risk

The deterministic MVP recomputes visibility but not new clinical meaning from arbitrary free text. The suggestion remains grounded in the selected synthetic chart evidence and category. It must therefore continue to be labeled as a reviewable demo suggestion and never auto-save or auto-sign.

## Validation method

- Reproduce the demo failure by deleting one character from the initial fact input.
- Assert that the unified SOAP suggestion, three linked evidence cards, and `Tab` affordance remain visible.
- Re-run the existing `Tab`, `Escape`, category-switch, evidence, and note-addition interaction tests.
- Run `npm run verify` before pushing to Vercel.
