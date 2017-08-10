// SETUP

    var pref = {
        "table": {
            "cols": {
                "name": {
                },
                "time": {
                    "width": "auto"
                },
                "artist": {},
                "album": {},
                "date-added": {},
                "plays": {}
            }
        }
    }
    function updatePref(preference, value) {
        eval(`pref.${preference} = ${value}`);
    }
    var colMinWidths = {
        "name": 100,
        "time": 50,
        "artist": 100,
        "album": 100,
        "date-added": 95,
        "plays": 60
    }

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

colResize();
function colResize() {
    function findNextCol(col, reverse) {
        if (reverse) col = col.previousElementSibling;
        else         col = col.nextElementSibling;
        if (col == null) return null;
        if (hasClass(col, "auto-width")) col = findNextCol(col, reverse);
        return col;
    }
    var cols = document.querySelectorAll(".music-table .col-resizer");
    var colResizers = document.querySelectorAll(".music-table .col-resizer");
    var mouseDown, mousePosX, mouseStartPosX, oldWidth, oldWidthNext, flexibleCols, availWidth, nextColClass;
    for (var i = 0; i < cols.length; i++) {
        colResizers[i].addEventListener("mousedown", function(e) {
            e.preventDefault();
            mouseDown = true;
            mousePosX = e.clientX;
            mousePosStartX = mousePosX;
            currentColClass = e.target.classList[1];
            currentCol = document.querySelector(".music-table .col."+currentColClass);
            nextCol = currentCol.nextElementSibling;
            nextCol = findNextCol(currentCol);
            if (nextCol == null) nextCol = findNextCol(currentCol, true);
            nextColClass = nextCol.classList[1];
            oldWidth = currentCol.clientWidth;
            oldWidthNext = nextCol.clientWidth;
            document.querySelector(".fg").style.pointerEvents = "auto";
            document.querySelector(".fg").style.cursor = "col-resize";

            flexibleCols = document.querySelectorAll(".music-table .col.flexible-width");
            availWidth = 0;
            for (var i = 0; i < flexibleCols.length; i++) {
                availWidth += flexibleCols[i].clientWidth;
                flexibleCols[i].style.width = flexibleCols[i].clientWidth+"px";
                flexibleCols[i].style.flexGrow = "";
            }
        });
    }
    document.addEventListener("mousemove", function(e) {
        if (mouseDown) {
            mousePosX = e.clientX;
            var widthDifference = mousePosX - mousePosStartX;
            var newWidth = oldWidth + widthDifference;
            var newWidthNext = oldWidthNext - widthDifference;
            var nextColWidth = Number(currentCol.nextElementSibling.style.width.slice(0, -2));

            // min widths
            if (newWidth < colMinWidths[currentColClass]) {
                var differenceFix = colMinWidths[currentColClass] - newWidth;
                newWidth += differenceFix;
                newWidthNext -= differenceFix;
            }
            if (newWidthNext < colMinWidths[nextColClass]) {
                var differenceFix = colMinWidths[currentColClass] - newWidthNext;
                newWidth -= differenceFix;
                newWidthNext += differenceFix;
            }

            currentCol.style.width = newWidth+"px";
            nextCol.style.width = newWidthNext+"px";
        }
    });
    document.addEventListener("mouseup", function(e) {
        if (mouseDown) {
            mouseDown = false;
            document.querySelector(".fg").style.pointerEvents = "";

            for (var i = 0; i < flexibleCols.length; i++) {
                flexibleCols[i].style.flexGrow = flexibleCols[i].clientWidth / availWidth;
            }
        }
    });
}

columnReorganizing();
function columnReorganizing() {

}
