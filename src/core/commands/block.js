(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../html-utility'));
    } else {
        root.WysiwygBlockCommands = factory(root.WysiwygHtmlUtility);
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

    function withSelectionTarget(selection, options, getTarget, callback) {
        var config = options || {};

        return withSelectionRange(selection, function (range, currentSelection) {
            return callback(getTarget(config.root, range), config, currentSelection);
        });
    }

    function ensureCurrentBlock(rootNode, range, tagName) {
        var block = html.getClosestTag(html.getElement(range.startContainer), BLOCK_TAGS, rootNode);
        var cell = html.getClosestTag(html.getElement(range.startContainer), ['td', 'th'], rootNode);
        var container = cell || rootNode;
        var startContainer = range.startContainer;
        var endContainer = range.endContainer;
        var startOffset = range.startOffset;
        var endOffset = range.endOffset;
        var startInContainer = startContainer === container;
        var endInContainer = endContainer === container;
        var paragraph;

        if (block && block !== rootNode) {
            return block;
        }

        paragraph = document.createElement(tagName || 'p');

        if (container.childNodes.length === 0) {
            paragraph.appendChild(document.createElement('br'));
        } else {
            moveChildren(container, paragraph);
        }

        container.appendChild(paragraph);

        if (startInContainer || endInContainer) {
            range.setStart(
                startInContainer ? paragraph : startContainer,
                startInContainer ? Math.min(startOffset, paragraph.childNodes.length) : startOffset
            );
            range.setEnd(
                endInContainer ? paragraph : endContainer,
                endInContainer ? Math.min(endOffset, paragraph.childNodes.length) : endOffset
            );
        }

        return paragraph;
    }

    function getCurrentStyleTarget(rootNode, range) {
        return html.getClosestTag(
            html.getElement(range.startContainer),
            BLOCK_TAGS.concat(['td', 'th']),
            rootNode
        ) || ensureCurrentBlock(rootNode, range, 'div');
    }

    function getInheritedDirection(element) {
        var parent = element && element.parentElement;
        var computed;
        var direction;

        while (parent) {
            computed = window.getComputedStyle(parent).direction;
            if (computed) {
                return computed.toLowerCase();
            }

            direction = parent.style && parent.style.direction;
            if (direction) {
                return direction.toLowerCase();
            }

            direction = parent.getAttribute && parent.getAttribute('dir');
            if (direction === 'ltr' || direction === 'rtl') {
                return direction;
            }

            parent = parent.parentElement;
        }

        return 'ltr';
    }

    function setBlock(type, selection, options) {
        return withSelectionTarget(selection, options, ensureCurrentBlock, function (block, config) {
            var targetTag;

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
        });
    }

    function toggleBlock(type, selection, options) {
        return withSelectionTarget(selection, options, ensureCurrentBlock, function (block, config) {
            var wrapper;

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
        });
    }

    function insertBreak(selection) {
        return withSelectionRange(selection, function (range, currentSelection) {
            var br = document.createElement('br');

            range.deleteContents();
            range.insertNode(br);
            html.moveSelectionAfterNode(br, currentSelection);

            return br;
        });
    }

    function insertRule(selection, options) {
        return withSelectionTarget(selection, options, ensureCurrentBlock, function (block) {
            var hr = document.createElement('hr');
            var paragraph = document.createElement('p');

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
        });
    }

    function setBlockStyle(propertyName, value, selection, options) {
        return withSelectionTarget(selection, options, getCurrentStyleTarget, function (block) {
            if (propertyName === 'direction' && String(value || '').toLowerCase() === getInheritedDirection(block)) {
                block.style.removeProperty('direction');

                if (!block.getAttribute('style')) {
                    block.removeAttribute('style');
                }
            } else {
                block.style[propertyName] = value;
            }

            return block;
        });
    }

    function clearBlockStyle(propertyName, selection, options) {
        return withSelectionTarget(selection, options, getCurrentStyleTarget, function (block) {
            block.style.removeProperty(propertyName.replace(/[A-Z]/g, function (letter) {
                return '-' + letter.toLowerCase();
            }));

            if (!block.getAttribute('style')) {
                block.removeAttribute('style');
            }

            return block;
        });
    }

    function adjustIndent(direction, selection, options) {
        return withSelectionTarget(selection, options, ensureCurrentBlock, function (block, config) {
            var currentValue = parseInt(block.style.marginLeft || '0', 10) || 0;
            var step = Number(config.indentStep) || 24;
            var nextValue = direction === 'outdent' ? Math.max(0, currentValue - step) : currentValue + step;

            if (nextValue) {
                block.style.marginLeft = nextValue + 'px';
            } else {
                block.style.removeProperty('margin-left');
            }

            return block;
        });
    }

    return {
        adjustIndent: adjustIndent,
        clearBlockStyle: clearBlockStyle,
        insertBreak: insertBreak,
        insertRule: insertRule,
        setBlockStyle: setBlockStyle,
        setBlock: setBlock,
        toggleBlock: toggleBlock
    };
}));
