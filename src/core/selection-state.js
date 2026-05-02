(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./html-utility'));
    } else {
        root.WysiwygSelectionState = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    function getInlineStyleValue(element, propertyName) {
        if (!element) {
            return '';
        }

        return element.style[propertyName] || window.getComputedStyle(element)[propertyName] || '';
    }

    function getActiveFormats(selection, rootNode) {
        var currentSelection = html.getCurrentSelection(selection);
        var range;
        var startElement;
        var blockElement;
        var listElement;
        var linkElement;
        var imageElement;
        var quoteElement;
        var tableElement;
        var cellElement;
        var state;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return {
                block: null,
                bold: false,
                collapsed: true,
                color: '',
                fontFamily: '',
                headingLevel: null,
                image: false,
                italic: false,
                lineHeight: '',
                link: null,
                list: null,
                quote: false,
                table: false,
                underline: false
            };
        }

        range = currentSelection.getRangeAt(0);
        startElement = html.getElement(range.startContainer);
        blockElement = html.getClosestTag(startElement, ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'], rootNode);
        listElement = html.getClosestTag(startElement, ['ul', 'ol'], rootNode);
        linkElement = html.getClosestTag(startElement, 'a', rootNode);
        imageElement = html.getSelectedElement(range, 'img') || html.getClosestTag(startElement, 'img', rootNode);
        quoteElement = html.getClosestTag(startElement, 'blockquote', rootNode);
        cellElement = html.getClosestTag(startElement, ['td', 'th'], rootNode);
        tableElement = html.getSelectedElement(range, 'table') || html.getClosestTag(startElement, 'table', rootNode);

        state = {
            block: blockElement ? blockElement.tagName.toLowerCase() : null,
            bold: !!html.getClosestTag(startElement, ['strong', 'b'], rootNode),
            collapsed: range.collapsed,
            color: getInlineStyleValue(startElement, 'color'),
            fontFamily: getInlineStyleValue(startElement, 'fontFamily'),
            headingLevel: blockElement && /^H[1-6]$/.test(blockElement.tagName) ? Number(blockElement.tagName.charAt(1)) : null,
            image: imageElement ? {
                alt: imageElement.getAttribute('alt') || '',
                height: imageElement.getAttribute('height') || '',
                src: imageElement.getAttribute('src') || '',
                title: imageElement.getAttribute('title') || '',
                width: imageElement.getAttribute('width') || ''
            } : false,
            italic: !!html.getClosestTag(startElement, ['em', 'i'], rootNode),
            lineHeight: getInlineStyleValue(blockElement || startElement, 'lineHeight'),
            link: linkElement ? {
                href: linkElement.getAttribute('href') || '',
                target: linkElement.getAttribute('target') || '',
                title: linkElement.getAttribute('title') || ''
            } : null,
            list: listElement ? listElement.tagName.toLowerCase() : null,
            quote: !!quoteElement,
            table: tableElement ? {
                cellIndex: cellElement ? cellElement.cellIndex : null,
                headerRow: !!tableElement.querySelector('thead'),
                rowIndex: cellElement ? html.getClosestTag(cellElement, 'tr', rootNode).rowIndex : null
            } : false,
            underline: !!html.getClosestTag(startElement, 'u', rootNode)
        };

        return state;
    }

    return {
        getActiveFormats: getActiveFormats
    };
}));
