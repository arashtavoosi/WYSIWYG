/**
 * @jest-environment jsdom
 */

const createEditorAdapter = require('../src/ui/editor-adapter');

describe('editor adapter', () => {
    test('restores the editor selection before applying color from the toolbar', () => {
        document.body.innerHTML = [
            '<div id="toolbar">',
            '<input id="colorControl" type="color" data-style="color" value="#000000">',
            '</div>',
            '<div id="editor" contenteditable="true">',
            '<p>Select part of this paragraph to create a <a href="https://example.com">link</a>, convert it into a heading, or turn it into a list.</p>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const colorControl = document.getElementById('colorControl');
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
            '<div id="toolbar">',
            '<input id="colorControl" type="color" data-style="color" value="#000000">',
            '</div>',
            '<div id="editor" contenteditable="true">',
            '<p>Color only this word.</p>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const toolbarElement = document.getElementById('toolbar');
        const colorControl = document.getElementById('colorControl');
        const textNode = editorElement.querySelector('p').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();
        const selectedText = 'this';
        const startOffset = textNode.textContent.indexOf(selectedText);

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: toolbarElement
        });

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
            '<div id="toolbar">',
            '<input id="colorControl" type="color" data-style="color" value="#000000">',
            '</div>',
            '<div id="editor" contenteditable="true">',
            '<p>Color only this word.</p>',
            '</div>'
        ].join('');

        const editorElement = document.getElementById('editor');
        const toolbarElement = document.getElementById('toolbar');
        const colorControl = document.getElementById('colorControl');
        const textNode = editorElement.querySelector('p').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();
        const selectedText = 'this';
        const startOffset = textNode.textContent.indexOf(selectedText);

        createEditorAdapter({
            editorElement: editorElement,
            toolbarElement: toolbarElement
        });

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
            '<div id="toolbar">',
            '<select data-style="fontFamily">',
            '<option value="Georgia">Georgia</option>',
            '<option value="Arial">Arial</option>',
            '</select>',
            '</div>',
            '<div id="editor" contenteditable="true"><p>Text</p></div>'
        ].join('');

        createEditorAdapter({
            editorElement: document.getElementById('editor'),
            toolbarElement: document.getElementById('toolbar')
        });

        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

        document.querySelector('select').dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
    });
});
