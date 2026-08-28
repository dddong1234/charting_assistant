# Safe synthetic suggestion contract

## Decision

The deterministic demo suggestion function only joins same-category synthetic evidence details that both match factual-observation language and do not match diagnosis, order, medication-change, test, treatment-recommendation, or acuity-decision language. Each result includes the exact source evidence IDs and remains separate from the saved nursing-note narrative.

## Reason

The MVP must demonstrate evidence-linked completion while preserving nurse review and avoiding clinical decision support or ungrounded clinical content.

## Alternatives considered

- Return a prewritten suggestion without provenance. Rejected because the evidence panel could not explain its source.
- Generate free-form summaries from all patient data. Rejected because it makes safety review and category relevance less predictable.
- Add a remote model API. Rejected because the MVP is static, synthetic-only, and has no backend.

## Risk

The allow-list and keyword filtering are demo guardrails rather than a complete clinical-safety system. They are intentionally paired with fixture-only data, visible provenance, and explicit nurse acceptance.

## Validation method

Domain tests verify category selection, exact evidence-linked completion text, factual medication-administration eligibility, and omission of medication-change, test, treatment-recommendation, and acuity-decision evidence. The full repository verification runs lint, tests, and the production build.
