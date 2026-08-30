/**
 * @jest-environment jsdom
 */

const createToolbarView = require('../src/ui/toolbar-view');

describe('toolbar status breadcrumb', () => {
    test('renders structural context and active inline formats in one value', () => {
        document.body.innerHTML = '<div id="toolbar"></div><div id="status"></div>';

        const toolbar = document.getElementById('toolbar');
        const status = document.getElementById('status');
        const view = createToolbarView(toolbar, status, { toolbar: {} });

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
            { toolbar: {} }
        );

        view.sync({});

        expect(document.getElementById('status').textContent).toBe('Editor');
    });
});
