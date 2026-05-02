/**
 * @jest-environment jsdom
 */

const createEditorCore = require('../src/core/editor-core');

function selectNode(node) {
    const range = document.createRange();
    const selection = window.getSelection();

    range.selectNode(node);
    selection.removeAllRanges();
    selection.addRange(range);

    return selection;
}

describe('embed content', () => {
    test('updates and removes selected images', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p><img src="old.png" alt="Old"></p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const image = editorElement.querySelector('img');
        const selection = selectNode(image);

        editor.updateImage({ src: 'new.png', alt: 'New' }, selection);

        expect(editorElement.querySelector('img').getAttribute('src')).toBe('new.png');
        expect(editorElement.querySelector('img').getAttribute('alt')).toBe('New');

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
});
