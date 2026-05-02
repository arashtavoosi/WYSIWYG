(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.WysiwygMarkupNormalization = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function hasMeaningfulContent(node) {
        return Array.from(node.childNodes).some(function (child) {
            if (child.nodeType === Node.TEXT_NODE) {
                return child.textContent.length > 0;
            }

            if (child.nodeType === Node.ELEMENT_NODE) {
                return hasMeaningfulContent(child);
            }

            return true;
        });
    }

    function removeEmptyFormattingElements(tagName, context) {
        var root = context || document.body;

        function visit(node) {
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return;
            }

            Array.from(node.childNodes).forEach(visit);

            if (node !== root && node.tagName.toLowerCase() === tagName.toLowerCase() && !hasMeaningfulContent(node)) {
                node.parentNode.removeChild(node);
            }
        }

        visit(root);
        return root;
    }

    function removeEmptyFormattingNodes(node, tagNames) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        Array.from(node.childNodes).forEach(function (child) {
            removeEmptyFormattingNodes(child, tagNames);
        });

        if (tagNames.indexOf(node.tagName) !== -1 && !hasMeaningfulContent(node) && node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }

    function simplifyNestedTags(tagNames, context) {
        var root = context || document.body;
        var names = Array.isArray(tagNames) ? tagNames : [tagNames];

        names.forEach(function (tagName) {
            var elements = root.querySelectorAll(tagName);

            elements.forEach(function (element) {
                var childElements = element.querySelectorAll(tagName);

                childElements.forEach(function (child) {
                    if (child !== element && child.parentElement === element) {
                        if (child.attributes.length === 0 && child.classList.length === 0) {
                            while (child.firstChild) {
                                element.insertBefore(child.firstChild, child);
                            }
                            element.removeChild(child);
                        }
                    }
                });
            });

            elements = root.querySelectorAll(tagName);

            elements.forEach(function (element) {
                var nextSibling;

                if (element.attributes.length > 0 || element.classList.length > 0) {
                    return;
                }

                nextSibling = element.nextSibling;

                while (nextSibling) {
                    var canMerge = false;

                    if (nextSibling.nodeType === Node.TEXT_NODE) {
                        if (/^[\s\t\n\r]*$/.test(nextSibling.textContent)) {
                            element.appendChild(nextSibling);
                            canMerge = true;
                        } else {
                            break;
                        }
                    } else if (
                        nextSibling.nodeType === Node.ELEMENT_NODE &&
                        nextSibling.tagName.toLowerCase() === tagName.toLowerCase() &&
                        nextSibling.attributes.length === 0 &&
                        nextSibling.classList.length === 0
                    ) {
                        Array.from(nextSibling.childNodes).forEach(function (child) {
                            element.appendChild(child);
                        });

                        var toRemove = nextSibling;

                        nextSibling = nextSibling.nextSibling;
                        toRemove.parentNode.removeChild(toRemove);
                        canMerge = true;
                    } else {
                        break;
                    }

                    if (canMerge) {
                        nextSibling = element.nextSibling;
                    }
                }
            });
        });

        return root;
    }

    function simplifyAllFormattingTags(context) {
        var root = context || document.body;

        simplifyNestedTags(['strong', 'em', 'u'], root);
        removeEmptyFormattingNodes(root, ['STRONG', 'EM', 'U', 'B', 'I', 'SPAN']);
        root.normalize();

        return root;
    }

    return {
        removeEmptyFormattingElements: removeEmptyFormattingElements,
        removeEmptyFormattingNodes: removeEmptyFormattingNodes,
        simplifyAllFormattingTags: simplifyAllFormattingTags,
        simplifyNestedTags: simplifyNestedTags
    };
}));
