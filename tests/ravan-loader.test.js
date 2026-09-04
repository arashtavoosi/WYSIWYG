const ravanLoader = require('../src/ravan-loader');

function createLoadingDocument() {
    const scripts = [];

    return {
        baseURI: 'https://example.test/demos/ravan.html',
        scripts,
        getElementsByTagName: () => scripts,
        createElement: () => {
            const attributes = {};

            return {
                getAttribute: name => attributes[name] || null,
                setAttribute: (name, value) => {
                    attributes[name] = value;
                },
                src: ''
            };
        },
        head: {
            appendChild: script => {
                scripts.push(script);
                script.readyState = 'complete';
                script.onload();
            }
        }
    };
}

describe('Ravan loader', () => {
    test('selects optional source modules from feature configuration', () => {
        const minimal = ravanLoader.sourceModules({
            codeView: false,
            toolbar: {
                items: {
                    bold: { title: 'Bold' }
                }
            }
        });
        const full = ravanLoader.sourceModules({
            codeView: { enabled: true },
            findReplace: { enabled: true },
            toolbar: {
                items: {
                    media: { title: 'Media' }
                }
            }
        });

        expect(minimal).toContain('core/commands/media.js');
        expect(minimal).not.toContain('ui/code-view.js');
        expect(minimal).not.toContain('ui/components/web-components.js');
        expect(full).toContain('ui/code-view.js');
        expect(full).toContain('ui/components/web-components.js');
    });

    test('keeps core dependencies ordered before the facade', () => {
        const modules = ravanLoader.sourceModules({ codeView: false, toolbar: { items: {} } });

        expect(modules.indexOf('core/editor-core.js')).toBeLessThan(modules.indexOf('editor-config.js'));
        expect(modules.indexOf('ui/toolbar/schema.js')).toBeLessThan(modules.indexOf('ui/toolbar/view.js'));
        expect(modules[modules.length - 1]).toBe('ravan.js');
    });

    test('loads the minified source tree when the minified flag is enabled', async () => {
        const documentRef = createLoadingDocument();
        const config = {
            codeView: false,
            loader: {
                minified: true,
                minifiedBaseUrl: '../dist/src/'
            },
            toolbar: { items: { bold: { title: 'Bold' } } }
        };
        const previousRavan = global.Ravan;

        global.Ravan = { mount: jest.fn() };

        try {
            await expect(ravanLoader.load(config, {
                components: false,
                document: documentRef,
                force: true
            })).resolves.toBe(global.Ravan);

            expect(documentRef.scripts.map(script => script.getAttribute('data-ravan-module'))).toEqual(
                ravanLoader.sourceModules(config, { components: false, codeView: false }).map(path =>
                    new URL(path, new URL('../dist/src/', documentRef.baseURI)).href
                )
            );
        } finally {
            if (previousRavan === undefined) {
                delete global.Ravan;
            } else {
                global.Ravan = previousRavan;
            }
        }
    });
});
