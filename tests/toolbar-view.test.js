/**
 * @jest-environment jsdom
 */

const createToolbarView = require('../src/ui/toolbar/view');

describe('toolbar status breadcrumb', () => {
    test('renders the actual element path with Root and clickable ancestors', () => {
        document.body.innerHTML = '<div id="toolbar"></div><div id="status"></div><div id="root"><blockquote><p><a href="https://example.com"><em><strong>Text</strong></em></a></p></blockquote></div>';
        const root = document.getElementById('root');
        const editor = require('../src/core/editor-core')(root);
        const range = document.createRange();
        range.setStart(root.querySelector('strong').firstChild, 1); range.collapse(true);
        window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
        const status = document.getElementById('status');
        const view = createToolbarView(document.getElementById('toolbar'), status, { items: {}, context: { editor } });
        view.sync(editor.getActiveFormats());
        expect(status.textContent).toBe('Root › Quote › Paragraph › (https://example.com) Link › Italic › Bold');
        expect(status.querySelectorAll('button')).toHaveLength(6);
        expect(status.lastChild.getAttribute('aria-current')).toBe('location');
        view.destroy();
    });

    test('always shows Root without a selection', () => {
        document.body.innerHTML = '<div id="toolbar"></div><div id="status"></div>';
        const view = createToolbarView(document.getElementById('toolbar'), document.getElementById('status'), { items: {} });
        view.sync({});
        expect(document.getElementById('status').textContent).toBe('Root');
        view.destroy();
    });

    test('matches equivalent font-family values and clears unmatched dropdown values', () => {
        document.body.innerHTML = '<div id="toolbar"></div><div id="status"></div>';

        const view = createToolbarView(
            document.getElementById('toolbar'),
            document.getElementById('status'),
            {
                items: {
                    font: {
                        type: 'dropdown',
                        title: 'Font',
                        value: function (state) { return state.fontFamily; },
                        options: [
                            { title: 'Helvetica', value: "'Helvetica Neue', Arial, sans-serif" },
                            { title: 'Courier', value: "'Courier New', monospace" }
                        ]
                    },
                    size: {
                        type: 'dropdown',
                        title: 'Size',
                        value: function (state) { return state.fontSize; },
                        options: [{ title: '16', value: '16px' }]
                    },
                    line: {
                        type: 'dropdown',
                        title: 'Line',
                        value: function (state) { return state.lineHeight; },
                        options: [{ title: '1.6', value: '1.6' }]
                    }
                }
            }
        );

        view.sync({
            fontFamily: 'Helvetica Neue, Arial, sans-serif',
            fontSize: '16.8px',
            lineHeight: '28.56px'
        });

        expect(document.querySelector('select[title="Font"]').value).toBe("'Helvetica Neue', Arial, sans-serif");
        expect(document.querySelector('select[title="Size"]').selectedIndex).toBe(-1);
        expect(document.querySelector('select[title="Line"]').selectedIndex).toBe(-1);
    });
});
