function wrapSelectionInHTML(htmlString, selectionRange, tag) {
    // Step 1: Parse the HTML string into a DOM structure
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const body = doc.body;

    // Step 2: Get the selection range as DOM nodes and offsets
    const startNode = getNodeAtPosition(body, selectionRange.startOffset);
    const endNode = getNodeAtPosition(body, selectionRange.endOffset);

    // Step 3: Split the selection across boundaries
    const ranges = splitRangeAcrossBoundaries(body, startNode, endNode);

    // Step 4: Wrap each range with the specified tag, skipping empty ranges
    ranges.forEach(range => {
        if (range.toString().trim()) { // Only wrap non-empty selections
            wrapRange(range, tag);
        }
    });

    // Step 5: Merge adjacent or nested identical tags
    mergeDuplicateWrappers(body, tag);

    // Step 6: Generate the modified HTML
    const modifiedHtml = body.innerHTML;

    // Step 7: Return the modified HTML
    return modifiedHtml;
}

function getNodeAtPosition(root, position) {
    let node = root.firstChild;
    let offset = position;

    while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (offset <= node.textContent.length) {
                return { node, offset };
            }
            offset -= node.textContent.length;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (offset <= node.textContent.length) {
                return getNodeAtPosition(node, offset);
            }
            offset -= node.textContent.length;
        }
        node = node.nextSibling;
    }
    return null;
}

function splitRangeAcrossBoundaries(root, start, end) {
    const ranges = [];
    let currentRange = document.createRange();

    let currentNode = start.node;
    let currentOffset = start.offset;

    while (currentNode && currentNode !== end.node) {
        if (currentNode.nodeType === Node.TEXT_NODE) {
            currentRange.setStart(currentNode, currentOffset);
            currentRange.setEnd(currentNode, currentNode.textContent.length);
            ranges.push(currentRange.cloneRange());

            currentRange = document.createRange();
            currentNode = getNextNode(currentNode, root);
            currentOffset = 0;
        } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
            if (currentNode.firstChild) {
                currentNode = currentNode.firstChild;
            } else {
                currentNode = getNextNode(currentNode, root);
            }
        }
    }

    if (currentNode) {
        currentRange.setStart(currentNode, currentOffset);
        currentRange.setEnd(end.node, end.offset);
        ranges.push(currentRange);
    }

    return ranges;
}

function getNextNode(node, root) {
    if (node.nextSibling) {
        return node.nextSibling;
    } else {
        let parent = node.parentNode;
        while (parent && parent !== root && !parent.nextSibling) {
            parent = parent.parentNode;
        }
        return parent && parent !== root ? parent.nextSibling : null;
    }
}

function wrapRange(range, tag) {
    const wrapper = document.createElement(tag);
    range.surroundContents(wrapper);
}

function mergeDuplicateWrappers(root, tag) {
    const elements = root.querySelectorAll(tag);

    elements.forEach(element => {
        // Merge nested identical tags
        let parent = element.parentElement;
        while (parent && parent.tagName.toLowerCase() === tag) {
            while (element.firstChild) {
                parent.insertBefore(element.firstChild, element);
            }
            parent.removeChild(element);
            element = parent;
            parent = element.parentElement;
        }

        // Merge consecutive identical tags
        const previousSibling = element.previousSibling;
        if (previousSibling && previousSibling.tagName && previousSibling.tagName.toLowerCase() === tag) {
            while (element.firstChild) {
                previousSibling.appendChild(element.firstChild);
            }
            element.remove();
        }
    });
}