(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.WysiwygSelectionFormatting = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function getCurrentSelection(selection) {
        return selection || window.getSelection();
    }

    function createWrapperElement(wrapper) {
        var wrapperElement;

        if (typeof wrapper === 'string') {
            var temp = document.createElement('div');
            temp.innerHTML = wrapper.trim();
            wrapperElement = temp.firstChild;
        } else if (wrapper instanceof Node) {
            wrapperElement = wrapper.cloneNode(true);
        } else {
            throw new Error('Invalid wrapper provided');
        }

        return wrapperElement;
    }

    function getFormattingAncestor(node, tagName, rootNode) {
        var boundary = rootNode || document.body;

        while (node && node !== boundary) {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === tagName.toLowerCase()) {
                return node;
            }
            node = node.parentNode;
        }

        return null;
    }

    function isSelectionWithinTag(range, tagName, rootNode) {
        return !!(
            getFormattingAncestor(range.startContainer, tagName, rootNode) &&
            getFormattingAncestor(range.endContainer, tagName, rootNode)
        );
    }

    function getSelectedNodes(range) {
        var selectedNodes = [];
        var node = range.startContainer;
        var endNode = range.endContainer;

        if (node === endNode) {
            selectedNodes.push(node);
            return selectedNodes;
        }

        while (node && node !== endNode) {
            selectedNodes.push(node);
            node = node.nextSibling;
        }

        selectedNodes.push(endNode);

        return selectedNodes;
    }

    function wrapSelection(wrapper, selection) {
        var currentSelection = getCurrentSelection(selection);

        if (currentSelection.rangeCount === 0) {
            return false;
        }

        var range = currentSelection.getRangeAt(0);
        var wrapperElement = createWrapperElement(wrapper);
        var newRange = range.cloneRange();

        try {
            newRange.surroundContents(wrapperElement);
        } catch (error) {
            var fragment = newRange.extractContents();
            var newWrapper = wrapperElement.cloneNode(true);

            newWrapper.appendChild(fragment);
            newRange.insertNode(newWrapper);
            newWrapper.parentNode.normalize();
        }

        currentSelection.removeAllRanges();

        return true;
    }

    function unwrapSelection(tagName, selection, options) {
        var currentSelection = getCurrentSelection(selection);
        var config = options || {};

        if (currentSelection.rangeCount === 0) {
            return false;
        }

        var range = currentSelection.getRangeAt(0);
        var formattingAncestor = getFormattingAncestor(range.commonAncestorContainer, tagName, config.root);

        if (!formattingAncestor) {
            return false;
        }

        var parent = formattingAncestor.parentNode;
        var selectedContent = range.extractContents();
        var preSelectionRange = document.createRange();
        var postSelectionRange = document.createRange();
        var beforeFragment;
        var afterFragment;
        var beforeFormatting = formattingAncestor.cloneNode(false);
        var afterFormatting = formattingAncestor.cloneNode(false);
        var insertionPoint;

        preSelectionRange.setStartBefore(formattingAncestor.firstChild);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);

        postSelectionRange.setStart(range.endContainer, range.endOffset);
        postSelectionRange.setEndAfter(formattingAncestor.lastChild);

        beforeFragment = preSelectionRange.extractContents();
        afterFragment = postSelectionRange.extractContents();

        if (beforeFragment.childNodes.length > 0) {
            beforeFormatting.appendChild(beforeFragment);
        }

        if (afterFragment.childNodes.length > 0) {
            afterFormatting.appendChild(afterFragment);
        }

        parent.removeChild(formattingAncestor);

        insertionPoint = parent.childNodes[range.startOffset] || null;

        if (beforeFormatting.childNodes.length > 0) {
            parent.insertBefore(beforeFormatting, insertionPoint);
        }

        if (selectedContent.childNodes.length > 0) {
            parent.insertBefore(selectedContent, insertionPoint);
        }

        if (afterFormatting.childNodes.length > 0) {
            parent.insertBefore(afterFormatting, insertionPoint);
        }

        parent.normalize();

        if (typeof config.removeEmptyFormattingElements === 'function') {
            config.removeEmptyFormattingElements(tagName, parent);
        }

        currentSelection.removeAllRanges();

        return true;
    }

    function toggleFormat(tagName, selection, options) {
        var currentSelection = getCurrentSelection(selection);
        var range;

        if (currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);

        if (isSelectionWithinTag(range, tagName, options && options.root)) {
            return unwrapSelection(tagName, currentSelection, options);
        }

        return wrapSelection('<' + tagName + '></' + tagName + '>', currentSelection);
    }

    function applyStyle(styleObj, selection) {
        var currentSelection = getCurrentSelection(selection);
        var range;

        if (currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);

        getSelectedNodes(range).forEach(function (node) {
            if (node.nodeType === Node.TEXT_NODE) {
                var span = document.createElement('span');

                Object.assign(span.style, styleObj);
                node.parentNode.insertBefore(span, node);
                span.appendChild(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                Object.assign(node.style, styleObj);
            }
        });

        return true;
    }

    function removeStyle(styleProps, selection) {
        var currentSelection = getCurrentSelection(selection);
        var range;

        if (currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);

        getSelectedNodes(range).forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                styleProps.forEach(function (prop) {
                    node.style[prop] = '';
                });
            }
        });

        return true;
    }

    function clearFormatting(selection, options) {
        var currentSelection = getCurrentSelection(selection);
        var config = options || {};
        var range;
        var tags = config.tags || ['STRONG', 'EM', 'U', 'B', 'I', 'SPAN'];
        var nodesToUnwrap = [];
        var walker;
        var currentNode;

        if (currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);

        walker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: function (node) {
                    if (range.intersectsNode(node) && tags.indexOf(node.tagName) !== -1) {
                        return NodeFilter.FILTER_ACCEPT;
                    }

                    return NodeFilter.FILTER_SKIP;
                }
            },
            false
        );

        walker.currentNode = range.commonAncestorContainer;
        currentNode = walker.currentNode;

        while (currentNode) {
            nodesToUnwrap.push(currentNode);
            currentNode = walker.nextNode();
        }

        nodesToUnwrap.forEach(function (node) {
            var parent = node.parentNode;

            if (!parent) {
                return;
            }

            while (node.firstChild) {
                parent.insertBefore(node.firstChild, node);
            }

            parent.removeChild(node);
        });

        if (typeof config.removeEmptyFormattingNodes === 'function') {
            config.removeEmptyFormattingNodes(range.commonAncestorContainer, tags);
        }

        if (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE) {
            range.commonAncestorContainer.normalize();
        } else if (range.commonAncestorContainer.parentNode) {
            range.commonAncestorContainer.parentNode.normalize();
        }

        currentSelection.removeAllRanges();

        return true;
    }

    return {
        applyStyle: applyStyle,
        clearFormatting: clearFormatting,
        removeStyle: removeStyle,
        toggleFormat: toggleFormat,
        unwrapSelection: unwrapSelection,
        wrapSelection: wrapSelection
    };
}));