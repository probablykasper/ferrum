var login = document.querySelector("input.login");
var register = document.querySelector("input.register");
var form = document.querySelector(".form");

var username = document.querySelector("input[name='username']");
var email = document.querySelector("input[name='email']");
var password = document.querySelector("input[name='password']");
var password2 = document.querySelector("input[name='password2']");
var success = document.querySelector(".form .success");

function empty(e, el, msg) {
    if (el.value == "") {
        el.previousElementSibling.innerHTML = msg;
        el.previousElementSibling.classList.add("visible");
        return true;
    } else {
        el.previousElementSibling.classList.remove("visible");
        return false;
    }
}
function noMatch(e, el, el2, msg) {
    if (el.value != el2.value) {
        el.previousElementSibling.innerHTML = msg;
        el.previousElementSibling.classList.add("visible");
        return true;
    } else {
        el.previousElementSibling.classList.remove("visible");
        return false;
    }
}
function shorterThan(e, el, num, msg) {
    if (el.value.length < num) {
        el.previousElementSibling.innerHTML = msg;
        el.previousElementSibling.classList.add("visible");
        return true;
    } else {
        el.previousElementSibling.classList.remove("visible");
        return false;
    }
}
function longerThan(e, el, num, msg) {
    if (el.value.length > num) {
        el.previousElementSibling.innerHTML = msg;
        el.previousElementSibling.classList.add("visible");
        return true;
    } else {
        el.previousElementSibling.classList.remove("visible");
        return false;
    }
}
function notEmail(e, el, msg) {
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

login.addEventListener("click", function(e) {
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
        if (!a) a = empty(e, username, "You should fill this in");
        if (!a) a = longerThan(e, username, 30, "Keep it below 30");
        if (!b) b = shorterThan(e, password, 8, "That's a bit short... Try 8 characters");
        if (!b) b = longerThan(e, password, 100, "You crossed the 100 characters line");

        if (!a && !b) {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var errors = JSON.parse(this.responseText).errors;
                    if (errors) {
                        if (errors.username == "empty") displayErr("username", "You should fill this in");
                        if (errors.username == "long") displayErr("username", "Keep it below 30");
                        if (errors.username == "exist") displayErr("username", "Had trouble finding that user");
                        if (errors.password == "short") displayErr("password", "That's a bit short... Try 8 characters");
                        if (errors.password == "long") displayErr("password", "You crossed the 100 characters line");
                    } else {
                        success.innerHTML = "Login complete";
                        success.classList.add("visible");
                    }
                }
            }
            xhr.open("POST", "/", true);
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhr.send(
                "type=login"+
                "&username="+username.value+
                "&password="+password.value);
        }
    }
});
register.addEventListener("click", function(e) {
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
        if (!a) a = empty(e, username, "You should fill this in");
        if (!a) a = longerThan(e, username, 30, "Keep it below 30");
        if (!b) b = empty(e, email, "We need your email", "emailErr");
        if (!b) b = longerThan(e, email, 60, "Maximum 60 characters :/");
        if (!b) b = notEmail(e, email, "That's email isn't valid");
        if (!c) c = shorterThan(e, password, 8, "That's a bit short... Try 8 characters");
        if (!c) c = longerThan(e, password, 100, "You crossed the 100 characters line");
        if (!d) d = noMatch(e, password2, password, "The passwords do not match");

        if (!a && !b && !c && !d) {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var errors = JSON.parse(this.responseText).errors;
                    if (errors) {
                        if (errors.username == "empty") displayErr("username", "You should fill this in");
                        if (errors.username == "long") displayErr("username", "Keep it below 30");
                        if (errors.username == "exist") displayErr("username", "Unavailable username");
                        if (errors.email == "invalid") displayErr("email", "That email isn't valid");
                        if (errors.email == "empty") displayErr("email", "We need your email");
                        if (errors.email == "long") displayErr("email", "Maximum 60 characters :/");
                        if (errors.password == "short") displayErr("password", "That's a bit short... Try 8 characters");
                        if (errors.password == "long") displayErr("password", "You crossed the 100 characters line");
                        if (errors.password2 == "match") displayErr("password2", "The passwords do not match");
                    } else {
                        success.innerHTML = "Registration complete";
                        success.classList.add("visible");
                    }
                }
            }
            xhr.open("POST", "/", true);
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhr.send(
                "type=register"+
                "&username="+username.value+
                "&email="+email.value+
                "&password="+password.value+
                "&password2="+password2.value);
        }
    }
});
