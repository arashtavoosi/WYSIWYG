(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./html-utility'));
    } else {
        root.WysiwygSelectionFormatting = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    function isSelectionWithinTag(range, tagName, rootNode) {
        return !!(
            html.getClosestTag(range.startContainer, tagName, rootNode) &&
            html.getClosestTag(range.endContainer, tagName, rootNode)
        );
    }

    function getFullySelectedStyleSpan(range) {
        var node = range.commonAncestorContainer;
        var selectedText = range.toString();

        while (node && node.nodeType !== Node.ELEMENT_NODE) {
            node = node.parentNode;
        }

        while (node) {
            if (
                node.nodeType === Node.ELEMENT_NODE &&
                node.tagName === 'SPAN' &&
                (html.rangeSelectsElement(range, node) || node.textContent === selectedText)
            ) {
                return node;
            }

            node = node.parentNode;
        }

        node = range.commonAncestorContainer;

        if (node.nodeType === Node.ELEMENT_NODE) {
            return Array.from(node.querySelectorAll('span')).find(function (span) {
                return html.rangeSelectsElement(range, span) || span.textContent === selectedText;
            }) || null;
        }

        return null;
    }

    function wrapSelection(wrapper, selection) {
        var currentSelection = html.getCurrentSelection(selection);

        if (currentSelection.rangeCount === 0) {
            return false;
        }

        var range = currentSelection.getRangeAt(0);
        var wrapperElement = html.createWrapperElement(wrapper);
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
        var currentSelection = html.getCurrentSelection(selection);
        var config = options || {};

        if (currentSelection.rangeCount === 0) {
            return false;
        }

        var range = currentSelection.getRangeAt(0);
        var formattingAncestor = html.getClosestTag(range.commonAncestorContainer, tagName, config.root);

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
        var currentSelection = html.getCurrentSelection(selection);
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
        var currentSelection = html.getCurrentSelection(selection);
        var range;
        var span;
        var fragment;
        var selectedSpan;
        var restoredRange;

        if (currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);

        if (range.collapsed) {
            return false;
        }

        selectedSpan = getFullySelectedStyleSpan(range);

        if (selectedSpan) {
            Object.assign(selectedSpan.style, styleObj);
            restoredRange = document.createRange();
            restoredRange.selectNodeContents(selectedSpan);
            currentSelection.removeAllRanges();
            currentSelection.addRange(restoredRange);
            return true;
        }

        span = document.createElement('span');
        Object.assign(span.style, styleObj);

        fragment = range.extractContents();

        if (fragment.childNodes.length === 0) {
            return false;
        }

        span.appendChild(fragment);
        range.insertNode(span);
        span.parentNode.normalize();
        restoredRange = document.createRange();
        restoredRange.selectNodeContents(span);
        currentSelection.removeAllRanges();
        currentSelection.addRange(restoredRange);

        return true;
    }

    function removeStyle(styleProps, selection) {
        var currentSelection = html.getCurrentSelection(selection);
        var range;

        if (currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);

        html.getSelectedNodes(range).forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                styleProps.forEach(function (prop) {
                    node.style[prop] = '';
                });
            }
        });

        return true;
    }

    function clearFormatting(selection, options) {
        var currentSelection = html.getCurrentSelection(selection);
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
