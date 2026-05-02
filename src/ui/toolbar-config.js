(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.WysiwygToolbarConfig = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    return {
        headingLevel: 2,
        imageAttributes: ['src', 'alt', 'title', 'width', 'height'],
        indentStep: 24,
        prompts: {
            image: { label: 'Image URL', fallback: 'https://' },
            link: { label: 'Link URL', fallback: 'https://' },
            tableCols: { label: 'Table columns', fallback: '2' },
            tableRows: { label: 'Table rows', fallback: '2' }
        }
    };
}));
