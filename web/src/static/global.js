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

function updatePref(preference, value) {
    // eval(`pref.${preference} = ${value}`);
    eval("pref."+preference+" = "+value);
}

document.addEventListener("click", clickLink);
function clickLink(e) {
    if (e.target.classList.contains("link")) {
        changePage(e.target.dataset.href);
    }
}

function initHome(loggedIn = true) {
    if (!loggedIn) {
        var login = document.querySelector("input.login");
        var register = document.querySelector("input.register");
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
                email.setAttribute("tabIndex", "-1");
                password2.setAttribute("tabIndex", "-1");
                username.setAttribute("tabIndex", "1");
                password.setAttribute("tabIndex", "2");
                login.setAttribute("tabIndex", "3");
                register.setAttribute("tabIndex", "4");

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
                            changePage("/music");
                        }
                    });
                }
            }
        }
        login.addEventListener("click", clickLogin);

        function clickRegister() {
            resetMsgs();
            if (!form.classList.contains("register")) {
                username.setAttribute("tabIndex", "1");
                email.setAttribute("tabIndex", "2");
                password.setAttribute("tabIndex", "3");
                password2.setAttribute("tabIndex", "4");
                login.setAttribute("tabIndex", "5");
                register.setAttribute("tabIndex", "6");

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
        "date-added": 95,
        "plays": 60
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

    updateLastNonAuto();
    function updateLastNonAuto() {
        var existingLastNonAuto = document.querySelector(".last-non-auto");
        if (existingLastNonAuto) existingLastNonAuto.classList.remove("last-non-auto");
        var flexibleCols = document.querySelectorAll(".col.flexible-width");
        flexibleCols[flexibleCols.length-1].classList.add("last-non-auto");
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
            }
        });
    }

    columnRearrange();
    function columnRearrange() {
        var musicTable = document.querySelector(".music-table");
        var mouseDown, mousePosX, mouseStartPosX, currentCol, nextCol, moveCount;
        musicTable.addEventListener("mousedown", function(e) {
            if (hasClass(e.target, "cell") && e.target.previousElementSibling == null) {
                e.preventDefault();
                mouseDown = true;
                mousePosX = e.clientX;
                mousePosStartX = mousePosX;
                currentCol = e.target.parentElement;
                nextCol = currentCol.nextElementSibling;
                prevCol = currentCol.previousElementSibling;
                currentCol.classList.add("rearranging");
                musicTable.classList.add("rearranging");
                document.querySelector(".fg").style.pointerEvents = "auto";
                document.querySelector(".fg").style.cursor = "move";
            }
        });
        document.addEventListener("mousemove", function(e) {
            if (mouseDown) {
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
                updateLastNonAuto();
            }
        });
    }

    var logout = document.querySelector(".logout");
    function clickLogout() {
        xhr("", "/logout", function(res) {
            var errors = JSON.parse(res).errors;
            if (errors) console.log(errors);
            else {
                changePage("/");
            }
        });
    }
    logout.addEventListener("click", clickLogout);
}
