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
                priority: 10,
                children: {
                    undo: {
                        title: 'Undo',
                        icon: '<',
                        priority: 10,
                        disabled: function (state) { return !state.canUndo; },
                        onCommand: function (context) {
                            context.editor.undo();
                            context.saveSelection();
                        }
                    },
                    redo: {
                        title: 'Redo',
                        icon: '>',
                        priority: 20,
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
                priority: 20,
                children: {
                    paragraph: {
                        title: 'Paragraph',
                        icon: 'P',
                        priority: 10,
                        active: function (state) { return state.block === 'p'; },
                        onCommand: function (context) {
                            context.editor.setBlock('paragraph');
                        }
                    },
                    h1: {
                        title: 'Heading 1',
                        icon: 'H1',
                        priority: 20,
                        active: function (state) { return state.headingLevel === 1; },
                        onCommand: function (context) {
                            context.editor.setBlock('heading', { level: 1 });
                        }
                    },
                    h2: {
                        title: 'Heading 2',
                        icon: 'H2',
                        priority: 30,
                        active: function (state) { return state.headingLevel === 2; },
                        onCommand: function (context) {
                            context.editor.setBlock('heading', { level: 2 });
                        }
                    },
                    h3: {
                        title: 'Heading 3',
                        icon: 'H3',
                        priority: 40,
                        active: function (state) { return state.headingLevel === 3; },
                        onCommand: function (context) {
                            context.editor.setBlock('heading', { level: 3 });
                        }
                    },
                    quote: {
                        title: 'Quote',
                        icon: '"',
                        priority: 50,
                        active: function (state) { return !!state.quote; },
                        onCommand: function (context) {
                            context.editor.toggleBlock('blockquote');
                        }
                    }
                }
            },
            inline: {
                title: 'Inline',
                priority: 30,
                children: {
                    bold: { title: 'Bold', icon: 'B', priority: 10, active: inlineActive('bold'), onCommand: inlineCommand('bold') },
                    italic: { title: 'Italic', icon: 'I', priority: 20, active: inlineActive('italic'), onCommand: inlineCommand('italic') },
                    underline: { title: 'Underline', icon: 'U', priority: 30, active: inlineActive('underline'), onCommand: inlineCommand('underline') },
                    strikethrough: { title: 'Strikethrough', icon: 'S', priority: 40, active: inlineActive('strikethrough'), onCommand: inlineCommand('strikethrough') },
                    subscript: { title: 'Subscript', icon: 'x2', priority: 50, active: inlineActive('subscript'), onCommand: inlineCommand('subscript') },
                    superscript: { title: 'Superscript', icon: 'x^2', priority: 60, active: inlineActive('superscript'), onCommand: inlineCommand('superscript') }
                }
            },
            style: {
                title: 'Style',
                priority: 40,
                children: {
                    fontFamily: {
                        type: 'dropdown',
                        title: 'Font',
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
                        priority: 40,
                        value: function (state) { return state.color; },
                        fallback: '#000000',
                        onCommand: inlineStyleCommand('color')
                    },
                    highlight: {
                        type: 'colorpicker',
                        title: 'Highlight',
                        priority: 50,
                        value: function (state) { return state.highlightColor; },
                        fallback: '#ffff00',
                        onCommand: inlineStyleCommand('backgroundColor')
                    }
                }
            },
            lists: {
                title: 'Lists',
                priority: 50,
                children: {
                    bullets: {
                        title: 'Bullets',
                        icon: '*',
                        priority: 10,
                        active: function (state) { return state.list === 'ul'; },
                        onCommand: function (context) {
                            context.editor.toggleList('ul');
                        }
                    },
                    numbers: {
                        title: 'Numbers',
                        icon: '1.',
                        priority: 20,
                        active: function (state) { return state.list === 'ol'; },
                        onCommand: function (context) {
                            context.editor.toggleList('ol');
                        }
                    },
                    outdent: {
                        title: 'Outdent',
                        icon: '<-',
                        priority: 30,
                        onCommand: function (context) {
                            context.editor.adjustIndent('outdent');
                        }
                    },
                    indent: {
                        title: 'Indent',
                        icon: '->',
                        priority: 40,
                        onCommand: function (context) {
                            context.editor.adjustIndent('indent');
                        }
                    }
                }
            },
            alignment: {
                title: 'Alignment',
                priority: 60,
                children: {
                    left: {
                        title: 'Align left',
                        icon: 'L',
                        priority: 10,
                        active: function (state) { return state.textAlign === 'left' || !state.textAlign; },
                        onCommand: function (context) {
                            context.editor.setInlineStyle('textAlign', 'left');
                        }
                    },
                    center: {
                        title: 'Align center',
                        icon: 'C',
                        priority: 20,
                        active: function (state) { return state.textAlign === 'center'; },
                        onCommand: function (context) {
                            context.editor.setInlineStyle('textAlign', 'center');
                        }
                    },
                    right: {
                        title: 'Align right',
                        icon: 'R',
                        priority: 30,
                        active: function (state) { return state.textAlign === 'right'; },
                        onCommand: function (context) {
                            context.editor.setInlineStyle('textAlign', 'right');
                        }
                    },
                    justify: {
                        title: 'Justify',
                        icon: 'J',
                        priority: 40,
                        active: function (state) { return state.textAlign === 'justify'; },
                        onCommand: function (context) {
                            context.editor.setInlineStyle('textAlign', 'justify');
                        }
                    }
                }
            },
            insert: {
                title: 'Insert',
                priority: 70,
                children: {
                    link: {
                        title: 'Link',
                        icon: 'Link',
                        priority: 10,
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
                        priority: 20,
                        active: function (state) { return !!state.link; },
                        disabled: function (state) { return !state.link; },
                        onCommand: function (context) {
                            context.editor.removeLink();
                        }
                    },
                    image: {
                        title: 'Image',
                        icon: 'Img',
                        priority: 30,
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
                        priority: 40,
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
                        priority: 50,
                        disabled: function (state) { return !state.image; },
                        onCommand: function (context) {
                            context.editor.removeImage();
                        }
                    },
                    br: {
                        title: 'Line break',
                        icon: 'BR',
                        priority: 60,
                        onCommand: function (context) {
                            context.editor.insertBreak();
                        }
                    },
                    hr: {
                        title: 'Rule',
                        icon: 'HR',
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
                        icon: 'Tbl',
                        priority: 10,
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
                        priority: 20,
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.insertTableRow('before');
                        }
                    },
                    rowAfter: {
                        title: 'Row after',
                        icon: '+R',
                        priority: 30,
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.insertTableRow('after');
                        }
                    },
                    removeRow: {
                        title: 'Remove row',
                        icon: 'R-',
                        priority: 40,
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.removeTableRow();
                        }
                    },
                    colBefore: {
                        title: 'Column before',
                        icon: 'C+',
                        priority: 50,
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.insertTableColumn('before');
                        }
                    },
                    colAfter: {
                        title: 'Column after',
                        icon: '+C',
                        priority: 60,
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.insertTableColumn('after');
                        }
                    },
                    removeCol: {
                        title: 'Remove column',
                        icon: 'C-',
                        priority: 70,
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.removeTableColumn();
                        }
                    },
                    headerRow: {
                        title: 'Header row',
                        icon: 'TH',
                        priority: 80,
                        active: function (state) { return state.table && !!state.table.headerRow; },
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.toggleTableHeaderRow();
                        }
                    },
                    removeTable: {
                        title: 'Remove table',
                        icon: 'Tbl-',
                        priority: 90,
                        disabled: tableDisabled,
                        onCommand: function (context) {
                            context.editor.removeTable();
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
                        icon: 'A-',
                        priority: 10,
                        onCommand: function (context) {
                            context.editor.clear();
                        }
                    }
                }
            }
        }
    };
}));
