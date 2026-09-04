(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./html-utility'), require('./normalization'));
    } else {
        root.WysiwygClipboard = factory(root.WysiwygHtmlUtility, root.WysiwygNormalization);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html, normalization) {
    var tags = /^(P|DIV|BR|HR|STRONG|EM|U|S|SUB|SUP|SPAN|A|H[1-6]|BLOCKQUOTE|UL|OL|LI|PRE|CODE|IMG|VIDEO|AUDIO|SOURCE|TABLE|THEAD|TBODY|TFOOT|TR|TH|TD|CAPTION)$/;
    var discard = /^(SCRIPT|STYLE|META|LINK|IFRAME|OBJECT|EMBED|SVG|MATH|TEMPLATE)$/;
    var styles = ['color', 'background-color', 'font-family', 'font-size', 'line-height', 'text-align', 'margin-left', 'direction'];
    var attributes = {
        A: ['href', 'target', 'title'], IMG: ['src', 'alt', 'title', 'width', 'height'],
        VIDEO: ['src', 'controls', 'width', 'height', 'poster'], AUDIO: ['src', 'controls'], SOURCE: ['src', 'type'],
        TD: ['colspan', 'rowspan'], TH: ['colspan', 'rowspan', 'scope'], OL: ['start', 'reversed'], LI: ['value']
    };

    function clean(source, documentRef) {
        var template = documentRef.createElement('template');
        template.innerHTML = source;
        Array.from(template.content.querySelectorAll('*')).forEach(function (element) {
            if (discard.test(element.tagName)) { element.remove(); return; }
            var semantic = { B: 'strong', I: 'em', STRIKE: 's' }[element.tagName];
            if (semantic) { element = html.replaceTag(element, semantic); }
            if (!tags.test(element.tagName)) { html.unwrapNode(element); return; }
            var allowed = attributes[element.tagName] || [];
            var style = documentRef.createElement('span').style;
            styles.forEach(function (property) {
                var value = element.style.getPropertyValue(property);
                if (value && !/url\s*\(|expression\s*\(/i.test(value)) { style.setProperty(property, value); }
            });
            // Office and browser clipboard HTML often encode these marks as spans.
            ['font-weight', 'font-style', 'text-decoration-line'].forEach(function (property) {
                var value = element.style.getPropertyValue(property);
                var tag = property === 'font-weight' && /^(bold|[6-9]00)$/.test(value) ? 'strong' :
                    property === 'font-style' && value === 'italic' ? 'em' :
                    property === 'text-decoration-line' && value === 'underline' ? 'u' : null;
                if (tag) {
                    var mark = documentRef.createElement(tag);
                    while (element.firstChild) { mark.appendChild(element.firstChild); }
                    element.appendChild(mark);
                }
            });
            Array.from(element.attributes).forEach(function (attribute) {
                var name = attribute.name;
                var value = attribute.value;
                if (allowed.indexOf(name) < 0 || (/^(href|src|poster)$/.test(name) &&
                    /^[^/?#]*:/.test(value.replace(/[\s\u0000-\u001f]/g, '')) && !/^(https?:|mailto:|tel:)/i.test(value.trim()))) {
                    element.removeAttribute(name);
                }
            });
            if (style.cssText) { element.setAttribute('style', style.cssText); }
            if (element.tagName === 'A' && element.target === '_blank') { element.rel = 'noopener noreferrer'; }
            if (element.tagName === 'SPAN' && !element.attributes.length) { html.unwrapNode(element); }
        });
        var comments = documentRef.createTreeWalker(template.content, NodeFilter.SHOW_COMMENT);
        var comment;
        var remove = [];
        while ((comment = comments.nextNode())) { remove.push(comment); }
        remove.forEach(function (node) { node.remove(); });
        normalization.simplifyAllFormattingTags(template.content);
        return template.content;
    }

    function insert(rootNode, data, selection) {
        var current = html.getCurrentSelection(selection);
        if (!current || !current.rangeCount) { return false; }
        var range = current.getRangeAt(0);
        if (!rootNode.contains(range.commonAncestorContainer)) { return false; }
        var doc = rootNode.ownerDocument;
        var fragment;
        if (data.html && !data.plainText) {
            fragment = clean(data.html, doc);
        } else {
            fragment = doc.createDocumentFragment();
            String(data.text || '').replace(/\r\n?/g, '\n').split('\n').forEach(function (line, index) {
                if (index) { fragment.appendChild(doc.createElement('br')); }
                fragment.appendChild(doc.createTextNode(line));
            });
        }
        if (!fragment.firstChild) { return false; }
        var edges = [range.startContainer, range.endContainer].map(function (node) {
            return html.getClosestTag(html.getElement(node), ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'], rootNode);
        });
        range.deleteContents();
        var block = html.getClosestTag(html.getElement(range.startContainer), ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'], rootNode);
        var last = fragment.lastChild;
        if (block && fragment.querySelector('p,div,h1,h2,h3,h4,h5,h6,ul,ol,blockquote,pre,table,hr')) {
            var tailRange = range.cloneRange();
            tailRange.setEnd(block, block.childNodes.length);
            var tail = block.cloneNode(false);
            tail.removeAttribute('id');
            tail.appendChild(tailRange.extractContents());
            block.parentNode.insertBefore(fragment, block.nextSibling);
            if (tail.textContent || tail.querySelector('br,img,video,audio')) { last.parentNode.insertBefore(tail, last.nextSibling); }
            if (!block.textContent && !block.querySelector('br,img,video,audio')) { block.remove(); }
        } else {
            range.insertNode(fragment);
        }
        edges.forEach(function (edge) {
            if (edge && edge.isConnected && !edge.contains(last) && !edge.textContent && !edge.querySelector('img,video,audio')) {
                edge.remove();
            }
        });
        html.moveSelectionAfterNode(last, current);
        return true;
    }

    return { clean: clean, insert: insert };
}));
