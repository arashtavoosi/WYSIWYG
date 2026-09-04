/** @jest-environment jsdom */
const createAdapter = require('../src/ui/editor-adapter');
require('../src/ui/components/web-components');

describe('input transactions and lifecycle', () => {
    let root, instance;
    function caret(offset) {
        const range = document.createRange();
        range.setStart(root.querySelector('p').firstChild, offset);
        range.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
    function type(text, inputType = 'insertText') {
        root.dispatchEvent(new InputEvent('beforeinput', { inputType, bubbles: true, cancelable: true }));
        root.querySelector('p').textContent += text;
        caret(root.querySelector('p').textContent.length);
        root.dispatchEvent(new InputEvent('input', { inputType, bubbles: true }));
    }
    beforeEach(() => {
        document.body.innerHTML = '<div id="toolbar"></div><div id="editor" contenteditable="true"><p>A</p></div>';
        root = document.getElementById('editor');
        instance = createAdapter({ elements: { editor: root, toolbar: document.getElementById('toolbar') } });
        root.focus();
        caret(1);
    });
    afterEach(() => { instance.destroy(); jest.restoreAllMocks(); });

    test('groups continuous typing and restores the initial caret on undo', () => {
        for (let i = 0; i < 60; i++) { type('b'); }
        const undo = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true });
        root.dispatchEvent(undo);
        expect(undo.defaultPrevented).toBe(true);
        expect(root.innerHTML).toBe('<p>A</p>');
        expect(window.getSelection().anchorOffset).toBe(1);
        root.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, shiftKey: true, bubbles: true, cancelable: true }));
        expect(root.textContent).toBe('A' + 'b'.repeat(60));
    });

    test('separates typing after a pause and invalidates redo on a new edit', () => {
        const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
        type('b');
        now.mockReturnValue(2500);
        type('c');
        instance.editor.undo();
        expect(root.textContent).toBe('Ab');
        type('d');
        expect(root.textContent).toBe('Abd');
        expect(instance.editor.canRedo()).toBe(false);
        instance.editor.undo();
        expect(root.textContent).toBe('Ab');
    });

    test('separates typing after caret movement and toolbar commands', () => {
        type('b');
        caret(0);
        instance.editor.toggleInline('bold');
        type('c');
        instance.editor.undo();
        expect(root.innerHTML).toBe('<p><strong>Ab</strong></p>');
        instance.editor.undo();
        expect(root.innerHTML).toBe('<p>Ab</p>');
        instance.editor.undo();
        expect(root.innerHTML).toBe('<p>A</p>');
    });

    test('records IME composition once and uses the same history for native undo input', () => {
        root.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        type('ب', 'insertCompositionText');
        type('ج', 'insertCompositionText');
        expect(instance.editor.canUndo()).toBe(false);
        root.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
        root.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }));
        type('d');
        instance.editor.undo();
        expect(root.textContent).toBe('Aبج');
        const event = new InputEvent('beforeinput', { inputType: 'historyUndo', bubbles: true, cancelable: true });
        root.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        expect(root.textContent).toBe('A');
    });

    test('destroy removes listeners and owned UI and is safe to call twice', () => {
        const added = jest.spyOn(document, 'addEventListener');
        const removed = jest.spyOn(document, 'removeEventListener');
        instance.destroy();
        instance = createAdapter({ elements: { editor: root, toolbar: document.getElementById('toolbar') }, codeView: { mode: 'only' } });
        instance.toggleCodeView();
        expect(root.hidden).toBe(true);
        const editorListeners = added.mock.calls.filter(call => ['selectionchange', 'keydown', 'mouseup'].includes(call[0]));
        const record = jest.spyOn(instance.editor, 'recordInput');
        instance.destroy();
        instance.destroy();
        expect(root.hidden).toBe(false);
        for (const call of editorListeners) { expect(removed.mock.calls).toContainEqual(call); }
        root.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }));
        expect(record).not.toHaveBeenCalled();
        expect(document.querySelector('wysiwyg-code-view')).toBeNull();
    });

    test('destroy cancels an open modal without stealing focus or inserting content', async () => {
        document.querySelector('button[title="Link"]').click();
        expect(document.querySelector('wysiwyg-modal')).not.toBeNull();
        instance.destroy();
        await Promise.resolve();
        expect(document.querySelector('wysiwyg-modal')).toBeNull();
        expect(root.innerHTML).toBe('<p>A</p>');
    });
});

test('history restores structural caret positions in empty blocks and at list ends', () => {
    const createCore = require('../src/core/editor-core');
    document.body.innerHTML = '<div id="root"><p><br></p><ul><li>One</li></ul>\n</div>';
    const root = document.getElementById('root');
    const editor = createCore(root);
    const range = document.createRange();
    range.setStart(root.firstChild, 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges(); selection.addRange(range);
    editor.prepareInput('insertText');
    root.firstChild.textContent = 'A';
    editor.recordInput('insertText');
    editor.undo();
    expect(selection.anchorNode).toBe(root.firstChild);
    expect(selection.anchorOffset).toBe(0);
    range.setStart(root.querySelector('li').firstChild, 3);
    range.collapse(true);
    selection.removeAllRanges(); selection.addRange(range);
    editor.prepareInput('insertText');
    root.querySelector('li').firstChild.appendData('x');
    editor.recordInput('insertText');
    editor.undo();
    expect(selection.anchorNode).toBe(root.querySelector('li').firstChild);
    expect(selection.anchorOffset).toBe(3);
});
