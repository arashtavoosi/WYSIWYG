/**
 * @jest-environment jsdom
 */

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

        modal.show();
        expect(modal.open).toBe(true);

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
        expect(overlay.shadowRoot.querySelector('style').textContent).toContain('.move{left:0;top:-26px');
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
});
