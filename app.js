"use strict";

(function () {

    /**
     * Information about an image to be displayed.
     * @typedef ImageItem
     * @property {string} date
     * @property {string[]} description
     * @property {string} src
     * @property {string[]} tags
     */

    /**
     * The image collection.
     * @type {ImageItem[]}
     */
    var _images;

    /**
     * Build the paragraph content of an image's content div.
     * @param {string[]} description 
     * @param {string} date 
     * @param {HTMLElement} parent 
     */
    function buildContent(description, date, parent) {
        var para;
        for (var i = 0; i < description.length; i++) {
            para = document.createElement("p");
            para.innerHTML = description[i];

            parent.appendChild(para);
        }

        para = document.createElement("p");
        para.innerText = date;

        parent.appendChild(para);
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
            description.className = "description";
            description.id = image.src;

            container = document.createElement("div");
            container.style.display = "none"; // TODO: replace with some sort of class?
            container.className = "description drawing-container";
            container.appendChild(description);

            content = document.createElement("div");
            content.className = "content";
            buildContent(image.description, image.date, content);
            container.appendChild(content);

            parent.appendChild(container);
        }

        // Load the images.
        for (var j = 0; j < images.length; j++) {
            // Call another function to create the proper scope for working with
            // a single image object.
            createImageElement(images[j], function (image, img) {
                // So for now we're just adding the images as they're loaded. I
                // expect this will change once I start building the "brick
                // wall" display and some sort of queueing will happen until a
                // complete "row" has accumulated.
                createImageElementCallback(image, img);
            });
        }
    }

    /**
     * Add the image to the container.
     * @param {ImageItem} image 
     * @param {HTMLImageElement} img 
     */
    function createImageElementCallback(image, img) {
        // console.log(image.src.split("/").pop() + " width: " + img.naturalWidth + ", height: " + img.naturalHeight);
        var container = document.getElementById(image.src);
        container.appendChild(img);
        container.parentElement.style.display = "initial"; // TODO: replace with some sort of class?
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
            this.removeEventListener("load", loadHandler);
            callback(image, this);
        };

        img.addEventListener("load", loadHandler);
        img.style.width = "100%";
        img.src = image.src;
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
            date: "January 27, 2018",
            description: [
                "Just finished yesterday it’s \"Moose\"! I’m so glad I reconnected with my old coworker who commissioned this fuzzy Akita piece! Thanks Susan!",
                "14\"&nbsp;x&nbsp;17\" graphite and colored pencil on Bristol"
            ],
            src: "drawings/moose/moose.jpg",
            tags: ["commission", "dog", "drawing"]
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
            tags: ["drawing", "maine", "nature"]
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
            tags: ["drawing", "maine", "nature"]
        },
        {
            date: "December 20, 2017",
            description: [
                "I have two numb fingertips but it’s finally finished. It’s Junior, our sleepiest kitty.",
                "14\"&nbsp;x&nbsp;17\" graphite on Bristol"
            ],
            src: "drawings/junior-couch/junior-couch.jpg",
            tags: ["cat", "drawing"]
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
