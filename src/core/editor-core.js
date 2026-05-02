(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(
            require('./selection-formatting'),
            require('./markup-normalization'),
            require('./selection-state'),
            require('./linking'),
            require('./block-structure'),
            require('./embed-content')
        );
    } else {
        root.createEditorCore = factory(
            root.WysiwygSelectionFormatting,
            root.WysiwygMarkupNormalization,
            root.WysiwygSelectionState,
            root.WysiwygLinking,
            root.WysiwygBlockStructure,
            root.WysiwygEmbedContent
        );
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (selectionFormatting, markupNormalization, selectionState, linking, blockStructure, embedContent) {
    function normalizeInlineCommand(name) {
        var map = {
            bold: 'strong',
            italic: 'em',
            strikethrough: 's',
            subscript: 'sub',
            superscript: 'sup',
            underline: 'u'
        };

        return map[name] || name;
    }

    function getNodePath(rootNode, node) {
        var path = [];

        while (node && node !== rootNode) {
            path.unshift(Array.prototype.indexOf.call(node.parentNode.childNodes, node));
            node = node.parentNode;
        }

        return node === rootNode ? path : null;
    }

    function getNodeFromPath(rootNode, path) {
        var node = rootNode;
        var index;

        if (!path) {
            return null;
        }

        for (index = 0; index < path.length; index += 1) {
            node = node.childNodes[path[index]];

            if (!node) {
                return null;
            }
        }

        return node;
    }

    function createEditorCore(rootNode, options) {
        var config = options || {};
        var historyLimit = Math.max(1, Number(config.historyLimit) || 50);
        var history = [];
        var historyIndex = -1;

        if (!selectionFormatting || !markupNormalization || !selectionState || !linking || !blockStructure || !embedContent) {
            throw new Error('Editor core dependencies are not available');
        }

        function getSelectionBookmark() {
            var selection = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
            var range;

            if (!selection || selection.rangeCount === 0) {
                return null;
            }

            range = selection.getRangeAt(0);

            if (!rootNode.contains(range.commonAncestorContainer)) {
                return null;
            }

            return {
                collapsed: range.collapsed,
                endOffset: range.endOffset,
                endPath: getNodePath(rootNode, range.endContainer),
                startOffset: range.startOffset,
                startPath: getNodePath(rootNode, range.startContainer)
            };
        }

        function restoreSelectionBookmark(bookmark) {
            var selection = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
            var range;
            var startNode;
            var endNode;

            if (!selection || !bookmark) {
                return;
            }

            startNode = getNodeFromPath(rootNode, bookmark.startPath);
            endNode = getNodeFromPath(rootNode, bookmark.endPath);

            if (!startNode || !endNode) {
                return;
            }

            range = document.createRange();
            range.setStart(startNode, Math.min(bookmark.startOffset, startNode.nodeType === Node.TEXT_NODE ? startNode.length : startNode.childNodes.length));
            range.setEnd(endNode, Math.min(bookmark.endOffset, endNode.nodeType === Node.TEXT_NODE ? endNode.length : endNode.childNodes.length));
            selection.removeAllRanges();
            selection.addRange(range);
        }

        function createSnapshot() {
            return {
                html: rootNode.innerHTML,
                selection: getSelectionBookmark()
            };
        }

        function pushSnapshot() {
            var snapshot = createSnapshot();

            if (historyIndex >= 0 && history[historyIndex].html === snapshot.html) {
                history[historyIndex].selection = snapshot.selection;
                return api;
            }

            history = history.slice(0, historyIndex + 1);
            history.push(snapshot);

            while (history.length > historyLimit) {
                history.shift();
            }

            historyIndex = history.length - 1;

            return api;
        }

        function applySnapshot(snapshot) {
            if (!snapshot) {
                return api;
            }

            rootNode.innerHTML = snapshot.html;
            restoreSelectionBookmark(snapshot.selection);
            return api;
        }

        function performMutation(callback) {
            var before = rootNode.innerHTML;
            var result = callback();

            if (rootNode.innerHTML !== before) {
                pushSnapshot();
            }

            return result;
        }

        function normalize() {
            markupNormalization.simplifyAllFormattingTags(rootNode);
            return api;
        }

        function getFormattingOptions() {
            return {
                expandCollapsedToWord: true,
                root: rootNode,
                removeEmptyFormattingElements: markupNormalization.removeEmptyFormattingElements,
                removeEmptyFormattingNodes: markupNormalization.removeEmptyFormattingNodes
            };
        }

        var api = {
            clear: function (selection) {
                return performMutation(function () {
                    selectionFormatting.clearFormatting(selection, getFormattingOptions());
                    return normalize();
                });
            },

            canRedo: function () {
                return historyIndex >= 0 && historyIndex < history.length - 1;
            },

            canUndo: function () {
                return historyIndex > 0;
            },

            getHtml: function () {
                return rootNode.innerHTML;
            },

            getActiveFormats: function (selection) {
                var state = selectionState.getActiveFormats(selection, rootNode);

                state.canUndo = api.canUndo();
                state.canRedo = api.canRedo();

                return state;
            },

            normalize: normalize,

            recordSnapshot: function () {
                return pushSnapshot();
            },

            redo: function () {
                if (!api.canRedo()) {
                    return api;
                }

                historyIndex += 1;
                return applySnapshot(history[historyIndex]);
            },

            setHtml: function (html) {
                return performMutation(function () {
                    rootNode.innerHTML = html;
                    return normalize();
                });
            },

            undo: function () {
                if (!api.canUndo()) {
                    return api;
                }

                historyIndex -= 1;
                return applySnapshot(history[historyIndex]);
            },

            removeLink: function (selection) {
                return performMutation(function () {
                    linking.removeLink(selection, { root: rootNode });
                    return normalize();
                });
            },

            setBlock: function (type, options, selection) {
                return performMutation(function () {
                    blockStructure.setBlock(type, selection, {
                        level: options && options.level,
                        root: rootNode
                    });
                    return api;
                });
            },

            setBlockStyle: function (propertyName, value, selection) {
                return performMutation(function () {
                    blockStructure.setBlockStyle(propertyName, value, selection, { root: rootNode });
                    return api;
                });
            },

            setInlineStyle: function (propertyName, value, selection) {
                var styleObj = {};

                if (propertyName === 'lineHeight' || propertyName === 'textAlign') {
                    return api.setBlockStyle(propertyName, value, selection);
                }

                styleObj[propertyName] = value;
                return performMutation(function () {
                    selectionFormatting.applyStyle(styleObj, selection, { expandCollapsedToWord: true, root: rootNode });
                    return api;
                });
            },

            insertBreak: function (selection) {
                return performMutation(function () {
                    blockStructure.insertBreak(selection);
                    return api;
                });
            },

            insertImage: function (attributes, selection) {
                return performMutation(function () {
                    embedContent.insertImage(attributes, selection);
                    return api;
                });
            },

            updateImage: function (attributes, selection) {
                return performMutation(function () {
                    embedContent.updateImage(attributes, selection);
                    return api;
                });
            },

            removeImage: function (selection) {
                return performMutation(function () {
                    embedContent.removeImage(selection);
                    return api;
                });
            },

            insertRule: function (selection) {
                return performMutation(function () {
                    blockStructure.insertRule(selection, { root: rootNode });
                    return api;
                });
            },

            insertTable: function (config, selection) {
                return performMutation(function () {
                    embedContent.insertTable(config, selection);
                    return api;
                });
            },

            insertTableRow: function (position, selection) {
                return performMutation(function () {
                    embedContent.insertTableRow(position, selection);
                    return api;
                });
            },

            removeTableRow: function (selection) {
                return performMutation(function () {
                    embedContent.removeTableRow(selection);
                    return api;
                });
            },

            insertTableColumn: function (position, selection) {
                return performMutation(function () {
                    embedContent.insertTableColumn(position, selection);
                    return api;
                });
            },

            removeTableColumn: function (selection) {
                return performMutation(function () {
                    embedContent.removeTableColumn(selection);
                    return api;
                });
            },

            toggleTableHeaderRow: function (selection) {
                return performMutation(function () {
                    embedContent.toggleTableHeaderRow(selection);
                    return api;
                });
            },

            removeTable: function (selection) {
                return performMutation(function () {
                    embedContent.removeTable(selection);
                    return api;
                });
            },

            toggleInline: function (name, selection) {
                return performMutation(function () {
                    selectionFormatting.toggleFormat(normalizeInlineCommand(name), selection, getFormattingOptions());
                    return normalize();
                });
            },

            toggleBlock: function (type, selection) {
                return performMutation(function () {
                    blockStructure.toggleBlock(type, selection, { root: rootNode });
                    return api;
                });
            },

            adjustIndent: function (direction, selection) {
                return performMutation(function () {
                    blockStructure.adjustIndent(direction, selection, { root: rootNode });
                    return api;
                });
            },

            toggleList: function (type, selection) {
                return performMutation(function () {
                    blockStructure.toggleList(type, selection, { root: rootNode });
                    return api;
                });
            },

            upsertLink: function (attributes, selection) {
                return performMutation(function () {
                    linking.upsertLink(attributes, selection, { expandCollapsedToWord: true, root: rootNode });
                    return normalize();
                });
            }
        };

        if (config.initialHtml) {
            rootNode.innerHTML = config.initialHtml;
            normalize();
        }

        pushSnapshot();

        return api;
    }

    return createEditorCore;
}));
