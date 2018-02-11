"use strict";

(function () {

    var _images;

    function buildContent(description, date, parent) {
        var desc;
        var para;
        for (var i = 0; i < description.length; i++) {
            desc = description[i];

            para = document.createElement("p");
            para.innerHTML = desc;

            parent.appendChild(para);
        }

        para = document.createElement("p");
        para.innerText = date;

        parent.appendChild(para);
    }

    function buildImageCollection(parentElement) {
        var image;
        var img;
        var container;
        var content;
        var description;
        for (var i = 0; i < _images.length; i++) {
            image = _images[i];

            img = document.createElement("img");
            img.src = image.src;
            img.style.width = "100%";

            description = document.createElement("div");
            description.className = "description";
            description.appendChild(img);

            container = document.createElement("div");
            container.className = "description drawing-container";
            container.appendChild(description);

            content = document.createElement("div");
            content.className = "content";
            buildContent(image.description, image.date, content);
            container.appendChild(content);

            parentElement.appendChild(container);
        }
    }

    function start() {
        var parentElement = document.getElementById("image-collection");
        buildImageCollection(parentElement);
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

})()
