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

// COL RESIZE
    resize();
    function resize() {
        var cols = document.querySelectorAll(".music-table .col-resizer");
        var colResizers = document.querySelectorAll(".music-table .col-resizer");
        var mouseDown, mousePosX, mouseStartPosX, oldWidth, oldFlexGrow, flexible = false;
        for (var i = 0; i < cols.length; i++) {
            colResizers[i].addEventListener("mousedown", function(e) {
                e.preventDefault();
                mouseDown = true;
                mousePosX = e.clientX;
                mousePosStartX = mousePosX;
                currentColClass = e.target.classList[1];
                currentCol = document.querySelector(".music-table .col."+currentColClass);
                if (currentCol.classList[2] == "flexible-width") flexible = true;
                oldWidth = currentCol.clientWidth;
                oldFlexGrow = Number(currentCol.style.flexGrow);
            });
        }
        document.addEventListener("mousemove", function(e) {
            if (mouseDown) {
                mousePosX = e.clientX;
                if (flexible) var widthDifference = mousePosX - mousePosStartX;
                else          var widthDifference = mousePosX*2 - mousePosStartX*2;
                var newWidth = oldWidth + widthDifference;

                currentCol.style.width = newWidth+"px";
                var otherFlexibleCols = document.querySelectorAll(`.music-table .col.flexible-width:not(.${currentColClass})`);
                var extraFlexPerCol = oldFlexGrow / otherFlexibleCols.length;
                for (var i = 0; i < otherFlexibleCols.length; i++) {
                    var currentFlexGrow = Number(otherFlexibleCols[i].style.flexGrow);
                    otherFlexibleCols[i].style.flexGrow = currentFlexGrow + extraFlexPerCol;
                }
                currentCol.style.flexGrow = 0;
            }
        });
    }
