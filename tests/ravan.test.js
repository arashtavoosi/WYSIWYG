/**
 * @jest-environment jsdom
 */

const Ravan = require('../src/ravan');
const createEditorAdapter = require('../src/ui/editor-adapter');

describe('Ravan', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('mounts a wrapper and wraps its contents with an automatic toolbar and editor content', () => {
        document.body.innerHTML = '<div id="editor-wrapper"><p id="initial-content">Text</p></div>';

        const initialContent = document.getElementById('initial-content');
        const instance = Ravan.mount('#editor-wrapper');
        const wrapperElement = document.getElementById('editor-wrapper');
        const toolbarElement = wrapperElement.querySelector('[editor-toolbar]');
        const editorElement = wrapperElement.querySelector('[editor-content]');

        expect(toolbarElement).toBe(wrapperElement.firstElementChild);
        expect(toolbarElement.className).toBe('');
        expect(toolbarElement.hasAttribute('class')).toBe(false);
        expect(toolbarElement.hasAttribute('editor-toolbar')).toBe(true);
        expect(toolbarElement.nextElementSibling).toBe(editorElement);
        expect(toolbarElement.querySelectorAll('button').length).toBeGreaterThan(0);
        expect(editorElement.className).toBe('');
        expect(editorElement.hasAttribute('class')).toBe(false);
        expect(editorElement.hasAttribute('editor-content')).toBe(true);
        expect(editorElement.getAttribute('contenteditable')).toBe('true');
        expect(editorElement.firstElementChild).toBe(initialContent);
        expect(wrapperElement.children).toHaveLength(2);
        expect(instance.wrapperElement).toBe(wrapperElement);
        expect(instance.editorElement).toBe(editorElement);
        expect(instance.toolbarElement).toBe(toolbarElement);
    });

    test('marks an explicitly provided toolbar without moving it', () => {
        document.body.innerHTML = [
            '<div id="before"></div>',
            '<div id="toolbar" class="custom-toolbar"><span>Keep this content</span></div>',
            '<div id="editor-wrapper"><p>Text</p></div>',
            '<div id="after"></div>'
        ].join('');

        const beforeElement = document.getElementById('before');
        const toolbarElement = document.getElementById('toolbar');
        const wrapperElement = document.getElementById('editor-wrapper');
        const instance = Ravan.mount({
            elements: {
                wrapper: '#editor-wrapper',
                toolbar: '#toolbar'
            }
        });

        expect(instance.toolbarElement).toBe(toolbarElement);
        expect(toolbarElement.parentNode).toBe(document.body);
        expect(toolbarElement.previousElementSibling).toBe(beforeElement);
        expect(toolbarElement.nextElementSibling).toBe(wrapperElement);
        expect(toolbarElement.className).toBe('custom-toolbar');
        expect(toolbarElement.hasAttribute('editor-toolbar')).toBe(true);
        expect(toolbarElement.querySelectorAll('button').length).toBeGreaterThan(0);
        expect(wrapperElement.querySelector('[editor-content]')).not.toBeNull();
        expect(wrapperElement.querySelector('[editor-toolbar]')).toBeNull();
    });

    test('the adapter creates an adjacent toolbar when one is omitted', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Text</p></div>';

        const editorElement = document.getElementById('editor');
        const instance = createEditorAdapter({ elements: { editor: editorElement } });

        expect(instance.toolbarElement).toBe(editorElement.previousElementSibling);
        expect(instance.toolbarElement.className).toBe('');
        expect(instance.toolbarElement.hasAttribute('class')).toBe(false);
        expect(instance.toolbarElement.hasAttribute('editor-toolbar')).toBe(true);
    });

    test('uses explicitly configured editor and toolbar elements', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor-wrapper"><div id="editor"><p>Before</p></div></div>'
        ].join('');

        const instance = Ravan.mount('#editor-wrapper', {
            elements: {
                editor: '#editor',
                toolbar: '#toolbar'
            },
            editor: {
                initialHtml: '<p>Configured</p>'
            }
        });

        expect(instance.editorElement).toBe(document.getElementById('editor'));
        expect(instance.toolbarElement).toBe(document.getElementById('toolbar'));
        expect(instance.editorElement.innerHTML).toBe('<p>Configured</p>');
    });
});
