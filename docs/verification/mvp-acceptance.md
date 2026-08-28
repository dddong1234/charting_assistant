# SOAP Charting Copilot MVP acceptance

Verified on 2026-08-28 against the production Vite build on Windows with local Chromium. No deployment or other external publication was performed.

## Result

The MVP passes the automated quality gates, build-artifact verification, and local browser acceptance checks for the approved desktop hierarchy, the 1366px compatibility target, the narrow stacked workflow, keyboard-only authoring, focus visibility, textual safety/status communication, and reduced motion.

One browser defect was observed and fixed during acceptance: the undeclared site icon caused `/favicon.ico` to return 404. The real-browser check failed before the local SVG icon was declared and passed after rebuilding.

## Commands and evidence

### Build artifact RED → GREEN

The pre-existing generated `dist/` directory was temporarily renamed and restored; no unrelated file was deleted.

```text
node scripts/verify-build.mjs

Build artifact verification failed:
- Missing production entry point: dist/index.html
- Missing bundled assets: dist/assets must contain production files
EXPECTED_RED_EXIT=1
```

A self-review mutation then temporarily renamed only the JavaScript bundle. The first implementation incorrectly passed (exit 0), proving that it did not protect the complete asset contract. After tightening the check, the same mutation failed with `Missing .js production bundle in dist/assets` and exit 1; restoring the bundle returned the check to GREEN. The verifier now requires referenced JavaScript and CSS bundles.

After `npm run build`:

```text
dist/index.html                   0.47 kB
dist/assets/index-DYPXXqqx.css   17.29 kB
dist/assets/index-DTrxRa6A.js   209.57 kB
Build artifact verification passed: dist/index.html references 2 bundled assets.
```

`package.json` now runs the build before `verify:build`, so `npm run verify` also works in a clean checkout where `dist/` does not yet exist.

### Production preview and browser workflow

```powershell
npm exec -- vite preview --host 127.0.0.1 --port 4175 --strictPort
node scripts/verify-browser-acceptance.mjs
```

The required in-app Browser workflow was attempted first with its bundled browser client, `getForUrl("http://127.0.0.1:4175/")`, and a complete-documentation request. Its persistent JavaScript runtime exited before browser selection on every attempt with `windows sandbox failed: helper_unknown_error: setup refresh had errors`; even a one-line health check failed. The installed Windows computer-control fallback used the same unavailable runtime.

Acceptance therefore continued through the permitted standalone fallback. `scripts/verify-browser-acceptance.mjs` launches an installed local Chromium browser headlessly, connects through Chromium DevTools, inspects the real production page, injects native key events, checks browser-computed styles, captures screenshots, and fails on browser exceptions or network errors. `BROWSER_BIN` can override the detected Chrome/Edge executable.

Final browser result:

```text
Browser acceptance verification passed.
browserErrors: []
```

### Viewport findings

| Viewport | Finding |
|---|---|
| 1440×1024 | Header was exactly 64px. Columns were exactly 288px / 816px / 336px. The 720px composer was centered in the workspace. Timeline began at y=642 and remained visible; the full evidence rail was visible. |
| 1366×768 | Columns were 288px / 742px / 336px. Document width and client width were both 1366px. No core control extended outside the viewport; the independently scrollable rails/workspace remained usable. |
| 390×844 narrow override | The page had no horizontal overflow after accounting for the vertical scrollbar (375px client and scroll widths). Full-page order was patient rail → SOAP workspace → evidence rail. Search, editor, evidence, draft save, record save, record add, and evidence expansion were present and within the content width. |

Visual inspection found clear panel boundaries and hierarchy, readable clinical copy, balanced desktop density, intact header actions, and a coherent narrow flow. At 1366px the vertical scrollbars are visible by design because each desktop rail scrolls independently.

### Keyboard, focus, status, and safety findings

- Starting from the page body, 17 plain `Tab` presses reached the unified narrative editor. The computed focus outline was `2px solid rgb(43, 127, 255)`.
- Plain `Tab` in the focused editor accepted the active suggestion, added A/P text to the editable value, removed the pending suggestion, and retained editor focus.
- `Escape` dismissed the suggestion without changing the narrative value or moving focus.
- `Shift+Tab` moved from the editor to the category select while leaving the suggestion pending.
- Keyboard navigation reached synthetic patient `1204-1`; `Enter` selected it and updated the patient context. After keyboard acceptance, a second `Tab` reached `기록 추가`, and `Enter` added the record. Feedback read `20:00 SOAP 간호기록 1건을 추가했습니다.` and the timeline reported two records.
- Textual statuses included `안정`, `주의`, `즉시 검토`, `AI 제안`, and `연결됨`; state was not communicated by color alone.
- The visible disclosure read `데모 환경 · 합성 데이터` and `제안은 확인·수정 후에만 간호기록에 반영됩니다.`
- Chromium matched `prefers-reduced-motion: reduce`; editor and button transition durations computed to `1e-05s` (the `0.01ms` reduced-motion token).
- Chromium also matched `forced-colors: active`; the configured focus color resolved to the system `Highlight` token. `npm run verify:css` separately confirmed the forced-colors focus rules and semantic focus tokens.

### Screenshots

#### 1440×1024

![1440×1024 desktop acceptance](screenshots/mvp-1440x1024.png)

#### 1366×768

![1366×768 desktop acceptance](screenshots/mvp-1366x768.png)

#### Narrow 390×844 full flow

This full-page capture uses a 390×844 viewport override and records the complete stacked document rather than only the first 844px.

![390×844 narrow full-flow acceptance](screenshots/mvp-narrow-390x844-full.png)

## Final project verification

```text
npm run verify

6 test files passed
55 tests passed
Component CSS verification passed.
Production build passed.
Build artifact verification passed: dist/index.html references 2 bundled assets.
```

The standalone follow-up `node scripts/verify-build.mjs` also passed with the same two referenced assets.

## Known MVP limitations and deferred test triage

- All patients and chart facts are synthetic. State exists only in the browser and resets on refresh; there is no backend, authentication, EMR integration, audit signing, real model call, or persistent storage.
- Suggestions are deterministic demonstration scaffolding, not a clinical model. They must remain nurse-reviewed and are not decision support.
- SBAR and physician documentation remain out of scope.
- The narrow layout intentionally becomes a long single document so patient selection, workspace, timeline, and provenance stay available in source and reading order.
- The in-app Browser and Windows computer-control runtimes were unavailable because their shared JavaScript sandbox failed before connection. Screenshots and interaction evidence came from the local Chromium fallback, not the in-app Browser surface.
- Deferred minor test gap from Task 2: category-aware suggestion behavior has no dedicated `일반` category test, although the integrated workflow exercises an `일반` patient draft and suggestion.
- Deferred minor test gap from Task 4: patient search has no dedicated bed-number interaction regression test, although the implemented query combines bed and synthetic patient name. These are test-coverage follow-ups, not observed acceptance failures.

## Vercel free-deployment steps (not executed)

Vercel documents zero-configuration Vite support and says to deploy an existing Vite project by running the Vercel CLI from the project root: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite). Its Hobby plan is free but limited to personal, non-commercial use, so confirm the intended demo qualifies before proceeding: [Vercel Hobby plan](https://vercel.com/docs/plans/hobby).

1. Confirm the intended use qualifies for Vercel Hobby. Use a paid plan instead for commercial/customer-facing use that falls outside Hobby terms.
2. From this repository, run `npm run verify` and `node scripts/verify-build.mjs`.
3. Install the current CLI: `npm install -g vercel`.
4. Authenticate interactively: `vercel login`.
5. Link or create the project from `C:\dev\charting_assistant`: `vercel link`. Select the intended Hobby scope and allow Vercel to detect Vite. If prompted, use build command `npm run build` and output directory `dist`.
6. Create a preview deployment: `vercel deploy`. Review the returned preview URL and deployment logs before promotion.
7. After explicit publication approval and preview acceptance, create the production deployment: `vercel deploy --prod`.
8. Verify the returned production URL and check error logs. Vercel’s current CLI workflow is documented at [Deploying a project from the CLI](https://vercel.com/docs/projects/deploy-from-cli).

Step 6 already publishes a preview URL and step 7 publishes production. Neither command was run during this task because external publication requires a separate explicit action.
