(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../html-utility'));
    } else {
        root.WysiwygMediaCommands = factory(root.WysiwygHtmlUtility);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (html) {
    var MEDIA_TAGS = { image: 'img', video: 'video', audio: 'audio' };
    var MEDIA_BOOLEAN_ATTRIBUTES = ['controls', 'autoplay', 'loop', 'muted', 'playsinline'];
    var MEDIA_STRING_ATTRIBUTES = ['src', 'title', 'poster', 'preload'];

    function insertNode(node, selection) {
        var currentSelection = html.getCurrentSelection(selection);
        var range;

        if (!node || !currentSelection || currentSelection.rangeCount === 0) {
            return false;
        }

        range = currentSelection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(node);
        html.moveSelectionAfterNode(node, currentSelection);
        return node;
    }

    function insertMedia(type, attributes, selection) {
        var media;

        if (!attributes || !attributes.src || !MEDIA_TAGS[type]) {
            return false;
        }

        media = document.createElement(MEDIA_TAGS[type]);
        media.setAttribute('src', attributes.src);

        if (type === 'image') {
            ['alt', 'title', 'width', 'height'].forEach(function (name) {
                if (attributes[name] !== undefined && attributes[name] !== null && attributes[name] !== '') {
                    media.setAttribute(name, attributes[name]);
                }
            });
        } else {
            MEDIA_BOOLEAN_ATTRIBUTES.forEach(function (name) {
                if ((name === 'controls' && attributes[name] === undefined) || attributes[name]) {
                    media.setAttribute(name, '');
                }
            });
            MEDIA_STRING_ATTRIBUTES.forEach(function (name) {
                if (attributes[name]) {
                    media.setAttribute(name, attributes[name]);
                }
            });
        }

        if (attributes.filePath) {
            media.setAttribute('data-file-path', attributes.filePath);
        }

        return insertNode(media, selection);
    }

    function insertImage(attributes, selection) {
        return insertMedia('image', attributes, selection);
    }

    function insertResource(attributes, selection) {
        return insertMedia(attributes && attributes.type, attributes, selection);
    }

    function updateMedia(type, attributes, selection) {
        var tagName = MEDIA_TAGS[type];
        var media = tagName && html.getSelectedElement(html.getCurrentSelection(selection), tagName);

        if (!media || !attributes) {
            return false;
        }

        if (type === 'image') {
            ['src', 'alt', 'title', 'width', 'height'].forEach(function (name) {
                if (attributes[name] === null || attributes[name] === undefined || attributes[name] === '') {
                    media.removeAttribute(name);
                } else {
                    media.setAttribute(name, attributes[name]);
                }
            });
        } else {
            MEDIA_BOOLEAN_ATTRIBUTES.forEach(function (name) {
                if (attributes[name] !== undefined) {
                    if (attributes[name]) {
                        media.setAttribute(name, '');
                    } else {
                        media.removeAttribute(name);
                    }
                }
            });
            MEDIA_STRING_ATTRIBUTES.forEach(function (name) {
                if (attributes[name] === null || attributes[name] === '') {
                    media.removeAttribute(name);
                } else if (attributes[name] !== undefined) {
                    media.setAttribute(name, attributes[name]);
                }
            });
        }

        if (attributes.filePath === null || attributes.filePath === '') {
            media.removeAttribute('data-file-path');
        } else if (attributes.filePath !== undefined) {
            media.setAttribute('data-file-path', attributes.filePath);
        }

        return media;
    }

    function updateImage(attributes, selection) {
        return updateMedia('image', attributes, selection);
    }

    function updateResource(attributes, selection) {
        return updateMedia(attributes && attributes.type, attributes, selection);
    }

    function getSelectedMedia(selection, type, rootNode) {
        var tagName = type && MEDIA_TAGS[type];
        var media = html.getSelectedElement(html.getCurrentSelection(selection), tagName || ['img', 'video', 'audio']);

        return media && (!rootNode || rootNode.contains(media)) ? media : null;
    }

    function getSelectedImage(selection, rootNode) {
        return getSelectedMedia(selection, 'image', rootNode);
    }

    function cleanMediaStyle(media) {
        if (!media.getAttribute('style')) {
            media.removeAttribute('style');
        }
    }

    function setMediaStyle(propertyName, value, selection, options, type) {
        var media = getSelectedMedia(selection, type, options && options.root);
        var cssProperty;

        if (!media || !propertyName) {
            return false;
        }

        cssProperty = propertyName.replace(/[A-Z]/g, function (letter) {
            return '-' + letter.toLowerCase();
        });

        if (value === undefined || value === null || value === '') {
            media.style.removeProperty(cssProperty);
        } else {
            media.style.setProperty(cssProperty, value);
        }

        cleanMediaStyle(media);
        return media;
    }

    function setImageStyle(propertyName, value, selection, options) {
        return setMediaStyle(propertyName, value, selection, options, 'image');
    }

    function toggleMediaWidth(selection, options, type) {
        var media = getSelectedMedia(selection, type, options && options.root);

        if (!media) {
            return false;
        }

        media.style.width = media.style.width === '100%' ? '' : '100%';
        cleanMediaStyle(media);
        return media;
    }

    function toggleImageFullSize(selection, options) {
        return toggleMediaWidth(selection, options, 'image');
    }

    function setImageLayout(layout, selection, options) {
        var image = getSelectedImage(selection, options && options.root);

        if (!image || ['inline', 'block', 'float-left', 'float-right'].indexOf(layout) === -1) {
            return false;
        }

        image.style.removeProperty('display');
        image.style.removeProperty('float');

        if (layout === 'block') {
            image.style.display = 'block';
        } else if (layout === 'float-left' || layout === 'float-right') {
            image.style.float = layout === 'float-left' ? 'left' : 'right';
        }

        cleanMediaStyle(image);
        return image;
    }

    function removeMedia(selection, type) {
        var currentSelection = html.getCurrentSelection(selection);
        var media = html.getSelectedElement(currentSelection, type ? MEDIA_TAGS[type] : ['img', 'video', 'audio']);

        if (!media) {
            return false;
        }

        html.moveSelectionAfterNode(media, currentSelection);
        media.parentNode.removeChild(media);
        return true;
    }

    function removeImage(selection) {
        return removeMedia(selection, 'image');
    }

    return {
        insertImage: insertImage,
        insertMedia: insertMedia,
        insertResource: insertResource,
        getSelectedImage: getSelectedImage,
        getSelectedMedia: getSelectedMedia,
        removeImage: removeImage,
        removeMedia: removeMedia,
        setImageLayout: setImageLayout,
        setImageStyle: setImageStyle,
        setMediaStyle: setMediaStyle,
        toggleImageFullSize: toggleImageFullSize,
        toggleMediaWidth: toggleMediaWidth,
        updateImage: updateImage,
        updateMedia: updateMedia,
        updateResource: updateResource
    };
}));
