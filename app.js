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
     * @property {string} src
     * @property {string[]} tags
     */

    /**
     * Information about an image to be displayed.
     * @typedef ImgData
     * @property {number} aspectRatio
     * @property {number} height
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

    var _constButtonStyleDisplay = "block";
    /** The image collection filtered. @type {ImageItem[]} */
    var _filteredImages = _images;

    /** 
     * Object with data and functions for displaying thumbail images.
     */
    var thumbnails = {

        /** @type {((type: string, data?: any) => void)[]} */
        _callbacks: [],
        // _constArNineSixteen: 9 / 16, // 0.5625 P
        _constArSixteenNine: 16 / 9, // 1.7778 L
        _constArThreeTwo: 3 / 2, // 1.5 L
        // _constArTwoThree: 2 / 3, // 0.6667 P
        _constEventImageCellClicked: "image-cell-clicked",
        _constEventImageRowAdded: "image-row-added",
        _constImageSeparationWidth: 0,
        _constMaxBlocksPerRow: 6,
        _constMaxRowsPerPage: 1,
        _constRowMaxWidth: 800,
        _currentPageRowCount: 0,
        /** @type {"next" | "previous"} */
        _direction: "next",
        _imagesDisplayedCount: 0,
        _nextPageStartIndex: 0,



        /**
         * Add a callback to be informed of changes. Warning: I have no need to
         * release these callbacks so they will remain in memory until the page
         * is reloaded.
         * @param {(type: string, data?: any) => void} callback
         */
        addCallback: function (callback) {
            this._callbacks.push(callback);
        },

        /**
         * Add a row of images to the DOM.
         * @param {{image: ImageData, img: HTMLImageElement}[]} row
         * @param {number} startPageImageIndex The page-relative index of the first image in the row.
         */
        addImageRowToDom: function (row, startPageImageIndex) {
            if (this._constMaxRowsPerPage <= this._currentPageRowCount) {
                return;
            }

            // First scale all of the image heights to the height of the first image.
            var sizes = [{ height: row[0].image.imgData.height, width: row[0].image.imgData.width }];

            var a = row[0].image.imgData;
            var b;
            for (var i = 1; i < row.length; i++) {
                b = row[i].image.imgData;
                sizes.push({ height: a.height, width: (a.height * b.width) / b.height });
            }

            // Find the total width of all the scaled images.
            var nominalWidth = sizes.reduce(function (acc, x) {
                return acc + x.width;
            }, 0);

            // Find the height that will allow all the images to fit the maximum
            // width.
            var totalWidth = nominalWidth - ((row.length - 1) * this._constImageSeparationWidth);
            var newHeight = (a.height * this._constRowMaxWidth) / totalWidth;

            var image;
            for (var j = 0; j < row.length; j++) {
                // Update each image's dimensions to fit in the brick wall layout.
                image = row[j].image;
                image.imgData.width = (image.imgData.width * newHeight) / image.imgData.height;
                image.imgData.height = newHeight;

                this.imageAddToCell(image, row[j].img, startPageImageIndex);
                startPageImageIndex++;
            }

            this._currentPageRowCount++;
            this._imagesDisplayedCount += row.length;
            this._nextPageStartIndex = this._direction === "next" ? this._nextPageStartIndex + row.length : this._nextPageStartIndex - row.length;
            this.invokeCallbacks(this._constEventImageRowAdded);
            console.log(`direction: ${this._direction}, _imagesDisplayedCount: ${this._imagesDisplayedCount}, _nextPageStartIndex: ${this._nextPageStartIndex}`);
        },

        /**
         * Create the image collection and add it to the DOM.
         * @param {HTMLElement} parent 
         * @param {number} [startIndex=0] 
         */
        buildImageCollection: function (parent, startIndex) {
            /** @type {ImageItem[]} */
            var imageCollection = [];

            var pageImageIndex = startIndex || 0;

            // Get the images that might be placed on this page.
            var sliceStart;
            var sliceEnd;
            if (this._direction === "next") {
                sliceStart = pageImageIndex;
                sliceEnd = sliceStart + (this._constMaxBlocksPerRow * this._constMaxRowsPerPage);
                sliceEnd = sliceEnd < _filteredImages.length ? sliceEnd : _filteredImages.length;
            } else {
                sliceEnd = pageImageIndex - this._imagesDisplayedCount;
                sliceStart = sliceEnd - (this._constMaxBlocksPerRow * this._constMaxRowsPerPage);
                sliceStart = 0 <= sliceStart ? sliceStart : 0;
            }

            console.log(`direction: ${this._direction}, startIndex: ${startIndex}, sliceStart: ${sliceStart}, sliceEnd: ${sliceEnd}`);

            imageCollection = _filteredImages.slice(sliceStart, sliceEnd);
            this.createPageImageCollectionElements(parent, imageCollection);
        },

        /**
         * Calculates how many blocks each image will occupy in a row.
         * @param {number} aspectRatio The width of the image divided by the height of the image.
         * @returns {number} The number of blocks.
         */
        calculateBlocks: function (aspectRatio) {
            var blocks = 1; // Fills the entire row.
            if (this._constArSixteenNine < aspectRatio) {
                blocks = 6;
            } else if (this._constArThreeTwo < aspectRatio) {
                blocks = 3;
            } else if (1 < aspectRatio) {
                blocks = 2.5;
            }

            return blocks;
        },

        clearPageImageCells: function () {
            var imageCells = document.getElementsByClassName("image-cell");
            for (var i = 0; i < imageCells.length; i++) {
                this.imageRemoveFromCell(i, true);
            }
        },

        /**
         * Create the image cell elements.
         * @param {ImageItem} image 
         * @param {number} id 
         * @param {HTMLElement} [parent]
         * @returns {HTMLDivElement} 
         */
        createImageCell: function (image, id, parent) {
            var container = document.getElementById("cell-" + id);
            if (container == null) {
                container = createElement("div", { className: "image-cell-container", id: "cell-" + id }, parent);
                var imageCell = createElement("div", { className: "image-cell" }, container);

                // Don't create the img element here. That will be added later as needed.

                var overlay = createElement("div", { className: "image-cell-info-overlay" }, imageCell);
                var cellInfoContainer = createElement("div", { className: "image-cell-info-container" }, overlay);
                createElement("h1", { className: "image-cell-info" }, cellInfoContainer);

                var content = createElement("div", { className: "content" }, container);
                createElement("p", { className: "content-date" }, content);
                for (var i = 0; i < image.description.length; i++) {
                    createElement("p", { className: "content-description" }, content);
                }
            }

            return container;
        },

        /**
         * Create the layout for images on the page.
         * @param {HTMLElement} parent
         * @param {ImageItem[]} images The images to display on this page.
         */
        createPageImageCollectionElements: function (parent, images) {
            // Create the image cells.
            var image;
            var imageCell;
            for (var i = 0; i < images.length; i++) {
                image = images[i];
                imageCell = this.createImageCell(image, i, parent);
                this.updateImageCellContents(image, imageCell);
            }

            // The loadImages length must be set before the createImageElement
            // callback is invoked. loadedImages is a sparse array.
            var loadedImages = [];
            loadedImages.length = images.length;

            // Load the images.
            var processIndex = 0;
            for (var j = 0; j < images.length; j++) {
                images[j].imgData = images[j].imgData || {};
                images[j].imgData.pageIndex = j;

                // Call another function to create the proper scope for working with
                // a single image object.
                createImageElement(images[j], j, function (image, img) {
                    image.imgData.numberOfBlocks = thumbnails.calculateBlocks(img.naturalWidth / img.naturalHeight)
                    loadedImages[image.imgData.pageIndex] = { image: image, img: img };
                    processIndex = thumbnails.processRow(loadedImages, processIndex);
                });
            }
        },

        /**
         * Add the image to the container.
         * @param {ImageItem} image 
         * @param {HTMLImageElement} img 
         * @param {number} id 
         */
        imageAddToCell: function (image, img, id) {
            img.style.height = Math.round(image.imgData.height) + "px";
            img.style.width = Math.round(image.imgData.width) + "px";

            var ic = this.getImageCellElements(id);

            if (!ic.img) {
                if (!ic.overlay) {
                    ic.cell.appendChild(img);
                } else {
                    ic.overlay.insertAdjacentElement("beforebegin", img);
                }

                // Cell info covers the entire image, any click events must be
                // passed from it to the img element.
                var self = this;
                ic.overlay.addEventListener("click", function () {
                    self.invokeCallbacks(self._constEventImageCellClicked, image);
                });
            }
        },

        /**
         * Remove the img element from the image cell.
         * @param {number} id 
         * @param {boolean} [removeSrc=false] 
         * @returns 
         */
        imageRemoveFromCell: function (id, removeSrc) {
            var ic = this.getImageCellElements(id);
            if (!ic.img) {
                return;
            }

            var remove = removeSrc ? true : false;

            if (remove) {
                ic.img.src = "";
            }

            ic.cell.removeChild(ic.img);
        },

        /**
         * Invoke the callbacks.
         * @param {string} type
         * @param {any} [data]
         */
        invokeCallbacks: function (type, data) {
            for (var i = 0; i < this._callbacks.length; i++) {
                this._callbacks[i](type, data);
            }
        },

        isImageCollectionBeginning: function () {
            if (!this._nextPageStartIndex) {
                return true;
            }

            if (this._nextPageStartIndex - this._imagesDisplayedCount < 1) {
                return true;
            }

            return false;
        },

        isImageCollectionEnd: function () {
            if (_images.length <= this._nextPageStartIndex) {
                return true;
            }

            if (_images.length < this._nextPageStartIndex + this._imagesDisplayedCount) {
                return true;
            }

            return false;
        },

        /**
         * 
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

        pageNext: function () {
            if (this.isImageCollectionEnd()) {
                return false;
            }

            this._direction = "next";
            this.resetPage();
            this.buildImageCollection(document.getElementById("image-collection"), this._nextPageStartIndex);

            return true;
        },

        pagePrevious: function () {
            if (this.isImageCollectionBeginning()) {
                return false;
            }

            this._direction = "previous";
            this.resetPage();
            this.buildImageCollection(document.getElementById("image-collection"), this._nextPageStartIndex);

            return true;
        },

        /**
         * Determines when a row can be created.
         * @param {{image: ImageData, img: HTMLImageElement}[]} images 
         * @param {number} startIndex Start adding images to rows using the item at this index.
         * @returns {number} Start processing rows next time from this index. 
         */
        processRow: function (images, startIndex) {
            var nextIndex = startIndex;
            var rowBlocks = 0;
            var row = [];
            for (var i = startIndex; i <= images.length; i++) {
                // All the images in the array have been dealt with. If there is a
                // partial row remaining go ahead and add it to the DOM then return.
                if (images.length <= i) {
                    if (0 < row.length) {
                        this.addImageRowToDom(row, nextIndex);
                        return;
                    }
                }

                // images is a sparse array, there might be empty elements, if so
                // the row is not ready to be processed.
                if (!images[i]) {
                    break;
                }

                if (this._constMaxBlocksPerRow < rowBlocks + images[i].image.imgData.numberOfBlocks) {
                    this.addImageRowToDom(row, nextIndex);
                    nextIndex += row.length;
                    row = [];
                    rowBlocks = 0;
                }

                row.push(images[i]);
                rowBlocks += images[i].image.imgData.numberOfBlocks;
            }

            return nextIndex;
        },

        resetPage: function () {
            this.clearPageImageCells();
            this._currentPageRowCount = 0;
            this._imagesDisplayedCount = 0;
        },

        /**
         * Update the information displayed in an image cell.
         * @param {ImageItem} image 
         * @param {HTMLDivElement} container
         */
        updateImageCellContents: function (image, container) {
            setInnerText(container, "image-cell-info", image.src.split("/").pop());

            var children = container.getElementsByClassName("content");
            if (children && 0 < children.length) {
                var content = children[0];
                setInnerText(content, "content-date", image.date);
                setInnerText(content, "content-description", image.description);
            }
        }

    };


    /**
     * Object with data and functions for displaying a large "hero" image.
     */
    var heroImage = {

        _constImageCellId: "hero-image-cell",
        _constImageCellImgContainerId: "hero-image-cell-image-container",
        _constImageCellImgId: "img-hero",
        _constImageCellInformationClass: "hero-image-cell-information",
        _constImageCellInformationContainerClass: "hero-image-cell-information-container",


        /**
         * @returns {HTMLImageElement}
         */
        findImg: function () {
            var imageCell = this.getImageCell();
            return this.findInChildren(imageCell.children, { id: this._constImageCellId });
        },

        /**
         * Find an element by id recursively.
         * @param {HTMLCollection} childElements
         * @param {{id: string; className: string}} args
         * @returns {HTMLElement | HTMLElement[]}
         */
        findInChildren: function (childElements, args) {
            /** @type {HTMLElement[]} */
            var children = [];
            /** @type {HTMLElement} */
            var child;

            for (var c = 0; c < childElements.length; c++) {
                children.push(childElements.item(c));
            }

            /** @type {HTMLElement[]} */
            var childrenByClass;
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
                    for (var i = 0; i < child.childElementCount; i++) {
                        children.push(child.children[i]);
                    }
                }
            }

            if (args.className && childrenByClass) {
                return childrenByClass;
            }
        },

        getImageCell: function () {
            var collectionParent = document.getElementsByClassName("image-collection-wrapper")[0].parentElement;

            var imageCell = this.findInChildren(collectionParent.children, { id: this._constImageCellId });
            if (!imageCell) {
                imageCell = createElement("div", { id: this._constImageCellId }, collectionParent);
                imageCell.addEventListener("click", function() {
                    imageCell.style.display = "none";
                });

                createElement("div", { id: this._constImageCellImgContainerId }, imageCell);
            }

            return imageCell;
        },

        /**
         * Show the hero image.
         * @param {ImageItem} image
         */
        show: function (image) {
            var collectionParent = document.getElementsByClassName("image-collection-wrapper")[0].parentElement;

            var self = this;
            var updateImageCell = function (imageItem, imageCellDiv) {
                imageCellDiv.style.display = null;
                imageCellDiv.style.height = collectionParent.offsetHeight + "px";
                self.updateInformation(imageItem, imageCellDiv);
            };

            /** @type {HTMLDivElement} */
            var imageCell = this.getImageCell();
            var img = this.findImg();
            if (!img) {
                createImageElement(image, "hero", function (cbImage, cbImg) {
                    var container = self.findInChildren(imageCell.children, { id: self._constImageCellImgContainerId });
                    container.appendChild(cbImg);
                    updateImageCell(cbImage, imageCell);
                });
            } else {
                img.src = image.src;
                updateImageCell(image, imageCell);
            }

        },

        /**
         * Update the text information that's displayed.
         * @param {ImageItem} image
         * @param {HTMLDivElement} imageCell
         */
        updateInformation: function (image, imageCell) {
            if (!imageCell) {
                return;
            }

            var children = this.findInChildren(imageCell.children, { className: this._constImageCellInformationContainerClass });
            var infoContainer;
            if (children) {
                infoContainer = children[0];
            } else {
                infoContainer = createElement("div", { className: this._constImageCellInformationContainerClass }, imageCell);
            }

            children = this.findInChildren(infoContainer.children, { className: this._constImageCellInformationClass });
            var info;
            if (children) {
                info = children[0];
            } else {
                info = createElement("section", { className: this._constImageCellInformationClass }, infoContainer);
            }

            var date = this.findInChildren(info.children, { id: this._constImageCellInformationClass + "-date" });
            if (!date) {
                date = createElement("span", { id: this._constImageCellInformationClass + "-date" }, info);
            }

            date.innerText = "Date: " + image.date;
        }

    };


    function connectButtons() {
        var e = document.getElementById("page-prev");
        e.addEventListener("click", function (evt) {
            thumbnails.pagePrevious();
        });

        e = document.getElementById("page-next");
        e.addEventListener("click", function (evt) {
            thumbnails.pageNext();
        });
    }

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
     * @param {(image: ImageItem, img: HTMLImageElement) => void} callback
     */
    function createImageElement(image, id, callback) {
        /** @type {HTMLImageElement} */
        var img;
        /** @type {(evt: Event) => void} */
        var loadHandler;

        // Don't use getImageCellElements here because the img element may exist
        // but not be connected to a parent element in the DOM (for example when
        // loading).
        var strId = "img-" + id;
        img = document.getElementById(strId);
        if (!img) {
            img = createElement("img", { id: strId });
            // img.addEventListener("click", function () { console.log("clicked"); });
        }

        loadHandler = function () {
            // FYI: 'this' refers to the HTMLImageElement.
            // console.log("Image loaded: " + this.src.split("/").pop());

            this.removeEventListener("load", loadHandler);

            var imgData = {
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

        img.addEventListener("load", loadHandler);
        img.src = image.src;
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
        var children = parent.getElementsByClassName(className);
        if (!children || children.length < 1) {
            return;
        }

        if (!Array.isArray(text)) {
            children[0].innerText = text;
        } else {
            for (var i = 0; i < children.length && i < text.length; i++) {
                children[i].innerText = text[i];
            }
        }
    }

    // Get started.
    window.addEventListener("load", function () {
        connectButtons();
        _filteredImages = _images;

        thumbnails.addCallback(function (type, data) {
            if (type === thumbnails._constEventImageRowAdded) {
                var nextButton = document.getElementById("page-next");
                var prevButton = document.getElementById("page-prev");
                if (thumbnails.isImageCollectionBeginning()) {
                    prevButton.style.display = "none";
                } else if (thumbnails.isImageCollectionEnd()) {
                    nextButton.style.display = "none";
                } else {
                    nextButton.style.display = _constButtonStyleDisplay;
                    prevButton.style.display = _constButtonStyleDisplay;
                }
            } else if (type == thumbnails._constEventImageCellClicked) {
                /** @type {ImageItem} */
                var image = data;
                heroImage.show(image);
            }
        });

        var parent = document.getElementById("image-collection");
        thumbnails.buildImageCollection(parent);
    });

    /** The image collection. @type {ImageItem[]} */
    var _images = [
        {
            date: "February 9, 2018",
            description: [
                "All done with “Bella”. Although a low paying commission it’s bound to make my daughter happy. She’s great around the vacuum cleaner because she can’t hear it and has never broken the skin with a bite, our little toothless Bella.",
                "14\"&nbsp;x&nbsp;17\" graphite and colored pencil on Bristol"
            ],
            src: "drawings/bella/bella.jpg",
            tags: ["cat", "color", "drawing"]
        },

        {
            date: "February 2, 2018",
            description: [
                "Say hello to Kitty! This piece was commissioned by my friend John Cronin and was finished today, thanks John! The picture was so good I didn’t need to guess about any detail. A strange and unusual bit of trivia is that this whole thing only used 1/4 of a pencil!",
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            src: "drawings/kitty/kitty.jpg",
            tags: ["commission", "dog", "drawing"]
        },

        {
            date: "January 27, 2018",
            description: [
                "Just finished yesterday it’s \"Moose\"! I’m so glad I reconnected with my old coworker who commissioned this fuzzy Akita piece! Thanks Susan!",
                "14\"&nbsp;x&nbsp;17\" graphite and colored pencil on Bristol"
            ],
            src: "drawings/moose/moose.jpg",
            tags: ["color", "commission", "dog", "drawing"]
        },
        {
            date: "January 22, 2018",
            description: [
                "Just finished! Jr and Angus doing what they do best; snuggly cuteness!",
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            src: "drawings/junior-angus/junior-angus.jpg",
            tags: ["cat", "drawing"]
        },
        {
            date: "January 11, 2018",
            description: [
                "One more for my Maine beach series. I’m not sure of the title yet, possibly \"geologist’s dream\" or \"low tide.\" Time to see if my eyes can still focus on anything farther than a foot away!",
                "14\"&nbsp;x&nbsp;17\" graphite and colored pencil on Bristol"
            ],
            src: "drawings/beach-seaweed/beach-seaweed.jpg",
            tags: ["color", "drawing", "maine", "nature"]
        },
        {
            date: "December 12, 2017",
            description: [
                "My brother took the original picture; I couldn’t help but steal and use it. Thanks Rich!",
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            src: "drawings/frozen-leaf/frozen-leaf.jpg",
            tags: ["drawing", "nature"]
        },
        {
            date: "December 8, 2017",
            description: [
                "The whole piece. One long week of eye torture.",
                "14\"&nbsp;x&nbsp;17\" graphite and colored pencil on Bristol"
            ],
            src: "drawings/beach-red-leaf/beach-red-leaf.jpg",
            tags: ["color", "drawing", "maine", "nature"]
        },
        {
            date: "December 20, 2017",
            description: [
                "I have two numb fingertips but it’s finally finished. It’s Junior, our sleepiest kitty.",
                "14\"&nbsp;x&nbsp;17\" graphite and colored pencil on Bristol"
            ],
            src: "drawings/junior-couch/junior-couch.jpg",
            tags: ["cat", "color", "drawing"]
        },
        {
            date: "December 9, 2017",
            description: [
                "I finished this a few weeks ago for a good friend. We were both tortured by an incredibly bad shipping issue which was eventually solved. Anyway she got it today so here it is! It’s Jack! A French bulldog who has the sweetest owner ever!!!",
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            src: "drawings/dog/drawing.jpg",
            tags: ["commission", "dog", "drawing"]
        }
    ];

})();
