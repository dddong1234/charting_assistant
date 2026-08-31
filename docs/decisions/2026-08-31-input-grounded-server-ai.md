# Add a validated server AI upgrade without removing the deterministic fallback

## Decision

Add one Vercel server function, `POST /api/suggest`, that sends the current synthetic nurse draft and minimized synthetic chart evidence to the OpenAI Responses API. The client always renders a deterministic SOAP suggestion first, waits 700 ms after an edit, and replaces it only with the latest response that passes server-side structure, evidence-ID, clinical-token, and unsafe-language checks.

The OpenAI key remains server-only in `OPENAI_API_KEY`. Until the key is activated, the route returns an explicit `missing-key` fallback and the entire guided demo remains usable.

## Reason

The deterministic prototype proved the interaction but did not react semantically to what a visitor typed. That made the central portfolio claim—turning the nurse's current facts into a structured note—look like a static shell. Calling the model from the server proves the input-aware path while preserving nurse review and keeping credentials out of the browser.

The fallback remains because portfolio demonstrations must not depend on API activation, latency, quota, or network availability. It also gives immediate feedback during the model request.

## Alternatives considered

- Keep the deterministic engine only. Rejected because arbitrary edits cannot change the meaning of the suggestion.
- Call OpenAI directly from the browser. Rejected because it exposes the API key and removes the server validation boundary.
- Hide the suggestion until the model responds. Rejected because latency or failure would recreate the fragile demo behavior already observed.
- Train or host a custom clinical model. Rejected for the MVP because it requires a governed dataset, evaluation corpus, inference infrastructure, and substantially greater clinical-risk work.
- Add a database, login, and production audit trail now. Deferred because they do not improve the smallest customer-demoable input-to-suggestion loop.

## Risk

- A public anonymous endpoint can be abused. The in-memory limiter and request caps are best-effort only; the deploy owner must set an OpenAI project budget and Vercel rate limiting before enabling a public key.
- OpenAI API abuse-monitoring logs may retain request content for up to 30 days by default. This build therefore remains synthetic-only and visibly prohibits real patient information.
- Token grounding catches unsupported numbers, medication-like Latin terms, evidence IDs, and prohibited language, but it is not a complete clinical factuality proof. Model text remains an unsigned suggestion requiring nurse review.
- An inactive key means the live deployment demonstrates only the deterministic path until `OPENAI_API_KEY` is configured.

## Validation method

- Unit-test deterministic construction, malformed requests, unknown evidence IDs, unsupported dosage/medication tokens, and prohibited clinical language.
- Inject a fake generator into the Vercel handler and test success, missing key, upstream error, invalid output, and rate limiting without contacting OpenAI.
- Test that the current editor text reaches the client boundary after debounce, fallback stays visible, the newest verified response wins, and older responses are ignored.
- Re-run existing `Tab`, `Escape`, guided demo, evidence, and timeline tests.
- Run `npm run verify` before merge and deployment.

