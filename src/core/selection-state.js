(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.WysiwygSelectionState = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function getCurrentSelection(selection) {
        return selection || window.getSelection();
    }

    function getElement(node) {
        if (!node) {
            return null;
        }

        return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    }

    function getClosestTag(node, tagName, rootNode) {
        var boundary = rootNode || document.body;

        while (node && node !== boundary) {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === tagName.toLowerCase()) {
                return node;
            }
            node = node.parentNode;
        }

        return null;
    }

    function getClosestAnyTag(node, tagNames, rootNode) {
        var boundary = rootNode || document.body;
        var names = tagNames.map(function (name) {
            return name.toLowerCase();
        });

        while (node && node !== boundary) {
            if (node.nodeType === Node.ELEMENT_NODE && names.indexOf(node.tagName.toLowerCase()) !== -1) {
                return node;
            }
            node = node.parentNode;
        }

        return null;
    }

    function getInlineStyleValue(element, propertyName) {
        if (!element) {
            return '';
        }

        return element.style[propertyName] || window.getComputedStyle(element)[propertyName] || '';
    }

    function getActiveFormats(selection, rootNode) {
        var currentSelection = getCurrentSelection(selection);
        var range;
        var startElement;
        var blockElement;
        var listElement;
        var linkElement;
        var imageElement;
        var quoteElement;
        var tableElement;
        var state;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return {
                block: null,
                bold: false,
                color: '',
                fontFamily: '',
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
        startElement = getElement(range.startContainer);
        blockElement = getClosestAnyTag(startElement, ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'], rootNode);
        listElement = getClosestAnyTag(startElement, ['ul', 'ol'], rootNode);
        linkElement = getClosestTag(startElement, 'a', rootNode);
        imageElement = getClosestTag(startElement, 'img', rootNode);
        quoteElement = getClosestTag(startElement, 'blockquote', rootNode);
        tableElement = getClosestTag(startElement, 'table', rootNode);

        state = {
            block: blockElement ? blockElement.tagName.toLowerCase() : null,
            bold: !!getClosestAnyTag(startElement, ['strong', 'b'], rootNode),
            color: getInlineStyleValue(startElement, 'color'),
            fontFamily: getInlineStyleValue(startElement, 'fontFamily'),
            image: !!imageElement,
            italic: !!getClosestAnyTag(startElement, ['em', 'i'], rootNode),
            lineHeight: getInlineStyleValue(blockElement || startElement, 'lineHeight'),
            link: linkElement ? {
                href: linkElement.getAttribute('href') || '',
                target: linkElement.getAttribute('target') || '',
                title: linkElement.getAttribute('title') || ''
            } : null,
            list: listElement ? listElement.tagName.toLowerCase() : null,
            quote: !!quoteElement,
            table: !!tableElement,
            underline: !!getClosestTag(startElement, 'u', rootNode)
        };

        return state;
    }

    return {
        getActiveFormats: getActiveFormats
    };
}));