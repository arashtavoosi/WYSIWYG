(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.createToolbarView = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function normalizeColorValue(color, fallback) {
        var match;

        if (!color) {
            return fallback || '#000000';
        }

        if (color.charAt(0) === '#') {
            return color;
        }

        match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

        if (!match) {
            return fallback || '#000000';
        }

        return '#' + [match[1], match[2], match[3]].map(function (value) {
            return Number(value).toString(16).padStart(2, '0');
        }).join('');
    }

    function resolveValue(value, context) {
        if (typeof value === 'function') {
            return value(context.state, context);
        }

        return value;
    }

    function resolveRenderValue(value, context) {
        if (typeof value === 'function') {
            return value(context);
        }

        return value;
    }

    function priorityFor(node) {
        var priority = node && Number(node.priority);

        return Number.isFinite(priority) ? priority : 0;
    }

    function sortedNodeKeys(nodes) {
        return Object.keys(nodes || {}).map(function (key, index) {
            return {
                key: key,
                index: index,
                priority: priorityFor(nodes[key])
            };
        }).sort(function (left, right) {
            if (left.priority === right.priority) {
                return left.index - right.index;
            }

            return left.priority - right.priority;
        }).map(function (entry) {
            return entry.key;
        });
    }

    function setButtonState(button, isActive) {
        if (!button) {
            return;
        }

        button.classList.toggle('is-active', !!isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }

    function setControlDisabled(control, isDisabled) {
        if (!control) {
            return;
        }

        control.disabled = !!isDisabled;
        control.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    }

    function nodeType(node) {
        if (node.children) {
            return 'group';
        }

        return node.type || 'button';
    }

    function createElement(tagName, className) {
        var element = document.createElement(tagName);

        if (className) {
            element.className = className;
        }

        return element;
    }

    function createSvgIcon(node, settings) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        var iconId = (settings.iconPrefix || 'wysiwyg-icon-') + node.iconId;
        var spritePath = settings.iconSpritePath || '';
        var href = spritePath + '#' + iconId;

        svg.classList.add('toolbar-button-icon');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        use.setAttribute('href', href);
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);
        svg.appendChild(use);

        return svg;
    }

    function appendNodeContent(element, node, settings) {
        if (node.iconId) {
            element.appendChild(createSvgIcon(node, settings || {}));
            return;
        }

        element.textContent = node.icon || node.title || '';
    }

    function applyCommonAttributes(element, node, id, type) {
        element.setAttribute('data-toolbar-id', id);
        element.setAttribute('data-toolbar-type', type);

        if (node.title) {
            element.setAttribute('title', node.title);
            element.setAttribute('aria-label', node.title);
        }

        if (node.className) {
            element.classList.add(node.className);
        }
    }

    function renderButton(node, id, settings) {
        var button = createElement('button', 'toolbar-button');

        button.type = 'button';
        applyCommonAttributes(button, node, id, 'button');
        appendNodeContent(button, node, settings);

        return button;
    }

    function appendControlIcon(wrapper, node, settings) {
        var icon;

        if (!node.iconId) {
            return;
        }

        icon = createElement('span', 'toolbar-control-icon');
        icon.appendChild(createSvgIcon(node, settings || {}));
        wrapper.appendChild(icon);
    }

    function renderDropdown(node, id, settings) {
        var wrapper = createElement('label', 'toolbar-control toolbar-dropdown');
        var label = createElement('span', 'toolbar-control-label');
        var select = document.createElement('select');

        label.textContent = node.title || '';
        applyCommonAttributes(select, node, id, 'dropdown');
        (node.options || []).forEach(function (option) {
            var optionElement = document.createElement('option');

            optionElement.value = option.value;
            optionElement.textContent = option.title || option.label || option.value;
            optionElement.selected = !!option.selected;
            select.appendChild(optionElement);
        });

        appendControlIcon(wrapper, node, settings);
        wrapper.appendChild(label);
        wrapper.appendChild(select);

        return wrapper;
    }

    function renderColorPicker(node, id, settings) {
        var wrapper = createElement('label', 'toolbar-control toolbar-color');
        var label = createElement('span', 'toolbar-control-label');
        var input = document.createElement('input');

        label.textContent = node.title || '';
        input.type = 'color';
        input.value = node.fallback || '#000000';
        applyCommonAttributes(input, node, id, 'colorpicker');

        appendControlIcon(wrapper, node, settings);
        wrapper.appendChild(label);
        wrapper.appendChild(input);

        return wrapper;
    }

    function updateButton(element, node, context) {
        setButtonState(element, resolveValue(node.active, context));
        setControlDisabled(element, resolveValue(node.disabled, context));
    }

    function updateDropdown(element, node, context) {
        var value = resolveValue(node.value, context);
        var hasValue;

        setControlDisabled(element, resolveValue(node.disabled, context));

        if (!value) {
            return;
        }

        hasValue = Array.from(element.options).some(function (option) {
            return option.value === value;
        });

        if (hasValue) {
            element.value = value;
        }
    }

    function updateColorPicker(element, node, context) {
        setControlDisabled(element, resolveValue(node.disabled, context));
        element.value = normalizeColorValue(resolveValue(node.value, context), node.fallback);
    }

    function defaultUpdate(entry, context) {
        if (entry.type === 'button') {
            updateButton(entry.control, entry.node, context);
        }

        if (entry.type === 'dropdown') {
            updateDropdown(entry.control, entry.node, context);
        }

        if (entry.type === 'colorpicker') {
            updateColorPicker(entry.control, entry.node, context);
        }
    }

    function formatBlock(block) {
        var labels = {
            blockquote: 'Quote',
            pre: 'Code block',
            li: 'List item',
            p: 'Paragraph'
        };

        return labels[block] || (/^h[1-6]$/.test(block) ? block.toUpperCase() : block);
    }

    function updateBreadcrumb(element, state) {
        var path = [];
        var active = [];
        var table;

        if (!element) {
            return;
        }

        ['bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript'].forEach(function (name) {
            if (state[name]) {
                active.push(name);
            }
        });

        if (state.table) {
            table = 'Table';
            if (state.table.rowIndex !== null && state.table.rowIndex !== undefined) {
                table += ' › Row ' + (state.table.rowIndex + 1);
            }
            if (state.table.cellIndex !== null && state.table.cellIndex !== undefined) {
                table += ' › Cell ' + (state.table.cellIndex + 1);
            }
            path.push(table);
        }

        if (state.list) {
            path.push(state.list === 'ol' ? 'Numbered list' : 'Bulleted list');
        }

        if (state.quote && state.block !== 'blockquote') {
            path.push('Quote');
        }

        if (state.codeBlock) {
            path.push('Code block');
        } else if (state.block) {
            path.push(formatBlock(state.block));
        }

        if (state.image) {
            path.push('Image');
        } else if (state.media) {
            path.push(state.media.type.charAt(0).toUpperCase() + state.media.type.slice(1));
        }

        if (state.link) {
            path.push('Link' +(state.link.href ? '(' + state.link.href + ') ' : ''));
        }

        element.textContent = path.length ? path.join(' › ') : 'Editor';
        if (active.length) {
            element.textContent += (path.length ? ' · ' : '') + active.join(', ');
        }

        element.title = state.link && state.link.href ? state.link.href : '';
    }

    function createToolbarView(toolbarElement, statusElement, options) {
        var entries = {};
        var counter = 0;
        var toolbar = (options || {}).toolbar || {};
        var renderContext = (options || {}).context || {};

        function register(node, element, control, type, key) {
            var id = 'toolbar-node-' + (++counter);

            entries[id] = {
                id: id,
                key: key,
                node: node,
                element: element,
                control: control || element,
                type: type
            };

            return id;
        }

        function renderNode(node, key) {
            var type = nodeType(node);
            var group;
            var id;
            var element;
            var children = [];
            var settings = renderContext.settings || {};

            if (resolveRenderValue(node.hide, Object.assign({}, renderContext, {
                node: node,
                key: key
            }))) {
                return null;
            }

            if (type === 'group') {
                group = createElement('div', 'toolbar-group');

                if (node.title) {
                    group.setAttribute('aria-label', node.title);
                }

                if (node.className) {
                    group.classList.add(node.className);
                }

                sortedNodeKeys(node.children).forEach(function (childKey) {
                    var child = renderNode(node.children[childKey], childKey);

                    if (child) {
                        children.push(child);
                    }
                });

                if (!children.length) {
                    return null;
                }

                children.forEach(function (child) {
                    group.appendChild(child);
                });

                return group;
            }

            id = 'toolbar-node-' + (counter + 1);

            if (node.render) {
                element = node.render(Object.assign({}, renderContext, {
                    node: node,
                    key: key,
                    id: id
                }));

                if (!element) {
                    element = document.createTextNode('');
                }

                if (element.setAttribute && !element.hasAttribute('data-toolbar-id')) {
                    applyCommonAttributes(element, node, id, type);
                }
            } else if (type === 'dropdown') {
                element = renderDropdown(node, id, settings);
            } else if (type === 'colorpicker') {
                element = renderColorPicker(node, id, settings);
            } else {
                element = renderButton(node, id, settings);
            }

            register(node, element, element.querySelector ? (element.querySelector('[data-toolbar-id="' + id + '"]') || element) : element, type, key);

            return element;
        }

        function render() {
            toolbarElement.innerHTML = '';
            entries = {};
            counter = 0;

            sortedNodeKeys(toolbar).forEach(function (key) {
                var node = renderNode(toolbar[key], key);

                if (node) {
                    toolbarElement.appendChild(node);
                }
            });
        }

        render();

        return {
            sync: function (state, baseContext) {
                var context = Object.assign({}, baseContext || {}, { state: state });

                Object.keys(entries).forEach(function (id) {
                    var entry = entries[id];
                    var updateContext = Object.assign({}, context, {
                        element: entry.control,
                        wrapper: entry.element,
                        node: entry.node,
                        key: entry.key
                    });

                    defaultUpdate(entry, updateContext);

                    if (entry.node.onUpdate) {
                        entry.node.onUpdate(updateContext);
                    }
                });

                updateBreadcrumb(statusElement, state);
            },
            getEntryForElement: function (element) {
                var control = element && element.closest ? element.closest('[data-toolbar-id]') : null;

                if (!control) {
                    return null;
                }

                return entries[control.getAttribute('data-toolbar-id')] || null;
            }
        };
    }

    return createToolbarView;
}));
