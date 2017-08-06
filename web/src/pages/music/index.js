// SETUP

    function hasClass(el, cls, startsWith = false) {
        classes = cls.split(","); // or
        for (var ci = 0; ci < classes.length; ci++) { // classIndex
            if (!startsWith && el.classList.contains(classes[ci])) return true;
            for (var eci = 0; eci < el.classList.length; eci++) { // elementClassIndex
                if (startsWith && el.classList[eci].startsWith(classes[ci])) {
                    return el.classList[eci];
                }
            }
        }
        return false;
    }

// ROW HOVER
document.querySelector(".music-table").addEventListener("mouseover", function(e) {
    var hasCls = hasClass(e.target, "track-", true);
    if (hasCls) {
        var hoveredTrack = document.querySelectorAll(`.music-table .cell.${hasCls}`);
        for (var i = 0; i < hoveredTrack.length; i++) {
            hoveredTrack[i].classList.add("hover");
        }
    }
});
document.querySelector(".music-table").addEventListener("mouseout", function(e) {
    var hasCls = hasClass(e.target, "track-", true);
    if (hasCls) {
        var hoveredTrack = document.querySelectorAll(`.music-table .cell.${hasCls}`);
        for (var i = 0; i < hoveredTrack.length; i++) {
            hoveredTrack[i].classList.remove("hover");
        }
    }
});
