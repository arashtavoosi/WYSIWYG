(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.WysiwygCodeView = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    var tokenPattern = /<!--[\s\S]*?-->|<!doctype[\s\S]*?>|<\/?[A-Za-z][^>]*>|&(?:#\d+|#x[\da-f]+|[\w:.-]+);/gi;
    var blockTagPattern = /^(?:article|aside|blockquote|body|caption|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|html|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)$/i;
    var voidTagPattern = /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (character) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[character];
        });
    }

    function span(className, value) {
        return '<span class="' + className + '">' + escapeHtml(value) + '</span>';
    }

    function highlightAttributes(source) {
        var result = '';
        var index = 0;

        source.replace(/([A-Za-z_:][\w:.-]*)(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'=<>`]+)/g, function (match, name, equals, value, offset) {
            result += escapeHtml(source.slice(index, offset));
            result += span('wysiwyg-code-attribute', name) + escapeHtml(equals) + span('wysiwyg-code-string', value);
            index = offset + match.length;
            return match;
        });

        return result + escapeHtml(source.slice(index));
    }

    function highlightTag(token) {
        var match = token.match(/^(<\/?)([A-Za-z][\w:.-]*)([\s\S]*?)(\/?>)$/);

        if (!match) {
            return span(/^<!doctype/i.test(token) ? 'wysiwyg-code-doctype' : 'wysiwyg-code-punctuation', token);
        }

        return span('wysiwyg-code-punctuation', match[1]) +
            span('wysiwyg-code-tag', match[2]) +
            highlightAttributes(match[3]) +
            span('wysiwyg-code-punctuation', match[4]);
    }

    function highlightHtml(source) {
        var value = String(source === undefined || source === null ? '' : source);
        var result = '';
        var index = 0;

        value.replace(tokenPattern, function (token, offset) {
            var highlighted;

            result += escapeHtml(value.slice(index, offset));

            if (token.indexOf('<!--') === 0) {
                highlighted = span('wysiwyg-code-comment', token);
            } else if (token.charAt(0) === '&') {
                highlighted = span('wysiwyg-code-entity', token);
            } else {
                highlighted = highlightTag(token);
            }

            result += highlighted;
            index = offset + token.length;
            return token;
        });

        return result + escapeHtml(value.slice(index));
    }

    function normalizeSource(source) {
        var value = String(source === undefined || source === null ? '' : source);
        var lines;
        var contentLines;
        var indent;

        if (value.indexOf('\n') === -1) {
            return value;
        }

        lines = value.split('\n');

        while (lines.length && !/\S/.test(lines[0])) {
            lines.shift();
        }

        while (lines.length && !/\S/.test(lines[lines.length - 1])) {
            lines.pop();
        }

        contentLines = lines.filter(function (line) { return /\S/.test(line); });
        indent = contentLines.length ? Math.min.apply(Math, contentLines.map(function (line) {
            return line.match(/^[ \t]*/)[0].length;
        })) : 0;

        return lines.map(function (line) {
            return line.slice(Math.min(indent, line.match(/^[ \t]*/)[0].length));
        }).join('\n');
    }

    function beautifyHtml(source) {
        var tokens = String(source === undefined || source === null ? '' : source).match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/g) || [];
        var lines = [];
        var line = '';
        var lineDepth = 0;
        var depth = 0;

        function flush() {
            if (line && /\S/.test(line)) {
                lines.push(new Array(lineDepth + 1).join('  ') + line);
            }
            line = '';
        }

        tokens.forEach(function (token) {
            var match = token.match(/^<\s*(\/?)\s*([A-Za-z][\w:.-]*)\b/);
            var name = match && match[2];
            var closing = match && match[1];
            var structural = !match ? /^<!--|^<!doctype/i.test(token) : blockTagPattern.test(name);

            if (!structural) {
                if (/\S/.test(token)) {
                    line += token;
                }
                return;
            }

            if (closing) {
                depth = Math.max(0, depth - 1);
                if (!line || !/\S/.test(line)) {
                    line = token;
                    lineDepth = depth;
                } else {
                    line += token;
                }
                flush();
                return;
            }

            flush();
            line = token;
            lineDepth = depth;

            if (/^<!|\/>$/.test(token) || voidTagPattern.test(name)) {
                flush();
            } else {
                depth += 1;
            }
        });

        flush();
        return lines.join('\n');
    }

    function minifyHtml(source) {
        return String(source === undefined || source === null ? '' : source).replace(/>\s+</g, '><').trim();
    }

    function createInputEvent(documentRef) {
        var event = documentRef.createEvent('Event');

        event.initEvent('code-input', true, false);
        return event;
    }

    function createCodeView(documentRef) {
        var root = documentRef.createElement('section');
        var frame = documentRef.createElement('div');
        var pre = documentRef.createElement('pre');
        var code = documentRef.createElement('code');
        var input = documentRef.createElement('textarea');
        var tools = documentRef.createElement('div');
        var beautifyButton = documentRef.createElement('button');
        var minifyButton = documentRef.createElement('button');
        var style = documentRef.createElement('style');
        var value = '';
        var focused = false;

        style.textContent = [
            '.wysiwyg-code-view{margin:12px 0;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;background:#0f172a;box-shadow:0 8px 20px rgba(15,23,42,.12)}',
            '.wysiwyg-code-view-tools{display:flex;justify-content:flex-end;gap:6px;padding:5px 8px;border-bottom:1px solid rgba(148,163,184,.25)}',
            '.wysiwyg-code-view-tools button{border:1px solid #475569;border-radius:4px;padding:4px 8px;background:#1e293b;color:#e2e8f0;font:600 11px/1.2 ui-sans-serif,system-ui,sans-serif;cursor:pointer}',
            '.wysiwyg-code-view-tools button:hover{background:#334155}',
            '.wysiwyg-code-view-editor{position:relative;min-height:170px;max-height:420px;overflow:hidden}',
            '.wysiwyg-code-view pre,.wysiwyg-code-view textarea{width:100%;height:100%;min-height:170px;max-height:420px;margin:0;padding:14px 16px;box-sizing:border-box;overflow:auto;white-space:pre;word-wrap:normal;tab-size:2;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}',
            '.wysiwyg-code-view code{display:block;font:inherit}',
            '.wysiwyg-code-view pre{color:#e2e8f0}',
            '.wysiwyg-code-view-highlight{pointer-events:none}',
            '.wysiwyg-code-view.is-editable pre{overflow:hidden}',
            '.wysiwyg-code-view textarea{display:none;position:absolute;inset:0;z-index:1;resize:vertical;border:0;outline:0;color:transparent;caret-color:#f8fafc;background:transparent;-webkit-text-fill-color:transparent}',
            '.wysiwyg-code-view.is-editable textarea{display:block}',
            '.wysiwyg-code-view textarea::selection{background:rgba(96,165,250,.35)}',
            '.wysiwyg-code-punctuation{color:#cbd5e1}',
            '.wysiwyg-code-tag{color:#7dd3fc}',
            '.wysiwyg-code-attribute{color:#c4b5fd}',
            '.wysiwyg-code-string{color:#86efac}',
            '.wysiwyg-code-comment{color:#94a3b8}',
            '.wysiwyg-code-doctype{color:#fbbf24}',
            '.wysiwyg-code-entity{color:#fda4af}'
        ].join('');

        root.className = 'wysiwyg-code-view';
        root.setAttribute('data-code-view', '');
        root.hidden = true;
        frame.className = 'wysiwyg-code-view-editor';
        pre.className = 'wysiwyg-code-view-highlight';
        pre.setAttribute('aria-hidden', 'false');
        input.className = 'wysiwyg-code-view-input';
        input.setAttribute('aria-label', 'HTML source');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('wrap', 'off');
        input.spellcheck = false;
        input.hidden = true;
        tools.className = 'wysiwyg-code-view-tools';
        beautifyButton.type = 'button';
        beautifyButton.className = 'wysiwyg-code-view-beautify';
        beautifyButton.textContent = 'Beautify';
        beautifyButton.setAttribute('title', 'Beautify HTML');
        beautifyButton.setAttribute('aria-label', 'Beautify HTML');
        minifyButton.type = 'button';
        minifyButton.className = 'wysiwyg-code-view-minify';
        minifyButton.textContent = 'Minify';
        minifyButton.setAttribute('title', 'Minify HTML');
        minifyButton.setAttribute('aria-label', 'Minify HTML');
        pre.appendChild(code);
        frame.appendChild(pre);
        frame.appendChild(input);
        root.appendChild(style);
        tools.appendChild(beautifyButton);
        tools.appendChild(minifyButton);
        root.appendChild(tools);
        root.appendChild(frame);

        function syncScroll() {
            if (input.hidden) {
                pre.style.width = '';
                pre.style.height = '';
                pre.style.minHeight = '';
                pre.style.paddingRight = '';
                pre.style.paddingBottom = '';
                return;
            }

            pre.style.width = input.clientWidth + 'px';
            pre.style.height = input.clientHeight + 'px';
            pre.style.minHeight = '0';
            pre.style.paddingRight = '16px';
            pre.style.paddingBottom = '14px';
            pre.scrollTop = input.scrollTop;
            pre.scrollLeft = input.scrollLeft;
        }

        root.setValue = function (nextValue) {
            nextValue = normalizeSource(nextValue);

            if (value === nextValue && input.value === nextValue) {
                return;
            }

            value = nextValue;
            input.value = value;
            code.innerHTML = highlightHtml(value);
            syncScroll();
        };

        root.getValue = function () {
            return value;
        };

        function replaceValue(nextValue) {
            if (nextValue === value) {
                return false;
            }

            root.setValue(nextValue);
            if (!input.readOnly) {
                root.dispatchEvent(createInputEvent(documentRef));
            }
            return true;
        }

        root.beautify = function () {
            return replaceValue(beautifyHtml(value));
        };

        root.minify = function () {
            return replaceValue(minifyHtml(value));
        };

        root.setEditable = function (editable) {
            editable = !!editable;
            root.classList.toggle('is-editable', editable);
            input.hidden = !editable;
            input.readOnly = !editable;
            pre.setAttribute('aria-hidden', editable ? 'true' : 'false');
            syncScroll();
        };

        root.setMode = function (mode) {
            root.setAttribute('data-mode', mode === 'only' ? 'only' : 'after');
        };

        root.show = function () {
            root.hidden = false;
            syncScroll();
        };

        root.hide = function () {
            root.hidden = true;
        };

        root.focusCode = function () {
            if (!input.hidden) {
                input.focus();
            }
        };

        root.isFocused = function () {
            return focused;
        };

        input.addEventListener('focus', function () {
            focused = true;
        });
        input.addEventListener('blur', function () {
            focused = false;
        });
        input.addEventListener('scroll', syncScroll);
        input.addEventListener('input', function () {
            value = input.value;
            code.innerHTML = highlightHtml(value);
            syncScroll();
            root.dispatchEvent(createInputEvent(documentRef));
        });
        beautifyButton.addEventListener('click', function () {
            root.beautify();
            root.focusCode();
        });
        minifyButton.addEventListener('click', function () {
            root.minify();
            root.focusCode();
        });

        root.setValue('');
        root.setEditable(false);
        root.setMode('after');
        return root;
    }

    return {
        createCodeView: createCodeView,
        highlightHtml: highlightHtml,
        beautifyHtml: beautifyHtml,
        minifyHtml: minifyHtml
    };
}));
