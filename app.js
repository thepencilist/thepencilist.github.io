/*
 * Copyright (c) 2018 Richard L. McNeary II
 *
 * MIT License
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

"use strict";

(function () {

    /**
     * Information about an image to be displayed.
     * @typedef ImageItem
     * @property {string} date
     * @property {string[]} description
     * @property {ImgData} [imgData]
     * @property {number} [pageIndex]
     * @property {number[]} size The dimensions of the image in pixels; [width, height].
     * @property {string} src
     * @property {string[]} tags
     * @property {string} title
     */

    /**
     * Information about an image to be displayed.
     * @typedef ImgData
     * @property {number} aspectRatio
     * @property {number} height
     * @property {number} id
     * @property {number} naturalHeight
     * @property {number} naturalWidth
     * @property {number} [numberOfBlocks] To display a row of thumbnails.
     * @property {number} width
     */

    /**
     * Information used to create an HTML element.
     * @typedef ElementProperties
     * @property {string} [id]
     * @property {string} [className]
     * @property {string} [innerText]
     * @property {string} [src]
     */

    /**
     * Information used to create an HTML element.
     * @typedef StyleProperties
     * @property {string} [display]
     */


    /**
     * The image collection.
     * @type {ImageItem[]}
     */
    var imageItems;
    var eventImageCellClicked = "imagecellclicked";


    var collection = {

        rowsPerPage: 3,

        /**
         * @param {number} [firstImageIndex=0] The page index.
         */
        updatePage: function(firstImageIndex) {
            var blocks;
            var i;
            /** @type {ImageItem} */
            var image;
            var images = [];
            var processRow;
            var rowBlocks = 0;
            var startIndex = firstImageIndex || 0;
            var updateRowCallback;
            /** @type {ImageItem[]} */
            var updateRowImages = [];
            var updateRowTotal = imageItems.length;

            if (imageItems.length <= startIndex) {
                console.log("updatePage - TODO: clear rows.");
                return;
            }

            updateRowCallback = function(addedImages) {
                updateRowImages = updateRowImages.concat(addedImages);

                if (updateRowTotal !== updateRowImages.length) {
                    return;
                }

                updateRowImages.sort(function(a, b) { return a.imgData.id - b.imgData.id; });
                row.setImagesSource(updateRowImages);
            };

            processRow = function() {
                var rowImages = images.slice(0);
                this.updateRow(images, function() { updateRowCallback(rowImages); });
                images = [image];
                rowBlocks = blocks;
            };

            for (i = startIndex; i < imageItems.length; i++) {
                image = imageItems[i];
                image.imgData = image.imgData || { id: i };
                blocks = row.calculateBlocks(image.size[0] / image.size[1]);

                if (row.maxBlocksPerRow < rowBlocks + blocks) {
                    processRow.call(this);
                } else {
                    images.push(image);
                    rowBlocks += blocks;
                }

                // This row has less than the max number of images per row but
                // there are no more images.
                if (imageItems.length <= i + 1) {
                    processRow.call(this);
                }
            }
        },

        /**
         * @param {ImageItem[]} images The images that make up the row.
         * @param {(count: number) => void} callback Invoked when the row has finished updating the DOM.
         */
        updateRow: function(images, callback) {
            var i;
            /** @type {HTMLDivElement} */
            var imageCell;
            var parent = document.getElementById("image-collection");
            var updateCallback;
            var updateCount = 0;
            var updateTotal = images.length;

            if (!images || !images.length) {
                return;
            }

            row.setImageSizes(images);

            updateCallback = function() {
                updateCount++;
                if (updateTotal === updateCount && callback) {
                    callback(updateCount);
                } 
            };

            for (i = 0; i < images.length; i++) {
                // Create the image cell element but don't attach it to a
                // parent.
                imageCell = row.getCreateImageCell(images[i]);

                // Attaches the image cell to the parent if needed.
                row.updateImageCell(images[i], imageCell, parent, updateCallback);
            }
        }

    };


    var row = {

        arSixteenNine: 16 / 9, // 1.7778 L
        arThreeTwo: 3 / 2, // 1.5 L
        imageSeparationWidth: 0,
        maxBlocksPerRow: 6,
        maxRowWidth: 800,

        /**
         * Calculates how many blocks each image will occupy in a row.
         * @param {number} aspectRatio The width of the image divided by the height of the image.
         * @returns {number} The number of blocks.
         */
        calculateBlocks: function (aspectRatio) {
            var blocks = 1; // Fills the entire row.
            if (this.arSixteenNine < aspectRatio) {
                blocks = 6;
            } else if (this.arThreeTwo < aspectRatio) {
                blocks = 3;
            } else if (1 < aspectRatio) {
                blocks = 2.5;
            }

            return blocks;
        },

        /**
         * Create the image cell elements.
         * @param {ImageItem} image 
         * @param {HTMLElement} [parent]
         * @returns {HTMLDivElement} 
         */
        getCreateImageCell: function (image, parent) {
            /** @type {HTMLDivElement} */
            var cellInfoContainer;
            var container = document.getElementById("cell-" + image.imgData.id);
            /** @type {HTMLDivElement} */
            var content;
            /** @type {Event} */
            var event;
            var i;
            /** @type {HTMLDivElement} */
            var imageCell;
            /** @type {HTMLDivElement} */
            var overlay;

            if (container === null) {
                container = createElement("div", { className: "image-cell-container", id: "cell-" + image.imgData.id }, parent);
                imageCell = createElement("div", { className: "image-cell" }, container);

                // Don't create the img element here. That will be added later as needed.

                overlay = createElement("div", { className: "image-cell-info-overlay" }, imageCell);
                overlay.addEventListener("click", function () {
                    event = document.createEvent("Event");
                    event.initEvent(eventImageCellClicked, true, true);
                    event.image = image;
                    overlay.dispatchEvent(event);
                });

                cellInfoContainer = createElement("div", { className: "image-cell-info-container" }, overlay);
                createElement("h1", { className: "image-cell-info" }, cellInfoContainer);

                content = createElement("div", { className: "content" }, container);
                createElement("p", { className: "content-date" }, content);
                for (i = 0; i < image.description.length; i++) {
                    createElement("p", { className: "content-description" }, content);
                }
            } else {
                imageCell = container.getElementsByClassName("image-cell")[0];
            }

            imageCell.style.height = image.imgData.height + "px";
            imageCell.style.width = image.imgData.width + "px";

            return container;
        },

        /**
         * @param {ImageItem} image
         * @param {{cell: HTMLDivElement, container: HTMLDivElement, img: HTMLImageElement, overlay: HTMLDivElement}} elements
         * @param {(img: HTMLImageElement) => void} callback
         */
        getCreateImageElement: function(image, elements, callback) {
            /** @type {HTMLImageElement} */
            var img;
            var requestId;

            img = elements.img;
            if (img) {
                callback(img);
                return;
            }

            img = createElement("img", { alt: image.title }, null, { height: image.imgData.height + "px", width: image.imgData.width + "px" });
            img.dataset.id = image.imgData.id;

            requestId = requestAnimationFrame(function() {
                cancelAnimationFrame(requestId);
                elements.cell.insertBefore(img, elements.overlay);

                if (callback) {
                    setTimeout(function() { callback(img); }); 
                }
            });
        },

        /**
         * @param {any} id The cell id.
         * @returns {{cell: HTMLDivElement, container: HTMLDivElement, img: HTMLImageElement, overlay: HTMLDivElement}} 
         */
        getImageCellElements: function (id) {
            var container = document.getElementById("cell-" + id);
            var cell = container.getElementsByClassName("image-cell")[0];
            var img = cell.getElementsByTagName("img")[0];
            var overlay = cell.getElementsByClassName("image-cell-info-overlay")[0];
            return {
                cell: cell,
                container: container,
                img: img,
                overlay: overlay
            };
        },

        /**
         * Update the imgData height and width properties with sizes the images
         * should have when displayed.
         * @param {ImageItem[]} images The images that make up the row.
         */
        setImageSizes: function (images) {
            var i;
            var image;
            var newHeight;
            var nominalWidth;
            var totalWidth;

            // First scale all of the image heights to the height of the first image.
            var sizes = [{ height: images[0].size[1], width: images[0].size[0] }];

            var a = images[0];
            var b;
            for (i = 1; i < images.length; i++) {
                b = images[i];
                sizes.push({ height: a.size[0], width: (a.size[1] * b.size[0]) / b.size[1] });
            }

            // Find the total width of all the scaled images.
            nominalWidth = sizes.reduce(function (acc, x) {
                return acc + x.width;
            }, 0);

            // Find the height that will allow all the images to fit the maximum
            // width.
            totalWidth = nominalWidth - ((images.length - 1) * this.imageSeparationWidth);
            newHeight = (a.size[1] * this.maxRowWidth) / totalWidth;

            for (i = 0; i < images.length; i++) {
                // Update each image's dimensions to fit in the brick wall layout.
                image = images[i];
                image.imgData = image.imgData || {};
                image.imgData.width = Math.round((image.size[0] * newHeight) / image.size[1]);
                image.imgData.height = Math.round(newHeight);
            }
        },

        /**
         * @param {ImageItem[]} images The images that make up the row.
         * @param {number} [index=0] The index of the image to update.
         */
        setImagesSource: function(images, index) {
            var elements;
            var idx = index || 0;
            /** @type {ImageItem} */
            var image;
            var loadHandler;

            if (images.length <= idx) {
                return;
            }

            image = images[idx];
            elements = this.getImageCellElements(image.imgData.id);

            this.getCreateImageElement(image, elements, function(img) {
                loadHandler = function() {
                    img.removeEventListener("load", loadHandler);
                    loadHandler = null;
                    setTimeout(function() { row.setImagesSource(images, idx + 1); });
                };
    
                img.addEventListener("load", loadHandler);
    
                img.src = image.src;
            });

        },

        /**
         * @param {ImageItem} image The images that make up the row.
         * @param {HTMLElement} imageCell
         * @param {HTMLElement} parent
         * @param {() => void} callback Invoked after the image cell has been added to the DOM.
         * @returns {HTMLDivElement} 
         */
        updateImageCell: function(image, imageCell, parent, callback) {
            var self = this;
            var requestId = window.requestAnimationFrame(function() {
                window.cancelAnimationFrame(requestId);

                parent.appendChild(imageCell);

                self.updateImageCellContents(image, imageCell.getElementsByClassName("image-cell-info-container")[0]);

                if (callback) {
                    setTimeout(function() { callback(); });
                }
            });
        },

        /**
         * Update the information displayed in an image cell.
         * @param {ImageItem} image 
         * @param {HTMLDivElement} container
         */
        updateImageCellContents: function (image, container) {
            /** @type {HTMLElement[]} */
            var children;
            /** @type {HTMLElement} */
            var content;

            setInnerText(container, "image-cell-info", image.title);

            children = container.getElementsByClassName("content");
            if (children && 0 < children.length) {
                content = children[0];
                setInnerText(content, "content-date", image.date);
                setInnerText(content, "content-description", image.description);
            }
        }

    };


    /**
     * Object with data and functions for displaying a large "hero" image.
     */
    var heroImage = {

        cssClassImageCellInformation: "hero-image-cell-information",
        cssClassImageCellInformationContainer: "hero-image-cell-information-container",
        cssClassImageCellInformationPosition: "hero-image-cell-information-position",
        imageCellId: "hero-image-cell",
        imageCellImgContainerId: "hero-image-cell-image-container",
        imageCellImgId: "img-hero",
        imageCellImgPositionId: "hero-image-cell-image-position",
        imageCellModalId: "hero-image-cell-modal",

        /**
         * @returns {HTMLImageElement}
         */
        findImg: function () {
            var imageCell = this.getCell();
            return findInChildren(imageCell.children, { id: this.imageCellId });
        },

        /**
         * Gets the image cell element.
         * @returns {HTMLDivElement}
         */
        getCell: function () {
            /** @type {HTMLElement | HTMLElement[]} */
            var cell;
            /** @type {HTMLDivElement} */
            var closeContainer;
            /** @type {HTMLDivElement} */
            var imageContainer;
            /** @type {HTMLDivElement} */
            var modal;

            modal = this.getModal();
            cell = findInChildren(modal.children, { id: this.imageCellId });
            if (!cell) {
                cell = createElement("div", { id: this.imageCellId }, modal);

                closeContainer = createElement("div", { className: "close-container" }, cell);
                createElement("div", { className: "close" }, closeContainer);

                this.getInformation();

                imageContainer = createElement("div", { id: this.imageCellImgContainerId }, cell);
                createElement("div", { id: this.imageCellImgPositionId }, imageContainer);
            } else {
                cell = findInChildren(modal.children, { id: this.imageCellId });
            }

            return cell;
        },

        getInformation: function () {
            /** @type {HTMLDivElement} */
            var cell;
            /** @type {HTMLElement | HTMLElement[]} */
            var children;
            /** @type {HTMLDivElement} */
            var info;
            /** @type {HTMLDivElement} */
            var infoContainer;
            /** @type {HTMLDivElement} */
            var infoPosition;

            cell = this.getCell();
            children = findInChildren(cell.children, { className: this.cssClassImageCellInformationContainer });

            if (children) {
                infoContainer = children[0];
            } else {
                infoContainer = createElement("div", { className: this.cssClassImageCellInformationContainer }, cell);
            }

            children = findInChildren(cell.children, { className: this.cssClassImageCellInformationPosition });
            if (children) {
                infoPosition = children[0];
            } else {
                infoPosition = createElement("div", { className: this.cssClassImageCellInformationPosition }, infoContainer);
            }


            children = findInChildren(infoPosition.children, { className: this.cssClassImageCellInformation });
            if (children) {
                info = children[0];
            } else {
                info = createElement("section", { className: this.cssClassImageCellInformation }, infoPosition);
            }

            return info;
        },

        /**
         * @returns {HTMLDivElement}
         */
        getModal: function () {
            var body = document.body;
            var modal = findInChildren(body.children, { id: this.imageCellModalId });
            if (!modal) {
                modal = createElement("div", { id: this.imageCellModalId }, body);
                modal.addEventListener("click", function () {
                    modal.style.display = "none";
                });
            }

            return modal;
        },

        /**
         * Show the hero image.
         * @param {ImageItem} image
         */
        show: function (image) {
            var self = this;
            /** @type {(imageItem: ImageItem) => void} */
            var updateImageCell = function (imageItem) {
                self.getModal().style.removeProperty("display");
                self.updateInformation(imageItem);
            };

            var imageCell = this.getCell();
            var img = this.findImg();
            if (!img) {
                createImageElement(image, "hero", -1, function (cbImage, cbImg) {
                    var container = findInChildren(imageCell.children, { id: self.imageCellImgPositionId });
                    container.appendChild(cbImg);
                    updateImageCell(cbImage);
                });
            } else {
                img.src = image.src;
                updateImageCell(image);
            }
        },

        /**
         * Update the text information that's displayed.
         * @param {ImageItem} image
         */
        updateInformation: function (image) {
            /** @type {string} */
            var d;
            /** @type {HTMLParagraphElement} */
            var date;
            /** @type {HTMLElement | HTMLElement[]} */
            var descriptions;
            /** @type {HTMLParagraphElement} */
            var e;
            /** @type {number} */
            var i;
            /** @type {HTMLHeadingElement} */
            var title;

            var info = this.getInformation();

            title = findInChildren(info.children, { id: this.cssClassImageCellInformation + "-title" });
            if (!title) {
                title = createElement("h1", { id: this.cssClassImageCellInformation + "-title" }, info);
            }

            date = findInChildren(info.children, { id: this.cssClassImageCellInformation + "-date" });
            if (!date) {
                date = createElement("p", { className: "cell-information-item", id: this.cssClassImageCellInformation + "-date" }, info);
            }

            title.innerText = image.title;
            date.innerText = "Date: " + image.date;

            descriptions = findInChildren(info.children, { className: this.cssClassImageCellInformation + "-description" }, info);
            descriptions = descriptions || [];
            for (i = 0; i < image.description.length || i < descriptions.length; i++) {
                d = i < image.description.length ? image.description[i] : null;
                e = i < descriptions.length ? descriptions[i] : createElement("p", { className: "cell-information-item " + this.cssClassImageCellInformation + "-description" }, info);

                e.innerHTML = d;
            }
        }

    };


    /**
     * Create an HTML element.
     * @param {string} tagName
     * @param {ElementProperties} [props=null]
     * @param {HTMLElement} [appendToParent=null] The new element will be appended as a child to this element.
     * @param {StyleProperties} [style=null]
     * @returns {HTMLElement}
     */
    function createElement(tagName, props, appendToParent, style) {
        var i;
        var keys;
        var e = document.createElement(tagName);

        if (props) {
            keys = Object.keys(props);
            for (i = 0; i < keys.length; i++) {
                e[keys[i]] = props[keys[i]];
            }
        }

        if (style) {
            keys = Object.keys(style);
            for (i = 0; i < keys.length; i++) {
                e.style[keys[i]] = style[keys[i]];
            }
        }

        if (appendToParent) {
            appendToParent.appendChild(e);
        }

        return e;
    }

    /**
     * Create the layout for a single image on the page.
     * @param {ImageItem} image
     * @param {number} id
     * @param {number} filteredIndex
     * @param {(image: ImageItem, img: HTMLImageElement) => void} callback
     */
    function createImageElement(image, id, filteredIndex, callback) {
        /** @type {HTMLImageElement} */
        var img;
        /** @type {ImgData} */
        var imgData;
        /** @type {(evt: Event) => void} */
        var loadHandler;

        // Don't use getImageCellElements here because the img element may exist
        // but not be connected to a parent element in the DOM (for example when
        // loading).
        var strId = "img-" + id;
        img = document.getElementById(strId);
        if (!img) {
            img = createElement("img", { id: strId });
        }

        loadHandler = function () {
            // FYI: 'this' refers to the HTMLImageElement.
            // console.log("Image loaded: " + this.src.split("/").pop());

            this.removeEventListener("load", loadHandler);

            imgData = {
                aspectRatio: this.naturalWidth / this.naturalHeight,
                height: this.naturalHeight,
                naturalHeight: this.naturalHeight,
                naturalWidth: this.naturalWidth,
                pageIndex: image.imgData.pageIndex,
                width: this.naturalWidth
            };

            image.imgData = imgData;

            callback(image, this);
        };

        if (filteredIndex !== null && -1 < filteredIndex) {
            img.dataset.filteredIndex = "" + filteredIndex;
        } else {
            img.removeAttribute("data-filtered-index");
        }

        img.addEventListener("load", loadHandler);
        img.src = image.src;
    }

    /**
     * Find an element by id or class recursively.
     * @param {HTMLCollection} childElements
     * @param {{id: string; className: string}} args
     * @returns {HTMLElement | HTMLElement[]}
     */
    function findInChildren(childElements, args) {
        /** @type {HTMLElement} */
        var child;
        /** @type {HTMLElement[]} */
        var children = [];
        /** @type {HTMLElement[]} */
        var childrenByClass;
        /** @type {number} */
        var i;

        for (i = 0; i < childElements.length; i++) {
            children.push(childElements.item(i));
        }

        while (0 < children.length) {
            child = children.shift();

            if (args.id) {
                if (child.id === args.id) {
                    return child;
                }
            } else if (args.className) {
                if (child.classList.contains(args.className)) {
                    childrenByClass = childrenByClass || [];
                    childrenByClass.push(child);
                }
            }

            if (0 < child.childElementCount) {
                for (i = 0; i < child.childElementCount; i++) {
                    children.push(child.children[i]);
                }
            }
        }

        if (args.className && childrenByClass) {
            return childrenByClass;
        }
    }

    /**
     * Set the inner text of one or more elements.
     * @param {HTMLElement} parent 
     * @param {string} className 
     * @param {string | string[]} text If a string the first element with the
     * className will be set. If an array all the elements matching the
     * className will be set.
     */
    function setInnerText(parent, className, text) {
        /** @type {number} */
        var i;
        var children = parent.getElementsByClassName(className);

        if (!children || children.length < 1) {
            return;
        }

        if (!Array.isArray(text)) {
            children[0].innerText = text;
        } else {
            for (i = 0; i < children.length && i < text.length; i++) {
                children[i].innerText = text[i];
            }
        }
    }


    ///////////////////////////////////////////////////////////////////////////
    // Start
    ///////////////////////////////////////////////////////////////////////////
    window.addEventListener("load", function () {
        addEventListener(eventImageCellClicked, function(evt) {
            heroImage.show(evt.image);
        });

        collection.updatePage();
    });


    // The image collection.
    imageItems = [
        {
            date: "July 2018",
            description: [
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            size: [1920, 1431],
            src: "drawings/two-dogs/RLM27577.jpg",
            tags: ["commission", "drawing", "dog", "pets"],
            title: "Zoey"
        },
        {
            date: "July 2018",
            description: [
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            size: [1431, 1920],
            src: "drawings/two-dogs/RLM27571.jpg",
            tags: ["commission", "drawing", "dog", "pets"],
            title: "Keuka summers"
        },
        {
            date: "April 2018",
            description: [
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            size: [1469, 1920],
            src: "drawings/three-dogs/samantha.jpg",
            tags: ["commission", "drawing", "dog", "pets"],
            title: "Samantha"
        },
        {
            date: "March 2018",
            description: [
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            size: [1920, 1441],
            src: "drawings/three-dogs/prince.jpg",
            tags: ["commission", "drawing", "dog", "pets"],
            title: "Prince"
        },
        {
            date: "March 2018",
            description: [
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            size: [1920, 1449],
            src: "drawings/three-dogs/jester.jpg",
            tags: ["commission", "drawing", "dog", "pets"],
            title: "Jester"
        },
        {
            date: "February 20, 2018",
            description: [
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            size: [1476, 1920],
            src: "drawings/brandy/brandy.jpg",
            tags: ["commission", "drawing", "dog", "pets"],
            title: "Brandy"
        },
        {
            date: "February 9, 2018",
            description: [
                "All done with “Bella”. Although a low paying commission it’s bound to make my daughter happy. She’s great around the vacuum cleaner because she can’t hear it and has never broken the skin with a bite, our little toothless Bella.",
                "14\"&nbsp;x&nbsp;17\" graphite and colored pencil on Bristol"
            ],
            size: [780, 1022],
            src: "drawings/bella/bella.jpg",
            tags: ["cat", "color", "drawing", "pets"],
            title: "Bella"
        },
        {
            date: "February 2, 2018",
            description: [
                "Say hello to Kitty! This piece was commissioned by my friend John Cronin and was finished today, thanks John! The picture was so good I didn’t need to guess about any detail. A strange and unusual bit of trivia is that this whole thing only used 1/4 of a pencil!",
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            size: [780, 1012],
            src: "drawings/kitty/kitty.jpg",
            tags: ["commission", "dog", "drawing", "pets"],
            title: "Kitty"
        },
        {
            date: "January 27, 2018",
            description: [
                "Just finished yesterday it’s \"Moose\"! I’m so glad I reconnected with my old coworker who commissioned this fuzzy Akita piece! Thanks Susan!",
                "14\"&nbsp;x&nbsp;17\" graphite and colored pencil on Bristol"
            ],
            size: [780, 606],
            src: "drawings/moose/moose.jpg",
            tags: ["color", "commission", "dog", "drawing", "pets"],
            title: "Moose"
        },
        {
            date: "January 22, 2018",
            description: [
                "Just finished! Jr and Angus doing what they do best; snuggly cuteness!",
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            size: [780, 606],
            src: "drawings/junior-angus/junior-angus.jpg",
            tags: ["cat", "drawing", "pets"],
            title: "Junior and Angus"
        },
        {
            date: "January 11, 2018",
            description: [
                "One more for my Maine beach series. I’m not sure of the title yet, possibly \"geologist’s dream\" or \"low tide.\" Time to see if my eyes can still focus on anything farther than a foot away!",
                "14\"&nbsp;x&nbsp;17\" graphite and colored pencil on Bristol"
            ],
            size: [780, 591],
            src: "drawings/beach-seaweed/beach-seaweed.jpg",
            tags: ["color", "drawing", "Maine", "nature"],
            title: "Geologist's Dream"
        },
        {
            date: "December 12, 2017",
            description: [
                "My brother took the original picture; I couldn’t help but steal and use it. Thanks Rich!",
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            size: [780, 1039],
            src: "drawings/frozen-leaf/frozen-leaf.jpg",
            tags: ["drawing", "nature"],
            title: "Crispy"
        },
        {
            date: "December 8, 2017",
            description: [
                "The whole piece. One long week of eye torture.",
                "14\"&nbsp;x&nbsp;17\" graphite and colored pencil on Bristol"
            ],
            size: [780, 605],
            src: "drawings/beach-red-leaf/beach-red-leaf.jpg",
            tags: ["color", "drawing", "Maine", "nature"],
            title: "Red Leaf Beach"
        },
        {
            date: "December 20, 2017",
            description: [
                "I have two numb fingertips but it’s finally finished. It’s Junior, our sleepiest kitty.",
                "14\"&nbsp;x&nbsp;17\" graphite and colored pencil on Bristol"
            ],
            size: [780, 1017],
            src: "drawings/junior-couch/junior-couch.jpg",
            tags: ["cat", "color", "drawing", "pets"],
            title: "Junior"
        },
        {
            date: "December 9, 2017",
            description: [
                "I finished this a few weeks ago for a good friend. We were both tortured by an incredibly bad shipping issue which was eventually solved. Anyway she got it today so here it is! It’s Jack! A French bulldog who has the sweetest owner ever!!!",
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            size: [960, 744],
            src: "drawings/dog/drawing.jpg",
            tags: ["commission", "dog", "drawing", "pets"],
            title: "Jack"
        }
    ];

})();
