(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(typeof globalThis !== 'undefined' ? globalThis : this);
    } else {
        root.RavanLoader = factory(root);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    var SOURCE_MODULES = [
        'core/html-utility.js',
        'core/selection.js',
        'core/commands/inline.js',
        'core/normalization.js',
        'core/clipboard.js',
        'core/state.js',
        'core/commands/link.js',
        'core/commands/block.js',
        'core/commands/list.js',
        'core/commands/media.js',
        'core/commands/table.js',
        'core/commands/code-block.js',
        'core/history.js',
        'core/editor-core.js'
    ];
    var UI_MODULES = [
        'ui/toolbar/schema.js',
        'editor-config.js',
        'ui/toolbar/view.js',
        'ui/toolbar/controller.js',
        'ui/dialogs/service.js',
        'ui/overlays/manager.js',
        'ui/editor-adapter.js',
        'ravan.js'
    ];
    var loadedScripts = {};

    function isObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value);
    }

    function isEnabled(value, defaultValue) {
        if (value === false) {
            return false;
        }

        if (value === true) {
            return true;
        }

        return !isObject(value) || value.enabled === undefined ? defaultValue : !!value.enabled;
    }

    function hasFeatureName(value, pattern) {
        if (typeof value === 'string') {
            return pattern.test(value);
        }

        if (Array.isArray(value)) {
            return value.some(function (item) { return hasFeatureName(item, pattern); });
        }

        if (!isObject(value)) {
            return false;
        }

        return Object.keys(value).some(function (key) {
            return pattern.test(key) || hasFeatureName(value[key], pattern);
        });
    }

    function needsComponents(config, options) {
        var settings = options || {};
        var toolbar = config && config.toolbar;
        var media = config && config.media;
        var prompts = config && config.dialogs;
        var featurePattern = /media|image|video|audio|table|find|replace|modal|popup/i;

        if (settings.components === false) {
            return false;
        }

        if (settings.components === true || !toolbar || !toolbar.items) {
            return true;
        }

        return isEnabled(config && config.findReplace, false) ||
            !!(media && media.fileBrowser) ||
            !!(prompts && prompts.prompts) ||
            hasFeatureName(toolbar.items, featurePattern);
    }

    function sourceModules(config, options) {
        var modules = SOURCE_MODULES.slice();
        var settings = options || {};

        if (needsComponents(config || {}, settings)) {
            modules.push('ui/components/web-components.js');
        }

        if (isEnabled(config && config.codeView, true) && settings.codeView !== false) {
            modules.push('ui/code-view.js');
        }

        return modules.concat(UI_MODULES);
    }

    function resolveUrl(value, documentRef) {
        var base = documentRef && documentRef.baseURI;

        if (!value) {
            return '';
        }

        if (typeof URL !== 'undefined' && base) {
            return new URL(value, base).href;
        }

        return value;
    }

    function findExistingScript(url, documentRef) {
        var scripts = documentRef && documentRef.getElementsByTagName ? documentRef.getElementsByTagName('script') : [];
        var resolved = resolveUrl(url, documentRef);
        var index;
        var script;

        for (index = 0; index < scripts.length; index += 1) {
            script = scripts[index];

            if (script.getAttribute('data-ravan-module') === resolved || resolveUrl(script.src || script.getAttribute('src'), documentRef) === resolved) {
                return script;
            }
        }

        return null;
    }

    function loadScript(url, documentRef) {
        var resolved = resolveUrl(url, documentRef);
        var existing = findExistingScript(url, documentRef);
        var script;

        if (loadedScripts[resolved]) {
            return loadedScripts[resolved];
        }

        if (existing && existing.__ravanLoadPromise) {
            loadedScripts[resolved] = existing.__ravanLoadPromise;
            return loadedScripts[resolved];
        }

        if (existing && (existing.readyState === 'loaded' || existing.readyState === 'complete' || !existing.readyState)) {
            loadedScripts[resolved] = Promise.resolve(existing);
            return loadedScripts[resolved];
        }

        if (!documentRef || !documentRef.createElement) {
            return Promise.reject(new Error('RavanLoader requires a document to load source modules'));
        }

        script = existing || documentRef.createElement('script');
        script.async = false;
        script.setAttribute('data-ravan-module', resolved);

        loadedScripts[resolved] = new Promise(function (resolve, reject) {
            script.onload = function () {
                resolve(script);
            };
            script.onerror = function () {
                delete loadedScripts[resolved];
                reject(new Error('RavanLoader could not load ' + url));
            };

            if (!existing) {
                script.src = url;
                (documentRef.head || documentRef.body || documentRef.documentElement).appendChild(script);
            }
        });
        script.__ravanLoadPromise = loadedScripts[resolved];

        return loadedScripts[resolved];
    }

    function loadScripts(urls, documentRef) {
        return urls.reduce(function (promise, url) {
            return promise.then(function () {
                return loadScript(url, documentRef);
            });
        }, Promise.resolve()).then(function () {
            return urls;
        });
    }

    function getRuntimeConfig(config, options) {
        var source = isObject(config && config.loader) ? config.loader : {};
        var settings = options || {};

        return {
            baseUrl: settings.baseUrl || source.baseUrl || '',
            bundleUrl: settings.bundleUrl || source.bundleUrl || 'dist/ravan.min.js',
            codeView: settings.codeView,
            components: settings.components,
            minified: isEnabled(settings.minified, isEnabled(source.minified, false)),
            minifiedBaseUrl: settings.minifiedBaseUrl || source.minifiedBaseUrl || 'dist/src/',
            mode: settings.mode || source.mode || 'source'
        };
    }

    function joinUrl(base, path) {
        if (!base) {
            return path;
        }

        return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
    }

    function load(config, options) {
        var settings = getRuntimeConfig(config || {}, options);
        var documentRef = (options && options.document) || root.document;
        var baseUrl;
        var urls;

        if (root.Ravan && !(options && options.force)) {
            return Promise.resolve(root.Ravan);
        }

        if (settings.mode === 'bundle') {
            urls = [settings.bundleUrl];
        } else {
            baseUrl = settings.minified ? settings.minifiedBaseUrl : settings.baseUrl;
            urls = sourceModules(config || {}, settings).map(function (path) {
                return joinUrl(baseUrl, path);
            });
        }

        return loadScripts(urls, documentRef).then(function () {
            if (!root.Ravan) {
                throw new Error('RavanLoader loaded the modules but Ravan is not available');
            }

            return root.Ravan;
        });
    }

    function mount(target, config, options) {
        var mountTarget = target;
        var mountConfig = config || {};

        if (isObject(target) && !config) {
            mountConfig = target;
            mountTarget = target.elements && target.elements.wrapper;
        }

        return load(mountConfig, options).then(function (ravan) {
            return ravan.mount(mountTarget, mountConfig);
        });
    }

    return {
        load: load,
        mount: mount,
        needsComponents: needsComponents,
        sourceModules: sourceModules
    };
}));
