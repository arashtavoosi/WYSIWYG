const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { JSDOM, ResourceLoader } = require('jsdom');

const root = path.resolve(__dirname, '..');
class LocalResources extends ResourceLoader {
    fetch(url) {
        const name = new URL(url).pathname;
        return fs.readFile(path.join(root, name));
    }
}

(async () => {
    const loader = await fs.readFile(path.join(root, 'dist/ravan-loader.min.js'), 'utf8');
    for (const mode of ['source', 'minified', 'lite', 'full']) {
        const dom = new JSDOM('<div id="editor"><p>One</p><p>Two</p></div>', {
            url: 'https://ravan.test/', runScripts: 'dangerously', resources: new LocalResources(), pretendToBeVisual: true
        });
        try {
            const w = dom.window;
            w.eval(loader);
            const bundled = mode === 'lite' || mode === 'full';
            const instance = await w.RavanLoader.mount('#editor', { findReplace: true }, {
                mode: bundled ? 'bundle' : 'source',
                baseUrl: '/src/', minified: mode === 'minified', minifiedBaseUrl: '/dist/src/',
                bundleUrl: mode === 'lite' ? '/dist/ravan-lite.min.js' : '/dist/ravan.min.js'
            });
            assert.equal(typeof instance.destroy, 'function');
            assert.equal(!!w.customElements.get('wysiwyg-modal'), mode !== 'lite');
            assert.equal(!!instance.toolbarElement.querySelector('[title="HTML"]'), mode !== 'lite');
            assert.equal(!!instance.toolbarElement.querySelector('[title="Find and Replace"]'), mode !== 'lite');
            const range = w.document.createRange();
            range.selectNodeContents(instance.editorElement);
            w.getSelection().removeAllRanges(); w.getSelection().addRange(range);
            instance.editor.toggleList('ul');
            assert.equal(instance.editor.getHtml(), '<ul><li>One</li><li>Two</li></ul>');
            instance.editor.undo();
            assert.equal(instance.editor.getHtml(), '<p>One</p><p>Two</p>');
            instance.destroy();
            console.log(mode + ': mount, optional UI, selection, undo, and teardown passed');
        } finally {
            dom.window.close();
        }
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
