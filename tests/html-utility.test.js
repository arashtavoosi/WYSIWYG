/**
 * @jest-environment jsdom
 */

const html = require('../src/core/html-utility');

describe('html utility', () => {
    test('is callable and parses selectors, nodes, arrays, and utility instances', () => {
        document.body.innerHTML = '<div><p class="item">A</p><p class="item">B</p></div>';

        const items = html('.item');
        const first = html(document.querySelector('.item'));
        const combined = html().add(items).add(first);
        const text = [];

        combined.each(function () {
            text.push(this.textContent);
        });

        expect(items.elements).toHaveLength(2);
        expect(first.elements).toHaveLength(1);
        expect(combined.elements).toHaveLength(2);
        expect(text).toEqual(['A', 'B']);
    });

    test('renders template content or slot fallback into a region', () => {
        document.body.innerHTML = '<template id="tpl"><strong>Details</strong></template><div id="region"></div>';

        const region = document.getElementById('region');

        html.renderTemplateRegion(region, html.getTemplateFromAttribute({
            getAttribute: function () {
                return '#tpl';
            }
        }, 'content'), 'content');

        expect(region.innerHTML).toBe('<strong>Details</strong>');

        html.renderTemplateRegion(region, null, 'footer');

        expect(region.querySelector('slot').name).toBe('footer');
    });

    test('defines boolean attribute properties and resolves anchor rects', () => {
        const element = document.createElement('div');
        const proto = Object.getPrototypeOf(element);

        html.defineBooleanAttributeProperty(proto, 'enabledForTest', 'enabled-for-test');

        element.enabledForTest = true;
        expect(element.hasAttribute('enabled-for-test')).toBe(true);

        element.enabledForTest = false;
        expect(element.hasAttribute('enabled-for-test')).toBe(false);

        expect(html.clampNumber(12, 0, 10)).toBe(10);
        expect(html.getAnchorRect({ left: 2, top: 3 })).toEqual({ left: 2, top: 3 });

        delete proto.enabledForTest;
    });

    test('adds and removes event listeners', () => {
        const button = document.createElement('button');
        const listener = jest.fn();

        html.on(button, 'click', listener);
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        html.off(button, 'click', listener);
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(listener).toHaveBeenCalledTimes(1);
    });
});
