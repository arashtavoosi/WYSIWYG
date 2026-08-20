/**
 * @jest-environment jsdom
 */

const createEditorCore = require('../src/core/editor-core');

describe('block structure', () => {
    test('sets headings, toggles lists, and inserts structural nodes', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Alpha</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const textNode = editorElement.querySelector('p').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(textNode, 0);
        range.setEnd(textNode, textNode.length);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.setBlock('heading', { level: 2 }, selection);
        expect(editorElement.querySelector('h2')).not.toBeNull();

        range.selectNodeContents(editorElement.querySelector('h2'));
        selection.removeAllRanges();
        selection.addRange(range);

        editor.toggleList('ul', selection);
        expect(editorElement.querySelector('ul li')).not.toBeNull();

        editor.insertRule(selection);
        expect(editorElement.querySelector('hr')).not.toBeNull();
    });

    test('applies block styles inside a table cell without wrapping the editor', () => {
        document.body.innerHTML = [
            '<div id="editor" contenteditable="true">',
            '<p id="before">Before</p>',
            '<table><tbody><tr><td id="cell"><br></td></tr></tbody></table>',
            '<p id="after">After</p>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const cell = document.getElementById('cell');
        const editor = createEditorCore(editorElement);
        const range = document.createRange();
        const selection = window.getSelection();

        range.selectNodeContents(cell);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.setBlockStyle('textAlign', 'right', selection);

        expect(editorElement.style.textAlign).toBe('');
        expect(editorElement.children[0]).toBe(document.getElementById('before'));
        expect(editorElement.children[1].tagName).toBe('TABLE');
        expect(editorElement.children[2]).toBe(document.getElementById('after'));
        expect(cell.style.textAlign).toBe('right');
        expect(cell.innerHTML).toBe('<br>');
    });
});
