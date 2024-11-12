var htmlUtility = (function () {

    function htmlUtility(selector, context) {
        if (!(this instanceof htmlUtility)) {
            return new htmlUtility(selector, context);
        }

        this.prevElements = [];
        this.elements = [];

        if (!selector) {
            return this;
        }

        this.elements = _parseSelectorOrElements(selector, context);

        return this;
    }

    // Private helper methods
    function _parseSelectorOrElements(input, context) {
        var elements = [];

        if (typeof input === 'string') {
            var nodeList = (context || document).querySelectorAll(input);
            elements = Array.prototype.slice.call(nodeList);
        } else if (input instanceof Node) {
            elements = [input];
        } else if (input instanceof NodeList || Array.isArray(input)) {
            elements = Array.prototype.slice.call(input);
        } else if (input instanceof htmlUtility) {
            elements = input.elements;
        }

        return elements;
    }

    function _createWrapperElement(wrapper) {
        var wrapperElement;

        if (typeof wrapper === 'string') {
            var temp = document.createElement('div');
            temp.innerHTML = wrapper.trim();
            wrapperElement = temp.firstChild;
        } else if (wrapper instanceof htmlUtility) {
            wrapperElement = wrapper.elements[0].cloneNode(true);
        } else if (wrapper instanceof Node) {
            wrapperElement = wrapper.cloneNode(true);
        } else {
            throw new Error('Invalid wrapper provided');
        }

        return wrapperElement;
    }

    function _getContentElements(content) {
        var contentElements;

        if (typeof content === 'string') {
            var temp = document.createElement('div');
            temp.innerHTML = content.trim();
            contentElements = Array.prototype.slice.call(temp.childNodes);
        } else {
            contentElements = _parseSelectorOrElements(content);
        }

        return contentElements;
    }

    function _normalizeElements(elements) {
        return elements.filter(function (el, index, self) {
            return self.indexOf(el) === index;
        });
    }

    htmlUtility.prototype = {
        constructor: htmlUtility,

        each: function (callback) {
            this.elements.forEach(function (el, index) {
                callback.call(el, index, el);
            });
            return this;
        },

        addClass: function (className) {
            return this.each(function () {
                this.classList.add(className);
            });
        },

        removeClass: function (className) {
            return this.each(function () {
                this.classList.remove(className);
            });
        },

        hasClass: function (className) {
            return this.elements.some(function (el) {
                return el.classList.contains(className);
            });
        },

        attr: function (attributeName, value) {
            if (value === undefined) {
                return this.elements.length > 0 ? this.elements[0].getAttribute(attributeName) : undefined;
            } else {
                return this.each(function () {
                    this.setAttribute(attributeName, value);
                });
            }
        },

        removeAttr: function (attributeName) {
            return this.each(function () {
                this.removeAttribute(attributeName);
            });
        },

        removeProp: function (propName) {
            return this.each(function () {
                delete this[propName];
            });
        },

        html: function (htmlString) {
            if (htmlString === undefined) {
                return this.elements.length > 0 ? this.elements[0].innerHTML : undefined;
            } else {
                return this.each(function () {
                    this.innerHTML = htmlString;
                });
            }
        },

        append: function (content) {
            var contentElements = _getContentElements(content);
            return this.each(function () {
                var parent = this;
                contentElements.forEach(function (el) {
                    parent.appendChild(el.cloneNode(true));
                });
            });
        },

        appendTo: function (target) {
            var targetElements = _parseSelectorOrElements(target);
            return this.each(function () {
                var source = this;
                targetElements.forEach(function (targetEl) {
                    targetEl.appendChild(source.cloneNode(true));
                });
            });
        },

        add: function (selector) {
            var newElements = _parseSelectorOrElements(selector);
            this.elements = _normalizeElements(this.elements.concat(newElements));
            return this;
        },

        after: function (content) {
            var contentElements = _getContentElements(content);
            return this.each(function () {
                var parent = this.parentNode;
                var nextSibling = this.nextSibling;
                contentElements.forEach(function (el) {
                    parent.insertBefore(el.cloneNode(true), nextSibling);
                });
            });
        },

        before: function (content) {
            var contentElements = _getContentElements(content);
            return this.each(function () {
                var parent = this.parentNode;
                contentElements.forEach(function (el) {
                    parent.insertBefore(el.cloneNode(true), this);
                }, this);
            });
        },

        parent: function () {
            var parents = [];
            this.each(function () {
                if (this.parentNode && parents.indexOf(this.parentNode) === -1) {
                    parents.push(this.parentNode);
                }
            });
            var newHtmlUtility = htmlUtility(parents);
            newHtmlUtility.prevElements = this.elements;
            return newHtmlUtility;
        },

        children: function () {
            var children = [];
            this.each(function () {
                children = children.concat(Array.prototype.slice.call(this.children));
            });
            var newHtmlUtility = htmlUtility(children);
            newHtmlUtility.prevElements = this.elements;
            return newHtmlUtility;
        },

        contents: function () {
            var contents = [];
            this.each(function () {
                contents = contents.concat(Array.prototype.slice.call(this.childNodes));
            });
            var newHtmlUtility = htmlUtility(contents);
            newHtmlUtility.prevElements = this.elements;
            return newHtmlUtility;
        },

        clone: function () {
            var clones = [];
            this.each(function () {
                clones.push(this.cloneNode(true));
            });
            return htmlUtility(clones);
        },

        closest: function (selector) {
            var matched = [];
            this.each(function () {
                var el = this;
                while (el && el !== document) {
                    if (el.matches(selector)) {
                        if (matched.indexOf(el) === -1) {
                            matched.push(el);
                        }
                        break;
                    }
                    el = el.parentElement;
                }
            });
            return htmlUtility(matched);
        },

        wrap: function (wrapper) {
            var wrapperElement = _createWrapperElement(wrapper);
            return this.each(function () {
                var clone = wrapperElement.cloneNode(true);
                var parent = this.parentNode;
                parent.insertBefore(clone, this);
                clone.appendChild(this);
            });
        },

        wrapAll: function (wrapper) {
            if (this.elements.length === 0) {
                return this;
            }
            var wrapperElement = _createWrapperElement(wrapper);
            var firstElement = this.elements[0];
            var parent = firstElement.parentNode;
            parent.insertBefore(wrapperElement, firstElement);
            this.each(function () {
                wrapperElement.appendChild(this);
            });
            return this;
        },

        wrapInner: function (wrapper) {
            var wrapperElement = _createWrapperElement(wrapper);
            return this.each(function () {
                var contents = Array.prototype.slice.call(this.childNodes);
                var clone = wrapperElement.cloneNode(true);
                this.appendChild(clone);
                contents.forEach(function (child) {
                    clone.appendChild(child);
                });
            });
        },

        unwrap: function () {
            return this.each(function () {
                var parent = this.parentNode;
                if (parent && parent !== document.body) {
                    parent.parentNode.insertBefore(this, parent);
                    if (parent.childNodes.length === 0) {
                        parent.parentNode.removeChild(parent);
                    }
                }
            });
        },

        andSelf: function () {
            this.elements = _normalizeElements(this.elements.concat(this.prevElements || []));
            return this;
        },

        wrapSelection: function (wrapper, selection) {
            if (!selection) {
                selection = window.getSelection();
            }

            if (selection.rangeCount === 0) {
                return this;
            }

            var range = selection.getRangeAt(0);

            var wrapperElement = _createWrapperElement(wrapper);

            // Clone the range to avoid modifying the actual selection
            var newRange = range.cloneRange();

            try {
                // Try to surround the contents directly
                newRange.surroundContents(wrapperElement);
            } catch (e) {
                // Handle partial selections
                var fragment = newRange.extractContents();

                // Create a new wrapper and append the fragment
                var newWrapper = wrapperElement.cloneNode(true);
                newWrapper.appendChild(fragment);

                // Insert the new wrapper at the original range position
                newRange.insertNode(newWrapper);

                // Normalize the parent to merge adjacent text nodes
                newWrapper.parentNode.normalize();
            }

            // Clear the selection
            selection.removeAllRanges();

            return this;
        },

        toggleFormat: function (tagName, selection) {
            if (!selection) {
                selection = window.getSelection();
            }
            if (selection.rangeCount === 0) {
                return this;
            }

            var range = selection.getRangeAt(0);

            // Check if the selection is within the formatting tag
            function isSelectionWithinTag(range, tagName) {
                var startContainer = range.startContainer;
                var endContainer = range.endContainer;

                function isNodeWithinTag(node) {
                    while (node && node !== document.body) {
                        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === tagName.toLowerCase()) {
                            return true;
                        }
                        node = node.parentNode;
                    }
                    return false;
                }

                return isNodeWithinTag(startContainer) && isNodeWithinTag(endContainer);
            }

            var isWrapped = isSelectionWithinTag(range, tagName);

            if (isWrapped) {
                // Unwrap the formatting tag from the selection
                this.unwrapSelection(tagName, selection);
            } else {
                // Wrap the selection with the formatting tag
                this.wrapSelection('<' + tagName + '></' + tagName + '>', selection);
            }

            return this;
        },


        removeEmptyFormattingElements: function(tagName, context) {
            context = context || document.body;

            function removeEmptyFormattingElements(node, tagName) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    var children = Array.from(node.childNodes);
                    children.forEach(function(child) {
                        if (child.nodeType === Node.ELEMENT_NODE) {
                            // Recursively check child elements
                            removeEmptyFormattingElements(child, tagName);
                            // Remove the element if it matches the tagName and has no child nodes
                            if (child.tagName.toLowerCase() === tagName.toLowerCase() && child.childNodes.length === 0) {
                                child.parentNode.removeChild(child);
                            }
                        }
                    });
                }
            }

            removeEmptyFormattingElements(context, tagName);

            return this;
        },

        unwrapSelection: function (tagName, selection) {
            if (!selection) {
                selection = window.getSelection();
            }
            if (selection.rangeCount === 0) {
                return this;
            }

            var range = selection.getRangeAt(0);

            // Find the formatting ancestor
            function getFormattingAncestor(node, tagName) {
                while (node && node !== document.body) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === tagName.toLowerCase()) {
                        return node;
                    }
                    node = node.parentNode;
                }
                return null;
            }

            var formattingAncestor = getFormattingAncestor(range.commonAncestorContainer, tagName);
            if (!formattingAncestor) {
                // No formatting tag found; nothing to unwrap
                return this;
            }

            var parent = formattingAncestor.parentNode;

            // Save the selected content before modifying the DOM
            var selectedContent = range.extractContents();

            // Now, create ranges for the content before and after the selection
            var preSelectionRange = document.createRange();
            preSelectionRange.setStartBefore(formattingAncestor.firstChild);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);

            var postSelectionRange = document.createRange();
            postSelectionRange.setStart(range.endContainer, range.endOffset);
            postSelectionRange.setEndAfter(formattingAncestor.lastChild);

            // Extract the content before and after the selection
            var beforeFragment = preSelectionRange.extractContents();
            var afterFragment = postSelectionRange.extractContents();

            // Clone the formatting element for the before and after fragments
            var beforeFormatting = formattingAncestor.cloneNode(false);
            var afterFormatting = formattingAncestor.cloneNode(false);

            // Append the extracted content to the cloned formatting elements
            if (beforeFragment.childNodes.length > 0) {
                beforeFormatting.appendChild(beforeFragment);
            }
            if (afterFragment.childNodes.length > 0) {
                afterFormatting.appendChild(afterFragment);
            }

            // Remove the original formatting element
            parent.removeChild(formattingAncestor);

            // Insert the nodes back into the parent in the correct order
            var insertionPoint = parent.childNodes[range.startOffset] || null;

            // Insert the before formatting element, if it has content
            if (beforeFormatting.childNodes.length > 0) {
                parent.insertBefore(beforeFormatting, insertionPoint);
            }

            // Insert the unformatted selected content
            if (selectedContent.childNodes.length > 0) {
                parent.insertBefore(selectedContent, insertionPoint);
            }

            // Insert the after formatting element, if it has content
            if (afterFormatting.childNodes.length > 0) {
                parent.insertBefore(afterFormatting, insertionPoint);
            }

            // Normalize the parent to merge adjacent text nodes
            parent.normalize();

            // Remove any empty formatting elements
            this.removeEmptyFormattingElements(tagName, parent);

            // Clear the selection
            selection.removeAllRanges();

            return this;
        },

        applyStyle: function (styleObj, selection) {
            if (!selection) {
                selection = window.getSelection();
            }

            if (selection.rangeCount === 0) {
                return this;
            }

            var range = selection.getRangeAt(0);

            // Iterate over all nodes within the selection
            var selectedNodes = [];

            function getSelectedNodes(range) {
                var node = range.startContainer;
                var endNode = range.endContainer;

                // If the start node is the same as the end node, just return that node
                if (node === endNode) {
                    selectedNodes.push(node);
                    return;
                }

                // Otherwise, iterate through the nodes
                var rangeNode = node;
                while (rangeNode && rangeNode !== endNode) {
                    selectedNodes.push(rangeNode);
                    rangeNode = rangeNode.nextSibling;
                }
                selectedNodes.push(endNode);
            }

            getSelectedNodes(range);

            // Apply styles to each node
            selectedNodes.forEach(function (node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    var span = document.createElement('span');
                    Object.assign(span.style, styleObj);
                    node.parentNode.insertBefore(span, node);
                    span.appendChild(node);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    Object.assign(node.style, styleObj);
                }
            });

            return this;
        },

        removeStyle: function (styleProps, selection) {
            if (!selection) {
                selection = window.getSelection();
            }

            if (selection.rangeCount === 0) {
                return this;
            }

            var range = selection.getRangeAt(0);

            // Iterate over all nodes within the selection
            var selectedNodes = [];

            function getSelectedNodes(range) {
                var node = range.startContainer;
                var endNode = range.endContainer;

                if (node === endNode) {
                    selectedNodes.push(node);
                    return;
                }

                var rangeNode = node;
                while (rangeNode && rangeNode !== endNode) {
                    selectedNodes.push(rangeNode);
                    rangeNode = rangeNode.nextSibling;
                }
                selectedNodes.push(endNode);
            }

            getSelectedNodes(range);

            // Remove styles from each node
            selectedNodes.forEach(function (node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    styleProps.forEach(function (prop) {
                        node.style[prop] = '';
                    });
                }
            });

            return this;
        },

        clearFormatting: function (selection) {
            if (!selection) {
                selection = window.getSelection();
            }

            if (selection.rangeCount === 0) {
                return this;
            }

            var range = selection.getRangeAt(0);

            // Use document fragment to extract contents
            var fragment = range.extractContents();

            // Create a temporary div to hold the fragment
            var tempDiv = document.createElement('div');
            tempDiv.appendChild(fragment);

            // Remove all element tags, keeping only text nodes
            function removeAllFormatting(node) {
                var childNodes = Array.from(node.childNodes);
                childNodes.forEach(function (child) {
                    if (child.nodeType === Node.ELEMENT_NODE) {
                        removeAllFormatting(child);
                        while (child.firstChild) {
                            node.insertBefore(child.firstChild, child);
                        }
                        node.removeChild(child);
                    }
                });
            }

            removeAllFormatting(tempDiv);

            // Insert the plain text back into the range position
            range.insertNode(tempDiv);

            // Normalize to merge text nodes
            tempDiv.parentNode.normalize();

            return this;
        },

        simplifyNestedTags : function(tagNames, context) {
            context = context || document.body;
            if (!Array.isArray(tagNames)) {
                tagNames = [tagNames];
            }
        
            tagNames.forEach(function(tagName) {
                // Simplify nested tags
                var elements = context.querySelectorAll(tagName);
        
                elements.forEach(function(element) {
                    // Remove inner tags of the same type if they have no attributes or classes
                    var childElements = element.querySelectorAll(tagName);
                    childElements.forEach(function(child) {
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
        
                // Combine adjacent similar tags, including acceptable whitespace
                elements = context.querySelectorAll(tagName);
        
                elements.forEach(function(element) {
                    // Skip if the element has attributes or classes
                    if (element.attributes.length > 0 || element.classList.length > 0) {
                        return;
                    }
        
                    var nextSibling = element.nextSibling;
        
                    // Continue merging while nextSibling is acceptable
                    while (nextSibling) {
                        // Flag to determine if we can continue merging
                        var canMerge = false;
        
                        if (nextSibling.nodeType === Node.TEXT_NODE) {
                            // Check if text node contains only acceptable whitespace
                            if (/^[\s\t\n\r]*$/.test(nextSibling.textContent)) {
                                // Move text node into the current element
                                element.appendChild(nextSibling);
                                canMerge = true;
                            } else {
                                // Text node contains other characters; stop merging
                                break;
                            }
                        } else if (nextSibling.nodeType === Node.ELEMENT_NODE &&
                                   nextSibling.tagName.toLowerCase() === tagName.toLowerCase() &&
                                   nextSibling.attributes.length === 0 &&
                                   nextSibling.classList.length === 0) {
                            // Merge the next formatting element
                            element.appendChild(nextSibling);
                            canMerge = true;
                        } else {
                            // Encountered a different node; stop merging
                            break;
                        }
        
                        // Update nextSibling to the following sibling
                        if (canMerge) {
                            nextSibling = element.nextSibling;
                        } else {
                            break;
                        }
                    }
                });
            });
        
            return this;
        },

        simplifyAllFormattingTags : function(context) {
            var tags = ['strong', 'em', 'u']; // Add other tags as needed
            context = context || document.body;
            var self = this;
            tags.forEach(function(tag) {
                self.simplifyNestedTags(tag, context);
            });
            return this;
        }
    };

    return htmlUtility;
})();