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

        if (attributes.filePath) {
            image.setAttribute('data-file-path', attributes.filePath);
        }

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

        if (attributes.filePath === null || attributes.filePath === '') {
            image.removeAttribute('data-file-path');
        } else if (attributes.filePath !== undefined) {
            image.setAttribute('data-file-path', attributes.filePath);
        }

        return image;
    }

    function getSelectedImage(selection, rootNode) {
        var image = html.getSelectedElement(html.getCurrentSelection(selection), 'img');

        return image && (!rootNode || rootNode.contains(image)) ? image : null;
    }

    function cleanImageStyle(image) {
        if (!image.getAttribute('style')) {
            image.removeAttribute('style');
        }
    }

    function setImageStyle(propertyName, value, selection, options) {
        var image = getSelectedImage(selection, options && options.root);
        var cssProperty;

        if (!image || !propertyName) {
            return false;
        }

        cssProperty = propertyName.replace(/[A-Z]/g, function (letter) {
            return '-' + letter.toLowerCase();
        });

        if (value === undefined || value === null || value === '') {
            image.style.removeProperty(cssProperty);
        } else {
            image.style.setProperty(cssProperty, value);
        }

        cleanImageStyle(image);
        return image;
    }

    function toggleImageFullSize(selection, options) {
        var image = getSelectedImage(selection, options && options.root);

        if (!image) {
            return false;
        }

        image.style.width = image.style.width === '100%' ? '' : '100%';
        cleanImageStyle(image);
        return image;
    }

    function setImageLayout(layout, selection, options) {
        var image = getSelectedImage(selection, options && options.root);

        if (!image || ['inline', 'block', 'float-left', 'float-right'].indexOf(layout) === -1) {
            return false;
        }

        image.style.removeProperty('display');
        image.style.removeProperty('float');

        if (layout === 'block') {
            image.style.display = 'block';
        } else if (layout === 'float-left' || layout === 'float-right') {
            image.style.float = layout === 'float-left' ? 'left' : 'right';
        }

        cleanImageStyle(image);
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
        html.toArray(row.children).forEach(function (rowCell) {
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
        var section = row && row.parentNode;
        var nextCell = row && (row.nextElementSibling || row.previousElementSibling);

        if (!row) {
            return false;
        }

        section.removeChild(row);

        if (section && !section.querySelector('tr')) {
            section.parentNode.removeChild(section);
        }

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
        var rowIndex = cell && cell.parentNode.rowIndex;
        var insertedIndex = position === 'before' ? index : index + 1;

        if (!table || index < 0) {
            return false;
        }

        html.toArray(table.rows).forEach(function (row) {
            var reference = row.cells[position === 'before' ? index : index + 1] || null;
            row.insertBefore(createTableCell(row.parentNode.tagName === 'THEAD' ? 'th' : 'td'), reference);
        });

        html.moveSelectionToNodeStart(table.rows[rowIndex].cells[insertedIndex], currentSelection);
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

        html.toArray(table.rows).forEach(function (row) {
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
            html.toArray(row.cells).forEach(function (cell) {
                html.replaceTag(cell, 'td');
            });
            tbody.insertBefore(row, tbody.firstChild);
            table.removeChild(thead);
        } else if (tbody.rows[0]) {
            thead = document.createElement('thead');
            row = tbody.rows[0];
            html.toArray(row.cells).forEach(function (cell) {
                html.replaceTag(cell, 'th');
            });
            thead.appendChild(row);
            table.insertBefore(thead, tbody);
        }

        html.moveSelectionToNodeStart(row.querySelector('th,td'), currentSelection);
        return true;
    }

    function toggleTableFullSize(selection, options) {
        var table = html.getSelectedTable(selection, options && options.root);

        if (!table) {
            return false;
        }

        if (table.style.width === '100%') {
            table.style.removeProperty('width');
        } else {
            table.style.width = '100%';
        }

        if (!table.getAttribute('style')) {
            table.removeAttribute('style');
        }

        return table;
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

    function getTableGrid(table) {
        var grid = [];

        html.toArray(table.rows).forEach(function (row, rowIndex) {
            var columnIndex = 0;

            grid[rowIndex] = grid[rowIndex] || [];
            html.toArray(row.cells).forEach(function (cell) {
                var rowOffset;
                var columnOffset;

                while (grid[rowIndex][columnIndex]) {
                    columnIndex += 1;
                }

                for (rowOffset = 0; rowOffset < cell.rowSpan; rowOffset += 1) {
                    grid[rowIndex + rowOffset] = grid[rowIndex + rowOffset] || [];

                    for (columnOffset = 0; columnOffset < cell.colSpan; columnOffset += 1) {
                        grid[rowIndex + rowOffset][columnIndex + columnOffset] = cell;
                    }
                }

                columnIndex += cell.colSpan;
            });
        });

        return grid;
    }

    function getGridPosition(grid, cell) {
        var rowIndex;
        var columnIndex;

        for (rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
            columnIndex = grid[rowIndex].indexOf(cell);

            if (columnIndex !== -1) {
                return { row: rowIndex, column: columnIndex };
            }
        }

        return null;
    }

    function hasCellContent(cell) {
        return cell.textContent.trim() !== '' || html.toArray(cell.childNodes).some(function (node) {
            return node.nodeType !== Node.ELEMENT_NODE || node.tagName !== 'BR';
        });
    }

    function appendCellContent(target, source) {
        if (!hasCellContent(source)) {
            return;
        }

        if (!hasCellContent(target)) {
            target.innerHTML = '';
        } else {
            target.appendChild(document.createElement('br'));
        }

        while (source.firstChild) {
            target.appendChild(source.firstChild);
        }
    }

    function mergeTableCells(cells, selection) {
        var selected = html.unique(html.toArray(cells).filter(function (cell) {
            return cell && /^(TD|TH)$/.test(cell.tagName);
        }));
        var table = selected[0] && html.getClosestTag(selected[0], 'table');
        var grid;
        var positions;
        var minRow;
        var maxRow;
        var minColumn;
        var maxColumn;
        var keeper;
        var rowIndex;
        var columnIndex;

        if (selected.length < 2 || !table || selected.some(function (cell) {
            return html.getClosestTag(cell, 'table') !== table || cell.rowSpan !== 1 || cell.colSpan !== 1 || cell.parentNode.parentNode !== selected[0].parentNode.parentNode;
        })) {
            return false;
        }

        grid = getTableGrid(table);
        positions = selected.map(function (cell) { return getGridPosition(grid, cell); });
        minRow = Math.min.apply(Math, positions.map(function (position) { return position.row; }));
        maxRow = Math.max.apply(Math, positions.map(function (position) { return position.row; }));
        minColumn = Math.min.apply(Math, positions.map(function (position) { return position.column; }));
        maxColumn = Math.max.apply(Math, positions.map(function (position) { return position.column; }));

        if (selected.length !== (maxRow - minRow + 1) * (maxColumn - minColumn + 1)) {
            return false;
        }

        for (rowIndex = minRow; rowIndex <= maxRow; rowIndex += 1) {
            for (columnIndex = minColumn; columnIndex <= maxColumn; columnIndex += 1) {
                if (selected.indexOf(grid[rowIndex][columnIndex]) === -1) {
                    return false;
                }
            }
        }

        keeper = grid[minRow][minColumn];
        selected.sort(function (left, right) {
            var leftPosition = getGridPosition(grid, left);
            var rightPosition = getGridPosition(grid, right);
            return leftPosition.row - rightPosition.row || leftPosition.column - rightPosition.column;
        }).forEach(function (cell) {
            if (cell !== keeper) {
                appendCellContent(keeper, cell);
                cell.parentNode.removeChild(cell);
            }
        });

        keeper.rowSpan = maxRow - minRow + 1;
        keeper.colSpan = maxColumn - minColumn + 1;
        html.moveSelectionToNodeStart(keeper, html.getCurrentSelection(selection));
        return keeper;
    }

    function unmergeTableCell(cell, selection) {
        var table = cell && html.getClosestTag(cell, 'table');
        var rowSpan = cell && cell.rowSpan;
        var columnSpan = cell && cell.colSpan;
        var grid;
        var position;
        var created = [];
        var rowOffset;
        var columnOffset;

        if (!table || (rowSpan === 1 && columnSpan === 1)) {
            return false;
        }

        grid = getTableGrid(table);
        position = getGridPosition(grid, cell);
        cell.removeAttribute('rowspan');
        cell.removeAttribute('colspan');

        for (rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
            for (columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
                var row;
                var targetColumn;
                var reference = null;
                var newCell;

                if (rowOffset === 0 && columnOffset === 0) {
                    continue;
                }

                row = table.rows[position.row + rowOffset];
                targetColumn = position.column + columnOffset;
                html.toArray(row.cells).some(function (rowCell) {
                    var rowCellPosition = getGridPosition(grid, rowCell);

                    if (rowCell !== cell && rowCellPosition && rowCellPosition.column > targetColumn) {
                        reference = rowCell;
                        return true;
                    }

                    return false;
                });
                newCell = createTableCell(row.parentNode.tagName === 'THEAD' ? 'th' : 'td');
                row.insertBefore(newCell, reference);
                created.push(newCell);
            }
        }

        html.moveSelectionToNodeStart(cell, html.getCurrentSelection(selection));
        return [cell].concat(created);
    }

    return {
        insertImage: insertImage,
        insertTable: insertTable,
        insertTableColumn: insertTableColumn,
        insertTableRow: insertTableRow,
        mergeTableCells: mergeTableCells,
        removeImage: removeImage,
        removeTable: removeTable,
        removeTableColumn: removeTableColumn,
        removeTableRow: removeTableRow,
        setImageLayout: setImageLayout,
        setImageStyle: setImageStyle,
        toggleTableFullSize: toggleTableFullSize,
        toggleTableHeaderRow: toggleTableHeaderRow,
        toggleImageFullSize: toggleImageFullSize,
        unmergeTableCell: unmergeTableCell,
        updateImage: updateImage
    };
}));
