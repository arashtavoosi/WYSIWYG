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
        var typing = null;
        var mergeInput = false;

        function samePosition(a, b) {
            return a && b && a.startOffset === b.startOffset && a.endOffset === b.endOffset &&
                String(a.startPath) === String(b.startPath) && String(a.endPath) === String(b.endPath);
        }

        function prepareInput(inputType) {
            var before = capture();
            mergeInput = !!(typing && typing.type === inputType &&
                Date.now() - typing.time < 1000 && samePosition(before.selection, typing.selection) &&
                index === snapshots.length - 1 && snapshots[index].html === before.html);
            if (index >= 0 && snapshots[index].html === before.html) {
                snapshots[index].selection = before.selection;
            } else {
                record();
                mergeInput = false;
            }
        }

        function recordInput(inputType) {
            var snapshot = capture();
            if (index >= 0 && snapshots[index].html === snapshot.html) {
                snapshots[index].selection = snapshot.selection;
                mergeInput = false;
                return api;
            }
            var grouped = /^(insertText|deleteContentBackward|deleteContentForward)$/.test(inputType || '');
            if (mergeInput && grouped) {
                snapshots[index] = snapshot;
            } else {
                record();
            }
            typing = grouped ? { type: inputType, time: Date.now(), selection: snapshot.selection } : null;
            mergeInput = false;
            return api;
        }

        function capture() {
            return {
                html: rootNode.innerHTML,
                selection: selection.getBookmark(undefined, true)
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
            typing = null;

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
            prepareInput: prepareInput,
            recordInput: recordInput,
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

                typing = null;
                index += 1;
                return apply(snapshots[index]);
            },
            record: record,
            undo: function () {
                if (!api.canUndo()) {
                    return api;
                }

                typing = null;
                index -= 1;
                return apply(snapshots[index]);
            }
        };

        return api;
    }

    return createEditorHistory;
}));
