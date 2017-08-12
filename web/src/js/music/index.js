// SETUP

    var pref = {
        "table": {
            "cols": {
                "name": {
                    "width": 500000
                },
                "time": {
                    "width": "auto"
                },
                "artist": {
                    "width": 250000
                },
                "album": {
                    "width": 250000
                },
                "date-added": {
                    "width": "auto"
                },
                "plays": {
                    "width": "auto"
                }
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
    var colResizers = document.querySelectorAll(".music-table .col-resizer");
    var mouseDown, mousePosX, mouseStartPosX, oldWidth, oldWidthNext, flexibleCols, availWidth, nextColClass;
    for (var i = 0; i < colResizers.length; i++) {
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
                var differenceFix = colMinWidths[nextColClass] - newWidthNext;
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
                var newFlexWidth = flexibleCols[i].clientWidth*1000000;
                flexibleCols[i].style.flexGrow = newFlexWidth / availWidth;
            }
        }
    });
}

columnRearrange();
function columnRearrange() {
    var musicTable = document.querySelector(".music-table");
    var mouseDown, mousePosX, mouseStartPosX, currentCol, nextCol, moveCount;
    musicTable.addEventListener("mousedown", function(e) {
        if (hasClass(e.target, "cell") && e.target.previousElementSibling == null) {
            e.preventDefault();
            mouseDown = true;
            mousePosX = e.clientX;
            mousePosStartX = mousePosX;
            currentCol = e.target.parentElement;
            nextCol = currentCol.nextElementSibling;
            prevCol = currentCol.previousElementSibling;
            currentCol.classList.add("rearranging");
            musicTable.classList.add("rearranging");
            document.querySelector(".fg").style.pointerEvents = "auto";
            document.querySelector(".fg").style.cursor = "move";
        }
    });
    document.addEventListener("mousemove", function(e) {
        if (mouseDown) {
            mousePosX = e.clientX;
            var difference = mousePosX - mousePosStartX;

            var remainding = difference, end = false, moveEnd = false;
            var reverse = remainding < 0 ? true : false;
            moveCount = 0;
            function moveOtherCols(col) {
                var next = col.nextElementSibling;
                if (reverse) next = col.previousElementSibling;
                if (next == null) end = true;
                if (!end) {
                    if (moveEnd) next.style.left = "0px";
                    else {
                        if (!reverse && remainding > next.clientWidth/2) {
                            remainding -= next.clientWidth;
                            next.style.left = -currentCol.clientWidth+"px";
                            moveCount++;
                        } else if (reverse && remainding < -next.clientWidth/2) {
                            remainding += next.clientWidth;
                            next.style.left = currentCol.clientWidth+"px";
                            moveCount--;
                        } else {
                            moveEnd = true;
                            next.style.left = "0px";
                        }
                    }
                    moveOtherCols(next);
                }
            }
            moveOtherCols(currentCol);
            currentCol.style.left = difference - remainding+"px";
        }
    });
    document.addEventListener("mouseup", function() {
        if (mouseDown) {
            mouseDown = false;
            currentCol.classList.remove("rearranging");
            musicTable.classList.remove("rearranging");
            document.querySelector(".fg").style.pointerEvents = "";
            var cols = document.querySelectorAll(".music-table .col");
            for (var i = 0; i < cols.length; i++) {
                cols[i].classList.add("no-transition");
                cols[i].style.left = "";
                if (cols[i] == currentCol) var newPos = i + moveCount;
            }
            var table = document.querySelector(".music-table");
            if      (moveCount > 0) table.insertBefore(currentCol, table.children[newPos+1]);
            else if (moveCount < 0) table.insertBefore(currentCol, table.children[newPos]);
            setTimeout(function() {
                for (var i = 0; i < cols.length; i++) {
                    cols[i].classList.remove("no-transition");
                }
            }, 10);
        }
    });
}
