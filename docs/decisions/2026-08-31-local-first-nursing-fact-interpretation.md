# Prefer current nurse facts through a local semantic layer

## Decision

Add a framework-free local Korean nursing-fact interpreter before the historical-evidence fallback. For the MVP it recognizes common, high-confidence shorthand for sleep, absent nausea, NRS pain scores, drain volume, ward ambulation, and absent dyspnea, then produces one unified SOAP suggestion without an API key.

Treat the nurse's draft as the current charting moment and existing evidence as historical context. If a recognized current state conflicts with prior evidence, keep the current-input SOAP visible and show a separate textual warning that asks the nurse to confirm the state and record time. Never insert the warning into the SOAP narrative. Unknown text and prohibited diagnosis/order language receive no recycled suggestion.

The server model remains an optional upgrade. Its prompt states the same temporal precedence, and server validation rejects a model narrative that reverses a recognized current sleep state.

## Reason

The previous fallback selected only by record category. It did not inspect the meaning of `draftText`, so entering `잘잠` could still display the historical statement `잠이 안 온다`. That behavior made the portfolio demo look like a static shell and could mislead a reviewer about what the proposed note represented.

A small local layer makes the core interaction testable with no key, network, quota, or latency. It also creates a deterministic safety boundary: a known current fact changes the note immediately, an actual temporal difference is made visible, and unknown text does not receive a falsely confident old answer.

This decision supports the existing benefit hypothesis—15 minutes saved per nurse-shift, 1,368.8 ward hours per year, and about KRW 36.96M/year of gross time opportunity in the stated 5-nurse × 3-shift scenario—but does not add a new saving estimate. Its measurable contribution is demo availability and task reliability when the model route is disabled.

## Alternatives considered

- Require an active model key for all semantic behavior. Rejected because a customer demo would fail on missing key, quota, latency, or network state.
- Continue showing category-only historical fallback for every edit. Rejected because it can contradict the nurse's current input while appearing authoritative.
- Add a large Korean NLP library or custom clinical model. Deferred because the MVP needs a small customer-demoable loop; new dependencies, governed datasets, clinical evaluation, and inference operations would add cost without proving more of the core interaction.
- Copy a conflict marker into the SOAP body. Rejected because the marker could be accepted and saved as clinical narrative. A separate status preserves nurse review without contaminating the record.
- Silently prefer the current input and hide the historical difference. Rejected because a changed state or timestamp mismatch is clinically meaningful review context.

## Risk

- Pattern coverage is deliberately narrow. Unsupported phrasing produces no local suggestion and depends on the optional server model for broader language handling.
- Korean shorthand is ambiguous. The supported lexicon therefore stays limited to phrases with high-confidence polarity or values, and the result remains an unsigned suggestion.
- A prior/current difference can be a legitimate state change, not an error. The UI labels it as a confirmation request rather than a clinical alert or diagnosis.
- Regex and template behavior is not evidence of production clinical accuracy. Real deployment still requires governed data, nurse-led evaluation, auditability, privacy review, and integration validation.

## Validation method

- Run RED→GREEN domain tests for every supported shorthand class and for unsafe/unknown input suppression.
- Verify that `잘잠` never renders `잠이 안 온다` inside the active SOAP suggestion.
- Verify that the historical difference appears in a separate accessible `status` region and is referenced by the editor description.
- Verify that a contradictory model response is rejected and the local fallback remains active.
- Re-run Tab, Escape, evidence provenance, guided demo, timeline ordering, lint, build, and the complete `npm run verify` gate.
