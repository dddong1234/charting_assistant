# Three-column EMR demo shell

## Decision

Use a dense desktop EMR shell for the customer-demoable MVP: assigned patients on the left, the selected patient's chronological nursing-note workflow in the center, and AI review/evidence on the right. The first viewport must show the fact input, one unified SOAP suggestion, its supporting evidence, and the most recent saved note together.

Patient-specific surgery, allergy, fall-risk, latest event, draft, and evidence labels are derived from the selected synthetic patient. When a vital value is unavailable for a selected patient, the UI shows `—` instead of carrying values over from another patient.

## Reason

The customer sees the UI before evaluating implementation depth. A familiar EMR information hierarchy makes the portfolio screenshot immediately legible while keeping the differentiator—the fact-first unified SOAP suggestion—inside the nurse's existing chart-review context. Showing evidence alongside the suggestion also makes nurse review and authorship visible instead of hiding safety controls behind another screen.

## Alternatives considered

- A spacious consumer-style dashboard. Rejected because it weakened the EMR reference and could not show patient context, editing, evidence, and timeline in one customer-demoable viewport.
- A single-column writing assistant. Rejected because it removed the chart context needed to explain where suggested facts came from.
- A modal AI review step. Rejected because it interrupted the chronological charting flow and obscured the relationship between draft and evidence.
- Hard-coded showcase values for every selected patient. Rejected because switching patients could display false synthetic clinical context and undermine the safety story.

## Risk

High information density can reduce readability on smaller screens. A portfolio-first shell can also tempt future implementation to treat decorative clinical values as real data. The responsive fallback therefore stacks the rails below desktop width, status is not communicated by color alone, and patient-specific fields must either derive from the selected synthetic fixture or display an explicit unavailable state.

## Validation method

- Render at 1440×1100 and inspect for clipping, overlap, and first-viewport visibility of input, suggestion, evidence, and timeline.
- Run keyboard and accessibility-role tests for patient selection, editor suggestion acceptance/dismissal, and evidence linkage.
- Switch to a second synthetic patient and assert that surgery, allergy state, fall-risk label, and latest event update without retaining the first patient's facts.
- Run `npm run verify` before deployment.
