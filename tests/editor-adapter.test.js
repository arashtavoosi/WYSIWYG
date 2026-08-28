/**
 * @jest-environment jsdom
 */

const createEditorAdapter = require('../src/ui/editor-adapter');
require('../src/ui/web-components');

describe('editor adapter', () => {
    test('renders nested toolbar groups, default buttons, dropdowns, and color pickers', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Text</p></div>'
        ].join('');

        createEditorAdapter({
            editorElement: document.getElementById('editor'),
            toolbarElement: document.getElementById('toolbar'),
            toolbar: {
                group: {
                    title: 'Group',
                    children: {
                        plainButton: {
                            title: 'Plain Button',
                            onCommand: function () {}
                        },
                        dropdown: {
                            type: 'dropdown',
                            title: 'Choice',
                            options: [
                                { title: 'One', value: '1' },
                                { title: 'Two', value: '2' }
                            ],
                            onCommand: function () {}
                        },
                        color: {
                            type: 'colorpicker',
                            title: 'Color',
                            fallback: '#123456',
                            onCommand: function () {}
                        }
                    }
                }
            }
        });

        expect(document.querySelectorAll('.toolbar-group')).toHaveLength(1);
        expect(document.querySelector('button').textContent).toBe('Plain Button');
        expect(document.querySelector('select').getAttribute('title')).toBe('Choice');
        expect(document.querySelector('input[type="color"]').value).toBe('#123456');
    });

    test('renders toolbar groups and items by priority and skips hidden nodes', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Text</p></div>'
        ].join('');

        createEditorAdapter({
            editorElement: document.getElementById('editor'),
            toolbarElement: document.getElementById('toolbar'),
            toolbar: {
                lateGroup: {
                    title: 'Late',
                    priority: 20,
                    children: {
                        lateButton: {
                            title: 'Late Button',
                            priority: 20,
                            onCommand: function () {}
                        },
                        earlyButton: {
                            title: 'Early Button',
                            priority: 10,
                            onCommand: function () {}
                        },
                        hiddenButton: {
                            title: 'Hidden Button',
                            priority: 5,
                            hide: true,
                            onCommand: function () {}
                        }
                    }
                },
                hiddenGroup: {
                    title: 'Hidden Group',
                    priority: 5,
                    hide: function (context) {
                        return !!context.editor;
                    },
                    children: {
                        hiddenGroupButton: {
                            title: 'Hidden Group Button',
                            priority: 10,
                            onCommand: function () {}
                        }
                    }
                },
                earlyGroup: {
                    title: 'Early',
                    priority: 10,
                    children: {
                        first: {
                            title: 'First Group Button',
                            priority: 10,
                            onCommand: function () {}
                        }
                    }
                }
            }
        });

        const groups = Array.from(document.querySelectorAll('.toolbar-group')).map(function (group) {
            return group.getAttribute('aria-label');
        });
        const buttons = Array.from(document.querySelectorAll('button')).map(function (button) {
            return button.textContent;
        });

        expect(groups).toEqual(['Early', 'Late']);
        expect(buttons).toEqual(['First Group Button', 'Early Button', 'Late Button']);
    });

    test('renders sprite icons when toolbar nodes provide icon IDs', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Text</p></div>'
        ].join('');

        createEditorAdapter({
            editorElement: document.getElementById('editor'),
            toolbarElement: document.getElementById('toolbar'),
            toolbarConfig: {
                iconSpritePath: '/assets/toolbar-icons.svg'
            }
        });

        const boldUse = document.querySelector('button[title="Bold"] use');
        const fontUse = document.querySelector('.toolbar-dropdown use');

        expect(boldUse.getAttribute('href')).toBe('/assets/toolbar-icons.svg#wysiwyg-icon-bold');
        expect(fontUse.getAttribute('href')).toBe('/assets/toolbar-icons.svg#wysiwyg-icon-font-family');
    });

    test('custom render and onUpdate receive toolbar context', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p><strong>Text</strong></p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const textNode = editorElement.querySelector('strong').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar'),
            toolbar: {
                group: {
                    children: {
                        custom: {
                            title: 'Custom',
                            render: function (context) {
                                const button = document.createElement('button');

                                expect(context.editor).toBeTruthy();
                                button.type = 'button';
                                button.textContent = 'Custom';

                                return button;
                            },
                            onUpdate: function (context) {
                                context.element.textContent = context.state.bold ? 'Bold on' : 'Bold off';
                            },
                            onCommand: function () {}
                        }
                    }
                }
            }
        });

        const button = document.querySelector('button[title="Custom"]');

        range.setStart(textNode, 0);
        range.setEnd(textNode, textNode.textContent.length);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        expect(button.textContent).toBe('Bold on');
    });

    test('built-in button commands run and update active state', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Make this a heading.</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const textNode = editorElement.querySelector('p').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        range.setStart(textNode, 0);
        range.setEnd(textNode, 4);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        const headingButton = document.querySelector('button[title="Heading 1"]');
        headingButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(editorElement.innerHTML).toBe('<h1>Make this a heading.</h1>');
        expect(headingButton.classList.contains('is-active')).toBe(true);
        expect(headingButton.getAttribute('aria-pressed')).toBe('true');
    });

    test('keeps the caret inside a word after a toolbar inline command', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Alpha beta gamma.</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const textNode = editorElement.querySelector('p').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        range.setStart(textNode, textNode.textContent.indexOf('beta') + 2);
        range.collapse(true);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        document.querySelector('button[title="Bold"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(editorElement.innerHTML).toBe('<p>Alpha <strong>beta</strong> gamma.</p>');
        expect(selection.rangeCount).toBe(1);
        expect(selection.getRangeAt(0).collapsed).toBe(true);
        expect(selection.getRangeAt(0).startContainer).toBe(editorElement.querySelector('strong').firstChild);
        expect(selection.getRangeAt(0).startOffset).toBe(2);
    });

    test('alignment on a selected cell stays inside that cell', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<p id="before">Before</p>',
            '<table><tbody><tr><td id="cell"><br></td></tr></tbody></table>',
            '<p id="after">After</p>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const cell = document.getElementById('cell');

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        editorElement.focus();
        cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        const alignRight = document.querySelector('button[title="Align right"]');

        alignRight.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(editorElement.style.textAlign).toBe('');
        expect(editorElement.children[0]).toBe(document.getElementById('before'));
        expect(editorElement.children[1].tagName).toBe('TABLE');
        expect(editorElement.children[2]).toBe(document.getElementById('after'));
        expect(cell.style.textAlign).toBe('right');
        expect(cell.innerHTML).toBe('<br>');
        expect(alignRight.getAttribute('aria-pressed')).toBe('true');
    });

    test('clear formatting removes styles from selected cells and rows', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<table><tbody><tr id="row" style="height: 48px"><td id="cell" style="width: 120px; text-align: right"><br></td><td><br></td></tr></tbody></table>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const cell = document.getElementById('cell');
        const row = document.getElementById('row');

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        editorElement.focus();
        cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        document.querySelector('button[title="Clear formatting"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(cell.hasAttribute('style')).toBe(false);
        expect(row.style.height).toBe('48px');

        cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        document.querySelector('wysiwyg-table-selection').shadowRoot.querySelector('[data-mode="row"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        document.querySelector('button[title="Clear formatting"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(row.hasAttribute('style')).toBe(false);
    });

    test('restores the editor selection before applying color from the toolbar', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<p>Select part of this paragraph to create a <a href="https://example.com">link</a>, convert it into a heading, or turn it into a list.</p>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const paragraph = editorElement.querySelector('p');
        const textNode = paragraph.childNodes[2];
        const range = document.createRange();
        const selection = window.getSelection();
        const selectedText = 'heading';
        const startOffset = textNode.textContent.indexOf(selectedText);

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        const colorControl = document.querySelector('input[title="Text color"]');

        range.setStart(textNode, startOffset);
        range.setEnd(textNode, startOffset + selectedText.length);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        colorControl.focus();
        selection.removeAllRanges();
        colorControl.value = '#ea7d34';
        colorControl.dispatchEvent(new Event('input', { bubbles: true }));
        colorControl.dispatchEvent(new Event('change', { bubbles: true }));

        expect(editorElement.querySelector('span').textContent).toBe(selectedText);
        expect(editorElement.innerHTML).toBe('<p>Select part of this paragraph to create a <a href="https://example.com">link</a>, convert it into a <span style="color: rgb(234, 125, 52);">heading</span>, or turn it into a list.</p>');
    });

    test('saves the current selection when toolbar color interaction starts', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<p>Color only this word.</p>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const textNode = editorElement.querySelector('p').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();
        const selectedText = 'this';
        const startOffset = textNode.textContent.indexOf(selectedText);

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        const colorControl = document.querySelector('input[title="Text color"]');

        range.setStart(textNode, startOffset);
        range.setEnd(textNode, startOffset + selectedText.length);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);

        colorControl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        colorControl.focus();
        selection.removeAllRanges();
        colorControl.value = '#ea7d34';
        colorControl.dispatchEvent(new Event('input', { bubbles: true }));

        expect(editorElement.innerHTML).toBe('<p>Color only <span style="color: rgb(234, 125, 52);">this</span> word.</p>');
    });

    test('continuous color input updates one span without nesting', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<p>Color only this word.</p>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const textNode = editorElement.querySelector('p').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();
        const selectedText = 'this';
        const startOffset = textNode.textContent.indexOf(selectedText);

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        const colorControl = document.querySelector('input[title="Text color"]');

        range.setStart(textNode, startOffset);
        range.setEnd(textNode, startOffset + selectedText.length);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        colorControl.focus();

        ['#ea7d34', '#0f9f43', '#3245c8'].forEach(function (color) {
            colorControl.value = color;
            colorControl.dispatchEvent(new Event('input', { bubbles: true }));
        });

        expect(editorElement.querySelectorAll('span')).toHaveLength(1);
        expect(editorElement.innerHTML).toBe('<p>Color only <span style="color: rgb(50, 69, 200);">this</span> word.</p>');
    });

    test('does not prevent native select controls from opening', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Text</p></div>'
        ].join('');

        createEditorAdapter({
            editorElement: document.getElementById('editor'),
            toolbarElement: document.getElementById('toolbar')
        });

        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

        document.querySelector('select[title="Font"]').dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
    });

    test('toolbar undo and redo use adapter-recorded input snapshots', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Start</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        const undoButton = document.querySelector('button[title="Undo"]');
        const redoButton = document.querySelector('button[title="Redo"]');

        expect(undoButton.disabled).toBe(true);
        expect(redoButton.disabled).toBe(true);

        editorElement.innerHTML = '<p>Typed</p>';
        editorElement.dispatchEvent(new Event('input', { bubbles: true }));

        expect(undoButton.disabled).toBe(false);

        undoButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(editorElement.innerHTML).toBe('<p>Start</p>');
        expect(redoButton.disabled).toBe(false);

        redoButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(editorElement.innerHTML).toBe('<p>Typed</p>');
    });

    test('link command uses the modal prompt and restores the editor selection', async () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Create a link here.</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const textNode = editorElement.querySelector('p').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();
        const selectedText = 'link';
        const startOffset = textNode.textContent.indexOf(selectedText);

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        range.setStart(textNode, startOffset);
        range.setEnd(textNode, startOffset + selectedText.length);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        document.querySelector('button[title="Link"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const modal = document.querySelector('wysiwyg-modal');
        const input = modal.querySelector('input');
        const targetInput = modal.querySelector('[data-field="target"]');
        const labelText = modal.querySelector('label span');

        expect(modal.open).toBe(true);
        expect(input.value).toBe('https://');
        expect(targetInput.tagName).toBe('SELECT');
        expect(Array.from(targetInput.options).map(function (option) { return option.value; })).toEqual(['', '_self', '_blank', '_parent', '_top']);
        expect(targetInput.value).toBe('');
        expect(labelText.className).toBe('sr-only');

        input.value = 'https://example.org';
        targetInput.value = '_blank';
        modal.querySelector('[data-action="apply"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();

        expect(document.querySelector('wysiwyg-modal')).toBe(null);
        expect(editorElement.innerHTML).toBe('<p>Create a <a href="https://example.org" target="_blank">link</a> here.</p>');
    });

    test('image command uses a file browser modal', async () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Start</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const paragraph = editorElement.querySelector('p');
        const range = document.createRange();
        const selection = window.getSelection();

        window.prompt = jest.fn();

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar'),
            toolbarConfig: {
                fileBrowser: {
                    path: '/assets',
                    supportedExtensions: '.png',
                    items: [
                        { type: 'file', name: 'hero.png', path: '/assets/hero.png', url: '/media/hero.png', extension: '.png' },
                        { type: 'file', name: 'notes.txt', path: '/assets/notes.txt', extension: '.txt' }
                    ]
                }
            }
        });

        range.selectNodeContents(paragraph);
        range.collapse(false);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        document.querySelector('button[title="Image"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const modal = document.querySelector('wysiwyg-modal');
        const browser = modal.querySelector('wysiwyg-file-browser');

        expect(modal.open).toBe(true);
        expect(browser.viewMode).toBe('thumbnail');
        expect(browser.shadowRoot.querySelectorAll('[data-index]')).toHaveLength(1);
        expect(window.prompt).not.toHaveBeenCalled();

        browser.shadowRoot.querySelector('[data-index="0"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();

        expect(document.querySelector('wysiwyg-modal')).toBe(null);
        expect(editorElement.querySelector('img').getAttribute('src')).toBe('/media/hero.png');
        expect(editorElement.querySelector('img').getAttribute('data-file-path')).toBe('/assets/hero.png');
    });

    test('image command opens the selected image folder and replaces that image', async () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>',
            '<img src="/media/assets/old.png" alt="Old" width="120" data-file-path="/assets/old.png">',
            '</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const image = editorElement.querySelector('img');

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar'),
            toolbarConfig: {
                fileBrowser: {
                    path: '/assets',
                    supportedExtensions: '.png',
                    items: [
                        { type: 'file', name: 'old.png', path: '/assets/old.png', url: '/media/assets/old.png', extension: '.png' },
                        { type: 'file', name: 'new.png', path: '/assets/new.png', url: '/media/assets/new.png', extension: '.png' }
                    ]
                }
            }
        });

        editorElement.focus();
        image.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        expect(document.querySelector('button[title="Image"]').getAttribute('aria-pressed')).toBe('true');
        expect(document.querySelector('button[title="Update image URL"]')).toBeNull();

        document.querySelector('button[title="Image"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const modal = document.querySelector('wysiwyg-modal');
        const browser = modal.querySelector('wysiwyg-file-browser');

        expect(browser.path).toBe('/assets');

        browser.shadowRoot.querySelector('[data-index="1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();

        expect(editorElement.querySelectorAll('img')).toHaveLength(1);
        expect(editorElement.querySelector('img')).toBe(image);
        expect(image.getAttribute('src')).toBe('/media/assets/new.png');
        expect(image.getAttribute('data-file-path')).toBe('/assets/new.png');
        expect(image.getAttribute('alt')).toBe('Old');
        expect(image.getAttribute('width')).toBe('120');
    });

    test('image tools popup updates full-size, object-fit, and layout styles', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p><img src="image.png" style="object-fit: contain"></p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const image = editorElement.querySelector('img');

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        editorElement.focus();
        image.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        const popup = document.querySelector('wysiwyg-popup[data-mode="image"]');
        const fullSize = popup.querySelector('[data-action="fullSize"]');
        const objectFit = popup.querySelector('[data-style="objectFit"]');
        const layout = popup.querySelector('[data-style="layout"]');

        expect(Array.from(objectFit.options).map(function (option) { return option.value; })).toEqual(['', 'fill', 'contain', 'cover', 'none', 'scale-down']);
        expect(Array.from(layout.options).map(function (option) { return option.value; })).toEqual(['inline', 'block', 'float-left', 'float-right']);
        expect(objectFit.value).toBe('contain');
        expect(layout.value).toBe('inline');
        expect(fullSize.getAttribute('aria-pressed')).toBe('false');

        fullSize.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(image.style.width).toBe('100%');
        expect(fullSize.getAttribute('aria-pressed')).toBe('true');

        objectFit.value = 'cover';
        objectFit.dispatchEvent(new Event('change', { bubbles: true }));
        expect(image.style.objectFit).toBe('cover');

        layout.value = 'float-right';
        layout.dispatchEvent(new Event('change', { bubbles: true }));
        expect(image.style.display).toBe('');
        expect(image.style.float).toBe('right');
        expect(layout.value).toBe('float-right');
    });

    test('image command falls back to the file browser root for an invalid image path', async () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>',
            '<img src="/outside/old.png">',
            '</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const image = editorElement.querySelector('img');

        global.fetch = jest.fn()
            .mockResolvedValueOnce({ ok: false })
            .mockResolvedValueOnce({
                ok: true,
                json: function () {
                    return Promise.resolve({ path: '/', items: [] });
                }
            });

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar'),
            toolbarConfig: {
                fileBrowser: { endpoint: '/files', path: '/' }
            }
        });

        editorElement.focus();
        image.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        document.querySelector('button[title="Image"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        await new Promise(function (resolve) { setTimeout(resolve, 0); });

        const modal = document.querySelector('wysiwyg-modal');
        const browser = modal.querySelector('wysiwyg-file-browser');
        const requestedPaths = global.fetch.mock.calls.map(function (call) {
            return new URL(call[0]).searchParams.get('path');
        });

        expect(requestedPaths).toEqual(['/outside', '/']);
        expect(browser.path).toBe('/');

        modal.querySelector('[data-action="cancel"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        delete global.fetch;
    });

    test('table command uses a popup grid picker', async () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Insert here.</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const paragraph = editorElement.querySelector('p');
        const range = document.createRange();
        const selection = window.getSelection();

        window.prompt = jest.fn();

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        range.selectNodeContents(paragraph);
        range.collapse(false);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        document.querySelector('button[title="Table"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const popup = document.querySelector('wysiwyg-popup');
        const cell = popup.querySelector('[data-row="3"][data-col="4"]');

        expect(popup.open).toBe(true);
        expect(window.prompt).not.toHaveBeenCalled();

        cell.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        expect(popup.querySelector('.wysiwyg-table-picker-label').textContent).toBe('4x3 Table');

        cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();

        expect(document.querySelector('wysiwyg-popup').getAttribute('data-mode')).toBe('cell');
        expect(document.querySelector('wysiwyg-popup').querySelectorAll('.wysiwyg-table-tool')).toHaveLength(4);
        expect(editorElement.querySelectorAll('thead th')).toHaveLength(4);
        expect(editorElement.querySelectorAll('tbody tr')).toHaveLength(3);
        expect(editorElement.querySelectorAll('tbody td')).toHaveLength(12);
    });

    test('table tools popup is automatic while selection is inside a table', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<table><tbody><tr><td>Cell</td></tr></tbody></table>',
            '<p>After</p>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const textNode = editorElement.querySelector('td').firstChild;
        const afterTextNode = editorElement.querySelector('p').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        range.setStart(textNode, 0);
        range.collapse(true);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        expect(document.querySelectorAll('button[title="Table"]')).toHaveLength(1);
        expect(document.getElementById('toolbar').querySelector('[title="Row before"]')).toBe(null);

        const popup = document.querySelector('wysiwyg-popup');

        expect(popup.open).toBe(true);
        expect(popup.getAttribute('data-mode')).toBe('cell');
        expect(popup.querySelectorAll('.wysiwyg-table-tool')).toHaveLength(4);

        document.querySelector('wysiwyg-table-selection').shadowRoot.querySelector('[data-mode="row"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const rowPopup = document.querySelector('wysiwyg-popup');

        expect(rowPopup.getAttribute('data-mode')).toBe('row');
        expect(rowPopup.querySelectorAll('.wysiwyg-table-tool')).toHaveLength(3);
        expect(rowPopup.querySelector('[data-action="rowAfter"] use').getAttribute('href')).toBe('#wysiwyg-icon-row-after');

        rowPopup.querySelector('[data-action="rowAfter"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(document.querySelector('wysiwyg-popup').open).toBe(true);
        expect(editorElement.querySelectorAll('tbody tr')).toHaveLength(2);

        range.setStart(afterTextNode, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        expect(document.querySelector('wysiwyg-popup')).toBe(null);
    });

    test('column tools keep the selected cell in its body row', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><table>',
            '<thead><tr><th>Head</th></tr></thead>',
            '<tbody><tr><td>First</td></tr><tr><td>Selected</td></tr></tbody>',
            '</table></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const cell = editorElement.querySelectorAll('tbody td')[1];
        const adapter = createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        editorElement.focus();
        cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        document.querySelector('[data-action="colAfter"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(adapter.editor.getActiveFormats().table.rowIndex).toBe(2);
        expect(adapter.editor.getActiveFormats().table.cellIndex).toBe(1);

        document.querySelector('[data-action="colBefore"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(adapter.editor.getActiveFormats().table.rowIndex).toBe(2);
        expect(adapter.editor.getActiveFormats().table.cellIndex).toBe(1);
    });

    test('resize overlay attaches to table targets from editor clicks', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<table><tbody><tr><td>Cell</td></tr></tbody></table>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const table = editorElement.querySelector('table');
        const cell = editorElement.querySelector('td');

        table.getBoundingClientRect = function () {
            return { left: 12, top: 24, right: 172, bottom: 114, width: 160, height: 90 };
        };
        cell.getBoundingClientRect = function () {
            return { left: 12, top: 24, right: 92, bottom: 69, width: 80, height: 45 };
        };

        const adapter = createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        editorElement.focus();
        cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        const overlay = document.querySelector('wysiwyg-resize-overlay');

        expect(overlay.open).toBe(true);
        expect(overlay.target).toBe(cell);
        expect(overlay.boundary).toBe(editorElement);
        expect(overlay.hasAttribute('move-disabled')).toBe(true);
        expect(overlay.style.left).toBe('12px');
        expect(overlay.style.top).toBe('24px');
        expect(adapter.editor.getActiveFormats().table).toBeTruthy();
    });

    test('hides and disables a stale table move target after selection leaves the table', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<table><tbody><tr><td id="cell">Cell</td></tr></tbody></table>',
            '<p id="outside">Outside drop</p>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const cell = document.getElementById('cell');
        const outside = document.getElementById('outside');
        const selection = window.getSelection();
        const range = document.createRange();
        const dropRange = document.createRange();

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        editorElement.focus();
        cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        const overlay = document.querySelector('wysiwyg-resize-overlay');

        expect(overlay.hasAttribute('open')).toBe(true);
        expect(overlay.target).toBe(cell);
        expect(overlay.hasAttribute('move-disabled')).toBe(true);

        range.selectNodeContents(outside);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        expect(overlay.hasAttribute('open')).toBe(false);
        expect(overlay.hasAttribute('move-disabled')).toBe(true);

        dropRange.setStart(outside.firstChild, 7);
        dropRange.collapse(true);
        Object.defineProperty(document, 'caretRangeFromPoint', {
            configurable: true,
            value: function () {
                return dropRange;
            }
        });

        overlay.shadowRoot.querySelector('.move').dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            clientX: 20,
            clientY: 20
        }));
        document.dispatchEvent(new MouseEvent('pointermove', {
            bubbles: true,
            clientX: 80,
            clientY: 80
        }));
        document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

        expect(cell.parentNode.tagName).toBe('TR');
        expect(editorElement.querySelector('table').contains(cell)).toBe(true);

        delete document.caretRangeFromPoint;
    });

    test('hides a stale cell move target when a selection crosses outside the table', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<table><tbody><tr><td id="cell">Cell content</td></tr></tbody></table>',
            '<p id="outside">Outside text</p>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const cell = document.getElementById('cell');
        const outside = document.getElementById('outside');
        const selection = window.getSelection();
        const range = document.createRange();

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        editorElement.focus();
        cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        const overlay = document.querySelector('wysiwyg-resize-overlay');

        expect(overlay.hasAttribute('open')).toBe(true);
        expect(overlay.target).toBe(cell);

        range.setStart(cell.firstChild, 0);
        range.setEnd(outside.firstChild, outside.textContent.length);
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        expect(overlay.hasAttribute('open')).toBe(false);
        expect(overlay.hasAttribute('move-disabled')).toBe(true);
        expect(editorElement.querySelector('table').contains(cell)).toBe(true);
    });

    test('resize overlay switches directly to another clicked target', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<table id="first"><tbody><tr><td>First</td></tr></tbody></table>',
            '<table id="second"><tbody><tr><td>Second</td></tr></tbody></table>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const first = document.getElementById('first');
        const second = document.getElementById('second');
        const firstCell = first.querySelector('td');
        const secondCell = second.querySelector('td');
        const selection = window.getSelection();
        const range = document.createRange();

        first.getBoundingClientRect = function () {
            return { left: 10, top: 20, right: 110, bottom: 80, width: 100, height: 60 };
        };
        second.getBoundingClientRect = function () {
            return { left: 30, top: 120, right: 210, bottom: 200, width: 180, height: 80 };
        };
        firstCell.getBoundingClientRect = function () {
            return { left: 10, top: 20, right: 110, bottom: 80, width: 100, height: 60 };
        };
        secondCell.getBoundingClientRect = function () {
            return { left: 30, top: 120, right: 210, bottom: 200, width: 180, height: 80 };
        };

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        range.selectNodeContents(firstCell);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
        firstCell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        const overlay = document.querySelector('wysiwyg-resize-overlay');

        expect(overlay.target).toBe(firstCell);

        range.selectNodeContents(secondCell);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        secondCell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        expect(overlay.target).toBe(secondCell);
        expect(overlay.style.left).toBe('30px');
        expect(overlay.style.top).toBe('120px');
    });

    test('nested image selection suppresses table selection and table tools', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<table><tbody><tr><td><img src="image.png"></td></tr></tbody></table>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const image = editorElement.querySelector('img');

        image.getBoundingClientRect = function () {
            return { left: 40, top: 50, right: 140, bottom: 110, width: 100, height: 60 };
        };

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        editorElement.focus();
        image.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        expect(document.querySelector('wysiwyg-popup[data-mode="image"]')).not.toBeNull();
        expect(document.querySelector('wysiwyg-resize-overlay').target).toBe(image);
        expect(document.querySelector('wysiwyg-table-selection')).toBeNull();
    });

    test('moving an image between cells keeps image selection active', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<table><tbody><tr><td id="source"><img src="image.png"></td><td id="destination"><br></td></tr></tbody></table>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const image = editorElement.querySelector('img');
        const source = document.getElementById('source');
        const destination = document.getElementById('destination');
        const destinationRange = document.createRange();
        let dropRange = destinationRange;

        image.getBoundingClientRect = function () {
            return { left: 40, top: 50, right: 140, bottom: 110, width: 100, height: 60 };
        };
        destinationRange.selectNodeContents(destination);
        destinationRange.collapse(true);
        Object.defineProperty(document, 'caretRangeFromPoint', {
            configurable: true,
            value: function () {
                return dropRange;
            }
        });

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        editorElement.focus();
        image.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        const overlay = document.querySelector('wysiwyg-resize-overlay');

        overlay.shadowRoot.querySelector('.move').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 160, clientY: 80 }));
        document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 160, clientY: 80 }));
        destination.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 160, clientY: 80 }));

        expect(image.parentNode).toBe(destination);
        expect(document.querySelector('button[title="Image"]').getAttribute('aria-pressed')).toBe('true');
        expect(document.querySelector('wysiwyg-popup[data-mode="image"]')).not.toBeNull();
        expect(overlay.open).toBe(true);
        expect(overlay.target).toBe(image);
        expect(editorElement.querySelectorAll('tr')).toHaveLength(1);
        expect(editorElement.querySelectorAll('td')).toHaveLength(2);

        const sourceRange = document.createRange();

        sourceRange.selectNodeContents(source);
        sourceRange.collapse(true);
        dropRange = sourceRange;
        overlay.shadowRoot.querySelector('.move').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 40, clientY: 80 }));
        document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 40, clientY: 80 }));
        source.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 40, clientY: 80 }));

        expect(image.parentNode).toBe(source);
        expect(document.querySelector('button[title="Image"]').getAttribute('aria-pressed')).toBe('true');
        expect(overlay.target).toBe(image);
        expect(editorElement.querySelectorAll('tr')).toHaveLength(1);
        expect(editorElement.querySelectorAll('td')).toHaveLength(2);

        delete document.caretRangeFromPoint;
    });

    test('modifier click selects a cell rectangle and exposes merge and unmerge', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<table><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const cells = Array.from(editorElement.querySelectorAll('td'));
        const selection = window.getSelection();
        const range = document.createRange();

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        range.selectNodeContents(cells[0]);
        range.collapse(true);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        cells[0].dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        cells[3].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ctrlKey: true }));
        selection.removeAllRanges();
        document.dispatchEvent(new Event('selectionchange'));
        cells[3].dispatchEvent(new MouseEvent('mouseup', { bubbles: true, ctrlKey: true }));

        cells[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ctrlKey: true }));
        selection.removeAllRanges();
        document.dispatchEvent(new Event('selectionchange'));
        cells[1].dispatchEvent(new MouseEvent('mouseup', { bubbles: true, ctrlKey: true }));

        const popup = document.querySelector('wysiwyg-popup');
        const resizeOverlay = document.querySelector('wysiwyg-resize-overlay');

        expect(document.querySelector('wysiwyg-table-selection').getAttribute('mode')).toBe('multiple');
        expect(popup.getAttribute('data-mode')).toBe('multiple');
        expect(popup.querySelectorAll('.wysiwyg-table-tool')).toHaveLength(2);
        expect(popup.querySelector('[data-action="merge"]').disabled).toBe(false);
        expect(popup.querySelector('[data-action="unmerge"]').disabled).toBe(true);
        expect(resizeOverlay.open).toBe(false);

        popup.querySelector('[data-action="merge"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const merged = editorElement.querySelector('td');
        const mergedPopup = document.querySelector('wysiwyg-popup');

        expect(editorElement.querySelectorAll('td')).toHaveLength(1);
        expect(merged.rowSpan).toBe(2);
        expect(merged.colSpan).toBe(2);
        expect(mergedPopup.querySelector('[data-action="unmerge"]').disabled).toBe(false);

        mergedPopup.querySelector('[data-action="unmerge"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(editorElement.querySelectorAll('td')).toHaveLength(4);
    });

    test('table selectors enable row, column, and table resize modes', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<table><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const table = editorElement.querySelector('table');
        const cell = editorElement.querySelector('td');
        const cells = Array.from(editorElement.querySelectorAll('td'));
        const rows = Array.from(editorElement.querySelectorAll('tr'));
        const selection = window.getSelection();
        const range = document.createRange();

        table.getBoundingClientRect = function () {
            return { left: 10, top: 20, right: 110, bottom: 80, width: 100, height: 60 };
        };
        rows.forEach(function (row, rowIndex) {
            row.getBoundingClientRect = function () {
                return { left: 10, top: 20 + rowIndex * 30, right: 110, bottom: 50 + rowIndex * 30, width: 100, height: 30 };
            };
        });
        cells.forEach(function (tableCell, index) {
            var rowIndex = Math.floor(index / 2);
            var columnIndex = index % 2;

            tableCell.getBoundingClientRect = function () {
                return { left: 10 + columnIndex * 50, top: 20 + rowIndex * 30, right: 60 + columnIndex * 50, bottom: 50 + rowIndex * 30, width: 50, height: 30 };
            };
        });

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: document.getElementById('toolbar')
        });

        range.selectNodeContents(cell);
        range.collapse(true);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        let selector = document.querySelector('wysiwyg-table-selection');
        selector.shadowRoot.querySelector('[data-mode="row"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        let resizeOverlay = document.querySelector('wysiwyg-resize-overlay');

        expect(document.querySelector('wysiwyg-popup').getAttribute('data-mode')).toBe('row');
        expect(resizeOverlay.open).toBe(true);
        expect(resizeOverlay.target).toBe(rows[0]);
        expect(resizeOverlay.getAttribute('resize-axis')).toBe('y');

        resizeOverlay.shadowRoot.querySelector('[data-resize="s"]').dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            clientX: 60,
            clientY: 50
        }));
        document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 80, clientY: 70 }));
        document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

        expect(rows[0].style.height).toBe('50px');
        expect(rows[0].style.width).toBe('');

        cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        selector = document.querySelector('wysiwyg-table-selection');
        selector.shadowRoot.querySelector('[data-mode="column"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        resizeOverlay = document.querySelector('wysiwyg-resize-overlay');

        expect(document.querySelector('wysiwyg-popup').getAttribute('data-mode')).toBe('column');
        expect(document.querySelector('wysiwyg-popup').querySelectorAll('.wysiwyg-table-tool')).toHaveLength(3);
        expect(resizeOverlay.open).toBe(true);
        expect(resizeOverlay.target).toBe(cell);
        expect(resizeOverlay.getAttribute('resize-axis')).toBe('x');
        expect(resizeOverlay.style.height).toBe('60px');

        cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        selector = document.querySelector('wysiwyg-table-selection');
        selector.shadowRoot.querySelector('[data-mode="table"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(document.querySelector('wysiwyg-popup').getAttribute('data-mode')).toBe('table');
        expect(document.querySelector('wysiwyg-popup').querySelectorAll('.wysiwyg-table-tool')).toHaveLength(3);
        expect(document.querySelector('wysiwyg-resize-overlay').target).toBe(table);
        expect(document.querySelector('wysiwyg-resize-overlay').hasAttribute('move-disabled')).toBe(false);
        expect(document.querySelector('wysiwyg-resize-overlay').hasAttribute('resize-axis')).toBe(false);

        const fullSize = document.querySelector('wysiwyg-popup').querySelector('[data-action="fullSize"]');

        expect(fullSize.getAttribute('title')).toBe('Full-size table');
        expect(fullSize.getAttribute('aria-pressed')).toBe('false');

        fullSize.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(table.style.width).toBe('100%');
        expect(fullSize.getAttribute('aria-pressed')).toBe('true');

        fullSize.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(table.style.width).toBe('');
        expect(fullSize.getAttribute('aria-pressed')).toBe('false');
    });
});
