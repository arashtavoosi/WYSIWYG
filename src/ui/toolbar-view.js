(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.createToolbarView = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function normalizeColorValue(color) {
        var match;

        if (!color) {
            return '#000000';
        }

        if (color.charAt(0) === '#') {
            return color;
        }

        match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

        if (!match) {
            return '#000000';
        }

        return '#' + [match[1], match[2], match[3]].map(function (value) {
            return Number(value).toString(16).padStart(2, '0');
        }).join('');
    }

    function setButtonState(button, isActive) {
        if (!button) {
            return;
        }

        button.classList.toggle('is-active', !!isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }

    function setButtonDisabled(button, isDisabled) {
        if (!button) {
            return;
        }

        button.disabled = !!isDisabled;
        button.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    }

    function createToolbarView(toolbarElement, statusElements) {
        var status = statusElements || {};

        return {
            sync: function (state) {
                var active = [];
                var colorInput = toolbarElement.querySelector('[data-style="color"]');
                var highlightInput = toolbarElement.querySelector('[data-style="backgroundColor"]');
                var fontSelect = toolbarElement.querySelector('[data-style="fontFamily"]');
                var fontSizeSelect = toolbarElement.querySelector('[data-style="fontSize"]');
                var lineHeightSelect = toolbarElement.querySelector('[data-style="lineHeight"]');

                ['bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript'].forEach(function (name) {
                    var button = toolbarElement.querySelector('[data-inline="' + name + '"]');

                    setButtonState(button, state[name]);

                    if (state[name]) {
                        active.push(name);
                    }
                });

                setButtonState(toolbarElement.querySelector('[data-block="heading"]'), state.block === 'h2');
                toolbarElement.querySelectorAll('[data-block="heading"]').forEach(function (button) {
                    setButtonState(button, state.headingLevel === Number(button.getAttribute('data-level')));
                });
                setButtonState(toolbarElement.querySelector('[data-block="paragraph"]'), state.block === 'p');
                setButtonState(toolbarElement.querySelector('[data-block="blockquote"]'), state.quote);
                setButtonState(toolbarElement.querySelector('[data-list="ul"]'), state.list === 'ul');
                setButtonState(toolbarElement.querySelector('[data-list="ol"]'), state.list === 'ol');
                toolbarElement.querySelectorAll('[data-align]').forEach(function (button) {
                    setButtonState(button, state.textAlign === button.getAttribute('data-align') || (!state.textAlign && button.getAttribute('data-align') === 'left'));
                });
                setButtonState(toolbarElement.querySelector('[data-action="link"]'), !!state.link);
                setButtonState(toolbarElement.querySelector('[data-action="unlink"]'), !!state.link);
                setButtonState(toolbarElement.querySelector('[data-action="update-image"]'), !!state.image);
                setButtonState(toolbarElement.querySelector('[data-action="remove-image"]'), !!state.image);
                setButtonState(toolbarElement.querySelector('[data-action="table"]'), !!state.table);
                setButtonState(toolbarElement.querySelector('[data-action="table-header"]'), state.table && !!state.table.headerRow);
                setButtonDisabled(toolbarElement.querySelector('[data-action="undo"]'), !state.canUndo);
                setButtonDisabled(toolbarElement.querySelector('[data-action="redo"]'), !state.canRedo);

                if (colorInput) {
                    colorInput.value = normalizeColorValue(state.color);
                }

                if (highlightInput) {
                    highlightInput.value = normalizeColorValue(state.highlightColor);
                }

                if (fontSelect && state.fontFamily) {
                    fontSelect.value = Array.from(fontSelect.options).some(function (option) {
                        return option.value === state.fontFamily;
                    }) ? state.fontFamily : fontSelect.value;
                }

                if (fontSizeSelect && state.fontSize) {
                    fontSizeSelect.value = Array.from(fontSizeSelect.options).some(function (option) {
                        return option.value === state.fontSize;
                    }) ? state.fontSize : fontSizeSelect.value;
                }

                if (lineHeightSelect && state.lineHeight) {
                    lineHeightSelect.value = Array.from(lineHeightSelect.options).some(function (option) {
                        return option.value === state.lineHeight;
                    }) ? state.lineHeight : lineHeightSelect.value;
                }

                if (status.block) {
                    status.block.textContent = state.block || 'none';
                }

                if (status.list) {
                    status.list.textContent = state.list || 'none';
                }

                if (status.link) {
                    status.link.textContent = state.link ? (state.link.href || 'set') : 'none';
                }

                if (status.table) {
                    status.table.textContent = state.table ? 'inside' : 'none';
                }

                if (status.active) {
                    status.active.textContent = active.length ? active.join(', ') : 'none';
                }
            }
        };
    }

    return createToolbarView;
}));
