## Ravan module architecture

Ravan keeps the editor behavior UI-agnostic and composes the full browser editor from focused modules. The source tree is also the no-build dependency graph; `src/ravan-loader.js` loads it in order when a bundle is not used.

### Core

- `src/core/editor-core.js` is the public core façade and delegates mutations and state queries.
- `src/core/history.js` owns snapshots, the history limit, undo, and redo.
- `src/core/selection.js` owns editor-scoped selection containment, bookmarks, and insertion ranges.
- `src/core/normalization.js` owns semantic cleanup after edits.
- `src/core/state.js` owns read-only active-format inspection.
- `src/core/commands/inline.js` owns inline tags and inline styles.
- `src/core/commands/block.js` owns headings, blockquotes, breaks, rules, and block styles.
- `src/core/commands/list.js` owns ordered and unordered list transforms.
- `src/core/commands/link.js` owns link creation, update, and removal.
- `src/core/commands/media.js` owns image, video, and audio operations.
- `src/core/commands/table.js` owns table insertion and table transforms.
- `src/core/commands/code-block.js` owns semantic `<pre><code>` insertion and editing.
- `src/core/html-utility.js` contains shared DOM and Range primitives used by the core commands.

`editor-core.js` does not know about buttons, labels, CSS classes, dialogs, or custom elements. Each command module receives the current selection and a small options object, so the same behavior can be used by the API or another UI.

### UI

- `src/ui/toolbar/schema.js` declares toolbar groups, controls, visibility, and command callbacks.
- `src/ui/toolbar/view.js` renders controls and synchronizes active/disabled state.
- `src/ui/toolbar/controller.js` routes toolbar events to the schema without embedding editor mutations.
- `src/ui/dialogs/service.js` provides the reusable prompt and form-dialog boundary.
- `src/ui/overlays/manager.js` owns lazy custom-element overlay creation and removal.
- `src/ui/components/web-components.js` registers the modal, popup, resize, table-selection, and file-browser elements.
- `src/ui/code-view.js` provides the optional source editor.
- `src/ui/editor-adapter.js` composes the editor, dialogs, overlays, code view, and toolbar.

### Facades and loading

- `src/ravan.js` resolves the wrapper/editor/toolbar elements and exposes `Ravan.mount`.
- `src/ravan-loader.js` optionally loads source modules or `dist/ravan.min.js`, using `codeView`, `findReplace`, media settings, and toolbar items to include optional UI modules.
- `build/entries/core.js` exposes the core-only bundle.
- `build/entries/full.js` exposes the full `Ravan` bundle.
- `scripts/build.mjs` also emits the minified `dist/ravan-loader.min.js` used by both demos.
- `scripts/build.mjs` emits minified `dist/editor-content.min.css` and `dist/toolbar.min.css` for the demo styles.

The public configuration is grouped by ownership: `elements`, `editor`, `toolbar`, `assets`, `media`, `codeView`, `findReplace`, and `dialogs`. `toolbar` contains the command tree only; it is not a catch-all settings object.

### Migration and verification

The old combined command files were split into the modules above. The full Jest suite remains the regression contract for semantic HTML, selection behavior, history, toolbar routing, dialogs, overlays, and custom elements. The loader has focused coverage for optional-module decisions and dependency order.

Verification commands:

```sh
npm test -- --runInBand
npm run build
git diff --check
```
