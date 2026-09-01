/**
 * @jest-environment jsdom
 */

const createEditorCore = require('../src/core/editor-core');
const html = require('../src/core/html-utility');

function selectNode(node) {
    const range = document.createRange();
    const selection = window.getSelection();

    range.selectNode(node);
    selection.removeAllRanges();
    selection.addRange(range);

    return selection;
}

describe('embed content', () => {
    test('inserts and updates media through shared insertion helpers', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Start</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const paragraph = editorElement.querySelector('p');
        const range = document.createRange();
        const selection = window.getSelection();

        range.selectNodeContents(paragraph);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.insertMedia({ type: 'image', src: '/demo.png', alt: 'Demo', filePath: '/demo.png' }, selection);
        editor.insertResource({ type: 'video', src: '/demo.mp4', filePath: '/demo.mp4' }, selection);
        editor.insertMedia({ type: 'audio', src: '/demo.mp3', filePath: '/demo.mp3' }, selection);
        editor.insertCodeBlock('const answer = 42;', 'js', selection);

        expect(editorElement.querySelector('img').getAttribute('src')).toBe('/demo.png');
        expect(editorElement.querySelector('img').getAttribute('data-file-path')).toBe('/demo.png');
        expect(editorElement.querySelector('video[controls]').getAttribute('src')).toBe('/demo.mp4');
        expect(editorElement.querySelector('video').getAttribute('data-file-path')).toBe('/demo.mp4');
        expect(editorElement.querySelector('audio[controls]').getAttribute('src')).toBe('/demo.mp3');
        expect(editorElement.querySelector('audio').getAttribute('data-file-path')).toBe('/demo.mp3');
        expect(editorElement.querySelector('pre > code.language-js').textContent).toBe('const answer = 42;');
        expect(editorElement.querySelector('pre').parentNode).toBe(editorElement);

        selectNode(editorElement.querySelector('img'));
        editor.updateMedia({ type: 'image', src: '/new.png', alt: 'New' }, selection);
        selectNode(editorElement.querySelector('video'));
        editor.updateResource({ type: 'video', src: '/new.mp4' }, selection);
        selectNode(editorElement.querySelector('audio'));
        editor.updateMedia({ type: 'audio', src: '/new.mp3' }, selection);

        expect(editorElement.querySelector('img').getAttribute('src')).toBe('/new.png');
        expect(editorElement.querySelector('video').getAttribute('src')).toBe('/new.mp4');
        expect(editorElement.querySelector('audio').getAttribute('src')).toBe('/new.mp3');
    });

    test('updates an existing code block when the cursor is inside it', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Start</p><pre><code class="language-js">old()</code></pre></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const codeText = editorElement.querySelector('code').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(codeText, 2);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.insertCodeBlock('new()', 'python', selection);

        expect(editorElement.querySelectorAll('pre')).toHaveLength(1);
        expect(editorElement.querySelector('pre code').textContent).toBe('new()');
        expect(editorElement.querySelector('pre code').className).toBe('language-python');
    });

    test('inserts a code block at the editor end when there is no cursor', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Start</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const selection = window.getSelection();

        selection.removeAllRanges();
        editor.insertCodeBlock('const answer = 42;', 'js');

        expect(editorElement.querySelector('pre code').textContent).toBe('const answer = 42;');
    });

    test('inserts and updates video and audio playback attributes', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Start</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const paragraph = editorElement.querySelector('p');
        const range = document.createRange();
        const selection = window.getSelection();

        range.selectNodeContents(paragraph);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.insertMedia({
            type: 'video',
            src: 'movie.mp4',
            controls: false,
            autoplay: true,
            loop: true,
            muted: true,
            playsinline: true,
            poster: 'poster.jpg',
            preload: 'metadata'
        }, selection);

        const video = editorElement.querySelector('video');

        expect(video.hasAttribute('controls')).toBe(false);
        expect(video.hasAttribute('autoplay')).toBe(true);
        expect(video.hasAttribute('loop')).toBe(true);
        expect(video.hasAttribute('muted')).toBe(true);
        expect(video.hasAttribute('playsinline')).toBe(true);
        expect(video.getAttribute('poster')).toBe('poster.jpg');
        expect(video.getAttribute('preload')).toBe('metadata');

        selectNode(video);
        editor.updateMedia({
            type: 'video',
            controls: true,
            autoplay: false,
            loop: false,
            muted: false,
            playsinline: false,
            poster: '',
            preload: 'none'
        }, selection);

        expect(video.hasAttribute('controls')).toBe(true);
        expect(video.hasAttribute('autoplay')).toBe(false);
        expect(video.hasAttribute('loop')).toBe(false);
        expect(video.hasAttribute('muted')).toBe(false);
        expect(video.hasAttribute('playsinline')).toBe(false);
        expect(video.hasAttribute('poster')).toBe(false);
        expect(video.getAttribute('preload')).toBe('none');

        range.selectNodeContents(paragraph);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        editor.insertMedia({ type: 'audio', src: 'sound.mp3', controls: false, loop: true, preload: 'auto' }, selection);

        const audio = editorElement.querySelector('audio');

        expect(audio.hasAttribute('controls')).toBe(false);
        expect(audio.hasAttribute('loop')).toBe(true);
        expect(audio.getAttribute('preload')).toBe('auto');

        selectNode(audio);
        editor.updateMedia({ type: 'audio', controls: true, loop: false }, selection);
        expect(audio.hasAttribute('controls')).toBe(true);
        expect(audio.hasAttribute('loop')).toBe(false);
    });

    test('inserts media at the editor end when there is no cursor', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Start</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const selection = window.getSelection();

        selection.removeAllRanges();
        editor.insertMedia({ type: 'audio', src: 'sound.mp3' });

        expect(editorElement.querySelector('audio')).not.toBeNull();
        expect(editorElement.lastElementChild.tagName).toBe('AUDIO');
        expect(editorElement.querySelector('audio[controls]')).not.toBeNull();
    });

    test('removes selected video and audio media', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p><video src="movie.mp4"></video><audio src="sound.mp3"></audio></p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const selection = window.getSelection();

        selectNode(editorElement.querySelector('video'));
        editor.removeMedia(selection);
        expect(editorElement.querySelector('video')).toBeNull();

        selectNode(editorElement.querySelector('audio'));
        editor.removeMedia(selection);
        expect(editorElement.querySelector('audio')).toBeNull();
    });

    test('updates and removes selected images', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p><img src="old.png" alt="Old"></p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const image = editorElement.querySelector('img');
        const selection = selectNode(image);

        editor.updateImage({ src: 'new.png', alt: 'New', filePath: '/assets/new.png' }, selection);

        expect(editorElement.querySelector('img').getAttribute('src')).toBe('new.png');
        expect(editorElement.querySelector('img').getAttribute('alt')).toBe('New');
        expect(editorElement.querySelector('img').getAttribute('data-file-path')).toBe('/assets/new.png');

        selectNode(editorElement.querySelector('img'));
        editor.removeImage(selection);

        expect(editorElement.querySelector('img')).toBeNull();
    });

    test('edits table rows, columns, header row, and removal', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Here</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const paragraph = editorElement.querySelector('p');
        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(paragraph);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.insertTable({ rows: 2, cols: 2, headerRow: true }, selection);

        expect(editorElement.querySelectorAll('tr')).toHaveLength(3);
        expect(editorElement.querySelectorAll('th')).toHaveLength(2);

        editor.insertTableRow('after', selection);
        expect(editorElement.querySelectorAll('tr')).toHaveLength(4);

        editor.insertTableColumn('after', selection);
        expect(editorElement.querySelector('tr').children).toHaveLength(3);

        editor.removeTableColumn(selection);
        expect(editorElement.querySelector('tr').children).toHaveLength(2);

        editor.toggleTableHeaderRow(selection);
        expect(editorElement.querySelector('thead')).toBeNull();

        editor.removeTableRow(selection);
        expect(editorElement.querySelectorAll('tr').length).toBeGreaterThan(0);

        editor.removeTable(selection);
        expect(editorElement.querySelector('table')).toBeNull();
    });

    test('removing the selected header row still allows header toggling', () => {
        document.body.innerHTML = [
            '<div id="editor" contenteditable="true">',
            '<table><thead><tr><th>Head</th></tr></thead><tbody><tr><td>Body</td></tr></tbody></table>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const headerText = editorElement.querySelector('th').firstChild;
        const selection = window.getSelection();
        const range = document.createRange();

        range.setStart(headerText, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.removeTableRow(selection);

        expect(editorElement.querySelector('thead')).toBeNull();
        expect(editorElement.querySelector('td').textContent).toBe('Body');

        expect(function () {
            editor.toggleTableHeaderRow(selection);
        }).not.toThrow();

        expect(editorElement.querySelector('thead th').textContent).toBe('Body');
        expect(editorElement.querySelector('tbody')).toBeTruthy();
    });

    test('toggles the table full-size style', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><table style="width: 70%; border-spacing: 2px"><tbody><tr><td>Cell</td></tr></tbody></table></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const table = editorElement.querySelector('table');
        const selection = selectNode(table.querySelector('td'));

        editor.toggleTableFullSize(selection);

        expect(table.style.width).toBe('100%');
        expect(table.style.borderSpacing).toBe('2px');

        editor.toggleTableFullSize(selection);

        expect(table.style.width).toBe('');
        expect(table.style.borderSpacing).toBe('2px');
    });

    test('updates selected image presentation styles', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p><img src="image.png" style="height: 80px; object-fit: contain; float: right"></p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const image = editorElement.querySelector('img');
        const selection = selectNode(image);

        editor.toggleImageFullSize(selection);

        expect(image.style.width).toBe('100%');
        expect(image.style.height).toBe('80px');
        expect(image.style.objectFit).toBe('contain');

        editor.setImageStyle('objectFit', 'cover', selection);
        expect(image.style.objectFit).toBe('cover');

        editor.setImageLayout('block', selection);
        expect(image.style.display).toBe('block');
        expect(image.style.float).toBe('');

        editor.setImageLayout('float-left', selection);
        expect(image.style.display).toBe('');
        expect(image.style.float).toBe('left');

        editor.setImageLayout('inline', selection);
        expect(image.style.display).toBe('');
        expect(image.style.float).toBe('');

        editor.setImageStyle('objectFit', '', selection);
        editor.toggleImageFullSize(selection);

        expect(image.style.objectFit).toBe('');
        expect(image.style.width).toBe('');
        expect(image.style.height).toBe('80px');
    });

    test('updates selected video and audio presentation styles through generic media helpers', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p><video src="movie.mp4"></video><audio src="sound.mp3"></audio></p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const video = editorElement.querySelector('video');
        const audio = editorElement.querySelector('audio');
        const selection = window.getSelection();

        selectNode(video);
        editor.toggleMediaWidth(selection);
        editor.setMediaStyle('objectFit', 'cover', selection);

        expect(video.style.width).toBe('100%');
        expect(video.style.objectFit).toBe('cover');

        selectNode(audio);
        editor.toggleMediaWidth(selection);

        expect(audio.style.width).toBe('100%');

        editor.toggleMediaWidth(selection);
        expect(audio.style.width).toBe('');
    });

    test('column insertion keeps selection in the original row', () => {
        document.body.innerHTML = [
            '<div id="editor" contenteditable="true"><table>',
            '<thead><tr><th>Head</th></tr></thead>',
            '<tbody><tr><td>First</td></tr><tr><td>Selected</td></tr></tbody>',
            '</table></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const selected = editorElement.querySelectorAll('tbody td')[1];
        const selection = selectNode(selected);

        editor.insertTableColumn('after', selection);

        const inserted = html.getSelectedElement(selection, 'td');

        expect(inserted.parentNode).toBe(selected.parentNode);
        expect(inserted.cellIndex).toBe(1);
        expect(html.getClosestTag(inserted, 'thead')).toBeNull();
    });

    test('merges and unmerges a rectangular cell selection', () => {
        document.body.innerHTML = [
            '<div id="editor" contenteditable="true"><table><tbody>',
            '<tr><td>A</td><td>B</td></tr>',
            '<tr><td>C</td><td>D</td></tr>',
            '</tbody></table></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const cells = Array.from(editorElement.querySelectorAll('td'));

        editor.mergeTableCells(cells);

        const merged = editorElement.querySelector('td');

        expect(editorElement.querySelectorAll('td')).toHaveLength(1);
        expect(merged.rowSpan).toBe(2);
        expect(merged.colSpan).toBe(2);
        expect(merged.textContent).toBe('ABCD');

        editor.unmergeTableCell(merged);

        expect(editorElement.querySelectorAll('td')).toHaveLength(4);
        expect(merged.hasAttribute('rowspan')).toBe(false);
        expect(merged.hasAttribute('colspan')).toBe(false);
    });
});
