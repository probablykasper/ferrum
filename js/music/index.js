var colResizer = document.querySelectorAll(".col-resizer");
for (var i = 6; i < 6; i++) {

    var initialPos = "nothing", oldWidth, currentClass, currentColDivs;
    colResizerr[i].addEventListener("mousedown", function(e) {
        e.preventDefault();
        initialPos = e.clientX;
        oldWidth = e.srcElement.parentElement.children[0].clientWidth;
        currentClass = e.srcElement.parentElement.classList[0];
        currentColDivs = document.querySelectorAll("td."+currentClass+" > div:first-child");
    });
    document.addEventListener("mousemove", function(e) {
        if (initialPos != "nothing") {
            newWidth = oldWidth + e.clientX - initialPos;

            if (currentClass == "name" && newWidth < 100) newWidth = 100;
            if (currentClass == "time" && newWidth < 40) newWidth = 40;
            if (currentClass == "artist" && newWidth < 100) newWidth = 100;
            if (currentClass == "album" && newWidth < 100) newWidth = 100;
            if (currentClass == "date-added" && newWidth < 75) newWidth = 75;
            if (currentClass == "plays" && newWidth < 35) newWidth = 35;

            var widthPerc = getPerc(newWidth);
            for (var divi = 0; divi < currentColDivs.length; divi++) {
                currentColDivs[divi].style.width = newWidth+"px";
            }
        }
    });
    document.addEventListener("mouseup", function() {
        if (initialPos != "nothing") {
            initialPos = "nothing";
            var widthPerc = newWidth / window.innerWidth;
            var md = document.querySelectorAll("tr.head td."+currentClass+" > div.md.width-perc")[0];
            md.textContent = widthPerc;
        }
    });
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
        if (newWidth + otherColsWidth + 40 > window.innerWidth) {
            newWidth = window.innerWidth - 40 - otherColsWidth;
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
    return window.innerWidth - fixedDivsWidth - flexibleDivs.length*20 - tableMargin;
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
function resizeTable() {
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
