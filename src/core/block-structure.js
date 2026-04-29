(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.WysiwygBlockStructure = factory();
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

    function getClosestTag(node, tagNames, rootNode) {
        var boundary = rootNode || document.body;
        var names = Array.isArray(tagNames) ? tagNames : [tagNames];
        var normalized = names.map(function (name) {
            return name.toLowerCase();
        });

        while (node && node !== boundary) {
            if (node.nodeType === Node.ELEMENT_NODE && normalized.indexOf(node.tagName.toLowerCase()) !== -1) {
                return node;
            }
            node = node.parentNode;
        }

        return null;
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

    function ensureCurrentBlock(rootNode, range) {
        var block = getClosestTag(getElement(range.startContainer), ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'], rootNode);
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

    function unwrapNode(node) {
        var parent = node.parentNode;
        var reference = node;

        while (node.firstChild) {
            parent.insertBefore(node.firstChild, reference);
        }

        parent.removeChild(node);
        parent.normalize();
    }

    function setBlock(type, selection, options) {
        var currentSelection = getCurrentSelection(selection);
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

        block = replaceTag(block, targetTag);
        placeCaretInside(block);

        return block;
    }

    function toggleBlock(type, selection, options) {
        var currentSelection = getCurrentSelection(selection);
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

        wrapper = getClosestTag(block, 'blockquote', config.root);

        if (wrapper) {
            unwrapNode(wrapper);
            placeCaretInside(block);
            return true;
        }

        wrapper = document.createElement('blockquote');
        block.parentNode.insertBefore(wrapper, block);
        wrapper.appendChild(block);
        placeCaretInside(block);

        return true;
    }

    function toggleList(listType, selection, options) {
        var currentSelection = getCurrentSelection(selection);
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
        currentList = getClosestTag(block, ['ul', 'ol'], config.root);

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
            replaceTag(currentList, listType);
            return true;
        }

        list = document.createElement(listType);
        item = document.createElement('li');

        while (block.firstChild) {
            item.appendChild(block.firstChild);
        }

        list.appendChild(item);
        block.parentNode.replaceChild(list, block);
        placeCaretInside(item);

        return true;
    }

    function insertBreak(selection) {
        var currentSelection = getCurrentSelection(selection);
        var range;
        var br;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);
        range.deleteContents();
        br = document.createElement('br');
        range.insertNode(br);
        placeCaretInside(br.parentNode);

        return br;
    }

    function insertRule(selection, options) {
        var currentSelection = getCurrentSelection(selection);
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

        placeCaretInside(paragraph);

        return hr;
    }

    function setBlockStyle(propertyName, value, selection, options) {
        var currentSelection = getCurrentSelection(selection);
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