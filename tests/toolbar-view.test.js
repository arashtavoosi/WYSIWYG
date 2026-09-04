/**
 * @jest-environment jsdom
 */

const createToolbarView = require('../src/ui/toolbar/view');

describe('toolbar status breadcrumb', () => {
    test('renders structural context and active inline formats in one value', () => {
        document.body.innerHTML = '<div id="toolbar"></div><div id="status"></div>';

        const toolbar = document.getElementById('toolbar');
        const status = document.getElementById('status');
        const view = createToolbarView(toolbar, status, { items: {} });

        view.sync({
            block: 'p',
            bold: true,
            italic: true,
            link: { href: 'https://example.com' },
            list: null,
            table: { cellIndex: 2, rowIndex: 1 }
        });

        expect(status.textContent).toBe('Table › Row 2 › Cell 3 › Paragraph › (https://example.com) Link · bold, italic');
        expect(status.title).toBe('https://example.com');
    });

    test('shows the editor label when there is no active context', () => {
        document.body.innerHTML = '<div id="toolbar"></div><div id="status"></div>';

        const view = createToolbarView(
            document.getElementById('toolbar'),
            document.getElementById('status'),
            { items: {} }
        );

        view.sync({});

        expect(document.getElementById('status').textContent).toBe('Editor');
    });

    test('includes quote context for a paragraph inside a blockquote', () => {
        document.body.innerHTML = '<div id="toolbar"></div><div id="status"></div>';

        const view = createToolbarView(
            document.getElementById('toolbar'),
            document.getElementById('status'),
            { items: {} }
        );

        view.sync({ block: 'p', quote: true });

        expect(document.getElementById('status').textContent).toBe('Quote › Paragraph');
    });

    test('includes code block context', () => {
        document.body.innerHTML = '<div id="toolbar"></div><div id="status"></div>';

        const view = createToolbarView(
            document.getElementById('toolbar'),
            document.getElementById('status'),
            { items: {} }
        );

        view.sync({ block: 'pre', codeBlock: { code: 'const answer = 42;', language: 'js' } });

        expect(document.getElementById('status').textContent).toBe('Code block');
    });

    test('places an outer div before table context', () => {
        document.body.innerHTML = '<div id="toolbar"></div><div id="status"></div>';

        const view = createToolbarView(
            document.getElementById('toolbar'),
            document.getElementById('status'),
            { items: {} }
        );

        view.sync({
            block: 'div',
            table: { cellIndex: 1, rowIndex: 2 }
        });

        expect(document.getElementById('status').textContent).toBe('div › Table › Row 3 › Cell 2');
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
