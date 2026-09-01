# File Browser Server Contract

`<wysiwyg-file-browser>` can load directory data from an HTTP endpoint when its `endpoint` attribute is set.

## Request

The component sends a `GET` request with the current path:

```http
GET /files?path=/assets/images
Accept: application/json
```

Rules:

- `path` is an absolute virtual path rooted at `/`.
- The server must normalize and authorize the path. Do not trust client paths as filesystem paths.
- Return only entries the current user may access.
- Sort order is server-defined. A common default is directories first, then files by name.

## Response

Return JSON:

```json
{
  "path": "/assets/images",
  "breadcrumbs": [
    { "name": "Root", "path": "/" },
    { "name": "assets", "path": "/assets" },
    { "name": "images", "path": "/assets/images" }
  ],
  "items": [
    {
      "type": "directory",
      "name": "logos",
      "path": "/assets/images/logos"
    },
    {
      "type": "file",
      "name": "hero.png",
      "path": "/assets/images/hero.png",
      "extension": ".png",
      "url": "/media/assets/images/hero.png",
      "thumbnailUrl": "/media/assets/images/.thumbs/hero.png",
      "mime": "image/png",
      "size": 24851,
      "modifiedAt": "2026-06-25T10:30:00Z"
    }
  ]
}
```

Required fields:

- `path`: current directory path.
- `items`: array of entries.
- `items[].type`: `directory` or `file`.
- `items[].name`: display name.
- `items[].path`: virtual path to navigate/select.

Optional fields:

- `breadcrumbs`: explicit breadcrumb items. If omitted, the component derives breadcrumbs from `path`.
- `extension`: file extension including the dot, lower-case preferred.
- `url`: downloadable or embeddable file URL.
- `thumbnailUrl`: preview image URL for thumbnail mode.
- `mime`, `size`, `modifiedAt`: metadata for consumers.

## Component Behavior

- Breadcrumb buttons call `load(path)`.
- Directory entries call `load(path)`.
- File entries dispatch `file-select` with `event.detail.file`.
- The default editor adapter writes the selected file's `path` to the selected media element's `data-file-path` attribute and its `url` to `src`. The single Media command reuses this flow for images, video, and audio, updating a selected object or replacing it when a different filter is chosen.
- Without `endpoint`, navigation dispatches `navigate` with `event.detail.path`; the host app can fetch and call `setData(data)`.
- `supported-extensions=".jpg,.png"` filters visible files client-side. Directories are always shown.
- The optional `filters` property accepts entries such as `{ value: 'image', label: 'Image', extensions: '.jpg,.png', iconId: 'image' }`. The editor's Media modal supplies image, video, and audio filters and renders their configured SVG icons in the modal footer. `activeFilters` accepts multiple values and shows the union of their extensions; the legacy `activeFilter` property remains an alias for a single value. No active filter shows every supported extension.
- Set `filterPlacement` to `external` when the host renders the filter buttons elsewhere; the browser still applies `activeFilters` to its file list.
- `view-mode="list"` and `view-mode="thumbnail"` control the display mode.
