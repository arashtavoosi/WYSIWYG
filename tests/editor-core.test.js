/**
 * @jest-environment jsdom
 */

const createEditorCore = require('../src/core/editor-core');

describe('editor core', () => {
    test('toggles inline formatting and reports active state', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>This is some text.</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const paragraph = editorElement.querySelector('p');
        const textNode = paragraph.firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(textNode, 8);
        range.setEnd(textNode, 12);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.toggleInline('bold', selection);

        expect(editorElement.innerHTML).toBe('<p>This is <strong>some</strong> text.</p>');

        const strongText = editorElement.querySelector('strong').firstChild;
        const activeRange = document.createRange();

        activeRange.setStart(strongText, 0);
        activeRange.setEnd(strongText, strongText.length);
        selection.removeAllRanges();
        selection.addRange(activeRange);

        expect(editor.getActiveFormats(selection).bold).toBe(true);
    });

    test('creates and removes links', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Visit site</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const paragraph = editorElement.querySelector('p');
        const textNode = paragraph.firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(textNode, 0);
        range.setEnd(textNode, 5);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.upsertLink({ href: 'https://example.com' }, selection);

        expect(editorElement.querySelector('a').getAttribute('href')).toBe('https://example.com');

        const anchorText = editorElement.querySelector('a').firstChild;
        const unlinkRange = document.createRange();

        unlinkRange.setStart(anchorText, 0);
        unlinkRange.setEnd(anchorText, anchorText.length);
        selection.removeAllRanges();
        selection.addRange(unlinkRange);

        editor.removeLink(selection);

        expect(editorElement.querySelector('a')).toBeNull();
    });

    test('sets headings and toggles lists', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Alpha</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const paragraph = editorElement.querySelector('p');
        const textNode = paragraph.firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(textNode, 0);
        range.setEnd(textNode, textNode.length);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.setBlock('heading', { level: 2 }, selection);

        expect(editorElement.querySelector('h2')).not.toBeNull();

        const headingText = editorElement.querySelector('h2').firstChild;
        const listRange = document.createRange();

        listRange.setStart(headingText, 0);
        listRange.setEnd(headingText, headingText.length);
        selection.removeAllRanges();
        selection.addRange(listRange);

        editor.toggleList('ul', selection);

        expect(editorElement.querySelector('ul')).not.toBeNull();
        expect(editor.getActiveFormats(selection).list).toBe('ul');
    });

    test('applies color and line-height styles', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Styled text</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const paragraph = editorElement.querySelector('p');
        const textNode = paragraph.firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(textNode, 0);
        range.setEnd(textNode, 6);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.setInlineStyle('color', '#ff0000', selection);
        editor.setInlineStyle('lineHeight', '1.8', selection);

        expect(editorElement.querySelector('span').style.color).toBe('rgb(255, 0, 0)');
        expect(paragraph.style.lineHeight).toBe('1.8');
    });

    test('inserts image and table content', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Embed here</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const paragraph = editorElement.querySelector('p');
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(paragraph.firstChild, paragraph.firstChild.length);
        range.setEnd(paragraph.firstChild, paragraph.firstChild.length);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.insertImage({ src: 'https://example.com/image.png', alt: 'Sample' }, selection);

        expect(editorElement.querySelector('img').getAttribute('src')).toBe('https://example.com/image.png');

        selection.removeAllRanges();
        range.selectNodeContents(editorElement);
        range.collapse(false);
        selection.addRange(range);

        editor.insertTable({ rows: 2, cols: 3, headerRow: true }, selection);

        expect(editorElement.querySelectorAll('table').length).toBe(1);
        expect(editorElement.querySelectorAll('th').length).toBe(3);
        expect(editorElement.querySelectorAll('td').length).toBe(6);
    });
});