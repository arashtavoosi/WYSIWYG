/** @jest-environment jsdom */
const createAdapter = require('../src/ui/editor-adapter');

describe('breadcrumb menus without optional web components', () => {
    let root, status, instance;
    function focusText(selector) {
        root.focus();
        const range = document.createRange();
        range.setStart(root.querySelector(selector).firstChild, 1); range.collapse(true);
        window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
        instance.sync();
    }
    function open(label) {
        [...status.querySelectorAll('button')].find(button => button.textContent === label).click();
        return document.querySelector('.status-element-menu');
    }
    function choose(action) { document.querySelector('[data-element-action="' + action + '"]').click(); }
    beforeEach(() => {
        document.body.innerHTML = '<div id="root" contenteditable="true"><blockquote><p><span style="color:red"><strong>Hello</strong> world</span>!</p></blockquote></div><div id="status"></div>';
        root = document.getElementById('root');
        status = document.getElementById('status');
        instance = createAdapter({ elements: { editor: root, status } });
        focusText('strong');
    });
    afterEach(() => instance.destroy());

    test('opens a native fallback menu and applies toolbar styling to selected ancestor contents', () => {
        const menu = open('span');
        expect(menu.tagName).toBe('DIV');
        expect(document.activeElement.textContent).toBe('Select contents');
        choose('select');
        expect(window.getSelection().toString()).toBe('Hello world');
        const color = instance.toolbarElement.querySelector('input[title="Text color"]');
        color.value = '#0000ff';
        color.dispatchEvent(new Event('input', { bubbles: true }));
        expect(root.textContent).toBe('Hello world!');
        expect([...root.querySelectorAll('[style]')].filter(node => node.style.color === 'rgb(0, 0, 255)').map(node => node.textContent).join('')).toBe('Hello world');
        expect(document.querySelector('.status-element-menu')).toBeNull();
    });

    test('unwrap is undoable and updates the path without the removed element', () => {
        open('span'); choose('unwrap');
        expect(root.querySelector('span')).toBeNull();
        expect(root.textContent).toBe('Hello world!');
        expect(status.textContent).toBe('Root › Quote › Paragraph › Bold');
        instance.editor.undo(); instance.sync();
        expect(root.querySelector('span').style.color).toBe('red');
        expect(status.textContent).toContain('span');
    });

    test('Root is always present and cannot be deleted or unwrapped', () => {
        const menu = open('Root');
        expect(menu.querySelector('[data-element-action="remove"]').disabled).toBe(true);
        expect(menu.querySelector('[data-element-action="unwrap"]').disabled).toBe(true);
        expect(menu.querySelector('[data-element-action="select"]').disabled).toBe(false);
        choose('select');
        expect(window.getSelection().toString()).toBe('Hello world!');
    });

    test('arrow keys navigate, Escape returns focus, and outside clicks dismiss', () => {
        open('span');
        document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
        expect(document.activeElement.textContent).toBe('Place cursor at start');
        document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        expect(document.activeElement.textContent).toBe('span');
        expect(document.activeElement.getAttribute('aria-expanded')).toBe('false');
        open('span');
        root.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        expect(document.querySelector('.status-element-menu')).toBeNull();
    });

    test('does not rerender focused buttons on an unchanged path and tears down an open menu', () => {
        const button = status.querySelector('button');
        button.focus();
        instance.sync();
        expect(status.querySelector('button')).toBe(button);
        expect(document.activeElement).toBe(button);
        open('Root');
        const oldHtml = root.innerHTML;
        instance.destroy();
        expect(document.querySelector('.status-element-menu')).toBeNull();
        button.click();
        expect(document.querySelector('.status-element-menu')).toBeNull();
        expect(root.innerHTML).toBe(oldHtml);
    });
});
