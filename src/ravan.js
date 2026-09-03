(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(
            require('./core/editor-core'),
            require('./ui/editor-adapter'),
            require('./ui/web-components'),
            require('./core/html-utility'),
            require('./editor-config')
        );
    } else {
        root.Ravan = factory(
            root.createEditorCore,
            root.createEditorAdapter,
            root.WysiwygWebComponents,
            root.WysiwygHtmlUtility,
            root.RavanEditorConfig
        );
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (createEditorCore, createEditorAdapter, webComponents, html, editorConfig) {
    function documentFor(value, config) {
        var element = value && value.nodeType === 1 ? value : null;

        if (config && config.elements && config.elements.document) {
            return config.elements.document;
        }

        if (element && element.ownerDocument) {
            return element.ownerDocument;
        }

        return typeof document !== 'undefined' ? document : null;
    }

    function resolveElement(value, documentRef, name) {
        var elements;
        var element;

        if (!value) {
            return null;
        }

        if (typeof value === 'string') {
            if (!documentRef) {
                throw new Error('Ravan.mount requires a document to resolve ' + name);
            }

            try {
                elements = html.parseSelectorOrElements(value, documentRef);
                element = elements[0];
            } catch (error) {
                throw new Error('Ravan.mount received an invalid ' + name + ' selector');
            }
        } else if (value.nodeType === 1) {
            element = value;
        }

        if (!element) {
            throw new Error('Ravan.mount could not find the ' + name);
        }

        return element;
    }

    function normalizeArguments(target, options) {
        if (target && target.nodeType !== 1 && typeof target === 'object' && !Array.isArray(target)) {
            return {
                target: target.elements && target.elements.wrapper,
                options: target
            };
        }

        return {
            target: target,
            options: options || {}
        };
    }

    function hasAttribute(element, name) {
        return element && element.nodeType === 1 && element.hasAttribute(name);
    }

    function isToolbarElement(element) {
        return hasAttribute(element, 'editor-toolbar') || hasAttribute(element, 'data-ravan-toolbar');
    }

    function markToolbarElement(toolbarElement) {
        toolbarElement.setAttribute('editor-toolbar', '');

        if (toolbarElement.hasAttribute('data-ravan-toolbar')) {
            toolbarElement.removeAttribute('data-ravan-toolbar');
            if (toolbarElement.classList) {
                toolbarElement.classList.remove('toolbar');
            }
        }

        return toolbarElement;
    }

    function findDirectChild(wrapperElement, predicate) {
        return html.toArray(wrapperElement.children).find(predicate) || null;
    }

    function createContentElement(documentRef) {
        var contentElement = documentRef.createElement('div');

        contentElement.setAttribute('editor-content', '');
        contentElement.setAttribute('contenteditable', 'true');

        return contentElement;
    }

    function ensureContentElement(wrapperElement, toolbarElement, editorValue, documentRef) {
        var contentElement = editorValue
            ? resolveElement(editorValue, documentRef, 'editor element')
            : findDirectChild(wrapperElement, function (element) {
                return hasAttribute(element, 'editor-content');
            });

        if (contentElement && !wrapperElement.contains(contentElement)) {
            throw new Error('Ravan.mount requires the editor element to be inside the wrapper');
        }

        if (!contentElement) {
            contentElement = createContentElement(documentRef);
            html.toArray(wrapperElement.childNodes).forEach(function (child) {
                if (child !== toolbarElement && !isToolbarElement(child)) {
                    contentElement.appendChild(child);
                }
            });

            wrapperElement.appendChild(contentElement);
        }

        contentElement.removeAttribute('class');
        contentElement.setAttribute('editor-content', '');
        contentElement.setAttribute('contenteditable', 'true');

        return contentElement;
    }

    function createToolbarElement(documentRef) {
        return markToolbarElement(documentRef.createElement('div'));
    }

    function ensureToolbarElement(wrapperElement, toolbarValue, documentRef) {
        var toolbarElement = toolbarValue
            ? resolveElement(toolbarValue, documentRef, 'toolbar element')
            : findDirectChild(wrapperElement, isToolbarElement);

        if (!toolbarElement) {
            toolbarElement = createToolbarElement(documentRef);
        } else {
            markToolbarElement(toolbarElement);
        }

        return toolbarElement;
    }

    function mount(target, options) {
        var args = normalizeArguments(target, options);
        var adapterConfig;
        var toolbarElement;
        var contentElement;
        var instance;
        var config;
        var wrapperValue;
        var documentRef;
        var wrapperElement;

        if (!createEditorCore || !createEditorAdapter || !editorConfig) {
            throw new Error('Ravan dependencies are not available');
        }

        config = editorConfig.normalize(args.options);
        wrapperValue = args.target || config.elements.wrapper;
        documentRef = documentFor(wrapperValue, config);
        wrapperElement = resolveElement(wrapperValue, documentRef, 'editor wrapper');
        toolbarElement = ensureToolbarElement(wrapperElement, config.elements.toolbar, documentRef);
        contentElement = ensureContentElement(wrapperElement, toolbarElement, config.elements.editor, documentRef);

        if (!config.elements.toolbar) {
            wrapperElement.insertBefore(toolbarElement, contentElement);
        }

        adapterConfig = Object.assign({}, config, {
            elements: Object.assign({}, config.elements, {
                wrapper: wrapperElement,
                editor: contentElement,
                toolbar: toolbarElement
            })
        });

        instance = createEditorAdapter(adapterConfig);
        instance.wrapperElement = wrapperElement;

        return instance;
    }

    return {
        mount: mount,
        create: mount,
        createCore: createEditorCore,
        createAdapter: createEditorAdapter
    };
}));
