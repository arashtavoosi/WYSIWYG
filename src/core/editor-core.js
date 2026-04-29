(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(
            require('./selection-formatting'),
            require('./markup-normalization'),
            require('./selection-state')
        );
    } else {
        root.createEditorCore = factory(
            root.WysiwygSelectionFormatting,
            root.WysiwygMarkupNormalization,
            root.WysiwygSelectionState
        );
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (selectionFormatting, markupNormalization, selectionState) {
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

        if (!selectionFormatting || !markupNormalization || !selectionState) {
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

            setInlineStyle: function (propertyName, value, selection) {
                var styleObj = {};

                styleObj[propertyName] = value;
                selectionFormatting.applyStyle(styleObj, selection);
                return api;
            },

            toggleInline: function (name, selection) {
                selectionFormatting.toggleFormat(normalizeInlineCommand(name), selection, getFormattingOptions());
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