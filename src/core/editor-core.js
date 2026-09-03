(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(
            require('./commands/inline'),
            require('./normalization'),
            require('./state'),
            require('./commands/link'),
            require('./commands/block'),
            require('./commands/list'),
            require('./commands/media'),
            require('./commands/table'),
            require('./commands/code-block'),
            require('./selection'),
            require('./history'),
            require('./html-utility')
        );
    } else {
        root.createEditorCore = factory(
            root.WysiwygInlineCommands,
            root.WysiwygNormalization,
            root.WysiwygEditorState,
            root.WysiwygLinkCommands,
            root.WysiwygBlockCommands,
            root.WysiwygListCommands,
            root.WysiwygMediaCommands,
            root.WysiwygTableCommands,
            root.WysiwygCodeBlockCommands,
            root.WysiwygSelection,
            root.createEditorHistory,
            root.WysiwygHtmlUtility
        );
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (inlineCommands, normalization, state, linkCommands, blockCommands, listCommands, mediaCommands, tableCommands, codeBlockCommands, createSelection, createHistory, html) {
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

    function createEditorCore(rootNode, options) {
        var config = options || {};
        var selectionManager;
        var history;

        if (!inlineCommands || !normalization || !state || !linkCommands || !blockCommands || !listCommands || !mediaCommands || !tableCommands || !codeBlockCommands || !createSelection || !createHistory || !html) {
            throw new Error('Editor core dependencies are not available');
        }

        selectionManager = createSelection(rootNode);
        history = createHistory(rootNode, selectionManager, { limit: config.historyLimit });

        function performMutation(callback) {
            var before = rootNode.innerHTML;
            var result = callback();

            if (rootNode.innerHTML !== before) {
                history.record();
            }

            return result;
        }

        function performSelectionMutation(callback, selection) {
            var before = rootNode.innerHTML;
            var bookmark = selectionManager.getBookmark(selection);
            var result = callback();

            selectionManager.restoreBookmark(bookmark, selection);

            if (rootNode.innerHTML !== before) {
                history.record();
            }

            return result;
        }

        function normalize() {
            normalization.simplifyAllFormattingTags(rootNode);
            return api;
        }

        function findText(query, options, selection) {
            var currentSelection = selectionManager.getCurrent(selection);
            var bookmark = selectionManager.getBookmark(currentSelection);
            var source = rootNode.textContent || '';
            var needle = String(query || '');
            var matchCase = options && options.matchCase;
            var start = bookmark ? bookmark.endOffset : 0;
            var index;

            if (!needle) {
                return null;
            }

            if (!matchCase) {
                source = source.toLowerCase();
                needle = needle.toLowerCase();
            }

            index = source.indexOf(needle, start);

            if (index < 0 && (!options || options.wrap !== false) && start > 0) {
                index = source.indexOf(needle);
            }

            if (index < 0) {
                return null;
            }

            bookmark = { startOffset: index, endOffset: index + needle.length };
            selectionManager.restoreBookmark(bookmark, currentSelection);
            return bookmark;
        }

        function replaceText(query, replacement, options, selection) {
            var currentSelection = selectionManager.getCurrent(selection);
            var matchCase = options && options.matchCase;
            var replaceAll = options && options.all;
            var needle = String(query || '');
            var value = String(replacement || '');
            var source;
            var matches = [];
            var index;

            if (!needle) {
                return 0;
            }

            if (!replaceAll) {
                if (!currentSelection || !currentSelection.rangeCount || (matchCase ? currentSelection.toString() : currentSelection.toString().toLowerCase()) !== (matchCase ? needle : needle.toLowerCase())) {
                    return 0;
                }

                matches.push(selectionManager.getBookmark(currentSelection));
            } else {
                source = rootNode.textContent || '';

                if (!matchCase) {
                    source = source.toLowerCase();
                    needle = needle.toLowerCase();
                }

                index = source.indexOf(needle);

                while (index >= 0) {
                    matches.push({ startOffset: index, endOffset: index + needle.length });
                    index = source.indexOf(needle, index + needle.length);
                }
            }

            if (!matches.length || !matches[0]) {
                return 0;
            }

            return performMutation(function () {
                matches.reverse().forEach(function (match) {
                    var range;
                    var textNode;

                    selectionManager.restoreBookmark(match, currentSelection);
                    range = currentSelection.getRangeAt(0);
                    range.deleteContents();
                    textNode = document.createTextNode(value);
                    range.insertNode(textNode);
                    range.setStartAfter(textNode);
                    range.collapse(true);
                    currentSelection.removeAllRanges();
                    currentSelection.addRange(range);
                });

                return matches.length;
            });
        }

        function getFormattingOptions() {
            return {
                expandCollapsedToWord: true,
                root: rootNode,
                removeEmptyFormattingElements: normalization.removeEmptyFormattingElements,
                removeEmptyFormattingNodes: normalization.removeEmptyFormattingNodes
            };
        }

        var api = {
            clear: function (selection, options) {
                return performSelectionMutation(function () {
                    var formattingOptions = getFormattingOptions();

                    formattingOptions.elements = options && options.elements;
                    inlineCommands.clearFormatting(selection, formattingOptions);

                    if (!options || !options.elements || options.elements.length === 0) {
                        blockCommands.clearBlockStyle('textAlign', selection, { root: rootNode });
                    }

                    return normalize();
                }, selection);
            },

            canRedo: function () {
                return history.canRedo();
            },

            canUndo: function () {
                return history.canUndo();
            },

            getHtml: function () {
                return rootNode.innerHTML;
            },

            findText: findText,

            getActiveFormats: function (selection) {
                var activeState = state.getActiveFormats(selection, rootNode);

                activeState.canUndo = api.canUndo();
                activeState.canRedo = api.canRedo();

                return activeState;
            },

            normalize: normalize,

            recordSnapshot: function () {
                history.record();
                return api;
            },

            redo: function () {
                history.redo();
                return api;
            },

            setHtml: function (html) {
                return performMutation(function () {
                    rootNode.innerHTML = html;
                    return normalize();
                });
            },

            replaceText: replaceText,

            undo: function () {
                history.undo();
                return api;
            },

            removeLink: function (selection) {
                return performMutation(function () {
                    linkCommands.removeLink(selection, { root: rootNode });
                    return normalize();
                });
            },

            setBlock: function (type, options, selection) {
                return performMutation(function () {
                    blockCommands.setBlock(type, selection, {
                        level: options && options.level,
                        root: rootNode
                    });
                    return api;
                });
            },

            setBlockStyle: function (propertyName, value, selection) {
                return performMutation(function () {
                    blockCommands.setBlockStyle(propertyName, value, selection, { root: rootNode });
                    return api;
                });
            },

            setInlineStyle: function (propertyName, value, selection) {
                var styleObj = {};

                if (propertyName === 'lineHeight' || propertyName === 'textAlign') {
                    return api.setBlockStyle(propertyName, value, selection);
                }

                styleObj[propertyName] = value;
                return performSelectionMutation(function () {
                    inlineCommands.applyStyle(styleObj, selection, { expandCollapsedToWord: true, root: rootNode });
                    return api;
                }, selection);
            },

            insertBreak: function (selection) {
                return performMutation(function () {
                    blockCommands.insertBreak(selection);
                    return api;
                });
            },

            insertCodeBlock: function (value, language, selection) {
                return performMutation(function () {
                    codeBlockCommands.insertCodeBlock(value, language, selectionManager.getInsertionSelection(selection));
                    return api;
                });
            },

            insertMedia: function (attributes, selection) {
                return performMutation(function () {
                    mediaCommands.insertMedia(attributes && attributes.type, attributes, selectionManager.getInsertionSelection(selection));
                    return api;
                });
            },

            insertImage: function (attributes, selection) {
                return api.insertMedia(Object.assign({}, attributes || {}, { type: 'image' }), selection);
            },

            insertResource: function (attributes, selection) {
                return api.insertMedia(attributes, selection);
            },

            updateMedia: function (attributes, selection) {
                return performMutation(function () {
                    mediaCommands.updateMedia(attributes && attributes.type, attributes, selection);
                    return api;
                });
            },

            updateImage: function (attributes, selection) {
                return api.updateMedia(Object.assign({}, attributes || {}, { type: 'image' }), selection);
            },

            updateResource: function (attributes, selection) {
                return api.updateMedia(attributes, selection);
            },

            removeMedia: function (selection) {
                return performMutation(function () {
                    mediaCommands.removeMedia(selection);
                    return api;
                });
            },

            removeImage: function (selection) {
                return performMutation(function () {
                    mediaCommands.removeImage(selection);
                    return api;
                });
            },

            setImageLayout: function (layout, selection) {
                return performMutation(function () {
                    mediaCommands.setImageLayout(layout, selection, { root: rootNode });
                    return api;
                });
            },

            setMediaStyle: function (propertyName, value, selection) {
                return performMutation(function () {
                    mediaCommands.setMediaStyle(propertyName, value, selection, { root: rootNode });
                    return api;
                });
            },

            setImageStyle: function (propertyName, value, selection) {
                return performMutation(function () {
                    mediaCommands.setImageStyle(propertyName, value, selection, { root: rootNode });
                    return api;
                });
            },

            toggleMediaWidth: function (selection) {
                return performMutation(function () {
                    mediaCommands.toggleMediaWidth(selection, { root: rootNode });
                    return api;
                });
            },

            toggleImageFullSize: function (selection) {
                return performMutation(function () {
                    mediaCommands.toggleImageFullSize(selection, { root: rootNode });
                    return api;
                });
            },

            insertRule: function (selection) {
                return performMutation(function () {
                    blockCommands.insertRule(selection, { root: rootNode });
                    return api;
                });
            },

            insertTable: function (config, selection) {
                return performMutation(function () {
                    tableCommands.insertTable(config, selection);
                    return api;
                });
            },

            insertTableRow: function (position, selection) {
                return performMutation(function () {
                    tableCommands.insertTableRow(position, selection);
                    return api;
                });
            },

            mergeTableCells: function (cells, selection) {
                return performMutation(function () {
                    tableCommands.mergeTableCells(cells, selection);
                    return api;
                });
            },

            removeTableRow: function (selection) {
                return performMutation(function () {
                    tableCommands.removeTableRow(selection);
                    return api;
                });
            },

            insertTableColumn: function (position, selection) {
                return performMutation(function () {
                    tableCommands.insertTableColumn(position, selection);
                    return api;
                });
            },

            removeTableColumn: function (selection) {
                return performMutation(function () {
                    tableCommands.removeTableColumn(selection);
                    return api;
                });
            },

            toggleTableHeaderRow: function (selection) {
                return performMutation(function () {
                    tableCommands.toggleTableHeaderRow(selection);
                    return api;
                });
            },

            toggleTableFullSize: function (selection) {
                return performMutation(function () {
                    tableCommands.toggleTableFullSize(selection, { root: rootNode });
                    return api;
                });
            },

            unmergeTableCell: function (cell, selection) {
                return performMutation(function () {
                    tableCommands.unmergeTableCell(cell, selection);
                    return api;
                });
            },

            removeTable: function (selection) {
                return performMutation(function () {
                    tableCommands.removeTable(selection);
                    return api;
                });
            },

            toggleInline: function (name, selection) {
                return performSelectionMutation(function () {
                    inlineCommands.toggleFormat(normalizeInlineCommand(name), selection, getFormattingOptions());
                    return normalize();
                }, selection);
            },

            toggleBlock: function (type, selection) {
                return performMutation(function () {
                    blockCommands.toggleBlock(type, selection, { root: rootNode });
                    return api;
                });
            },

            adjustIndent: function (direction, selection) {
                return performMutation(function () {
                    blockCommands.adjustIndent(direction, selection, {
                        root: rootNode,
                        indentStep: config.indentStep
                    });
                    return api;
                });
            },

            toggleList: function (type, selection) {
                return performSelectionMutation(function () {
                    listCommands.toggleList(type, selection, { root: rootNode });
                    return api;
                }, selection);
            },

            upsertLink: function (attributes, selection) {
                return performMutation(function () {
                    linkCommands.upsertLink(attributes, selection, { expandCollapsedToWord: true, root: rootNode });
                    return normalize();
                });
            }
        };

        if (config.initialHtml) {
            rootNode.innerHTML = config.initialHtml;
            normalize();
        }

        history.record();

        return api;
    }

    return createEditorCore;
}));
