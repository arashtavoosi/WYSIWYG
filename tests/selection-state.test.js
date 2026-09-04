/**
 * @jest-environment jsdom
 */

const createEditorCore = require('../src/core/editor-core');

describe('selection state', () => {
    test('reports collapsed selection, heading level, and selected image attributes', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><h2>Title</h2><p><img src="a.png" alt="A" data-file-path="/assets/a.png"></p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const headingText = editorElement.querySelector('h2').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(headingText, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        expect(editor.getActiveFormats(selection).collapsed).toBe(true);
        expect(editor.getActiveFormats(selection).headingLevel).toBe(2);

        range.selectNode(editorElement.querySelector('img'));
        selection.removeAllRanges();
        selection.addRange(range);

        expect(editor.getActiveFormats(selection).image).toEqual({
            alt: 'A',
            filePath: '/assets/a.png',
            height: '',
            src: 'a.png',
            title: '',
            width: ''
        });
        expect(editor.getActiveFormats(selection).media).toEqual({
            alt: 'A',
            filePath: '/assets/a.png',
            height: '',
            src: 'a.png',
            title: '',
            type: 'image',
            width: ''
        });
    });

    test('reports selected video and audio media', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p><video src="movie.mp4" controls data-file-path="/movie.mp4"></video><audio src="sound.mp3" controls data-file-path="/sound.mp3"></audio></p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const video = editorElement.querySelector('video');
        const audio = editorElement.querySelector('audio');
        const range = document.createRange();
        const selection = window.getSelection();

        range.selectNode(video);
        selection.removeAllRanges();
        selection.addRange(range);
        expect(editor.getActiveFormats(selection).video.type).toBe('video');
        expect(editor.getActiveFormats(selection).media.src).toBe('movie.mp4');

        range.selectNode(audio);
        selection.removeAllRanges();
        selection.addRange(range);
        expect(editor.getActiveFormats(selection).audio.type).toBe('audio');
        expect(editor.getActiveFormats(selection).media.src).toBe('sound.mp3');
    });

    test('reports code block context and language', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p>Before</p><pre><code class="language-js">const answer = 42;</code></pre><p>After</p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const codeText = editorElement.querySelector('code').firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(codeText, 6);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        expect(editor.getActiveFormats(selection).block).toBe('pre');
        expect(editor.getActiveFormats(selection).codeBlock).toEqual({
            code: 'const answer = 42;',
            language: 'js'
        });
    });

    test('reports table cell context', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>C</td><td>D</td></tr></tbody></table></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const cellText = editorElement.querySelectorAll('td')[1].firstChild;
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(cellText, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        expect(editor.getActiveFormats(selection).table).toEqual({
            cellIndex: 1,
            headerRow: true,
            rowIndex: 1
        });
    });

    test('reads styles from the boundary child when a selection starts on its block', () => {
        document.body.innerHTML = '<div id="editor" contenteditable="true"><p style="line-height: 1.8"><span style="font-family: Helvetica Neue, Arial, sans-serif; font-size: 24px">Styled</span></p></div>';

        const editorElement = document.getElementById('editor');
        const editor = createEditorCore(editorElement);
        const paragraph = editorElement.querySelector('p');
        const range = document.createRange();
        const selection = window.getSelection();

        range.selectNodeContents(paragraph);
        selection.removeAllRanges();
        selection.addRange(range);

        expect(editor.getActiveFormats(selection)).toEqual(expect.objectContaining({
            fontFamily: 'Helvetica Neue, Arial, sans-serif',
            fontSize: '24px',
            lineHeight: '1.8'
        }));
    });
});
