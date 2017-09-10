prefSetup();
function prefSetup() {
    window.localPrefDefault = {
        "table": {
            "cols": {
                "name": {
                    "width": 500000,
                    "index": 0,
                    "visible": true
                },
                "time": {
                    "width": "auto",
                    "index": 1,
                    "visible": true
                },
                "artist": {
                    "width": 250000,
                    "index": 2,
                    "visible": true
                },
                "album": {
                    "width": 250000,
                    "index": 3,
                    "visible": true
                },
                "dateAdded": {
                    "width": "auto",
                    "index": 4,
                    "visible": true
                },
                "plays": {
                    "width": "auto",
                    "index": 5,
                    "visible": true
                }
            },
            "colOrder": ["name", "time", "artist", "album", "dateAdded", "plays"]
        },
        "sidebar": {
            "width": 250,
            "visible": false
        }
    }
    if (!localStorage.getItem("localPref")) {
        localStorage.setItem("localPref", JSON.stringify(localPrefDefault));
    }
    window.localPref = JSON.parse(localStorage.getItem("localPref"));
    window.updateLocalPref = function() {
        localStorage.setItem("localPref", JSON.stringify(localPref));
    }
    window.colMinWidths = {
        "name": 100,
        "time": 50,
        "artist": 100,
        "album": 100,
        "dateAdded": 95,
        "plays": 60
    }
}

function xhr(reqContent, url, callback, type = "POST") {
    var xhr = new XMLHttpRequest();
    xhr.open(type, url, true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.send(reqContent);
    xhr.onreadystatechange = function() {
        if (this.readyState == 4) {
            if      (this.status == 200) callback(this.responseText, false);
            else if (this.status == 404) callback(this.responseText, 404);
        }
    }
}
changePage(path, false);
function changePage(path, pushState = true) {
    if (!loggedIn && path == "/") initPage(path);
    else {
        xhr("", path, function(res, err) {
            if (!pushState) history.replaceState({path: path}, "exampletitle");
            else history.pushState({path: path}, "sampletitle", path);

            if (err == 404) initPage("/404", res);
            else if (!err) {
                res = JSON.parse(res);
                initPage(path, res);
            }
        });
    }
}
function initPage(path, res) {
    window.trackCount = 0;
    if      (path == "/") initHome(res);
    // else if (path == "/404") init404();

    // turn off active pages
    var activePages = document.querySelectorAll(".page-container.active");
    for (var i = 0; i < activePages.length; i++) {
        activePages[i].classList.remove("active");
    }
    // turn on new page
    if (loggedIn) {
        var selector = ".page-container.logged-in[data-page='"+path+"']";
    } else {
        var selector = ".page-container.logged-out[data-page='"+path+"']";
    }
    var container = document.querySelector(selector);
    container.classList.add("active");
}

window.addEventListener("popstate", function(e) {
    changePage(e.state.path, true);
});
document.addEventListener("click", function(e) {
    var cl = e.target.classList;
    if (e.button == 0) {
        if (e.target.attributes.href) {
            e.preventDefault();
            changePage(e.target.attributes.href.value);
        } else if (cl.contains("logout-button")) {
            logout();
        } else if (e.target.tagName == "BUTTON") {
            if      (cl.contains("login"))    clickLogin();
            else if (cl.contains("register")) clickRegister();
        }
    }
});
document.addEventListener("keypress", function(e) {
    if (e.which == 13 && e.target.classList.contains("for-register")) { // enter
        var cl = e.target.parentElement.parentElement.classList;
        if (cl.contains("login")) clickLogin();
        else if (cl.contains("register")) clickRegister();
    }
});
document.addEventListener("mouseover", function(e) {
    if (e.target.classList.contains("cell") && e.target.dataset.track) {
        var id = e.target.dataset.track;
        var hoveredTrack = document.querySelectorAll('.music-table .cell[data-track="'+id+'"]');
        for (var i = 0; i < hoveredTrack.length; i++) {
            hoveredTrack[i].classList.add("hover");
        }
    }
});
document.addEventListener("mouseout", function(e) {
    if (e.target.classList.contains("cell") && e.target.dataset.track) {
        var id = e.target.dataset.track;
        var hoveredTrack = document.querySelectorAll('.music-table .cell[data-track="'+id+'"]');
        for (var i = 0; i < hoveredTrack.length; i++) {
            hoveredTrack[i].classList.remove("hover");
        }
    }
});
commonFunctions();
function commonFunctions() {
    window.logout = function() {
        xhr("", "/logout", function(res) {
            res = JSON.parse(res);
            if (res.errors) console.log(errors);
            else {
                loggedIn = false;
                changePage("/");
            }
        });
    }
    window.hasClass = function(el, cls, startsWith = false) {
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
    window.insideClass = function(el, cls) {
        if (hasClass(el, cls)) return true;
        while (el = el.parentElement) {
            if (hasClass(el, cls)) return true;
        }
        return false;
    }
    window.insideDataset = function(e, dataset) {
        var el = e.target;
        if (el.dataset && el.dataset.hasOwnProperty(dataset)) {
            return el.dataset[dataset];
        } else {
            while (el = el.parentElement) {
                if (el.dataset && el.dataset.hasOwnProperty(dataset)) {
                    return el.dataset[dataset];
                }
            }
        }
        return false;
    }
    window.updateColWitdthPref = function(grab = false) {
        // grab or set preference?
        var flexibleCols = document.querySelectorAll(".music-table > .col.flexible-width");
        for (var i = 0; i < flexibleCols.length; i++) {
            var colName = flexibleCols[i].dataset.colName;
            if (grab) flexibleCols[i].style.flexGrow = localPref.table.cols[colName].width;
            else             localPref.table.cols[colName].width = flexibleCols[i].style.flexGrow;
        }
        if (!grab) updateLocalPref();
    }

    window.notifications = document.querySelector(".fg > .notifications");
    window.notify = function(message, buttonMsg, buttonCallback) {
        var notification = document.createElement("div");
    }
}

// Context menus
function contextItemClick(context, ctxElement, element) {
    var item = ctxElement.innerHTML;
    var data = ctxElement.dataset;
    var cl = ctxElement.classList;
    if (context == "table-header") {
        if (data.col) {
            if (localPref.table.cols[data.col].visible) {
                localPref.table.cols[data.col].visible = false;
            } else {
                localPref.table.cols[data.col].visible = true;''
            }
            updateColVisibility();
            updateLocalPref();
        } else if (data.type == "reset") {
            for (var i = 0; i < localPref.table.colOrder.length; i++) {
                var col = localPref.table.colOrder[i];
                localPref.table.cols[col].width = localPrefDefault.table.cols[col].width
            }
            updateColWitdthPref(true);
            updateColWitdthPref();
        }
    } else if (context == "track") {
        if (data.playlistId) {
            var req =
            "trackId="+element.dataset.trackId+
            "&playlistId="+data.playlistId;
            xhr(req, "/add-track-to-playlist", function(res) {
                console.log(res);
                var res = JSON.parse(res);
                if (res.errors) {
                    console.log(res.errors);
                } else {
                    console.log("added");
                    notify();
                }
            });
        }
    } else if (context == "playlist") {
        if (data.type == "delete") {
            var req = "playlistId="+ctxElement.dataset.playlistId;
            xhr(req, "/delete-playlist", function(res) {
                var res = JSON.parse(res);
                if (res.errors) {
                    console.log(res.errors);
                } else {
                    changePage("/");
                    closeDialog();
                }
            });
        }
    }
}
contextMenu();
function contextMenu() {
    // event to open context menu
    document.addEventListener("contextmenu", function(e) {
        var contextMenu = insideDataset(e, "contextMenu");
        if (contextMenu) {
            e.preventDefault();
            openContextMenu(contextMenu, e.clientX, e.clientY, e.target);
        } else {
            closeContextMenu();
        }
    });
    var currentContextMenu = undefined;
    var clickedContextElement = undefined;
    document.addEventListener("click", function(e) {
        if (e.target.classList.contains("context-item") && !e.target.classList.contains("arrow")) {
            contextItemClick(currentContextMenu, e.target, clickedContextElement);
            closeContextMenu();
        }
    });
    (function() { // triggers to close context menu
        document.addEventListener("mousedown", function(e) {
            if (!insideClass(e.target, "context-menu")) closeContextMenu();
        });
        window.addEventListener("keydown", function(e) {
            if (e.keyCode == 27) { // escape
                closeContextMenu();
            }
        });
        window.addEventListener("blur", function(e) {
            closeContextMenu();
        });
        document.addEventListener("scroll", function(e) {
            closeContextMenu();
        });
    })();
    function closeSubmenus() {
        var submenus = document.querySelectorAll(".context-menu .arrow");
        for (var i = 0; i < submenus.length; i++) {
            submenus[i].classList.remove("hover");
        }
    }
    function openContextMenu(type, x, y, element) {
        currentContextMenu = type;
        clickedContextElement = element;
        var ctx = document.querySelector(".context-menu."+type);
        x += 1;
        y -= 4;
        ctx.style.display = "block";
        if (ctx.clientHeight + y + 10 > window.innerHeight) y = window.innerHeight - 10 - ctx.clientHeight;
        if (ctx.clientWidth + x + 10 > window.innerWidth) x = window.innerWidth - 10 - ctx.clientWidth;
        ctx.style.left = x+"px";
        ctx.style.top = y+"px";
        var ctxItemPos = 0;
        document.addEventListener("mouseover", function(e) {
            if (e.target.parentElement && e.target.parentElement.classList && e.target.parentElement.classList.contains("context-submenu")) {
                e.target.parentElement.parentElement.classList.add("hover");
            } else if (!insideClass(e.target, "context-submenu") && insideClass(e.target, "context-menu")) {
                closeSubmenus();
            }
        });
        for (var i = 0; i < ctx.children.length; i++) {
            var itemHeight = ctx.children[i].clientHeight;
            ctxItemPos += itemHeight;
            if (ctx.children[i].classList.contains("arrow")) {
                var padding = window.getComputedStyle(ctx).paddingTop;
                padding = Number(padding.substr(0, padding.length-2));
                var submenu = ctx.children[i].children[0];

                // make height not bigger than window
                var eo = 0; // extra offset
                submenu.style.height = "";
                if (submenu.clientHeight > window.innerHeight - 20) {
                    submenu.style.height = window.innerHeight - padding*2 - 20+"px";
                    eo = 12;
                }
                // make submenu not exceed bottom of window
                if (eo + y + ctxItemPos - itemHeight + submenu.clientHeight > window.innerHeight) {
                    var submenuEndPos = eo + y + ctxItemPos - itemHeight + submenu.clientHeight;
                    submenu.style.top = window.innerHeight - submenuEndPos - padding - 10+"px";
                }
                // show on right/left side
                if (ctx.clientWidth + ctx.children[i].clientWidth + x + 10 > window.innerWidth) {
                    ctx.children[i].children[0].style.left = "";
                    ctx.children[i].children[0].style.right = "100%";
                } else {
                    ctx.children[i].children[0].style.left = "100%";
                    ctx.children[i].children[0].style.right = "";
                }
            }
        }
    }
    function closeContextMenu() {
        var ctxs = document.querySelectorAll(".context-menu");
        for (var i = 0; i < ctxs.length; i++) {
            ctxs[i].style.display = "none";
        }
        closeSubmenus();
    }
}

// MUSIC PAGES
function insertPlaylists(playlists) {
    var sidebar = document.querySelector("aside.sidebar");
    var ctxMenus = document.querySelectorAll('.context-menu [data-type="add-to-playlist"]');
    for (var i = 0; i < playlists.length; i++) {
        var item = document.createElement("a");
        item.classList.add("item", "playlist");
        item.setAttribute("data-playlist-id", playlists[i].playlistId);
        item.setAttribute("href", "/playlist/"+playlists[i].playlistId);
        item.innerHTML = playlists[i].name;
        sidebar.append(item);

        for (var mi = 0; mi < ctxMenus.length; mi++) {
            var ctxItem = document.createElement("div");
            ctxItem.classList.add("context-item");
            ctxItem.setAttribute("data-playlist-id", playlists[i].playlistId);
            ctxItem.innerHTML = playlists[i].name;
            ctxMenus[mi].append(ctxItem);
        }
    }
}
function insertTracks(tracks, deleteOld) {
    if (deleteOld) {
        cells = document.querySelectorAll(".music-table .cell[data-track]");
        for (var i = 0; i < cells.length; i++) {
            cells[i].parentNode.removeChild(cells[i]);
        }
    }
    for (var i = 0; i < tracks.length; i++) {
        trackCount++;
        var cols = document.querySelectorAll(".music-table > .col");
        for (var ci = 0; ci < cols.length; ci++) {
            var cell = document.createElement("div");
            cell.classList.add("cell");
            cell.setAttribute("data-col-name", cols[ci].dataset.colName);
            cell.setAttribute("data-track", trackCount);
            cell.setAttribute("data-track-id", tracks[i].trackId);
            cell.innerHTML = tracks[i][cols[ci].dataset.colName];
            cols[ci].append(cell);
        }
    }
}

updateColVisibility();
function updateColVisibility() {
    for (var i = 0; i < localPref.table.colOrder.length; i++) {
        var col = localPref.table.colOrder[i];
        var colEl = document.querySelector('.music-table > .col[data-col-name="'+col+'"]');
        var ctxItem = document.querySelector('.context-menu .context-item[data-col="'+col+'"]');
        if (localPref.table.cols[col].visible) {
            colEl.style.display = "";
            ctxItem.classList.add("checked");
        } else {
            colEl.style.display = "none";
            ctxItem.classList.remove("checked");
        }
    }
}
colResize();
function colResize() {
    updateColWitdthPref(true);
    function findNextCol(col, reverse) {
        if (reverse) col = col.previousElementSibling;
        else         col = col.nextElementSibling;
        if (col == null) return null;
        if (hasClass(col, "auto-width")) col = findNextCol(col, reverse);
        return col;
    }
    var mouseDown, mousePosX, mouseStartPosX, oldWidth, oldWidthNext, flexibleCols, availWidth, nextColClass;
    document.addEventListener("mousedown", function(e) {
        if (e.button == 0 && e.target.classList.contains("col-resizer")) {
            e.preventDefault();
            mouseDown = true;
            mousePosX = e.clientX;
            mousePosStartX = mousePosX;
            currentColClass = e.target.classList[1];
            currentCol = document.querySelector('.music-table .col[data-col-name="'+currentColClass+'"]');
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
        }
    });
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
            for (var i = 0; i < flexibleCols.length; i++) {
                flexibleCols[i].style.width = "";
            }
            updateColWitdthPref();
        }
    });
}
colRearrange();
function colRearrange() {
    // init column positions
    var cols = localPref.table.cols;
    var colOrder = localPref.table.colOrder;
    var html = "";
    for (var i = 0; i < colOrder.length; i++) {
        var selector = '.music-table .col[data-col-name="'+colOrder[i]+'"]';
        html += document.querySelector(selector).outerHTML;
    }
    document.querySelector(".music-table").innerHTML = html;

    updateLastNonAuto();
    function updateLastNonAuto() {
        var existingLastNonAuto = document.querySelector(".last-non-auto");
        if (existingLastNonAuto) existingLastNonAuto.classList.remove("last-non-auto");
        var flexibleCols = document.querySelectorAll(".col.flexible-width");
        flexibleCols[flexibleCols.length-1].classList.add("last-non-auto");
    }

    var musicTable = document.querySelector(".music-table");
    var mouseDown, mousePosX, mouseStartPosX, currentCol, nextCol, moveCount;
    musicTable.addEventListener("mousedown", function(e) {
        if (e.button == 0 && hasClass(e.target, "cell") && e.target.previousElementSibling == null) {
            e.preventDefault();
            moveCount = 0;
            mouseDown = true;
            mousePosX = e.clientX;
            mousePosStartX = mousePosX;
            currentCol = e.target.parentElement;
            nextCol = currentCol.nextElementSibling;
            prevCol = currentCol.previousElementSibling;
            currentCol.classList.add("rearranging");
            musicTable.classList.add("rearranging");
        }
    });
    document.addEventListener("mousemove", function(e) {
        if (mouseDown) {
            document.querySelector(".fg").style.pointerEvents = "auto";
            document.querySelector(".fg").style.cursor = "move";

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
            if (moveCount != 0) {
                updateLastNonAuto();
                updateColPosPref();
            }
        }
    });
    function updateColPosPref() {
        var cols = document.querySelectorAll(".music-table > .col");
        for (var i = 0; i < cols.length; i++) {
            var colName = cols[i].dataset.colName;
            localPref.table.colOrder[i] = colName;
            localPref.table.cols[colName].index = i;
        }
        updateLocalPref();
    }
}

// HOME PAGE
function validate(type, msg, el, third) {
    var result = false;
    if (type == "empty") {
        if (el.value == "") result = true;
    } else if (type == "noMatch") {
        var el2 = third;
        if (el.value != el2.value) result = true;
    } else if (type == "shorterThan") {
        var num = third;
        if (el.value.length < num) result = true;
    } else if (type == "longerThan") {
        var num = third;
        if (el.value.length > num) result = true;
    } else if (type == "notEmail") {
        var regex = "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
        if (!el.value.match(regex)) result = true;
    }
    if (result == true) {
        el.previousElementSibling.innerHTML = msg;
        el.previousElementSibling.classList.add("visible");
        return true;
    } else {
        el.previousElementSibling.classList.remove("visible");
        return false;
    }
}
function resetMsgs() {
    success.classList.remove("visible");
    username. previousElementSibling.classList.remove("visible");
    email.    previousElementSibling.classList.remove("visible");
    password. previousElementSibling.classList.remove("visible");
    password2.previousElementSibling.classList.remove("visible");
}
function displayErr(field, msg) {
    if (field == "username") field = username;
    if (field == "email") field = email;
    if (field == "password") field = password;
    if (field == "password2") field = password2;
    field.previousElementSibling.innerHTML = msg;
    field.previousElementSibling.classList.add("visible");
}
var login = document.querySelector("button.login");
var register = document.querySelector("button.register");
var form = document.querySelector(".form");

var username = document.querySelector("input[name='username']");
var email = document.querySelector("input[name='email']");
var password = document.querySelector("input[name='password']");
var password2 = document.querySelector("input[name='password2']");
var success = document.querySelector(".form .success");
function clickLogin() {
    resetMsgs();
    if (!form.classList.contains("login")) {
        email.setAttribute("tabindex", "-1");
        password2.setAttribute("tabindex", "-1");
        username.setAttribute("tabindex", "0");
        password.setAttribute("tabindex", "0");
        login.setAttribute("tabindex", "0");
        register.setAttribute("tabindex", "0");

        form.classList.remove("register");
        form.classList.add("login");
        form.classList.add("expanded");
        form.classList.add("has-been-expanded");
    } else {
        var a = false, b = false;
        if (!a) a = validate("empty",        "You should fill this in",                 username        );
        if (!a) a = validate("longerThan",   "Keep it below 30",                        username, 30    );
        if (!b) b = validate("shorterThan",  "That's a bit short... Try 8 characters",  password, 8     );
        if (!b) b = validate("longerThan",   "You crossed the 100 characters line",     password, 100   );

        if (!a && !b) {
            var req =
            "type=login"+
            "&username="+username.value+
            "&password="+password.value;
            xhr(req, "/login", function(res) {
                var errors = JSON.parse(res).errors;
                if (errors) {
                    if (errors.username == "empty") displayErr("username", "You should fill this in");
                    if (errors.username == "long") displayErr("username", "Keep it below 30");
                    if (errors.username == "exist") displayErr("username", "Had trouble finding that user");
                    if (errors.password == "short") displayErr("password", "That's a bit short... Try 8 characters");
                    if (errors.password == "long") displayErr("password", "You crossed the 100 characters line");
                    if (errors.password == "incorrect") displayErr("password", "You guessed the wrong password");
                } else {
                    loggedIn = true;
                    changePage("/");
                }
            });
        }
    }
}
function clickRegister() {
    resetMsgs();
    if (!form.classList.contains("register")) {
        username.setAttribute("tabindex", "0");
        email.setAttribute("tabindex", "0");
        password.setAttribute("tabindex", "0");
        password2.setAttribute("tabindex", "0");
        login.setAttribute("tabindex", "0");
        register.setAttribute("tabindex", "0");

        form.classList.remove("login");
        form.classList.add("register");
        form.classList.add("expanded");
        form.classList.add("has-been-expanded");
    } else {
        var a = false, b = false, c = false, d = false;
        if (!a) a = validate("empty",       "You should fill this in",                  username            );
        if (!a) a = validate("longerThan",  "Keep it below 30",                         username,  30       );
        if (!b) b = validate("empty",       "We need your email",                       email               );
        if (!b) b = validate("longerThan",  "Maximum 60 characters :/",                 email,     60       );
        if (!b) b = validate("notEmail",    "That's email isn't valid",                 email               );
        if (!c) c = validate("shorterThan", "That's a bit short... Try 8 characters",   password,  8        );
        if (!c) c = validate("longerThan",  "You crossed the 100 characters line",      password,  100      );
        if (!d) d = validate("noMatch",     "The passwords do not match",               password2, password );
        if (!a && !b && !c && !d) {
            var req =
            "type=register"+
            "&username="+username.value+
            "&email="+email.value+
            "&password="+password.value+
            "&password2="+password2.value;

            xhr(req, "/register", function(res) {
                var errors = JSON.parse(res).errors;
                if (errors) {
                    if (errors.username == "empty") displayErr("username", "You should fill this in");
                    if (errors.username == "long") displayErr("username", "Keep it below 30");
                    if (errors.username == "exist") displayErr("username", "Unavailable username");
                    if (errors.email == "invalid") displayErr("email", "That email isn't valid");
                    if (errors.email == "empty") displayErr("email", "We need your email");
                    if (errors.email == "long") displayErr("email", "Maximum 60 characters :/");
                    if (errors.email == "exist") displayErr("email", "Email already exists");
                    if (errors.password == "short") displayErr("password", "That's a bit short... Try 8 characters");
                    if (errors.password == "long") displayErr("password", "You crossed the 100 characters line");
                    if (errors.password2 == "match") displayErr("password2", "The passwords do not match");
                } else {
                    success.innerHTML = "Registration complete";
                    success.classList.add("visible");
                }
            });
        }
    }
}

function initHome(res) {
    if (loggedIn) {
        insertPlaylists(res.playlists, true);
        insertTracks(res.tracks, true);
        document.title = "Ferrum";
    } else {
        document.title = "Ferrum";
    }
}
