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

    function tableDisabled(state) {
        return !state.table;
    }

    return {
        headingLevel: 2,
        imageAttributes: ['src', 'alt', 'title', 'width', 'height'],
        indentStep: 24,
        prompts: {
            image: { label: 'Image URL', fallback: 'https://' },
            link: { label: 'Link URL', fallback: 'https://' },
            tableCols: { label: 'Table columns', fallback: '2' },
            tableRows: { label: 'Table rows', fallback: '2' }
        },
        toolbar: {
            history: {
                title: 'History',
                children: {
                    undo: {
                        title: 'Undo',
                        icon: '<',
                        disabled: function (state) { return !state.canUndo; },
                        onCommand: function (context) {
                            context.editor.undo();
                            context.saveSelection();
                        }
                    },
                    redo: {
                        title: 'Redo',
                        icon: '>',
                        disabled: function (state) { return !state.canRedo; },
                        onCommand: function (context) {
                            context.editor.redo();
                            context.saveSelection();
                        }
                    }
                }
            },
            blocks: {
                title: 'Blocks',
                children: {
                    paragraph: {
                        title: 'Paragraph',
                        icon: 'P',
                        active: function (state) { return state.block === 'p'; },
                        onCommand: function (context) {
                            context.editor.setBlock('paragraph');
                        }
                    },
                    h1: {
                        title: 'Heading 1',
                        icon: 'H1',
                        active: function (state) { return state.headingLevel === 1; },
                        onCommand: function (context) {
                            context.editor.setBlock('heading', { level: 1 });
                        }
                    },
                    h2: {
                        title: 'Heading 2',
                        icon: 'H2',
                        active: function (state) { return state.headingLevel === 2; },
                        onCommand: function (context) {
                            context.editor.setBlock('heading', { level: 2 });
                        }
                    },
                    h3: {
                        title: 'Heading 3',
                        icon: 'H3',
                        active: function (state) { return state.headingLevel === 3; },
                        onCommand: function (context) {
                            context.editor.setBlock('heading', { level: 3 });
                        }
                    },
                    quote: {
                        title: 'Quote',
                        icon: '"',
                        active: function (state) { return !!state.quote; },
                        onCommand: function (context) {
                            context.editor.toggleBlock('blockquote');
                        }
                    }
                }
            },
            inline: {
                title: 'Inline',
                children: {
                    bold: { title: 'Bold', icon: 'B', active: inlineActive('bold'), onCommand: inlineCommand('bold') },
                    italic: { title: 'Italic', icon: 'I', active: inlineActive('italic'), onCommand: inlineCommand('italic') },
                    underline: { title: 'Underline', icon: 'U', active: inlineActive('underline'), onCommand: inlineCommand('underline') },
                    strikethrough: { title: 'Strikethrough', icon: 'S', active: inlineActive('strikethrough'), onCommand: inlineCommand('strikethrough') },
                    subscript: { title: 'Subscript', icon: 'x2', active: inlineActive('subscript'), onCommand: inlineCommand('subscript') },
                    superscript: { title: 'Superscript', icon: 'x^2', active: inlineActive('superscript'), onCommand: inlineCommand('superscript') }
                }
            },
            style: {
                title: 'Style',
                children: {
                    fontFamily: {
                        type: 'dropdown',
                        title: 'Font',
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
                        value: function (state) { return state.color; },
                        fallback: '#000000',
                        onCommand: inlineStyleCommand('color')
                    },
                    highlight: {
                        type: 'colorpicker',
                        title: 'Highlight',
                        value: function (state) { return state.highlightColor; },
                        fallback: '#ffff00',
                        onCommand: inlineStyleCommand('backgroundColor')
                    }
                }
            },
            lists: {
                title: 'Lists',
                children: {
                    bullets: {
                        title: 'Bullets',
                        icon: '*',
                        active: function (state) { return state.list === 'ul'; },
                        onCommand: function (context) {
                            context.editor.toggleList('ul');
                        }
                    },
                    numbers: {
                        title: 'Numbers',
                        icon: '1.',
                        active: function (state) { return state.list === 'ol'; },
                        onCommand: function (context) {
                            context.editor.toggleList('ol');
                        }
                    },
                    outdent: {
                        title: 'Outdent',
                        icon: '<-',
                        onCommand: function (context) {
                            context.editor.adjustIndent('outdent');
                        }
                    },
                    indent: {
                        title: 'Indent',
                        icon: '->',
                        onCommand: function (context) {
                            context.editor.adjustIndent('indent');
                        }
                    }
                }
            },
            alignment: {
                title: 'Alignment',
                children: {
                    left: {
                        title: 'Align left',
                        icon: 'L',
                        active: function (state) { return state.textAlign === 'left' || !state.textAlign; },
                        onCommand: function (context) {
                            context.editor.setInlineStyle('textAlign', 'left');
                        }
                    },
                    center: {
                        title: 'Align center',
                        icon: 'C',
                        active: function (state) { return state.textAlign === 'center'; },
                        onCommand: function (context) {
                            context.editor.setInlineStyle('textAlign', 'center');
                        }
                    },
                    right: {
                        title: 'Align right',
                        icon: 'R',
                        active: function (state) { return state.textAlign === 'right'; },
                        onCommand: function (context) {
                            context.editor.setInlineStyle('textAlign', 'right');
                        }
                    },
                    justify: {
                        title: 'Justify',
                        icon: 'J',
                        active: function (state) { return state.textAlign === 'justify'; },
                        onCommand: function (context) {
                            context.editor.setInlineStyle('textAlign', 'justify');
                        }
                    }
                }
            },
            insert: {
                title: 'Insert',
                children: {
                    link: {
                        title: 'Link',
                        icon: 'Link',
                        active: function (state) { return !!state.link; },
                        onCommand: function (context) {
                            var prompts = context.settings.prompts;
                            var href = promptValue(context, prompts.link, context.state.link ? context.state.link.href : prompts.link.fallback);

                            if (href) {
                                context.editor.upsertLink({ href: href });
                            }
                        }
                    },
                    unlink: {
                        title: 'Unlink',
                        icon: 'Unlink',
                        active: function (state) { return !!state.link; },
                        disabled: function (state) { return !state.link; },
                        onCommand: function (context) {
                            context.editor.removeLink();
                        }
                    },
                    image: {
                        title: 'Image',
                        icon: 'Img',
                        onCommand: function (context) {
                            var src = promptValue(context, context.settings.prompts.image);

                            if (src) {
                                context.editor.insertImage({ src: src, alt: '' });
                            }
                        }
                    },
                    updateImage: {
                        title: 'Update image URL',
                        icon: 'Img+',
                        active: function (state) { return !!state.image; },
                        disabled: function (state) { return !state.image; },
                        onCommand: function (context) {
                            var prompts = context.settings.prompts;
                            var src = promptValue(context, prompts.image, context.state.image ? context.state.image.src : prompts.image.fallback);

                            if (src !== null) {
                                context.editor.updateImage({ src: src });
                            }
                        }
                    },
                    removeImage: {
                        title: 'Remove image',
                        icon: 'Img-',
                        disabled: function (state) { return !state.image; },
                        onCommand: function (context) {
                            context.editor.removeImage();
                        }
                    },
                    br: {
                        title: 'Line break',
                        icon: 'BR',
                        onCommand: function (context) {
                            context.editor.insertBreak();
                        }
                    },
                    hr: {
                        title: 'Rule',
                        icon: 'HR',
                        onCommand: function (context) {
                            context.editor.insertRule();
                        }
                    }
                }
            },
            table: {
                title: 'Table',
                children: {
                    insertTable: {
                        title: 'Table',
                        icon: 'Tbl',
                        active: function (state) { return !!state.table; },
                        onCommand: function (context) {
                            var prompts = context.settings.prompts;
                            var rows = Number(promptValue(context, prompts.tableRows)) || 2;
                            var cols = Number(promptValue(context, prompts.tableCols)) || 2;

                            context.editor.insertTable({ rows: rows, cols: cols, headerRow: true });
                        }
                    },
                    rowBefore: {
                        title: 'Row before',
                        icon: 'R+',
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.insertTableRow('before');
                        }
                    },
                    rowAfter: {
                        title: 'Row after',
                        icon: '+R',
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.insertTableRow('after');
                        }
                    },
                    removeRow: {
                        title: 'Remove row',
                        icon: 'R-',
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.removeTableRow();
                        }
                    },
                    colBefore: {
                        title: 'Column before',
                        icon: 'C+',
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.insertTableColumn('before');
                        }
                    },
                    colAfter: {
                        title: 'Column after',
                        icon: '+C',
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.insertTableColumn('after');
                        }
                    },
                    removeCol: {
                        title: 'Remove column',
                        icon: 'C-',
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.removeTableColumn();
                        }
                    },
                    headerRow: {
                        title: 'Header row',
                        icon: 'TH',
                        active: function (state) { return state.table && !!state.table.headerRow; },
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.toggleTableHeaderRow();
                        }
                    },
                    removeTable: {
                        title: 'Remove table',
                        icon: 'Tbl-',
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.removeTable();
                        }
                    }
                }
            },
            cleanup: {
                title: 'Cleanup',
                children: {
                    clear: {
                        title: 'Clear formatting',
                        icon: 'A-',
                        onCommand: function (context) {
                            context.editor.clear();
                        }
                    }
                }
            }
        }
    };
}));
