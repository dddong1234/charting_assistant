# Fact-first input and unified SOAP draft

## Decision

Do not require the nurse to type `S:`, `O:`, `A:`, or `P:` labels. The nurse enters observed, reported, and performed facts in familiar language inside the single composer. The assistant uses only those facts and visible synthetic chart evidence to propose one continuous SOAP nursing note in the same editor shell.

The proposed SOAP text remains separate from the nurse-authored input until an explicit `Tab` acceptance. `Escape` dismisses it. The nurse may edit the accepted text before signing or adding the record.

## Reason

Requiring manual SOAP labels preserves most of the formatting work that the product is intended to remove. Splitting SOAP into four fields would also conflict with the approved record model: one saved record is `timestamp + category + one unified SOAP narrative`.

At the other extreme, generating a full note without nurse-supplied facts would weaken provenance and increase automation-bias risk. The fact-first boundary is the smallest customer-demoable workflow that preserves nurse authorship: the nurse supplies clinical facts; the assistant structures those facts; the nurse reviews and commits.

This direction is supported by:

- the 2018 systematic review reporting increased nursing documentation share after EHR adoption: https://pubmed.ncbi.nlm.nih.gov/29895467/
- the 2020 review showing that health IT does not automatically reduce nursing documentation time: https://pubmed.ncbi.nlm.nih.gov/32159770/
- the 2026 inline clinical documentation study using EHR-grounded, keyboard-accepted suggestions: https://pmc.ncbi.nlm.nih.gov/articles/PMC13395439/
- the 2026 review identifying automation bias and supporting human-in-the-loop controls: https://pubmed.ncbi.nlm.nih.gov/42445869/
- NIST Health IT interface guidance emphasizing effectiveness, efficiency, and use-safety: https://www.nist.gov/publications/technical-basis-user-interface-design-health-it

## Alternatives considered

- Require the nurse to write S/O and suggest only A/P. Rejected because it leaves substantial structure and repeated typing to the nurse.
- Render S/O/A/P as four cards or form fields. Rejected because it fragments one chronological nursing note and conflicts with the product invariant.
- Generate a complete SOAP note from patient selection alone. Rejected because it obscures authorship, increases unsupported-fact risk, and makes the product resemble an autonomous clinical author.
- Keep only short sentence completion. Retained as a future interaction option, but the approved demo must make the end-to-end value visible by showing the complete unified SOAP draft.

## Risk

Free-form facts can be mapped to the wrong SOAP section. A draft can also sound clinically plausible while introducing an unsupported assessment or plan. The deterministic MVP must therefore constrain output to supplied facts and evidence, keep the draft visually distinct, expose provenance, prohibit automatic save/signing, and preserve ordinary editing when suggestions fail.

## Validation method

- Compare median completion time and keystrokes against manual SOAP-label entry.
- Review fact-to-section mapping accuracy for each synthetic scenario.
- Measure acceptance, rejection, edit distance, and evidence-open rate.
- Count unsupported clinical facts added by the suggestion; the target is zero.
- Verify with keyboard tests that `Tab` accepts only while the editor is focused and `Escape` dismisses without changing authored input.
- Run nurse usability sessions with 5–8 general-surgery ward nurses before treating time-saving assumptions as evidence.
