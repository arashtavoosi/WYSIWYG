/**
 * @jest-environment jsdom
 */

const codeView = require('../src/ui/code-view');

describe('HTML code view', () => {
    test('highlights HTML tokens while escaping source text', () => {
        const highlighted = codeView.highlightHtml('<p class="note">Hello &amp;</p><!-- done -->');

        expect(highlighted).toContain('<span class="wysiwyg-code-tag">p</span>');
        expect(highlighted).toContain('<span class="wysiwyg-code-attribute">class</span>');
        expect(highlighted).toContain('<span class="wysiwyg-code-string">&quot;note&quot;</span>');
        expect(highlighted).toContain('<span class="wysiwyg-code-entity">&amp;amp;</span>');
        expect(highlighted).toContain('<span class="wysiwyg-code-comment">&lt;!-- done --&gt;</span>');
        expect(highlighted).not.toContain('<p class="note">');
    });

    test('keeps an editable raw value beside the highlighted layer', () => {
        const view = codeView.createCodeView(document);
        const inputEvent = jest.fn();

        view.addEventListener('code-input', inputEvent);
        view.setValue('<p>Before</p>');
        view.setEditable(true);
        view.show();

        const input = view.querySelector('textarea');

        expect(view.hidden).toBe(false);
        expect(input.hidden).toBe(false);
        expect(view.querySelector('.wysiwyg-code-tag')).not.toBeNull();

        input.value = '<p>After</p>';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(view.getValue()).toBe('<p>After</p>');
        expect(inputEvent).toHaveBeenCalledTimes(1);
        expect(view.querySelector('.wysiwyg-code-tag')).not.toBeNull();
    });

    test('does not collapse the highlight layer for read-only source', () => {
        const view = codeView.createCodeView(document);

        view.setValue('<p>Read only</p>');
        view.setEditable(false);
        view.show();

        expect(view.querySelector('pre').style.width).toBe('');
        expect(view.querySelector('pre').style.height).toBe('');
    });

    test('removes common template indentation from the displayed source', () => {
        const view = codeView.createCodeView(document);

        view.setValue('\n        <p>One</p>\n        <p>Two</p>\n    ');

        expect(view.getValue()).toBe('<p>One</p>\n<p>Two</p>');
    });

    test('beautifies block tags while keeping inline markup together', () => {
        expect(codeView.beautifyHtml('<div><p>Hello <strong>world</strong></p><ul><li>One</li><li>Two</li></ul></div>')).toBe([
            '<div>',
            '  <p>Hello <strong>world</strong></p>',
            '  <ul>',
            '    <li>One</li>',
            '    <li>Two</li>',
            '  </ul>',
            '</div>'
        ].join('\n'));
    });

    test('minifies formatting whitespace without removing inline text spacing', () => {
        expect(codeView.minifyHtml('\n<div>\n  <p>Hello <strong>world</strong></p>\n</div>\n')).toBe(
            '<div><p>Hello <strong>world</strong></p></div>'
        );
    });

    test('beautify button updates editable source once', () => {
        const view = codeView.createCodeView(document);
        const inputEvent = jest.fn();

        view.addEventListener('code-input', inputEvent);
        view.setValue('<div><p>Before</p></div>');
        view.setEditable(true);
        view.querySelector('button').click();

        expect(view.getValue()).toBe('<div>\n  <p>Before</p>\n</div>');
        expect(inputEvent).toHaveBeenCalledTimes(1);

        view.querySelector('.wysiwyg-code-view-minify').click();

        expect(view.getValue()).toBe('<div><p>Before</p></div>');
        expect(inputEvent).toHaveBeenCalledTimes(2);
    });
});
