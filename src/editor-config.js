(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./ui/toolbar/schema'));
    } else {
        root.RavanEditorConfig = factory(root.RavanToolbarSchema);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (toolbarSchema) {
    var DEFAULTS = {
        editor: {
            historyLimit: 50,
            indentStep: 24
        },
        assets: {
            icons: {
                url: '',
                prefix: 'wysiwyg-icon-'
            }
        },
        media: {
            fileBrowser: {
                endpoint: '',
                path: '/',
                supportedExtensions: {
                    image: '.jpg,.jpeg,.png,.gif,.webp,.svg',
                    video: '.mp4,.webm,.ogv,.mov,.m4v',
                    audio: '.mp3,.wav,.ogg,.oga,.m4a,.aac,.flac'
                }
            }
        },
        paste: { plainText: false },
        codeView: {
            enabled: true,
            mode: 'after',
            editable: false,
            live: false
        },
        findReplace: {
            enabled: false
        },
        dialogs: {
            prompts: {
                image: { label: 'Image URL', fallback: 'https://' },
                media: { label: 'Media URL', fallback: 'https://' },
                link: { label: 'Link URL', fallback: 'https://', targetLabel: 'Link target', targetFallback: '' },
                tableCols: { label: 'Table columns', fallback: '2' },
                tableRows: { label: 'Table rows', fallback: '2' }
            }
        }
    };

    function isObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value);
    }

    function mergeObjects(base, override) {
        var result = Object.assign({}, base || {});

        Object.keys(override || {}).forEach(function (key) {
            if (isObject(result[key]) && isObject(override[key])) {
                result[key] = mergeObjects(result[key], override[key]);
            } else {
                result[key] = override[key];
            }
        });

        return result;
    }

    function normalizeEnabledSection(value, defaults, defaultEnabled) {
        var section;

        if (value === false) {
            return Object.assign({}, defaults, { enabled: false });
        }

        if (value === true) {
            return Object.assign({}, defaults, { enabled: true });
        }

        section = isObject(value) ? value : {};
        return Object.assign({}, defaults, section, {
            enabled: section.enabled === undefined ? defaultEnabled : !!section.enabled
        });
    }

    function normalizePrompts(value) {
        var prompts = {};

        Object.keys(DEFAULTS.dialogs.prompts).forEach(function (name) {
            prompts[name] = mergeObjects(DEFAULTS.dialogs.prompts[name], value && value[name]);
        });

        Object.keys(value || {}).forEach(function (name) {
            if (!prompts[name]) {
                prompts[name] = value[name];
            }
        });

        return prompts;
    }

    function normalize(input) {
        var source = isObject(input) ? input : {};
        var elements = isObject(source.elements) ? source.elements : {};
        var editor = isObject(source.editor) ? source.editor : {};
        var toolbar = isObject(source.toolbar) ? source.toolbar : {};
        var assets = isObject(source.assets) ? source.assets : {};
        var icons = isObject(assets.icons) ? assets.icons : {};
        var media = isObject(source.media) ? source.media : {};
        var dialogs = isObject(source.dialogs) ? source.dialogs : {};

        return {
            elements: {
                document: elements.document || null,
                wrapper: elements.wrapper || null,
                editor: elements.editor || null,
                toolbar: elements.toolbar || null,
                status: elements.status || null
            },
            editor: mergeObjects(DEFAULTS.editor, editor),
            toolbar: Object.assign({}, toolbar, {
                items: toolbar.items || toolbarSchema.items
            }),
            assets: {
                icons: mergeObjects(DEFAULTS.assets.icons, icons)
            },
            media: {
                fileBrowser: mergeObjects(DEFAULTS.media.fileBrowser, media.fileBrowser)
            },
            paste: mergeObjects(DEFAULTS.paste, source.paste),
            codeView: normalizeEnabledSection(source.codeView, DEFAULTS.codeView, true),
            findReplace: normalizeEnabledSection(source.findReplace, DEFAULTS.findReplace, false),
            dialogs: {
                prompts: normalizePrompts(dialogs.prompts)
            }
        };
    }

    return {
        normalize: normalize
    };
}));
