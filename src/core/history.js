(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.createEditorHistory = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function createEditorHistory(rootNode, selection, options) {
        var config = options || {};
        var limit = Math.max(1, Number(config.limit) || 50);
        var snapshots = [];
        var index = -1;
        var api;

        function capture() {
            return {
                html: rootNode.innerHTML,
                selection: selection.getBookmark()
            };
        }

        function apply(snapshot) {
            if (!snapshot) {
                return api;
            }

            rootNode.innerHTML = snapshot.html;
            selection.restoreBookmark(snapshot.selection);
            return api;
        }

        function record() {
            var snapshot = capture();

            if (index >= 0 && snapshots[index].html === snapshot.html) {
                snapshots[index].selection = snapshot.selection;
                return api;
            }

            snapshots = snapshots.slice(0, index + 1);
            snapshots.push(snapshot);

            while (snapshots.length > limit) {
                snapshots.shift();
            }

            index = snapshots.length - 1;
            return api;
        }

        api = {
            apply: apply,
            canRedo: function () {
                return index >= 0 && index < snapshots.length - 1;
            },
            canUndo: function () {
                return index > 0;
            },
            capture: capture,
            redo: function () {
                if (!api.canRedo()) {
                    return api;
                }

                index += 1;
                return apply(snapshots[index]);
            },
            record: record,
            undo: function () {
                if (!api.canUndo()) {
                    return api;
                }

                index -= 1;
                return apply(snapshots[index]);
            }
        };

        return api;
    }

    return createEditorHistory;
}));
