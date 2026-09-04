(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../../core/html-utility'));
    } else {
        root.createRavanDialogService = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    function createDialogService(options) {
        var config = options || {};
        var documentRef = config.document || document;
        var windowRef = documentRef.defaultView || window;

        var pending = new Set();

        function prompt(label, fallback) {
            return windowRef.prompt(label, fallback);
        }

        function showInsertModal(title, fields, focusSelector, read, initialize) {
            var modal;
            var form;
            var resolved = false;

            if (typeof windowRef.customElements === 'undefined' || !windowRef.customElements.get('wysiwyg-modal')) {
                return null;
            }

            modal = documentRef.createElement('wysiwyg-modal');
            modal.showCloseButton = true;
            modal.clickOutsideToClose = true;
            modal.moveable = true;
            modal.innerHTML = [
                '<strong slot="header">' + title + '</strong>',
                '<form class="wysiwyg-link-form">' + fields + '</form>',
                '<span slot="footer"><button type="button" data-action="cancel">Cancel</button> <button type="button" data-action="apply">Insert</button></span>'
            ].join('');
            documentRef.body.appendChild(modal);
            form = modal.querySelector('form');

            return new Promise(function (resolve) {
                function finish(value) {
                    if (resolved) {
                        return;
                    }

                    resolved = true;
                    pending.delete(cancel);
                    modal.close();
                    modal.remove();
                    config.restoreSelection();
                    resolve(value);
                }

                function cancel() { finish(null); }
                pending.add(cancel);

                function submit() {
                    var value = read(modal);

                    if (value) {
                        finish(value);
                    }
                }

                html.on(modal, 'close', function () {
                    finish(null);
                });
                html.on(form, 'submit', function (event) {
                    event.preventDefault();
                    submit();
                });
                html.on(modal.querySelector('[data-action="cancel"]'), 'click', function () {
                    finish(null);
                });
                html.on(modal.querySelector('[data-action="apply"]'), 'click', submit);

                if (initialize) {
                    initialize(modal);
                }
                modal.show();
                modal.querySelector(focusSelector || '[data-field]').focus();
            });
        }

        return {
            prompt: prompt,
            destroy: function () { pending.forEach(function (cancel) { cancel(); }); },
            showInsertModal: showInsertModal
        };
    }

    return createDialogService;
}));
