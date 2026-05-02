(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./html-utility'));
    } else {
        root.WysiwygBlockStructure = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    function ensureCurrentBlock(rootNode, range) {
        var block = html.getClosestTag(html.getElement(range.startContainer), ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'], rootNode);
        var paragraph;

        if (block && block !== rootNode) {
            return block;
        }

        paragraph = document.createElement('p');

        if (rootNode.childNodes.length === 0) {
            paragraph.appendChild(document.createElement('br'));
        } else {
            while (rootNode.firstChild) {
                paragraph.appendChild(rootNode.firstChild);
            }
        }

        rootNode.appendChild(paragraph);

        return paragraph;
    }

    function setBlock(type, selection, options) {
        var currentSelection = html.getCurrentSelection(selection);
        var config = options || {};
        var range;
        var block;
        var targetTag;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);
        block = ensureCurrentBlock(config.root, range);

        if (type === 'heading') {
            targetTag = 'h' + String((config.level || 1));
        } else if (type === 'paragraph') {
            targetTag = 'p';
        } else {
            targetTag = type;
        }

        block = html.replaceTag(block, targetTag);
        html.placeCaretInside(block);

        return block;
    }

    function toggleBlock(type, selection, options) {
        var currentSelection = html.getCurrentSelection(selection);
        var config = options || {};
        var range;
        var block;
        var wrapper;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);
        block = ensureCurrentBlock(config.root, range);

        if (type !== 'blockquote') {
            return false;
        }

        wrapper = html.getClosestTag(block, 'blockquote', config.root);

        if (wrapper) {
            html.unwrapNode(wrapper);
            html.placeCaretInside(block);
            return true;
        }

        wrapper = document.createElement('blockquote');
        block.parentNode.insertBefore(wrapper, block);
        wrapper.appendChild(block);
        html.placeCaretInside(block);

        return true;
    }

    function toggleList(listType, selection, options) {
        var currentSelection = html.getCurrentSelection(selection);
        var config = options || {};
        var range;
        var block;
        var currentList;
        var list;
        var item;
        var parent;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);
        block = ensureCurrentBlock(config.root, range);
        currentList = html.getClosestTag(block, ['ul', 'ol'], config.root);

        if (currentList && currentList.tagName.toLowerCase() === listType.toLowerCase()) {
            parent = currentList.parentNode;

            Array.from(currentList.children).forEach(function (child) {
                var paragraph = document.createElement('p');

                while (child.firstChild) {
                    paragraph.appendChild(child.firstChild);
                }

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

        while (block.firstChild) {
            item.appendChild(block.firstChild);
        }

        list.appendChild(item);
        block.parentNode.replaceChild(list, block);
        html.placeCaretInside(item);

        return true;
    }

    function insertBreak(selection) {
        var currentSelection = html.getCurrentSelection(selection);
        var range;
        var br;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);
        range.deleteContents();
        br = document.createElement('br');
        range.insertNode(br);
        html.placeCaretInside(br.parentNode);

        return br;
    }

    function insertRule(selection, options) {
        var currentSelection = html.getCurrentSelection(selection);
        var config = options || {};
        var range;
        var block;
        var hr;
        var paragraph;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);
        block = ensureCurrentBlock(config.root, range);
        hr = document.createElement('hr');
        paragraph = document.createElement('p');
        paragraph.appendChild(document.createElement('br'));

        if (block.nextSibling) {
            block.parentNode.insertBefore(hr, block.nextSibling);
            block.parentNode.insertBefore(paragraph, hr.nextSibling);
        } else {
            block.parentNode.appendChild(hr);
            block.parentNode.appendChild(paragraph);
        }

        html.placeCaretInside(paragraph);

        return hr;
    }

    function setBlockStyle(propertyName, value, selection, options) {
        var currentSelection = html.getCurrentSelection(selection);
        var config = options || {};
        var range;
        var block;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);
        block = ensureCurrentBlock(config.root, range);
        block.style[propertyName] = value;

        return block;
    }

    return {
        insertBreak: insertBreak,
        insertRule: insertRule,
        setBlockStyle: setBlockStyle,
        setBlock: setBlock,
        toggleBlock: toggleBlock,
        toggleList: toggleList
    };
}));
