# Contextual missing-fact review outside SOAP

Date: 2026-09-01
Status: Accepted

## Decision

Add a deterministic, non-blocking review prompt outside the unified SOAP narrative when current nurse input and synthetic chart evidence show that a high-confidence follow-up fact is absent. The first rule applies only to a negative sleep fact: if PRN sleep medication administration is documented but no post-medication sleep response is present, show “기록 전 확인” and ask the nurse to verify the response.

## Reason

A nurse interview identified reusable protocols and macros as the strongest existing alternative to shorthand-to-note expansion. Static protocols can reproduce text but cannot inspect the current patient context, distinguish completed facts from missing follow-up, or prevent an unsupported phrase from being copied. A contextual review prompt demonstrates that difference without expanding the MVP into diagnosis, order, or treatment recommendation support.

The prompt is kept outside SOAP because absence of evidence is not a clinical fact. Inserting it into the narrative would either create false documentation or leave an unresolved marker in a record the nurse might accept.

## Alternatives considered

1. Generate a longer SOAP note from the shorthand alone. Rejected because it does not outperform a saved protocol and increases unsupported-content risk.
2. Block suggestion acceptance until every prompt is resolved. Rejected for the MVP because the copilot must not prevent nursing documentation and cannot know whether follow-up is not yet due.
3. Ask the server model to infer missing fields. Rejected because the portfolio demo must work without an API key and model inference is less predictable than a narrow deterministic rule.
4. Build a generic checklist engine for every nursing category. Deferred because the current evidence model does not yet support enough event types and timing relationships to validate broad rules safely.

## Trade-offs and risks

- The rule recognizes a narrow set of Korean medication and response phrases, so it can miss legitimate alternate wording.
- Evidence timing is not yet modeled; the rule detects presence, not whether the response occurred after the administration timestamp.
- A false positive can add review burden. The prompt is therefore informational, textually labeled, and non-blocking.
- The implementation is synthetic-demo logic and must not be described as production clinical decision support.

## Validation method

- Domain tests must prove the prompt appears for negative sleep input plus medication administration without response evidence.
- Domain tests must prove the prompt disappears when post-medication sleep response evidence exists.
- UI tests must prove the prompt is visible as “기록 전 확인” and absent from the active SOAP narrative.
- In usability testing, compare the copilot against a reusable protocol on unsupported-fact count, omitted follow-up count, correction distance, and task completion time.
- Before adding more rules, validate the wording and false-positive rate with 5–8 ward nurses.

## Next boundary

The next increment may attach prompt-specific evidence and expand contradiction checks. Sentence-level evidence mapping remains a separate change.
