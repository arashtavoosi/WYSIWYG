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

    test('removes empty nested formatting tags when inline formatting is toggled off', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p><a href="https://"><strong>n</strong><em><strong>t</strong></em><strong>o</strong></a></p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const emphasizedText = editorElement.querySelector('em strong').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(emphasizedText, 0);
        range.setEnd(emphasizedText, emphasizedText.length);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.toggleInline('italic', selection);

        expect(editorElement.querySelector('em')).toBeNull();
        expect(editorElement.querySelectorAll('strong')).toHaveLength(2);
        expect(editorElement.textContent).toBe('nto');
        expect(editorElement.innerHTML).toBe('<p><a href="https://"><strong>n</strong>t<strong>o</strong></a></p>');
    });

    test('normalization removes formatting tags that only contain empty formatting children', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);

        editor.setHtml('<p><em><strong></strong></em>text<strong></strong></p>');

        expect(editorElement.innerHTML).toBe('<p>text</p>');
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
        expect(editorElement.innerHTML).toBe('<p style="line-height: 1.8;"><span style="color: rgb(255, 0, 0);">Styled</span> text</p>');
        expect(paragraph.style.lineHeight).toBe('1.8');
    });

    test('applies color only to the selected part of a text node', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Select part of this paragraph to create a <a href="https://example.com">link</a>, convert it into a heading, or turn it into a list.</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const paragraph = editorElement.querySelector('p');
        const textNode = paragraph.childNodes[2];
        const range = document.createRange();
        const selection = window.getSelection();
        const selectedText = 'heading';
        const startOffset = textNode.textContent.indexOf(selectedText);

        range.setStart(textNode, startOffset);
        range.setEnd(textNode, startOffset + selectedText.length);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.setInlineStyle('color', '#ea7d34', selection);

        expect(editorElement.querySelector('span').textContent).toBe(selectedText);
        expect(editorElement.textContent).toBe('Select part of this paragraph to create a link, convert it into a heading, or turn it into a list.');
        expect(editorElement.innerHTML).toBe('<p>Select part of this paragraph to create a <a href="https://example.com">link</a>, convert it into a <span style="color: rgb(234, 125, 52);">heading</span>, or turn it into a list.</p>');
    });

    test('updates a fully selected style span instead of nesting another span', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Change <span style="color: rgb(234, 125, 52);">this</span> word.</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const styledSpan = editorElement.querySelector('span');
        const range = document.createRange();
        const selection = window.getSelection();

        range.selectNodeContents(styledSpan);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.setInlineStyle('color', '#0f9f43', selection);

        expect(editorElement.querySelectorAll('span')).toHaveLength(1);
        expect(editorElement.innerHTML).toBe('<p>Change <span style="color: rgb(15, 159, 67);">this</span> word.</p>');
    });

    test('updates a selected style span node instead of nesting another span', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Change <span style="color: rgb(234, 125, 52);">this</span> word.</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const styledSpan = editorElement.querySelector('span');
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStartBefore(styledSpan);
        range.setEndAfter(styledSpan);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.setInlineStyle('color', '#0f9f43', selection);

        expect(editorElement.querySelectorAll('span')).toHaveLength(1);
        expect(editorElement.innerHTML).toBe('<p>Change <span style="color: rgb(15, 159, 67);">this</span> word.</p>');
    });

    test('updates an ancestor style span when the selected text matches its full text', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Change <span style="color: rgb(244, 129, 52);">this</span> word.</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const styledSpan = editorElement.querySelector('span');
        const textNode = styledSpan.firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(textNode, 0);
        range.setEnd(textNode, textNode.length);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.setInlineStyle('color', '#6d34f4', selection);

        expect(editorElement.querySelectorAll('span')).toHaveLength(1);
        expect(editorElement.innerHTML).toBe('<p>Change <span style="color: rgb(109, 52, 244);">this</span> word.</p>');
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
