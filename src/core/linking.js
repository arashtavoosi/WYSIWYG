(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./html-utility'));
    } else {
        root.WysiwygLinking = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    function setAnchorAttributes(anchor, attributes) {
        Object.keys(attributes || {}).forEach(function (key) {
            var value = attributes[key];

            if (value === undefined || value === null || value === '') {
                anchor.removeAttribute(key);
                return;
            }

            anchor.setAttribute(key, value);
        });
    }

    function getActiveAnchor(selection, rootNode) {
        var currentSelection = html.getCurrentSelection(selection);
        var range;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return null;
        }

        range = currentSelection.getRangeAt(0);

        return html.getClosestTag(html.getElement(range.startContainer), 'a', rootNode) ||
            html.getClosestTag(html.getElement(range.commonAncestorContainer), 'a', rootNode);
    }

    function upsertLink(attributes, selection, options) {
        var currentSelection = html.getCurrentSelection(selection);
        var config = options || {};
        var range;
        var anchor;
        var fragment;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return false;
        }

        if (config.expandCollapsedToWord) {
            currentSelection = html.expandCollapsedSelectionToWord(currentSelection, config.root);
        }

        range = currentSelection.getRangeAt(0);
        anchor = getActiveAnchor(currentSelection, config.root);

        if (anchor) {
            setAnchorAttributes(anchor, attributes);
            return anchor;
        }

        anchor = document.createElement('a');
        setAnchorAttributes(anchor, attributes);

        if (range.collapsed) {
            anchor.textContent = attributes.text || attributes.href || '';
            range.insertNode(anchor);
            html.moveSelectionAfterNode(anchor, currentSelection);
            return anchor;
        }

        try {
            range.surroundContents(anchor);
        } catch (error) {
            fragment = range.extractContents();
            anchor.appendChild(fragment);
            range.insertNode(anchor);
        }

        currentSelection.removeAllRanges();
        html.moveSelectionAfterNode(anchor, currentSelection);

        return anchor;
    }

    function removeLink(selection, options) {
        var currentSelection = html.getCurrentSelection(selection);
        var config = options || {};
        var anchor = getActiveAnchor(currentSelection, config.root);

        if (!anchor) {
            return false;
        }

        html.unwrapNode(anchor);
        currentSelection.removeAllRanges();

        return true;
    }

    return {
        removeLink: removeLink,
        upsertLink: upsertLink
    };
}));
