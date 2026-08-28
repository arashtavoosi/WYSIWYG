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
    function createToolbarElement(editorElement) {
        var documentRef = editorElement && editorElement.ownerDocument;
        var toolbarElement;

        if (!editorElement || !editorElement.parentNode || !documentRef) {
            throw new Error('Editor element must be attached before an automatic toolbar can be created');
        }

        toolbarElement = documentRef.createElement('div');
        toolbarElement.setAttribute('editor-toolbar', '');
        editorElement.parentNode.insertBefore(toolbarElement, editorElement);

        return toolbarElement;
    }

    function findAdjacentToolbar(editorElement) {
        var previous = editorElement && editorElement.previousElementSibling;

        if (previous && (
            (previous.hasAttribute && previous.hasAttribute('editor-toolbar')) ||
            (previous.hasAttribute && previous.hasAttribute('data-ravan-toolbar')) ||
            (previous.classList && previous.classList.contains('toolbar'))
        )) {
            previous.setAttribute('editor-toolbar', '');

            if (previous.hasAttribute('data-ravan-toolbar')) {
                previous.removeAttribute('data-ravan-toolbar');
                if (previous.classList) {
                    previous.classList.remove('toolbar');
                }
            }

            return previous;
        }

        return null;
    }

    function createEditorAdapter(config) {
        var configOverrides = config.toolbarConfig || {};
        var toolbarSettings = Object.assign({}, toolbarConfig, configOverrides);
        var editorElement = config.editorElement;
        var toolbarElement = config.toolbarElement || findAdjacentToolbar(editorElement) || createToolbarElement(editorElement);
        var editor = createEditorCore(editorElement, config.editorOptions);
        var savedRange = null;
        var imageToolsPopup = null;
        var tableToolsPopup = null;
        var resizeOverlay = null;
        var tableSelectionOverlay = null;
        var tableSelection = null;
        var expandingTableSelection = false;
        var movingResizeTarget = false;
        var activeResizeTarget = null;
        var view;

        toolbarElement.setAttribute('editor-toolbar', '');

        toolbarSettings.prompts = Object.assign({}, toolbarConfig.prompts, configOverrides.prompts || {});
        toolbarSettings.fileBrowser = Object.assign({}, toolbarConfig.fileBrowser, configOverrides.fileBrowser || {});
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

        function showLinkModal(fallback, targetFallback) {
            var modal;
            var title;
            var form;
            var input;
            var targetInput;
            var resolved = false;
            var prompt = toolbarSettings.prompts.link;
            var targetLabel = prompt.targetLabel || 'Link target';
            var targetValue = targetFallback === undefined || targetFallback === null ? (prompt.targetFallback || '') : targetFallback;

            if (typeof customElements === 'undefined' || !customElements.get('wysiwyg-modal')) {
                var href = promptUser(prompt.label, fallback);

                if (!href) {
                    return href;
                }

                return {
                    href: href,
                    target: promptUser(targetLabel, targetValue) || ''
                };
            }

            modal = document.createElement('wysiwyg-modal');
            modal.showCloseButton = true;
            modal.clickOutsideToClose = true;
            modal.moveable = true;
            modal.innerHTML = [
                '<strong slot="header"></strong>',
                '<form class="wysiwyg-link-form"><label><span class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap"></span><input type="url"></label><label><span></span><select data-field="target"><option value="">No target</option><option value="_self">Same tab or window</option><option value="_blank">New tab or window</option><option value="_parent">Parent frame</option><option value="_top">Top frame</option></select></label></form>',
                '<span slot="footer"><button type="button" data-action="cancel">Cancel</button> <button type="button" data-action="apply">Apply</button></span>'
            ].join('');
            document.body.appendChild(modal);

            title = modal.querySelector('[slot="header"]');
            form = modal.querySelector('form');
            input = modal.querySelector('input[type="url"]');
            targetInput = modal.querySelector('[data-field="target"]');

            title.textContent = prompt.label;
            modal.querySelector('label span').textContent = prompt.label;
            targetInput.previousElementSibling.textContent = targetLabel;
            input.value = fallback || prompt.fallback || '';
            targetInput.value = targetValue;

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
                    finish({ href: input.value, target: targetInput.value });
                });
                html.on(modal.querySelector('[data-action="cancel"]'), 'click', function () {
                    finish(null);
                });
                html.on(modal.querySelector('[data-action="apply"]'), 'click', function () {
                    finish({ href: input.value, target: targetInput.value });
                });

                modal.show();
                input.focus();
                input.select();
            });
        }

        function getDirectoryPath(value) {
            var path;
            var separator;

            if (!value) {
                return '';
            }

            try {
                path = new URL(value, window.location.href).pathname;
            } catch (error) {
                path = String(value).split(/[?#]/)[0];
            }

            path = path.replace(/\/+$/, '');
            separator = path.lastIndexOf('/');
            return separator > 0 ? path.slice(0, separator) : '/';
        }

        function showImageBrowserModal(currentImage) {
            var modal;
            var title;
            var browser;
            var resolved = false;
            var settings = toolbarSettings.fileBrowser || {};
            var prompt = toolbarSettings.prompts.image;
            var rootPath = settings.path || '/';
            var initialPath = getDirectoryPath(currentImage && (currentImage.filePath || currentImage.src)) || rootPath;

            if (typeof customElements === 'undefined' || !customElements.get('wysiwyg-modal') || !customElements.get('wysiwyg-file-browser')) {
                return promptUser(prompt.label, currentImage ? currentImage.src : prompt.fallback);
            }

            modal = document.createElement('wysiwyg-modal');
            modal.showCloseButton = true;
            modal.clickOutsideToClose = true;
            modal.moveable = true;
            modal.innerHTML = [
                '<strong slot="header"></strong>',
                '<wysiwyg-file-browser></wysiwyg-file-browser>',
                '<span slot="footer"><button type="button" data-action="cancel">Cancel</button></span>'
            ].join('');
            document.body.appendChild(modal);

            title = modal.querySelector('[slot="header"]');
            browser = modal.querySelector('wysiwyg-file-browser');
            title.textContent = prompt.label;
            browser.supportedExtensions = settings.supportedExtensions || '';
            browser.viewMode = settings.viewMode || 'thumbnail';

            if (settings.endpoint) {
                browser.endpoint = settings.endpoint;
                browser.load(initialPath).catch(function () {
                    return initialPath === rootPath ? null : browser.load(rootPath);
                }).catch(function () {
                    browser.setData({ path: rootPath, items: [] });
                });
            } else {
                browser.setData({
                    path: initialPath === rootPath ? initialPath : rootPath,
                    breadcrumbs: settings.breadcrumbs || null,
                    items: settings.items || []
                });
            }

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
                html.on(modal.querySelector('[data-action="cancel"]'), 'click', function () {
                    finish(null);
                });
                html.on(browser, 'file-select', function (event) {
                    finish(event.detail.file);
                });

                modal.show();
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

        function createIcon(iconId, className) {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            var href = (toolbarSettings.iconSpritePath || '') + '#' + (toolbarSettings.iconPrefix || 'wysiwyg-icon-') + iconId;

            svg.classList.add(className || 'wysiwyg-table-tool-icon');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('focusable', 'false');
            use.setAttribute('href', href);
            use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);
            svg.appendChild(use);

            return svg;
        }

        function getSelectedCell() {
            var selection = window.getSelection();

            return html.getSelectedElement(selection, 'td') || html.getSelectedElement(selection, 'th');
        }

        function getSelectedImage() {
            return html.getSelectedElement(window.getSelection(), 'img');
        }

        function getImageLayout(image) {
            if (image.style.float === 'left') {
                return 'float-left';
            }

            if (image.style.float === 'right') {
                return 'float-right';
            }

            return image.style.display === 'block' ? 'block' : 'inline';
        }

        function getImageToolTarget() {
            var image = getSelectedImage();

            if (image && editorElement.contains(image)) {
                return image;
            }

            return activeResizeTarget && activeResizeTarget.tagName === 'IMG' && editorElement.contains(activeResizeTarget) ? activeResizeTarget : null;
        }

        function isTableResizeTarget(target) {
            return !!(target && ['TABLE', 'TR', 'TD', 'TH'].indexOf(target.tagName) !== -1);
        }

        function clearStaleTableResizeTarget() {
            if (isTableResizeTarget(activeResizeTarget)) {
                activeResizeTarget = null;
            }
        }

        function getCellsRect(cells) {
            return html.getCombinedRect((cells || []).filter(function (cell) {
                return cell && cell.isConnected;
            }));
        }

        function getRectangleCells(anchor, cell, selected) {
            var table = html.getClosestTag(anchor, 'table');
            var bounds = (selected || []).concat([anchor, cell]);
            var minRow = Math.min.apply(Math, bounds.map(function (item) { return item.parentNode.rowIndex; }));
            var maxRow = Math.max.apply(Math, bounds.map(function (item) { return item.parentNode.rowIndex; }));
            var minColumn = Math.min.apply(Math, bounds.map(function (item) { return item.cellIndex; }));
            var maxColumn = Math.max.apply(Math, bounds.map(function (item) { return item.cellIndex; }));
            var cells = [];
            var rowIndex;
            var columnIndex;

            for (rowIndex = minRow; rowIndex <= maxRow; rowIndex += 1) {
                for (columnIndex = minColumn; columnIndex <= maxColumn; columnIndex += 1) {
                    if (table.rows[rowIndex] && table.rows[rowIndex].cells[columnIndex]) {
                        cells.push(table.rows[rowIndex].cells[columnIndex]);
                    }
                }
            }

            return cells;
        }

        function setTableSelection(cell, mode, expand) {
            var table = cell && html.getClosestTag(cell, 'table');
            var anchor = expand && tableSelection && tableSelection.table === table ? tableSelection.anchor : cell;
            var cells;

            if (!table || !cell) {
                tableSelection = null;
                return;
            }

            cells = expand ? getRectangleCells(anchor, cell, tableSelection && tableSelection.cells) : [cell];
            tableSelection = {
                anchor: anchor,
                cell: cell,
                cells: cells,
                mode: mode || (cells.length > 1 || cell.rowSpan > 1 || cell.colSpan > 1 ? 'multiple' : 'cell'),
                table: table
            };
        }

        function clearTableSelection() {
            tableSelection = null;

            if (tableSelectionOverlay) {
                tableSelectionOverlay.hide();
            }
        }

        function clearFormatting() {
            var elements = [];

            if (tableSelection) {
                elements = tableSelection.mode === 'table' ? [tableSelection.table] :
                    tableSelection.mode === 'row' ? [tableSelection.cell.parentNode] : tableSelection.cells;
            }

            editor.clear(null, { elements: elements });
        }

        function setTableSelectionMode(mode) {
            var cell;
            var table;
            var columnIndex;

            if (!tableSelection) {
                return;
            }

            cell = tableSelection.cell;
            table = tableSelection.table;
            columnIndex = cell.cellIndex;
            tableSelection.mode = mode;
            tableSelection.cells = mode === 'row' ? html.toArray(cell.parentNode.cells) : mode === 'column' ? html.toArray(table.rows).map(function (row) {
                return row.cells[columnIndex];
            }).filter(Boolean) : mode === 'table' ? html.toArray(table.querySelectorAll('th,td')) : [cell];
            activeResizeTarget = mode === 'table' ? table : mode === 'row' ? cell.parentNode : mode === 'cell' || mode === 'column' ? cell : null;
        }

        function selectTableMode(mode) {
            setTableSelectionMode(mode);
            sync();
        }

        function ensureTableSelectionOverlay() {
            if (tableSelectionOverlay || typeof customElements === 'undefined' || !customElements.get('wysiwyg-table-selection')) {
                return tableSelectionOverlay;
            }

            tableSelectionOverlay = document.createElement('wysiwyg-table-selection');
            document.body.appendChild(tableSelectionOverlay);
            html.on(tableSelectionOverlay, 'table-select', function (event) {
                selectTableMode(event.detail.mode);
            });
            return tableSelectionOverlay;
        }

        function syncTableSelectionOverlay(state) {
            var overlay;

            if (!tableSelection || !tableSelection.table.isConnected || state.image || state.link) {
                if (tableSelectionOverlay) {
                    tableSelectionOverlay.hide();
                }
                return;
            }

            overlay = ensureTableSelectionOverlay();

            if (overlay) {
                overlay.showFor(tableSelection);
            }
        }

        function ensureResizeOverlay() {
            if (resizeOverlay || typeof customElements === 'undefined' || !customElements.get('wysiwyg-resize-overlay')) {
                return resizeOverlay;
            }

            resizeOverlay = document.createElement('wysiwyg-resize-overlay');
            resizeOverlay.boundary = editorElement;
            document.body.appendChild(resizeOverlay);
            html.on(resizeOverlay, 'move-start', function () {
                movingResizeTarget = true;
            });
            html.on(resizeOverlay, 'resize-end', function () {
                editor.recordSnapshot();
                sync();
            });
            html.on(resizeOverlay, 'move-end', function (event) {
                activeResizeTarget = event.detail.target;

                if (activeResizeTarget && activeResizeTarget.tagName === 'IMG') {
                    clearTableSelection();
                    html.selectNode(activeResizeTarget);
                    saveSelection();
                }

                editor.recordSnapshot();
                sync();
            });

            return resizeOverlay;
        }

        function syncResizeOverlay(state) {
            var target;
            var overlay;
            var mode = tableSelection && tableSelection.mode;

            if (tableSelection) {
                target = mode === 'table' ? tableSelection.table : mode === 'row' ? tableSelection.cell.parentNode : mode === 'cell' || mode === 'column' ? tableSelection.cell : null;
            } else {
                target = activeResizeTarget || (state.image ? getSelectedImage() : null);
            }

            if (!target || !editorElement.contains(target)) {
                if (resizeOverlay) {
                    resizeOverlay.hide();
                }

                return;
            }

            overlay = ensureResizeOverlay();

            if (overlay) {
                overlay.showFor(target, {
                    frame: mode === 'column' ? tableSelection.cells : null,
                    moveable: tableSelection ? mode === 'table' : true,
                    resizable: !tableSelection || mode !== 'multiple',
                    resizeAxis: mode === 'row' ? 'y' : mode === 'column' ? 'x' : null
                });
            }
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

        function tableActionEnabled(name) {
            var section;

            if (!tableSelection) {
                return false;
            }

            if (name === 'merge') {
                section = tableSelection.cells[0] && tableSelection.cells[0].parentNode.parentNode;
                return tableSelection.cells.length > 1 && tableSelection.cells.every(function (cell) {
                    return cell.rowSpan === 1 && cell.colSpan === 1 && cell.parentNode.parentNode === section;
                });
            }

            if (name === 'unmerge') {
                return tableSelection.cells.length === 1 && (tableSelection.cell.rowSpan > 1 || tableSelection.cell.colSpan > 1);
            }

            return true;
        }

        function tableActionActive(name) {
            return name === 'fullSize' && tableSelection && tableSelection.table.style.width === '100%';
        }

        function syncTableToolButton(button) {
            var name = button.getAttribute('data-action');

            button.disabled = !tableActionEnabled(name);
            button.setAttribute('aria-pressed', tableActionActive(name) ? 'true' : 'false');
        }

        function openTableTools(anchor, mode) {
            var actions;
            var tools;
            var actionMap;
            var actionNames;

            if (typeof customElements === 'undefined' || !customElements.get('wysiwyg-popup')) {
                return false;
            }

            if (tableToolsPopup) {
                if (tableToolsPopup.getAttribute('data-mode') === mode) {
                    html.toArray(tableToolsPopup.querySelectorAll('[data-action]')).forEach(syncTableToolButton);
                    tableToolsPopup.showFor(anchor);
                    return true;
                }

                closeTableTools();
            }

            tableToolsPopup = document.createElement('wysiwyg-popup');
            tableToolsPopup.preferredPosition = 'bottom-start';
            tableToolsPopup.setAttribute('data-mode', mode);
            tableToolsPopup.innerHTML = [
                '<style>',
                '.wysiwyg-table-tools{display:flex;gap:3px}',
                '.wysiwyg-table-tool{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;border-radius:4px;background:#fff;color:#111827;padding:0;cursor:pointer}',
                '.wysiwyg-table-tool:hover,.wysiwyg-table-tool[aria-pressed="true"]{border-color:#2563eb;background:#dbeafe}',
                '.wysiwyg-table-tool:disabled{opacity:.4;cursor:default;background:#fff;border-color:transparent}',
                '.wysiwyg-table-tool-icon{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;overflow:visible}',
                '</style>',
                '<div class="wysiwyg-table-tools"></div>'
            ].join('');
            document.body.appendChild(tableToolsPopup);
            tools = tableToolsPopup.querySelector('.wysiwyg-table-tools');
            actionMap = {
                rowBefore: ['rowBefore', 'Row before', 'row-before', function () { editor.insertTableRow('before'); }],
                rowAfter: ['rowAfter', 'Row after', 'row-after', function () { editor.insertTableRow('after'); }],
                removeRow: ['removeRow', 'Remove row', 'row-remove', function () { editor.removeTableRow(); }],
                colBefore: ['colBefore', 'Column before', 'column-before', function () { editor.insertTableColumn('before'); }],
                colAfter: ['colAfter', 'Column after', 'column-after', function () { editor.insertTableColumn('after'); }],
                removeCol: ['removeCol', 'Remove column', 'column-remove', function () { editor.removeTableColumn(); }],
                headerRow: ['headerRow', 'Toggle header row', 'header-row', function () { editor.toggleTableHeaderRow(); }],
                fullSize: ['fullSize', 'Full-size table', 'table-full-size', function () { editor.toggleTableFullSize(); }],
                removeTable: ['removeTable', 'Remove table', 'table-remove', function () { editor.removeTable(); }],
                merge: ['merge', 'Merge cells', 'merge-cells', function () { editor.mergeTableCells(tableSelection.cells); }],
                unmerge: ['unmerge', 'Unmerge cells', 'unmerge-cells', function () { editor.unmergeTableCell(tableSelection.cell); }]
            };
            actionNames = {
                cell: ['rowBefore', 'rowAfter', 'colBefore', 'colAfter'],
                multiple: ['merge', 'unmerge'],
                row: ['rowBefore', 'rowAfter', 'removeRow'],
                column: ['colBefore', 'colAfter', 'removeCol'],
                table: ['headerRow', 'fullSize', 'removeTable']
            }[mode] || [];
            actions = actionNames.map(function (name) { return actionMap[name]; });

            actions.forEach(function (action) {
                var button = document.createElement('button');

                button.type = 'button';
                button.className = 'wysiwyg-table-tool';
                button.setAttribute('data-action', action[0]);
                button.setAttribute('title', action[1]);
                button.setAttribute('aria-label', action[1]);
                syncTableToolButton(button);
                button.appendChild(createIcon(action[2]));
                tools.appendChild(button);
            });

            html.on(tableToolsPopup, 'click', function (event) {
                var button = event.target.closest && event.target.closest('[data-action]');
                var action;
                var previousMode;
                var selectedCell;

                if (!button || button.disabled) {
                    return;
                }

                action = actions.filter(function (entry) {
                    return entry[0] === button.getAttribute('data-action');
                })[0];

                if (action) {
                    previousMode = tableSelection && tableSelection.mode;
                    restoreSelection();
                    action[3]();
                    saveSelection();
                    selectedCell = getSelectedCell();

                    if (selectedCell && editorElement.contains(selectedCell)) {
                        setTableSelection(selectedCell);

                        if (action[0] !== 'merge' && action[0] !== 'unmerge') {
                            setTableSelectionMode(previousMode);
                        }
                    } else {
                        clearTableSelection();
                    }

                    sync();
                }
            });
            html.on(document, 'keydown', closeTableToolsOnEscape);
            tableToolsPopup.showFor(anchor);
            return true;
        }

        function syncTableTools(state) {
            var anchor;

            if (tableSelection && !state.image && !state.link) {
                anchor = tableSelection.mode === 'table' ? tableSelection.table : getCellsRect(tableSelection.cells);
                openTableTools(anchor, tableSelection.mode);
            } else {
                closeTableTools();
            }
        }

        function closeImageTools() {
            if (imageToolsPopup) {
                imageToolsPopup.remove();
                imageToolsPopup = null;
                html.off(document, 'keydown', closeImageToolsOnEscape);
            }
        }

        function closeImageToolsOnEscape(event) {
            if (event.key === 'Escape') {
                closeImageTools();
            }
        }

        function syncImageToolControls(image) {
            var fullSize = imageToolsPopup.querySelector('[data-action="fullSize"]');
            var objectFit = imageToolsPopup.querySelector('[data-style="objectFit"]');
            var layout = imageToolsPopup.querySelector('[data-style="layout"]');

            fullSize.setAttribute('aria-pressed', image.style.width === '100%' ? 'true' : 'false');
            objectFit.value = image.style.objectFit || '';
            layout.value = getImageLayout(image);
        }

        function openImageTools(image) {
            if (typeof customElements === 'undefined' || !customElements.get('wysiwyg-popup')) {
                return false;
            }

            if (!imageToolsPopup) {
                imageToolsPopup = document.createElement('wysiwyg-popup');
                imageToolsPopup.preferredPosition = 'bottom-start';
                imageToolsPopup.setAttribute('data-mode', 'image');
                imageToolsPopup.innerHTML = [
                    '<style>',
                    '.wysiwyg-image-tools{display:grid;gap:8px;min-width:190px}',
                    '.wysiwyg-image-tool{display:flex;align-items:center;gap:7px;width:100%;height:30px;border:1px solid #d1d5db;border-radius:4px;background:#fff;color:#111827;padding:0 8px;cursor:pointer;font:500 12px/1.2 system-ui,sans-serif}',
                    '.wysiwyg-image-tool:hover,.wysiwyg-image-tool[aria-pressed="true"]{border-color:#2563eb;background:#dbeafe}',
                    '.wysiwyg-image-tool-icon{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;overflow:visible}',
                    '.wysiwyg-image-tools label{display:grid;gap:3px;color:#475569;font:500 12px/1.2 system-ui,sans-serif}',
                    '.wysiwyg-image-tools select{width:100%;height:30px;padding:0 24px 0 8px;border:1px solid #d1d5db;border-radius:4px;background:#fff;color:#111827;font:inherit}',
                    '</style>',
                    '<div class="wysiwyg-image-tools">',
                    '<button type="button" class="wysiwyg-image-tool" data-action="fullSize" title="Full-size image" aria-label="Full-size image" aria-pressed="false"></button>',
                    '<label><span>Object fit</span><select data-style="objectFit" aria-label="Object fit"><option value="">Default</option><option value="fill">Fill</option><option value="contain">Contain</option><option value="cover">Cover</option><option value="none">None</option><option value="scale-down">Scale down</option></select></label>',
                    '<label><span>Layout</span><select data-style="layout" aria-label="Image layout"><option value="inline">Inline</option><option value="block">Block</option><option value="float-left">Float left</option><option value="float-right">Float right</option></select></label>',
                    '</div>'
                ].join('');
                imageToolsPopup.querySelector('[data-action="fullSize"]').appendChild(createIcon('image-full-size', 'wysiwyg-image-tool-icon'));
                imageToolsPopup.querySelector('[data-action="fullSize"]').appendChild(document.createTextNode('Full-size'));
                document.body.appendChild(imageToolsPopup);
                html.on(imageToolsPopup, 'click', function (event) {
                    var button = event.target.closest && event.target.closest('[data-action="fullSize"]');

                    if (!button) {
                        return;
                    }

                    restoreSelection();
                    editor.toggleImageFullSize();
                    saveSelection();
                    sync();
                });
                html.on(imageToolsPopup, 'change', function (event) {
                    var control = event.target.closest && event.target.closest('[data-style]');

                    if (!control) {
                        return;
                    }

                    restoreSelection();

                    if (control.getAttribute('data-style') === 'objectFit') {
                        editor.setImageStyle('objectFit', control.value);
                    } else {
                        editor.setImageLayout(control.value);
                    }

                    saveSelection();
                    sync();
                });
                html.on(document, 'keydown', closeImageToolsOnEscape);
            }

            syncImageToolControls(image);
            imageToolsPopup.showFor(image);
            return true;
        }

        function syncImageTools(state) {
            var image = state.image ? getImageToolTarget() : null;

            if (!image || !editorElement.contains(image)) {
                closeImageTools();
                return;
            }

            openImageTools(image);
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
                showImageBrowserModal: showImageBrowserModal,
                showTablePicker: showTablePicker,
                clearFormatting: clearFormatting,
                settings: toolbarSettings
            };
        }

        function syncTableSelectionState(state) {
            var cell;
            var table;

            if (state.image || state.link) {
                clearTableSelection();
                clearStaleTableResizeTarget();
                return;
            }

            if (!state.table) {
                if (!expandingTableSelection) {
                    clearTableSelection();
                    clearStaleTableResizeTarget();
                }
                return;
            }

            cell = getSelectedCell();
            table = cell && html.getClosestTag(cell, 'table');

            if (!cell || !table || !editorElement.contains(table)) {
                clearTableSelection();
                clearStaleTableResizeTarget();
                return;
            }

            if (!tableSelection || !tableSelection.table.isConnected || tableSelection.table !== table) {
                setTableSelection(cell);
                activeResizeTarget = cell;
            }
        }

        function sync() {
            var state = editor.getActiveFormats();

            syncTableSelectionState(state);
            view.sync(state, {
                editor: editor,
                toolbarElement: toolbarElement,
                saveSelection: saveSelection,
                restoreSelection: restoreSelection,
                sync: sync,
                prompt: promptUser,
                showLinkModal: showLinkModal,
                showImageBrowserModal: showImageBrowserModal,
                showTablePicker: showTablePicker,
                settings: toolbarSettings
            });
            syncTableTools(state);
            syncImageTools(state);
            syncResizeOverlay(state);
            syncTableSelectionOverlay(state);
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
                showImageBrowserModal: showImageBrowserModal,
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

                if (tableSelection && !expandingTableSelection && !editor.getActiveFormats().table) {
                    clearTableSelection();
                }

                sync();
            }
        });

        html.on(editorElement, 'mousedown', function (event) {
            var cell = event.target.closest && event.target.closest('th,td');

            expandingTableSelection = !!(cell && (event.ctrlKey || event.metaKey) && tableSelection && tableSelection.table === html.getClosestTag(cell, 'table'));
        });

        html.on(editorElement, 'mouseup', function (event) {
            var image = event.target.closest && event.target.closest('img');
            var link = event.target.closest && event.target.closest('a');
            var cell = event.target.closest && event.target.closest('th,td');

            if (movingResizeTarget && resizeOverlay && resizeOverlay.target) {
                activeResizeTarget = resizeOverlay.target;
                clearTableSelection();

                if (activeResizeTarget.tagName === 'IMG') {
                    html.selectNode(activeResizeTarget);
                }

                movingResizeTarget = false;
                saveSelection();
                sync();
                return;
            }

            if (image) {
                clearTableSelection();
                activeResizeTarget = image;
                html.selectNode(image);
            } else if (link && cell) {
                clearTableSelection();
                activeResizeTarget = null;
            } else if (cell) {
                setTableSelection(cell, null, event.ctrlKey || event.metaKey);
                activeResizeTarget = tableSelection.mode === 'cell' ? cell : null;

                if (getSelectedCell() !== cell) {
                    html.moveSelectionToNodeStart(cell);
                }
            } else {
                clearTableSelection();
                activeResizeTarget = null;
            }

            expandingTableSelection = false;
            saveSelection();
            sync();
        });

        html.on(document, 'mouseup', function () {
            expandingTableSelection = false;
            movingResizeTarget = false;
        });

        html.on(editorElement, 'keyup', function () {
            activeResizeTarget = null;
            saveSelection();

            if (!editor.getActiveFormats().table) {
                clearTableSelection();
            }

            sync();
        });

        html.on(editorElement, 'input', function () {
            activeResizeTarget = null;
            saveSelection();
            editor.recordSnapshot();
            sync();
        });

        editor.normalize();
        sync();

        return {
            editor: editor,
            sync: sync,
            editorElement: editorElement,
            toolbarElement: toolbarElement
        };
    }

    return createEditorAdapter;
}));
