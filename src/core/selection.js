(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./html-utility'));
    } else {
        root.WysiwygSelection = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    function createSelection(rootNode) {
        function getCurrent(selection) {
            return html.getCurrentSelection(selection);
        }

        function contains(selection) {
            var currentSelection = getCurrent(selection);
            var range;

            if (!currentSelection || currentSelection.rangeCount === 0 || !rootNode) {
                return false;
            }

            range = currentSelection.getRangeAt(0);
            return rootNode.contains(range.commonAncestorContainer);
        }

        function getBookmark(selection) {
            return html.getSelectionBookmark(getCurrent(selection), rootNode);
        }

        function restoreBookmark(bookmark, selection) {
            return html.restoreSelectionBookmark(bookmark, getCurrent(selection), rootNode);
        }

        function getInsertionSelection(selection) {
            var currentSelection = getCurrent(selection);
            var range;
            var documentRef = rootNode && rootNode.ownerDocument;
            var windowRef = documentRef && documentRef.defaultView;

            if (currentSelection && currentSelection.rangeCount) {
                range = currentSelection.getRangeAt(0);

                if (rootNode && rootNode.contains(range.commonAncestorContainer)) {
                    return currentSelection;
                }
            }

            if (!windowRef || !windowRef.getSelection || !documentRef || !documentRef.createRange) {
                return currentSelection;
            }

            currentSelection = windowRef.getSelection();
            range = documentRef.createRange();
            range.selectNodeContents(rootNode);
            range.collapse(false);
            currentSelection.removeAllRanges();
            currentSelection.addRange(range);
            return currentSelection;
        }

        return {
            contains: contains,
            getBookmark: getBookmark,
            getCurrent: getCurrent,
            getInsertionSelection: getInsertionSelection,
            restoreBookmark: restoreBookmark
        };
    }

    return createSelection;
}));
