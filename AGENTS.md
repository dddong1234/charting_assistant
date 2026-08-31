# Charting Copilot Development Harness

## Mission

Build the smallest customer-demoable web MVP that helps three-shift general-surgery ward nurses turn existing chart facts into one chronological SOAP nursing note while preserving nurse review and authorship.

## Product invariants

- The primary user is a ward nurse, not a physician.
- One saved record is `timestamp + category + one unified SOAP narrative`.
- SOAP is written in one editor. Never split S/O/A/P into independent cards or form fields.
- Saved records are shown in reverse chronological order.
- AI output is a suggestion only. It is never committed without an explicit nurse action.
- Every suggestion exposes its supporting synthetic chart evidence.
- The MVP contains synthetic patients only. Never add real names, identifiers, tokens, or protected health information.
- Do not generate diagnoses, acuity decisions, medication orders, test orders, or treatment recommendations.
- SBAR is a later handoff-summary extension derived from saved SOAP notes, not the primary MVP editor.
- A physician SOAP product is Phase 3 and is out of scope for this build.

## Architecture rules

- `src/domain/` contains framework-free TypeScript and may not import React or browser APIs.
- `src/data/` contains synthetic fixtures only.
- `src/components/` contains focused presentational components.
- `src/features/` owns interactive workflows and composes domain functions and components.
- The only allowed network path is `POST /api/suggest`, a server-side OpenAI suggestion route for synthetic demo facts. No persistent backend, authentication, analytics vendor, or other external integration is allowed.
- The browser must never receive `OPENAI_API_KEY`; missing or inactive model access must preserve the deterministic fallback.
- Use CSS custom properties from `src/styles/tokens.css`; do not scatter raw colors through component CSS.
- User-visible clinical copy is Korean and should match the approved Figma language.

## Required workflow

1. Read `docs/specs/soap-charting-mvp.md` and the active plan before changing behavior.
2. Follow strict TDD for behavior: write one failing test, observe the expected failure, add the smallest implementation, then refactor.
3. Run focused tests while iterating; run `npm run verify` before committing.
4. Keep test output free of warnings.
5. Record material product or architecture decisions in `docs/decisions/` with the reason, alternatives, risk, and validation method.

## Quality gates

- `npm run lint`
- `npm run test:run`
- `npm run build`
- `npm run verify`

## Accessibility and interaction

- All interactive controls must be keyboard reachable and visibly focused.
- `Tab` accepts an active inline suggestion only while the narrative editor is focused.
- `Escape` dismisses an active suggestion.
- Status must not be communicated by color alone.
- Respect `prefers-reduced-motion`.

