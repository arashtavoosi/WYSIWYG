(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../html-utility'));
    } else {
        root.WysiwygBlockCommands = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    function withSelectionRange(selection, callback) {
        var currentSelection = html.getCurrentSelection(selection);
        if (!currentSelection || !currentSelection.rangeCount) { return false; }
        return callback(currentSelection.getRangeAt(0), currentSelection);
    }

    function withSelectionTarget(selection, options, getTarget, callback) {
        var config = options || {};
        return withSelectionRange(selection, function (range, currentSelection) {
            if (!config.root.contains(range.commonAncestorContainer)) { return false; }
            return callback(getTarget(config.root, range), config, currentSelection);
        });
    }

    function withBlocks(selection, options, callback, style) {
        var config = options || {};
        return withSelectionRange(selection, function (range) {
            if (!config.root.contains(range.commonAncestorContainer)) { return false; }
            var blocks = html.getSelectedBlocks(config.root, range);
            if (style && !blocks.length && range.startContainer === config.root) {
                var wrapper = document.createElement('div');
                var start = range.startOffset;
                var end = range.endOffset;
                while (config.root.firstChild) { wrapper.appendChild(config.root.firstChild); }
                config.root.appendChild(wrapper);
                range.setStart(wrapper, start);
                range.setEnd(wrapper, end);
                blocks = [wrapper];
            }
            if (!blocks.length) { blocks = [html.ensureBlock(config.root, range)]; }
            return blocks.map(function (block) { return callback(block, config); });
        });
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
        return withBlocks(selection, options, function (block, config) {
            var targetTag;

            if (type === 'heading') {
                targetTag = 'h' + String((config.level || 1));
            } else if (type === 'paragraph') {
                targetTag = 'p';
            } else {
                targetTag = type;
            }

            if (/^(LI|TD|TH|BLOCKQUOTE)$/.test(block.tagName) ||
                (block.tagName === 'DIV' && block.querySelector('p,div,h1,h2,h3,h4,h5,h6,ul,ol,table,blockquote,pre'))) {
                var content = null;
                Array.from(block.childNodes).forEach(function (child) {
                    if (/^(P|DIV|H[1-6]|UL|OL|TABLE|BLOCKQUOTE|PRE|HR)$/.test(child.nodeName)) {
                        content = null;
                    } else {
                        if (!content) {
                            content = document.createElement(targetTag);
                            block.insertBefore(content, child);
                        }
                        content.appendChild(child);
                    }
                });
            } else {
                block = html.replaceTag(block, targetTag);
            }

            return block;
        });
    }

    function toggleBlock(type, selection, options) {
        return withSelectionTarget(selection, options, html.ensureBlock, function (block, config) {
            var wrapper;

            if (type !== 'blockquote') {
                return false;
            }

            wrapper = html.getClosestTag(block, 'blockquote', config.root);

            if (wrapper) {
                html.unwrapNode(wrapper);
                return true;
            }

            wrapper = document.createElement('blockquote');
            block.parentNode.insertBefore(wrapper, block);
            wrapper.appendChild(block);

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
        return withSelectionTarget(selection, options, html.ensureBlock, function (block) {
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
        return withBlocks(selection, options, function (block) {
            if (propertyName === 'direction' && String(value || '').toLowerCase() === getInheritedDirection(block)) {
                block.style.removeProperty('direction');

                if (!block.getAttribute('style')) {
                    block.removeAttribute('style');
                }
            } else {
                block.style[propertyName] = value;
            }

            return block;
        }, true);
    }

    function clearBlockStyle(propertyName, selection, options) {
        return withBlocks(selection, options, function (block) {
            block.style.removeProperty(propertyName.replace(/[A-Z]/g, function (letter) {
                return '-' + letter.toLowerCase();
            }));

            if (!block.getAttribute('style')) {
                block.removeAttribute('style');
            }

            return block;
        }, true);
    }

    function adjustIndent(direction, selection, options) {
        return withBlocks(selection, options, function (block, config) {
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
