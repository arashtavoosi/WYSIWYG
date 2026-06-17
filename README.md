# WYSIWYG

Small-footprint browser WYSIWYG editor with a UI-agnostic core.

## Structure

- `src/core/editor-core.js`: public core API.
- `src/core/*`: shared HTML utilities, selection formatting, block structure, linking, embeds, state, and markup normalization.
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
- tables: `insertTable`, `insertTableRow`, `removeTableRow`, `insertTableColumn`, `removeTableColumn`, `toggleTableHeaderRow`, `removeTable`
- state/content: `getActiveFormats`, `getHtml`, `setHtml`, `normalize`

## UI Web Components

`src/ui/web-components.js` defines two no-build custom elements:

- `<wysiwyg-modal>` supports `open`, `show-close-button`, `click-outside-to-close`, `moveable`, `resizable`, and header/content/footer templates or slots.
- `<wysiwyg-popup>` supports `open`, `preferred-position="auto|top|right|bottom|left"` plus `-start` and `-end` aligned variants such as `bottom-start`, and `showFor(anchor)` for positioning near an element, range, rect, or the current selection.

Template attributes accept selectors or inline HTML:

```html
<template id="selectionDetails"><p>Selected content details</p></template>
<wysiwyg-modal show-close-button content-template="#selectionDetails"></wysiwyg-modal>
<wysiwyg-popup preferred-position="auto">Selected content details</wysiwyg-popup>
```

## Editor Content CSS

Include `src/ui/editor-content.css` and add `wysiwyg-editor-content` to the editable root when you want default content rendering for embedded output such as visible, selectable tables:

```html
<link rel="stylesheet" href="src/ui/editor-content.css">
<div class="wysiwyg-editor-content" contenteditable="true"></div>
```

## Demo

Run a local static server from the repo root:

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173/demos/wysiwyg-v1.html`.

## Tests

Install dependencies once:

```sh
npm install
```

Run:

```sh
npm test -- --runInBand
```
