const ravanLoader = require('../src/ravan-loader');

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
});
