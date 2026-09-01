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
        var mediaElement;
        var mediaState;
        var mediaType;
        var imageElement;
        var quoteElement;
        var tableElement;
        var cellElement;
        var codeBlockElement;
        var codeElement;
        var codeLanguage;
        var codeBlockState;
        var state;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return {
                block: null,
                bold: false,
                canRedo: false,
                canUndo: false,
                collapsed: true,
                codeBlock: false,
                color: '',
                fontFamily: '',
                fontSize: '',
                highlightColor: '',
                headingLevel: null,
                image: false,
                italic: false,
                lineHeight: '',
                link: null,
                list: null,
                media: false,
                quote: false,
                strikethrough: false,
                subscript: false,
                superscript: false,
                textAlign: '',
                table: false,
                underline: false,
                video: false,
                audio: false
            };
        }

        range = currentSelection.getRangeAt(0);
        startElement = html.getElement(range.startContainer);
        codeBlockElement = html.getSelectedElement(range, 'pre') || html.getClosestTag(startElement, 'pre', rootNode);
        if (codeBlockElement && rootNode && !rootNode.contains(codeBlockElement)) {
            codeBlockElement = null;
        }
        codeElement = codeBlockElement && codeBlockElement.querySelector('code');
        codeLanguage = codeElement && (codeElement.className || '').match(/(?:^|\s)language-([^\s]+)/);
        codeBlockState = codeBlockElement ? {
            code: codeElement ? codeElement.textContent : codeBlockElement.textContent,
            language: codeLanguage ? codeLanguage[1] : ''
        } : false;
        blockElement = codeBlockElement || html.getClosestTag(startElement, ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'], rootNode);
        listElement = html.getClosestTag(startElement, ['ul', 'ol'], rootNode);
        linkElement = html.getClosestTag(startElement, 'a', rootNode);
        mediaElement = html.getSelectedElement(range, ['img', 'video', 'audio']) || html.getClosestTag(startElement, ['img', 'video', 'audio'], rootNode);
        mediaType = mediaElement ? (mediaElement.tagName.toLowerCase() === 'img' ? 'image' : mediaElement.tagName.toLowerCase()) : null;
        mediaState = mediaElement ? {
            alt: mediaElement.getAttribute('alt') || '',
            filePath: mediaElement.getAttribute('data-file-path') || '',
            height: mediaElement.getAttribute('height') || '',
            src: mediaElement.getAttribute('src') || '',
            title: mediaElement.getAttribute('title') || '',
            type: mediaType,
            width: mediaElement.getAttribute('width') || ''
        } : false;
        imageElement = mediaType === 'image' ? mediaElement : null;
        quoteElement = html.getClosestTag(startElement, 'blockquote', rootNode);
        cellElement = html.getClosestTag(startElement, ['td', 'th'], rootNode);
        tableElement = html.getSelectedElement(range, 'table') || html.getClosestTag(startElement, 'table', rootNode);

        state = {
            block: blockElement ? blockElement.tagName.toLowerCase() : null,
            bold: !!html.getClosestTag(startElement, ['strong', 'b'], rootNode),
            canRedo: false,
            canUndo: false,
            collapsed: range.collapsed,
            codeBlock: codeBlockState,
            color: getInlineStyleValue(startElement, 'color'),
            fontFamily: getInlineStyleValue(startElement, 'fontFamily'),
            fontSize: getInlineStyleValue(startElement, 'fontSize'),
            highlightColor: getInlineStyleValue(startElement, 'backgroundColor'),
            headingLevel: blockElement && /^H[1-6]$/.test(blockElement.tagName) ? Number(blockElement.tagName.charAt(1)) : null,
            image: imageElement ? {
                alt: imageElement.getAttribute('alt') || '',
                filePath: imageElement.getAttribute('data-file-path') || '',
                height: imageElement.getAttribute('height') || '',
                src: imageElement.getAttribute('src') || '',
                title: imageElement.getAttribute('title') || '',
                width: imageElement.getAttribute('width') || ''
            } : false,
            italic: !!html.getClosestTag(startElement, ['em', 'i'], rootNode),
            lineHeight: getInlineStyleValue(blockElement || cellElement || startElement, 'lineHeight'),
            link: linkElement ? {
                href: linkElement.getAttribute('href') || '',
                target: linkElement.getAttribute('target') || '',
                title: linkElement.getAttribute('title') || ''
            } : null,
            list: listElement ? listElement.tagName.toLowerCase() : null,
            media: mediaState,
            quote: !!quoteElement,
            strikethrough: !!html.getClosestTag(startElement, ['s', 'strike'], rootNode),
            subscript: !!html.getClosestTag(startElement, 'sub', rootNode),
            superscript: !!html.getClosestTag(startElement, 'sup', rootNode),
            textAlign: getInlineStyleValue(blockElement || cellElement || startElement, 'textAlign'),
            table: tableElement ? {
                cellIndex: cellElement ? cellElement.cellIndex : null,
                headerRow: !!tableElement.querySelector('thead'),
                rowIndex: cellElement ? html.getClosestTag(cellElement, 'tr', rootNode).rowIndex : null
            } : false,
            underline: !!html.getClosestTag(startElement, 'u', rootNode),
            video: mediaType === 'video' ? mediaState : false,
            audio: mediaType === 'audio' ? mediaState : false
        };

        return state;
    }

    return {
        getActiveFormats: getActiveFormats
    };
}));
