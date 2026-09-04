import * as esbuild from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';

// The lite graph omits optional UI implementations entirely. Core commands and
// native prompt fallbacks remain available in both distributions.
const liteUI = {
    name: 'lite-ui',
    setup(build) {
        build.onResolve({ filter: /\/(code-view|web-components)$/ }, args => ({
            path: args.path, namespace: 'optional-ui'
        }));
        build.onLoad({ filter: /.*/, namespace: 'optional-ui' }, () => ({ contents: 'module.exports = null;' }));
    }
};

const builds = [
    {
        entryPoint: 'build/entries/core.js',
        globalName: 'createEditorCore',
        outfile: 'dist/ravan-core.min.js'
    },
    {
        entryPoint: 'build/entries/full.js',
        globalName: 'Ravan',
        outfile: 'dist/ravan.min.js'
    },
    {
        entryPoint: 'build/entries/full.js',
        globalName: 'Ravan',
        outfile: 'dist/ravan-lite.min.js',
        plugins: [liteUI]
    },
    {
        bundle: false,
        entryPoint: 'src/ravan-loader.js',
        outfile: 'dist/ravan-loader.min.js'
    }
];
const styles = [
    {
        entryPoint: 'src/ui/editor-content.css',
        outfile: 'dist/editor-content.min.css'
    },
    {
        entryPoint: 'src/ui/toolbar.css',
        outfile: 'dist/toolbar.min.css'
    }
];
const sourceEntries = [
    'src/core/html-utility.js',
    'src/core/selection.js',
    'src/core/commands/inline.js',
    'src/core/normalization.js',
    'src/core/clipboard.js',
    'src/core/state.js',
    'src/core/commands/link.js',
    'src/core/commands/block.js',
    'src/core/commands/list.js',
    'src/core/commands/media.js',
    'src/core/commands/table.js',
    'src/core/commands/code-block.js',
    'src/core/history.js',
    'src/core/editor-core.js',
    'src/ui/toolbar/schema.js',
    'src/editor-config.js',
    'src/ui/toolbar/view.js',
    'src/ui/toolbar/controller.js',
    'src/ui/dialogs/service.js',
    'src/ui/overlays/manager.js',
    'src/ui/components/web-components.js',
    'src/ui/code-view.js',
    'src/ui/editor-adapter.js',
    'src/ravan.js'
];

await Promise.all(builds.map(function (build) {
    return esbuild.build({
        bundle: build.bundle !== false,
        entryPoints: [build.entryPoint],
        format: build.bundle === false ? undefined : 'iife',
        globalName: build.globalName,
        legalComments: 'none',
        minify: true,
        outfile: build.outfile,
        platform: 'browser',
        plugins: build.plugins,
        sourcemap: true,
        target: ['es2019']
    });
}).concat(styles.map(function (style) {
    return esbuild.build({
        bundle: false,
        entryPoints: [style.entryPoint],
        minify: true,
        outfile: style.outfile,
        sourcemap: true
    });
}).concat([
    esbuild.build({
        bundle: false,
        entryPoints: sourceEntries,
        entryNames: '[dir]/[name]',
        minify: true,
        outbase: 'src',
        outdir: 'dist/src',
        platform: 'browser',
        sourcemap: true,
        target: ['es2019']
    })
])));

for (const path of ['dist/ravan-core.min.js', 'dist/ravan-lite.min.js', 'dist/ravan.min.js']) {
    const contents = await readFile(path);
    console.log(`${path}: ${contents.length} bytes; ${gzipSync(contents).length} bytes gzip`);
}
