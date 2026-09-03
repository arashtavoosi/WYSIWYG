import * as esbuild from 'esbuild';

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
})));
