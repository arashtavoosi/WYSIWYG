(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(
            require('../core/editor-core'),
            require('./toolbar-view')
        );
    } else {
        root.createEditorAdapter = factory(
            root.createEditorCore,
            root.createToolbarView
        );
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (createEditorCore, createToolbarView) {
    function createEditorAdapter(config) {
        var editorElement = config.editorElement;
        var toolbarElement = config.toolbarElement;
        var editor = createEditorCore(editorElement, config.editorOptions);
        var view = createToolbarView(toolbarElement, config.statusElements);

        function sync() {
            view.sync(editor.getActiveFormats());
        }

        function handleButton(button) {
            var inlineName = button.getAttribute('data-inline');
            var blockName = button.getAttribute('data-block');
            var listName = button.getAttribute('data-list');
            var actionName = button.getAttribute('data-action');
            var href;
            var src;
            var rows;
            var cols;

            editorElement.focus();

            if (inlineName) {
                editor.toggleInline(inlineName);
                return sync();
            }

            if (blockName === 'heading') {
                editor.setBlock('heading', { level: Number(button.getAttribute('data-level') || '2') });
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
                href = window.prompt('Link URL', editor.getActiveFormats().link ? editor.getActiveFormats().link.href : 'https://');

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
                src = window.prompt('Image URL', 'https://');

                if (src) {
                    editor.insertImage({ src: src, alt: '' });
                }

                return sync();
            }

            if (actionName === 'table') {
                rows = Number(window.prompt('Table rows', '2')) || 2;
                cols = Number(window.prompt('Table columns', '2')) || 2;
                editor.insertTable({ rows: rows, cols: cols, headerRow: true });
                return sync();
            }
        }

        function handleStyleControl(control) {
            var propertyName = control.getAttribute('data-style');
            var value = control.value;

            editorElement.focus();
            editor.setInlineStyle(propertyName, value);
            sync();
        }

        toolbarElement.addEventListener('mousedown', function (event) {
            if (event.target.closest('button, select, input')) {
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

            handleStyleControl(control);
        });

        document.addEventListener('selectionchange', function () {
            if (document.activeElement === editorElement || editorElement.contains(document.activeElement)) {
                sync();
            }
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