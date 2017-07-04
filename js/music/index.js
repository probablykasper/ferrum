var userPref = {
    sidebar: {
        visible: false,
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
        main.style.width = "calc(100% - "+sidebarWidth+"px)";
        main.style.left = sidebarWidth+"px";
        sidebarVisible = true;
    }
    function hideSidebar() {
        sidebar.style.transform = "translateX(-"+sidebarWidth+"px)";
        main.style.width = "100%";
        main.style.left = "0px";
        sidebarVisible = false;
    }

// COL RESIZE

    function cssClassToJS(string) {
        while (string.indexOf("-") != -1) {
            var i = string.indexOf("-");
            string = string.slice(0, i) + string.charAt(i+1).toUpperCase() + string.slice(i+2);
        }
        return string;
    }

    var tableMargin = 200;

    var colCount = document.querySelectorAll(".music-table .col").length;
    var colResizer = document.querySelectorAll(".music-table .col-resizer");
    var mouseDown, mouseStartPosX, oldWidth, mousePosX, mousePosOldX;
    for (var i = 0; i < colCount; i++) {
        console.log({a:colResizer[i]});
        colResizer[i].addEventListener("mousedown", function(e) {
            e.preventDefault();
            mouseDown = true;
            mousePosX = e.clientX;
            mousePosStartX = mousePosX;
            currentCol = e.target.parentElement.parentElement;
            currentColClass = cssClassToJS(currentCol.classList[1]);
            oldWidth = currentCol.clientWidth;
        });
    }
    document.addEventListener("mousemove", function(e) {
        mousePosX = e.clientX;
        if (mouseDown) {
            if (currentCol.classList[2] == "fixed-width") { // FIXED WIDTH
                widthDifference = mousePosX*2 - mousePosStartX*2;
                var newWidth = oldWidth + widthDifference; // *2 because it's middle centered
                if (newWidth < colMinWidths[currentColClass]) { // enforce min widths
                    newWidth = colMinWidths[currentColClass];
                } else {
                    newTableMargin = tableMargin - widthDifference;
                }
                if (newTableMargin < 20) { // if table is too wide
                    var otherCols = document.querySelectorAll(".music-table .col:not(."+currentColClass+")");
                    var otherColsWidth;
                    for (var i = 0; i < otherCols.length; i++) {
                        otherColsWidth += otherCols[i].clientWidth;
                    }
                    newWidth = main.clientWidth - 20 - otherColsWidth;
                    newTableMargin = 20;
                } else { // FLEXIBLE WIDTH

                }

                currentCol.style.width = newWidth+"px";
                document.querySelector(".music-table").style.width = "calc(100% - "+newTableMargin+"px)"
            }
        }
    });
    document.addEventListener("mouseup", function(e) {
        if (mouseDown) {
            mouseDown = false;
            tableMargin = newTableMargin;
        }
    });
