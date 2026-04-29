(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.WysiwygEmbedContent = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function getCurrentSelection(selection) {
        return selection || window.getSelection();
    }

    function moveSelectionToNodeStart(node, selection) {
        var range = document.createRange();

        range.selectNodeContents(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function moveSelectionAfterNode(node, selection) {
        var range = document.createRange();

        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function createTableCell(tagName) {
        var cell = document.createElement(tagName);
        cell.appendChild(document.createElement('br'));
        return cell;
    }

    function insertImage(attributes, selection) {
        var currentSelection = getCurrentSelection(selection);
        var range;
        var image;

        if (!attributes || !attributes.src || currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);
        range.deleteContents();
        image = document.createElement('img');
        image.setAttribute('src', attributes.src);

        ['alt', 'title', 'width', 'height'].forEach(function (name) {
            if (attributes[name] !== undefined && attributes[name] !== null && attributes[name] !== '') {
                image.setAttribute(name, attributes[name]);
            }
        });

        range.insertNode(image);
        moveSelectionAfterNode(image, currentSelection);

        return image;
    }

    function insertTable(config, selection) {
        var currentSelection = getCurrentSelection(selection);
        var range;
        var settings = config || {};
        var rows = Math.max(1, Number(settings.rows) || 2);
        var cols = Math.max(1, Number(settings.cols) || 2);
        var table = document.createElement('table');
        var tbody = document.createElement('tbody');
        var thead;
        var rowIndex;
        var colIndex;
        var row;
        var followParagraph;

        if (currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);
        range.deleteContents();

        if (settings.headerRow) {
            thead = document.createElement('thead');
            row = document.createElement('tr');

            for (colIndex = 0; colIndex < cols; colIndex += 1) {
                row.appendChild(createTableCell('th'));
            }

            thead.appendChild(row);
            table.appendChild(thead);
        }

        for (rowIndex = 0; rowIndex < rows; rowIndex += 1) {
            row = document.createElement('tr');

            for (colIndex = 0; colIndex < cols; colIndex += 1) {
                row.appendChild(createTableCell('td'));
            }

            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        range.insertNode(table);

        followParagraph = document.createElement('p');
        followParagraph.appendChild(document.createElement('br'));
        table.parentNode.insertBefore(followParagraph, table.nextSibling);

        moveSelectionToNodeStart((thead || tbody).querySelector('th,td'), currentSelection);

        return table;
    }

    return {
        insertImage: insertImage,
        insertTable: insertTable
    };
}));