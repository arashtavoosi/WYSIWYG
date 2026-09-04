/** @jest-environment jsdom */
const createCore = require('../src/core/editor-core');
const createAdapter = require('../src/ui/editor-adapter');
const clipboard = require('../src/core/clipboard');

describe('clipboard', () => {
    let root, editor;
    beforeEach(() => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>BeforeAfter</p></div>';
        root = document.getElementById('editor');
        editor = createCore(root);
        const range = document.createRange();
        range.setStart(root.firstChild.firstChild, 6);
        range.collapse(true);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    });

    test('cleans imported styles and attributes while preserving supported content', () => {
        editor.insertPaste({ html: '<!--Office--><p class="MsoNormal" id="a" style="margin-top:20pt;color:red"><span style="font-weight:700">Bold</span> <b>mark</b><a href="https://example.com" target="_blank" onclick="alert(1)">link</a></p><script>alert(1)</script>' });
        expect(root.innerHTML).toBe('<p>Before</p><p style="color: red;"><strong>Bold mark</strong><a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a></p><p>After</p>');
        editor.undo();
        expect(root.innerHTML).toBe('<p>BeforeAfter</p>');
        expect(window.getSelection().anchorOffset).toBe(6);
        editor.redo();
        expect(root.querySelector('a').textContent).toBe('link');
    });

    test('plain text preserves newlines and treats markup literally', () => {
        editor.insertPaste({ html: '<b>ignored</b>', text: '<x>\r\nSecond', plainText: true });
        expect(root.innerHTML).toBe('<p>Before&lt;x&gt;<br>SecondAfter</p>');
    });

    test('drops unsupported elements and active URLs, retains lists and tables', () => {
        const fragment = clipboard.clean('<iframe src="x"></iframe><a href="java\nscript:alert(1)">x</a><ul><li>A</li></ul><table><tr><td colspan="2" data-foo="x">B</td></tr></table><img src="https://example.com/a.png" onerror="alert(1)">', document);
        expect(fragment.querySelector('iframe')).toBeNull();
        expect(fragment.querySelector('a').hasAttribute('href')).toBe(false);
        expect(fragment.querySelector('li').textContent).toBe('A');
        expect(fragment.querySelector('td').outerHTML).toBe('<td colspan="2">B</td>');
        expect(fragment.querySelector('img').hasAttribute('onerror')).toBe(false);
    });

    test('paste event uses the configured plain text policy and a single undo step', () => {
        const instance = createAdapter({ elements: { editor: root }, paste: { plainText: true } });
        const event = new Event('paste', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'clipboardData', { value: { getData: type => type === 'text/html' ? '<strong>Rich</strong>' : 'Plain' } });
        root.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        expect(root.innerHTML).toBe('<p>BeforePlainAfter</p>');
        instance.editor.undo();
        expect(root.innerHTML).toBe('<p>BeforeAfter</p>');
        instance.destroy();
    });
});

test('replacing several paragraphs leaves no empty boundary paragraphs', () => {
    document.body.innerHTML = '<div id="root"><p>One</p><p>Two</p></div>';
    const root = document.getElementById('root');
    const editor = createCore(root);
    const range = document.createRange();
    range.setStart(root.firstChild.firstChild, 0);
    range.setEnd(root.lastChild.firstChild, 3);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    editor.insertPaste({ html: '<p>Replacement</p>' });
    expect(root.innerHTML).toBe('<p>Replacement</p>');
});
