(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(
            require('../core/editor-core'),
            require('./toolbar-view'),
            require('./toolbar-config'),
            require('../core/html-utility')
        );
    } else {
        root.createEditorAdapter = factory(
            root.createEditorCore,
            root.createToolbarView,
            root.WysiwygToolbarConfig,
            root.WysiwygHtmlUtility
        );
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (createEditorCore, createToolbarView, toolbarConfig, html) {
    function createEditorAdapter(config) {
        var configOverrides = config.toolbarConfig || {};
        var toolbarSettings = Object.assign({}, toolbarConfig, configOverrides);
        var editorElement = config.editorElement;
        var toolbarElement = config.toolbarElement;
        var editor = createEditorCore(editorElement, config.editorOptions);
        var savedRange = null;
        var tableToolsPopup = null;
        var view;

        toolbarSettings.prompts = Object.assign({}, toolbarConfig.prompts, configOverrides.prompts || {});
        toolbarSettings.toolbar = config.toolbar || toolbarSettings.toolbar;

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

        function promptUser(label, fallback) {
            return window.prompt(label, fallback);
        }

        function showLinkModal(fallback) {
            var modal;
            var title;
            var form;
            var input;
            var resolved = false;
            var prompt = toolbarSettings.prompts.link;

            if (typeof customElements === 'undefined' || !customElements.get('wysiwyg-modal')) {
                return promptUser(prompt.label, fallback);
            }

            modal = document.createElement('wysiwyg-modal');
            modal.showCloseButton = true;
            modal.clickOutsideToClose = true;
            modal.moveable = true;
            modal.innerHTML = [
                '<strong slot="header"></strong>',
                '<form><label><span class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap"></span><input type="url"></label></form>',
                '<span slot="footer"><button type="button" data-action="cancel">Cancel</button> <button type="button" data-action="apply">Apply</button></span>'
            ].join('');
            document.body.appendChild(modal);

            title = modal.querySelector('[slot="header"]');
            form = modal.querySelector('form');
            input = modal.querySelector('input');

            title.textContent = prompt.label;
            modal.querySelector('label span').textContent = prompt.label;
            input.value = fallback || prompt.fallback || '';

            return new Promise(function (resolve) {
                function finish(value) {
                    if (resolved) {
                        return;
                    }

                    resolved = true;
                    modal.close();
                    modal.remove();
                    restoreSelection();
                    resolve(value);
                }

                html.on(modal, 'close', function () {
                    finish(null);
                });
                html.on(form, 'submit', function (event) {
                    event.preventDefault();
                    finish(input.value);
                });
                html.on(modal.querySelector('[data-action="cancel"]'), 'click', function () {
                    finish(null);
                });
                html.on(modal.querySelector('[data-action="apply"]'), 'click', function () {
                    finish(input.value);
                });

                modal.show();
                input.focus();
                input.select();
            });
        }

        function showTablePicker(anchor) {
            var popup;
            var label;
            var grid;
            var maxCols = 10;
            var maxRows = 10;
            var resolved = false;

            if (typeof customElements === 'undefined' || !customElements.get('wysiwyg-popup')) {
                return null;
            }

            popup = document.createElement('wysiwyg-popup');
            popup.preferredPosition = 'bottom-start';
            popup.innerHTML = [
                '<style>',
                '.wysiwyg-table-picker-label{margin:0 0 8px;font:500 12px/1.2 sans-serif;color:#111827}',
                '.wysiwyg-table-picker-grid{display:grid;grid-template-columns:repeat(10,18px);gap:3px}',
                '.wysiwyg-table-picker-cell{width:18px;height:18px;border:1px solid #9ca3af;background:#fff;padding:0;cursor:pointer}',
                '.wysiwyg-table-picker-cell.is-active{border-color:#2563eb;background:#dbeafe}',
                '</style>',
                '<div class="wysiwyg-table-picker-label">1x1 Table</div>',
                '<div class="wysiwyg-table-picker-grid"></div>'
            ].join('');
            document.body.appendChild(popup);

            label = popup.querySelector('.wysiwyg-table-picker-label');
            grid = popup.querySelector('.wysiwyg-table-picker-grid');

            Array.from({ length: maxRows }).forEach(function (_, rowIndex) {
                Array.from({ length: maxCols }).forEach(function (_, colIndex) {
                    var button = document.createElement('button');

                    button.type = 'button';
                    button.className = 'wysiwyg-table-picker-cell';
                    button.setAttribute('data-row', rowIndex + 1);
                    button.setAttribute('data-col', colIndex + 1);
                    button.setAttribute('aria-label', (rowIndex + 1) + ' by ' + (colIndex + 1) + ' table');
                    grid.appendChild(button);
                });
            });

            return new Promise(function (resolve) {
                function setSize(rows, cols) {
                    label.textContent = cols + 'x' + rows + ' Table';
                    Array.from(grid.children).forEach(function (cell) {
                        cell.classList.toggle('is-active', Number(cell.getAttribute('data-row')) <= rows && Number(cell.getAttribute('data-col')) <= cols);
                    });
                }

                function finish(value) {
                    if (resolved) {
                        return;
                    }

                    resolved = true;
                    html.off(document, 'click', outside);
                    html.off(document, 'keydown', keydown);
                    popup.remove();
                    restoreSelection();
                    resolve(value);
                }

                function cellFromEvent(event) {
                    return event.target.closest && event.target.closest('.wysiwyg-table-picker-cell');
                }

                function outside(event) {
                    if (!popup.contains(event.target) && (!anchor || !anchor.contains(event.target))) {
                        finish(null);
                    }
                }

                function keydown(event) {
                    if (event.key === 'Escape') {
                        finish(null);
                    }
                }

                html.on(grid, 'mouseover', function (event) {
                    var cell = cellFromEvent(event);

                    if (cell) {
                        setSize(Number(cell.getAttribute('data-row')), Number(cell.getAttribute('data-col')));
                    }
                });
                html.on(grid, 'click', function (event) {
                    var cell = cellFromEvent(event);

                    if (cell) {
                        finish({
                            rows: Number(cell.getAttribute('data-row')),
                            cols: Number(cell.getAttribute('data-col'))
                        });
                    }
                });
                html.on(document, 'click', outside);
                html.on(document, 'keydown', keydown);

                popup.showFor(anchor);
                setSize(1, 1);
            });
        }

        function createIcon(iconId) {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            var href = (toolbarSettings.iconSpritePath || '') + '#' + (toolbarSettings.iconPrefix || 'wysiwyg-icon-') + iconId;

            svg.classList.add('wysiwyg-table-tool-icon');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('focusable', 'false');
            use.setAttribute('href', href);
            use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);
            svg.appendChild(use);

            return svg;
        }

        function getSelectedTable() {
            var selection = window.getSelection();
            var cell = html.getSelectedElement(selection, 'td') || html.getSelectedElement(selection, 'th');

            return html.getSelectedElement(selection, 'table') || html.getClosestTag(cell, 'table');
        }

        function closeTableTools() {
            if (tableToolsPopup) {
                tableToolsPopup.remove();
                tableToolsPopup = null;
                html.off(document, 'keydown', closeTableToolsOnEscape);
            }
        }

        function closeTableToolsOnEscape(event) {
            if (event.key === 'Escape') {
                closeTableTools();
            }
        }

        function openTableTools(anchor) {
            var actions;
            var tools;

            if (typeof customElements === 'undefined' || !customElements.get('wysiwyg-popup')) {
                return false;
            }

            if (tableToolsPopup) {
                tableToolsPopup.showFor(anchor);
                return true;
            }

            tableToolsPopup = document.createElement('wysiwyg-popup');
            tableToolsPopup.preferredPosition = 'bottom-start';
            tableToolsPopup.innerHTML = [
                '<style>',
                '.wysiwyg-table-tools{display:flex;gap:3px}',
                '.wysiwyg-table-tool{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;border-radius:4px;background:#fff;color:#111827;padding:0;cursor:pointer}',
                '.wysiwyg-table-tool:hover{border-color:#2563eb;background:#dbeafe}',
                '.wysiwyg-table-tool-icon{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;overflow:visible}',
                '</style>',
                '<div class="wysiwyg-table-tools"></div>'
            ].join('');
            document.body.appendChild(tableToolsPopup);
            tools = tableToolsPopup.querySelector('.wysiwyg-table-tools');

            actions = [
                ['rowBefore', 'Row before', 'row-before', function () { editor.insertTableRow('before'); }],
                ['rowAfter', 'Row after', 'row-after', function () { editor.insertTableRow('after'); }],
                ['removeRow', 'Remove row', 'row-remove', function () { editor.removeTableRow(); }],
                ['colBefore', 'Column before', 'column-before', function () { editor.insertTableColumn('before'); }],
                ['colAfter', 'Column after', 'column-after', function () { editor.insertTableColumn('after'); }],
                ['removeCol', 'Remove column', 'column-remove', function () { editor.removeTableColumn(); }],
                ['headerRow', 'Toggle header row', 'header-row', function () { editor.toggleTableHeaderRow(); }],
                ['removeTable', 'Remove table', 'table-remove', function () { editor.removeTable(); }]
            ];

            actions.forEach(function (action) {
                var button = document.createElement('button');

                button.type = 'button';
                button.className = 'wysiwyg-table-tool';
                button.setAttribute('data-action', action[0]);
                button.setAttribute('title', action[1]);
                button.setAttribute('aria-label', action[1]);
                button.appendChild(createIcon(action[2]));
                tools.appendChild(button);
            });

            html.on(tableToolsPopup, 'click', function (event) {
                var button = event.target.closest && event.target.closest('[data-action]');
                var action;

                if (!button) {
                    return;
                }

                action = actions.filter(function (entry) {
                    return entry[0] === button.getAttribute('data-action');
                })[0];

                if (action) {
                    restoreSelection();
                    action[3]();
                    saveSelection();
                    sync();
                }
            });
            html.on(document, 'keydown', closeTableToolsOnEscape);

            tableToolsPopup.showFor(anchor);
            return true;
        }

        function syncTableTools(state) {
            if (state.table) {
                openTableTools(getSelectedTable());
            } else {
                closeTableTools();
            }
        }

        function createContext(entry, event, value) {
            var state = editor.getActiveFormats();

            return {
                editor: editor,
                state: state,
                element: entry ? entry.control : null,
                wrapper: entry ? entry.element : null,
                node: entry ? entry.node : null,
                event: event,
                toolbarElement: toolbarElement,
                value: value,
                saveSelection: saveSelection,
                restoreSelection: restoreSelection,
                sync: sync,
                prompt: promptUser,
                showLinkModal: showLinkModal,
                showTablePicker: showTablePicker,
                settings: toolbarSettings
            };
        }

        function sync() {
            var state = editor.getActiveFormats();

            view.sync(state, {
                editor: editor,
                toolbarElement: toolbarElement,
                saveSelection: saveSelection,
                restoreSelection: restoreSelection,
                sync: sync,
                prompt: promptUser,
                showLinkModal: showLinkModal,
                showTablePicker: showTablePicker,
                settings: toolbarSettings
            });
            syncTableTools(state);
        }

        function runCommand(entry, event, value, options) {
            var commandOptions = options || {};
            var result;

            if (!entry || !entry.node.onCommand) {
                return;
            }

            if (commandOptions.restore !== false) {
                restoreSelection();
            }

            result = entry.node.onCommand(createContext(entry, event, value));

            if (result && typeof result.then === 'function') {
                return result.then(function () {
                    if (commandOptions.saveSelection) {
                        saveSelection();
                    }

                    sync();
                });
            }

            if (commandOptions.saveSelection) {
                saveSelection();
            }

            sync();
        }

        view = createToolbarView(toolbarElement, config.statusElements, {
            toolbar: toolbarSettings.toolbar,
            context: {
                editor: editor,
                toolbarElement: toolbarElement,
                saveSelection: saveSelection,
                restoreSelection: restoreSelection,
                sync: sync,
                prompt: promptUser,
                showLinkModal: showLinkModal,
                showTablePicker: showTablePicker,
                settings: toolbarSettings
            }
        });

        html.on(toolbarElement, 'mousedown', function (event) {
            if (event.target.closest('button, select, input')) {
                saveSelection();
            }

            if (event.target.closest('button, input')) {
                event.preventDefault();
            }
        });

        html.on(toolbarElement, 'click', function (event) {
            var button = event.target.closest('button');
            var entry;

            if (!button) {
                return;
            }

            entry = view.getEntryForElement(button);
            runCommand(entry, event, button.value);
        });

        html.on(toolbarElement, 'change', function (event) {
            var control = event.target.closest('select, input');
            var entry;

            if (!control) {
                return;
            }

            entry = view.getEntryForElement(control);

            if (!entry) {
                return;
            }

            if (control.type === 'color' && control.__wysiwygLastInputValue === control.value) {
                control.__wysiwygLastInputValue = null;
                return;
            }

            runCommand(entry, event, control.value, { saveSelection: control.type === 'color' });
        });

        html.on(toolbarElement, 'input', function (event) {
            var control = event.target.closest('input');
            var entry;

            if (!control) {
                return;
            }

            entry = view.getEntryForElement(control);

            if (!entry) {
                return;
            }

            runCommand(entry, event, control.value, { saveSelection: true });
            control.__wysiwygLastInputValue = control.value;
        });

        html.on(document, 'selectionchange', function () {
            if (document.activeElement === editorElement || editorElement.contains(document.activeElement)) {
                saveSelection();
                sync();
            }
        });

        html.on(editorElement, 'mouseup', function () {
            saveSelection();
            sync();
        });

        html.on(editorElement, 'keyup', function () {
            saveSelection();
            sync();
        });

        html.on(editorElement, 'input', function () {
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
