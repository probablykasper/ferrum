var userPref = {
    sidebar: {
        visible: true,
        width: 200
    },
    tableCols: {
        name: {
            visible: true,
            widthType: "flexible",
            widthPerc: 50,
            widthPx: 300
        },
        time: {
            visible: true,
            widthType: "fixedOnly",
            widthPx: 60
        },
        artist: {
            visible: true,
            widthType: "flexible",
            widthPerc: 25,
            widthPx: 150
        },
        album: {
            visible: true,
            widthType: "flexible",
            widthPerc: 25,
            widthPx: 150
        },
        dateAdded: {
            visible: true,
            widthTypeChangable: true,
            widthType: "fixedOnly",
            widthPerc: 50,
            widthPx: 95
        },
        plays: {
            visible: true,
            widthType: "fixed",
            widthPx: 60
        },
    }
}

var colMinWidths = {
    name: 100,
    time: 60,
    artist: 100,
    album: 100,
    dateAdded: 95,
    plays: 60
}

function updateUserPref(pref, value) {
    userPref[pref] = value;
}

var main = document.querySelector("main.songs-page");

// SIDEBAR
    // TOGGLE
    var sidebarWidth = userPref.sidebar.width;
    var sidebarVisible = userPref.sidebar.visible;
    var sidebar = document.querySelector("aside.sidebar");
    var sidebarToggle = document.querySelector("div.sidebar-toggle");
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
        sidebarResizer.style.right = "0px";
    }
    function hideSidebar() {
        sidebar.style.transform = "translateX(-"+userPref.sidebar.width+"px)";
        main.style.width = "100%";
        sidebarVisible = false;
        sidebarResizer.style.right = "4px";
    }
    // RESIZE
    var sidebarResizer = document.querySelector(".sidebar-resizer");
    var sidebarMouseDown, mousePosX, mousePosStartX, sidebar, oldSidebarWidth, initialTransition;
    sidebarResizer.addEventListener("mousedown", function(e) {
        e.preventDefault();
        sidebarMouseDown = true;
        mousePosX = e.clientX;
        mousePosStartX = mousePosX;
        sidebar = document.querySelector("aside.sidebar");
        oldSidebarWidth = sidebar.clientWidth;

        // initialTransition = window.getComputedStyle(document.querySelector(".songs-page"), null).getPropertyValue("transition");
        document.querySelector(".songs-page").style.transition = "none";
    });
    document.addEventListener("mousemove", function(e) {
        if (sidebarMouseDown) {
            mousePosX = e.clientX;
            var widthDifference = mousePosX - mousePosStartX;
            var newSidebarWidth = oldSidebarWidth + widthDifference;

            // MIN WIDTH
            if (newSidebarWidth < 100) newSidebarWidth = 100;
            // MAX WIDTH
            if (newSidebarWidth > 500) newSidebarWidth = 500;

            sidebar.style.width = newSidebarWidth+"px";
            userPref.sidebar.width = newSidebarWidth;
            main.style.width = "calc(100% - "+newSidebarWidth+"px";
        }
    });
    document.addEventListener("mouseup", function() {
        sidebarMouseDown = false;
        document.querySelector(".songs-page").style.transition = "";
    });


// COL RESIZE

    function cssClassToJS(string) {
        while (string.indexOf("-") != -1) {
            var i = string.indexOf("-");
            string = string.slice(0, i) + string.charAt(i+1).toUpperCase() + string.slice(i+2);
        }
        return string;
    }

    var tableMargin = 20;

    var colCount = document.querySelectorAll(".music-table .col").length;
    var colResizer = document.querySelectorAll(".music-table .col-resizer");
    var mouseDown, mouseStartPosX, oldWidth, mousePosX, mousePosOldX;
    for (var i = 0; i < colCount; i++) {
        colResizer[i].addEventListener("mousedown", function(e) {
            e.preventDefault();
            mouseDown = true;
            mousePosX = e.clientX;
            mousePosStartX = mousePosX;
            currentCol = e.target.parentElement.parentElement;
            currentColClass = cssClassToJS(currentCol.classList[1]);
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
            if (newWidth < colMinWidths[currentColClass]) {
                newWidth = colMinWidths[currentColClass];
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
            document.querySelector(".music-table").style.width = "calc(100% - "+newTableMargin+"px)"
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
                    console.log(`${perc} = ${width} / ${availWidth}`);
                    flexibleCols[i].style.flexGrow = perc;
                    flexibleCols[i].style.width = "";
                }
            }
        }
    });
