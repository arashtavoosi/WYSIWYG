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
});
