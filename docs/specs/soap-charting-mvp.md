# SOAP Nursing Note Copilot MVP Specification

Status: Approved for development on 2026-08-28  
Figma source: [Nurse EMR / Fact-first Unified SOAP](https://www.figma.com/design/KpybGW6Y8u9TyPSv61OcM9/?node-id=39-3)
Product owner approval: `기획 최종 승인, 개발 시작`

## Problem

Three-shift ward nurses repeatedly re-check vital signs, pain scores, drains, medication administration, and recent nursing notes before writing a chronological nursing record. This duplicates cognition and keyboard work, reduces time available for direct patient care, and can delay shift completion.

## Target and job to be done

The first user is a general-surgery ward nurse. While charting during a shift, the nurse wants to enter observed and performed facts in familiar language and receive one evidence-grounded unified SOAP draft, so they can spend less time formatting repetitive text without surrendering review or authorship.

## Product promise

In one editor, let the nurse enter ordinary clinical facts without manually typing SOAP labels, then show one evidence-linked unified SOAP draft that can be accepted, dismissed, or edited. The result is saved as one chronological nursing note only after explicit nurse action.

## Core flow

1. Select one synthetic patient from the patient rail.
2. Review the patient context and existing reverse-chronological SOAP notes.
3. Choose the timestamp and note category.
4. Enter observed, reported, and performed facts in familiar language without manually typing `S:`, `O:`, `A:`, or `P:`.
5. Receive one inline unified SOAP draft grounded in the evidence panel.
6. Accept with `Tab`, dismiss with `Escape`, or continue editing.
7. Add the note and see it at the top of the timeline.
8. Optionally save the current draft or mark the record set saved for the demo.

## Functional requirements

| ID | Requirement | Acceptance criterion |
|---|---|---|
| FR-001 | Patient context | Selecting a patient updates header, notes, composer draft, and evidence without a page reload. |
| FR-002 | Patient search and filter | Search matches bed or synthetic patient name; “확인 필요” shows only watch/danger patients. |
| FR-003 | Fact-first unified SOAP editor | The composer uses one text-editing surface. The nurse may enter ordinary facts without SOAP labels; the proposed saved result is one continuous S/O/A/P narrative, never four independent fields. |
| FR-004 | Inline suggestion | A visible suggestion is not part of the saved narrative until explicitly accepted. |
| FR-005 | Keyboard control | While editing, `Tab` accepts and `Escape` dismisses the active suggestion. |
| FR-006 | Evidence provenance | The evidence panel shows the records supporting the current suggestion and their state. |
| FR-007 | Chronological notes | Adding a valid note inserts one timestamped/category-tagged SOAP record in reverse chronological order. |
| FR-008 | Nurse control | The nurse can freely change accepted text before adding the record. |
| FR-009 | Draft feedback | Draft-save and record-save actions return explicit, non-ambiguous feedback. |
| FR-010 | Safety disclosure | The interface visibly states that it is a synthetic-data demo and suggestions require review. |

## Demo data and suggestion scope

- Use six synthetic general-surgery patients mirroring the approved Figma density.
- Include V/S and general state, PRN medication administration, pain, drain, diet, and ambulation context.
- Suggestions may summarize or continue supplied chart facts.
- Suggestions must not invent diagnoses, orders, medication changes, or treatment plans.
- The deterministic suggestion engine is a prototype substitute for a future model API and must be labeled as an AI demo suggestion in the UI.

## Non-functional requirements

- Desktop-first fidelity at 1440×1024, usable at 1366px width, and a coherent stacked layout on smaller screens.
- Korean UI using Noto Sans KR with system fallbacks.
- Visible focus styles, semantic landmarks, accessible labels, and reduced-motion support.
- No backend, login, real patient data, remote model call, or persistent server storage.
- Production build must be deployable as a static Vite site on Vercel’s free tier.

## Design system contract

- Canvas `#f7f9fb`, panel `#ffffff`, subtle `#f1f5f8`, selected/AI `#eaf5f8`.
- Primary/AI accent `#176b87`, focus `#2b7fff`.
- Primary text `#17202a`, secondary `#5b6876`, muted `#7b8c9d`.
- Default border `#dce3ea`, strong border `#bec9d4`.
- Success `#218358`, warning `#b7791f`, danger `#c2413b`.
- Desktop columns: patient rail 288px, flexible 816px workspace, evidence rail 336px.
- Radii: 4px, 8px, 12px, and pill 999px. Spacing follows a 4px base.

## Success hypotheses

These are validation hypotheses, not guaranteed outcomes:

- At least 20% lower task completion time and keystrokes in a scripted usability task.
- At least 70% task success without facilitator intervention.
- At least 50% useful suggestion acceptance and fewer than 20% heavily rewritten accepted suggestions.
- Baseline scenario: 15 minutes saved per nurse-shift. With 5 nurses × 3 shifts × 365 days, that is 1,368.8 ward hours/year.
- If 60% converts to direct care, that is about 821 hours/year or 4.5 minutes per occupied bed-day for a 30-bed ward.
- At a fully loaded labor value of KRW 27,000/hour, gross time opportunity is about KRW 36.96M/year; do not add this to direct-care value as a separate cash saving.

## Out of scope

- Real EMR integration, FHIR, authentication, audit signing, real PHI, production AI inference, voice capture, clinical decision support, automated orders, billing, or regulatory certification.
- SBAR handoff generation is Phase 2.
- Physician documentation is Phase 3.

## Decision rationale summary

- Nurse-first: work repeats 24/7 across the ward and saved time can become direct care.
- SOAP-first: the user clarified that one chronological nursing record follows SOAP; SBAR is not the primary record.
- Fact-first input: the nurse supplies observations and performed care in familiar language; the system structures those supplied facts into one reviewable SOAP draft.
- Deterministic demo suggestions: they prove the interaction and time-saving proposition without external cost, latency, or privacy exposure.
- Three-panel desktop layout: patient context, authoring, and evidence remain visible together, reducing navigation and provenance-check cost.
