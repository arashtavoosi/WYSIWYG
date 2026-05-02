(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.WysiwygHtmlUtility = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function getCurrentSelection(selection) {
        return selection || window.getSelection();
    }

    function getElement(node) {
        return node && node.nodeType === Node.ELEMENT_NODE ? node : node && node.parentElement;
    }

    function getClosestTag(node, tagNames, rootNode) {
        var boundary = rootNode || document.body;
        var names = (Array.isArray(tagNames) ? tagNames : [tagNames]).map(function (name) {
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

    function getSelectedElement(selectionOrRange, tagName) {
        var currentSelection;
        var range = selectionOrRange && typeof selectionOrRange.getRangeAt === 'function' ? null : selectionOrRange;
        var node;

        if (!range) {
            currentSelection = getCurrentSelection(selectionOrRange);

            if (!currentSelection || currentSelection.rangeCount === 0) {
                return null;
            }

            range = currentSelection.getRangeAt(0);
        }

        node = range.commonAncestorContainer;

        if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.ELEMENT_NODE) {
            node = range.startContainer.childNodes[range.startOffset] || node;
        }

        return getClosestTag(getElement(node), tagName);
    }

    function moveSelectionAfterNode(node, selection) {
        var currentSelection = getCurrentSelection(selection);
        var range = document.createRange();

        range.setStartAfter(node);
        range.collapse(true);
        currentSelection.removeAllRanges();
        currentSelection.addRange(range);
    }

    function moveSelectionToNodeStart(node, selection) {
        var currentSelection = getCurrentSelection(selection);
        var range = document.createRange();

        range.selectNodeContents(node);
        range.collapse(true);
        currentSelection.removeAllRanges();
        currentSelection.addRange(range);
    }

    function placeCaretInside(node) {
        var target = node;
        var range = document.createRange();
        var selection = window.getSelection();

        while (target && target.firstChild && target.firstChild.nodeType === Node.ELEMENT_NODE) {
            target = target.firstChild;
        }

        if (target && target.firstChild && target.firstChild.nodeType === Node.TEXT_NODE) {
            range.setStart(target.firstChild, 0);
        } else {
            range.selectNodeContents(target || node);
            range.collapse(true);
        }

        selection.removeAllRanges();
        selection.addRange(range);
    }

    function replaceTag(element, tagName) {
        var replacement;

        if (!element || element.tagName.toLowerCase() === tagName.toLowerCase()) {
            return element;
        }

        replacement = document.createElement(tagName);

        Array.from(element.attributes).forEach(function (attribute) {
            replacement.setAttribute(attribute.name, attribute.value);
        });

        while (element.firstChild) {
            replacement.appendChild(element.firstChild);
        }

        element.parentNode.replaceChild(replacement, element);
        return replacement;
    }

    function unwrapNode(node) {
        var parent = node.parentNode;

        while (node.firstChild) {
            parent.insertBefore(node.firstChild, node);
        }

        parent.removeChild(node);
        parent.normalize();
    }

    function rangeSelectsElement(range, element) {
        var elementRange = document.createRange();
        var matches;

        elementRange.selectNodeContents(element);
        matches = range.compareBoundaryPoints(Range.START_TO_START, elementRange) === 0 &&
            range.compareBoundaryPoints(Range.END_TO_END, elementRange) === 0;

        if (!matches) {
            elementRange.selectNode(element);
            matches = range.compareBoundaryPoints(Range.START_TO_START, elementRange) === 0 &&
                range.compareBoundaryPoints(Range.END_TO_END, elementRange) === 0;
        }

        elementRange.detach();
        return matches;
    }

    return {
        getClosestTag: getClosestTag,
        getCurrentSelection: getCurrentSelection,
        getElement: getElement,
        getSelectedElement: getSelectedElement,
        moveSelectionAfterNode: moveSelectionAfterNode,
        moveSelectionToNodeStart: moveSelectionToNodeStart,
        placeCaretInside: placeCaretInside,
        rangeSelectsElement: rangeSelectsElement,
        replaceTag: replaceTag,
        unwrapNode: unwrapNode
    };
}));
