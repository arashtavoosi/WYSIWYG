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
    }
];

await Promise.all(builds.map(function (build) {
    return esbuild.build({
        bundle: true,
        entryPoints: [build.entryPoint],
        format: 'iife',
        globalName: build.globalName,
        legalComments: 'none',
        minify: true,
        outfile: build.outfile,
        platform: 'browser',
        sourcemap: true,
        target: ['es2019']
    });
}));
