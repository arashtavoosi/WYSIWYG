# Ravan

Small-footprint browser editor with a UI-agnostic core.

## Structure

- `src/core/editor-core.js`: public core API.
- `src/core/*`: shared HTML utilities, selection formatting, block structure, linking, embeds, state, and markup normalization.
- `src/ravan.js`: branded full-editor facade.
- `src/ui/*`: toolbar wiring, toolbar metadata, toolbar state rendering, and small UI web components.
- `demos/wysiwyg-v1.html`: no-build demo shell.
- `tests/*`: Jest/jsdom coverage.

## Core API

The core is created with:

```js
const editor = createEditorCore(editorElement);
```

Main methods:

- inline: `toggleInline`, `setInlineStyle`, `clear`
- blocks: `setBlock`, `toggleBlock`, `toggleList`, `insertBreak`, `insertRule`
- links: `upsertLink`, `removeLink`
- images: `insertImage`, `updateImage`, `removeImage`
- tables: `insertTable`, `insertTableRow`, `removeTableRow`, `insertTableColumn`, `removeTableColumn`, `mergeTableCells`, `unmergeTableCell`, `toggleTableHeaderRow`, `removeTable`
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
- `<wysiwyg-resize-overlay>` supports `open`, `showFor(element)`, `hide()`, eight resize handles, a move handle, and `resize-start`/`resize`/`resize-end` plus `move-start`/`move`/`move-end` events.
- `<wysiwyg-table-selection>` is the adapter's cell, row, column, multi-cell, and table selection overlay.
- `<wysiwyg-file-browser>` supports breadcrumb navigation, `view-mode="list|thumbnail"`, `supported-extensions`, `endpoint`, `load(path)`, `setData(data)`, `navigate`, and `file-select`. Server contract: `docs/file-browser-contract.md`.

Template attributes accept selectors or inline HTML:

```html
<template id="selectionDetails"><p>Selected content details</p></template>
<wysiwyg-modal show-close-button content-template="#selectionDetails"></wysiwyg-modal>
<wysiwyg-popup preferred-position="auto">Selected content details</wysiwyg-popup>
<wysiwyg-file-browser supported-extensions=".jpg,.png" endpoint="/files"></wysiwyg-file-browser>
```

The default image toolbar command opens `<wysiwyg-file-browser>` inside `<wysiwyg-modal>`. Configure its source through adapter toolbar config:

```js
Ravan.mount(editorWrapperElement, {
  toolbarConfig: {
    fileBrowser: {
      endpoint: '/files',
      path: '/',
      supportedExtensions: '.jpg,.jpeg,.png,.gif,.webp,.svg'
    }
  }
});
```

The same Image command replaces a selected image. Images chosen from the browser keep `items[].path` in `data-file-path`, allowing the modal to reopen that virtual folder even when the rendered `src` uses a different media URL. Invalid folders fall back to the configured root path.

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

## Demo

Run the dependency-free demo server from the repo root:

```sh
npm run demo
```

Open `http://localhost:4173/demos/wysiwyg-v1.html`.

The demo server exposes `/files?path=...` from `demos/mock-files.json`. Its nested folders, supported and unsupported files, and sample images exercise breadcrumbs, navigation, extension filtering, list view, thumbnail view, and file selection.

## Tests

Install dependencies once:

```sh
npm install
```

Run:

```sh
npm test -- --runInBand
```
