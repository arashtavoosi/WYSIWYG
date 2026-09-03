const editorConfig = require('../src/editor-config');

describe('editor configuration', () => {
    test('normalizes feature-owned sections and deeply merges nested settings', () => {
        const config = editorConfig.normalize({
            elements: {
                wrapper: '#wrapper',
                status: '#status'
            },
            editor: {
                historyLimit: 10,
                indentStep: 36
            },
            assets: {
                icons: {
                    url: '/icons.svg'
                }
            },
            media: {
                fileBrowser: {
                    endpoint: '/files',
                    supportedExtensions: {
                        image: '.png'
                    }
                }
            },
            codeView: false,
            findReplace: true,
            dialogs: {
                prompts: {
                    link: {
                        targetFallback: '_blank'
                    }
                }
            }
        });

        expect(config.elements).toEqual({
            document: null,
            wrapper: '#wrapper',
            editor: null,
            toolbar: null,
            status: '#status'
        });
        expect(config.editor).toEqual({ historyLimit: 10, indentStep: 36 });
        expect(config.assets.icons).toEqual({ prefix: 'wysiwyg-icon-', url: '/icons.svg' });
        expect(config.media.fileBrowser.endpoint).toBe('/files');
        expect(config.media.fileBrowser.supportedExtensions).toEqual({
            image: '.png',
            video: '.mp4,.webm,.ogv,.mov,.m4v',
            audio: '.mp3,.wav,.ogg,.oga,.m4a,.aac,.flac'
        });
        expect(config.codeView.enabled).toBe(false);
        expect(config.findReplace.enabled).toBe(true);
        expect(config.dialogs.prompts.link.targetFallback).toBe('_blank');
    });

    test('keeps custom toolbar items separate from editor settings', () => {
        const config = editorConfig.normalize({
            toolbar: {
                items: {
                    custom: {
                        title: 'Custom'
                    }
                }
            }
        });

        expect(config.toolbar.items.custom.title).toBe('Custom');
        expect(config.findReplace.enabled).toBe(false);
    });
});
