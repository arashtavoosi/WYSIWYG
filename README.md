# Ravan

Small-footprint browser editor with a UI-agnostic core.

## Structure

- `src/core/editor-core.js`: public core API.
- `src/core/*`: shared HTML utilities, selection formatting, block structure, linking, embeds, state, and markup normalization.
- `src/ravan.js`: branded full-editor facade.
- `src/ui/*`: toolbar wiring, toolbar metadata, toolbar state rendering, the slim HTML code view, and small UI web components.
- `build/entries/*`: release bundle entry points.
- `scripts/build.mjs`: esbuild bundling and minification script.
- `demos/wysiwyg-v1.html`: no-build demo shell.
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
- media: `insertMedia({ type: 'image'|'video'|'audio', src })`, `updateMedia({ type, src })`
- images: `insertImage`, `updateImage`, `removeImage`, `toggleImageFullSize`, `setImageStyle`, `setImageLayout`
- tables: `insertTable`, `insertTableRow`, `removeTableRow`, `insertTableColumn`, `removeTableColumn`, `mergeTableCells`, `unmergeTableCell`, `toggleTableHeaderRow`, `toggleTableFullSize`, `removeTable`
- state/content: `getActiveFormats`, `getHtml`, `setHtml`, `normalize`

## Ravan Full Editor API

For normal browser usage, use the branded `Ravan.mount` facade. The mount target is an editor wrapper. Ravan wraps its existing contents in a classless `[editor-content]` element and creates an `[editor-toolbar]` before it when `toolbarElement` is omitted:

```js
const instance = Ravan.mount('#editor-wrapper', {
  toolbarConfig: {
    fileBrowser: {
      endpoint: '/files'
    }
  }
});
```

When `toolbarElement` is supplied, Ravan adds the `[editor-toolbar]` attribute without moving that element. The lower-level `createEditorAdapter` and `createEditorCore` APIs remain available for custom integrations. Existing `wysiwyg-*` icon and custom-element names are retained as internal compatibility contracts for now.

## UI Web Components

`src/ui/web-components.js` defines five no-build custom elements:

- `<wysiwyg-modal>` supports `open`, `show-close-button`, `click-outside-to-close`, `moveable`, `resizable`, and header/content/footer templates or slots.
- `<wysiwyg-popup>` supports `open`, `preferred-position="auto|top|right|bottom|left"` plus `-start` and `-end` aligned variants such as `bottom-start`, and `showFor(anchor)` for positioning near an element, range, rect, or the current selection.
- `<wysiwyg-resize-overlay>` supports `open`, `showFor(element)`, `hide()`, eight resize handles, a move handle, and `resize-start`/`resize`/`resize-end` plus `move-start`/`move`/`move-end` events; images, videos, and audio use the same selection, resize, and move overlay.
- `<wysiwyg-table-selection>` is the adapter's cell, row, column, multi-cell, and table selection overlay.
- `<wysiwyg-file-browser>` supports breadcrumb navigation, `view-mode="list|thumbnail"`, `supported-extensions`, `endpoint`, `load(path)`, `setData(data)`, `navigate`, and `file-select`. Server contract: `docs/file-browser-contract.md`.

Template attributes accept selectors or inline HTML:

```html
<template id="selectionDetails"><p>Selected content details</p></template>
<wysiwyg-modal show-close-button content-template="#selectionDetails"></wysiwyg-modal>
<wysiwyg-popup preferred-position="auto">Selected content details</wysiwyg-popup>
<wysiwyg-file-browser supported-extensions=".jpg,.png" endpoint="/files"></wysiwyg-file-browser>
```

The default Image, Video, and Audio toolbar commands open `<wysiwyg-file-browser>` inside `<wysiwyg-modal>`. Configure their source through adapter toolbar config:

```js
Ravan.mount(editorWrapperElement, {
  toolbarConfig: {
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

The Image, Video, and Audio commands share the same browser flow. Each filters by its configured extensions and replaces the selected object of the same type; selected files keep `items[].path` in `data-file-path`, allowing the browser to reopen that virtual folder even when the rendered `src` uses a different media URL. Invalid folders fall back to the configured root path.

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

Pass one `statusElement` to render the current context as a compact breadcrumb, such as `Table › Row 2 › Cell 3 › Bold`. Links include their URL in parentheses before `Link`.

## HTML Code View

The default toolbar includes an HTML button. Configure its source view through `toolbarConfig.codeView`:

```js
Ravan.mount(editorWrapperElement, {
  toolbarConfig: {
    codeView: {
      mode: 'after',  // 'after' or 'only'
      editable: true,
      live: true
    }
  }
});
```

`after` keeps the editor visible and places the highlighted source below it. `only` hides the editor while the source is open. Read-only views use `editable: false`; editable, non-live views apply their changes when the source view closes. The source highlighter is a small built-in tokenizer for HTML tags, attributes, strings, comments, and entities.

The source panel also includes explicit `Beautify` and `Minify` actions. They use small built-in formatting passes, keep inline markup readable, and do not reformat while the user is typing.

## Find and Replace

Enable the optional modal-based Find and Replace tool with:

```js
Ravan.mount(editorWrapperElement, {
  toolbarConfig: { findReplace: true }
});
```

It finds across formatted text and provides Find next, Replace, and Replace all actions. Searches are case-insensitive and wrap to the start of the editor.

The Insert toolbar provides browser-backed Image, Video, and Audio commands with per-type extension filtering and same-type source replacement. Code block reuses the existing modal and inserts semantic `<pre><code>` elements. Use Link for downloadable files.

## Demo

Run the dependency-free demo server from the repo root:

```sh
npm run demo
```

Open `http://localhost:4173/demos/wysiwyg-v1.html`.

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
