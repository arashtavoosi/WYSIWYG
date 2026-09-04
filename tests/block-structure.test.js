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

    test('places the caret after an inserted break', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Alpha beta</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const paragraph = editorElement.querySelector('p');
        const textNode = paragraph.firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(textNode, 5);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        editor.insertBreak(selection);

        expect(paragraph.innerHTML).toBe('Alpha<br> beta');
        expect(selection.rangeCount).toBe(1);
        expect(selection.getRangeAt(0).collapsed).toBe(true);
        expect(selection.getRangeAt(0).startContainer).toBe(paragraph);
        expect(selection.getRangeAt(0).startOffset).toBe(2);
    });
});

describe('selected blocks', () => {
    let root, editor, selection;
    function setup(markup, start, startOffset, end, endOffset) {
        document.body.innerHTML = '<div id="editor" contenteditable="true">' + markup + '</div>';
        root = document.getElementById('editor');
        editor = createEditorCore(root);
        selection = window.getSelection();
        const range = document.createRange();
        range.setStart(root.querySelectorAll(start)[0].firstChild, startOffset);
        range.setEnd(root.querySelectorAll(end)[0].firstChild, endOffset);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    test('formats all selected paragraphs, retains selection, and undoes in one step', () => {
        setup('<p>One</p><p>Two</p><p>Three</p>', 'p', 1, 'p:nth-child(2)', 2);
        editor.setBlock('heading', { level: 2 }, selection);
        expect(root.innerHTML).toBe('<h2>One</h2><h2>Two</h2><p>Three</p>');
        expect(selection.toString()).toBe('neTw');
        editor.undo();
        expect(root.innerHTML).toBe('<p>One</p><p>Two</p><p>Three</p>');
        expect(selection.toString()).toBe('neTw');
    });

    test('excludes a paragraph touched only at its start', () => {
        setup('<p>One</p><p>Two</p>', 'p', 0, 'p:nth-child(2)', 0);
        editor.toggleList('ul', selection);
        expect(root.innerHTML).toBe('<ul><li>One</li></ul><p>Two</p>');
    });

    test('combines selected paragraphs into one list', () => {
        setup('<p>One</p><p>Two</p>', 'p', 0, 'p:nth-child(2)', 3);
        editor.toggleList('ul', selection);
        expect(root.innerHTML).toBe('<ul><li>One</li><li>Two</li></ul>');
        expect(selection.toString()).toBe('OneTwo');
    });

    test('removes only the current list item and retains both neighbors', () => {
        setup('<ul><li>One</li><li>Two</li><li>Three</li></ul>', 'li:nth-child(2)', 1, 'li:nth-child(2)', 1);
        editor.toggleList('ul', selection);
        expect(root.innerHTML).toBe('<ul><li>One</li></ul><p>Two</p><ul><li>Three</li></ul>');
        expect(selection.anchorNode.textContent).toBe('Two');
        expect(selection.anchorOffset).toBe(1);
    });

    test('applies alignment and line height across selected blocks', () => {
        setup('<p>One</p><p>Two</p><p>Three</p>', 'p', 0, 'p:nth-child(2)', 3);
        editor.setBlockStyle('lineHeight', '2', selection);
        editor.setBlockStyle('textAlign', 'center', selection);
        expect([...root.children].map(node => node.style.lineHeight)).toEqual(['2', '2', '']);
        expect([...root.children].map(node => node.style.textAlign)).toEqual(['center', 'center', '']);
        expect(selection.toString()).toBe('OneTwo');
    });

    test('keeps list and table structure when setting headings', () => {
        setup('<ul><li>One</li></ul>', 'li', 0, 'li', 3);
        editor.setBlock('heading', { level: 2 }, selection);
        expect(root.innerHTML).toBe('<ul><li><h2>One</h2></li></ul>');
        setup('<table><tbody><tr><td>One</td><td>Two</td></tr></tbody></table>', 'td', 0, 'td:nth-child(2)', 3);
        editor.setBlock('heading', { level: 2 }, selection);
        expect(root.querySelectorAll('td > h2')).toHaveLength(2);
    });
});

test('list conversion retains table cells', () => {
    document.body.innerHTML = '<div id="root"><table><tbody><tr><td>One</td><td>Two</td></tr></tbody></table></div>';
    const root = document.getElementById('root');
    const core = createEditorCore(root);
    const range = document.createRange();
    range.setStart(root.querySelector('td').firstChild, 0);
    range.setEnd(root.querySelectorAll('td')[1].firstChild, 3);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
    core.toggleList('ul');
    expect(root.querySelectorAll('tr > td > ul > li')).toHaveLength(2);
});
