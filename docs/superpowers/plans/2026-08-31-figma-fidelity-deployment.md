# Figma Fidelity and Vercel Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the deployed React MVP reproduce approved Figma node `39:3` while preserving nurse-controlled, evidence-grounded SOAP charting behavior.

**Architecture:** Keep the existing framework-free domain and synthetic fixtures. Refine `ChartingWorkspace` into the approved three-column desktop EMR shell, change only the presentation-state adapter so the nurse enters ordinary facts and receives one unified SOAP suggestion, and express all visual decisions through existing CSS custom properties.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Testing Library, CSS custom properties, Vercel.

**Spec:** `docs/specs/soap-charting-mvp.md`

## Global Constraints

- The nurse enters familiar factual language without manually typing `S:`, `O:`, `A:`, or `P:`.
- The proposed result is one continuous SOAP narrative in one editor, never four independent fields.
- AI text stays outside the editable value until explicit `Tab` acceptance; `Escape` dismisses it.
- Saved records remain `timestamp + category + unified SOAP narrative` in reverse chronological order.
- Every patient and record is synthetic; the UI must display the demo and nurse-authorship disclosures.
- No backend, network model call, diagnosis, order, treatment recommendation, or persistent storage.
- Desktop fidelity targets 1440×1024 and remains usable at 1366px and narrow widths.
- All behavior changes follow RED → GREEN → REFACTOR.

---

### Task 1: Lock the fact-first authoring contract

**Files:**
- Modify: `src/features/charting/ChartingWorkspace.test.tsx`
- Modify: `src/features/charting/ChartingWorkspace.tsx`

**Interfaces:**
- Consumes: existing `getSuggestion(category, evidence)` and `Patient.evidence`.
- Produces: `getInitialDraft(patient, category?)` returning ordinary fact text and an active unified SOAP suggestion derived from evidence.

- [ ] **Step 1: Write the failing initial-state test**

```tsx
expect(screen.getByRole('textbox', { name: '간호 사실 입력' })).toHaveValue(
  '잠이 안 온다고 호소함. V/S 안정적. PRN 수면제 처방 확인함.',
)
expect(screen.getByRole('textbox', { name: '간호 사실 입력' })).not.toHaveValue(
  expect.stringMatching(/(^|\n)[SOAP]:/),
)
expect(screen.getByLabelText('활성 통합 SOAP 제안')).toHaveTextContent('S:')
expect(screen.getByLabelText('활성 통합 SOAP 제안')).toHaveTextContent('P:')
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:run -- src/features/charting/ChartingWorkspace.test.tsx`

Expected: FAIL because the current textbox is named `SOAP 간호기록 내용` and seeds `S:/O:`.

- [ ] **Step 3: Implement the minimal fact-first adapter**

Seed the selected synthetic patient's ordinary factual input separately from the generated unified SOAP string. Preserve the existing suggestion lifecycle and evidence IDs.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm run test:run -- src/features/charting/ChartingWorkspace.test.tsx`

Expected: PASS with no warnings.

### Task 2: Reproduce the approved EMR information architecture

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/features/charting/ChartingWorkspace.test.tsx`
- Modify: `src/features/charting/ChartingWorkspace.tsx`

**Interfaces:**
- Consumes: the existing patient selection, search, filtering, note insertion, evidence expansion, save feedback, and keyboard handlers.
- Produces: semantic landmarks containing the Figma language `CARENOTE`, `담당 환자`, `새 간호기록`, `간호기록 타임라인`, and `AI REVIEW`.

- [ ] **Step 1: Write failing shell-copy and landmark assertions**

```tsx
expect(screen.getByText('CARENOTE')).toBeVisible()
expect(screen.getByRole('heading', { name: '담당 환자' })).toBeVisible()
expect(screen.getByRole('heading', { name: '새 간호기록' })).toBeVisible()
expect(screen.getByRole('heading', { name: '간호기록 타임라인' })).toBeVisible()
expect(screen.getByRole('heading', { name: 'AI REVIEW' })).toBeVisible()
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm run test:run -- src/App.test.tsx src/features/charting/ChartingWorkspace.test.tsx`

Expected: FAIL on the approved Figma labels.

- [ ] **Step 3: Refactor markup without changing domain behavior**

Compose the 56px dark global header, 268px patient rail, flexible chart workspace, and 320px AI review rail. Keep every interactive control keyboard reachable and retain current accessible names where tests and workflow depend on them.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm run test:run -- src/App.test.tsx src/features/charting/ChartingWorkspace.test.tsx`

Expected: PASS with patient selection, suggestion lifecycle, note insertion, and save feedback intact.

### Task 3: Match Figma tokens, density, and responsive behavior

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/features/charting/charting-workspace.css`
- Modify only if required: `src/components/components.css`

**Interfaces:**
- Consumes: approved CSS variables and class names emitted by Task 2.
- Produces: a 1440×1024 desktop composition matching Figma node `39:3`, with stacked responsive behavior below desktop width.

- [ ] **Step 1: Run the CSS policy gate before editing**

Run: `npm run verify:css`

Expected: PASS, establishing the clean baseline.

- [ ] **Step 2: Implement the visual mapping**

Set the header to 56px, patient rail to 268px, evidence rail to 320px, compact typography to 9–18px, and apply the approved canvas, panel, subtle, selected, action, border, and status tokens. Use no new raw component colors.

- [ ] **Step 3: Run style and component checks**

Run: `npm run verify:css && npm run test:run -- src/components/components.test.tsx`

Expected: PASS with no raw-color or component regressions.

### Task 4: Verify, publish, and confirm Production

**Files:**
- Modify: `docs/verification/mvp-acceptance.md` only when recording fresh evidence.

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: verified build commit on `main`, GitHub push, and a successful Vercel Production deployment for that exact SHA.

- [ ] **Step 1: Run the full quality gate**

Run: `npm run verify`

Expected: lint, CSS policy, all Vitest tests, TypeScript build, Vite build, and artifact verification exit 0.

- [ ] **Step 2: Inspect the production build at target widths**

Run the Vite preview and inspect 1440×1024, 1366×768, and a narrow viewport. Verify no missing core workflow, clipped save action, or inaccessible evidence disclosure.

- [ ] **Step 3: Commit and push**

Commit subject: `feat: align nursing EMR with approved Figma`

Push the verified `main` commit to `origin/main`.

- [ ] **Step 4: Verify Vercel against the pushed SHA**

Query the GitHub commit status and Vercel deployment target. Confirm `context: Vercel`, `state: success`, and the deployment SHA equals the pushed `main` SHA.

## Plan self-review

- Spec coverage: FR-001 through FR-010 remain owned by existing tests; Tasks 1–2 add the missing fact-first and approved-shell coverage.
- Placeholder scan: no TBD, TODO, or unspecified implementation step remains.
- Type consistency: Task 1 changes only the feature adapter and consumes existing domain types; Tasks 2–3 do not add domain interfaces.
- Safety: explicit nurse acceptance, synthetic data, provenance, reverse chronology, and non-persistence remain mandatory throughout.
