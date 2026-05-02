# WYSIWYG

Small-footprint browser WYSIWYG editor with a UI-agnostic core.

## Structure

- `src/core/editor-core.js`: public core API.
- `src/core/*`: shared HTML utilities, selection formatting, block structure, linking, embeds, state, and markup normalization.
- `src/ui/*`: toolbar wiring, toolbar metadata, and toolbar state rendering.
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
