/// SETUP THINGS

    var userPref = {
        sidebar: {
            visible: true,
            width: 200
        },
        tableSort: {
            column: "name",
            reverse: false
        },
        tableCols: {
            name: {
            },
            time: {
            },
            artist: {
            },
            album: {
            },
            dateAdded: {
            },
            plays: {
            },
        }
    }

    var serverPref = {
        colMinWidths: {
            name: 100,
            time: 60,
            artist: 100,
            album: 100,
            "date-added": 95,
            plays: 60
        },
        sidebarDefaultWidth: 200
    }

    function updateUserPref(pref, value) {
        eval(`userPref.${pref} = ${value}`);
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
    var sidebarVisible = userPref.sidebar.visible;
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
        main.style.width = "calc(100% - "+userPref.sidebar.width+"px)";
        sidebarVisible = true;
        updateUserPref("sidebar.visible", true);
        sidebarResizer.style.right = "0px";
    }
    function hideSidebar() {
        sidebar.style.transform = "translateX(-"+userPref.sidebar.width+"px)";
        main.style.width = "100%";
        sidebarVisible = false;
        updateUserPref("sidebar.visible", false);
        sidebarResizer.style.right = "4px";
    }
    // DOUBLE-CLICK RESET
    sidebarResizer.addEventListener("dblclick", function() {
        updateUserPref("sidebar.width", serverPref.sidebarDefaultWidth);
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
            updateUserPref("sidebar.width", newSidebarWidth);
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

    var tableMargin = 20;

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
    document.querySelector(".music-table .col."+userPref.tableSort.column).classList.add("sort");
    for (var i = 0; i < cols.length; i++) {
        var span = cols[i].children[0].querySelector("span");
        span.colClass = span.parentElement.parentElement.classList[1];
        span.colIndex = i;
        span.addEventListener("click", function(e) {
            e.preventDefault();
            var col = document.querySelector(".music-table .col."+this.colClass);
            if (hasClass(col, "sort")) sortReverse();
            else sort(this.colIndex);
        });
        span.addEventListener("mousedown", function(e) {
            e.preventDefault(); // prevent text select on doubleclick
        });
    }
    function sortReverse(reset = false) {
        for (var i = 0; i < cols.length; i++) {
            if (cols[i].style.flexDirection != "column-reverse" && !reset) {
                cols[i].style.flexDirection = "column-reverse";
                cols[i].children[0].style.order = 100000;
                updateUserPref("tableSort.reverse", true);
                document.querySelector(".music-table .col.sort").classList.add("reverse");
            } else if (cols[i].style.flexDirection == "column-reverse" || reset) {
                cols[i].style.flexDirection = "column";
                cols[i].children[0].style.order = "";
                updateUserPref("tableSort.reverse", false);
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
        updateUserPref("tableSort.column", JSON.stringify(cols[clickedColIndex].classList[1]));
        document.querySelector(".music-table .col.sort").classList.remove("sort");
        document.querySelector(".music-table .col."+userPref.tableSort.column).classList.add("sort");
    }
///

/// COLUMN ORGANIZING

    // var mouseDown, coMousePosX, oldWidth, mousePosX, mousePosOldX;
    var coMouseDown, coMousePosX, coMousePosStartX, coCurrentCol;
    for (var i = 0; i < cols.length; i++) {
        cols[i].addEventListener("mousedown", function(e) {
            e.preventDefault();
            coMouseDown = true;
            coMousePosX = e.clientX;
            coMousePosStartX = coMousePosX;
            coCurrentCol = e.target.parentElement;
            coCurrentCol.classList.add("reorganizing");
        });
    }
    document.addEventListener("mousemove", function(e) {
        if (coMouseDown) {
            coMousePosX = e.clientX;
            var left = coMousePosX - coMousePosStartX;
            coCurrentCol.style.left = left+"px";
        }
    });
    document.addEventListener("mouseup", function(e) {
        if (coMouseDown) {
            coMouseDown = false;
            coCurrentCol.classList.remove("reorganizing");
            coCurrentCol.style.left = "0px";
        }
    });

///
