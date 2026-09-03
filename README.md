# Ravan

Small-footprint browser editor with a UI-agnostic core.

## Structure

- `src/core/editor-core.js`: public core API.
- `src/core/*`: shared HTML utilities, selection formatting, block structure, linking, embeds, state, and markup normalization.
- `src/ravan.js`: branded full-editor facade.
- `src/ui/*`: toolbar wiring, toolbar command schema, toolbar state rendering, the slim HTML code view, and small UI web components.
- `src/editor-config.js`: normalizes the public editor configuration into its feature-owned sections.
- `build/entries/*`: release bundle entry points.
- `scripts/build.mjs`: esbuild bundling and minification script.
- `demos/ravan.html`: no-build demo shell.
- `demos/ravan-bundled.html`: demo that loads `dist/ravan.min.js`.
- `tests/*`: Jest/jsdom coverage.

## Core API

The core is created with:

```js
const editor = createEditorCore(editorElement);
```

Main methods:

- inline: `toggleInline`, `setInlineStyle`, `clear`
- blocks: `setBlock`, `toggleBlock`, `toggleList`, `insertBreak`, `insertRule`, `insertCodeBlock`
- links: `upsertLink`, `removeLink`
- media: `insertMedia({ type: 'image'|'video'|'audio', src })`, `updateMedia({ type, src })`, `removeMedia()`, `setMediaStyle()`, `toggleMediaWidth()`; video/audio support `controls`, `autoplay`, `loop`, `muted`, and `preload`, while video also supports `poster` and `playsinline`
- images: `insertImage`, `updateImage`, `removeImage`, `toggleImageFullSize`, `setImageStyle`, `setImageLayout`
- tables: `insertTable`, `insertTableRow`, `removeTableRow`, `insertTableColumn`, `removeTableColumn`, `mergeTableCells`, `unmergeTableCell`, `toggleTableHeaderRow`, `toggleTableFullSize`, `removeTable`
- state/content: `getActiveFormats`, `getHtml`, `setHtml`, `normalize`

## Ravan Full Editor API

For normal browser usage, use the branded `Ravan.mount` facade. The mount target is an editor wrapper. Ravan wraps its existing contents in a classless `[editor-content]` element and creates an `[editor-toolbar]` before it when `elements.toolbar` is omitted:

```js
const instance = Ravan.mount('#editor-wrapper', {
  elements: {
    status: document.querySelector('#status')
  },
  media: {
    fileBrowser: {
      endpoint: '/files'
    }
  }
});
```

When `elements.toolbar` is supplied, Ravan adds the `[editor-toolbar]` attribute without moving that element. The lower-level `createEditorAdapter` and `createEditorCore` APIs remain available for custom integrations. Existing `wysiwyg-*` icon and custom-element names are retained as internal compatibility contracts for now.

Editor configuration is grouped by ownership rather than by toolbar origin:

```js
Ravan.mount('#editor-wrapper', {
  elements: { toolbar: '#toolbar', status: '#status' },
  editor: { historyLimit: 50, indentStep: 24 },
  toolbar: { items: {/* custom toolbar nodes */} },
  assets: { icons: { url: '/assets/toolbar-icons.svg', prefix: 'wysiwyg-icon-' } },
  media: { fileBrowser: { endpoint: '/files', path: '/' } },
  codeView: { enabled: true, mode: 'after', editable: false, live: false },
  findReplace: { enabled: false },
  dialogs: { prompts: {/* link, media, and table prompt overrides */} }
});
```

Every section is optional. `toolbar.items` replaces the default command tree, while `media.fileBrowser`, `codeView`, `findReplace`, and `dialogs.prompts` configure the corresponding UI behavior directly.

## UI Web Components

`src/ui/web-components.js` defines five no-build custom elements:

- `<wysiwyg-modal>` supports `open`, `show-close-button`, `click-outside-to-close`, `moveable`, `resizable`, and header/content/footer templates or slots.
- `<wysiwyg-popup>` supports `open`, `preferred-position="auto|top|right|bottom|left"` plus `-start` and `-end` aligned variants such as `bottom-start`, and `showFor(anchor)` for positioning near an element, range, rect, or the current selection.
- `<wysiwyg-resize-overlay>` supports `open`, `showFor(element)`, `hide()`, eight resize handles, a move handle, and `resize-start`/`resize`/`resize-end` plus `move-start`/`move`/`move-end` events; images, videos, and audio use the same selection, resize, and move overlay.
- `<wysiwyg-table-selection>` is the adapter's cell, row, column, multi-cell, and table selection overlay.
- `<wysiwyg-file-browser>` supports breadcrumb navigation, `view-mode="list|thumbnail"`, optional `filters`/`activeFilters` controls (with `activeFilter` as a single-value alias), `filterPlacement="browser|external"`, `supported-extensions`, `endpoint`, `load(path)`, `setData(data)`, `navigate`, and `file-select`. Server contract: `docs/file-browser-contract.md`.

Template attributes accept selectors or inline HTML:

```html
<template id="selectionDetails"><p>Selected content details</p></template>
<wysiwyg-modal show-close-button content-template="#selectionDetails"></wysiwyg-modal>
<wysiwyg-popup preferred-position="auto">Selected content details</wysiwyg-popup>
<wysiwyg-file-browser supported-extensions=".jpg,.png" endpoint="/files"></wysiwyg-file-browser>
```

The default Media toolbar command opens `<wysiwyg-file-browser>` inside `<wysiwyg-modal>`. Its Image, Video, and Audio filter buttons use the configured extension groups:

```js
Ravan.mount(editorWrapperElement, {
  media: {
    fileBrowser: {
      endpoint: '/files',
      path: '/',
      supportedExtensions: {
        image: '.jpg,.jpeg,.png,.gif,.webp,.svg',
        video: '.mp4,.webm,.ogv,.mov,.m4v',
        audio: '.mp3,.wav,.ogg,.oga,.m4a,.aac,.flac'
      }
    }
  }
});
```

The Media command filters by the selected object's type, or shows all supported media when nothing is selected. Its Image, Video, and Audio buttons live in the modal footer and can be selected together to show the union of their extensions. It inserts the type inferred from the selected file's extension, updates a selected object of the same type, and replaces it when a different media filter is chosen. Selected files keep `items[].path` in `data-file-path`, allowing the browser to reopen that virtual folder even when the rendered `src` uses a different media URL. Invalid folders fall back to the configured root path.

Selecting an embedded object opens one shared media popup: images expose full-size, object-fit, and layout controls; video exposes full-size, object-fit, poster, and inline-playback controls; audio exposes full-width; and video/audio expose playback controls and preload.

If the editor has no active caret, media insertion appends at the end of the editor.

Delete and Backspace remove selected media, or a table only when the whole table is selected.

## Bundled Distribution

Build the minified browser bundles and external sourcemaps with:

```sh
npm run build
```

This creates:

- `dist/ravan-core.min.js`: core-only IIFE exposing `createEditorCore`.
- `dist/ravan.min.js`: full-editor IIFE exposing `Ravan`.
- `.map` sidecars for both bundles.

The source modules and no-build demo remain available for development and debugging. The package `main` continues to point to the core API.

## Editor Content CSS

Include `src/ui/editor-content.css` when you want default content rendering for embedded output such as visible, selectable tables. `Ravan.mount` adds the attribute automatically; custom integrations can use it directly:

```html
<link rel="stylesheet" href="src/ui/editor-content.css">
<div editor-content contenteditable="true"></div>
```

## Toolbar CSS

Include `src/ui/toolbar.css` when using the generated toolbar and its status area:

```html
<link rel="stylesheet" href="src/ui/toolbar.css">
<div editor-toolbar></div>
```

Pass `elements.status` to render the current context as a compact breadcrumb, such as `Table › Row 2 › Cell 3 › Bold`. Links include their URL in parentheses before `Link`.

## HTML Code View

The default toolbar includes an HTML button. Configure its source view through `codeView`:

```js
Ravan.mount(editorWrapperElement, {
  codeView: {
    mode: 'after',  // 'after' or 'only'
    editable: true,
    live: true
  }
});
```

`after` keeps the editor visible and places the highlighted source below it. `only` hides the editor while the source is open. Read-only views use `editable: false`; editable, non-live views apply their changes when the source view closes. The source highlighter is a small built-in tokenizer for HTML tags, attributes, strings, comments, and entities.

The source panel also includes explicit `Beautify` and `Minify` actions. They use small built-in formatting passes, keep inline markup readable, and do not reformat while the user is typing.

## Find and Replace

Enable the optional modal-based Find and Replace tool with:

```js
Ravan.mount(editorWrapperElement, {
  findReplace: { enabled: true }
});
```

It finds across formatted text and provides Find next, Replace, and Replace all actions. Searches are case-insensitive and wrap to the start of the editor.

The Insert toolbar provides one browser-backed Media command with Image, Video, and Audio extension filters, source replacement, and media-type replacement. Code block reuses the existing modal and inserts semantic `<pre><code>` elements. Use Link for downloadable files.

## Demo

Run the dependency-free demo server from the repo root:

```sh
npm run demo
```

Open `http://localhost:4173/demos/ravan.html`.

After running `npm run build`, open `http://localhost:4173/demos/ravan-bundled.html` to verify the minified full-editor bundle.

The demo server exposes `/files?path=...` from `demos/mock-files.json`. Its nested folders, supported and unsupported files, sample images, and short Media-folder MP4/MP3 files exercise breadcrumbs, navigation, extension filtering, list view, thumbnail view, and file selection.

## Tests

Install dependencies once:

```sh
npm install
```

Run:

```sh
npm test -- --runInBand
```
