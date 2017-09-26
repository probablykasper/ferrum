var localPrefDefault = {
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
localPref = JSON.parse(localStorage.getItem("localPref"));
function xhr(reqContent, url, callback, type = "POST") {
    var xhr = new XMLHttpRequest();
    xhr.open(type, url, true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.send(reqContent);
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) callback(this.responseText);
    }
}

function changePage(link, noPushState = false) {
    var main = document.querySelector("main.container");
    main.classList.remove("ready");
    xhr("type=page", link, function(res) {
        res = JSON.parse(res);
        main.innerHTML = res.html;
        eval(res.initFunc);
        if (noPushState) history.replaceState({path: link}, "exampletitle");
        else history.pushState({path: link}, "sampletitle", link);
        document.title = res.title;
    });
}
window.addEventListener("popstate", function(e) {
    changePage(e.state.path, true);
});

eval("changePage('"+path+"', true)");

function updateLocalPref() {
    localStorage.setItem("localPref", JSON.stringify(localPref));
}

document.addEventListener("click", function(e) {
    if (e.button == 0 && e.target.dataset.href) {
        changePage(e.target.dataset.href);
    }
});

function initHome(loggedIn = true) {
    if (!loggedIn) {
        var login = document.querySelector("button.login");
        var register = document.querySelector("button.register");
        var form = document.querySelector(".form");

        var username = document.querySelector("input[name='username']");
        var email = document.querySelector("input[name='email']");
        var password = document.querySelector("input[name='password']");
        var password2 = document.querySelector("input[name='password2']");
        var success = document.querySelector(".form .success");

        // press enter to submit
        document.addEventListener("keypress", function(e) {
            if (e.which == 13 && e.target.classList.contains("for-register")) { // enter
                if (e.target.parentElement.parentElement.classList.contains("login")) {
                    clickLogin();
                } else if (e.target.parentElement.parentElement.classList.contains("register")) {
                    clickRegister();
                }
            }
        });

        function empty(el, msg) {
            if (el.value == "") {
                el.previousElementSibling.innerHTML = msg;
                el.previousElementSibling.classList.add("visible");
                return true;
            } else {
                el.previousElementSibling.classList.remove("visible");
                return false;
            }
        }
        function noMatch(el, el2, msg) {
            if (el.value != el2.value) {
                el.previousElementSibling.innerHTML = msg;
                el.previousElementSibling.classList.add("visible");
                return true;
            } else {
                el.previousElementSibling.classList.remove("visible");
                return false;
            }
        }
        function shorterThan(el, num, msg) {
            if (el.value.length < num) {
                el.previousElementSibling.innerHTML = msg;
                el.previousElementSibling.classList.add("visible");
                return true;
            } else {
                el.previousElementSibling.classList.remove("visible");
                return false;
            }
        }
        function longerThan(el, num, msg) {
            if (el.value.length > num) {
                el.previousElementSibling.innerHTML = msg;
                el.previousElementSibling.classList.add("visible");
                return true;
            } else {
                el.previousElementSibling.classList.remove("visible");
                return false;
            }
        }
        function notEmail(el, msg) {
            if (!el.value.match(
                "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?")) {
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
                if (!a) a = empty(username, "You should fill this in");
                if (!a) a = longerThan(username, 30, "Keep it below 30");
                if (!b) b = shorterThan(password, 8, "That's a bit short... Try 8 characters");
                if (!b) b = longerThan(password, 100, "You crossed the 100 characters line");

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
                            changePage("/");
                        }
                    });
                }
            }
        }
        login.addEventListener("click", clickLogin);

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
                if (!a) a = empty(username, "You should fill this in");
                if (!a) a = longerThan(username, 30, "Keep it below 30");
                if (!b) b = empty(email, "We need your email", "emailErr");
                if (!b) b = longerThan(email, 60, "Maximum 60 characters :/");
                if (!b) b = notEmail(email, "That's email isn't valid");
                if (!c) c = shorterThan(password, 8, "That's a bit short... Try 8 characters");
                if (!c) c = longerThan(password, 100, "You crossed the 100 characters line");
                if (!d) d = noMatch(password2, password, "The passwords do not match");

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
        register.addEventListener("click", clickRegister);
    }
}

function initMusic() {
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
    var colMinWidths = {
        "name": 100,
        "time": 50,
        "artist": 100,
        "album": 100,
        "dateAdded": 95,
        "plays": 60
    }
    initColPos();
    function initColPos() {
        var cols = localPref.table.cols;
        var colOrder = localPref.table.colOrder;
        var html = "";
        for (var i = 0; i < colOrder.length; i++) {
            html += document.querySelector(".music-table .col."+colOrder[i]).outerHTML;
        }
        document.querySelector(".music-table").innerHTML = html;
    }

    // ROW HOVER
        document.querySelector(".music-table").addEventListener("mouseover", function(e) {
            if (e.target.dataset.trackId) {
                var id = e.target.dataset.trackId;
                var hoveredTrack = document.querySelectorAll('.music-table .cell[data-track-id="'+id+'"]');
                for (var i = 0; i < hoveredTrack.length; i++) {
                    hoveredTrack[i].classList.add("hover");
                }
            }
        });
        document.querySelector(".music-table").addEventListener("mouseout", function(e) {
            if (e.target.dataset.trackId) {
                var id = e.target.dataset.trackId;
                var hoveredTrack = document.querySelectorAll('.music-table .cell[data-track-id="'+id+'"]');
                for (var i = 0; i < hoveredTrack.length; i++) {
                    hoveredTrack[i].classList.remove("hover");
                }
            }
        });

    updateLastNonAuto();
    function updateLastNonAuto() {
        var existingLastNonAuto = document.querySelector(".last-non-auto");
        if (existingLastNonAuto) existingLastNonAuto.classList.remove("last-non-auto");
        var flexibleCols = document.querySelectorAll(".col.flexible-width");
        flexibleCols[flexibleCols.length-1].classList.add("last-non-auto");
    }

    function updateColWitdthPref(grab = false) {
        // grab or set preference?
        var flexibleCols = document.querySelectorAll(".music-table > .col.flexible-width");
        for (var i = 0; i < flexibleCols.length; i++) {
            var colName = flexibleCols[i].classList[1];
            if (grab) flexibleCols[i].style.flexGrow = localPref.table.cols[colName].width;
            else             localPref.table.cols[colName].width = flexibleCols[i].style.flexGrow;
        }
        if (!grab) updateLocalPref();
    }
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
                if (e.button == 0) {
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
                for (var i = 0; i < flexibleCols.length; i++) {
                    flexibleCols[i].style.width = "";
                }
                updateColWitdthPref();
            }
        });
        updateColWitdthPref(true);
    }

    columnRearrange();
    function columnRearrange() {
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
                var colName = cols[i].classList[1];
                localPref.table.colOrder[i] = colName;
                localPref.table.cols[colName].index = i;
            }
            updateLocalPref();
        }
    }

    updateColVisibility();
    function updateColVisibility() {
        for (var i = 0; i < localPref.table.colOrder.length; i++) {
            var col = localPref.table.colOrder[i];
            var colEl = document.querySelector(".music-table .col."+col);
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

    function contextItemClick(context, ctxElement, element) {
        var item = ctxElement.innerHTML;
        var attr = ctxElement.dataset;
        var cl = ctxElement.classList;
        if (context == "table-header") {
            if (attr.col) {
                if (localPref.table.cols[attr.col].visible) {
                    localPref.table.cols[attr.col].visible = false;
                } else {
                    localPref.table.cols[attr.col].visible = true;''
                }
                updateColVisibility();
                updateLocalPref();
            } else if (attr.type == "reset") {
                for (var i = 0; i < localPref.table.colOrder.length; i++) {
                    var col = localPref.table.colOrder[i];
                    localPref.table.cols[col].width = localPrefDefault.table.cols[col].width
                }
                updateColWitdthPref(true);
                updateColWitdthPref();
            }
        } else if (context == "track") {
            if (attr.playlistId) {
                var req =
                "trackID="+element.dataset.trackId+
                "&playlistID="+ctxElement.dataset.playlistId;
                xhr(req, "/add-track-to-playlist", function(res) {
                    var res = JSON.parse(res);
                    if (res.errors) {
                        console.log(res.errors);
                    } else {
                        console.log("added");
                        closeDialog();
                    }
                });
            }
        } else if (context == "playlist") {
            if (attr.type == "delete") {
                var req = "playlistID="+ctxElement.dataset.playlistId;
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
        var currentContextMenu = undefined;
        var clickedContextElement = undefined;
        function insideElement(e, cls) {
            var el = e.target;
            if (el.classList && el.classList.contains(cls)) {
                return true;
            } else {
                while (el = el.parentElement) {
                    if (el.classList && el.classList.contains(cls)) {
                        return true;
                    }
                }
            }
            return false;
        }
        function insideDataset(e, dataset) {
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

        document.addEventListener("contextmenu", function(e) {
            var contextMenu = insideDataset(e, "contextMenu");
            if (contextMenu) {
                e.preventDefault();
                openContextMenu(contextMenu, e.clientX, e.clientY, e.target);
            } else {
                closeContextMenu();
            }
        });
        document.addEventListener("click", function(e) {
            if (e.target.classList.contains("context-item") && !e.target.classList.contains("arrow")) {
                contextItemClick(currentContextMenu, e.target, clickedContextElement);
                closeContextMenu();
            }
        });
        (function() { // triggers to close context menu
            document.addEventListener("mousedown", function(e) {
                if (!insideElement(e, "context-menu")) closeContextMenu();
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
                } else if (!insideElement(e, "context-submenu") && insideElement(e, "context-menu")) {
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
                    if (y + ctxItemPos - itemHeight + submenu.clientHeight > window.innerHeight) {
                        var submenuEndPos = y + ctxItemPos - itemHeight + submenu.clientHeight;
                        submenu.style.top = window.innerHeight - submenuEndPos - padding - 10+"px";
                    }

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

    sidebar();
    function sidebar() {
        var sidebar = document.querySelector("aside.sidebar");
        var resizer = document.querySelector("aside.sidebar .sidebar-resizer");
        var mainContent = document.querySelector("main.content");
        sidebar.style.width = localPref.sidebar.width+"px";
        mainContent.style.width = "calc(100% - "+localPref.sidebar.width+"px)";
        if (!localPref.sidebar.visible) {
            sidebar.classList.add("hidden");
            mainContent.style.width = "100%";
        }
        var mouseDown, mousePosX, mousePosStartX, oldWidth;
        resizer.addEventListener("mousedown", function(e) {
            e.preventDefault();
            mouseDown = true;
            mousePosX = e.clientX;
            mousePosStartX = mousePosX;
            oldWidth = sidebar.clientWidth;
        });
        document.addEventListener("mousemove", function(e) {
            if (mouseDown) {
                mousePosX = e.clientX;
                var widthDifference = mousePosStartX - mousePosX;
                var newWidth = oldWidth + widthDifference;
                if (newWidth < 150) newWidth = 150;
                if (newWidth > window.innerWidth/2) newWidth = Math.floor(window.innerWidth/2);
                mainContent.style.width = "calc(100% - "+newWidth+"px)";
                sidebar.style.width = newWidth+"px";
            }
        });
        document.addEventListener("mouseup", function() {
            if (mouseDown) {
                mouseDown = false;
                localPref.sidebar.width = sidebar.clientWidth;
                updateLocalPref();
            }
        });
        var button = document.querySelector("header.app-bar .playlists");
        button.addEventListener("click", function() {
            mainContent.classList.add("transitioning");
            if (sidebar.classList.contains("hidden")) {
                mainContent.style.width = "calc(100% - "+localPref.sidebar.width+"px)";
                localPref.sidebar.visible = true;
            } else {
                mainContent.style.width = "100%";
                localPref.sidebar.visible = false;
            }
            sidebar.classList.toggle("hidden");
            updateLocalPref();
            setTimeout(function() {
                mainContent.classList.remove("transitioning");
            }, 150);
        });
        // createPlaylistButton
        var cpb = document.querySelector(".sidebar button.create-playlist");
        cpb.addEventListener("click", function() {
            openDialog("createPlaylist");
        });
    }

    var fg = document.querySelector(".fg");
    var cp = document.querySelector(".fg .createPlaylist");
    var cpName = cp.querySelector("input.name");
    var cpDescription = cp.querySelector("textarea.description");
    fg.addEventListener("click", function(e) {
        if (e.target.classList.contains("cancel")) {
            closeDialog();
        } else if (e.target.classList.contains("create")) {
            var req =
            "name="+cpName.value+
            "&description="+cpDescription.value;
            xhr(req, "/new-playlist", function(res) {
                var res = JSON.parse(res);
                if (res.errors) {
                    console.log(res.errors);
                } else {
                    var sidebarItem = document.createElement("div");
                    sidebarItem.classList.add("item", "playlist");
                    sidebarItem.setAttribute("data-playlist-id", res.playlistID);
                    sidebarItem.innerHTML = cpName.value;
                    document.querySelector("aside.sidebar").append(sidebarItem);

                    var ctxMenus = document.querySelectorAll('.context-menu [data-type="add-to-playlist"]');
                    for (var i = 0; i < ctxMenus.length; i++) {
                        var ctxItem = document.createElement("div");
                        ctxItem.classList.add("context-item");
                        ctxItem.setAttribute("data-playlist-id", res.playlistID);
                        ctxItem.innerHTML = cpName.value;
                        ctxMenus[i].append(ctxItem);
                    }

                    closeDialog();
                }
            });
        }
    });
    function openDialog(type) {
        fg.classList.add("visible");
        if (type == "createPlaylist") {
            cp.style.display = "block";
            cpName.focus();
        }
    }
    function closeDialog() {
        fg.classList.remove("visible");
        setTimeout(function() {
            cp.style.display = "";
        }, 200);
    }
    // var logout = document.querySelector(".logout");
    // function clickLogout() {
    //     xhr("", "/logout", function(res) {
    //         var errors = JSON.parse(res).errors;
    //         if (errors) console.log(errors);
    //         else {
    //             changePage("/");
    //         }
    //     });
    // }
    // logout.addEventListener("click", clickLogout);
}