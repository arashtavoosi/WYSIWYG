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
            underline: 'u'
        };

        return map[name] || name;
    }

    function createEditorCore(rootNode, options) {
        var config = options || {};

        if (!selectionFormatting || !markupNormalization || !selectionState || !linking || !blockStructure || !embedContent) {
            throw new Error('Editor core dependencies are not available');
        }

        function normalize() {
            markupNormalization.simplifyAllFormattingTags(rootNode);
            return api;
        }

        function getFormattingOptions() {
            return {
                root: rootNode,
                removeEmptyFormattingElements: markupNormalization.removeEmptyFormattingElements,
                removeEmptyFormattingNodes: markupNormalization.removeEmptyFormattingNodes
            };
        }

        var api = {
            clear: function (selection) {
                selectionFormatting.clearFormatting(selection, getFormattingOptions());
                return normalize();
            },

            getHtml: function () {
                return rootNode.innerHTML;
            },

            getActiveFormats: function (selection) {
                return selectionState.getActiveFormats(selection, rootNode);
            },

            normalize: normalize,

            setHtml: function (html) {
                rootNode.innerHTML = html;
                return normalize();
            },

            removeLink: function (selection) {
                linking.removeLink(selection, { root: rootNode });
                return normalize();
            },

            setBlock: function (type, options, selection) {
                blockStructure.setBlock(type, selection, {
                    level: options && options.level,
                    root: rootNode
                });
                return api;
            },

            setInlineStyle: function (propertyName, value, selection) {
                var styleObj = {};

                if (propertyName === 'lineHeight') {
                    blockStructure.setBlockStyle(propertyName, value, selection, { root: rootNode });
                    return api;
                }

                styleObj[propertyName] = value;
                selectionFormatting.applyStyle(styleObj, selection);
                return api;
            },

            insertBreak: function (selection) {
                blockStructure.insertBreak(selection);
                return api;
            },

            insertImage: function (attributes, selection) {
                embedContent.insertImage(attributes, selection);
                return api;
            },

            updateImage: function (attributes, selection) {
                embedContent.updateImage(attributes, selection);
                return api;
            },

            removeImage: function (selection) {
                embedContent.removeImage(selection);
                return api;
            },

            insertRule: function (selection) {
                blockStructure.insertRule(selection, { root: rootNode });
                return api;
            },

            insertTable: function (config, selection) {
                embedContent.insertTable(config, selection);
                return api;
            },

            insertTableRow: function (position, selection) {
                embedContent.insertTableRow(position, selection);
                return api;
            },

            removeTableRow: function (selection) {
                embedContent.removeTableRow(selection);
                return api;
            },

            insertTableColumn: function (position, selection) {
                embedContent.insertTableColumn(position, selection);
                return api;
            },

            removeTableColumn: function (selection) {
                embedContent.removeTableColumn(selection);
                return api;
            },

            toggleTableHeaderRow: function (selection) {
                embedContent.toggleTableHeaderRow(selection);
                return api;
            },

            removeTable: function (selection) {
                embedContent.removeTable(selection);
                return api;
            },

            toggleInline: function (name, selection) {
                selectionFormatting.toggleFormat(normalizeInlineCommand(name), selection, getFormattingOptions());
                return normalize();
            },

            toggleBlock: function (type, selection) {
                blockStructure.toggleBlock(type, selection, { root: rootNode });
                return api;
            },

            toggleList: function (type, selection) {
                blockStructure.toggleList(type, selection, { root: rootNode });
                return api;
            },

            upsertLink: function (attributes, selection) {
                linking.upsertLink(attributes, selection, { root: rootNode });
                return normalize();
            }
        };

        if (config.initialHtml) {
            api.setHtml(config.initialHtml);
        }

        return api;
    }

    return createEditorCore;
}));
