/**
 * @jest-environment jsdom
 */

const createEditorCore = require('../src/core/editor-core');

describe('linking', () => {
    test('creates and removes a selected link', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Visit site</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const textNode = editorElement.querySelector('p').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(textNode, 0);
        range.setEnd(textNode, 5);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.upsertLink({ href: 'https://example.com' }, selection);
        expect(editorElement.innerHTML).toBe('<p><a href="https://example.com">Visit</a> site</p>');

        range.selectNodeContents(editorElement.querySelector('a'));
        selection.removeAllRanges();
        selection.addRange(range);

        editor.removeLink(selection);
        expect(editorElement.innerHTML).toBe('<p>Visit site</p>');
    });
});
