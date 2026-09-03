(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.createRavanOverlayManager = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function createOverlayManager(options) {
        var config = options || {};
        var documentRef = config.document || document;
        var windowRef = documentRef.defaultView || window;

        function customElementsForDocument() {
            return windowRef.customElements || (typeof customElements !== 'undefined' ? customElements : null);
        }

        function canCreate(tagName) {
            var registry = customElementsForDocument();

            return !!(registry && registry.get(tagName));
        }

        function create(tagName, properties) {
            var element;

            if (!canCreate(tagName)) {
                return null;
            }

            element = documentRef.createElement(tagName);
            Object.keys(properties || {}).forEach(function (name) {
                element[name] = properties[name];
            });
            (documentRef.body || documentRef.documentElement).appendChild(element);
            return element;
        }

        function remove(element) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }

        return {
            canCreate: canCreate,
            create: create,
            remove: remove
        };
    }

    return createOverlayManager;
}));
