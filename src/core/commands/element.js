(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../html-utility'));
    } else {
        root.WysiwygElementCommands = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    function capabilities(element, rootNode) {
        var valid = !!(element && element.nodeType === 1 && rootNode.contains(element));
        var editable = valid && element !== rootNode;
        return {
            select: valid,
            start: valid,
            end: valid,
            unwrap: editable && element.hasChildNodes() && !/^(TABLE|THEAD|TBODY|TFOOT|TR|TD|TH|COLGROUP|UL|OL|LI|DL|DT|DD|SELECT|OPTION|OPTGROUP|VIDEO|AUDIO)$/.test(element.tagName),
            remove: editable,
            clearStyle: editable && element.hasAttribute('style')
        };
    }

    function select(element, selection, position) {
        var current = html.getCurrentSelection(selection);
        if (!current) { return false; }
        var range = element.ownerDocument.createRange();
        if (/^(IMG|HR|BR|VIDEO|AUDIO|INPUT)$/.test(element.tagName)) {
            range.selectNode(element);
        } else {
            range.selectNodeContents(element);
        }
        if (position) { range.collapse(position === 'start'); }
        current.removeAllRanges();
        current.addRange(range);
        return true;
    }

    function apply(element, action, selection, rootNode) {
        if (capabilities(element, rootNode)[action] !== true) { return false; }
        if (action === 'select' || action === 'start' || action === 'end') {
            return select(element, selection, action === 'select' ? null : action);
        }
        if (action === 'clearStyle') {
            element.removeAttribute('style');
            return select(element, selection);
        }
        var current = html.getCurrentSelection(selection);
        var range = element.ownerDocument.createRange();
        var parent = element.parentNode;
        var offset = Array.prototype.indexOf.call(parent.childNodes, element);
        var bookmark = html.getSelectionBookmark(current, rootNode, 'live');
        if (action === 'unwrap') {
            html.unwrapNode(element);
            if (html.restoreSelectionBookmark(bookmark, current, rootNode)) { return true; }
        } else {
            element.remove();
        }
        range.setStart(parent, Math.min(offset, parent.childNodes.length));
        range.collapse(true);
        current.removeAllRanges();
        current.addRange(range);
        return true;
    }

    return { apply: apply, capabilities: capabilities };
}));
