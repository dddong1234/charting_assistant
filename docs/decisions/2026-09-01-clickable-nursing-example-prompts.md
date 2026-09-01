# Put clickable nursing examples beside the composer

## Decision

Add a compact `작성 예시` palette between the record metadata and the unified narrative editor. Show five high-value examples by default—`잘잠`, `통증 3점`, `배액 30cc`, `복도 한바퀴 걸음`, and `오심 없음`—and reveal `잠 못잠`, `보행 못함`, and `숨찬건 없음` through `예시 더보기`.

Each example is a keyboard-reachable button. Selection replaces the current draft, starts the existing input-grounded suggestion flow, clears stale feedback, advances the guided demo when appropriate, and returns focus to the editor so the visitor can continue editing.

## Reason

The guided tour explains the sequence, but a first-time portfolio visitor can still hesitate because the editor does not show the local interpreter's usable vocabulary. A nearby example palette answers “what can I type?” at the moment of need and turns explanation into direct interaction.

The palette uses only phrases already covered by deterministic tests. This preserves the API-free demo and avoids suggesting unsupported clinical language. Five examples make the primary breadth visible without overwhelming the dense EMR workspace; three polarity and absence variants stay one action away.

## Alternatives considered

- Placeholder text with several examples. Rejected because placeholders disappear after typing, are difficult to scan, and cannot start the interaction directly.
- A modal tutorial containing all examples. Rejected because it interrupts charting and duplicates the existing guided tour.
- Always show all eight examples. Rejected because the composer is already information-dense and the extra row reduces timeline visibility on common portfolio viewport sizes.
- Choose an example without focusing the editor. Rejected because visitors should be able to adjust the selected clinical fact immediately and because the next `Tab` action must originate from the editor.

## Risk

- Fixed examples can imply that the product supports only eight phrases. The copy therefore calls them examples, not a complete command list.
- Replacing an existing draft is destructive inside the unsaved editor. In this synthetic portfolio MVP the action label explicitly says `입력`, and no saved timeline record is changed.
- New focusable controls change the natural `Shift+Tab` sequence. Automated keyboard tests now expect the example disclosure control immediately before the editor.
- Example clicks still use the optional model-upgrade path. Missing API access preserves the immediate deterministic suggestion.

## Validation method

- Verify the palette is an accessible named region and every chip has an action-oriented accessible name.
- Verify `통증 3점` replaces the draft, focuses the editor, and renders the corresponding local SOAP suggestion.
- Verify additional examples are absent while collapsed, visible after expansion, and removed after collapse.
- Re-run guided-tour, AI-suggestion, keyboard, CSS-token, lint, build, and complete verification gates.
