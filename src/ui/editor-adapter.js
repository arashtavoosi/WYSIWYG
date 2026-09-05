(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(
            require('../core/editor-core'),
            require('./toolbar/view'),
            require('./toolbar/controller'),
            require('./dialogs/service'),
            require('./overlays/manager'),
            require('../editor-config'),
            require('../core/html-utility'),
            require('./code-view')
        );
    } else {
        root.createEditorAdapter = factory(
            root.createEditorCore,
            root.createToolbarView,
            root.createToolbarController,
            root.createRavanDialogService,
            root.createRavanOverlayManager,
            root.RavanEditorConfig,
            root.WysiwygHtmlUtility,
            root.WysiwygCodeView
        );
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (createEditorCore, createToolbarView, createToolbarController, createDialogService, createOverlayManager, editorConfig, html, codeView) {
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

    function createEditorAdapter(input) {
        var config = editorConfig.normalize(input);
        config.codeView.enabled = config.codeView.enabled && !!codeView;
        var elements = config.elements;
        var editorElement = elements.editor;
        var toolbarElement = elements.toolbar || findAdjacentToolbar(editorElement) || createToolbarElement(editorElement);
        var editor = createEditorCore(editorElement, config.editor);
        config.elements.status = html.parseSelectorOrElements(config.elements.status, editorElement.ownerDocument)[0] || null;
        var savedRange = null;
        var destroyed = false;
        var composing = false;
        var listeners = [];

        function on(target, type, handler, options) {
            html.on(target, type, handler, options);
            if (target === document || target === editorElement) {
                listeners.push([target, type, handler, options]);
            }
        }

        function off(target, type, handler, options) {
            html.off(target, type, handler, options);
            listeners = listeners.filter(function (entry) {
                return entry[0] !== target || entry[1] !== type || entry[2] !== handler;
            });
        }

        var mediaToolsPopup = null;
        var tableToolsPopup = null;
        var resizeOverlay = null;
        var tableSelectionOverlay = null;
        var tableSelection = null;
        var expandingTableSelection = false;
        var movingResizeTarget = false;
        var activeResizeTarget = null;
        var codeViewElement = null;
        var codeViewOpen = false;
        var codeViewDirty = false;
        var editorWasHidden = false;
        var findReplaceModal = null;
        var view;
        var toolbarController;
        var dialogs;
        var overlays;

        toolbarElement.setAttribute('editor-toolbar', '');
        dialogs = createDialogService({
            document: editorElement.ownerDocument || document,
            restoreSelection: restoreSelection
        });
        overlays = createOverlayManager({
            document: editorElement.ownerDocument || document
        });

        config.findReplace.enabled = config.findReplace.enabled && overlays.canCreate('wysiwyg-modal');

        function selectionIsInEditor(selection) {
            var range;

            if (!selection || selection.rangeCount === 0) {
                return false;
            }

            range = selection.getRangeAt(0);

            return editorElement.contains(range.commonAncestorContainer);
        }

        function saveSelection() {
            if (destroyed) { return; }
            var selection = window.getSelection();

            if (selectionIsInEditor(selection)) {
                savedRange = selection.getRangeAt(0).cloneRange();
            }
        }

        function restoreSelection() {
            if (destroyed) { return; }
            var selection;

            if (!savedRange) {
                return;
            }

            editorElement.focus();
            selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedRange);
        }

        function getCodeViewSettings() {
            var settings = config.codeView || {};

            return {
                mode: settings.mode === 'only' ? 'only' : 'after',
                editable: !!settings.editable,
                live: !!settings.live
            };
        }

        function isCodeViewOnly() {
            return codeViewOpen && getCodeViewSettings().mode === 'only';
        }

        function ensureCodeView() {
            if (codeViewElement || !codeView || !codeView.createCodeView) {
                return codeViewElement;
            }

            codeViewElement = codeView.createCodeView(editorElement.ownerDocument || document);
            codeViewElement.addEventListener('code-input', handleCodeViewInput);
            editorElement.parentNode.insertBefore(codeViewElement, editorElement.nextSibling);
            return codeViewElement;
        }

        function handleCodeViewInput() {
            var settings = getCodeViewSettings();
            var value = codeViewElement.getValue();

            codeViewDirty = true;
            savedRange = null;

            if (settings.editable && settings.live) {
                editor.setHtml(value);
            }

            sync();
        }

        function openCodeView() {
            var settings = getCodeViewSettings();

            if (!ensureCodeView()) {
                return false;
            }

            saveSelection();
            codeViewElement.setMode(settings.mode);
            codeViewElement.setEditable(settings.editable);
            codeViewElement.setValue(editor.getHtml());
            codeViewElement.show();
            codeViewDirty = false;
            codeViewOpen = true;

            if (settings.mode === 'only') {
                editorWasHidden = editorElement.hidden;
                editorElement.hidden = true;
            }

            return true;
        }

        function closeCodeView() {
            var settings;

            if (!codeViewOpen) {
                return false;
            }

            settings = getCodeViewSettings();

            if (settings.editable && !settings.live && codeViewDirty) {
                editor.setHtml(codeViewElement.getValue());
                savedRange = null;
            }

            codeViewOpen = false;
            codeViewElement.hide();
            editorElement.hidden = editorWasHidden;

            if (!editorElement.hidden) {
                if (savedRange) {
                    restoreSelection();
                } else {
                    html.placeCaretInside(editorElement);
                }
            }

            codeViewDirty = false;
            return true;
        }

        function toggleCodeView() {
            if (destroyed) { return false; }
            if (!config.codeView.enabled) {
                return false;
            }

            return codeViewOpen ? closeCodeView() : openCodeView();
        }

        function syncCodeView() {
            var settings;
            var value;

            if (!codeViewOpen || !codeViewElement) {
                return;
            }

            settings = getCodeViewSettings();
            codeViewElement.setMode(settings.mode);
            codeViewElement.setEditable(settings.editable);

            if (!codeViewElement.isFocused() && (!codeViewDirty || settings.live)) {
                value = editor.getHtml();

                if (codeViewElement.getValue() !== value) {
                    codeViewElement.setValue(value);
                }

                codeViewDirty = false;
            }
        }

        function showCodeBlockModal(currentCodeBlock) {
            var result = dialogs.showInsertModal('Insert Code Block', '<label><span>Code</span><textarea data-field="code" rows="8"></textarea></label><label><span>Language</span><input data-field="language" type="text" placeholder="optional"></label>', '[data-field="code"]', function (modal) {
                return {
                    code: modal.querySelector('[data-field="code"]').value,
                    language: modal.querySelector('[data-field="language"]').value
                };
            }, function (modal) {
                if (currentCodeBlock) {
                    modal.querySelector('[data-field="code"]').value = currentCodeBlock.code || '';
                    modal.querySelector('[data-field="language"]').value = currentCodeBlock.language || '';
                }
            });

            return result || (typeof customElements !== 'undefined' && customElements.get('wysiwyg-modal') ? null : {
                code: dialogs.prompt('Code', currentCodeBlock ? currentCodeBlock.code : ''),
                language: dialogs.prompt('Language', currentCodeBlock ? currentCodeBlock.language : '')
            });
        }

        function showLinkModal(fallback, targetFallback) {
            var modal;
            var title;
            var form;
            var input;
            var targetInput;
            var resolved = false;
            var prompt = config.dialogs.prompts.link;
            var targetLabel = prompt.targetLabel || 'Link target';
            var targetValue = targetFallback === undefined || targetFallback === null ? (prompt.targetFallback || '') : targetFallback;

            if (typeof customElements === 'undefined' || !customElements.get('wysiwyg-modal')) {
                var href = dialogs.prompt(prompt.label, fallback);

                if (!href) {
                    return href;
                }

                return {
                    href: href,
                    target: dialogs.prompt(targetLabel, targetValue) || ''
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
            document.body.appendChild(overlays.track(modal));

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
                    overlays.remove(modal);
                    restoreSelection();
                    resolve(value);
                }

                on(modal, 'close', function () {
                    finish(null);
                });
                on(form, 'submit', function (event) {
                    event.preventDefault();
                    finish({ href: input.value, target: targetInput.value });
                });
                on(modal.querySelector('[data-action="cancel"]'), 'click', function () {
                    finish(null);
                });
                on(modal.querySelector('[data-action="apply"]'), 'click', function () {
                    finish({ href: input.value, target: targetInput.value });
                });

                modal.show();
                input.focus();
                input.select();
            });
        }

        function showFindReplaceModal() {
            var modal;
            var form;
            var findInput;
            var replaceInput;
            var status;
            var closing = false;

            if (findReplaceModal) {
                findReplaceModal.show();
                findReplaceModal.querySelector('[data-field="find"]').focus();
                return findReplaceModal;
            }

            if (typeof customElements === 'undefined' || !customElements.get('wysiwyg-modal')) {
                return null;
            }

            modal = document.createElement('wysiwyg-modal');
            modal.showCloseButton = true;
            modal.clickOutsideToClose = true;
            modal.moveable = true;
            modal.noBackdrop = true;
            modal.innerHTML = [
                '<strong slot="header">Find and Replace</strong>',
                '<form class="wysiwyg-link-form"><label><span>Find</span><input data-field="find" type="search"></label><label><span>Replace with</span><input data-field="replace" type="text"></label></form>',
                '<span slot="footer"><span data-field="status" aria-live="polite"></span> <button type="button" data-action="replace-all">Replace all</button> <button type="button" data-action="replace">Replace</button> <button type="submit" form="wysiwyg-find-replace-form">Find next</button></span>'
            ].join('');
            document.body.appendChild(overlays.track(modal));
            findReplaceModal = modal;
            form = modal.querySelector('form');
            form.id = 'wysiwyg-find-replace-form';
            findInput = modal.querySelector('[data-field="find"]');
            replaceInput = modal.querySelector('[data-field="replace"]');
            status = modal.querySelector('[data-field="status"]');

            function findNext() {
                restoreSelection();
                status.textContent = editor.findText(findInput.value) ? 'Match found' : 'No match';
                saveSelection();
                restoreSelection();
            }

            function replace(all) {
                var count;

                restoreSelection();

                if (!all && !editor.replaceText(findInput.value, replaceInput.value)) {
                    editor.findText(findInput.value);
                }

                count = editor.replaceText(findInput.value, replaceInput.value, { all: all });
                status.textContent = count ? count + (count === 1 ? ' match replaced' : ' matches replaced') : 'No match';

                if (!all && count) {
                    editor.findText(findInput.value);
                }

                saveSelection();
                sync();
                restoreSelection();
            }

            on(form, 'submit', function (event) {
                event.preventDefault();
                findNext();
            });
            on(modal.querySelector('[data-action="replace"]'), 'click', function () {
                replace(false);
            });
            on(modal.querySelector('[data-action="replace-all"]'), 'click', function () {
                replace(true);
            });
            on(modal, 'close', function () {
                if (closing) {
                    return;
                }

                closing = true;
                findReplaceModal = null;
                overlays.remove(modal);
                restoreSelection();
            });

            modal.show();
            findInput.focus();
            return modal;
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

        function mediaFilters(settings) {
            var supported = settings.supportedExtensions;
            var types = ['image', 'video', 'audio'];

            if (!supported) {
                return [];
            }

            if (typeof supported !== 'object' || Array.isArray(supported)) {
                return [{ value: 'image', label: 'Image', iconId: 'image', extensions: supported }];
            }

            return types.map(function (type) {
                return {
                    value: type,
                    label: type.charAt(0).toUpperCase() + type.slice(1),
                    iconId: type,
                    extensions: supported[type] || ''
                };
            }).filter(function (filter) {
                return filter.extensions;
            });
        }

        function mediaExtensions(settings) {
            var supported = settings.supportedExtensions;

            if (!supported || typeof supported !== 'object' || Array.isArray(supported)) {
                return supported || '';
            }

            return Object.keys(supported).map(function (type) {
                return supported[type];
            }).filter(Boolean).join(',');
        }

        function syncMediaFilterButtons(container, browser) {
            var active = browser.activeFilters || [];

            Array.prototype.forEach.call(container.querySelectorAll('[data-filter]'), function (button) {
                var selected = active.indexOf(button.getAttribute('data-filter')) !== -1;

                button.setAttribute('aria-pressed', String(selected));
                button.style.borderColor = selected ? '#2563eb' : '#d1d5db';
                button.style.backgroundColor = selected ? '#dbeafe' : '#fff';
            });
        }

        function renderMediaFilterButtons(container, browser, filters) {
            if (!container) {
                return;
            }

            container.innerHTML = '';
            filters.forEach(function (filter) {
                var button = document.createElement('button');
                var icon;

                button.type = 'button';
                button.setAttribute('data-filter', filter.value);
                button.setAttribute('aria-label', filter.label || filter.value);
                button.setAttribute('title', filter.label || filter.value);
                button.style.cssText = 'display:grid;place-items:center;width:30px;height:30px;padding:0;border:1px solid #d1d5db;border-radius:4px;background:#fff;color:#111827;cursor:pointer';

                if (filter.iconId) {
                    icon = createIcon(filter.iconId, 'wysiwyg-media-filter-icon');
                    icon.style.cssText = 'width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round';
                    button.appendChild(icon);
                } else {
                    button.textContent = filter.label || filter.value;
                }

                on(button, 'click', function (event) {
                    event.preventDefault();
                    browser.toggleFilter(filter.value);
                    syncMediaFilterButtons(container, browser);
                });
                container.appendChild(button);
            });

            syncMediaFilterButtons(container, browser);
        }

        function showMediaBrowserModal(type, currentMedia) {
            var modal;
            var title;
            var browser;
            var resolved = false;
            var settings = config.media.fileBrowser || {};
            var requestedType = typeof type === 'string' ? type : '';
            var selectedType;
            var prompt;
            var filters;
            var visibleExtensions;
            var filterContainer;
            var rootPath = settings.path || '/';
            var initialPath;

            if (type && typeof type === 'object' && currentMedia === undefined) {
                currentMedia = type;
                requestedType = '';
            }

            selectedType = currentMedia && currentMedia.type || requestedType;
            prompt = (requestedType && config.dialogs.prompts[requestedType]) || config.dialogs.prompts.media || {
                label: 'Media URL',
                fallback: 'https://'
            };
            filters = mediaFilters(settings);
            visibleExtensions = requestedType && settings.supportedExtensions && typeof settings.supportedExtensions === 'object' && !Array.isArray(settings.supportedExtensions) ? settings.supportedExtensions[requestedType] : mediaExtensions(settings);

            initialPath = getDirectoryPath(currentMedia && (currentMedia.filePath || currentMedia.src)) || rootPath;

            if (typeof customElements === 'undefined' || !customElements.get('wysiwyg-modal') || !customElements.get('wysiwyg-file-browser')) {
                return dialogs.prompt(prompt.label, currentMedia ? currentMedia.src : prompt.fallback);
            }

            modal = document.createElement('wysiwyg-modal');
            modal.showCloseButton = true;
            modal.clickOutsideToClose = true;
            modal.moveable = true;
            modal.innerHTML = [
                '<strong slot="header"></strong>',
                '<wysiwyg-file-browser></wysiwyg-file-browser>',
                '<span slot="footer" style="align-items:center;justify-content:space-between;width:100%"><span class="media-filters" role="group" aria-label="Filter files" style="display:flex;gap:4px"></span><button type="button" data-action="cancel">Cancel</button></span>'
            ].join('');
            document.body.appendChild(overlays.track(modal));

            title = modal.querySelector('[slot="header"]');
            browser = modal.querySelector('wysiwyg-file-browser');
            filterContainer = modal.querySelector('.media-filters');
            title.textContent = prompt.label;
            browser.supportedExtensions = visibleExtensions || '';
            browser.filters = filters;
            browser.filterPlacement = 'external';
            browser.activeFilters = selectedType ? [selectedType] : [];
            browser.iconSpritePath = config.assets.icons.url || '';
            browser.iconPrefix = config.assets.icons.prefix || 'wysiwyg-icon-';
            browser.viewMode = settings.viewMode || 'thumbnail';
            renderMediaFilterButtons(filterContainer, browser, filters);

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
                    overlays.remove(modal);
                    restoreSelection();
                    resolve(value);
                }

                on(modal, 'close', function () {
                    finish(null);
                });
                on(modal.querySelector('[data-action="cancel"]'), 'click', function () {
                    finish(null);
                });
                on(browser, 'file-select', function (event) {
                    var file = event.detail.file;
                    var activeFilters = browser.activeFilters || [];

                    if (file && activeFilters.length === 1 && !file.mediaType) {
                        file = Object.assign({}, file, { mediaType: activeFilters[0] });
                    }

                    finish(file);
                });

                modal.show();
            });
        }

        function showImageBrowserModal(currentImage) {
            return showMediaBrowserModal('image', currentImage);
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
            document.body.appendChild(overlays.track(popup));

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
                overlays.track(popup, function () { finish(null); });

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
                    off(document, 'click', outside);
                    off(document, 'keydown', keydown);
                    overlays.remove(popup);
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

                on(grid, 'mouseover', function (event) {
                    var cell = cellFromEvent(event);

                    if (cell) {
                        setSize(Number(cell.getAttribute('data-row')), Number(cell.getAttribute('data-col')));
                    }
                });
                on(grid, 'click', function (event) {
                    var cell = cellFromEvent(event);

                    if (cell) {
                        finish({
                            rows: Number(cell.getAttribute('data-row')),
                            cols: Number(cell.getAttribute('data-col'))
                        });
                    }
                });
                on(document, 'click', outside);
                on(document, 'keydown', keydown);

                popup.showFor(anchor);
                setSize(1, 1);
            });
        }

        function createIcon(iconId, className) {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            var href = (config.assets.icons.url || '') + '#' + (config.assets.icons.prefix || 'wysiwyg-icon-') + iconId;

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

        function getSelectedMedia() {
            return html.getSelectedElement(window.getSelection(), ['img', 'video', 'audio']);
        }

        function isMediaElement(element) {
            return !!(element && ['IMG', 'VIDEO', 'AUDIO'].indexOf(element.tagName) !== -1);
        }

        function getMediaFromEvent(event) {
            var target = event && event.target;
            var media = target && target.closest && target.closest('img,video,audio');
            var path;
            var index;

            if (media) {
                return media;
            }

            path = event && event.composedPath ? event.composedPath() : [];
            for (index = 0; index < path.length; index += 1) {
                if (isMediaElement(path[index])) {
                    return path[index];
                }
            }

            return null;
        }

        function selectInsertedMedia(type) {
            var selection = window.getSelection();
            var range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
            var node = range && range.startContainer && range.startContainer.childNodes ? range.startContainer.childNodes[range.startOffset - 1] : null;
            var tagName = type === 'image' ? 'IMG' : String(type || '').toUpperCase();

            if (!node || node.tagName !== tagName || !editorElement.contains(node)) {
                return null;
            }

            activeResizeTarget = node;
            html.selectNode(node, selection);
            saveSelection();
            return node;
        }

        function selectMediaElement(media) {
            if (!media) {
                return false;
            }

            clearTableSelection();
            activeResizeTarget = media;
            html.selectNode(media);
            return true;
        }

        function getKeyboardResizeTarget(event) {
            var target = resizeOverlay && resizeOverlay.open ? resizeOverlay.target : null;
            var eventTarget = event && event.target;
            var focused = document.activeElement;
            var controls = [resizeOverlay, tableSelectionOverlay, tableToolsPopup, mediaToolsPopup];
            var wholeTable = tableSelection && tableSelection.mode === 'table' && tableSelection.table === target;
            var inEditor = editorElement.contains(eventTarget) || editorElement.contains(focused);
            var inControl = controls.some(function (control) {
                return control && (control === eventTarget || control === focused || control.contains(eventTarget) || control.contains(focused));
            });

            return target && editorElement.contains(target) && (inEditor || inControl || wholeTable) ? target : null;
        }

        function removeResizeTarget(target) {
            var table = target.tagName === 'TABLE' ? target : html.getClosestTag(target, 'table');
            var wholeTable = table && tableSelection && tableSelection.table === table && tableSelection.mode === 'table' && target === table;

            if (!isMediaElement(target) && !wholeTable) {
                return false;
            }

            restoreSelection();

            if (isMediaElement(target)) {
                if (getSelectedMedia() !== target) {
                    html.selectNode(target);
                }
                editor.removeMedia();
            } else {
                html.selectNode(table);
                editor.removeTable();
            }

            return !editorElement.contains(target);
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

        function getMediaToolTarget() {
            var media = getSelectedMedia();

            if (media && editorElement.contains(media)) {
                return media;
            }

            return activeResizeTarget && isMediaElement(activeResizeTarget) && editorElement.contains(activeResizeTarget) ? activeResizeTarget : null;
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
            if (tableSelectionOverlay || !overlays.canCreate('wysiwyg-table-selection')) {
                return tableSelectionOverlay;
            }

            tableSelectionOverlay = overlays.create('wysiwyg-table-selection');
            on(tableSelectionOverlay, 'table-select', function (event) {
                selectTableMode(event.detail.mode);
            });
            return tableSelectionOverlay;
        }

        function syncTableSelectionOverlay(state) {
            var overlay;

            if (!tableSelection || !tableSelection.table.isConnected || state.media || state.link) {
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
            if (resizeOverlay || !overlays.canCreate('wysiwyg-resize-overlay')) {
                return resizeOverlay;
            }

            resizeOverlay = overlays.create('wysiwyg-resize-overlay', { boundary: editorElement });
            on(resizeOverlay, 'move-start', function () {
                movingResizeTarget = true;
            });
            on(resizeOverlay, 'resize-end', function () {
                editor.recordSnapshot();
                sync();
            });
            on(resizeOverlay, 'move-end', function (event) {
                activeResizeTarget = event.detail.target;

                if (isMediaElement(activeResizeTarget)) {
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
                target = activeResizeTarget || (state.media ? getSelectedMedia() : null);
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
                overlays.remove(tableToolsPopup);
                tableToolsPopup = null;
                off(document, 'keydown', closeTableToolsOnEscape);
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
            document.body.appendChild(overlays.track(tableToolsPopup));
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

            on(tableToolsPopup, 'click', function (event) {
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
            on(document, 'keydown', closeTableToolsOnEscape);
            tableToolsPopup.showFor(anchor);
            return true;
        }

        function syncTableTools(state) {
            var anchor;

            if (tableSelection && !state.media && !state.link) {
                anchor = tableSelection.mode === 'table' ? tableSelection.table : getCellsRect(tableSelection.cells);
                openTableTools(anchor, tableSelection.mode);
            } else {
                closeTableTools();
            }
        }

        function closeMediaTools() {
            if (mediaToolsPopup) {
                overlays.remove(mediaToolsPopup);
                mediaToolsPopup = null;
                off(document, 'keydown', closeMediaToolsOnEscape);
            }
        }

        function closeMediaToolsOnEscape(event) {
            if (event.key === 'Escape') {
                closeMediaTools();
            }
        }

        function mediaElementType(media) {
            var tagName = media && media.tagName ? media.tagName.toLowerCase() : '';

            return tagName === 'img' ? 'image' : tagName;
        }

        function syncMediaToggle(button, selected) {
            var selectedIcon;

            if (!button) {
                return;
            }

            selectedIcon = button.querySelector('[data-selected-icon]');
            button.setAttribute('aria-pressed', selected ? 'true' : 'false');

            if (selected && !selectedIcon) {
                selectedIcon = createIcon('check', 'wysiwyg-media-tool-icon');
                selectedIcon.classList.add('wysiwyg-media-tool-check');
                selectedIcon.setAttribute('data-selected-icon', '');
                button.appendChild(selectedIcon);
            } else if (!selected && selectedIcon) {
                selectedIcon.remove();
            }
        }

        function syncMediaToolControls(media) {
            var type = mediaElementType(media);
            var fullSize = mediaToolsPopup.querySelector('[data-action="fullSize"]');
            var fullWidth = mediaToolsPopup.querySelector('[data-action="fullWidth"]');
            var objectFit = mediaToolsPopup.querySelector('[data-style="objectFit"]');
            var layout = mediaToolsPopup.querySelector('[data-style="layout"]');
            var selected = (type === 'image' || type === 'video') && media.style.width === '100%';
            var fullWidthSelected = type === 'audio' && media.style.width === '100%';

            mediaToolsPopup.setAttribute('data-mode', type);
            Array.prototype.forEach.call(mediaToolsPopup.querySelectorAll('[data-media-panel]'), function (panel) {
                panel.hidden = (panel.getAttribute('data-media-panel') || '').split(',').indexOf(type) === -1;
            });

            syncMediaToggle(fullSize, selected);
            syncMediaToggle(fullWidth, fullWidthSelected);

            objectFit.value = type === 'image' || type === 'video' ? media.style.objectFit || '' : '';
            layout.value = type === 'image' ? getImageLayout(media) : 'inline';

            Array.prototype.forEach.call(mediaToolsPopup.querySelectorAll('[data-media-attribute]'), function (control) {
                var name = control.getAttribute('data-media-attribute');

                if (control.type === 'checkbox') {
                    control.checked = media.hasAttribute(name);
                } else {
                    control.value = media.getAttribute(name) || '';
                }
            });
        }

        function openMediaTools(media) {
            if (typeof customElements === 'undefined' || !customElements.get('wysiwyg-popup')) {
                return false;
            }

            if (!mediaToolsPopup) {
                mediaToolsPopup = document.createElement('wysiwyg-popup');
                mediaToolsPopup.preferredPosition = 'bottom-start';
                mediaToolsPopup.innerHTML = [
                    '<style>',
                    '.wysiwyg-media-tools{display:grid;gap:8px;min-width:190px}',
                    '.wysiwyg-media-panel{display:grid;gap:8px}',
                    '.wysiwyg-media-panel[hidden]{display:none}',
                    '.wysiwyg-media-tool{display:flex;align-items:center;gap:7px;width:100%;height:30px;border:1px solid #d1d5db;border-radius:4px;background:#fff;color:#111827;padding:0 8px;cursor:pointer;font:500 12px/1.2 system-ui,sans-serif}',
                    '.wysiwyg-media-tool:hover,.wysiwyg-media-tool[aria-pressed="true"]{border-color:#2563eb;background:#dbeafe}',
                    '.wysiwyg-media-tool-icon{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;overflow:visible}',
                    '.wysiwyg-media-tool-check{margin-left:auto}',
                    '.wysiwyg-media-tools label{display:grid;gap:3px;color:#475569;font:500 12px/1.2 system-ui,sans-serif}',
                    '.wysiwyg-media-tools select,.wysiwyg-media-tools input[type="url"]{width:100%;height:30px;box-sizing:border-box;padding:0 8px;border:1px solid #d1d5db;border-radius:4px;background:#fff;color:#111827;font:inherit}',
                    '.wysiwyg-media-tools .wysiwyg-media-check{display:flex;align-items:center;gap:7px}',
                    '.wysiwyg-media-tools .wysiwyg-media-check input{width:auto;height:auto;margin:0}',
                    '</style>',
                    '<div class="wysiwyg-media-tools wysiwyg-image-tools">',
                    '<div data-media-panel="image,video" class="wysiwyg-media-panel">',
                    '<button type="button" class="wysiwyg-media-tool wysiwyg-image-tool" data-action="fullSize" title="Full-size" aria-label="Full-size" aria-pressed="false"></button>',
                    '<label><span>Object fit</span><select data-style="objectFit" aria-label="Object fit"><option value="">Default</option><option value="fill">Fill</option><option value="contain">Contain</option><option value="cover">Cover</option><option value="none">None</option><option value="scale-down">Scale down</option></select></label>',
                    '</div>',
                    '<div data-media-panel="image" class="wysiwyg-media-panel">',
                    '<label><span>Layout</span><select data-style="layout" aria-label="Image layout"><option value="inline">Inline</option><option value="block">Block</option><option value="float-left">Float left</option><option value="float-right">Float right</option></select></label>',
                    '</div>',
                    '<div data-media-panel="audio" class="wysiwyg-media-panel">',
                    '<button type="button" class="wysiwyg-media-tool wysiwyg-media-width-tool" data-action="fullWidth" title="Full-width audio" aria-label="Full-width audio" aria-pressed="false"></button>',
                    '</div>',
                    '<div data-media-panel="video,audio" class="wysiwyg-media-panel">',
                    '<label class="wysiwyg-media-check"><input type="checkbox" data-media-attribute="controls"><span>Controls</span></label>',
                    '<label class="wysiwyg-media-check"><input type="checkbox" data-media-attribute="autoplay"><span>Autoplay</span></label>',
                    '<label class="wysiwyg-media-check"><input type="checkbox" data-media-attribute="loop"><span>Loop</span></label>',
                    '<label class="wysiwyg-media-check"><input type="checkbox" data-media-attribute="muted"><span>Muted</span></label>',
                    '<label><span>Preload</span><select data-media-attribute="preload" aria-label="Preload"><option value="">Default</option><option value="none">None</option><option value="metadata">Metadata</option><option value="auto">Auto</option></select></label>',
                    '</div>',
                    '<div data-media-panel="video" class="wysiwyg-media-panel">',
                    '<label><span>Poster URL</span><input type="url" data-media-attribute="poster" aria-label="Poster URL"></label>',
                    '<label class="wysiwyg-media-check"><input type="checkbox" data-media-attribute="playsinline"><span>Inline playback</span></label>',
                    '</div>',
                    '</div>'
                ].join('');
                mediaToolsPopup.querySelector('[data-action="fullSize"]').appendChild(createIcon('image-full-size', 'wysiwyg-media-tool-icon'));
                mediaToolsPopup.querySelector('[data-action="fullSize"]').appendChild(document.createTextNode('Full-size'));
                mediaToolsPopup.querySelector('[data-action="fullWidth"]').appendChild(createIcon('image-full-size', 'wysiwyg-media-tool-icon'));
                mediaToolsPopup.querySelector('[data-action="fullWidth"]').appendChild(document.createTextNode('Full-width'));
                document.body.appendChild(overlays.track(mediaToolsPopup));
                on(mediaToolsPopup, 'click', function (event) {
                    var button = event.target.closest && event.target.closest('[data-action]');
                    var action = button && button.getAttribute('data-action');
                    var target = getMediaToolTarget();
                    var type = mediaElementType(target);

                    if (!button || (action === 'fullSize' && type !== 'image' && type !== 'video') || (action === 'fullWidth' && type !== 'audio')) {
                        return;
                    }

                    restoreSelection();
                    editor.toggleMediaWidth();
                    saveSelection();
                    sync();
                });
                on(mediaToolsPopup, 'change', function (event) {
                    var control = event.target.closest && event.target.closest('[data-style],[data-media-attribute]');
                    var target;
                    var type;
                    var name;
                    var attributes;

                    if (!control) {
                        return;
                    }

                    restoreSelection();

                    target = getMediaToolTarget();
                    type = mediaElementType(target);
                    if (control.hasAttribute('data-style')) {
                        if (type !== 'image' && type !== 'video') {
                            return;
                        }

                        if (control.getAttribute('data-style') === 'objectFit') {
                            editor.setMediaStyle('objectFit', control.value);
                        } else if (type === 'image') {
                            editor.setImageLayout(control.value);
                        } else {
                            return;
                        }
                    } else {
                        if (type !== 'video' && type !== 'audio') {
                            return;
                        }

                        name = control.getAttribute('data-media-attribute');
                        attributes = { type: type };
                        attributes[name] = control.type === 'checkbox' ? control.checked : control.value;
                        editor.updateMedia(attributes);
                    }

                    saveSelection();
                    sync();
                });
                on(document, 'keydown', closeMediaToolsOnEscape);
            }

            syncMediaToolControls(media);
            mediaToolsPopup.showFor(media);
            return true;
        }

        function syncMediaTools(state) {
            var media = state.media ? getMediaToolTarget() : null;

            if (!media || !editorElement.contains(media)) {
                closeMediaTools();
                return;
            }

            openMediaTools(media);
        }

        function createContext(entry, event, value) {
            var state = editor.getActiveFormats();

            state.codeView = codeViewOpen;

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
                prompt: dialogs.prompt,
                showLinkModal: showLinkModal,
                showFindReplaceModal: showFindReplaceModal,
                showCodeBlockModal: showCodeBlockModal,
                showMediaBrowserModal: showMediaBrowserModal,
                showImageBrowserModal: showImageBrowserModal,
                selectMedia: selectInsertedMedia,
                showTablePicker: showTablePicker,
                clearFormatting: clearFormatting,
                toggleCodeView: toggleCodeView,
                config: config
            };
        }

        function syncTableSelectionState(state) {
            var cell;
            var table;

            if (state.media || state.link) {
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
            if (destroyed) { return; }
            var state = editor.getActiveFormats();

            state.codeView = codeViewOpen;
            syncTableSelectionState(state);
            view.sync(state, {
                editor: editor,
                toolbarElement: toolbarElement,
                saveSelection: saveSelection,
                restoreSelection: restoreSelection,
                sync: sync,
                prompt: dialogs.prompt,
                showLinkModal: showLinkModal,
                showFindReplaceModal: showFindReplaceModal,
                showCodeBlockModal: showCodeBlockModal,
                showMediaBrowserModal: showMediaBrowserModal,
                showImageBrowserModal: showImageBrowserModal,
                selectMedia: selectInsertedMedia,
                showTablePicker: showTablePicker,
                toggleCodeView: toggleCodeView,
                config: config
            });
            syncCodeView();

            if (isCodeViewOnly()) {
                closeTableTools();
                closeMediaTools();
                if (resizeOverlay) {
                    resizeOverlay.hide();
                }
                if (tableSelectionOverlay) {
                    tableSelectionOverlay.hide();
                }
            } else {
                syncTableTools(state);
                syncMediaTools(state);
                syncResizeOverlay(state);
                syncTableSelectionOverlay(state);
            }
        }

        view = createToolbarView(toolbarElement, config.elements.status, {
            items: config.toolbar.items,
            icons: config.assets.icons,
            context: {
                editor: editor,
                toolbarElement: toolbarElement,
                saveSelection: saveSelection,
                restoreSelection: restoreSelection,
                sync: sync,
                prompt: dialogs.prompt,
                showLinkModal: showLinkModal,
                showFindReplaceModal: showFindReplaceModal,
                showCodeBlockModal: showCodeBlockModal,
                showMediaBrowserModal: showMediaBrowserModal,
                showImageBrowserModal: showImageBrowserModal,
                selectMedia: selectInsertedMedia,
                showTablePicker: showTablePicker,
                toggleCodeView: toggleCodeView,
                config: config
            }
        });

        toolbarController = createToolbarController({
            createContext: createContext,
            restoreSelection: restoreSelection,
            saveSelection: saveSelection,
            sync: sync,
            toolbarElement: toolbarElement,
            view: view
        });

        on(document, 'selectionchange', function () {
            if (document.activeElement === editorElement || editorElement.contains(document.activeElement)) {
                saveSelection();

                if (tableSelection && !expandingTableSelection && !editor.getActiveFormats().table) {
                    clearTableSelection();
                }

                sync();
            }
        });

        on(editorElement, 'mousedown', function (event) {
            var cell = event.target.closest && event.target.closest('th,td');

            expandingTableSelection = !!(cell && (event.ctrlKey || event.metaKey) && tableSelection && tableSelection.table === html.getClosestTag(cell, 'table'));
        });

        on(editorElement, 'mousedown', function (event) {
            var media = getMediaFromEvent(event);

            if (selectMediaElement(media)) {
                saveSelection();
                sync();
            }
        }, true);

        on(editorElement, 'focus', function (event) {
            var media = getMediaFromEvent(event);

            if (selectMediaElement(media)) {
                saveSelection();
                sync();
            }
        }, true);

        on(editorElement, 'mouseup', function (event) {
            var media = getMediaFromEvent(event);
            var link = event.target.closest && event.target.closest('a');
            var cell = event.target.closest && event.target.closest('th,td');

            if (movingResizeTarget && resizeOverlay && resizeOverlay.target) {
                activeResizeTarget = resizeOverlay.target;
                clearTableSelection();

                if (isMediaElement(activeResizeTarget)) {
                    html.selectNode(activeResizeTarget);
                }

                movingResizeTarget = false;
                saveSelection();
                sync();
                return;
            }

            if (media) {
                selectMediaElement(media);
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

        on(document, 'keydown', function (event) {
            var target;

            if (event.defaultPrevented || ['Delete', 'Backspace'].indexOf(event.key) === -1) {
                return;
            }

            target = getKeyboardResizeTarget(event);
            if (!target || !removeResizeTarget(target)) {
                return;
            }

            event.preventDefault();
            clearTableSelection();
            activeResizeTarget = null;
            saveSelection();
            sync();
        }, true);

        on(document, 'mouseup', function () {
            expandingTableSelection = false;
            movingResizeTarget = false;
        });

        on(editorElement, 'keyup', function () {
            activeResizeTarget = null;
            saveSelection();

            if (!editor.getActiveFormats().table) {
                clearTableSelection();
            }

            sync();
        });

        function historyAction(event, action) {
            event.preventDefault();
            editor[action]();
            activeResizeTarget = null;
            clearTableSelection();
            saveSelection();
            sync();
        }

        on(editorElement, 'keydown', function (event) {
            if (event.defaultPrevented || event.isComposing || composing || event.altKey || !(event.metaKey || event.ctrlKey)) { return; }
            var key = event.key.toLowerCase();
            if (key === 'z' || (key === 'y' && !event.shiftKey)) {
                historyAction(event, key === 'y' || event.shiftKey ? 'redo' : 'undo');
            }
        });

        on(editorElement, 'beforeinput', function (event) {
            if (event.defaultPrevented || composing) { return; }
            if (/^history(Undo|Redo)$/.test(event.inputType) && event.cancelable) {
                historyAction(event, event.inputType === 'historyUndo' ? 'undo' : 'redo');
            } else {
                editor.prepareInput(event.inputType);
            }
        });

        on(editorElement, 'paste', function (event) {
            if (event.defaultPrevented || !event.clipboardData) { return; }
            var data = event.clipboardData;
            var markup = data.getData('text/html');
            var text = data.getData('text/plain');
            if (!markup && !text) { return; }
            event.preventDefault();
            editor.insertPaste({ html: markup, text: text, plainText: config.paste.plainText });
            saveSelection();
            sync();
        });

        on(editorElement, 'compositionstart', function () {
            editor.prepareInput('composition');
            composing = true;
        });
        on(editorElement, 'compositionend', function () {
            composing = false;
            editor.recordInput('composition');
            saveSelection();
            sync();
        });

        on(editorElement, 'input', function (event) {
            if (composing || event.isComposing) { return; }
            activeResizeTarget = null;
            saveSelection();
            editor.recordInput(event.inputType);
            sync();
        });

        function destroy() {
            if (destroyed) { return; }
            destroyed = true;
            toolbarController.destroy();
            view.destroy();
            dialogs.destroy();
            closeTableTools();
            closeMediaTools();
            overlays.destroy();
            listeners.forEach(function (entry) { html.off.apply(null, entry); });
            listeners = [];
            if (codeViewElement) {
                codeViewElement.removeEventListener('code-input', handleCodeViewInput);
                codeViewElement.remove();
            }
            if (isCodeViewOnly()) { editorElement.hidden = editorWasHidden; }
            savedRange = tableSelection = activeResizeTarget = null;
            if (composing) { editor.recordInput('composition'); }
        }

        editor.normalize();
        sync();

        return {
            destroy: destroy,
            editor: editor,
            sync: sync,
            editorElement: editorElement,
            toolbarElement: toolbarElement,
            toggleCodeView: toggleCodeView
        };
    }

    return createEditorAdapter;
}));
