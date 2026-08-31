# Auto-start guided demo for portfolio evaluation

Date: 2026-08-31  
Status: Accepted

## Decision

Start a non-modal three-step guide on every page load:

1. Edit one character in the ordinary nursing-fact input.
2. Review the generated unified SOAP draft and its three supporting synthetic records.
3. Focus the editor and press `Tab` to explicitly accept the draft.

The guide can be skipped at any point. A persistent header control restarts the guide and restores the deterministic search, patient filter, demo patient, draft, evidence, suggestion, and synthetic note state.

## Reason

The MVP's differentiating value is an interaction, not a static screen: ordinary nursing facts become one evidence-linked SOAP narrative only after nurse review. A portfolio evaluator may spend only seconds on the live site and may not know that editing and `Tab` acceptance are available. Auto-start makes the intended customer demo discoverable without a facilitator. Restarting from a known state makes repeated demonstrations reliable.

The guide starts on every page load rather than only on a visitor's first session because this deployment is a repeatable portfolio and customer-demo artifact, not a production EMR with established users.

## Alternatives considered

- Blocking welcome modal: explains the product before interaction, but hides the EMR context and adds a dismiss-first step.
- Static help text only: low visual interruption, but does not prove that editing, evidence review, and explicit acceptance are interactive.
- Persist completion in local storage: appropriate for a production product, but makes repeated portfolio demonstrations harder and can leave evaluators without guidance on shared devices.
- Fully automated animation: visually clear, but does not verify that the evaluator can operate the core workflow.

## Risks

- A floating guide can obscure clinical information on small screens.
- Auto-start can annoy repeat visitors.
- Highlighting may be mistaken for a clinical alert.
- Restarting discards unsaved in-memory demo edits.

## Mitigation and validation

- Keep the guide non-modal, compact, skippable, keyboard accessible, and responsive.
- Use a blue workflow outline and explicit “GUIDED DEMO” labeling rather than warning or danger colors.
- Bring the evidence rail into view when step 2 starts, then move keyboard focus to the narrative editor after evidence confirmation.
- Treat an early explicit `Tab` acceptance as complete after the evaluator confirms the evidence review, avoiding a dead-end state.
- Provide the header restart control and reset only synthetic, non-persistent demo state, including search, filters, and notes added during the session.
- Validate the standard flow, early acceptance, focus handoff, responsive evidence discovery, and deterministic restart with automated interaction tests; also perform desktop visual review at 1440px, responsive layout review, and an evaluator task-success test without facilitator instruction.
