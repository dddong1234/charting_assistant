# ADR-0001: Static React MVP with deterministic evidence-linked suggestions

Date: 2026-08-28  
Status: Accepted

## Decision

Build the first customer demo as a React + TypeScript + Vite single-page application. Use synthetic in-memory fixtures and a deterministic, category-aware suggestion engine. Deploy the compiled static site to Vercel.

## Reason

The immediate validation question is whether nurses understand and value the unified SOAP editor, inline acceptance interaction, timeline, and evidence provenance. A backend or external model would increase cost, latency, privacy, and integration work without improving that customer-facing test.

## Alternatives considered

- Next.js with server routes: useful later for secured inference and audit services, but unnecessary for the approved static MVP.
- Live LLM API: more generative variety, but creates credential, cost, latency, and clinical-safety risks before the interaction is validated.
- Pure static mockup: visually cheaper, but cannot validate acceptance, dismissal, editing, patient switching, or time-saving behavior.

## Risks

- Customers may mistake deterministic suggestions for model quality.
- In-memory behavior cannot demonstrate production integration or auditability.

## Mitigation and validation

- Label the environment as a synthetic-data demo and explain that the engine is a prototype.
- Test the complete authoring flow with 5–8 nurses before choosing a production model or integration architecture.

