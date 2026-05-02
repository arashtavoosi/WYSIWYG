/**
 * @jest-environment jsdom
 */

const createEditorCore = require('../src/core/editor-core');

describe('selection state', () => {
    test('reports collapsed selection, heading level, and selected image attributes', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><h2>Title</h2><p><img src="a.png" alt="A"></p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const headingText = editorElement.querySelector('h2').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(headingText, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        expect(editor.getActiveFormats(selection).collapsed).toBe(true);
        expect(editor.getActiveFormats(selection).headingLevel).toBe(2);

        range.selectNode(editorElement.querySelector('img'));
        selection.removeAllRanges();
        selection.addRange(range);

        expect(editor.getActiveFormats(selection).image).toEqual({
            alt: 'A',
            height: '',
            src: 'a.png',
            title: '',
            width: ''
        });
    });

    test('reports table cell context', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>C</td><td>D</td></tr></tbody></table></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const cellText = editorElement.querySelectorAll('td')[1].firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(cellText, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        expect(editor.getActiveFormats(selection).table).toEqual({
            cellIndex: 1,
            headerRow: true,
            rowIndex: 1
        });
    });
});
