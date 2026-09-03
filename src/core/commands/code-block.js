(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../html-utility'));
    } else {
        root.WysiwygCodeBlockCommands = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    function insertNode(node, selection) {
        var currentSelection = html.getCurrentSelection(selection);
        var range;

        if (!node || !currentSelection || currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(node);
        html.moveSelectionAfterNode(node, currentSelection);
        return node;
    }

    function insertCodeBlock(value, language, selection) {
        var currentSelection = html.getCurrentSelection(selection);
        var range;
        var block;
        var existing;
        var pre;
        var code;

        if (!currentSelection || currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);
        existing = html.getSelectedElement(range, 'pre') || html.getClosestTag(range.commonAncestorContainer, 'pre');
        if (existing) {
            code = existing.querySelector('code') || document.createElement('code');
            if (!code.parentNode) {
                existing.textContent = '';
                existing.appendChild(code);
            }
            code.textContent = value || '';
            code.className = language ? 'language-' + String(language).replace(/[^a-z0-9_-]/gi, '') : '';
            html.moveSelectionToNodeStart(code, currentSelection);
            return existing;
        }

        pre = document.createElement('pre');
        code = document.createElement('code');
        code.textContent = value || '';
        if (language) {
            code.className = 'language-' + String(language).replace(/[^a-z0-9_-]/gi, '');
        }
        pre.appendChild(code);

        block = html.getClosestTag(range.commonAncestorContainer, ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote']);
        if (block && block.parentNode) {
            block.parentNode.insertBefore(pre, block.nextSibling);
            html.moveSelectionAfterNode(pre, currentSelection);
            return pre;
        }

        return insertNode(pre, selection);
    }

    return {
        insertCodeBlock: insertCodeBlock
    };
}));
