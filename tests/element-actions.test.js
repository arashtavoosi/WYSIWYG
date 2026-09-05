/** @jest-environment jsdom */
const createCore = require('../src/core/editor-core');

describe('element context and actions', () => {
    let root, editor, selection;
    function setup(markup) {
        document.body.innerHTML = '<div id="root" contenteditable="true">' + markup + '</div><p id="outside">Outside</p>';
        root = document.getElementById('root');
        editor = createCore(root);
        selection = window.getSelection();
    }
    function caret(node, offset = 0) {
        const range = document.createRange();
        range.setStart(node, offset); range.collapse(true);
        selection.removeAllRanges(); selection.addRange(range);
    }
    function tags() { return editor.getActiveFormats().elementPath.map(node => node.tagName); }

    test('reports every ancestor in DOM order, including repeated containers and inline marks', () => {
        setup('<blockquote><ol><li><ul><li><p><em><strong>Text</strong></em></p></li></ul></li></ol></blockquote>');
        caret(root.querySelector('strong').firstChild, 2);
        expect(tags()).toEqual(['DIV', 'BLOCKQUOTE', 'OL', 'LI', 'UL', 'LI', 'P', 'EM', 'STRONG']);
    });

    test('includes table sections and nested wrappers in their real order', () => {
        setup('<div><table><tbody><tr><td><div><p><a href="/a"><img src="a.png"></a></p></div></td></tr></tbody></table></div>');
        const range = document.createRange(); range.selectNode(root.querySelector('img'));
        selection.removeAllRanges(); selection.addRange(range);
        expect(tags()).toEqual(['DIV', 'DIV', 'TABLE', 'TBODY', 'TR', 'TD', 'DIV', 'P', 'A', 'IMG']);
    });

    test('uses the common ancestor for a selection across branches and only Root outside the editor', () => {
        setup('<blockquote><p>One</p><p>Two</p></blockquote>');
        const range = document.createRange();
        range.setStart(root.querySelector('p').firstChild, 1);
        range.setEnd(root.querySelectorAll('p')[1].firstChild, 2);
        selection.removeAllRanges(); selection.addRange(range);
        expect(tags()).toEqual(['DIV', 'BLOCKQUOTE']);
        caret(document.getElementById('outside').firstChild);
        expect(tags()).toEqual(['DIV']);
        expect(editor.getActiveFormats().block).toBeNull();
        caret(root, 0);
        expect(tags()).toEqual(['DIV']);
    });

    test('selects contents for styling, unwraps without losing text, and supports undo/redo', () => {
        setup('<p><span style="color: red"><strong>Hello</strong> world</span>!</p>');
        const span = root.querySelector('span');
        editor.actOnElement(span, 'select');
        expect(selection.toString()).toBe('Hello world');
        editor.actOnElement(span, 'unwrap');
        expect(root.innerHTML).toBe('<p><strong>Hello</strong> world!</p>');
        expect(selection.toString()).toBe('Hello world');
        editor.undo();
        expect(root.querySelector('span').style.color).toBe('red');
        editor.redo();
        expect(root.querySelector('span')).toBeNull();
    });

    test('deletes exactly the target, clears only its styles, and rejects stale and external nodes', () => {
        setup('<p style="color:red"><span style="font-size:24px">One</span></p><p>Two</p>');
        const target = root.firstChild;
        editor.actOnElement(target, 'clearStyle');
        expect(target.hasAttribute('style')).toBe(false);
        expect(target.firstChild.style.fontSize).toBe('24px');
        editor.actOnElement(target, 'remove');
        expect(root.innerHTML).toBe('<p>Two</p>');
        expect(editor.actOnElement(target, 'remove')).toBe(false);
        expect(editor.actOnElement(document.getElementById('outside'), 'remove')).toBe(false);
        editor.undo();
        expect(root.children).toHaveLength(2);
    });

    test('protects Root and required table/list structures while allowing selection', () => {
        setup('<ul><li>A</li></ul><table><tbody><tr><td>B</td></tr></tbody></table>');
        expect(editor.actOnElement(root, 'remove')).toBe(false);
        expect(editor.actOnElement(root, 'unwrap')).toBe(false);
        for (const tag of ['ul', 'li', 'table', 'tbody', 'tr', 'td']) {
            expect(editor.getElementCapabilities(root.querySelector(tag)).unwrap).toBe(false);
        }
        editor.actOnElement(root, 'select');
        expect(selection.toString()).toBe('AB');
        editor.actOnElement(root, 'end');
        expect(selection.anchorNode).toBe(root);
        expect(selection.anchorOffset).toBe(2);
        expect(editor.canUndo()).toBe(false);
    });
});

test('unwrapping a link keeps a caret at the end of its surviving inline text', () => {
    document.body.innerHTML = '<div id="root"><p><a href="/a"><strong><em>Hello</em></strong></a> world</p></div>';
    const root = document.getElementById('root');
    const editor = createCore(root);
    const text = root.querySelector('em').firstChild;
    const range = document.createRange();
    range.setStart(text, text.length); range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges(); selection.addRange(range);
    editor.actOnElement(root.querySelector('a'), 'unwrap');
    expect(selection.anchorNode).toBe(text);
    expect(selection.anchorOffset).toBe(5);
    expect(editor.getActiveFormats().elementPath.map(node => node.tagName)).toEqual(['DIV', 'P', 'STRONG', 'EM']);
    expect(editor.actOnElement(root.querySelector('p'), 'toString')).toBe(false);
});
