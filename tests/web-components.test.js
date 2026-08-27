/**
 * @jest-environment jsdom
 */

const html = require('../src/core/html-utility');
require('../src/ui/web-components');

describe('web components', () => {
    test('modal renders template regions and supports close behavior', () => {
        document.body.innerHTML = [
            '<template id="modalHeader"><h2>Selection</h2></template>',
            '<template id="modalContent"><p>Bold: true</p></template>'
        ].join('');

        const modal = document.createElement('wysiwyg-modal');

        modal.setAttribute('header-template', '#modalHeader');
        modal.setAttribute('content-template', '#modalContent');
        modal.setAttribute('footer-template', '<button>Apply</button>');
        modal.showCloseButton = true;
        modal.clickOutsideToClose = true;
        document.body.appendChild(modal);

        expect(modal.shadowRoot.querySelector('[part="header"] h2').textContent).toBe('Selection');
        expect(modal.shadowRoot.querySelector('[part="content"] p').textContent).toBe('Bold: true');
        expect(modal.shadowRoot.querySelector('[part="footer"] button').textContent).toBe('Apply');
        expect(modal.shadowRoot.querySelector('.close').hidden).toBe(false);
        expect(modal.shadowRoot.querySelector('.close svg path')).toBeTruthy();

        modal.show();
        expect(modal.open).toBe(true);
        expect(modal.shadowRoot.querySelector('style').textContent).toContain('z-index:2000');
        expect(modal.shadowRoot.querySelector('style').textContent).toContain('min-width:min(420px,calc(100vw - 32px))');

        modal.shadowRoot.querySelector('.shade').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(modal.open).toBe(false);
    });

    test('modal exposes slots when templates are not provided', () => {
        document.body.innerHTML = '';

        const modal = document.createElement('wysiwyg-modal');

        modal.innerHTML = [
            '<strong slot="header">Image</strong>',
            '<p>src: image.png</p>',
            '<button slot="footer">Done</button>'
        ].join('');
        document.body.appendChild(modal);

        expect(modal.shadowRoot.querySelector('slot[name="header"]')).toBeTruthy();
        expect(modal.shadowRoot.querySelector('slot:not([name])')).toBeTruthy();
        expect(modal.shadowRoot.querySelector('slot[name="footer"]')).toBeTruthy();
    });

    test('popup defaults to auto and can prefer a fixed position', () => {
        document.body.innerHTML = '';
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 });

        const popup = document.createElement('wysiwyg-popup');
        const anchor = {
            bottom: 120,
            height: 20,
            left: 100,
            right: 140,
            top: 100,
            width: 40
        };

        document.body.appendChild(popup);
        popup.shadowRoot.querySelector('.panel').getBoundingClientRect = function () {
            return { width: 100, height: 40 };
        };

        expect(popup.preferredPosition).toBe('auto');

        popup.preferredPosition = 'right';
        popup.showFor(anchor);

        expect(popup.open).toBe(true);
        expect(popup.getAttribute('data-position')).toBe('right');
        expect(popup.style.left).toBe('148px');
        expect(popup.style.top).toBe('90px');
    });

    test('popup auto placement chooses available space', () => {
        document.body.innerHTML = '';
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 300 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 240 });

        const popup = document.createElement('wysiwyg-popup');
        const anchor = {
            bottom: 230,
            height: 20,
            left: 120,
            right: 160,
            top: 210,
            width: 40
        };

        document.body.appendChild(popup);
        popup.shadowRoot.querySelector('.panel').getBoundingClientRect = function () {
            return { width: 80, height: 60 };
        };

        popup.showFor(anchor);

        expect(popup.getAttribute('data-position')).toBe('top');
    });

    test('popup supports aligned preferred positions', () => {
        document.body.innerHTML = '';
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 });

        const popup = document.createElement('wysiwyg-popup');
        const anchor = {
            bottom: 120,
            height: 20,
            left: 100,
            right: 180,
            top: 100,
            width: 80
        };

        document.body.appendChild(popup);
        popup.shadowRoot.querySelector('.panel').getBoundingClientRect = function () {
            return { width: 120, height: 50 };
        };

        popup.preferredPosition = 'bottom-start';
        popup.showFor(anchor);

        expect(popup.getAttribute('data-position')).toBe('bottom-start');
        expect(popup.style.left).toBe('100px');
        expect(popup.style.top).toBe('128px');

        popup.preferredPosition = 'right-end';
        popup.updatePosition();

        expect(popup.getAttribute('data-position')).toBe('right-end');
        expect(popup.style.left).toBe('188px');
        expect(popup.style.top).toBe('70px');
    });

    test('resize overlay shows eight handles around a target', () => {
        document.body.innerHTML = '<img id="image" src="x.png">';

        const image = document.getElementById('image');
        const overlay = document.createElement('wysiwyg-resize-overlay');

        image.getBoundingClientRect = function () {
            return { left: 20, top: 30, width: 120, height: 80 };
        };

        document.body.appendChild(overlay);
        overlay.showFor(image);

        expect(overlay.open).toBe(true);
        expect(overlay.target).toBe(image);
        expect(overlay.style.left).toBe('20px');
        expect(overlay.style.top).toBe('30px');
        expect(overlay.style.width).toBe('120px');
        expect(overlay.style.height).toBe('80px');
        expect(overlay.shadowRoot.querySelectorAll('[data-resize]')).toHaveLength(8);
        expect(overlay.shadowRoot.querySelector('.move')).toBeTruthy();
        expect(overlay.shadowRoot.querySelector('.move svg')).toBeTruthy();
        expect(overlay.shadowRoot.querySelector('style').textContent).toContain('.move{left:0;top:-25px');
    });

    test('resize overlay resizes the target from a drag handle', () => {
        document.body.innerHTML = '<table id="table"><tbody><tr><td>A</td></tr></tbody></table>';

        const table = document.getElementById('table');
        const overlay = document.createElement('wysiwyg-resize-overlay');
        let width = 100;
        let height = 60;

        table.getBoundingClientRect = function () {
            return { left: 10, top: 20, width: width, height: height };
        };

        document.body.appendChild(overlay);
        overlay.showFor(table);
        overlay.shadowRoot.querySelector('[data-resize="se"]').dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            clientX: 110,
            clientY: 80
        }));
        width = 140;
        height = 85;
        document.dispatchEvent(new MouseEvent('pointermove', {
            bubbles: true,
            clientX: 150,
            clientY: 105
        }));
        document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

        expect(table.style.width).toBe('140px');
        expect(table.style.height).toBe('85px');
    });

    test('resize overlay can disable moving while retaining resize handles', () => {
        document.body.innerHTML = '<table><tbody><tr><td id="cell">Cell</td></tr></tbody></table>';

        const cell = document.getElementById('cell');
        const overlay = document.createElement('wysiwyg-resize-overlay');

        cell.getBoundingClientRect = function () {
            return { left: 10, top: 20, width: 100, height: 40 };
        };
        document.body.appendChild(overlay);
        overlay.showFor(cell, { moveable: false });

        expect(overlay.hasAttribute('move-disabled')).toBe(true);
        expect(overlay.hasAttribute('resize-disabled')).toBe(false);
    });

    test('resize overlay can frame multiple elements and restrict its resize axis', () => {
        document.body.innerHTML = '<table><tbody><tr><td id="first">A</td></tr><tr><td id="second">B</td></tr></tbody></table>';

        const first = document.getElementById('first');
        const second = document.getElementById('second');
        const overlay = document.createElement('wysiwyg-resize-overlay');

        first.getBoundingClientRect = function () {
            return { left: 10, top: 20, right: 70, bottom: 50, width: 60, height: 30 };
        };
        second.getBoundingClientRect = function () {
            return { left: 10, top: 50, right: 70, bottom: 90, width: 60, height: 40 };
        };
        document.body.appendChild(overlay);
        overlay.showFor(first, { frame: [first, second], moveable: false, resizeAxis: 'x' });

        expect(overlay.open).toBe(true);
        expect(overlay.getAttribute('resize-axis')).toBe('x');
        expect(overlay.style.width).toBe('60px');
        expect(overlay.style.height).toBe('70px');

        overlay.shadowRoot.querySelector('[data-resize="e"]').dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            clientX: 70,
            clientY: 35
        }));
        document.dispatchEvent(new MouseEvent('pointermove', {
            bubbles: true,
            clientX: 90,
            clientY: 55
        }));
        document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

        expect(first.style.width).toBe('80px');
        expect(first.style.height).toBe('');
    });

    test('table selection overlay positions mode selectors and emits selection mode', () => {
        document.body.innerHTML = '<table><tbody><tr><td>A</td><td>B</td></tr></tbody></table>';

        const table = document.querySelector('table');
        const row = document.querySelector('tr');
        const cell = document.querySelector('td');
        const overlay = document.createElement('wysiwyg-table-selection');
        const listener = jest.fn();

        table.getBoundingClientRect = function () {
            return { left: 40, top: 60, right: 240, bottom: 140, width: 200, height: 80 };
        };
        row.getBoundingClientRect = function () {
            return { left: 40, top: 60, right: 240, bottom: 100, width: 200, height: 40 };
        };
        cell.getBoundingClientRect = function () {
            return { left: 40, top: 60, right: 140, bottom: 100, width: 100, height: 40 };
        };
        document.body.appendChild(overlay);
        overlay.addEventListener('table-select', listener);
        overlay.showFor({ table: table, cell: cell, cells: [cell], mode: 'cell' });

        expect(overlay.open).toBe(true);
        expect(overlay.shadowRoot.querySelectorAll('[data-mode]')).toHaveLength(3);
        expect(overlay.shadowRoot.querySelector('.frame').style.width).toBe('100px');
        expect(overlay.shadowRoot.querySelector('.table').style.left).toBe('18px');

        overlay.shadowRoot.querySelector('[data-mode="row"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: { mode: 'row' } }));
    });

    test('resize overlay move handle moves the target to a drop range', () => {
        document.body.innerHTML = '<p id="source">Before <img id="image" src="x.png"> after</p><p id="target">Drop here</p>';

        const image = document.getElementById('image');
        const target = document.getElementById('target');
        const overlay = document.createElement('wysiwyg-resize-overlay');
        const dropRange = document.createRange();

        image.getBoundingClientRect = function () {
            return { left: 20, top: 30, width: 120, height: 80 };
        };
        dropRange.setStart(target.firstChild, 5);
        dropRange.collapse(true);
        Object.defineProperty(document, 'caretRangeFromPoint', {
            configurable: true,
            value: function () {
                return dropRange;
            }
        });

        document.body.appendChild(overlay);
        overlay.showFor(image);
        overlay.shadowRoot.querySelector('.move').dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            clientX: 80,
            clientY: 20
        }));
        document.dispatchEvent(new MouseEvent('pointermove', {
            bubbles: true,
            clientX: 95,
            clientY: 32
        }));

        expect(image.parentNode).toBe(target);
        expect(image.style.pointerEvents).toBe('none');

        document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

        expect(image.parentNode).toBe(target);
        expect(target.childNodes[0].textContent).toBe('Drop ');
        expect(target.childNodes[1]).toBe(image);
        expect(target.childNodes[2].textContent).toBe('here');
        expect(image.style.position).toBe('');
        expect(image.style.left).toBe('');
        expect(image.style.top).toBe('');
        expect(image.style.pointerEvents).toBe('');
        expect(window.getSelection().getRangeAt(0).commonAncestorContainer).toBe(target);
        expect(window.getSelection().getRangeAt(0).toString()).toBe('');
        expect(html.getSelectedElement(window.getSelection(), 'img')).toBe(image);

        delete document.caretRangeFromPoint;
    });

    test('resize overlay keeps repeated image moves inside table cells', () => {
        document.body.innerHTML = [
            '<div id="editor"><table><tbody>',
            '<tr><td id="source"><img id="image" src="x.png"><br></td><td id="second"><br></td></tr>',
            '<tr><td id="third"><br></td><td><br></td></tr>',
            '</tbody></table></div>'
        ].join('');

        const editor = document.getElementById('editor');
        const image = document.getElementById('image');
        const second = document.getElementById('second');
        const third = document.getElementById('third');
        const tbody = editor.querySelector('tbody');
        const overlay = document.createElement('wysiwyg-resize-overlay');
        const secondRange = document.createRange();
        const invalidRange = document.createRange();
        const thirdRange = document.createRange();
        const ranges = [];

        image.getBoundingClientRect = function () {
            return { left: 20, top: 30, right: 80, bottom: 70, width: 60, height: 40 };
        };
        secondRange.selectNodeContents(second);
        secondRange.collapse(true);
        invalidRange.setStart(tbody, 1);
        invalidRange.collapse(true);
        thirdRange.selectNodeContents(third);
        thirdRange.collapse(true);
        ranges.push(secondRange, invalidRange, thirdRange);
        Object.defineProperty(document, 'caretRangeFromPoint', {
            configurable: true,
            value: function () {
                return ranges.shift();
            }
        });

        overlay.boundary = editor;
        document.body.appendChild(overlay);
        overlay.showFor(image);
        overlay.shadowRoot.querySelector('.move').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

        document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 100, clientY: 40 }));
        expect(image.parentNode).toBe(second);
        expect(html.getSelectedElement(window.getSelection(), 'img')).toBe(image);

        document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 100, clientY: 80 }));
        expect(image.parentNode).toBe(second);

        document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 40, clientY: 80 }));
        document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

        expect(image.parentNode).toBe(third);
        expect(html.getSelectedElement(window.getSelection(), 'img')).toBe(image);
        expect(editor.querySelectorAll('table')).toHaveLength(1);
        expect(editor.querySelectorAll('tr')).toHaveLength(2);
        expect(editor.querySelectorAll('td')).toHaveLength(4);
        expect(tbody.children).toHaveLength(2);

        delete document.caretRangeFromPoint;
    });

    test('resize overlay move ignores ranges outside its boundary', () => {
        document.body.innerHTML = [
            '<div id="editor"><p id="source">Before <img id="image" src="x.png"> after</p></div>',
            '<p id="outside">Outside drop</p>'
        ].join('');

        const editor = document.getElementById('editor');
        const source = document.getElementById('source');
        const image = document.getElementById('image');
        const outside = document.getElementById('outside');
        const overlay = document.createElement('wysiwyg-resize-overlay');
        const outsideRange = document.createRange();

        image.getBoundingClientRect = function () {
            return { left: 20, top: 30, width: 120, height: 80 };
        };
        outsideRange.setStart(outside.firstChild, 7);
        outsideRange.collapse(true);
        Object.defineProperty(document, 'caretRangeFromPoint', {
            configurable: true,
            value: function () {
                return outsideRange;
            }
        });

        overlay.boundary = editor;
        document.body.appendChild(overlay);
        overlay.showFor(image);
        overlay.shadowRoot.querySelector('.move').dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            clientX: 80,
            clientY: 20
        }));
        document.dispatchEvent(new MouseEvent('pointermove', {
            bubbles: true,
            clientX: 95,
            clientY: 32
        }));
        document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

        expect(image.parentNode).toBe(source);
        expect(outside.contains(image)).toBe(false);

        delete document.caretRangeFromPoint;
    });

    test('file browser renders breadcrumbs, filters extensions, and switches view mode', () => {
        document.body.innerHTML = '';

        const browser = document.createElement('wysiwyg-file-browser');

        browser.supportedExtensions = '.jpg,png';
        document.body.appendChild(browser);
        browser.setData({
            path: '/assets/photos',
            items: [
                { type: 'directory', name: 'Nested', path: '/assets/photos/nested' },
                { type: 'file', name: 'hero.jpg', path: '/assets/photos/hero.jpg', extension: '.jpg' },
                { type: 'file', name: 'notes.txt', path: '/assets/photos/notes.txt', extension: '.txt' }
            ]
        });

        expect(Array.from(browser.shadowRoot.querySelectorAll('[data-crumb]')).map(function (button) {
            return button.textContent;
        })).toEqual(['Root', 'assets', 'photos']);
        expect(browser.shadowRoot.querySelector('[data-crumb="/assets/photos"]').getAttribute('aria-current')).toBe('page');
        expect(browser.shadowRoot.querySelector('style').textContent).toContain('.crumbs button{border:0;background:transparent;color:#2563eb');
        expect(browser.shadowRoot.querySelector('style').textContent).toContain('.item{display:grid;grid-template-columns:1fr auto;');
        expect(Array.from(browser.shadowRoot.querySelectorAll('[data-index] .name')).map(function (node) {
            return node.textContent;
        }).join(' ')).toContain('Nested');
        expect(Array.from(browser.shadowRoot.querySelectorAll('[data-index] .name')).map(function (node) {
            return node.textContent;
        }).join(' ')).toContain('hero.jpg');

        browser.shadowRoot.querySelector('[data-mode="thumbnail"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(browser.viewMode).toBe('thumbnail');
        expect(browser.shadowRoot.querySelector('[data-mode="thumbnail"]').getAttribute('aria-pressed')).toBe('true');
        expect(browser.shadowRoot.querySelector('[data-mode="list"]').textContent).toBe('');
        expect(browser.shadowRoot.querySelectorAll('[data-mode] svg')).toHaveLength(2);
    });

    test('file browser emits selection and navigate events', () => {
        document.body.innerHTML = '';

        const browser = document.createElement('wysiwyg-file-browser');
        const select = jest.fn();
        const navigate = jest.fn();

        document.body.appendChild(browser);
        browser.setData({
            path: '/assets',
            items: [
                { type: 'directory', name: 'Images', path: '/assets/images' },
                { type: 'file', name: 'hero.png', path: '/assets/hero.png', extension: '.png' }
            ]
        });
        browser.addEventListener('file-select', select);
        browser.addEventListener('navigate', navigate);

        browser.shadowRoot.querySelector('[data-index="1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(select).toHaveBeenCalledWith(expect.objectContaining({
            detail: { file: expect.objectContaining({ name: 'hero.png' }) }
        }));

        browser.shadowRoot.querySelector('[data-index="0"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({
            detail: { path: '/assets/images' }
        }));
    });
});
