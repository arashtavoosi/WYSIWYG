## Plan: Lean WYSIWYG Core Split

Refactor toward a semantic-HTML core with a thin UI adapter. Keep the tested formatting behaviors from the current utility, narrow the public API to selection formatting and normalization, and move toolbar wiring, selection restoration, and active-button state into a separate adapter so the editor remains small both conceptually and in shipped code.

**Minimal Capability Scope**
The minimum supported editing surface for this WYSIWYG should include:

1. Inline styling: color, font, line height
2. Structural blocks: headings, hr, br, quote, lists
3. Embedded content: images
4. Interactive content: links
5. Tabular content: tables

This means the core can no longer be framed as only semantic inline toggles. The core API needs to support three command families:

1. Inline commands: bold, italic, underline, color, font, line-height, links
2. Block commands: headings, blockquote, ordered list, unordered list, hr, line break
3. Embedded node commands: image insertion and table insertion or table transforms

**Core Command Matrix**
1. `toggleInline('bold')`
Behavior: apply or remove `<strong>` on the current selection.
Owner: `core/selection-formatting.js`
Output: semantic tag

2. `toggleInline('italic')`
Behavior: apply or remove `<em>` on the current selection.
Owner: `core/selection-formatting.js`
Output: semantic tag

3. `toggleInline('underline')`
Behavior: apply or remove `<u>` on the current selection.
Owner: `core/selection-formatting.js`
Output: semantic tag

4. `setInlineStyle('color', value)`
Behavior: apply or update `style="color: ..."` on the current selection, typically using a span only when no suitable inline container exists.
Owner: `core/selection-formatting.js`
Output: inline style

5. `setInlineStyle('fontFamily', value)`
Behavior: apply or update `style="font-family: ..."` on the current selection.
Owner: `core/selection-formatting.js`
Output: inline style

6. `setInlineStyle('lineHeight', value)`
Behavior: apply or update line-height on the nearest applicable block container; if the selection spans multiple blocks, update each intersecting block.
Owner: `core/selection-formatting.js` with block-awareness from `core/block-structure.js`
Output: inline style on block elements

7. `upsertLink({ href, target?, rel?, title? })`
Behavior: wrap selection in `<a>` when adding a link, update the nearest active link when editing, and remove the anchor when unlinking.
Owner: `core/linking.js`
Output: semantic tag with attributes

8. `removeLink()`
Behavior: unwrap the active `<a>` while preserving its text or inline children.
Owner: `core/linking.js`
Output: plain inline content

9. `setBlock('heading', { level })`
Behavior: convert the current block or intersecting blocks into `<h1>` through `<h6>`.
Owner: `core/block-structure.js`
Output: semantic block tag

10. `setBlock('paragraph')`
Behavior: normalize the current block back to a paragraph or plain default block container.
Owner: `core/block-structure.js`
Output: semantic block tag

11. `toggleBlock('blockquote')`
Behavior: wrap or unwrap the current block selection in `<blockquote>`.
Owner: `core/block-structure.js`
Output: semantic block tag

12. `toggleList('ul')`
Behavior: convert selected blocks into an unordered list or unwrap them back to blocks.
Owner: `core/block-structure.js`
Output: semantic list structure

13. `toggleList('ol')`
Behavior: convert selected blocks into an ordered list or unwrap them back to blocks.
Owner: `core/block-structure.js`
Output: semantic list structure

14. `insertBreak('line')`
Behavior: insert `<br>` at the caret without leaving the editor in an invalid state.
Owner: `core/block-structure.js`
Output: semantic line break

15. `insertRule()`
Behavior: insert `<hr>` at the current block boundary and place the caret in a valid follow-up block.
Owner: `core/block-structure.js`
Output: semantic block node

16. `insertImage({ src, alt?, title?, width?, height? })`
Behavior: insert `<img>` at the caret or replace the current selection with an image node.
Owner: `core/embed-content.js`
Output: semantic embedded node with attributes

17. `insertTable({ rows, cols, headerRow? })`
Behavior: insert a minimal `<table>` structure with tbody and optional header row.
Owner: `core/embed-content.js`
Output: semantic table structure

18. `updateTable(action, payload)`
Behavior: minimal first-pass table transforms such as add row, add column, delete row, delete column, or toggle header row.
Owner: `core/embed-content.js`
Output: semantic table structure

19. `clear({ inlineOnly?, blocks? })`
Behavior: remove inline formatting, links, and style spans from the selection; optionally reset block-level transforms in a controlled way.
Owner: `core/editor-core.js` coordinating formatting, linking, and block modules
Output: normalized content

20. `normalize()`
Behavior: merge redundant wrappers, remove empty formatting nodes, and restore stable markup after any edit.
Owner: `core/markup-normalization.js`
Output: cleaned DOM

21. `getActiveFormats()`
Behavior: return a read-only snapshot such as `{ bold, italic, underline, color, fontFamily, lineHeight, link, block, list, quote, table }`.
Owner: `core/selection-state.js`
Output: UI-facing state object

22. `getHtml()` and `setHtml(html)`
Behavior: import and export the editable content without any toolbar concern.
Owner: `core/editor-core.js`
Output: HTML string

**Steps**
1. Define the stable editor contract around the minimum command set: inline styling, block structure, embedded nodes, normalization, selection state, and get/set HTML.
2. Phase 1 — isolate core responsibilities into dedicated modules. Separate three concern groups: selection formatting, normalization, and read-only selection state.
3. Phase 1 — define a minimal core API that stays UI-agnostic. Recommended shape: createEditorCore(root, options) or equivalent factory exposing `toggleInline(name, value?)`, `setBlock(type, options?)`, `insertNode(type, payload)`, `clear(options?)`, `normalize()`, `getActiveFormats(selection)`, `getHtml()`, and `setHtml(html)`. This step depends on step 1.
4. Phase 1 — add getActiveFormats(selection) using the same ancestor-walk pattern already present in toggleFormat so the UI can reflect cursor/selection state without duplicating DOM traversal. This closes one of the biggest missing seams in the current implementation.
5. Phase 2 — build a UI adapter that calls the core API. Move toolbar event binding, selectionchange handling, and button active-state rendering into the adapter instead of leaving them inside demo pages.
6. Phase 2 — keep presentation dumb. The HTML demo should only provide toolbar markup, editor container, and adapter initialization. Prefer data attributes for commands so the toolbar can be extended without adding more hardcoded handlers. This can run in parallel with the visual cleanup of the demo once the adapter contract from step 3 is fixed.
7. Phase 2 — use demos/wysiwyg-v1.html as the behavior baseline because it already exercises the new core directly.
8. Phase 3 — harden the core with tests before broadening features. Expand editor-core.test.js around the retained API only: collapsed selection behavior, partial unformat inside nested tags, active-format detection, inline style application, link insertion, list transforms, heading transforms, image insertion, and cleanup after repeated edits. This depends on steps 3 and 4.
9. Phase 3 — defer only truly non-core features to keep footprint under control. Explicitly exclude undo/redo, keyboard shortcuts, advanced table editing UX, drag-and-drop media workflows, collaborative editing, paste sanitization policies beyond the minimum viable path, and arbitrary DOM utility chaining from the first clean architecture pass.
10. Update README.md to document the new split: what belongs to core, what belongs to the UI adapter, and what the canonical output HTML looks like.

**Exact Module Boundaries**
1. `core/editor-core.js`
Own the only documented editor API. This module should expose a small factory such as `createEditorCore(root, options)` and return methods for inline commands, block commands, embedded node insertion, normalization, selection state, and HTML import/export. It should not know about buttons, labels, CSS classes, or demo markup.

2. `core/selection-formatting.js`
Own inline selection mutation only. It handles `wrapSelection`, `toggleFormat`, `unwrapSelection`, `clearFormatting`, and inline styles such as color, font, and line height. This module can depend on DOM Selection and Range APIs, but not on toolbar details.

3. `core/markup-normalization.js`
Own cleanup only. It handles empty formatting cleanup and redundant wrapper simplification. Its job is to guarantee stable semantic output after repeated edits.

4. `core/selection-state.js`
Own read-only inspection of the current selection. Add `getActiveFormats(selection, root)` here so the UI can ask whether bold, italic, underline, color, font, line height, heading level, quote context, list context, link context, or table context are active without reimplementing ancestor traversal. This module must not mutate the DOM.

5. `core/block-structure.js`
Own block-level transforms. This module should handle headings, blockquote, ordered lists, unordered lists, line breaks, and horizontal rules. It should operate on block boundaries and selection context, not on toolbar state.

6. `core/embed-content.js`
Own insertion and normalization of non-text nodes such as images and tables. Keep the first pass narrow: insert image, insert basic table, and normalize surrounding paragraphs or breaks as needed.

7. `core/linking.js`
Own link creation, update, and removal. Links are distinct enough from generic inline styling that they should not be hidden inside the style module. This module should focus on anchor semantics and selection-safe wrapping.

8. `ui/editor-adapter.js`
Own all UI wiring. This module should receive the editor root, toolbar root, and core instance; bind click handlers; map toolbar actions to semantic tags; subscribe to `selectionchange`; and update active button state. It must not contain wrapping, unwrapping, or normalization logic.

9. `ui/toolbar-config.js`
Own the command registry for the toolbar. Define a small data structure such as bold -> `strong`, italic -> `em`, underline -> `u`, clear -> `clear`. This keeps the adapter declarative and keeps command meaning out of the demo page.

10. `ui/toolbar-view.js`
Own DOM class toggling for toolbar state only, for example active or disabled buttons. This keeps button presentation separate from event binding and from editor behavior.

11. `demos/wysiwyg-v1.html`
Keep as the semantic baseline demo. Its long-term role should be only markup, minimal styles, script includes, and one bootstrap call that wires the toolbar to the core through the adapter. It should remain the smallest end-to-end example because it already reflects the semantic direction.

12. `tests/editor-core.test.js`
Use as the core contract suite. Tests should target semantic commands and cleanup behavior, not toolbar details. It can later be complemented with smaller tests for `selection-state`, `block-structure`, `linking`, and `markup-normalization`.

**Public Boundary Rules**
1. Core modules may depend on DOM, Range, Selection, and semantic tag names.
2. Core modules may not depend on button IDs, CSS classes, toolbar structure, or demo HTML files.
3. UI modules may depend on button IDs, data attributes, and DOM events.
4. UI modules may call the core, but may not manipulate the editable DOM directly except for focus management and toolbar state rendering.
5. Demo HTML files may bootstrap modules, but may not contain editor behavior beyond initialization.

**Migration Mapping From Current Files**
1. Keep selection mutation in `core/selection-formatting.js`.
2. Keep read-only inspection in `core/selection-state.js`.
3. Keep block transforms in `core/block-structure.js`.
4. Keep link creation and removal in `core/linking.js`.
5. Keep demos/wysiwyg-v1.html as the architectural baseline.

**Concrete File Creation And Migration Sequence**
1. Create `core/editor-core.js`.
Purpose: define the stable public API and delegate to specialized modules.
First implementation: thin coordinator over inline formatting, normalization, state inspection, linking, and block structure.

2. Create `core/selection-formatting.js`.
Purpose: isolate `wrapSelection`, `toggleFormat`, `unwrapSelection`, `applyStyle`, `removeStyle`, and `clearFormatting` into focused functions.
First implementation: keep support for strong, em, u, color, fontFamily, and lineHeight.

3. Create `core/markup-normalization.js`.
Purpose: isolate empty formatting cleanup and redundant wrapper simplification.
First implementation: preserve current simplify behavior, then widen it to cover anchors and style spans safely.

4. Create `core/selection-state.js`.
Purpose: centralize read-only state inspection for active inline styles, links, lists, block types, and table context.
First implementation: detect strong, em, u, anchor, heading, quote, list, color, fontFamily, and lineHeight.

5. Create `core/linking.js`.
Purpose: isolate link insertion, update, and unlink behavior from generic inline formatting.
Migration source: new implementation
First implementation: add link, edit active link, remove link.

6. Create `core/block-structure.js`.
Purpose: handle headings, blockquote, lists, br, and hr.
Migration source: new implementation
First implementation: heading transform, blockquote toggle, ul toggle, ol toggle, insert br, insert hr.

7. Create `core/embed-content.js`.
Purpose: handle images and tables without polluting inline formatting code.
Migration source: new implementation
First implementation: insert image and insert basic table.

8. Create `ui/toolbar-config.js`.
Purpose: define the command registry in declarative form.
First implementation: include bold, italic, underline, color, fontFamily, lineHeight, heading, quote, ul, ol, link, image, table, hr, br, and clear.

9. Create `ui/toolbar-view.js`.
Purpose: manage active, inactive, and disabled button state only.
First implementation: reflect active button state from `getActiveFormats()`.

10. Create `ui/editor-adapter.js`.
Purpose: bind toolbar events to the core API and subscribe to selection changes.
First implementation: no editor logic beyond routing user intent to the core and reflecting state back into the toolbar.

11. Refactor `demos/wysiwyg-v1.html` into the canonical minimal demo.
Purpose: keep one very small end-to-end page that uses the new modules.
Migration action: replace direct inline event handlers with a tiny bootstrap call.

12. Split tests by responsibility.
Files: keep `tests/editor-core.test.js` as integration coverage, then add targeted tests such as `tests/selection-formatting.test.js`, `tests/block-structure.test.js`, `tests/linking.test.js`, and `tests/embed-content.test.js`.
Purpose: keep the core lean while making regressions easier to localize.

13. Update `README.md` last.
Purpose: document the final API, supported commands, output conventions, and the difference between the minimal demo and the richer demo.

**Implementation Order For The First Working Cut**
1. Build `selection-formatting` and `markup-normalization` as standalone modules.
2. Add `editor-core` as a stable façade over those modules.
3. Add `selection-state` so the adapter has something to render.
4. Add `linking` because links are part of your minimum capability set.
5. Add `block-structure` for headings, quote, lists, br, and hr.
6. Add `embed-content` for image and basic table insertion.
7. Add the UI adapter for future richer demos.
8. Keep `demos/wysiwyg-v1.html` as the smallest canonical demo.
9. Expand tests after each module extraction instead of waiting for the end.

**Relevant files**
- /Users/arashtavoosi/Code/GitHub/WYSIWYG/demos/wysiwyg-v1.html — use as the semantic reference flow and possibly the minimal example page.
- /Users/arashtavoosi/Code/GitHub/WYSIWYG/src/core/editor-core.js — keep as the public editor API and command façade.
- /Users/arashtavoosi/Code/GitHub/WYSIWYG/src/core/selection-formatting.js — keep inline selection mutation separate from UI logic.
- /Users/arashtavoosi/Code/GitHub/WYSIWYG/src/core/block-structure.js — keep block transforms separate from inline formatting.
- /Users/arashtavoosi/Code/GitHub/WYSIWYG/src/core/linking.js — keep link creation and unlinking separate from generic inline styling.
- /Users/arashtavoosi/Code/GitHub/WYSIWYG/tests/editor-core.test.js — keep as the regression suite for the active core API.
- /Users/arashtavoosi/Code/GitHub/WYSIWYG/README.md — document the separation and intended extension points.

**Verification**
1. Run the Jest suite and confirm existing toggle/clear/simplify behavior still passes after the internal split.
2. Add regression tests that assert semantic output for headings, quotes, lists, links, hr, br, images, and tables, and style-preserving output for color, font, and line height.
3. Manually verify toolbar clicks and cursor movement update active button state without duplicating formatting wrappers.
4. Manually verify repeated toggle cycles do not leave empty or nested duplicate tags after normalize().
5. Compare the demo HTML output before and after the refactor to confirm the canonical markup is simpler and more predictable.

**Decisions**
- Canonical output should prefer semantic tags for structure and meaning, while allowing inline styles where the capability itself is style-oriented, such as color, font, and line height.
- Footprint should be balanced: small shipped code, but not at the expense of a muddled API.
- Core and UI should be separate layers; the core must not know about buttons, CSS classes, or toolbar markup.
- Keep a single active architecture centered on `editor-core` and its focused modules; do not preserve a compatibility layer for obsolete APIs.

**Further Considerations**
1. Public API packaging: keep a single distributable file for the browser while organizing internals as modules during development if buildless delivery is not a hard constraint.
2. Collapsed selection semantics: decide whether toggling at the caret should create an empty wrapper immediately or store pending format state; the simpler first version is immediate wrapper insertion only when text is entered or when the selection is non-collapsed.
3. API expansion: add images, tables, and a future adapter layer without reintroducing a legacy compatibility surface.