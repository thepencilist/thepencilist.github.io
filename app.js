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
     * @property {number} numberOfCells
     * @property {number} width
     */

    // var _arNineSixteen = 9 / 16; // 0.5625 P
    var _arSixteenNine = 16 / 9; // 1.7778 L
    var _arThreeTwo = 3 / 2; // 1.5 L
    // var _arTwoThree = 2 / 3; // 0.6667 P
    var _imageSeparationWidth = 0;
    var _maxCellsPerRow = 6;
    var _rowMaxWidth = 800;

    /**
     * The image collection.
     * @type {ImageItem[]}
     */
    var _images;

    /**
     * Add a row of images to the DOM.
     * @param {{image: ImageData, img: HTMLImageElement}[]} row 
     */
    function addImageRowToDom(row) {
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
        var totalWidth = nominalWidth - ((row.length - 1) * _imageSeparationWidth);
        var newHeight = (a.height * _rowMaxWidth) / totalWidth;

        var image;
        for (var j = 0; j < row.length; j++) {
            // Update each image's dimensions to fit in the brick wall layout.
            image = row[j].image;
            image.imgData.width = (image.imgData.width * newHeight) / image.imgData.height;
            image.imgData.height = newHeight;

            addImageToDom(image, row[j].img);
        }
    }

    /**
     * Add the image to the container.
     * @param {ImageItem} image 
     * @param {HTMLImageElement} img 
     */
    function addImageToDom(image, img) {
        // console.log(image.src.split("/").pop() + " width: " + img.naturalWidth + ", height: " + img.naturalHeight);
        // console.log(image.src.split("/").pop() + " ar: " + image.imgData.aspectRatio + ", cells: " + image.imgData.numberOfCells);
        // console.log(image.src.split("/").pop() + " width: " + image.imgData.width + ", height: " + image.imgData.height);

        img.style.height = Math.round(image.imgData.height) + "px";
        img.style.width = Math.round(image.imgData.width) + "px";

        var container = document.getElementById(image.src);
        container.appendChild(img);
        container.parentElement.style.display = "inline-block"; // TODO: replace with some sort of class?
    }

    /**
     * Build the paragraph content of an image's content div.
     * @param {string[]} description 
     * @param {string} date 
     * @param {HTMLElement} parent 
     */
    function buildContent(description, date, parent) {
        var para = document.createElement("p");
        para.innerText = date;
        parent.appendChild(para);

        for (var i = 0; i < description.length; i++) {
            para = document.createElement("p");
            para.innerHTML = description[i];

            parent.appendChild(para);
        }
    }

    /**
     * Create the image collection and add it to the DOM.
     * @param {HTMLElement} parent 
     */
    function buildImageCollection(parent) {
        /** @type {ImageItem[]} */
        var imageCollection = _images;

        // This is where the imageCollection could be created with paging before
        // it's passed to createImageCollectionElements.

        createPageImageCollectionElements(parent, imageCollection);
    }

    /**
     * Calculates how many rows each image will occupy in a row.
     * @param {number} aspectRatio The width of the image divided by the height of the image.
     * @returns {number} The number of cells.
     */
    function calculateCells(aspectRatio) {
        // var _arNineSixteen = 9 / 16; // 0.5625 P
        // var _arTwoThree = 2 / 3; // 0.6667 P
        // var _arThreeTwo = 3 / 2; // 1.5 L
        // var _arSixteenNine = 16 / 9; // 1.7778 L
        var cells = 1; // Fills the entire row.
        if (_arSixteenNine < aspectRatio) {
            cells = 6;
        } else if (_arThreeTwo < aspectRatio) {
            cells = 3;
        } else if (1 < aspectRatio) {
            cells = 2.5;
        }

        return cells;
    }

    /**
     * Create the layout for images on the page.
     * @param {HTMLElement} parent
     * @param {ImageItem[]} images The images to display on this page.
     */
    function createPageImageCollectionElements(parent, images) {
        // Create the container elements.
        for (var i = 0; i < images.length; i++) {
            var image = images[i];
            var container;
            var content;
            var description;

            description = document.createElement("div");
            description.id = image.src;

            container = document.createElement("div");
            container.style.display = "none"; // TODO: replace with some sort of class?
            container.className = "drawing-container";
            container.appendChild(description);

            content = document.createElement("div");
            content.className = "content";
            buildContent(image.description, image.date, content);
            container.appendChild(content);

            parent.appendChild(container);
        }

        // The loadImages length must be set before the createImageElement
        // callback is invoked. loadedImages is a sparse array.
        var loadedImages = [];
        loadedImages.length = images.length;

        var processIndex = 0;

        // Load the images.
        for (var j = 0; j < images.length; j++) {
            images[j].imgData = images[j].imgData || {};
            images[j].imgData.pageIndex = j;

            // Call another function to create the proper scope for working with
            // a single image object.
            createImageElement(images[j], function (image, img) {
                loadedImages[image.imgData.pageIndex] = { image: image, img: img };
                processIndex = processRow(loadedImages, processIndex);
            });
        }
    }

    /**
     * Create the layout for a single image on the page.
     * @param {ImageItem} image
     * @param {(image: ImageItem, img: HTMLImageElement) => void} callback
     */
    function createImageElement(image, callback) {
        /** @type {HTMLImageElement} */
        var img;
        /** @type {(evt: Event) => void} */
        var loadHandler;

        img = document.createElement("img");

        loadHandler = function () {
            // FYI: 'this' refers to the HTMLImageElement.
            // console.log("Image loaded: " + this.src.split("/").pop());

            this.removeEventListener("load", loadHandler);

            var imgData = {
                aspectRatio: this.naturalWidth / this.naturalHeight,
                height: this.naturalHeight,
                numberOfCells: calculateCells(this.naturalWidth / this.naturalHeight),
                pageIndex: image.imgData.pageIndex,
                width: this.naturalWidth
            };

            image.imgData = imgData;

            callback(image, this);
        };

        img.addEventListener("load", loadHandler);
        img.style.width = "100%";
        img.src = image.src;
    }

    /**
     * Handle determining when a row can be created.
     * @param {{image: ImageData, img: HTMLImageElement}[]} images 
     * @param {number} startIndex Start adding images to rows using the item at this index.
     * @returns {number} Start processing rows next time from this index. 
     */
    function processRow(images, startIndex) {
        var nextIndex = startIndex;
        var rowCells = 0;
        var row = [];
        for (var i = startIndex; i <= images.length; i++) {
            // All the images in the array have been dealt with. If there is a
            // partial row remaining go ahead and add ti to the DOM then return.
            if (images.length <= i) {
                if (0 < row.length) {
                    addImageRowToDom(row);
                    return;
                }
            }

            // images is a sparse array, there might be empty elements, if so
            // the row is not ready to be processed.
            if (!images[i]) {
                break;
            }

            if (_maxCellsPerRow < rowCells + images[i].image.imgData.numberOfCells) {
                addImageRowToDom(row);
                nextIndex += row.length;
                row = [];
                rowCells = 0;
            }

            row.push(images[i]);
            rowCells += images[i].image.imgData.numberOfCells;
        }

        return nextIndex;
    }

    function start() {
        var parent = document.getElementById("image-collection");
        buildImageCollection(parent);
    }

    // Get started.
    window.addEventListener("load", function () {
        start();
    });

    _images = [
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
