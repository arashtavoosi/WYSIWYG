(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.WysiwygLinking = factory();
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

    function placeCaretAfter(node) {
        var range = document.createRange();
        var selection = window.getSelection();

        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function unwrapNode(node) {
        var parent = node.parentNode;
        var reference = node;

        while (node.firstChild) {
            parent.insertBefore(node.firstChild, reference);
        }

        parent.removeChild(node);
        parent.normalize();
    }

    function getActiveAnchor(selection, rootNode) {
        var currentSelection = getCurrentSelection(selection);
        var range;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return null;
        }

        range = currentSelection.getRangeAt(0);

        return getClosestTag(getElement(range.startContainer), 'a', rootNode) ||
            getClosestTag(getElement(range.commonAncestorContainer), 'a', rootNode);
    }

    function upsertLink(attributes, selection, options) {
        var currentSelection = getCurrentSelection(selection);
        var config = options || {};
        var range;
        var anchor;
        var fragment;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return false;
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
            placeCaretAfter(anchor);
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
        placeCaretAfter(anchor);

        return anchor;
    }

    function removeLink(selection, options) {
        var currentSelection = getCurrentSelection(selection);
        var config = options || {};
        var anchor = getActiveAnchor(currentSelection, config.root);

        if (!anchor) {
            return false;
        }

        unwrapNode(anchor);
        currentSelection.removeAllRanges();

        return true;
    }

    return {
        removeLink: removeLink,
        upsertLink: upsertLink
    };
}));