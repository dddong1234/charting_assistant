# Unified SOAP suggestion presentation

## Decision

Render the nurse-authored draft and the active deterministic completion inside one bordered editor shell while keeping the native `textarea` as the only input. The completion remains an adjacent, teal, `aria-describedby` preview and is appended to the textarea only when the focused editor receives `Tab`.

The feature adapts the domain suggestion into the missing SOAP continuation by rendering the domain's exact, category-specific evidence completion on the `A:` line and a review-oriented `P:` line. The evidence rail is filtered by the same suggestion source IDs. Continuing to type or pressing `Escape` dismisses the completion without changing the authored value.

## Reason

The approved Figma screen shows authored and suggested text in two colors inside one visual editor, while the product contract requires one unified input and explicit nurse acceptance. The domain engine returns safe evidence snippets rather than a ready multiline SOAP continuation, so the feature layer must add presentation structure without inventing patient facts or losing provenance.

## Alternatives considered

- Put the suggestion directly in the textarea value. Rejected because it would be committed without an explicit nurse action.
- Use a second textarea for the suggested A/P content. Rejected because it would split the unified SOAP editor and create ambiguous focus and save behavior.
- Use a `contenteditable` overlay to mix colors character by character. Rejected because the MVP does not need the added selection, composition, and accessibility complexity.
- Replace the domain completion with generic A/P copy. Rejected after self-review because category changes could make the displayed suggestion diverge from the evidence IDs shown in the rail.

## Risk

The deterministic completion intentionally repeats a source fact on the `A:` line rather than generating a richer nursing assessment. This preserves factual grounding for the demo but is less clinically natural than a production suggestion model. The seeded `S:` line also requires nurse review before a final record is appropriate.

## Validation method

Real `ChartingWorkspace` integration tests verify that the preview is excluded from the input, `Tab` accepts it only while editing, `Escape` and continued typing dismiss it without mutation, category-specific preview copy matches its evidence source, and the completed unified narrative can be edited and added chronologically. Task 5 will perform the dedicated visual and clinical-copy acceptance pass.
