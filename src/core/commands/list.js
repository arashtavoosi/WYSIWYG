(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../html-utility'));
    } else {
        root.WysiwygListCommands = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    var BLOCK_TAGS = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'];

    function moveChildren(source, target) {
        while (source.firstChild) {
            target.appendChild(source.firstChild);
        }
    }

    function withSelectionRange(selection, callback) {
        var currentSelection = html.getCurrentSelection(selection);

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return false;
        }

        return callback(currentSelection.getRangeAt(0), currentSelection);
    }

    function ensureCurrentBlock(rootNode, range) {
        var block = html.getClosestTag(html.getElement(range.startContainer), BLOCK_TAGS, rootNode);
        var cell = html.getClosestTag(html.getElement(range.startContainer), ['td', 'th'], rootNode);
        var container = cell || rootNode;
        var paragraph;

        if (block && block !== rootNode) {
            return block;
        }

        paragraph = document.createElement('p');

        if (container.childNodes.length === 0) {
            paragraph.appendChild(document.createElement('br'));
        } else {
            moveChildren(container, paragraph);
        }

        container.appendChild(paragraph);
        range.selectNodeContents(paragraph);
        range.collapse(true);

        return paragraph;
    }

    function toggleList(listType, selection, options) {
        var config = options || {};

        return withSelectionRange(selection, function (range) {
            var block = ensureCurrentBlock(config.root, range);
            var currentList = html.getClosestTag(block, ['ul', 'ol'], config.root);
            var list;
            var item;
            var parent;

            if (currentList && currentList.tagName.toLowerCase() === listType.toLowerCase()) {
                parent = currentList.parentNode;

                Array.from(currentList.children).forEach(function (child) {
                    var paragraph = document.createElement('p');

                    moveChildren(child, paragraph);
                    parent.insertBefore(paragraph, currentList);
                });

                parent.removeChild(currentList);
                parent.normalize();
                return true;
            }

            if (currentList) {
                html.replaceTag(currentList, listType);
                return true;
            }

            list = document.createElement(listType);
            item = document.createElement('li');
            moveChildren(block, item);
            list.appendChild(item);
            block.parentNode.replaceChild(list, block);
            html.placeCaretInside(item);

            return true;
        });
    }

    return {
        toggleList: toggleList
    };
}));
