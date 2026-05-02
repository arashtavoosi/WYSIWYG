# AGENTS.md

## Purpose

This repository is a small-footprint WYSIWYG editor.

The app is organized around these principles:

1. Keep the core API separate from UI wiring.
2. Keep output semantic where possible.
3. Allow style-based output where the feature is inherently presentational, such as color, font family, and line height.
4. Keep the implementation focused on the active core and UI modules.

This file is the handoff document for future AI agents working on the app.

## Current Repository Shape

Top-level folders:

1. `src/core`
2. `src/ui`
3. `demos`
4. `tests`
5. `docs`

Active entry points:

1. `src/core/editor-core.js`
2. `demos/wysiwyg-v1.html`
3. `tests/editor-core.test.js`
4. focused module tests in `tests`

Package entry:

1. `package.json` points `main` to `src/core/editor-core.js`

## Active Architecture

### Core Modules

1. `src/core/editor-core.js`
Public façade for the editor. This is the main API surface other code should target.

2. `src/core/selection-formatting.js`
Inline formatting behavior.
Current responsibilities:
- bold
- italic
- underline
- generic inline style application
- clear formatting

3. `src/core/markup-normalization.js`
DOM cleanup and simplification after edits.

4. `src/core/html-utility.js`
Shared DOM and selection helpers. Reuse this before adding module-local helpers for selection lookup, closest-tag traversal, caret placement, tag replacement, node unwrapping, or range/element comparisons.

5. `src/core/selection-state.js`
Read-only state inspection for current selection and cursor context.
Current responsibilities:
- active inline marks
- active inline style values
- active block and list detection
- link, table, and image context detection
- heading level instead of only raw block tag reporting
- whether selection is collapsed or expanded
- selected table cell / row / column context
- selected image attributes and editability state

Should likely grow to include:
- block capabilities such as whether quote/list/rule actions are valid at the cursor

6. `src/core/linking.js`
Link insertion and removal.

7. `src/core/block-structure.js`
Block-level transforms and structural insertions.
Current responsibilities:
- headings
- blockquote
- ordered list
- unordered list
- line break
- horizontal rule
- block-level style application for line height

Still missing or likely needed next:
- paragraph normalization around inserted structural nodes
- multi-block transforms instead of current single-block-oriented behavior
- list item indent and outdent behavior
- list item split / merge behavior on enter and backspace boundaries
- heading level changes beyond the current demo path
- more robust blockquote wrapping and unwrapping across multi-node selections
- safer rule insertion around empty blocks and adjacent lists or quotes

8. `src/core/embed-content.js`
Embedded node insertion.
Current responsibilities:
- image insertion
- image update
- image removal
- basic table insertion
- table row insertion and removal
- table column insertion and removal
- header row toggling
- cell targeting helpers for the current selection
- table removal

Should likely expand to cover:
- image caption or wrapper support if the product adds it later
- richer table behavior beyond simple row/column operations

### UI Modules

1. `src/ui/editor-adapter.js`
Bridges toolbar interactions to the core API.

2. `src/ui/toolbar-view.js`
Reflects editor state back into the toolbar and status area.

3. `src/ui/toolbar-config.js`
Small toolbar metadata such as prompt labels and defaults.

### Demo

1. `demos/wysiwyg-v1.html`
This is the only active demo and current baseline.

It should stay as:

1. mostly markup
2. local styles
3. script includes
4. one bootstrap call into the adapter

Do not move editor behavior back into this file unless there is a strong reason.

## Public Core API

The active core façade currently exposes methods including:

1. `toggleInline(name, selection)`
2. `setInlineStyle(propertyName, value, selection)`
3. `setBlock(type, options, selection)`
4. `toggleBlock(type, selection)`
5. `toggleList(type, selection)`
6. `upsertLink(attributes, selection)`
7. `removeLink(selection)`
8. `insertBreak(selection)`
9. `insertRule(selection)`
10. `insertImage(attributes, selection)`
11. `insertTable(config, selection)`
12. `clear(selection)`
13. `normalize()`
14. `getActiveFormats(selection)`
15. `getHtml()`
16. `setHtml(html)`
17. `updateImage(attributes, selection)`
18. `removeImage(selection)`
19. `insertTableRow(position, selection)`
20. `removeTableRow(selection)`
21. `insertTableColumn(position, selection)`
22. `removeTableColumn(selection)`
23. `toggleTableHeaderRow(selection)`
24. `removeTable(selection)`

`getActiveFormats(selection)` also reports collapsed selection state, heading level, selected image attributes, and table cell context.

## Supported Feature Scope

Minimum target scope for the app:

1. Inline styling
- color
- font family
- line height

2. Structural blocks
- headings
- hr
- br
- quote
- lists

3. Embedded content
- images
- tables

4. Interactive content
- links

## Current Demo Controls

The current baseline demo already exposes:

1. bold
2. italic
3. underline
4. H2
5. quote
6. bullet list
7. numbered list
8. color
9. font family
10. line height
11. link
12. unlink
13. image
14. table
15. br
16. hr
17. clear formatting
18. image update
19. image removal
20. table row add/remove
21. table column add/remove
22. table header row toggle
23. table removal

## Important Constraints

1. Work only within the active core and UI architecture unless the user explicitly asks for a structural change.
2. Keep core modules UI-agnostic.
3. Keep UI modules free of content-manipulation logic beyond calling the core.
4. Keep the demo as a thin shell over the adapter.
5. Prefer semantic HTML for structure and meaning.
6. Allow inline styles only where semantics are not a good fit, such as color, font family, and line height.
7. Preserve the small-footprint goal. Avoid framework-heavy or build-heavy changes unless explicitly requested.
8. Be cautious about file size. Prefer the smallest change that solves the behavior, reuse existing helpers before adding new ones, and avoid large abstractions unless they clearly reduce code.

## Output Model

Expected output conventions:

1. Semantic tags for meaning and structure
- `strong`
- `em`
- `u`
- `a`
- `h1` to `h6`
- `blockquote`
- `ul`
- `ol`
- `li`
- `hr`
- `br`
- `img`
- `table`
- `thead`
- `tbody`
- `tr`
- `th`
- `td`

2. Inline styles for presentation-driven features
- `color`
- `font-family`
- `line-height`

## Testing Status

Active test files:

1. `tests/editor-core.test.js`
2. `tests/editor-adapter.test.js`
3. `tests/linking.test.js`
4. `tests/block-structure.test.js`
5. `tests/embed-content.test.js`
6. `tests/selection-state.test.js`

Current coverage includes:

1. inline bold toggling
2. active format detection
3. link creation/removal
4. heading conversion
5. list toggling
6. color styling
7. line-height styling
8. image insertion
9. table insertion
10. image update/removal
11. table row/column/header/removal operations
12. richer selection state
13. toolbar selection preservation and native select behavior

Important environment note:

1. `package.json` declares Jest dependencies
2. Before relying on test execution, ensure dependencies are installed with `npm install`

## Known Limitations

These are known incomplete or intentionally minimal areas:

1. Image support is still intentionally minimal.
There is update/remove support, but no caption or wrapper model yet.

2. Table editing is intentionally basic.
There are row, column, header-row, and table-removal commands, but no advanced merge/split or keyboard navigation model yet.

3. Selection state reports useful context, but block capability reporting is still shallow.

4. Line-height currently applies to the current block, not a multi-block selection range.

5. The UI adapter still contains command execution logic.
Only small toolbar metadata lives in `src/ui/toolbar-config.js`.

6. The demo uses `window.prompt` for link, image, and table inputs.
This is acceptable for now, but it is not the intended long-term UX.

7. Block editing remains single-block-oriented in several paths.

## Recommended Next Steps

If continuing development, the highest-value next tasks are:

1. Expand `block-structure.js`
- improve multi-block transforms
- add more reliable block splitting and merging behavior
- add list indent/outdent behavior if the editor grows toward document-style editing

2. Improve style application behavior
- smarter color/font wrapping
- normalize redundant style spans
- better multi-block line-height handling

3. Improve prompt-based UX for links, images, and tables without moving editor logic into the demo.

## Editing Guidance For Future Agents

When making changes:

1. Start from `editor-core.js` and work outward.
2. Do not put editor logic into the demo page.
3. Prefer small, isolated module changes.
4. Keep no-build browser compatibility unless the user explicitly asks for a bundler or framework.
5. If a feature requires both core and UI work, land the core API first, then wire the adapter, then update the demo.
6. If you change selection or DOM mutation behavior, add or update tests in `tests/editor-core.test.js` or split out a focused test file.
7. Reuse `src/core/html-utility.js` for DOM/selection helpers instead of creating duplicate helpers in feature modules.

## Current Files To Read First

Future agents should read these first before making changes:

1. `src/core/editor-core.js`
2. `src/core/html-utility.js`
3. `src/core/selection-state.js`
4. `src/core/block-structure.js`
5. `src/core/linking.js`
6. `src/core/embed-content.js`
7. `src/ui/editor-adapter.js`
8. `src/ui/toolbar-config.js`
9. `src/ui/toolbar-view.js`
10. `demos/wysiwyg-v1.html`
11. `tests/editor-core.test.js`
12. `docs/plan-wysiwyg.prompt.md`
