/**
 * @jest-environment jsdom
 */

const createEditorAdapter = require('../src/ui/editor-adapter');
require('../src/ui/components/web-components');

describe('editor adapter', () => {
    test('renders nested toolbar groups, default buttons, dropdowns, and color pickers', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Text</p></div>'
        ].join('');

        createEditorAdapter({
            elements: {
                editor: document.getElementById('editor'),
                toolbar: document.getElementById('toolbar')
            },
            toolbar: {
                items: {
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
            elements: {
                editor: document.getElementById('editor'),
                toolbar: document.getElementById('toolbar')
            },
            toolbar: {
                items: {
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
            elements: {
                editor: document.getElementById('editor'),
                toolbar: document.getElementById('toolbar')
            },
            assets: {
                icons: {
                    url: '/assets/toolbar-icons.svg'
                }
            }
        });

        const boldUse = document.querySelector('button[title="Bold"] use');
        const fontUse = document.querySelector('.toolbar-dropdown use');
        const mediaUse = document.querySelector('button[title="Media"] use');
        const codeBlockUse = document.querySelector('button[title="Code block"] use');

        expect(boldUse.getAttribute('href')).toBe('/assets/toolbar-icons.svg#wysiwyg-icon-bold');
        expect(fontUse.getAttribute('href')).toBe('/assets/toolbar-icons.svg#wysiwyg-icon-font-family');
        expect(mediaUse.getAttribute('href')).toBe('/assets/toolbar-icons.svg#wysiwyg-icon-image');
        expect(codeBlockUse.getAttribute('href')).toBe('/assets/toolbar-icons.svg#wysiwyg-icon-code-tag');
        expect(document.querySelector('button[title="Remove image"]')).toBeNull();
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            },
            toolbar: {
                items: {
                    group: {
                    children: {
                        custom: {
                            title: 'Custom',
                            render: function (context) {
                                const button = document.createElement('button');

                                expect(context.editor).toBeTruthy();
                                expect(context.config).toBeTruthy();
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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

    test('direction buttons set and reflect the current block direction', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Directional text</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const textNode = editorElement.querySelector('p').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });

        range.setStart(textNode, 5);
        range.collapse(true);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        const rtlButton = document.querySelector('button[title="Right to left"]');
        const ltrButton = document.querySelector('button[title="Left to right"]');

        expect(ltrButton.getAttribute('aria-pressed')).toBe('true');

        rtlButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(editorElement.querySelector('p').style.direction).toBe('rtl');
        expect(rtlButton.getAttribute('aria-pressed')).toBe('true');
        expect(ltrButton.getAttribute('aria-pressed')).toBe('false');

        ltrButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(editorElement.querySelector('p').style.direction).toBe('');
        expect(editorElement.querySelector('p').hasAttribute('style')).toBe(false);
        expect(ltrButton.getAttribute('aria-pressed')).toBe('true');
        expect(rtlButton.getAttribute('aria-pressed')).toBe('false');
    });

    test('direction buttons set and reflect a selected cell direction', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<table><tbody><tr><td id="cell"><p>Cell text</p></td></tr></tbody></table>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const cell = document.getElementById('cell');

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });

        editorElement.focus();
        cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        const rtlButton = document.querySelector('button[title="Right to left"]');

        rtlButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(cell.style.direction).toBe('rtl');
        expect(rtlButton.getAttribute('aria-pressed')).toBe('true');
    });

    test('direction state follows an explicit cell direction from inside a child block', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<table><tbody><tr><td id="cell" style="direction: rtl"><p>Cell text</p></td></tr></tbody></table>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const textNode = document.querySelector('#cell p').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });

        range.setStart(textNode, 2);
        range.collapse(true);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        expect(document.querySelector('button[title="Right to left"]').getAttribute('aria-pressed')).toBe('true');
        expect(document.querySelector('button[title="Left to right"]').getAttribute('aria-pressed')).toBe('false');
    });

    test('applies a root-level style to a neutral wrapper', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<p>Before</p>',
            '<table><tbody><tr><td><br></td></tr></tbody></table>',
            '<p>After</p>',
            '</div>',
            '<div id="status"></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const range = document.createRange();
        const selection = window.getSelection();

        createEditorAdapter({
            elements: {
                editor: editorElement,
                status: document.getElementById('status'),
                toolbar: document.getElementById('toolbar')
            }
        });

        range.setStart(editorElement, 2);
        range.collapse(true);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        expect(document.getElementById('status').textContent).toBe('Root');

        const font = document.querySelector('select[title="Font"]');

        font.value = "'Courier New', monospace";
        font.dispatchEvent(new Event('change', { bubbles: true }));

        expect(editorElement.children).toHaveLength(1);
        expect(editorElement.firstElementChild.tagName).toBe('DIV');
        expect(editorElement.firstElementChild.style.fontFamily).toBe("'Courier New', monospace");
        expect(editorElement.firstElementChild.querySelector('table')).not.toBeNull();
        expect(selection.rangeCount).toBe(1);
        expect(selection.getRangeAt(0).collapsed).toBe(true);
        expect(selection.getRangeAt(0).startContainer).toBe(editorElement.firstElementChild);
        expect(selection.getRangeAt(0).startOffset).toBe(2);
    });

    test('reflects selected font, size, and line-height styles in the toolbar', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<p style="line-height: 1.8"><span style="font-family: Helvetica Neue, Arial, sans-serif; font-size: 24px">Styled text</span></p>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const textNode = editorElement.querySelector('span').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });

        range.setStart(textNode, 0);
        range.setEnd(textNode, textNode.textContent.length);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        expect(document.querySelector('select[title="Font"]').value).toBe("'Helvetica Neue', Arial, sans-serif");
        expect(document.querySelector('select[title="Size"]').value).toBe('24px');
        expect(document.querySelector('select[title="Line"]').value).toBe('1.8');
    });

    test('preserves the selection across sequential style dropdown commands', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Style this text.</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const textNode = editorElement.querySelector('p').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();
        const font = 'select[title="Font"]';
        const size = 'select[title="Size"]';
        const line = 'select[title="Line"]';

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });

        range.setStart(textNode, 0);
        range.setEnd(textNode, textNode.textContent.length);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        document.querySelector(font).value = "'Courier New', monospace";
        document.querySelector(font).dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector(size).value = '24px';
        document.querySelector(size).dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector(line).value = '1.8';
        document.querySelector(line).dispatchEvent(new Event('change', { bubbles: true }));

        expect(editorElement.innerHTML).toBe('<p style="line-height: 1.8;"><span style="font-family: \'Courier New\', monospace; font-size: 24px;">Style this text.</span></p>');
        expect(document.querySelector(font).value).toBe("'Courier New', monospace");
        expect(document.querySelector(size).value).toBe('24px');
        expect(document.querySelector(line).value).toBe('1.8');
        expect(selection.rangeCount).toBe(1);
        expect(selection.getRangeAt(0).toString()).toBe('Style this text.');
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: document.getElementById('editor'),
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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

    test('shows highlighted HTML after the editor and marks the toolbar button active', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p class="note">Text</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const adapter = createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });
        const button = document.querySelector('button[title="HTML"]');

        expect(button).not.toBeNull();
        expect(document.querySelector('[data-code-view]')).toBeNull();

        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const source = document.querySelector('[data-code-view]');

        expect(source.hidden).toBe(false);
        expect(source.getAttribute('data-mode')).toBe('after');
        expect(source.getValue()).toBe(adapter.editor.getHtml());
        expect(source.querySelector('.wysiwyg-code-tag')).not.toBeNull();
        expect(source.querySelector('textarea').hidden).toBe(true);
        expect(button.getAttribute('aria-pressed')).toBe('true');

        editorElement.innerHTML = '<p>Updated</p>';
        editorElement.dispatchEvent(new Event('input', { bubbles: true }));

        expect(source.getValue()).toBe('<p>Updated</p>');

        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(source.hidden).toBe(true);
        expect(button.getAttribute('aria-pressed')).toBe('false');
    });

    test('supports editable live HTML and code-only mode', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Before</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            },
            codeView: {
                    mode: 'only',
                    editable: true,
                    live: true
            }
        });

        const button = document.querySelector('button[title="HTML"]');

        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const source = document.querySelector('[data-code-view]');
        const input = source.querySelector('textarea');

        expect(editorElement.hidden).toBe(true);
        expect(source.hidden).toBe(false);
        expect(input.hidden).toBe(false);

        input.value = '<p>Live</p>';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(editorElement.innerHTML).toBe('<p>Live</p>');

        input.value = '<div><p>Live</p></div>';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        source.querySelector('.wysiwyg-code-view-beautify').click();

        expect(input.value).toBe('<div>\n  <p>Live</p>\n</div>');
        expect(editorElement.innerHTML).toBe('<div>\n  <p>Live</p>\n</div>');

        source.querySelector('.wysiwyg-code-view-minify').click();

        expect(input.value).toBe('<div><p>Live</p></div>');
        expect(editorElement.innerHTML).toBe('<div><p>Live</p></div>');

        input.value = '<p';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(input.value).toBe('<p');
    });

    test('can disable optional source and find-and-replace controls', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Text</p></div>'
        ].join('');

        createEditorAdapter({
            elements: {
                editor: document.getElementById('editor'),
                toolbar: document.getElementById('toolbar')
            },
            codeView: false,
            findReplace: false
        });

        expect(document.querySelector('button[title="HTML"]')).toBeNull();
        expect(document.querySelector('button[title="Find and Replace"]')).toBeNull();
    });

    test('opens find and replace without a backdrop', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Find this text.</p></div>'
        ].join('');

        createEditorAdapter({
            elements: {
                editor: document.getElementById('editor'),
                toolbar: document.getElementById('toolbar')
            },
            findReplace: true
        });

        document.querySelector('button[title="Find and Replace"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const modal = document.querySelector('wysiwyg-modal');

        expect(modal.noBackdrop).toBe(true);
        expect(modal.shadowRoot.querySelector('.shade').hidden).toBe(true);
    });

    test('keeps the found match visibly selected while the modal stays open', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Find this text.</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            },
            findReplace: true
        });

        document.querySelector('button[title="Find and Replace"]').click();

        const modal = document.querySelector('wysiwyg-modal');
        const findInput = modal.querySelector('[data-field="find"]');
        const form = modal.querySelector('form');

        findInput.value = 'this';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        expect(document.activeElement).toBe(editorElement);
        expect(window.getSelection().toString()).toBe('this');
        expect(modal.open).toBe(true);
    });

    test('refreshes live source after beautifying and editing the visual content', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><div><p>Before</p></div></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            },
            codeView: {
                mode: 'after',
                editable: true,
                live: true
            }
        });

        document.querySelector('button[title="HTML"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const source = document.querySelector('[data-code-view]');

        source.querySelector('button').click();
        expect(source.getValue()).toBe('<div>\n  <p>Before</p>\n</div>');

        editorElement.focus();
        editorElement.innerHTML = '<div><p>After</p></div>';
        editorElement.dispatchEvent(new Event('input', { bubbles: true }));

        expect(source.getValue()).toBe('<div><p>After</p></div>');
    });

    test('defers editable non-live HTML until the source view closes', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Before</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            },
            codeView: {
                editable: true,
                live: false
            }
        });

        const button = document.querySelector('button[title="HTML"]');

        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const input = document.querySelector('[data-code-view] textarea');

        input.value = '<p>After</p>';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(editorElement.innerHTML).toBe('<p>Before</p>');

        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(editorElement.innerHTML).toBe('<p>After</p>');
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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

    test('uses one Media browser flow to filter, insert, and replace image, video, and audio', async () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Image</p><p>Video</p><p>Audio</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const paragraphs = editorElement.querySelectorAll('p');
        const range = document.createRange();
        const selection = window.getSelection();

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            },
            media: {
                fileBrowser: {
                    supportedExtensions: {
                        image: '.png',
                        video: '.mp4',
                        audio: '.mp3'
                    },
                    items: [
                        { type: 'file', name: 'first.png', path: '/first.png', url: '/media/first.png', extension: '.png' },
                        { type: 'file', name: 'second.png', path: '/second.png', url: '/media/second.png', extension: '.png' },
                        { type: 'file', name: 'first.mp4', path: '/first.mp4', url: '/media/first.mp4', extension: '.mp4' },
                        { type: 'file', name: 'second.mp4', path: '/second.mp4', url: '/media/second.mp4', extension: '.mp4' },
                        { type: 'file', name: 'first.mp3', path: '/first.mp3', url: '/media/first.mp3', extension: '.mp3' },
                        { type: 'file', name: 'second.mp3', path: '/second.mp3', url: '/media/second.mp3', extension: '.mp3' }
                    ]
                }
            }
        });

        function setCaret(paragraph) {
            range.selectNodeContents(paragraph);
            range.collapse(false);
            editorElement.focus();
            selection.removeAllRanges();
            selection.addRange(range);
            document.dispatchEvent(new Event('selectionchange'));
        }

        function openBrowser() {
            document.querySelector('button[title="Media"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return document.querySelector('wysiwyg-modal').querySelector('wysiwyg-file-browser');
        }

        async function selectFile(browser, index) {
            browser.shadowRoot.querySelector('[data-index="' + index + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await Promise.resolve();
            await Promise.resolve();
        }

        function selectFilter(browser, type) {
            browser.parentNode.querySelector('.media-filters [data-filter="' + type + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }

        setCaret(paragraphs[0]);
        let browser = openBrowser();
        expect(browser.activeFilter).toBe('');
        expect(browser.activeFilters).toEqual([]);
        expect(browser.supportedExtensions).toEqual(['.png', '.mp4', '.mp3']);
        expect(browser.shadowRoot.querySelectorAll('[data-index]')).toHaveLength(6);
        expect(browser.shadowRoot.querySelectorAll('[data-filter]')).toHaveLength(0);
        expect(browser.parentNode.querySelectorAll('.media-filters [data-filter]')).toHaveLength(3);
        selectFilter(browser, 'image');
        expect(browser.activeFilter).toBe('image');
        expect(browser.activeFilters).toEqual(['image']);
        expect(browser.shadowRoot.querySelectorAll('[data-index]')).toHaveLength(2);
        selectFilter(browser, 'video');
        expect(browser.activeFilters).toEqual(['image', 'video']);
        expect(browser.shadowRoot.querySelectorAll('[data-index]')).toHaveLength(4);
        selectFilter(browser, 'video');
        expect(browser.activeFilters).toEqual(['image']);
        await selectFile(browser, 0);
        const image = editorElement.querySelector('img');

        expect(document.querySelector('wysiwyg-resize-overlay').target).toBe(image);

        image.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        browser = openBrowser();
        expect(browser.activeFilter).toBe('image');
        await selectFile(browser, 1);
        expect(editorElement.querySelector('img')).toBe(image);
        expect(image.getAttribute('src')).toBe('/media/second.png');
        expect(image.getAttribute('data-file-path')).toBe('/second.png');

        image.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        browser = openBrowser();
        selectFilter(browser, 'image');
        selectFilter(browser, 'video');
        expect(browser.activeFilters).toEqual(['video']);
        await selectFile(browser, 0);
        expect(editorElement.querySelector('img')).toBeNull();
        expect(paragraphs[0].querySelector('video').getAttribute('src')).toBe('/media/first.mp4');

        setCaret(paragraphs[1]);
        browser = openBrowser();
        selectFilter(browser, 'video');
        expect(browser.activeFilter).toBe('video');
        expect(browser.activeFilters).toEqual(['video']);
        expect(browser.shadowRoot.querySelectorAll('[data-index]')).toHaveLength(2);
        await selectFile(browser, 0);
        const video = paragraphs[1].querySelector('video');

        expect(document.querySelector('wysiwyg-resize-overlay').target).toBe(video);

        video.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        browser = openBrowser();
        expect(browser.activeFilter).toBe('video');
        await selectFile(browser, 1);
        expect(paragraphs[1].querySelector('video')).toBe(video);
        expect(video.getAttribute('src')).toBe('/media/second.mp4');
        expect(video.getAttribute('data-file-path')).toBe('/second.mp4');

        setCaret(paragraphs[2]);
        browser = openBrowser();
        selectFilter(browser, 'audio');
        expect(browser.activeFilter).toBe('audio');
        expect(browser.activeFilters).toEqual(['audio']);
        expect(browser.shadowRoot.querySelectorAll('[data-index]')).toHaveLength(2);
        await selectFile(browser, 0);
        const audio = editorElement.querySelector('audio');

        expect(document.querySelector('wysiwyg-resize-overlay').target).toBe(audio);

        audio.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        browser = openBrowser();
        expect(browser.activeFilter).toBe('audio');
        await selectFile(browser, 1);
        expect(editorElement.querySelector('audio')).toBe(audio);
        expect(audio.getAttribute('src')).toBe('/media/second.mp3');
        expect(audio.getAttribute('data-file-path')).toBe('/second.mp3');
    });

    test('Media command inserts at the editor end when no cursor is available', async () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Start</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            },
            media: {
                fileBrowser: {
                    supportedExtensions: { image: '.png', video: '.mp4', audio: '.mp3' },
                    items: [{ type: 'file', name: 'sound.mp3', path: '/sound.mp3', url: '/media/sound.mp3', extension: '.mp3', mime: 'audio/mpeg' }]
                }
            }
        });

        window.getSelection().removeAllRanges();
        document.querySelector('button[title="Media"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const modal = document.querySelector('wysiwyg-modal');
        const browser = modal.querySelector('wysiwyg-file-browser');

        browser.shadowRoot.querySelector('[data-index="0"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();

        expect(editorElement.querySelector('audio').getAttribute('src')).toBe('/media/sound.mp3');
        expect(editorElement.querySelector('audio').getAttribute('data-file-path')).toBe('/sound.mp3');
    });

    test('uses the shared modal for code block insertion', async () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>Start</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const paragraph = editorElement.querySelector('p');
        const range = document.createRange();
        const selection = window.getSelection();

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });

        range.selectNodeContents(paragraph);
        range.collapse(false);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        document.querySelector('button[title="Code block"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const modal = document.querySelector('wysiwyg-modal');

        modal.querySelector('[data-field="code"]').value = 'const answer = 42;';
        modal.querySelector('[data-field="language"]').value = 'js';
        modal.querySelector('[data-action="apply"]').click();
        await Promise.resolve();
        await Promise.resolve();

        expect(editorElement.querySelector('pre code').textContent).toBe('const answer = 42;');
    });

    test('highlights code block context and prefills the code block modal', async () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="status"></div>',
            '<div id="editor" contenteditable="true"><p>Start</p><pre><code class="language-js">const answer = 42;</code></pre></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const codeText = editorElement.querySelector('code').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar'),
                status: document.getElementById('status')
            }
        });

        range.setStart(codeText, 6);
        range.collapse(true);
        editorElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));

        const button = document.querySelector('button[title="Code block"]');

        expect(button.getAttribute('aria-pressed')).toBe('true');
        expect(document.getElementById('status').textContent).toBe('Root › Code block › Code');

        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const modal = document.querySelector('wysiwyg-modal');
        expect(modal.querySelector('[data-field="code"]').value).toBe('const answer = 42;');
        expect(modal.querySelector('[data-field="language"]').value).toBe('js');

        modal.querySelector('[data-field="code"]').value = 'const answer = 43;';
        modal.querySelector('[data-action="apply"]').click();
        await Promise.resolve();
        await Promise.resolve();

        expect(editorElement.querySelectorAll('pre')).toHaveLength(1);
        expect(editorElement.querySelector('pre code').textContent).toBe('const answer = 43;');
    });

    test('Media command uses a file browser modal', async () => {
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            },
            media: {
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

        document.querySelector('button[title="Media"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

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

    test('Media command opens the selected image folder and replaces that image', async () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>',
            '<img src="/media/assets/old.png" alt="Old" width="120" data-file-path="/assets/old.png">',
            '</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const image = editorElement.querySelector('img');

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            },
            media: {
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

        expect(document.querySelector('button[title="Media"]').getAttribute('aria-pressed')).toBe('true');
        expect(document.querySelector('button[title="Update image URL"]')).toBeNull();

        document.querySelector('button[title="Media"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
        expect(fullSize.querySelector('[data-selected-icon]')).toBeNull();

        fullSize.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(image.style.width).toBe('100%');
        expect(fullSize.getAttribute('aria-pressed')).toBe('true');
        expect(fullSize.querySelector('[data-selected-icon] use').getAttribute('href')).toBe('#wysiwyg-icon-check');

        objectFit.value = 'cover';
        objectFit.dispatchEvent(new Event('change', { bubbles: true }));
        expect(image.style.objectFit).toBe('cover');

        layout.value = 'float-right';
        layout.dispatchEvent(new Event('change', { bubbles: true }));
        expect(image.style.display).toBe('');
        expect(image.style.float).toBe('right');
        expect(layout.value).toBe('float-right');

        fullSize.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(fullSize.getAttribute('aria-pressed')).toBe('false');
        expect(fullSize.querySelector('[data-selected-icon]')).toBeNull();
    });

    test('media tools popup exposes playback controls for video and audio', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>',
            '<video src="movie.mp4" controls poster="old.jpg" preload="metadata" style="object-fit: contain"></video>',
            '<audio src="sound.mp3" controls></audio>',
            '</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const video = editorElement.querySelector('video');
        const audio = editorElement.querySelector('audio');

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });

        editorElement.focus();
        video.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        let popup = document.querySelector('wysiwyg-popup[data-mode="video"]');

        expect(popup).not.toBeNull();

        const mediaPanel = popup.querySelector('[data-media-panel="image,video"]');
        const imagePanel = popup.querySelector('[data-media-panel="image"]');
        const sharedPanel = popup.querySelector('[data-media-panel="video,audio"]');
        const audioPanel = popup.querySelector('[data-media-panel="audio"]');
        const fullSize = popup.querySelector('[data-action="fullSize"]');
        const fullWidth = popup.querySelector('[data-action="fullWidth"]');
        const objectFit = popup.querySelector('[data-style="objectFit"]');
        const controls = popup.querySelector('[data-media-attribute="controls"]');
        const autoplay = popup.querySelector('[data-media-attribute="autoplay"]');
        const poster = popup.querySelector('[data-media-attribute="poster"]');
        const preload = popup.querySelector('[data-media-attribute="preload"]');
        const playsInline = popup.querySelector('[data-media-attribute="playsinline"]');

        expect(mediaPanel.hidden).toBe(false);
        expect(imagePanel.hidden).toBe(true);
        expect(sharedPanel.hidden).toBe(false);
        expect(audioPanel.hidden).toBe(true);
        expect(fullSize.getAttribute('aria-pressed')).toBe('false');
        expect(fullWidth.closest('[data-media-panel="audio"]').hidden).toBe(true);
        expect(objectFit.value).toBe('contain');
        expect(controls.checked).toBe(true);
        expect(autoplay.checked).toBe(false);
        expect(poster.value).toBe('old.jpg');
        expect(preload.value).toBe('metadata');
        expect(playsInline.checked).toBe(false);

        fullSize.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(video.style.width).toBe('100%');
        expect(fullSize.getAttribute('aria-pressed')).toBe('true');

        objectFit.value = 'cover';
        objectFit.dispatchEvent(new Event('change', { bubbles: true }));
        expect(video.style.objectFit).toBe('cover');

        autoplay.checked = true;
        autoplay.dispatchEvent(new Event('change', { bubbles: true }));
        expect(video.hasAttribute('autoplay')).toBe(true);

        controls.checked = false;
        controls.dispatchEvent(new Event('change', { bubbles: true }));
        expect(video.hasAttribute('controls')).toBe(false);

        poster.value = 'new.jpg';
        poster.dispatchEvent(new Event('change', { bubbles: true }));
        expect(video.getAttribute('poster')).toBe('new.jpg');

        preload.value = 'none';
        preload.dispatchEvent(new Event('change', { bubbles: true }));
        expect(video.getAttribute('preload')).toBe('none');

        playsInline.checked = true;
        playsInline.dispatchEvent(new Event('change', { bubbles: true }));
        expect(video.hasAttribute('playsinline')).toBe(true);

        audio.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        popup = document.querySelector('wysiwyg-popup[data-mode="audio"]');

        expect(popup).not.toBeNull();
        expect(popup.querySelector('[data-media-panel="image,video"]').hidden).toBe(true);
        expect(popup.querySelector('[data-media-panel="audio"]').hidden).toBe(false);
        expect(popup.querySelector('[data-action="fullSize"]').getAttribute('aria-pressed')).toBe('false');
        expect(popup.querySelector('[data-action="fullWidth"]').getAttribute('aria-pressed')).toBe('false');
        expect(popup.querySelector('[data-media-panel="video,audio"]').hidden).toBe(false);
        expect(popup.querySelector('[data-media-panel="video"]').hidden).toBe(true);
        expect(popup.querySelector('[data-media-attribute="controls"]').checked).toBe(true);
        expect(popup.querySelector('[data-media-attribute="poster"]')).not.toBeNull();
        expect(popup.querySelector('[data-media-attribute="poster"]').closest('[data-media-panel="video"]').hidden).toBe(true);

        fullWidth.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(audio.style.width).toBe('100%');
        expect(fullWidth.getAttribute('aria-pressed')).toBe('true');
    });

    test('Delete and Backspace remove selected video and audio media', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><p>',
            '<video src="movie.mp4"></video><audio src="sound.mp3"></audio>',
            '</p></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const video = editorElement.querySelector('video');
        const audio = editorElement.querySelector('audio');

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });

        editorElement.focus();
        video.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
        editorElement.dispatchEvent(deleteEvent);

        expect(deleteEvent.defaultPrevented).toBe(true);
        expect(editorElement.querySelector('video')).toBeNull();

        audio.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
        editorElement.dispatchEvent(backspaceEvent);

        expect(backspaceEvent.defaultPrevented).toBe(true);
        expect(editorElement.querySelector('audio')).toBeNull();
    });

    test('Delete and Backspace remove a selected table', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<table><tbody><tr><td>First</td></tr></tbody></table>',
            '<table><tbody><tr><td>Second</td></tr></tbody></table>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const tables = Array.from(editorElement.querySelectorAll('table'));

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });

        editorElement.focus();
        tables[0].querySelector('td').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        const selector = document.querySelector('wysiwyg-table-selection');
        const tableButton = selector.shadowRoot.querySelector('[data-mode="table"]');

        tableButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true, composed: true });
        tableButton.dispatchEvent(deleteEvent);

        expect(deleteEvent.defaultPrevented).toBe(true);
        expect(editorElement.querySelectorAll('table')).toHaveLength(1);

        tables[1].querySelector('td').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        document.querySelector('wysiwyg-table-selection').shadowRoot.querySelector('[data-mode="table"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
        document.dispatchEvent(backspaceEvent);

        expect(backspaceEvent.defaultPrevented).toBe(true);
        expect(editorElement.querySelector('table')).toBeNull();
    });

    test('Delete only removes a table when the whole table is selected', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true"><table><tbody><tr><td>A</td><td>B</td></tr></tbody></table></div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const cell = editorElement.querySelector('td');

        createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });

        editorElement.focus();
        cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
        editorElement.dispatchEvent(deleteEvent);

        expect(deleteEvent.defaultPrevented).toBe(false);
        expect(editorElement.querySelector('table')).not.toBeNull();

        document.querySelector('wysiwyg-table-selection').shadowRoot.querySelector('[data-mode="table"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const tableDeleteEvent = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
        editorElement.dispatchEvent(tableDeleteEvent);

        expect(tableDeleteEvent.defaultPrevented).toBe(true);
        expect(editorElement.querySelector('table')).toBeNull();
    });

    test('Media command falls back to the file browser root for an invalid image path', async () => {
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            },
            media: {
                fileBrowser: { endpoint: '/files', path: '/' }
            }
        });

        editorElement.focus();
        image.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        document.querySelector('button[title="Media"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });

        editorElement.focus();
        image.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        expect(document.querySelector('wysiwyg-popup[data-mode="image"]')).not.toBeNull();
        expect(document.querySelector('wysiwyg-resize-overlay').target).toBe(image);
        expect(document.querySelector('wysiwyg-table-selection')).toBeNull();
    });

    test('selects, resizes, and moves video and audio media', () => {
        document.body.innerHTML = [
            '<div id="toolbar"></div>',
            '<div id="editor" contenteditable="true">',
            '<p id="source"><video src="video.mp4"></video><audio src="audio.mp3"></audio></p>',
            '<p id="destination">Drop here</p>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const video = editorElement.querySelector('video');
        const audio = editorElement.querySelector('audio');
        const destination = document.getElementById('destination');
        const dropRange = document.createRange();
        const selection = window.getSelection();
        const deselectRange = document.createRange();

        video.getBoundingClientRect = function () {
            return { left: 20, top: 30, right: 120, bottom: 90, width: 100, height: 60 };
        };
        audio.getBoundingClientRect = function () {
            return { left: 20, top: 110, right: 140, bottom: 150, width: 120, height: 40 };
        };
        dropRange.setStart(destination.firstChild, 5);
        dropRange.collapse(true);
        Object.defineProperty(document, 'caretRangeFromPoint', {
            configurable: true,
            value: function () {
                return dropRange;
            }
        });

        const adapter = createEditorAdapter({
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });

        editorElement.focus();
        video.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        let overlay = document.querySelector('wysiwyg-resize-overlay');

        expect(overlay.open).toBe(true);
        expect(overlay.target).toBe(video);
        expect(document.querySelector('button[title="Media"]').getAttribute('aria-pressed')).toBe('true');

        overlay.shadowRoot.querySelector('[data-resize="se"]').dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            clientX: 120,
            clientY: 90
        }));
        document.dispatchEvent(new MouseEvent('pointermove', {
            bubbles: true,
            clientX: 160,
            clientY: 120
        }));
        document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

        expect(video.style.width).toBe('140px');
        expect(video.style.height).toBe('90px');

        audio.dispatchEvent(new MouseEvent('mousedown', { bubbles: false }));
        overlay = document.querySelector('wysiwyg-resize-overlay');

        expect(overlay.target).toBe(audio);
        expect(document.querySelector('button[title="Media"]').getAttribute('aria-pressed')).toBe('true');

        audio.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        overlay = document.querySelector('wysiwyg-resize-overlay');

        expect(overlay.target).toBe(audio);
        expect(document.querySelector('button[title="Media"]').getAttribute('aria-pressed')).toBe('true');

        deselectRange.selectNodeContents(destination);
        deselectRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(deselectRange);
        document.dispatchEvent(new Event('selectionchange'));
        editorElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        expect(overlay.open).toBe(false);

        audio.dispatchEvent(new Event('focus'));
        expect(overlay.target).toBe(audio);
        expect(document.querySelector('button[title="Media"]').getAttribute('aria-pressed')).toBe('true');

        overlay.shadowRoot.querySelector('.move').dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            clientX: 80,
            clientY: 105
        }));
        document.dispatchEvent(new MouseEvent('pointermove', {
            bubbles: true,
            clientX: 160,
            clientY: 180
        }));
        document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 160, clientY: 180 }));

        expect(audio.parentNode).toBe(destination);
        expect(adapter.editor.getActiveFormats().audio.src).toBe('audio.mp3');

        delete document.caretRangeFromPoint;
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
        });

        editorElement.focus();
        image.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        const overlay = document.querySelector('wysiwyg-resize-overlay');

        overlay.shadowRoot.querySelector('.move').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 160, clientY: 80 }));
        document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 160, clientY: 80 }));
        destination.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 160, clientY: 80 }));

        expect(image.parentNode).toBe(destination);
        expect(document.querySelector('button[title="Media"]').getAttribute('aria-pressed')).toBe('true');
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
        expect(document.querySelector('button[title="Media"]').getAttribute('aria-pressed')).toBe('true');
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
            elements: {
                editor: editorElement,
                toolbar: document.getElementById('toolbar')
            }
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
