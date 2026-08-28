# Harness Map

This repository maps the four harness-engineering elements to concrete controls.

| Harness element | Repository control | Purpose |
|---|---|---|
| Instruction document | `AGENTS.md` | Makes product, safety, architecture, and workflow invariants explicit. |
| Architecture constraints | Directory boundaries plus ESLint import restrictions | Prevents framework/browser coupling in the domain layer and token drift in UI code. |
| Feedback loop | Vitest, Testing Library, build gate, and CI | Turns behavior and build regressions into immediate failures. |
| Knowledge repository | `docs/specs`, `docs/decisions`, `docs/superpowers/plans` | Preserves approved scope and the reasons behind decisions. |

The reference principle is to improve the environment in which agents work, rather than relying on a one-off prompt. Source: [WikiDocs, “하네스 엔지니어링이란?”](https://wikidocs.net/340862).

