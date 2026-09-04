(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../../core/html-utility'));
    } else {
        root.createToolbarController = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    function createToolbarController(options) {
        var config = options || {};
        var toolbarElement = config.toolbarElement;
        var view = config.view;
        var handlers;

        function runCommand(entry, event, value, commandOptions) {
            var options = commandOptions || {};
            var result;

            if (!entry || !entry.node || !entry.node.onCommand) {
                return;
            }

            if (options.restore !== false) {
                config.restoreSelection();
            }

            result = entry.node.onCommand(config.createContext(entry, event, value));

            if (result && typeof result.then === 'function') {
                return result.then(function () {
                    if (options.saveSelection) {
                        config.saveSelection();
                    }

                    config.sync();
                });
            }

            if (options.saveSelection) {
                config.saveSelection();
            }

            config.sync();
        }

        function handleMouseDown(event) {
            if (event.target.closest('button, select, input')) {
                config.saveSelection();
            }

            if (event.target.closest('button, input')) {
                event.preventDefault();
            }
        }

        function handleClick(event) {
            var button = event.target.closest('button');
            var entry;

            if (!button) {
                return;
            }

            entry = view.getEntryForElement(button);
            runCommand(entry, event, button.value);
        }

        function handleChange(event) {
            var control = event.target.closest('select, input');
            var entry;

            if (!control) {
                return;
            }

            entry = view.getEntryForElement(control);

            if (!entry) {
                return;
            }

            if (control.type === 'color' && control.__wysiwygLastInputValue === control.value) {
                control.__wysiwygLastInputValue = null;
                return;
            }

            runCommand(entry, event, control.value, { saveSelection: control.type === 'color' || control.tagName === 'SELECT' });
        }

        function handleInput(event) {
            var control = event.target.closest('input');
            var entry;

            if (!control) {
                return;
            }

            entry = view.getEntryForElement(control);

            if (!entry) {
                return;
            }

            runCommand(entry, event, control.value, { saveSelection: true });
            control.__wysiwygLastInputValue = control.value;
        }

        handlers = {
            change: handleChange,
            click: handleClick,
            input: handleInput,
            mousedown: handleMouseDown
        };

        html.on(toolbarElement, 'mousedown', handlers.mousedown);
        html.on(toolbarElement, 'click', handlers.click);
        html.on(toolbarElement, 'change', handlers.change);
        html.on(toolbarElement, 'input', handlers.input);

        return {
            destroy: function () {
                html.off(toolbarElement, 'mousedown', handlers.mousedown);
                html.off(toolbarElement, 'click', handlers.click);
                html.off(toolbarElement, 'change', handlers.change);
                html.off(toolbarElement, 'input', handlers.input);
            },
            runCommand: runCommand
        };
    }

    return createToolbarController;
}));
