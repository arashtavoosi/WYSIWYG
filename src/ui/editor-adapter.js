(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(
            require('../core/editor-core'),
            require('./toolbar-view'),
            require('./toolbar-config')
        );
    } else {
        root.createEditorAdapter = factory(
            root.createEditorCore,
            root.createToolbarView,
            root.WysiwygToolbarConfig
        );
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (createEditorCore, createToolbarView, toolbarConfig) {
    function createEditorAdapter(config) {
        var toolbarSettings = Object.assign({}, toolbarConfig, config.toolbarConfig || {});
        toolbarSettings.prompts = Object.assign({}, toolbarConfig.prompts, (config.toolbarConfig || {}).prompts || {});
        var editorElement = config.editorElement;
        var toolbarElement = config.toolbarElement;
        var editor = createEditorCore(editorElement, config.editorOptions);
        var view = createToolbarView(toolbarElement, config.statusElements);
        var savedRange = null;

        function selectionIsInEditor(selection) {
            var range;

            if (!selection || selection.rangeCount === 0) {
                return false;
            }

            range = selection.getRangeAt(0);

            return editorElement.contains(range.commonAncestorContainer);
        }

        function saveSelection() {
            var selection = window.getSelection();

            if (selectionIsInEditor(selection)) {
                savedRange = selection.getRangeAt(0).cloneRange();
            }
        }

        function restoreSelection() {
            var selection;

            if (!savedRange) {
                return;
            }

            editorElement.focus();
            selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedRange);
        }

        function sync() {
            view.sync(editor.getActiveFormats());
        }

        function handleButton(button) {
            var inlineName = button.getAttribute('data-inline');
            var blockName = button.getAttribute('data-block');
            var listName = button.getAttribute('data-list');
            var actionName = button.getAttribute('data-action');
            var alignValue = button.getAttribute('data-align');
            var href;
            var src;
            var rows;
            var cols;
            var prompts = toolbarSettings.prompts || {};

            restoreSelection();

            if (actionName === 'undo') {
                editor.undo();
                saveSelection();
                return sync();
            }

            if (actionName === 'redo') {
                editor.redo();
                saveSelection();
                return sync();
            }

            if (inlineName) {
                editor.toggleInline(inlineName);
                return sync();
            }

            if (alignValue) {
                editor.setInlineStyle('textAlign', alignValue);
                return sync();
            }

            if (actionName === 'indent' || actionName === 'outdent') {
                editor.adjustIndent(actionName);
                return sync();
            }

            if (blockName === 'heading') {
                editor.setBlock('heading', { level: Number(button.getAttribute('data-level') || toolbarSettings.headingLevel || '2') });
                return sync();
            }

            if (blockName === 'paragraph') {
                editor.setBlock('paragraph');
                return sync();
            }

            if (blockName) {
                editor.toggleBlock(blockName);
                return sync();
            }

            if (listName) {
                editor.toggleList(listName);
                return sync();
            }

            if (actionName === 'clear') {
                editor.clear();
                return sync();
            }

            if (actionName === 'link') {
                href = window.prompt(prompts.link.label, editor.getActiveFormats().link ? editor.getActiveFormats().link.href : prompts.link.fallback);

                if (href) {
                    editor.upsertLink({ href: href });
                }

                return sync();
            }

            if (actionName === 'unlink') {
                editor.removeLink();
                return sync();
            }

            if (actionName === 'br') {
                editor.insertBreak();
                return sync();
            }

            if (actionName === 'hr') {
                editor.insertRule();
                return sync();
            }

            if (actionName === 'image') {
                src = window.prompt(prompts.image.label, prompts.image.fallback);

                if (src) {
                    editor.insertImage({ src: src, alt: '' });
                }

                return sync();
            }

            if (actionName === 'update-image') {
                src = window.prompt(prompts.image.label, editor.getActiveFormats().image ? editor.getActiveFormats().image.src : prompts.image.fallback);

                if (src !== null) {
                    editor.updateImage({ src: src });
                }

                return sync();
            }

            if (actionName === 'remove-image') {
                editor.removeImage();
                return sync();
            }

            if (actionName === 'table') {
                rows = Number(window.prompt(prompts.tableRows.label, prompts.tableRows.fallback)) || 2;
                cols = Number(window.prompt(prompts.tableCols.label, prompts.tableCols.fallback)) || 2;
                editor.insertTable({ rows: rows, cols: cols, headerRow: true });
                return sync();
            }

            if (actionName === 'table-row-before' || actionName === 'table-row-after') {
                editor.insertTableRow(actionName === 'table-row-before' ? 'before' : 'after');
                return sync();
            }

            if (actionName === 'remove-table-row') {
                editor.removeTableRow();
                return sync();
            }

            if (actionName === 'table-col-before' || actionName === 'table-col-after') {
                editor.insertTableColumn(actionName === 'table-col-before' ? 'before' : 'after');
                return sync();
            }

            if (actionName === 'remove-table-col') {
                editor.removeTableColumn();
                return sync();
            }

            if (actionName === 'table-header') {
                editor.toggleTableHeaderRow();
                return sync();
            }

            if (actionName === 'remove-table') {
                editor.removeTable();
                return sync();
            }
        }

        function handleStyleControl(control) {
            var propertyName = control.getAttribute('data-style');
            var value = control.value;

            restoreSelection();
            editor.setInlineStyle(propertyName, value);
            saveSelection();
            sync();
        }

        toolbarElement.addEventListener('mousedown', function (event) {
            if (event.target.closest('button, select, input')) {
                saveSelection();
            }

            if (event.target.closest('button, input')) {
                event.preventDefault();
            }
        });

        toolbarElement.addEventListener('click', function (event) {
            var button = event.target.closest('button');

            if (!button) {
                return;
            }

            handleButton(button);
        });

        toolbarElement.addEventListener('change', function (event) {
            var control = event.target.closest('[data-style]');

            if (!control) {
                return;
            }

            if (control.type === 'color' && control.__wysiwygLastInputValue === control.value) {
                control.__wysiwygLastInputValue = null;
                return;
            }

            handleStyleControl(control);
        });

        toolbarElement.addEventListener('input', function (event) {
            var control = event.target.closest('input[data-style]');

            if (!control) {
                return;
            }

            handleStyleControl(control);
            control.__wysiwygLastInputValue = control.value;
        });

        document.addEventListener('selectionchange', function () {
            if (document.activeElement === editorElement || editorElement.contains(document.activeElement)) {
                saveSelection();
                sync();
            }
        });

        editorElement.addEventListener('mouseup', function () {
            saveSelection();
            sync();
        });

        editorElement.addEventListener('keyup', function () {
            saveSelection();
            sync();
        });

        editorElement.addEventListener('input', function () {
            saveSelection();
            editor.recordSnapshot();
            sync();
        });

        editor.normalize();
        sync();

        return {
            editor: editor,
            sync: sync
        };
    }

    return createEditorAdapter;
}));
