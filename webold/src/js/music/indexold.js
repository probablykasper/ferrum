/// SETUP THINGS

    var pref = {
        "sidebar": {
            "visible": true,
            "width": 200
        },
        "table": {
            "margin": 20,
            "sort": {
                "col": "date-added",
                "reverse": false
            },
            "cols": {
                "name": {
                    "pos": 0
                },
                "time": {
                    "pos": 1
                },
                "artist": {
                    "pos": 2
                },
                "album": {
                    "pos": 3
                },
                "date-added": {
                    "pos": 4
                },
                "plays": {
                    "pos": 5
                },
            }
        },
    }

    var serverPref = {
        "colMinWidths": {
            "name": 100,
            "time": 50,
            "artist": 100,
            "album": 100,
            "date-added": 95,
            "plays": 60
        },
        "sidebarDefaultWidth": 200
    }

    function updatePref(preference, value) {
        eval(`pref.${preference} = ${value}`);
    }
    function hasClass(el, cls) {
        cls = cls.split(","); // or
        for (var i = 0; i < cls.length; i++) {
            if ( (" "+el.className+" ").indexOf(" "+cls[i]+" ") > -1 ) {
                return true;
            }
        }
        return false;
    }
    function timeToSec(str) {
        var p = str.split(':'), s = 0, m = 1;
        while (p.length > 0) {
            s += m * parseInt(p.pop(), 10);
            m *= 60;
        }
        return s;
    }

    var main = document.querySelector("main.songs-page");
    var cols = document.querySelectorAll(".music-table .col");
///

/// SIDEBAR
    // TOGGLE
    var sidebarVisible = pref.sidebar.visible;
    var sidebar = document.querySelector("aside.sidebar");
    var sidebarResizer = document.querySelector(".sidebar-resizer");
    var sidebarToggle = document.querySelector(".sidebar-toggle");
    if (!sidebarVisible) hideSidebar(); // setup
    sidebarToggle.addEventListener("click", function() {
        toggleSidebar();
    });
    function toggleSidebar() {
        if (sidebarVisible) hideSidebar();
        else showSidebar();
    }
    function showSidebar() {
        sidebar.style.transform = "translateX(0px)";
        main.style.width = "calc(100% - "+pref.sidebar.width+"px)";
        sidebarVisible = true;
        updatePref("sidebar.visible", true);
        sidebarResizer.style.right = "0px";
    }
    function hideSidebar() {
        sidebar.style.transform = "translateX(-"+pref.sidebar.width+"px)";
        main.style.width = "100%";
        sidebarVisible = false;
        updatePref("sidebar.visible", false);
        sidebarResizer.style.right = "4px";
    }
    // DOUBLE-CLICK RESET
    sidebarResizer.addEventListener("dblclick", function() {
        updatePref("sidebar.width", serverPref.sidebarDefaultWidth);
        sidebar.style.width = serverPref.sidebarDefaultWidth+"px";
        main.style.width = "calc(100% - "+serverPref.sidebarDefaultWidth+"px)";
    });
    // RESIZE
    var sidebarMouseDown, mousePosX, mousePosStartX, sidebar, oldSidebarWidth, initialTransition, newSidebarWidth;
    sidebarResizer.addEventListener("mousedown", function(e) {
        e.preventDefault();
        sidebarMouseDown = true;
        mousePosX = e.clientX;
        mousePosStartX = mousePosX;
        sidebar = document.querySelector("aside.sidebar");
        oldSidebarWidth = sidebar.clientWidth;

        document.querySelector(".songs-page").style.transition = "none";
        sidebar.style.transition = "none";
    });
    document.addEventListener("mousemove", function(e) {
        if (sidebarMouseDown) {
            mousePosX = e.clientX;
            var widthDifference = mousePosX - mousePosStartX;
            newSidebarWidth = oldSidebarWidth + widthDifference;

            // MIN WIDTH
            if (newSidebarWidth < 100) newSidebarWidth = 100;
            // MAX WIDTH
            if (newSidebarWidth > 500) newSidebarWidth = 500;

            sidebar.style.width = newSidebarWidth+"px";
            main.style.width = "calc(100% - "+newSidebarWidth+"px";
        }
    });
    document.addEventListener("mouseup", function() {
        if (sidebarMouseDown) {
            sidebarMouseDown = false;
            updatePref("sidebar.width", newSidebarWidth);
            document.querySelector(".songs-page").style.transition = "";
            sidebar.style.transition = "";
        }
    });
///

/// COL RESIZE
    function cssClassToJS(string) {
        while (string.indexOf("-") != -1) {
            var i = string.indexOf("-");
            string = string.slice(0, i) + string.charAt(i+1).toUpperCase() + string.slice(i+2);
        }
        return string;
    }

    var tableMargin = pref.table.margin;
    var newTableMargin = tableMargin;
    document.querySelector(".music-table").style.width = `calc(100% - ${tableMargin*2})`;

    var colResizer = document.querySelectorAll(".music-table .col-resizer");
    var mouseDown, mouseStartPosX, oldWidth, mousePosX, mousePosOldX;
    for (var i = 0; i < cols.length; i++) {
        colResizer[i].addEventListener("mousedown", function(e) {
            e.preventDefault();
            mouseDown = true;
            mousePosX = e.clientX;
            mousePosStartX = mousePosX;
            currentCol = e.target.parentElement.parentElement;
            currentColClass = currentCol.classList[1];
            oldWidth = currentCol.clientWidth;

            flexibleCols = document.querySelectorAll(".music-table .col.flexible-width");
            flexibleColsWidths = [];
            for (var i = 0; i < flexibleCols.length; i++) {
                flexibleColsWidths.push(flexibleCols[i].clientWidth);
                // var currentWidth = window.getComputedStyle(flexibleCols[i]).width;
                // flexibleColsWidths.push(Number(currentWidth.substr(0, currentWidth.length-2)));
            }
            if (currentCol.classList[2] == "flexible-width") {
                for (var i = 0; i < flexibleCols.length; i++) {
                    var width = flexibleColsWidths[i];
                    flexibleCols[i].style.flexGrow = "initial";
                    flexibleCols[i].style.width = width+"px";
                }
            }
        });
    }
    document.addEventListener("mousemove", function(e) {
        if (mouseDown) {
            mousePosX = e.clientX;
            var widthDifference = mousePosX*2 - mousePosStartX*2;
            // *2 because it's middle centered
            var newWidth = oldWidth + widthDifference;

            // MAX WIDTHS
            if (newWidth < serverPref.colMinWidths[currentColClass]) {
                newWidth = serverPref.colMinWidths[currentColClass];
            } else {
                newTableMargin = tableMargin - widthDifference;
            }

            // TOO WIDE TABLE
            if (newTableMargin < 20) {
                var otherCols = document.querySelectorAll(".music-table .col:not(."+currentColClass+")");
                var otherColsWidth = 0;
                for (var i = 0; i < otherCols.length; i++) {
                    otherColsWidth += otherCols[i].clientWidth;
                }
                newWidth = main.clientWidth - 20 - otherColsWidth;
                newTableMargin = 20;
            }

            currentCol.style.width = newWidth+"px";
            document.querySelector(".music-table").style.width = "calc(100% - "+newTableMargin+"px)";
        }
    });
    document.addEventListener("mouseup", function(e) {
        if (mouseDown) {
            mouseDown = false;
            tableMargin = newTableMargin;

            if (currentCol.classList[2] == "flexible-width") {

                flexibleCols = document.querySelectorAll(".music-table .col.flexible-width");
                flexibleColsWidths = [];
                for (var i = 0; i < flexibleCols.length; i++) {
                    flexibleColsWidths.push(flexibleCols[i].clientWidth);
                }

                var availWidth = 0;
                for (var i = 0; i < flexibleCols.length; i++) {
                    availWidth += flexibleColsWidths[i];
                }
                for (var i = 0; i < flexibleCols.length; i++) {
                    var width = flexibleColsWidths[i];
                    var perc = width / availWidth;
                    flexibleCols[i].style.flexGrow = perc;
                    flexibleCols[i].style.width = "";
                }
            }
        }
    });
///

/// SORT
    document.querySelector(".music-table .col."+pref.table.sort.col).classList.add("sort");
    function spanClick(e) { // event handler
        e.preventDefault();
        var col = document.querySelector(".music-table .col."+this.colClass);
        if (hasClass(col, "sort")) sortReverse();
        else sort(this.colIndex);
    }
    function sortIconClick(e) { // event handler
        // e.preventDefault();
        sortReverse();
    }
    function spanMouseDown(e) { // event handler
        e.preventDefault(); // prevent text select on doubleclick
    }
    function sortInit() {
        for (var i = 0; i < cols.length; i++) {
            var span = cols[i].children[0].querySelector("span");
            var sortIcon = cols[i].children[0].querySelector(".sort-icon");
            span.colClass = span.parentElement.parentElement.classList[1];
            span.colIndex = i;
            span.addEventListener("click", spanClick);
            sortIcon.addEventListener("click", sortIconClick);
            span.addEventListener("mousedown", spanMouseDown);
        }

        var sortCol = document.querySelector(".music-table .col.sort");
        var header = sortCol.querySelector(".cell:first-child");
        var sortIcon = header.querySelector(".sort-icon");
        var usedWidth  = Number(window.getComputedStyle(header).paddingLeft.substring(0,2));
            usedWidth += header.querySelector("span").offsetWidth;
            usedWidth += sortIcon.clientWidth;
            usedWidth += Number(window.getComputedStyle(sortIcon).right.substring(0,1));
        var leftoverWidth = header.clientWidth - usedWidth;
        if (leftoverWidth < 0) sortCol.style.width = sortCol.clientWidth - leftoverWidth+"px";

    }
    sortInit();
    function sortUnInit() {
        for (var i = 0; i < cols.length; i++) {
            var span = cols[i].children[0].querySelector("span");
            var sortIcon = cols[i].children[0].querySelector(".sort-icon");
            span.colClass = span.parentElement.parentElement.classList[1];
            span.colIndex = i;
            span.removeEventListener("click", spanClick);
            sortIcon.addEventListener("click", sortIconClick);
            span.removeEventListener("mousedown", spanMouseDown);
        }
    }
    function sortReverse(reset = false) {
        for (var i = 0; i < cols.length; i++) {
            if (cols[i].style.flexDirection != "column-reverse" && !reset) {
                cols[i].style.flexDirection = "column-reverse";
                cols[i].children[0].style.order = 100000;
                updatePref("table.sort.reverse", true);
                document.querySelector(".music-table .col.sort").classList.add("reverse");
            } else if (cols[i].style.flexDirection == "column-reverse" || reset) {
                cols[i].style.flexDirection = "column";
                cols[i].children[0].style.order = "";
                updatePref("table.sort.reverse", false);
                document.querySelector(".music-table .col.sort").classList.remove("reverse");
            }
        }
    }
    function sort(clickedColIndex) {
        sortReverse(true);
        // sort clicked column
        clickedCol = cols[clickedColIndex].children;
        clickedCol = Array.prototype.slice.call(clickedCol, 0).slice(1); // NodeList -> Array
        for (var i = 0; i < clickedCol.length; i++) { // save original pos
            clickedCol[i].index = i;
        }

        clickedCol.sort(function(a, b) {
            switch (cols[clickedColIndex].classList[1]) {
                case "name":
                case "artist":
                case "album":
                    if (a.innerHTML < b.innerHTML) return -1;
                    if (a.innerHTML > b.innerHTML) return 1;
                    return 0;
                case "time":
                    return timeToSec(a.innerHTML)-timeToSec(b.innerHTML);
                case "date-added":
                    return new Date(a.innerHTML) - new Date(b.innerHTML);
                case "plays":
                    return Number(a.innerHTML)-Number(b.innerHTML);
                default:
                    console.log("OMG HOW DID THIS HAPPEN");
                    return 0;
            }
        });

        var posChange = [];
        for (var i = 0; i < clickedCol.length; i++) { // save new pos
            posChange[clickedCol[i].index] = i;
        }

        // sort other columns
        for (var i = 0; i < cols.length; i++) {
            var currentCol = cols[i].children;
            var nthChild = i+1;
            var currentCol = document.querySelectorAll(".music-table .col:nth-child("+nthChild+") .cell:not(:first-child)");
            for (var cci = 0; cci < clickedCol.length; cci++) {
                currentCol[cci].style.order = posChange[cci];
            }
        }
        updatePref("table.sort.col", JSON.stringify(cols[clickedColIndex].classList[1]));
        document.querySelector(".music-table .col.sort").classList.remove("sort");
        document.querySelector(".music-table .col."+pref.table.sort.col).classList.add("sort");

        var header = cols[clickedColIndex].children[0];
        var sortIcon = header.querySelector(".sort-icon");
        var usedWidth  = Number(window.getComputedStyle(header).paddingLeft.substring(0,2));
            usedWidth += header.querySelector("span").offsetWidth;
            usedWidth += sortIcon.clientWidth;
            usedWidth += Number(window.getComputedStyle(sortIcon).right.substring(0,1));
        var leftoverWidth = header.clientWidth - usedWidth;
        if (leftoverWidth < 0) cols[clickedColIndex].style.width = cols[clickedColIndex].clientWidth - leftoverWidth+"px";

    }
///

/// COLUMN ORGANIZING
colOrg();
function colOrg() {
    var mouseDown, mousePosX, mousePosStartX, currentCol;
    for (var i = 0; i < cols.length; i++) {
        cols[i].addEventListener("mousedown", function(e) {
            console.log(5);
            if (hasClass(e.target, "cell") && e.target.previousElementSibling == null) {
                e.preventDefault();
                mouseDown = true;
                mousePosX = e.clientX;
                mousePosStartX = mousePosX;
                currentCol = e.target.parentElement;
            }
        });
        cols[i].addEventListener("contextmenu", function(e) {
            mouseDown = false;
        });
    }
    var moveCount = 0;
    document.addEventListener("mousemove", function(e) {
        if (mouseDown) {
            currentCol.classList.add("reorganizing");
            mousePosX = e.clientX;
            var left = mousePosX - mousePosStartX;

            var end = false, remainding = left, moveEnd = false;
            var reverse = remainding < 0 ? true : false;
            moveCount = 0;
            function moveOtherCols(col) {
                var next = col.nextElementSibling;
                if (reverse) next = col.previousElementSibling;
                if (next == null) end = true;
                if (!end) {
                    if (!moveEnd) {
                        if (remainding > next.clientWidth/2 && !reverse) {
                            remainding -= next.clientWidth;
                            next.style.right = currentCol.clientWidth+"px";
                            moveCount++;
                        } else if (remainding < -next.clientWidth/2 && reverse) {
                            remainding += next.clientWidth;
                            next.style.right = -currentCol.clientWidth+"px";
                            moveCount--;
                        } else {
                            moveEnd = true;
                            next.style.right = "0px";
                        }
                    } else next.style.right = "0px";
                    moveOtherCols(next);
                }
            }
            moveOtherCols(currentCol);
            left -= remainding;
            currentCol.style.left = left+"px";
        }
    });
    document.addEventListener("mouseup", function(e) {
        if (mouseDown) {
            sortUnInit();
            mouseDown = false;
            currentCol.classList.remove("reorganizing");
            cols = document.querySelectorAll(".music-table .col");
            for (var i = 0; i < cols.length; i++) {
                cols[i].style.right = "";
                if (cols[i] == currentCol) var newPos = moveCount + i;
            }
            var table = document.querySelector(".music-table");
            if (moveCount > 0) table.insertBefore(currentCol, table.children[newPos+1]);
            if (moveCount < 0) table.insertBefore(currentCol, table.children[newPos]);
            currentCol.style.left = "";

            cols = document.querySelectorAll(".music-table .col");
            for (var i = 0; i < cols.length; i++) {
                var cls = cols[i].classList[1];
                updatePref(`table.cols["${cls}"].pos`, i);
                cols[i].classList[1];
            }
            sortInit();
        }
    });
}

///

/// CONTEXT MENUS
    for (var i = 0; i < cols.length; i++) {
        cols[i].querySelector(".cell:first-child").addEventListener("contextmenu", function(e) {
            openContextMenu(e.clientX, e.clientY, "table-header");
            e.preventDefault();
        });
    }
    document.addEventListener("mousedown", function(e) {
        if (!hasClass(e.target, "context-menu,context-item")) {
            closeContextMenu();
        }
    });
    function openContextMenu(x, y, type) {
        if (type == "table-header") {
            var ctx = document.querySelector(".context-menu.table-header");
            ctx.style.left = 4 + x+"px";
            ctx.style.top = 4 + y+"px";
            ctx.style.display = "block";
            // make it not clip at the bottom of the page
        }
    }
    function closeContextMenu() {
        var ctx = document.querySelector(".context-menu.table-header");
        var ctx = document.querySelectorAll(".context-menu");
        for (var i = 0; i < ctx.length; i++) {
            ctx[i].style.display = "none";
        }
    }
///
