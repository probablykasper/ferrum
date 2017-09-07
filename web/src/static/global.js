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
        if (this.readyState == 4 && this.status == 200) {
            callback(this.responseText);
        }
    }
}
changePage(path, false);
function changePage(path, pushState = true) {
    if (!loggedIn && path == "/") initPage(path);
    else {
        xhr("", path, function(res) {
            res = JSON.parse(res);
            if (!pushState) history.replaceState({path: path}, "exampletitle");
            else history.pushState({path: path}, "sampletitle", path);
            initPage(path);
        });
    }
}
function initPage(path) {
    if (path == "/") initHome();

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

document.addEventListener("click", function(e) {
    var cl = e.target.classList;
    if      (cl.contains("logout-button")) logout();
    else if (e.target.tagName == "BUTTON") {
        if      (cl.contains("login")) clickLogin();
        else if (cl.contains("register")) clickRegister();
    }
});
document.addEventListener("keypress", function(e) {
    if (e.which == 13 && e.target.classList.contains("for-register")) { // enter
        var cl = e.target.parentElement.parentElement.classList;
        if (cl.contains("login")) login();
        else if (cl.contains("register")) register();
    }
});

// LOGIN PAGE
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
function initHome() {
    if (loggedIn) {
        document.title = "Ferrum1";
    } else {
        document.title = "Ferrum2";
    }
}

// MUSIC PAGE
function logout() {
    xhr("", "/logout", function(res) {
        res = JSON.parse(res);
        if (res.errors) console.log(errors);
        else {
            loggedIn = false;
            changePage("/");
        }
    });
}
