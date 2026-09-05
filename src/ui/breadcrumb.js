(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./overlays/manager'));
    } else {
        root.createRavanBreadcrumb = factory(root.createRavanOverlayManager);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (createOverlayManager) {
    var nextId = 0;
    var actions = {
        select: 'Select contents',
        start: 'Place cursor at start',
        end: 'Place cursor at end',
        unwrap: 'Remove and promote children',
        remove: 'Delete element and contents',
        clearStyle: 'Clear element styles'
    };

    function label(node, index) {
        if (!index) { return 'Root'; }
        var tag = node.tagName.toLowerCase();
        if (tag === 'tr') { return 'Row ' + (node.rowIndex + 1); }
        if (tag === 'td' || tag === 'th') { return (tag === 'th' ? 'Header cell ' : 'Cell ') + (node.cellIndex + 1); }
        if (tag === 'a') { return node.getAttribute('href') ? '(' + node.getAttribute('href') + ') Link' : 'Link'; }
        return {
            p: 'Paragraph', blockquote: 'Quote', ul: 'Bulleted list', ol: 'Numbered list', li: 'List item',
            table: 'Table', thead: 'Table head', tbody: 'Table body', tfoot: 'Table foot',
            pre: 'Code block', code: 'Code', strong: 'Bold', b: 'Bold', em: 'Italic', i: 'Italic',
            u: 'Underline', s: 'Strikethrough', sub: 'Subscript', sup: 'Superscript',
            img: 'Image', video: 'Video', audio: 'Audio', hr: 'Rule', br: 'Line break'
        }[tag] || (/^h[1-6]$/.test(tag) ? tag.toUpperCase() : tag);
    }

    function createBreadcrumb(element, context) {
        if (!element) { return { sync: function () {}, destroy: function () {} }; }
        var config = context || {};
        var doc = element.ownerDocument;
        var win = doc.defaultView;
        var overlays = createOverlayManager({ document: doc });
        var path = [];
        var labels = [];
        var menu = null;
        var anchor = null;
        var target = null;
        var id = 'ravan-element-menu-' + (++nextId);
        element.classList.add('status-breadcrumb');
        element.setAttribute('role', 'navigation');
        element.setAttribute('aria-label', 'Element path');

        function close(focus) {
            if (!menu) { return; }
            anchor.setAttribute('aria-expanded', 'false');
            anchor.removeAttribute('aria-controls');
            overlays.remove(menu);
            menu = target = null;
            doc.removeEventListener('pointerdown', outside);
            doc.removeEventListener('keydown', keyboard);
            win.removeEventListener('resize', dismiss);
            win.removeEventListener('scroll', dismiss, true);
            if (focus && anchor.isConnected) { anchor.focus(); }
            anchor = null;
        }
        function dismiss() { close(false); }
        function outside(event) {
            if (!menu.contains(event.target) && !element.contains(event.target)) { close(false); }
        }
        function keyboard(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                close(true);
                return;
            }
            if (!menu.contains(event.target)) { return; }
            if (event.key === 'Tab') { close(true); return; }
            var buttons = Array.from(menu.querySelectorAll('button:not(:disabled)'));
            var index = buttons.indexOf(doc.activeElement);
            if (event.key === 'ArrowDown') { index = (index + 1) % buttons.length; }
            else if (event.key === 'ArrowUp') { index = (index - 1 + buttons.length) % buttons.length; }
            else if (event.key === 'Home') { index = 0; }
            else if (event.key === 'End') { index = buttons.length - 1; }
            else { return; }
            event.preventDefault();
            buttons[index].focus();
        }
        function act(event) {
            var button = event.target.closest('[data-element-action]');
            if (!button || button.disabled) { return; }
            var node = target;
            var action = button.getAttribute('data-element-action');
            close(false);
            if (config.restoreSelection) { config.restoreSelection(); }
            // Focus the editing surface before setting the new selection.
            if (path[0]) { path[0].focus(); }
            config.editor.actOnElement(node, action);
            if (config.saveSelection) { config.saveSelection(); }
            if (config.sync) { config.sync(); }
        }
        function open(button) {
            if (!config.editor) { return; }
            if (anchor === button) { close(true); return; }
            close(false);
            if (config.saveSelection) { config.saveSelection(); }
            anchor = button;
            target = path[Number(button.getAttribute('data-element-index'))];
            var allowed = config.editor.getElementCapabilities(target);
            if (!allowed.select) { anchor = target = null; return; }
            menu = overlays.create('wysiwyg-popup');
            if (!menu) {
                menu = overlays.track(doc.createElement('div'));
                doc.body.appendChild(menu);
            }
            menu.id = id;
            menu.classList.add('status-element-menu');
            menu.setAttribute('role', 'menu');
            menu.setAttribute('aria-label', label(target, path.indexOf(target)) + ' actions');
            Object.keys(actions).forEach(function (action) {
                var item = doc.createElement('button');
                item.type = 'button';
                item.setAttribute('role', 'menuitem');
                item.setAttribute('data-element-action', action);
                item.textContent = actions[action];
                item.disabled = !allowed[action];
                item.tabIndex = -1;
                if (item.disabled) {
                    item.title = target === path[0] ? 'Root is the editing boundary' :
                        action === 'clearStyle' ? 'This element has no inline styles' : 'This element cannot be unwrapped without losing required structure';
                }
                menu.appendChild(item);
            });
            menu.addEventListener('click', act);
            anchor.setAttribute('aria-expanded', 'true');
            anchor.setAttribute('aria-controls', id);
            if (menu.showFor) {
                menu.preferredPosition = 'top-start';
                menu.showFor(anchor);
            } else {
                var rect = anchor.getBoundingClientRect();
                menu.style.position = 'fixed';
                menu.style.left = Math.max(8, Math.min(rect.left, win.innerWidth - menu.offsetWidth - 8)) + 'px';
                menu.style.top = Math.max(8, Math.min(rect.top - menu.offsetHeight - 4, win.innerHeight - menu.offsetHeight - 8)) + 'px';
            }
            doc.addEventListener('pointerdown', outside);
            doc.addEventListener('keydown', keyboard);
            win.addEventListener('resize', dismiss);
            win.addEventListener('scroll', dismiss, true);
            menu.querySelector('button:not(:disabled)').focus();
        }
        function click(event) {
            var button = event.target.closest('[data-element-index]');
            if (button && element.contains(button)) { open(button); }
        }
        function preserve(event) {
            if (event.target.closest('button')) { event.preventDefault(); }
        }
        element.addEventListener('click', click);
        element.addEventListener('mousedown', preserve);

        return {
            sync: function (nodes) {
                var next = nodes || [];
                var names = next.map(label);
                if (path.length && path.length === next.length && path.every(function (node, i) { return node === next[i] && labels[i] === names[i]; })) { return; }
                close(false);
                path = next;
                labels = names;
                element.textContent = '';
                element.title = '';
                if (!path.length) { element.textContent = 'Root'; return; }
                path.forEach(function (node, index) {
                    if (index) {
                        var separator = doc.createElement('span');
                        separator.textContent = ' › ';
                        separator.setAttribute('aria-hidden', 'true');
                        element.appendChild(separator);
                    }
                    var button = doc.createElement('button');
                    button.type = 'button';
                    button.textContent = names[index];
                    button.title = node.tagName.toLowerCase() + (node.id ? '#' + node.id : '') + (node.className && typeof node.className === 'string' ? '.' + node.className.trim().split(/\s+/).join('.') : '');
                    button.setAttribute('data-element-index', index);
                    button.setAttribute('aria-label', names[index]);
                    button.setAttribute('aria-haspopup', 'menu');
                    button.setAttribute('aria-expanded', 'false');
                    if (index === path.length - 1) { button.setAttribute('aria-current', 'location'); }
                    element.appendChild(button);
                });
            },
            destroy: function () {
                close(false);
                overlays.destroy();
                element.removeEventListener('click', click);
                element.removeEventListener('mousedown', preserve);
                path = [];
            }
        };
    }

    return createBreadcrumb;
}));
