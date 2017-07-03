var sidebarWidth = 200;
var sidebarVisible = true;
var sidebar = document.querySelector("aside.sidebar");
var main = document.querySelector("main.songs-page");
var sidebarToggle = document.querySelector("div.sidebar-toggle");
sidebarToggle.addEventListener("click", function() {
    toggleSidebar();
})
function toggleSidebar() {
    if (sidebarVisible) {
        sidebar.style.transform = "translateX(-"+sidebarWidth+"px)";
        main.style.width = "100%";
        main.style.left = "0px";
        sidebarVisible = false;
    } else {
        sidebar.style.transform = "translateX(0px)";
        main.style.width = "calc(100% - "+sidebarWidth+"px)";
        main.style.left = sidebarWidth+"px";
        sidebarVisible = true;
    }
    resizeTableContinously();
    function resizeTableContinously() {
        requestAnimationFrame(resizeTableContinously);
        resizeTable();
    }
}

var colCount = document.querySelectorAll("tr.head td").length;
var colResizer = document.querySelectorAll(".col-resizer");
var mouseDown, mouseStartPosX, mousePosX, mousePosOldX, colClass, oldWidth, div;
for (var i = 0; i < colCount; i++) {
    colResizer[i].addEventListener("mousedown", function(e) {
        e.preventDefault();
        mouseDown = true;
        mouseStartPosX = e.clientX;
        colClass = e.target.parentElement.classList[0];
        div = e.target.parentElement.children[0];
        oldWidth = e.target.parentElement.children[0].clientWidth;
        mousePosX = e.clientX;
    });
}
document.addEventListener("mousemove", function(e) {
    mousePosOldX = mousePosX;
    mousePosX = e.clientX;
    if (mouseDown) {
        var newWidth = oldWidth + (e.clientX - mouseStartPosX)*2;
        // calculate a theoretical new window width using the new width
        otherCols = document.querySelectorAll("tr.head td:not(."+colClass+")");
        otherColsWidth = 0;
        for (var i = 0; i < otherCols.length; i++) {
            otherColsWidth += otherCols[i].clientWidth;
        }
        if (newWidth + otherColsWidth + 40 > window.innerWidth - sidebarWidth*sidebarVisible) {
            newWidth = window.innerWidth - 40 - otherColsWidth - sidebarWidth*sidebarVisible;
        }
        if (getTableMargin() > 10) {
            setColWidth(colClass, newWidth);
        } else {
            // setColWidth(colClass, newWidth);
        }
    }
});
document.addEventListener("mouseup", function() {
    if (mouseDown) {
        mouseDown = false;
    }
});

var tableMargin = getTableMargin();
function getTableMargin() {
    tableMargin = window.innerWidth - document.querySelector("tbody").clientWidth;
    return tableMargin;
}
function getFlexibleDivsWidth() {
    var flexibleDivs = document.querySelectorAll("tr.head td.flexible-width > div:first-child");
    flexibleDivsWidth = 0;
    for (var i = 0; i < flexibleDivs.length; i++) {
        flexibleDivsWidth += flexibleDivs[i].clientWidth;
    }
    return flexibleDivsWidth;
}
function getAvailWidth() {
    var fixedDivs = document.querySelectorAll("tr.head td.fixed-width");
    fixedDivsWidth = 0;
    for (var i = 0; i < fixedDivs.length; i++) {
        fixedDivsWidth += fixedDivs[i].clientWidth;
    }
    var flexibleDivs = document.querySelectorAll("tr.head td.flexible-width");
    return main.clientWidth - fixedDivsWidth - flexibleDivs.length*20 - tableMargin;
}
function setColWidth(theClass, width) {
    var colArray = document.querySelectorAll("td."+theClass+" > div:first-child");
    if      (theClass == "name"       && width < 100) width = 100;
    else if (theClass == "time"       && width < 40)  width = 40;
    else if (theClass == "artist"     && width < 100) width = 100;
    else if (theClass == "album"      && width < 100) width = 100;
    else if (theClass == "date-added" && width < 75)  width = 75;
    else if (theClass == "plays"      && width < 35)  width = 35;
    for (var i = 0; i < colArray.length; i++) {
        colArray[i].style.width = width+"px";
    }
}
function resizeTable(skipTransition) {
    var flexibleDivs = document.querySelectorAll("tr.head td.flexible-width > div:first-child");
    var flexibleDivsWidth = getFlexibleDivsWidth();
    for (var i = 0; i < flexibleDivs.length; i++) {
        var perc = flexibleDivs[i].clientWidth / flexibleDivsWidth;
        var newWidth = perc * getAvailWidth();
        var currentClass = flexibleDivs[i].parentElement.classList[0];
        setColWidth(currentClass, newWidth);
    }
}
resizeTable();
window.addEventListener("resize", function() {
    resizeTable();
});
