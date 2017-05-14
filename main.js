
setTimeout(function () {
    var e = document.getElementsByClassName("replace");
    for (var i = 0; i < e.length; i++) {
        var ih = "rich";
        ih += "@";
        ih += "limnous.";
        ih += "com";
        e[i].innerHTML = ih;
    }
}, 200);


window.addEventListener("scroll", function (evt) {
    var targetName = evt.target.scrollingElement.nodeName.toLowerCase();
    if (targetName !== "body" && targetName !== "html") {
        return;
    }

    var target = document.getElementsByTagName(targetName)[0];
    var st = target.scrollTop;
    var m = document.getElementsByClassName("menu-container")[0];
    if (40 <= st) {
        if (!m.classList.contains("hidden")) {
            m.classList.add("hidden");
        }
    } else {
        if (m.classList.contains("hidden")) {
            m.classList.remove("hidden");
        }
    }
});
