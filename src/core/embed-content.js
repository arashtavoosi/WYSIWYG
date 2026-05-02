(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./html-utility'));
    } else {
        root.WysiwygEmbedContent = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    function createTableCell(tagName) {
        var cell = document.createElement(tagName);
        cell.appendChild(document.createElement('br'));
        return cell;
    }

    function replaceCellTag(cell, tagName) {
        var replacement = document.createElement(tagName);

        while (cell.firstChild) {
            replacement.appendChild(cell.firstChild);
        }

        cell.parentNode.replaceChild(replacement, cell);
        return replacement;
    }

    function insertImage(attributes, selection) {
        var currentSelection = html.getCurrentSelection(selection);
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
        html.moveSelectionAfterNode(image, currentSelection);

        return image;
    }

    function updateImage(attributes, selection) {
        var image = html.getSelectedElement(html.getCurrentSelection(selection), 'img');

        if (!image || !attributes) {
            return false;
        }

        ['src', 'alt', 'title', 'width', 'height'].forEach(function (name) {
            if (attributes[name] === null || attributes[name] === undefined || attributes[name] === '') {
                image.removeAttribute(name);
            } else {
                image.setAttribute(name, attributes[name]);
            }
        });

        return image;
    }

    function removeImage(selection) {
        var currentSelection = html.getCurrentSelection(selection);
        var image = html.getSelectedElement(currentSelection, 'img');

        if (!image) {
            return false;
        }

        html.moveSelectionAfterNode(image, currentSelection);
        image.parentNode.removeChild(image);
        return true;
    }

    function insertTable(config, selection) {
        var currentSelection = html.getCurrentSelection(selection);
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

        html.moveSelectionToNodeStart((thead || tbody).querySelector('th,td'), currentSelection);

        return table;
    }

    function insertTableRow(position, selection) {
        var currentSelection = html.getCurrentSelection(selection);
        var cell = html.getSelectedElement(currentSelection, 'td') || html.getSelectedElement(currentSelection, 'th');
        var row = cell && html.getClosestTag(cell, 'tr');
        var newRow;

        if (!row) {
            return false;
        }

        newRow = row.cloneNode(false);
        Array.from(row.children).forEach(function (rowCell) {
            newRow.appendChild(createTableCell(rowCell.tagName.toLowerCase()));
        });

        row.parentNode.insertBefore(newRow, position === 'before' ? row : row.nextSibling);
        html.moveSelectionToNodeStart(newRow.cells[Math.min(cell.cellIndex, newRow.cells.length - 1)], currentSelection);
        return newRow;
    }

    function removeTableRow(selection) {
        var currentSelection = html.getCurrentSelection(selection);
        var cell = html.getSelectedElement(currentSelection, 'td') || html.getSelectedElement(currentSelection, 'th');
        var row = cell && html.getClosestTag(cell, 'tr');
        var table = row && html.getClosestTag(row, 'table');
        var nextCell = row && (row.nextElementSibling || row.previousElementSibling);

        if (!row) {
            return false;
        }

        row.parentNode.removeChild(row);

        if (!table.querySelector('tr')) {
            table.parentNode.removeChild(table);
            return true;
        }

        html.moveSelectionToNodeStart((nextCell || table).querySelector('th,td'), currentSelection);
        return true;
    }

    function insertTableColumn(position, selection) {
        var currentSelection = html.getCurrentSelection(selection);
        var cell = html.getSelectedElement(currentSelection, 'td') || html.getSelectedElement(currentSelection, 'th');
        var table = cell && html.getClosestTag(cell, 'table');
        var index = cell && cell.cellIndex;

        if (!table || index < 0) {
            return false;
        }

        Array.from(table.rows).forEach(function (row) {
            var reference = row.cells[position === 'before' ? index : index + 1] || null;
            row.insertBefore(createTableCell(row.parentNode.tagName === 'THEAD' ? 'th' : 'td'), reference);
        });

        html.moveSelectionToNodeStart(table.rows[0].cells[position === 'before' ? index : index + 1], currentSelection);
        return true;
    }

    function removeTableColumn(selection) {
        var currentSelection = html.getCurrentSelection(selection);
        var cell = html.getSelectedElement(currentSelection, 'td') || html.getSelectedElement(currentSelection, 'th');
        var table = cell && html.getClosestTag(cell, 'table');
        var index = cell && cell.cellIndex;

        if (!table || index < 0) {
            return false;
        }

        Array.from(table.rows).forEach(function (row) {
            if (row.cells[index]) {
                row.removeChild(row.cells[index]);
            }
        });

        if (!table.querySelector('th,td')) {
            table.parentNode.removeChild(table);
            return true;
        }

        html.moveSelectionToNodeStart(table.querySelector('th,td'), currentSelection);
        return true;
    }

    function toggleTableHeaderRow(selection) {
        var currentSelection = html.getCurrentSelection(selection);
        var table = html.getSelectedElement(currentSelection, 'table') || html.getClosestTag(html.getSelectedElement(currentSelection, 'td') || html.getSelectedElement(currentSelection, 'th'), 'table');
        var thead = table && table.querySelector('thead');
        var tbody = table && table.querySelector('tbody');
        var row;

        if (!table || !tbody) {
            return false;
        }

        if (thead) {
            row = thead.rows[0];
            Array.from(row.cells).forEach(function (cell) {
                replaceCellTag(cell, 'td');
            });
            tbody.insertBefore(row, tbody.firstChild);
            table.removeChild(thead);
        } else if (tbody.rows[0]) {
            thead = document.createElement('thead');
            row = tbody.rows[0];
            Array.from(row.cells).forEach(function (cell) {
                replaceCellTag(cell, 'th');
            });
            thead.appendChild(row);
            table.insertBefore(thead, tbody);
        }

        html.moveSelectionToNodeStart(row.querySelector('th,td'), currentSelection);
        return true;
    }

    function removeTable(selection) {
        var currentSelection = html.getCurrentSelection(selection);
        var table = html.getSelectedElement(currentSelection, 'table') || html.getClosestTag(html.getSelectedElement(currentSelection, 'td') || html.getSelectedElement(currentSelection, 'th'), 'table');

        if (!table) {
            return false;
        }

        html.moveSelectionAfterNode(table, currentSelection);
        table.parentNode.removeChild(table);
        return true;
    }

    return {
        insertImage: insertImage,
        insertTable: insertTable,
        insertTableColumn: insertTableColumn,
        insertTableRow: insertTableRow,
        removeImage: removeImage,
        removeTable: removeTable,
        removeTableColumn: removeTableColumn,
        removeTableRow: removeTableRow,
        toggleTableHeaderRow: toggleTableHeaderRow,
        updateImage: updateImage
    };
}));
