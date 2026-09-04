(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../html-utility'));
    } else {
        root.WysiwygListCommands = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    function toggleList(listType, selection, options) {
        var rootNode = options && options.root;
        var current = html.getCurrentSelection(selection);
        if (!current || !current.rangeCount || !/^(ul|ol)$/.test(listType)) { return false; }
        var range = current.getRangeAt(0);
        if (!rootNode.contains(range.commonAncestorContainer)) { return false; }
        var blocks = html.getSelectedBlocks(rootNode, range);
        if (!blocks.length) { blocks = [html.ensureBlock(rootNode, range)]; }
        blocks = html.unique(blocks.map(function (block) {
            return html.getClosestTag(block, 'li', rootNode) || block;
        }));
        var remove = blocks.every(function (block) {
            return block.tagName === 'LI' && block.parentNode.tagName.toLowerCase() === listType;
        });
        blocks.forEach(function (block) {
            if (/^(TD|TH)$/.test(block.tagName)) {
                var cellList = document.createElement(listType);
                var cellItem = document.createElement('li');
                while (block.firstChild) { cellItem.appendChild(block.firstChild); }
                cellList.appendChild(cellItem);
                block.appendChild(cellList);
                return;
            }
            var list = block.tagName === 'LI' ? block.parentNode : null;
            var parent = list ? list.parentNode : block.parentNode;
            var item;
            var target;
            if (list) {
                // Split at the selected item, preserving both unselected sides.
                var after = list.cloneNode(false);
                after.removeAttribute('id');
                if (list.tagName === 'OL') {
                    var ordinal = list.hasAttribute('start') ? Number(list.getAttribute('start')) : list.reversed ? list.children.length : 1;
                    if (list.reversed && !list.hasAttribute('start')) { list.start = ordinal; }
                    Array.from(list.children).some(function (child) {
                        if (child.hasAttribute('value')) { ordinal = Number(child.getAttribute('value')); }
                        ordinal += list.reversed ? -1 : 1;
                        return child === block;
                    });
                    after.start = ordinal;
                }
                var next = block.nextSibling;
                while (next) {
                    var following = next.nextSibling;
                    after.appendChild(next);
                    next = following;
                }
                parent.insertBefore(block, list.nextSibling);
                if (after.firstChild) { parent.insertBefore(after, block.nextSibling); }
                if (!list.firstChild) { list.remove(); }
            }
            if (remove) {
                // Nested lists remain siblings of the paragraph, never inside it.
                var paragraph = document.createElement('p');
                parent.insertBefore(paragraph, block);
                Array.from(block.childNodes).forEach(function (child) {
                    if (/^(UL|OL)$/.test(child.nodeName)) { parent.insertBefore(child, block); }
                    else { paragraph.appendChild(child); }
                });
                if (!paragraph.firstChild) { paragraph.appendChild(document.createElement('br')); }
                block.remove();
                return;
            }
            target = document.createElement(listType);
            parent.insertBefore(target, block);
            if (block.tagName === 'LI') {
                item = block;
            } else {
                item = document.createElement('li');
                while (block.firstChild) { item.appendChild(block.firstChild); }
                block.remove();
            }
            target.appendChild(item);
            [target.previousSibling, target.nextSibling].forEach(function (neighbor) {
                if (!neighbor || neighbor.nodeName !== target.nodeName || neighbor.attributes.length) { return; }
                if (neighbor === target.previousSibling) {
                    while (neighbor.lastChild) { target.insertBefore(neighbor.lastChild, target.firstChild); }
                } else {
                    while (neighbor.firstChild) { target.appendChild(neighbor.firstChild); }
                }
                neighbor.remove();
            });
        });
        return true;
    }

    return { toggleList: toggleList };
}));
