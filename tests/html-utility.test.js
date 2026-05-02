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
});
