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

        var owned = new Map();

        function track(element, cancel) {
            owned.set(element, cancel || null);
            return element;
        }

        function destroy() {
            owned.forEach(function (cancel, element) {
                if (cancel) { cancel(); }
                else if (element.close) { element.close(); }
                remove(element);
            });
            owned.clear();
        }

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
            return track(element);
        }

        function remove(element) {
            owned.delete(element);
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }

        return {
            canCreate: canCreate,
            track: track,
            destroy: destroy,
            create: create,
            remove: remove
        };
    }

    return createOverlayManager;
}));
