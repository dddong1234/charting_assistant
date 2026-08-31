# SOAP Charting Copilot MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Deliver a customer-demoable, static web MVP that reproduces the approved Figma screen and lets a nurse complete, accept, edit, and save one evidence-linked chronological SOAP nursing note.

**Architecture:** A Vite React SPA composes feature-level workflows around framework-free TypeScript domain functions and synthetic fixtures. A deterministic suggestion engine supplies safe demo completions; all state remains in the browser. CSS custom properties implement the approved Figma tokens and responsive three-panel layout.

**Tech Stack:** React, TypeScript, Vite, Vitest, React Testing Library, user-event, jsdom, ESLint, CSS custom properties, Vercel static hosting.

**Spec:** `docs/specs/soap-charting-mvp.md`

## Global Constraints

- One saved note is exactly `timestamp + category + one unified SOAP narrative`; never split S/O/A/P into separate inputs.
- Notes render in reverse chronological order.
- An AI suggestion remains visually distinct and excluded from the narrative until explicit acceptance.
- `Tab` accepts and `Escape` dismisses only when the editor has an active suggestion.
- Evidence supporting the current suggestion stays visible in the right panel.
- Synthetic patient data only; no network requests, real PHI, diagnosis/order/treatment recommendation, or external model API.
- Approved desktop structure and tokens come from Figma node `39:3`; responsive behavior must retain the same information hierarchy.
- The nurse enters ordinary observed and performed facts without manually typing SOAP labels; the accepted result remains one unified SOAP narrative.
- Every behavior change follows RED → GREEN → REFACTOR and records commands/results in the task report.

---

### Task 1: Establish the executable harness and application shell

**Files:**
- Create: `package.json`
- Create: `package-lock.json` via `npm install`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `eslint.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/test/setup.ts`
- Create: `.github/workflows/verify.yml`
- Test: `src/App.test.tsx`

1. Write `src/App.test.tsx` asserting the real app exposes the `Charting Copilot` banner and the three named landmarks: patient list, SOAP workspace, and suggestion evidence.
2. Run `npm run test:run -- src/App.test.tsx`; verify RED because the application files do not exist.
3. Add the minimal Vite/React/TypeScript configuration, test setup, semantic app shell, and placeholder landmarks.
4. Configure ESLint so `src/domain/**` cannot import React, `src/features`, `src/components`, or browser-only modules.
5. Configure `npm run verify` to run lint, tests, and build, and mirror it in GitHub Actions.
6. Run the focused test, then `npm run verify`; verify GREEN with pristine output.
7. Commit with subject `chore: establish MVP development harness`.

### Task 2: Model synthetic patients, notes, evidence, and safe suggestions

**Files:**
- Create: `src/domain/charting.ts`
- Create: `src/domain/charting.test.ts`
- Create: `src/data/syntheticPatients.ts`
- Create: `src/data/syntheticPatients.test.ts`

1. Write table-driven tests for parsing valid `HH:mm`, reverse-chronological note insertion, non-empty unified SOAP validation, and category-aware suggestion selection.
2. Add tests proving the suggestion result carries evidence IDs and never contains disallowed diagnosis/order recommendation patterns.
3. Run `npm run test:run -- src/domain/charting.test.ts src/data/syntheticPatients.test.ts`; verify RED because the modules do not exist.
4. Implement `Patient`, `NursingNote`, `Evidence`, `Suggestion`, `NoteCategory`, `validateDraft`, `insertChronologically`, and `getSuggestion` as framework-free TypeScript.
5. Add six synthetic general-surgery patient fixtures with notes and evidence matching the approved UI density.
6. Re-run focused tests; verify GREEN, then refactor without changing behavior.
7. Run `npm run verify` and commit with subject `feat: add synthetic SOAP charting domain`.

### Task 3: Implement design tokens and reusable clinical UI components

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/components/Button.tsx`
- Create: `src/components/StatusChip.tsx`
- Create: `src/components/PatientListItem.tsx`
- Create: `src/components/EvidenceItem.tsx`
- Create: `src/components/KeyboardHint.tsx`
- Create: `src/components/NursingNoteCard.tsx`
- Create: `src/components/components.css`
- Test: `src/components/components.test.tsx`

1. Write component behavior tests for accessible button labels, textual status labels, selected patient state, evidence provenance, keyboard hint text, and one unified SOAP narrative per note card.
2. Run the focused component test and verify RED for missing modules.
3. Implement the components using semantic HTML and token variables matching Figma node `27:100`.
4. Add visible focus styles and reduced-motion handling; ensure status is communicated by text and not color alone.
5. Run focused tests, then `npm run verify`; verify GREEN.
6. Commit with subject `feat: build charting design system components`.

### Task 4: Build the interactive chronological SOAP workspace

**Files:**
- Create: `src/features/charting/ChartingWorkspace.tsx`
- Create: `src/features/charting/charting-workspace.css`
- Create: `src/features/charting/ChartingWorkspace.test.tsx`
- Modify: `src/App.tsx`

1. Write an integration test that searches and selects a patient and observes header, notes, draft, and evidence update together.
2. Write an integration test that focuses the unified editor, verifies suggestion text is not in its value, presses `Tab`, and verifies the suggestion enters the editable value.
3. Write an integration test that presses `Escape` and verifies the suggestion disappears without changing the editor value.
4. Write an integration test that selects a category, edits the narrative, adds a valid record, and verifies one new note appears first in the timeline.
5. Write integration tests for invalid draft feedback, watch-patient filtering, draft save feedback, record save feedback, and evidence expansion.
6. Run the focused integration tests after each new test and verify each RED for the intended missing behavior.
7. Implement the smallest state transitions and compose the three-panel screen: 288px patient rail, flexible main workspace, 336px evidence rail.
8. Make 1366px and narrow layouts usable without losing any core workflow or safety disclosure.
9. Run focused tests, then `npm run verify`; verify GREEN with pristine output.
10. Commit with subject `feat: implement interactive SOAP charting workflow`.

### Task 5: Perform visual, accessibility, and deployment verification

**Files:**
- Create: `scripts/verify-build.mjs`
- Create: `docs/verification/mvp-acceptance.md`
- Modify: `package.json`
- Modify as required by verified defects only: `src/**`

1. Write a build-artifact test in `scripts/verify-build.mjs` that exits non-zero when `dist/index.html` or bundled assets are missing.
2. Run it before build and verify RED for the missing artifact; run `npm run build`, then verify GREEN.
3. Start the production preview and inspect the page at 1440×1024, 1366×768, and a narrow viewport against the approved Figma hierarchy.
4. Exercise keyboard-only acceptance/dismissal, patient selection, record addition, focus visibility, and reduced-motion behavior.
5. Fix only observed defects, adding a failing regression test before each behavioral fix.
6. Record commands, results, screenshots if created, known MVP limitations, and Vercel deployment steps in `docs/verification/mvp-acceptance.md`.
7. Run `npm run verify` and `node scripts/verify-build.mjs`; verify all gates pass with current output.
8. Commit with subject `test: verify MVP acceptance and deployability`.

## Plan self-review

- Spec coverage: FR-001 through FR-010 are assigned to Tasks 2–5.
- Safety coverage: synthetic-only data, explicit acceptance, provenance, and no clinical recommendation are global constraints and tested in Tasks 2 and 4.
- Type consistency: domain types are introduced in Task 2 and consumed by Tasks 3–4; Task 1 contains only the shell.
- Dependency order: executable harness → domain → components → integrated workflow → visual/deployment verification.
- Placeholders: none; every task names exact files, behavior, commands, and commit subjects.
- Scope control: no backend, real AI, EMR integration, SBAR generation, physician workflow, or analytics vendor is included.
