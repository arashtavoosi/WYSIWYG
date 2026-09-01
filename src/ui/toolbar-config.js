(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.WysiwygToolbarConfig = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function inlineCommand(name) {
        return function (context) {
            context.editor.toggleInline(name);
        };
    }

    function inlineActive(name) {
        return function (state) {
            return !!state[name];
        };
    }

    function inlineStyleCommand(propertyName) {
        return function (context) {
            context.editor.setInlineStyle(propertyName, context.value);
        };
    }

    function promptValue(context, promptConfig, fallback) {
        return context.prompt(promptConfig.label, fallback === undefined ? promptConfig.fallback : fallback);
    }

    function promptLinkValue(context, promptConfig, hrefFallback, targetFallback) {
        var href = promptValue(context, promptConfig, hrefFallback);

        if (!href) {
            return href;
        }

        return {
            href: href,
            target: promptValue(context, {
                label: promptConfig.targetLabel || 'Link target',
                fallback: targetFallback === undefined ? (promptConfig.targetFallback || '') : targetFallback
            }, targetFallback) || ''
        };
    }

    function modalCommand(open, apply) {
        return function (context) {
            var result = open(context);

            function finish(value) {
                if (value) {
                    context.restoreSelection();
                    apply(context, value);
                    context.saveSelection();
                }
            }

            if (result && typeof result.then === 'function') {
                return result.then(finish);
            }

            finish(result);
        };
    }

    function mediaActive(state) {
        return !!state.media;
    }

    function mediaTypeFor(value, context) {
        var file = value && typeof value === 'object' ? value : null;
        var source = file ? file.url || file.path || file.src || file.name : value;
        var extension = String(file && file.extension || source || '').toLowerCase().match(/\.[^.]+(?=\?|#|$)/);
        var supported = context.settings.fileBrowser && context.settings.fileBrowser.supportedExtensions;
        var types = ['image', 'video', 'audio'];

        if (file && types.indexOf(file.mediaType || file.type) !== -1) {
            return file.mediaType || file.type;
        }

        if (file && file.mime) {
            var mimeType = file.mime.split('/')[0];

            if (types.indexOf(mimeType) !== -1) {
                return mimeType;
            }
        }

        if (!extension || !supported || typeof supported !== 'object' || Array.isArray(supported)) {
            return null;
        }

        return types.find(function (type) {
            return String(supported[type] || '').toLowerCase().split(',').map(function (item) {
                return item.trim().charAt(0) === '.' ? item.trim() : '.' + item.trim();
            }).indexOf(extension[0]) !== -1;
        }) || null;
    }

    function mediaSource(value) {
        var file = value && typeof value === 'object' ? value : null;

        return {
            src: file ? file.url || file.path || file.src : value,
            filePath: file && file.path ? file.path : ''
        };
    }

    function mediaCommand() {
        return modalCommand(function (context) {
            var selected = context.state.media || null;
            var prompt = context.settings.prompts.media || {
                label: 'Media URL',
                fallback: 'https://'
            };

            return context.showMediaBrowserModal ? context.showMediaBrowserModal(selected) : context.prompt(prompt.label, selected ? selected.src : prompt.fallback);
        }, function (context, value) {
            var selected = context.state.media || null;
            var source = mediaSource(value);
            var type = mediaTypeFor(value, context) || (selected && selected.type) || 'image';
            var attributes = {
                type: type,
                src: source.src,
                filePath: source.filePath
            };

            if (!source.src) {
                return;
            }

            if (selected && type === selected.type) {
                if (type === 'image') {
                    attributes.alt = selected.alt;
                    attributes.height = selected.height;
                    attributes.title = selected.title;
                    attributes.width = selected.width;
                } else {
                    attributes.title = selected.title;
                }
                context.editor.updateMedia(attributes);
            } else {
                if (type === 'image') {
                    attributes.alt = '';
                }
                context.editor.insertMedia(attributes);
                if (context.selectMedia) {
                    context.selectMedia(type);
                }
            }
        });
    }

    var codeBlockCommand = modalCommand(function (context) {
        return context.showCodeBlockModal();
    }, function (context, value) {
        context.editor.insertCodeBlock(value.code, value.language);
    });

    return {
        headingLevel: 2,
        imageAttributes: ['src', 'alt', 'title', 'width', 'height', 'filePath'],
        indentStep: 24,
        iconPrefix: 'wysiwyg-icon-',
        iconSpritePath: '',
        fileBrowser: {
            endpoint: '',
            path: '/',
            supportedExtensions: {
                image: '.jpg,.jpeg,.png,.gif,.webp,.svg',
                video: '.mp4,.webm,.ogv,.mov,.m4v',
                audio: '.mp3,.wav,.ogg,.oga,.m4a,.aac,.flac'
            }
        },
        codeView: {
            mode: 'after',
            editable: false,
            live: false
        },
        findReplace: false,
        prompts: {
            image: { label: 'Image URL', fallback: 'https://' },
            media: { label: 'Media URL', fallback: 'https://' },
            link: { label: 'Link URL', fallback: 'https://', targetLabel: 'Link target', targetFallback: '' },
            tableCols: { label: 'Table columns', fallback: '2' },
            tableRows: { label: 'Table rows', fallback: '2' }
        },
        toolbar: {
            history: {
                title: 'History',
                priority: 10,
                children: {
                    undo: {
                        title: 'Undo',
                        iconId: 'undo', icon: '<',
                        priority: 10,
                        disabled: function (state) { return !state.canUndo; },
                        onCommand: function (context) {
                            context.editor.undo();
                            context.saveSelection();
                        }
                    },
                    redo: {
                        title: 'Redo',
                        iconId: 'redo', icon: '>',
                        priority: 20,
                        disabled: function (state) { return !state.canRedo; },
                        onCommand: function (context) {
                            context.editor.redo();
                            context.saveSelection();
                        }
                    }
                }
            },
            inline: {
                title: 'Inline',
                priority: 20,
                children: {
                    bold: { title: 'Bold', iconId: 'bold', icon: 'B', priority: 10, active: inlineActive('bold'), onCommand: inlineCommand('bold') },
                    italic: { title: 'Italic', iconId: 'italic', icon: 'I', priority: 20, active: inlineActive('italic'), onCommand: inlineCommand('italic') },
                    underline: { title: 'Underline', iconId: 'underline', icon: 'U', priority: 30, active: inlineActive('underline'), onCommand: inlineCommand('underline') },
                    strikethrough: { title: 'Strikethrough', iconId: 'strikethrough', icon: 'S', priority: 40, active: inlineActive('strikethrough'), onCommand: inlineCommand('strikethrough') },
                    subscript: { title: 'Subscript', iconId: 'subscript', icon: 'x2', priority: 50, active: inlineActive('subscript'), onCommand: inlineCommand('subscript') },
                    superscript: { title: 'Superscript', iconId: 'superscript', icon: 'x^2', priority: 60, active: inlineActive('superscript'), onCommand: inlineCommand('superscript') }
                }
            },
            alignment: {
                title: 'Alignment',
                priority: 30,
                children: {
                    left: {
                        title: 'Align left',
                        iconId: 'align-left', icon: 'L',
                        priority: 10,
                        active: function (state) { return state.textAlign === 'left' || !state.textAlign; },
                        onCommand: function (context) {
                            context.editor.setInlineStyle('textAlign', 'left');
                        }
                    },
                    center: {
                        title: 'Align center',
                        iconId: 'align-center', icon: 'C',
                        priority: 20,
                        active: function (state) { return state.textAlign === 'center'; },
                        onCommand: function (context) {
                            context.editor.setInlineStyle('textAlign', 'center');
                        }
                    },
                    right: {
                        title: 'Align right',
                        iconId: 'align-right', icon: 'R',
                        priority: 30,
                        active: function (state) { return state.textAlign === 'right'; },
                        onCommand: function (context) {
                            context.editor.setInlineStyle('textAlign', 'right');
                        }
                    },
                    justify: {
                        title: 'Justify',
                        iconId: 'align-justify', icon: 'J',
                        priority: 40,
                        active: function (state) { return state.textAlign === 'justify'; },
                        onCommand: function (context) {
                            context.editor.setInlineStyle('textAlign', 'justify');
                        }
                    }
                }
            },
            lists: {
                title: 'Lists',
                priority: 40,
                children: {
                    bullets: {
                        title: 'Bullets',
                        iconId: 'bullets', icon: '*',
                        priority: 10,
                        active: function (state) { return state.list === 'ul'; },
                        onCommand: function (context) {
                            context.editor.toggleList('ul');
                        }
                    },
                    numbers: {
                        title: 'Numbers',
                        iconId: 'numbers', icon: '1.',
                        priority: 20,
                        active: function (state) { return state.list === 'ol'; },
                        onCommand: function (context) {
                            context.editor.toggleList('ol');
                        }
                    },
                    outdent: {
                        title: 'Outdent',
                        iconId: 'outdent', icon: '<-',
                        priority: 30,
                        onCommand: function (context) {
                            context.editor.adjustIndent('outdent');
                        }
                    },
                    indent: {
                        title: 'Indent',
                        iconId: 'indent', icon: '->',
                        priority: 40,
                        onCommand: function (context) {
                            context.editor.adjustIndent('indent');
                        }
                    }
                }
            },
            blocks: {
                title: 'Blocks',
                priority: 50,
                children: {
                    paragraph: {
                        title: 'Paragraph',
                        iconId: 'paragraph', icon: 'P',
                        priority: 10,
                        active: function (state) { return state.block === 'p'; },
                        onCommand: function (context) {
                            context.editor.setBlock('paragraph');
                        }
                    },
                    h1: {
                        title: 'Heading 1',
                        iconId: 'heading-1', icon: 'H1',
                        priority: 20,
                        active: function (state) { return state.headingLevel === 1; },
                        onCommand: function (context) {
                            context.editor.setBlock('heading', { level: 1 });
                        }
                    },
                    h2: {
                        title: 'Heading 2',
                        iconId: 'heading-2', icon: 'H2',
                        priority: 30,
                        active: function (state) { return state.headingLevel === 2; },
                        onCommand: function (context) {
                            context.editor.setBlock('heading', { level: 2 });
                        }
                    },
                    h3: {
                        title: 'Heading 3',
                        iconId: 'heading-3', icon: 'H3',
                        priority: 40,
                        active: function (state) { return state.headingLevel === 3; },
                        onCommand: function (context) {
                            context.editor.setBlock('heading', { level: 3 });
                        }
                    },
                    quote: {
                        title: 'Quote',
                        iconId: 'quote', icon: '"',
                        priority: 50,
                        active: function (state) { return !!state.quote; },
                        onCommand: function (context) {
                            context.editor.toggleBlock('blockquote');
                        }
                    }
                }
            },
            
            style: {
                title: 'Style',
                priority: 40,
                children: {
                    fontFamily: {
                        type: 'dropdown',
                        title: 'Font',
                        iconId: 'font-family',
                        priority: 10,
                        value: function (state) { return state.fontFamily; },
                        options: [
                            { title: 'Georgia', value: "Georgia, 'Times New Roman', serif" },
                            { title: 'Helvetica', value: "'Helvetica Neue', Arial, sans-serif" },
                            { title: 'Courier', value: "'Courier New', monospace" }
                        ],
                        onCommand: inlineStyleCommand('fontFamily')
                    },
                    fontSize: {
                        type: 'dropdown',
                        title: 'Size',
                        iconId: 'font-size',
                        priority: 20,
                        value: function (state) { return state.fontSize; },
                        options: [
                            { title: '12', value: '12px' },
                            { title: '14', value: '14px' },
                            { title: '16', value: '16px', selected: true },
                            { title: '18', value: '18px' },
                            { title: '24', value: '24px' },
                            { title: '32', value: '32px' }
                        ],
                        onCommand: inlineStyleCommand('fontSize')
                    },
                    lineHeight: {
                        type: 'dropdown',
                        title: 'Line',
                        iconId: 'line-height',
                        priority: 30,
                        value: function (state) { return state.lineHeight; },
                        options: [
                            { title: '1.4', value: '1.4' },
                            { title: '1.6', value: '1.6', selected: true },
                            { title: '1.8', value: '1.8' },
                            { title: '2.0', value: '2' }
                        ],
                        onCommand: function (context) {
                            context.editor.setBlockStyle('lineHeight', context.value);
                        }
                    },
                    color: {
                        type: 'colorpicker',
                        title: 'Text color',
                        iconId: 'text-color',
                        priority: 40,
                        value: function (state) { return state.color; },
                        fallback: '#000000',
                        onCommand: inlineStyleCommand('color')
                    },
                    highlight: {
                        type: 'colorpicker',
                        title: 'Highlight',
                        iconId: 'highlight',
                        priority: 50,
                        value: function (state) { return state.highlightColor; },
                        fallback: '#ffff00',
                        onCommand: inlineStyleCommand('backgroundColor')
                    }
                }
            },
            insert: {
                title: 'Insert',
                priority: 70,
                children: {
                    link: {
                        title: 'Link',
                        iconId: 'link', icon: 'Link',
                        priority: 10,
                        active: function (state) { return !!state.link; },
                        onCommand: function (context) {
                            var prompts = context.settings.prompts;
                            var currentLink = context.state.link;
                            var fallback = currentLink ? currentLink.href : prompts.link.fallback;
                            var target = currentLink ? currentLink.target : (prompts.link.targetFallback || '');
                            var result = context.showLinkModal ? context.showLinkModal(fallback, target) : promptLinkValue(context, prompts.link, fallback, target);

                            function apply(value) {
                                var attributes = value && typeof value === 'object' ? value : { href: value, target: target };

                                if (attributes && attributes.href) {
                                    context.editor.upsertLink({
                                        href: attributes.href,
                                        target: attributes.target
                                    });
                                }
                            }

                            if (result && typeof result.then === 'function') {
                                return result.then(function (value) {
                                    if (value) {
                                        context.restoreSelection();
                                        apply(value);
                                        context.saveSelection();
                                    }
                                });
                            }

                            if (result) {
                                apply(result);
                            }
                        }
                    },
                    unlink: {
                        title: 'Unlink',
                        iconId: 'unlink', icon: 'Unlink',
                        priority: 20,
                        active: function (state) { return !!state.link; },
                        disabled: function (state) { return !state.link; },
                        onCommand: function (context) {
                            context.editor.removeLink();
                        }
                    },
                    media: {
                        title: 'Media',
                        iconId: 'image', icon: 'Img',
                        priority: 30,
                        active: mediaActive,
                        onCommand: mediaCommand()
                    },
                    codeBlock: {
                        title: 'Code block',
                        iconId: 'code-tag', icon: '</>',
                        priority: 58,
                        onCommand: codeBlockCommand
                    },
                    br: {
                        title: 'Line break',
                        iconId: 'line-break', icon: 'BR',
                        priority: 60,
                        onCommand: function (context) {
                            context.editor.insertBreak();
                        }
                    },
                    hr: {
                        title: 'Rule',
                        iconId: 'rule', icon: 'HR',
                        priority: 70,
                        onCommand: function (context) {
                            context.editor.insertRule();
                        }
                    }
                }
            },
            table: {
                title: 'Table',
                priority: 80,
                children: {
                    insertTable: {
                        title: 'Table',
                        iconId: 'table', icon: 'Tbl',
                        priority: 10,
                        active: function (state) { return !!state.table; },
                        onCommand: function (context) {
                            var picked;
                            var prompts;
                            var rows;
                            var cols;

                            if (context.state.table) {
                                return;
                            }

                            picked = context.showTablePicker && context.showTablePicker(context.element);

                            if (picked && typeof picked.then === 'function') {
                                return picked.then(function (config) {
                                    if (config) {
                                        context.restoreSelection();
                                        context.editor.insertTable({ rows: config.rows, cols: config.cols, headerRow: true });
                                        context.saveSelection();
                                    }
                                });
                            }

                            prompts = context.settings.prompts;
                            rows = Number(promptValue(context, prompts.tableRows)) || 2;
                            cols = Number(promptValue(context, prompts.tableCols)) || 2;

                            context.editor.insertTable({ rows: rows, cols: cols, headerRow: true });
                        }
                    }
                }
            },
            cleanup: {
                title: 'Cleanup',
                priority: 90,
                children: {
                    clear: {
                        title: 'Clear formatting',
                        iconId: 'clear-formatting', icon: 'A-',
                        priority: 10,
                        onCommand: function (context) {
                            (context.clearFormatting || context.editor.clear)();
                        }
                    }
                }
            },
            tools: {
                title: 'Tools',
                priority: 95,
                children: {
                    findReplace: {
                        title: 'Find and Replace',
                        iconId: 'find-replace', icon: 'Find',
                        priority: 10,
                        hide: function (context) { return !context.settings.findReplace; },
                        onCommand: function (context) {
                            context.showFindReplaceModal();
                        }
                    }
                }
            },
            code: {
                title: 'Code',
                priority: 100,
                children: {
                    html: {
                        title: 'HTML',
                        iconId: 'code', icon: '<>',
                        priority: 10,
                        active: function (state) { return !!state.codeView; },
                        onCommand: function (context) {
                            context.toggleCodeView();
                        }
                    }
                }
            }
        }
    };
}));
