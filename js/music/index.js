var colResizer = document.querySelectorAll(".col-resizer");
for (var i = 0; i < 6; i++) {

    var initialPos = "nothing", oldWidth, currentClass, currentColDivs, md;
    colResizer[i].addEventListener("mousedown", function(e) {
        e.preventDefault();
        initialPos = e.clientX;
        oldWidth = e.srcElement.parentElement.children[0].clientWidth;
        currentClass = e.srcElement.parentElement.classList[0];
        currentColDivs = document.querySelectorAll("td."+currentClass+" > div:first-child");
        md = document.querySelectorAll("tr.head td."+currentClass+" > div.md.width-perc")[0];
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

            var widthPerc = newWidth / window.innerWidth;
            for (var divi = 0; divi < currentColDivs.length; divi++) {
                currentColDivs[divi].style.width = newWidth+"px";
            }
        }
    });
    document.addEventListener("mouseup", function() {
        if (initialPos != "nothing") {
            initialPos = "nothing";
            var widthPerc = newWidth / window.innerWidth;
            md.textContent = widthPerc;
        }
    });

}
resizeTable();
function resizeTable() {
    var flexibleWidthCols = document.querySelectorAll("table.songs tr.head td.flexible-width");
    var availableWidth = 0;
    for (var i = 0; i < flexibleWidthCols.length; i++) {
        availableWidth += flexibleWidthCols[i].clientWidth - 20;
    }
    var table = document.querySelector("table.songs");
    var twwd = window.innerWidth - table.clientWidth; // window-table width difference
    availableWidth -= twwd;

    var cols = flexibleWidthCols;
    for (var coli = 0; coli < cols.length; coli++) { // col i
        var currentClass = cols[coli].classList[0];
        var cells = document.querySelectorAll("td."+currentClass+" > div:first-child");
        for (var divi = 0; divi < cells.length; divi++) {
            
        }
    }

    // for (var ci = 0; ci < cols.length; ci++) { // col i
    //     var currentClass = cols[ci].classList[0];
    //     var cells = document.querySelectorAll("td."+currentClass+" > div:first-child");
    //     for (var ci = 0; ci < cells.length; ci++) { // cell i
    //         cells[ci].style.width = availableWidth/3+"px";
    //     }
    // }

}

window.addEventListener("resize", function() {
    resizeTable();
});
