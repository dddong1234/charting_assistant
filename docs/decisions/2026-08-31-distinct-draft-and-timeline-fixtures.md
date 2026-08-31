# Keep the active draft distinct from saved timeline fixtures

Date: 2026-08-31  
Status: Accepted

## Decision

The default patient's active 21:30 PRN event remains available only as source facts and an AI-generated SOAP draft until the nurse explicitly adds it. The preloaded saved timeline contains earlier, different events: a 19:00 diet note and a 14:00 vital-sign note.

## Reason

Showing the same timestamp, event, and SOAP narrative in both the composer and the saved timeline makes an evaluator interpret the draft as an already-saved duplicate. Distinct events make the state boundary visible: the upper area is work in progress, while the timeline is signed history.

## Alternatives considered

- Hide the timeline while composing: removes the duplicate but weakens the EMR context and chronological-record demonstration.
- Label the duplicate as a template: adds explanation while preserving an implausible saved-record state.
- Remove all saved notes: makes the draft distinction clear but prevents evaluation of reverse chronology and note density.

## Risk and validation

- Changing fixture content can invalidate tests or the approved demo story.
- Keep the current sleep/PRN evidence and suggestion unchanged; change only the older saved fixture.
- Verify that the active Stilnox draft is absent from the initial timeline and that the 19:00 and 14:00 saved records remain reverse chronological.
