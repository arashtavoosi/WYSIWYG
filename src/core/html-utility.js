(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.WysiwygHtmlUtility = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function htmlUtility(selector, context) {
        if (!(this instanceof htmlUtility)) {
            return new htmlUtility(selector, context);
        }

        this.prevElements = [];
        this.elements = selector ? parseSelectorOrElements(selector, context) : [];
    }

    function toArray(list) {
        return Array.prototype.slice.call(list || []);
    }

    function unique(elements) {
        return elements.filter(function (element, index, list) {
            return list.indexOf(element) === index;
        });
    }

    function clampNumber(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function defineBooleanAttributeProperty(proto, propertyName, attributeName) {
        if (Object.prototype.hasOwnProperty.call(proto, propertyName)) {
            return;
        }

        Object.defineProperty(proto, propertyName, {
            configurable: true,
            get: function () {
                return this.hasAttribute(attributeName);
            },
            set: function (value) {
                this.toggleAttribute(attributeName, !!value);
            }
        });
    }

    function on(target, type, handler, options) {
        if (target) {
            target.addEventListener(type, handler, options);
        }

        return target;
    }

    function off(target, type, handler, options) {
        if (target) {
            target.removeEventListener(type, handler, options);
        }

        return target;
    }

    function getRangeFromPoint(x, y, doc) {
        var currentDocument = doc || document;
        var position;
        var range;

        if (currentDocument.caretRangeFromPoint) {
            return currentDocument.caretRangeFromPoint(x, y);
        }

        if (!currentDocument.caretPositionFromPoint) {
            return null;
        }

        position = currentDocument.caretPositionFromPoint(x, y);

        if (!position) {
            return null;
        }

        range = currentDocument.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);

        return range;
    }

    function parseSelectorOrElements(input, context) {
        if (!input) {
            return [];
        }

        if (typeof input === 'string') {
            return toArray((context || document).querySelectorAll(input));
        }

        if (input instanceof Node) {
            return [input];
        }

        if (input instanceof NodeList || Array.isArray(input)) {
            return toArray(input);
        }

        return input instanceof htmlUtility ? toArray(input.elements) : [];
    }

    function getContentNodes(content) {
        var temp;

        if (typeof content === 'string') {
            temp = document.createElement('div');
            temp.innerHTML = content.trim();
            return toArray(temp.childNodes);
        }

        return parseSelectorOrElements(content);
    }

    function createSlot(name) {
        var slot = document.createElement('slot');

        if (name) {
            slot.name = name;
        }

        return slot;
    }

    function appendTemplateContent(region, template) {
        var wrapper;

        region.innerHTML = '';

        if (!template) {
            return false;
        }

        if (typeof template === 'string') {
            wrapper = document.createElement('template');
            wrapper.innerHTML = template;
            region.appendChild(wrapper.content.cloneNode(true));
            return true;
        }

        if (template.content) {
            region.appendChild(template.content.cloneNode(true));
            return true;
        }

        if (template.nodeType) {
            region.appendChild(template.cloneNode(true));
            return true;
        }

        return false;
    }

    function getTemplateFromAttribute(element, name) {
        var value = element.getAttribute(name + '-template');
        var match;

        if (!value) {
            return null;
        }

        try {
            match = document.querySelector(value);
        } catch (error) {
            match = null;
        }

        return match || value;
    }

    function renderTemplateRegion(region, template, slotName) {
        if (!appendTemplateContent(region, template)) {
            region.innerHTML = '';
            region.appendChild(createSlot(slotName));
        }
    }

    function createWrapperElement(wrapper) {
        var nodes = getContentNodes(wrapper);

        if (nodes[0]) {
            return nodes[0].cloneNode(true);
        }

        throw new Error('Invalid wrapper provided');
    }

    function getCurrentSelection(selection) {
        return selection || window.getSelection();
    }

    function getAnchorRect(anchor, selection) {
        var currentSelection;

        if (anchor && anchor.getBoundingClientRect) {
            return anchor.getBoundingClientRect();
        }

        if (anchor && typeof anchor.left === 'number') {
            return anchor;
        }

        currentSelection = selection || (window.getSelection && window.getSelection());

        if (currentSelection && currentSelection.rangeCount) {
            return currentSelection.getRangeAt(0).getBoundingClientRect();
        }

        return null;
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

    function getSelectedNodes(range) {
        var nodes = [];
        var node = range.startContainer;

        if (node === range.endContainer) {
            return [node];
        }

        while (node && node !== range.endContainer) {
            nodes.push(node);
            node = node.nextSibling;
        }

        nodes.push(range.endContainer);
        return nodes;
    }

    function isWordCharacter(character) {
        return /[A-Za-z0-9_]/.test(character || '');
    }

    function getCollapsedTextTarget(range) {
        var container = range.startContainer;
        var offset = range.startOffset;
        var child;

        if (container.nodeType === Node.TEXT_NODE) {
            return {
                node: container,
                offset: offset
            };
        }

        if (container.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }

        child = container.childNodes[offset];

        if (child && child.nodeType === Node.TEXT_NODE) {
            return {
                node: child,
                offset: 0
            };
        }

        child = container.childNodes[offset - 1];

        if (child && child.nodeType === Node.TEXT_NODE) {
            return {
                node: child,
                offset: child.textContent.length
            };
        }

        return null;
    }

    function expandCollapsedRangeToWord(range, rootNode) {
        var target;
        var text;
        var offset;
        var start;
        var end;
        var expandedRange;

        if (!range || !range.collapsed) {
            return range;
        }

        target = getCollapsedTextTarget(range);

        if (!target || (rootNode && !rootNode.contains(target.node))) {
            return range;
        }

        text = target.node.textContent || '';
        offset = target.offset;

        if (!text) {
            return range;
        }

        if (offset > 0 && isWordCharacter(text.charAt(offset - 1))) {
            start = offset - 1;
            end = offset;
        } else if (offset < text.length && isWordCharacter(text.charAt(offset))) {
            start = offset;
            end = offset + 1;
        } else {
            return range;
        }

        while (start > 0 && isWordCharacter(text.charAt(start - 1))) {
            start -= 1;
        }

        while (end < text.length && isWordCharacter(text.charAt(end))) {
            end += 1;
        }

        expandedRange = document.createRange();
        expandedRange.setStart(target.node, start);
        expandedRange.setEnd(target.node, end);

        return expandedRange;
    }

    function expandCollapsedSelectionToWord(selection, rootNode) {
        var currentSelection = getCurrentSelection(selection);
        var range;
        var expandedRange;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return currentSelection;
        }

        range = currentSelection.getRangeAt(0);

        if (!range.collapsed) {
            return currentSelection;
        }

        expandedRange = expandCollapsedRangeToWord(range, rootNode);

        if (expandedRange === range) {
            return currentSelection;
        }

        currentSelection.removeAllRanges();
        currentSelection.addRange(expandedRange);

        return currentSelection;
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

    htmlUtility.prototype = {
        constructor: htmlUtility,

        each: function (callback) {
            this.elements.forEach(function (element, index) {
                callback.call(element, index, element);
            });
            return this;
        },

        add: function (selector, context) {
            this.elements = unique(this.elements.concat(parseSelectorOrElements(selector, context)));
            return this;
        }
    };

    Object.assign(htmlUtility, {
        appendTemplateContent: appendTemplateContent,
        clampNumber: clampNumber,
        createSlot: createSlot,
        createWrapperElement: createWrapperElement,
        defineBooleanAttributeProperty: defineBooleanAttributeProperty,
        expandCollapsedRangeToWord: expandCollapsedRangeToWord,
        expandCollapsedSelectionToWord: expandCollapsedSelectionToWord,
        getAnchorRect: getAnchorRect,
        getClosestTag: getClosestTag,
        getContentNodes: getContentNodes,
        getCurrentSelection: getCurrentSelection,
        getElement: getElement,
        getRangeFromPoint: getRangeFromPoint,
        getSelectedElement: getSelectedElement,
        getSelectedNodes: getSelectedNodes,
        getTemplateFromAttribute: getTemplateFromAttribute,
        moveSelectionAfterNode: moveSelectionAfterNode,
        moveSelectionToNodeStart: moveSelectionToNodeStart,
        off: off,
        on: on,
        parseSelectorOrElements: parseSelectorOrElements,
        placeCaretInside: placeCaretInside,
        rangeSelectsElement: rangeSelectsElement,
        replaceTag: replaceTag,
        renderTemplateRegion: renderTemplateRegion,
        toArray: toArray,
        unique: unique,
        unwrapNode: unwrapNode
    });

    return htmlUtility;
}));
