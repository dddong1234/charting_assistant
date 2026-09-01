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

1. On page load, optionally follow the non-blocking guided demo: edit one fact, review its evidence, then accept the unified SOAP draft with `Tab`.
2. Select one synthetic patient from the patient rail.
3. Review the patient context and existing reverse-chronological SOAP notes.
4. Choose the timestamp and note category.
5. Enter observed, reported, and performed facts in familiar language without manually typing `S:`, `O:`, `A:`, or `P:`.
6. Receive one inline unified SOAP draft grounded in the evidence panel.
7. Accept with `Tab`, dismiss with `Escape`, or continue editing.
8. Add the note and see it at the top of the timeline.
9. Optionally save the current draft or mark the record set saved for the demo.

## Functional requirements

| ID | Requirement | Acceptance criterion |
|---|---|---|
| FR-001 | Patient context | Selecting a patient updates header, notes, composer draft, and evidence without a page reload. |
| FR-002 | Patient search and filter | Search matches bed or synthetic patient name; “확인 필요” shows only watch/danger patients. |
| FR-003 | Fact-first unified SOAP editor | The composer uses one text-editing surface. The nurse may enter ordinary facts without SOAP labels; the proposed saved result is one continuous S/O/A/P narrative, never four independent fields. |
| FR-004 | Inline suggestion | A visible suggestion is not part of the saved narrative until explicitly accepted. |
| FR-005 | Keyboard control | While editing, `Tab` accepts and `Escape` dismisses the active suggestion. |
| FR-006 | Evidence provenance | The evidence panel distinguishes the current draft, matching supporting records, and prior conflicting records; same-category proximity alone is not labeled as support. |
| FR-007 | Chronological notes | Adding a valid note inserts one timestamped/category-tagged SOAP record in reverse chronological order. |
| FR-008 | Nurse control | The nurse can freely change accepted text before adding the record. |
| FR-009 | Draft feedback | Draft-save and record-save actions return explicit, non-ambiguous feedback. |
| FR-010 | Safety disclosure | The interface visibly states that it is a synthetic-data demo and suggestions require review. |
| FR-011 | Guided demo | Every page load starts a skippable three-step guide for fact editing, evidence review, and explicit `Tab` acceptance. The guide does not block chart editing and can be restarted from the header. |
| FR-012 | Input-grounded model upgrade | After a nurse edits a safe non-empty synthetic fact draft, the client may request a model suggestion using that current text and chart evidence. Only the latest server-validated result may replace a deterministic suggestion or activate a model-only suggestion. |
| FR-013 | Resilient fallback | Missing/inactive API access, timeout, rate limit, network error, or rejected model output leaves any deterministic suggestion active and shows a textual fallback state. If no deterministic suggestion exists, the editor explicitly states that AI is unavailable and the local rules cannot propose a draft. |
| FR-014 | API-free local fact interpretation | High-value Korean nursing shorthand (`잘잠`, `잠 못잠`, `오심 없음`, `통증 0–10점`, `배액 n cc/mL`, ward ambulation, and absent dyspnea) immediately changes the SOAP draft without a server call. Unsupported or unsafe current input must not recycle a contradictory prior note. |
| FR-015 | Current/prior conflict notice | When a current fact conflicts with historical evidence, keep the current-input SOAP separate from a visible warning that names the conflict and asks the nurse to confirm state and record time. The warning is never inserted into the saved SOAP narrative. |
| FR-016 | Discoverable writing examples | The composer shows five supported synthetic nursing phrases and an accessible control for three additional examples. Selecting an example replaces the draft, focuses the editor, and immediately starts the same suggestion flow as typed input. |

## Demo data and suggestion scope

- Use six synthetic general-surgery patients mirroring the approved Figma density.
- Include V/S and general state, PRN medication administration, pain, drain, diet, and ambulation context.
- Suggestions may summarize or continue supplied chart facts.
- Suggestions must not invent diagnoses, orders, medication changes, or treatment plans.
- A deterministic suggestion appears immediately. A server model may replace it only after evidence, token-grounding, and unsafe-language validation.
- The local interpreter treats the nurse's current draft as the current-state source and chart evidence as historical context. It normalizes only recognized high-confidence shorthand; detailed source text keeps the richer evidence-grounded fallback.
- A model result that semantically contradicts a recognized current sleep fact in either direction is rejected before rendering.
- Safe Korean phrasing outside the local lexicon may use the optional model, but invalid values, planned care, non-Korean noise, diagnosis/order language, and other prohibited input never reach it.
- NRS extraction accepts only a complete integer from 0 to 10; values such as `100`, `10.5`, and `-1` are invalid rather than truncated.
- The example palette contains only synthetic phrases covered by the deterministic interpreter. It teaches the input grammar without presenting diagnosis, order, or medication-recommendation language.
- Model inference receives synthetic draft text, selected category, and minimized synthetic evidence only. It must be labeled separately from the deterministic fallback.

## Non-functional requirements

- Desktop-first fidelity at 1440×1024, usable at 1366px width, and a coherent stacked layout on smaller screens.
- Korean UI using Noto Sans KR with system fallbacks.
- Visible focus styles, semantic landmarks, accessible labels, and reduced-motion support.
- No login, real patient data, persistent server storage, analytics, or external integration other than the single suggestion route.
- The OpenAI API key is server-only. Missing or inactive API access must not block the demo.
- Production build must be deployable as a Vite site plus one Vercel Node function.

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

- Real EMR integration, FHIR, authentication, audit signing, real PHI, production clinical deployment, voice capture, clinical decision support, automated orders, billing, or regulatory certification.
- SBAR handoff generation is Phase 2.
- Physician documentation is Phase 3.

## Decision rationale summary

- Nurse-first: work repeats 24/7 across the ward and saved time can become direct care.
- SOAP-first: the user clarified that one chronological nursing record follows SOAP; SBAR is not the primary record.
- Fact-first input: the nurse supplies observations and performed care in familiar language; the system structures those supplied facts into one reviewable SOAP draft.
- Hybrid suggestions: deterministic output protects the live demo; a validated server model proves that the current nurse input can change the proposed SOAP note.
- Local-first semantics: the portfolio demo must react to common ward shorthand even with no API key. Unknown text hides the suggestion instead of presenting an unrelated historical statement with false confidence.
- Current fact precedence: a current nurse observation describes the present charting moment; prior chart evidence provides context and may legitimately differ. The difference is shown as a review warning outside the note rather than silently overwritten or copied into SOAP.
- Server-only model access: it keeps the key out of the browser and creates one validation boundary before generated text reaches the nurse.
- Three-panel desktop layout: patient context, authoring, and evidence remain visible together, reducing navigation and provenance-check cost.
- Auto-start guided demo: portfolio reviewers can discover the core interaction without instruction, while skip and restart controls preserve exploration and repeatable demonstrations.
