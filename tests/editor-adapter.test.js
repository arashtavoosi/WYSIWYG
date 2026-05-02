/**
 * @jest-environment jsdom
 */

const createEditorAdapter = require('../src/ui/editor-adapter');

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
});
