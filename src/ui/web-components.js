(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../core/html-utility'));
    } else {
        root.WysiwygWebComponents = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    function hasCustomElements() {
        return typeof HTMLElement !== 'undefined' && typeof customElements !== 'undefined';
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[character];
        });
    }

    function defineComponents() {
        var WysiwygModalElement;
        var WysiwygPopupElement;
        var WysiwygResizeOverlayElement;
        var WysiwygTableSelectionElement;
        var WysiwygFileBrowserElement;

        if (!html || !hasCustomElements()) {
            return {};
        }

        WysiwygModalElement = customElements.get('wysiwyg-modal') || class extends HTMLElement {
            static get observedAttributes() {
                return ['header-template', 'content-template', 'footer-template', 'show-close-button'];
            }

            constructor() {
                super();
                this._templates = {};
                this._drag = null;
                this.attachShadow({ mode: 'open' });
                this.shadowRoot.innerHTML = [
                    '<style>',
                    ':host{display:none}:host([open]){display:block;position:fixed;inset:0;z-index:2000}',
                    '.shade{position:fixed;inset:0;background:rgba(15,23,42,.34);z-index:0}',
                    '.box{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1;min-width:min(420px,calc(100vw - 32px));max-width:min(92vw,680px);max-height:88vh;background:#fff;color:#111827;border:1px solid #d1d5db;border-radius:6px;box-shadow:0 20px 60px rgba(15,23,42,.24);overflow:auto}',
                    ':host([resizable]) .box{resize:both}',
                    '.head,.foot{padding:12px 14px}.head{display:flex;gap:12px;align-items:center;border-bottom:1px solid #e5e7eb}:host([moveable]) .head{cursor:move}',
                    '.body{padding:14px}.foot{border-top:1px solid #e5e7eb}.region{flex:1}.close{display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:4px;background:transparent;color:inherit;cursor:pointer}.close:hover{background:#f1f5f9}.close svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}.close[hidden]{display:none}',
                    '::slotted(form){margin:0}::slotted([slot="footer"]){display:flex;gap:8px;justify-content:flex-end}',
                    '</style>',
                    '<div class="shade" part="backdrop"></div>',
                    '<section class="box" part="dialog" role="dialog" aria-modal="true">',
                    '<header class="head" part="header"><div class="region" data-region="header"></div><button class="close" type="button" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6L18 18M18 6L6 18"></path></svg></button></header>',
                    '<main class="body" part="content" data-region="content"></main>',
                    '<footer class="foot" part="footer" data-region="footer"></footer>',
                    '</section>'
                ].join('');
                this._box = this.shadowRoot.querySelector('.box');
                this._shade = this.shadowRoot.querySelector('.shade');
                this._close = this.shadowRoot.querySelector('.close');
                this._head = this.shadowRoot.querySelector('.head');
                this._onClose = this.close.bind(this);
                this._onOutsideClick = this._outsideClick.bind(this);
                this._onStartDrag = this._startDrag.bind(this);
                this._onMove = this._move.bind(this);
                this._onStop = this._stopDrag.bind(this);
            }

            connectedCallback() {
                html.on(this._close, 'click', this._onClose);
                html.on(this._shade, 'click', this._onOutsideClick);
                html.on(this._head, 'pointerdown', this._onStartDrag);
                this._render();
            }

            disconnectedCallback() {
                html.off(this._close, 'click', this._onClose);
                html.off(this._shade, 'click', this._onOutsideClick);
                html.off(this._head, 'pointerdown', this._onStartDrag);
                html.off(document, 'pointermove', this._onMove);
                html.off(document, 'pointerup', this._onStop);
            }

            attributeChangedCallback() {
                this._render();
            }

            get open() {
                return this.hasAttribute('open');
            }

            set open(value) {
                this.toggleAttribute('open', !!value);
            }

            get headerTemplate() {
                return this._templates.header;
            }

            set headerTemplate(value) {
                this._templates.header = value;
                this._renderRegion('header', 'header');
            }

            get contentTemplate() {
                return this._templates.content;
            }

            set contentTemplate(value) {
                this._templates.content = value;
                this._renderRegion('content', '');
            }

            get footerTemplate() {
                return this._templates.footer;
            }

            set footerTemplate(value) {
                this._templates.footer = value;
                this._renderRegion('footer', 'footer');
            }

            show() {
                this.open = true;
                this.dispatchEvent(new Event('open'));
            }

            close() {
                this.open = false;
                this.dispatchEvent(new Event('close'));
            }

            _outsideClick(event) {
                if (this.clickOutsideToClose && event.target === this._shade) {
                    this.close();
                }
            }

            _startDrag(event) {
                var rect;

                if (!this.moveable || event.target === this._close) {
                    return;
                }

                rect = this._box.getBoundingClientRect();
                this._drag = {
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top
                };
                this._box.style.left = rect.left + 'px';
                this._box.style.top = rect.top + 'px';
                this._box.style.transform = 'none';
                html.on(document, 'pointermove', this._onMove);
                html.on(document, 'pointerup', this._onStop);
            }

            _move(event) {
                if (!this._drag) {
                    return;
                }

                this._box.style.left = html.clampNumber(event.clientX - this._drag.x, 0, window.innerWidth - 24) + 'px';
                this._box.style.top = html.clampNumber(event.clientY - this._drag.y, 0, window.innerHeight - 24) + 'px';
            }

            _stopDrag() {
                this._drag = null;
                html.off(document, 'pointermove', this._onMove);
                html.off(document, 'pointerup', this._onStop);
            }

            _renderRegion(name, slotName) {
                var region = this.shadowRoot.querySelector('[data-region="' + name + '"]');
                var template = this._templates[name] || html.getTemplateFromAttribute(this, name);

                html.renderTemplateRegion(region, template, slotName);
            }

            _render() {
                if (!this.shadowRoot) {
                    return;
                }

                this._renderRegion('header', 'header');
                this._renderRegion('content', '');
                this._renderRegion('footer', 'footer');
                this._close.hidden = !this.showCloseButton;
            }
        };

        html.defineBooleanAttributeProperty(WysiwygModalElement.prototype, 'showCloseButton', 'show-close-button');
        html.defineBooleanAttributeProperty(WysiwygModalElement.prototype, 'clickOutsideToClose', 'click-outside-to-close');
        html.defineBooleanAttributeProperty(WysiwygModalElement.prototype, 'moveable', 'moveable');
        html.defineBooleanAttributeProperty(WysiwygModalElement.prototype, 'resizable', 'resizable');

        WysiwygPopupElement = customElements.get('wysiwyg-popup') || class extends HTMLElement {
            static get observedAttributes() {
                return ['open', 'preferred-position'];
            }

            constructor() {
                super();
                this.anchor = null;
                this.attachShadow({ mode: 'open' });
                this.shadowRoot.innerHTML = [
                    '<style>',
                    ':host{display:none;position:fixed;z-index:1002}:host([open]){display:block}',
                    '.panel{max-width:min(320px,92vw);background:#fff;color:#111827;border:1px solid #d1d5db;border-radius:6px;box-shadow:0 12px 34px rgba(15,23,42,.18);padding:10px 12px}',
                    '</style>',
                    '<div class="panel" part="panel"><slot></slot></div>'
                ].join('');
                this._panel = this.shadowRoot.querySelector('.panel');
                this._syncPosition = this.updatePosition.bind(this);
            }

            connectedCallback() {
                html.on(window, 'resize', this._syncPosition);
                html.on(window, 'scroll', this._syncPosition, true);
                this.updatePosition();
            }

            disconnectedCallback() {
                html.off(window, 'resize', this._syncPosition);
                html.off(window, 'scroll', this._syncPosition, true);
            }

            attributeChangedCallback() {
                this.updatePosition();
            }

            get open() {
                return this.hasAttribute('open');
            }

            set open(value) {
                this.toggleAttribute('open', !!value);
                this.updatePosition();
            }

            get preferredPosition() {
                return this.getAttribute('preferred-position') || 'auto';
            }

            set preferredPosition(value) {
                this.setAttribute('preferred-position', value || 'auto');
            }

            showFor(anchor) {
                this.anchor = anchor || this.anchor;
                this.open = true;
                this.updatePosition();
            }

            hide() {
                this.open = false;
            }

            updatePosition() {
                var rect;
                var panel;
                var width;
                var height;
                var viewportWidth;
                var viewportHeight;
                var gap = 8;
                var margin = 8;
                var position;
                var point;

                if (!this.open || !this.isConnected) {
                    return;
                }

                rect = html.getAnchorRect(this.anchor);

                if (!rect) {
                    return;
                }

                panel = this._panel.getBoundingClientRect();
                width = panel.width || this.offsetWidth || 1;
                height = panel.height || this.offsetHeight || 1;
                viewportWidth = window.innerWidth || document.documentElement.clientWidth;
                viewportHeight = window.innerHeight || document.documentElement.clientHeight;
                position = this._bestPosition(rect, width, height, viewportWidth, viewportHeight);
                point = this._pointForPosition(position, rect, width, height, gap);

                this.style.left = html.clampNumber(point.left, margin, viewportWidth - width - margin) + 'px';
                this.style.top = html.clampNumber(point.top, margin, viewportHeight - height - margin) + 'px';
                this.setAttribute('data-position', position);
            }

            _pointForPosition(position, rect, width, height, gap) {
                var parts = position.split('-');
                var side = parts[0];
                var align = parts[1] || 'center';
                var crossStart = side === 'top' || side === 'bottom' ? rect.left : rect.top;
                var crossSize = side === 'top' || side === 'bottom' ? rect.width : rect.height;
                var popupCrossSize = side === 'top' || side === 'bottom' ? width : height;
                var cross = align === 'start' ? crossStart : align === 'end' ? crossStart + crossSize - popupCrossSize : crossStart + (crossSize - popupCrossSize) / 2;
                var main = {
                    top: rect.top - height - gap,
                    right: rect.right + gap,
                    bottom: rect.bottom + gap,
                    left: rect.left - width - gap
                };

                if (side === 'top' || side === 'bottom') {
                    return { left: cross, top: main[side] };
                }

                return { left: main[side], top: cross };
            }

            _bestPosition(rect, width, height, viewportWidth, viewportHeight) {
                var preferred = this.preferredPosition;
                var side = preferred.split('-')[0];
                var space = {
                    top: rect.top,
                    right: viewportWidth - rect.right,
                    bottom: viewportHeight - rect.bottom,
                    left: rect.left
                };
                var order = ['bottom', 'top', 'right', 'left'];

                if (['top', 'right', 'bottom', 'left'].indexOf(side) !== -1) {
                    return preferred;
                }

                return order.filter(function (position) {
                    return position === 'top' || position === 'bottom' ? space[position] >= height : space[position] >= width;
                })[0] || order.sort(function (left, right) {
                    return space[right] - space[left];
                })[0];
            }
        };

        WysiwygResizeOverlayElement = customElements.get('wysiwyg-resize-overlay') || class extends HTMLElement {
            constructor() {
                super();
                this.targetElement = null;
                this.boundaryElement = null;
                this.frameElements = null;
                this._drag = null;
                this.attachShadow({ mode: 'open' });
                this.shadowRoot.innerHTML = [
                    '<style>',
                    ':host{display:none;position:fixed;z-index:1003;box-sizing:border-box;pointer-events:none}',
                    ':host([open]){display:block}',
                    '.frame{position:absolute;inset:0;border:1px solid #2563eb;box-sizing:border-box}',
                    '.handle,.move{position:absolute;box-sizing:border-box;border:1px solid #2563eb;background:#fff;pointer-events:auto}',
                    '.handle{width:9px;height:9px;margin:-5px 0 0 -5px;padding:0}',
                    '.move{left:0;top:-25px;width:22px;height:22px;display:grid;place-items:center;border-radius:3px;color:#2563eb;cursor:move;padding:2px;}',
                    '.move svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}',
                    '[data-resize="n"]{left:50%;top:0;cursor:n-resize}',
                    '[data-resize="ne"]{left:100%;top:0;cursor:ne-resize}',
                    '[data-resize="e"]{left:100%;top:50%;cursor:e-resize}',
                    '[data-resize="se"]{left:100%;top:100%;cursor:se-resize}',
                    '[data-resize="s"]{left:50%;top:100%;cursor:s-resize}',
                    '[data-resize="sw"]{left:0;top:100%;cursor:sw-resize}',
                    '[data-resize="w"]{left:0;top:50%;cursor:w-resize}',
                    '[data-resize="nw"]{left:0;top:0;cursor:nw-resize}',
                    ':host([move-disabled]) .move{display:none}:host([resize-disabled]) .handle{display:none}',
                    ':host([resize-axis="x"]) .handle:not([data-resize="e"]):not([data-resize="w"]),:host([resize-axis="y"]) .handle:not([data-resize="n"]):not([data-resize="s"]){display:none}',
                    '</style>',
                    '<div class="frame" part="frame">',
                    '<button class="move" type="button" part="move" aria-label="Move"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 1v14M1 8h14M8 1 5.5 3.5M8 1l2.5 2.5M8 15l-2.5-2.5M8 15l2.5-2.5M1 8l2.5-2.5M1 8l2.5 2.5M15 8l-2.5-2.5M15 8l-2.5 2.5"/></svg></button>',
                    '<button class="handle" type="button" part="handle" data-resize="n" aria-label="Resize north"></button>',
                    '<button class="handle" type="button" part="handle" data-resize="ne" aria-label="Resize northeast"></button>',
                    '<button class="handle" type="button" part="handle" data-resize="e" aria-label="Resize east"></button>',
                    '<button class="handle" type="button" part="handle" data-resize="se" aria-label="Resize southeast"></button>',
                    '<button class="handle" type="button" part="handle" data-resize="s" aria-label="Resize south"></button>',
                    '<button class="handle" type="button" part="handle" data-resize="sw" aria-label="Resize southwest"></button>',
                    '<button class="handle" type="button" part="handle" data-resize="w" aria-label="Resize west"></button>',
                    '<button class="handle" type="button" part="handle" data-resize="nw" aria-label="Resize northwest"></button>',
                    '</div>'
                ].join('');
                this._onStart = this._start.bind(this);
                this._onMove = this._move.bind(this);
                this._onStop = this._stop.bind(this);
                this._syncPosition = this.updatePosition.bind(this);
            }

            connectedCallback() {
                html.on(this.shadowRoot, 'pointerdown', this._onStart);
                html.on(window, 'resize', this._syncPosition);
                html.on(window, 'scroll', this._syncPosition, true);
                this.updatePosition();
            }

            disconnectedCallback() {
                html.off(this.shadowRoot, 'pointerdown', this._onStart);
                html.off(window, 'resize', this._syncPosition);
                html.off(window, 'scroll', this._syncPosition, true);
                html.off(document, 'pointermove', this._onMove);
                html.off(document, 'pointerup', this._onStop);
            }

            get open() {
                return this.hasAttribute('open');
            }

            set open(value) {
                this.toggleAttribute('open', !!value);
            }

            get target() {
                return this.targetElement;
            }

            set target(value) {
                this.targetElement = value || null;
                this.updatePosition();
            }

            get boundary() {
                return this.boundaryElement;
            }

            set boundary(value) {
                this.boundaryElement = value || null;
            }

            showFor(target, options) {
                options = options || {};
                this.frameElements = options.frame || null;
                this.toggleAttribute('move-disabled', options.moveable === false);
                this.toggleAttribute('resize-disabled', options.resizable === false);
                this.toggleAttribute('resize-axis', !!options.resizeAxis);

                if (options.resizeAxis) {
                    this.setAttribute('resize-axis', options.resizeAxis);
                }

                this.target = target || this.target;
                this.open = !!this.target;
                this.updatePosition();
            }

            hide() {
                this.open = false;
            }

            updatePosition() {
                var rect;

                if (!this.open || !this.target || !this.target.getBoundingClientRect) {
                    return;
                }

                rect = html.getCombinedRect(this.frameElements) || this.target.getBoundingClientRect();
                this.style.left = rect.left + 'px';
                this.style.top = rect.top + 'px';
                this.style.width = rect.width + 'px';
                this.style.height = rect.height + 'px';
            }

            _start(event) {
                var handle = event.target.getAttribute && event.target.getAttribute('data-resize');
                var move = event.target.closest && event.target.closest('.move');
                var rect;

                if (!this.hasAttribute('open') || !this.target || (!handle && !move) ||
                    (move && this.hasAttribute('move-disabled')) ||
                    (handle && this.hasAttribute('resize-disabled'))) {
                    return;
                }

                rect = this.target.getBoundingClientRect();
                this._drag = {
                    type: handle ? 'resize' : 'move',
                    handle: handle,
                    x: event.clientX,
                    y: event.clientY,
                    width: rect.width,
                    height: rect.height,
                    range: null,
                    moved: false,
                    pointerEvents: this.target.style.pointerEvents
                };

                if (move) {
                    this.target.style.pointerEvents = 'none';
                }

                event.preventDefault();
                html.on(document, 'pointermove', this._onMove);
                html.on(document, 'pointerup', this._onStop);
                this._emit(this._drag.type + '-start');
            }

            _move(event) {
                var dx;
                var dy;
                var width;
                var height;
                var axis;

                if (!this._drag || !this.target) {
                    return;
                }

                dx = event.clientX - this._drag.x;
                dy = event.clientY - this._drag.y;

                if (this._drag.type === 'move') {
                    this._drag.range = this._getMoveRange(event);
                    this._drag.moved = this._moveTargetToRange(this._drag.range) || this._drag.moved;
                    this._emit('move');
                    return;
                }

                width = this._drag.width + (this._drag.handle.indexOf('e') !== -1 ? dx : this._drag.handle.indexOf('w') !== -1 ? -dx : 0);
                height = this._drag.height + (this._drag.handle.indexOf('s') !== -1 ? dy : this._drag.handle.indexOf('n') !== -1 ? -dy : 0);
                axis = this.getAttribute('resize-axis');

                if (axis !== 'y') {
                    this.target.style.width = Math.round(html.clampNumber(width, 24, 4000)) + 'px';
                }

                if (axis !== 'x') {
                    this.target.style.height = Math.round(html.clampNumber(height, 24, 4000)) + 'px';
                }

                this.updatePosition();
                this._emit('resize');
            }

            _stop(event) {
                if (this._drag) {
                    if (this._drag.type === 'move') {
                        if (!this._drag.moved) {
                            this._drag.range = this._getMoveRange(event) || this._drag.range;
                            this._moveTargetToRange(this._drag.range);
                        }

                        this.target.style.pointerEvents = this._drag.pointerEvents;
                    }

                    this._emit(this._drag.type + '-end');
                }

                this._drag = null;
                html.off(document, 'pointermove', this._onMove);
                html.off(document, 'pointerup', this._onStop);
            }

            _getMoveRange(event) {
                var range = html.getRangeFromPoint(event.clientX, event.clientY);
                var node = range && range.commonAncestorContainer;
                var element = html.getElement(node);
                var boundary = this.boundary;
                var table;
                var cell;

                if (!range || !element || element === this.target || this.target.contains(element)) {
                    return null;
                }

                if (boundary && (!node || !boundary.contains(node))) {
                    return null;
                }

                table = html.getClosestTag(element, 'table', boundary || document.body);
                cell = html.getClosestTag(element, ['td', 'th'], boundary || document.body);

                if (table && !cell) {
                    return null;
                }

                return range;
            }

            _moveTargetToRange(range) {
                if (!range || !this.target) {
                    return false;
                }

                range.insertNode(this.target);
                html.selectNode(this.target);
                this.updatePosition();
                return true;
            }

            _emit(name) {
                var rect = this.target && this.target.getBoundingClientRect ? this.target.getBoundingClientRect() : {};

                this.dispatchEvent(new CustomEvent(name, {
                    detail: {
                        target: this.target,
                        width: rect.width || 0,
                        height: rect.height || 0
                    }
                }));
            }
        };

        WysiwygTableSelectionElement = customElements.get('wysiwyg-table-selection') || class extends HTMLElement {
            constructor() {
                super();
                this.table = null;
                this.cell = null;
                this.cells = [];
                this.attachShadow({ mode: 'open' });
                this.shadowRoot.innerHTML = [
                    '<style>',
                    ':host{display:none;position:fixed;inset:0;z-index:1004;pointer-events:none}:host([open]){display:block}',
                    '.frame{position:absolute;box-sizing:border-box;border:2px solid #2563eb;background:rgba(37,99,235,.08)}',
                    '.selector{position:absolute;width:20px;height:20px;display:grid;place-items:center;padding:0;border:1px solid #2563eb;border-radius:3px;background:#fff;color:#2563eb;pointer-events:auto;cursor:pointer}',
                    '.selector:hover{background:#dbeafe}.selector svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
                    ':host(:not([mode="cell"])) .selector{display:none}',
                    '</style>',
                    '<div class="frame" part="frame"></div>',
                    '<button class="selector table" type="button" data-mode="table" aria-label="Select table" title="Select table"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="12" height="12"/><path d="M2 6h12M2 10h12M6 2v12M10 2v12"/></svg></button>',
                    '<button class="selector row" type="button" data-mode="row" aria-label="Select row" title="Select row"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="5" width="12" height="6"/><path d="M6 5v6M10 5v6"/></svg></button>',
                    '<button class="selector column" type="button" data-mode="column" aria-label="Select column" title="Select column"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="2" width="6" height="12"/><path d="M5 6h6M5 10h6"/></svg></button>'
                ].join('');
                this._frame = this.shadowRoot.querySelector('.frame');
                this._tableButton = this.shadowRoot.querySelector('.table');
                this._rowButton = this.shadowRoot.querySelector('.row');
                this._columnButton = this.shadowRoot.querySelector('.column');
                this._onClick = this._click.bind(this);
                this._syncPosition = this.updatePosition.bind(this);
            }

            connectedCallback() {
                html.on(this.shadowRoot, 'click', this._onClick);
                html.on(window, 'resize', this._syncPosition);
                html.on(window, 'scroll', this._syncPosition, true);
            }

            disconnectedCallback() {
                html.off(this.shadowRoot, 'click', this._onClick);
                html.off(window, 'resize', this._syncPosition);
                html.off(window, 'scroll', this._syncPosition, true);
            }

            get open() {
                return this.hasAttribute('open');
            }

            set open(value) {
                this.toggleAttribute('open', !!value);
            }

            showFor(selection) {
                this.table = selection && selection.table;
                this.cell = selection && selection.cell;
                this.cells = selection && selection.cells || [];
                this.setAttribute('mode', selection && selection.mode || 'cell');
                this.open = !!(this.table && this.cell && this.cells.length);
                this.updatePosition();
            }

            hide() {
                this.open = false;
            }

            updatePosition() {
                var rects;
                var left;
                var top;
                var right;
                var bottom;
                var selectionRect;
                var tableRect;
                var rowRect;
                var cellRect;

                if (!this.open || !this.table || !this.cell) {
                    return;
                }

                rects = this.cells.map(function (cell) { return cell.getBoundingClientRect(); });
                left = Math.min.apply(Math, rects.map(function (rect) { return rect.left; }));
                top = Math.min.apply(Math, rects.map(function (rect) { return rect.top; }));
                right = Math.max.apply(Math, rects.map(function (rect) { return rect.right; }));
                bottom = Math.max.apply(Math, rects.map(function (rect) { return rect.bottom; }));
                selectionRect = { left: left, top: top, width: right - left, height: bottom - top };
                tableRect = this.table.getBoundingClientRect();
                rowRect = this.cell.parentNode.getBoundingClientRect();
                cellRect = this.cell.getBoundingClientRect();
                this._frame.style.left = selectionRect.left + 'px';
                this._frame.style.top = selectionRect.top + 'px';
                this._frame.style.width = selectionRect.width + 'px';
                this._frame.style.height = selectionRect.height + 'px';
                this._tableButton.style.left = Math.max(0, tableRect.left - 22) + 'px';
                this._tableButton.style.top = Math.max(0, tableRect.top - 22) + 'px';
                this._rowButton.style.left = Math.max(0, tableRect.left - 22) + 'px';
                this._rowButton.style.top = rowRect.top + Math.max(0, (rowRect.height - 20) / 2) + 'px';
                this._columnButton.style.left = cellRect.left + Math.max(0, (cellRect.width - 20) / 2) + 'px';
                this._columnButton.style.top = Math.max(0, tableRect.top - 22) + 'px';
            }

            _click(event) {
                var button = event.target.closest && event.target.closest('[data-mode]');

                if (!button) {
                    return;
                }

                event.preventDefault();
                this.dispatchEvent(new CustomEvent('table-select', {
                    detail: { mode: button.getAttribute('data-mode') }
                }));
            }
        };

        WysiwygFileBrowserElement = customElements.get('wysiwyg-file-browser') || class extends HTMLElement {
            static get observedAttributes() {
                return ['endpoint', 'path', 'view-mode', 'supported-extensions'];
            }

            constructor() {
                super();
                this._data = { path: '/', items: [] };
                this._settingPath = false;
                this.attachShadow({ mode: 'open' });
                this.shadowRoot.innerHTML = [
                    '<style>',
                    ':host{display:block;color:#111827;font:13px/1.35 system-ui,sans-serif}',
                    '.bar{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:8px}',
                    '.crumbs{display:flex;gap:4px;align-items:center;min-width:0;overflow:auto}',
                    'button{font:inherit;color:inherit;cursor:pointer}',
                    '.crumbs button{border:0;background:transparent;color:#2563eb;padding:2px;text-decoration:none}',
                    '.crumbs button:hover{text-decoration:underline}.crumbs button[aria-current="page"]{color:#475569;font-weight:600;cursor:default}.crumbs span{color:#94a3b8}',
                    '.modes{display:flex;gap:4px}',
                    '.modes button,.item{background:#fff;border:1px solid #d1d5db;border-radius:4px}',
                    '.modes button:hover,.modes button[aria-pressed="true"],.item:hover{border-color:#2563eb;background:#dbeafe}',
                    '.modes button{display:grid;place-items:center;width:30px;height:30px;padding:0}',
                    '.modes svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
                    '.items{display:grid;gap:4px}',
                    ':host([view-mode="thumbnail"]) .items{grid-template-columns:repeat(auto-fill,minmax(86px,1fr));gap:8px}',
                    '.item{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;text-align:left;min-width:0;padding:4px 7px}',
                    ':host([view-mode="thumbnail"]) .item{grid-template-columns:1fr;justify-items:center;min-height:82px;text-align:center}',
                    '.name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}',
                    '.meta{color:#64748b;font-size:12px}',
                    '.thumb{width:64px;height:44px;object-fit:cover;border:1px solid #e5e7eb;background:#f8fafc}',
                    ':host(:not([view-mode="thumbnail"])) .thumb{display:none}',
                    '</style>',
                    '<div class="bar"><nav class="crumbs" aria-label="Breadcrumb"></nav><div class="modes"><button type="button" data-mode="list" aria-label="List view" title="List view"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg></button><button type="button" data-mode="thumbnail" aria-label="Thumbnail view" title="Thumbnail view"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button></div></div>',
                    '<div class="items" role="listbox"></div>'
                ].join('');
                this._crumbs = this.shadowRoot.querySelector('.crumbs');
                this._items = this.shadowRoot.querySelector('.items');
                this._onClick = this._click.bind(this);
            }

            connectedCallback() {
                html.on(this.shadowRoot, 'click', this._onClick);
                this._render();

                if (this.endpoint && !this._data.items.length) {
                    this.load(this.path);
                }
            }

            disconnectedCallback() {
                html.off(this.shadowRoot, 'click', this._onClick);
            }

            attributeChangedCallback(name, oldValue, value) {
                if (oldValue === value) {
                    return;
                }

                if (name === 'path' && !this._settingPath && this.endpoint && this.isConnected) {
                    this.load(value || '/');
                    return;
                }

                this._render();
            }

            get endpoint() {
                return this.getAttribute('endpoint') || '';
            }

            set endpoint(value) {
                value ? this.setAttribute('endpoint', value) : this.removeAttribute('endpoint');
            }

            get path() {
                return this.getAttribute('path') || this._data.path || '/';
            }

            set path(value) {
                this.setAttribute('path', value || '/');
            }

            get viewMode() {
                return this.getAttribute('view-mode') || 'list';
            }

            set viewMode(value) {
                this.setAttribute('view-mode', value === 'thumbnail' ? 'thumbnail' : 'list');
            }

            get supportedExtensions() {
                return (this.getAttribute('supported-extensions') || '').split(',').map(function (extension) {
                    extension = extension.trim().toLowerCase();
                    return extension && extension.charAt(0) === '.' ? extension : extension ? '.' + extension : '';
                }).filter(Boolean);
            }

            set supportedExtensions(value) {
                this.setAttribute('supported-extensions', Array.isArray(value) ? value.join(',') : value || '');
            }

            setData(data) {
                this._data = Object.assign({ path: '/', breadcrumbs: null, items: [] }, data || {});
                this._setPath(this._data.path || '/');
                this._render();
            }

            load(path) {
                var self = this;
                var url;

                this._setPath(path || '/');

                if (!this.endpoint || typeof fetch !== 'function') {
                    this.dispatchEvent(new CustomEvent('navigate', { detail: { path: this.path } }));
                    return Promise.resolve(null);
                }

                url = new URL(this.endpoint, window.location.href);
                url.searchParams.set('path', this.path);

                return fetch(url.toString()).then(function (response) {
                    if (!response.ok) {
                        throw new Error('Unable to load files');
                    }

                    return response.json();
                }).then(function (data) {
                    self.setData(data);
                    self.dispatchEvent(new CustomEvent('navigate', { detail: { path: self.path } }));
                    return data;
                });
            }

            _setPath(path) {
                this._settingPath = true;
                this.setAttribute('path', path || '/');
                this._settingPath = false;
            }

            _click(event) {
                var mode = event.target.closest && event.target.closest('[data-mode]');
                var crumb = event.target.closest && event.target.closest('[data-crumb]');
                var item = event.target.closest && event.target.closest('[data-index]');
                var entry;

                if (mode) {
                    this.viewMode = mode.getAttribute('data-mode');
                    return;
                }

                if (crumb) {
                    this.load(crumb.getAttribute('data-crumb'));
                    return;
                }

                if (!item) {
                    return;
                }

                entry = this._visibleItems()[Number(item.getAttribute('data-index'))];

                if (!entry) {
                    return;
                }

                if (entry.type === 'directory') {
                    this.load(entry.path);
                    return;
                }

                this.dispatchEvent(new CustomEvent('file-select', { detail: { file: entry } }));
            }

            _visibleItems() {
                var extensions = this.supportedExtensions;

                return (this._data.items || []).filter(function (item) {
                    var extension = (item.extension || (item.name && item.name.match(/\.[^.]+$/) || [''])[0]).toLowerCase();
                    return item.type === 'directory' || !extensions.length || extensions.indexOf(extension) !== -1;
                });
            }

            _breadcrumbs() {
                var path = this._data.path || this.path || '/';
                var parts;
                var current = '';

                if (this._data.breadcrumbs) {
                    return this._data.breadcrumbs;
                }

                parts = path.split('/').filter(Boolean);

                return [{ name: 'Root', path: '/' }].concat(parts.map(function (part) {
                    current += '/' + part;
                    return { name: part, path: current };
                }));
            }

            _render() {
                var breadcrumbs = this._breadcrumbs();
                var items = this._visibleItems();
                var mode = this.viewMode;

                if (!this._crumbs || !this._items) {
                    return;
                }

                this._crumbs.innerHTML = breadcrumbs.map(function (crumb, index) {
                    var current = index === breadcrumbs.length - 1 ? ' aria-current="page"' : '';
                    return '<button type="button" data-crumb="' + escapeHtml(crumb.path) + '"' + current + '>' + escapeHtml(index ? crumb.name : 'Root') + '</button>';
                }).join('<span>/</span>');
                this.shadowRoot.querySelectorAll('[data-mode]').forEach(function (button) {
                    button.setAttribute('aria-pressed', String(button.getAttribute('data-mode') === mode));
                });
                this._items.innerHTML = items.map(function (item, index) {
                    var icon = item.type === 'directory' ? '&#128193;' : '&#128196;';
                    var thumb = item.thumbnailUrl ? '<img class="thumb" alt="" src="' + escapeHtml(item.thumbnailUrl) + '">' : '<span class="thumb"></span>';
                    var meta = item.type === 'directory' ? 'Folder' : (item.extension || '');

                    return '<button class="item" type="button" role="option" data-index="' + index + '">' + thumb + '<span class="name">' + icon + ' ' + escapeHtml(item.name) + '</span><span class="meta">' + escapeHtml(meta) + '</span></button>';
                }).join('');
            }
        };

        if (!customElements.get('wysiwyg-modal')) {
            customElements.define('wysiwyg-modal', WysiwygModalElement);
        }

        if (!customElements.get('wysiwyg-popup')) {
            customElements.define('wysiwyg-popup', WysiwygPopupElement);
        }

        if (!customElements.get('wysiwyg-resize-overlay')) {
            customElements.define('wysiwyg-resize-overlay', WysiwygResizeOverlayElement);
        }

        if (!customElements.get('wysiwyg-table-selection')) {
            customElements.define('wysiwyg-table-selection', WysiwygTableSelectionElement);
        }

        if (!customElements.get('wysiwyg-file-browser')) {
            customElements.define('wysiwyg-file-browser', WysiwygFileBrowserElement);
        }

        return {
            WysiwygModalElement: WysiwygModalElement,
            WysiwygPopupElement: WysiwygPopupElement,
            WysiwygResizeOverlayElement: WysiwygResizeOverlayElement,
            WysiwygTableSelectionElement: WysiwygTableSelectionElement,
            WysiwygFileBrowserElement: WysiwygFileBrowserElement
        };
    }

    return defineComponents();
}));
