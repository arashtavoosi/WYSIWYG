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

    function defineComponents() {
        var WysiwygModalElement;
        var WysiwygPopupElement;

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
                    ':host{display:none}:host([open]){display:block}',
                    '.shade{position:fixed;inset:0;background:rgba(15,23,42,.34);z-index:1000}',
                    '.box{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1001;min-width:280px;max-width:min(92vw,680px);max-height:88vh;background:#fff;color:#111827;border:1px solid #d1d5db;border-radius:6px;box-shadow:0 20px 60px rgba(15,23,42,.24);overflow:auto}',
                    ':host([resizable]) .box{resize:both}',
                    '.head,.foot{padding:12px 14px}.head{display:flex;gap:12px;align-items:center;border-bottom:1px solid #e5e7eb}:host([moveable]) .head{cursor:move}',
                    '.body{padding:14px}.foot{border-top:1px solid #e5e7eb}.region{flex:1}.close{border:0;background:transparent;color:inherit;font:inherit;line-height:1;padding:4px 6px;cursor:pointer}.close[hidden]{display:none}',
                    '::slotted(form){margin:0}::slotted([slot="footer"]){display:flex;gap:8px;justify-content:flex-end}',
                    '</style>',
                    '<div class="shade" part="backdrop"></div>',
                    '<section class="box" part="dialog" role="dialog" aria-modal="true">',
                    '<header class="head" part="header"><div class="region" data-region="header"></div><button class="close" type="button" aria-label="Close">x</button></header>',
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

        if (!customElements.get('wysiwyg-modal')) {
            customElements.define('wysiwyg-modal', WysiwygModalElement);
        }

        if (!customElements.get('wysiwyg-popup')) {
            customElements.define('wysiwyg-popup', WysiwygPopupElement);
        }

        return {
            WysiwygModalElement: WysiwygModalElement,
            WysiwygPopupElement: WysiwygPopupElement
        };
    }

    return defineComponents();
}));
