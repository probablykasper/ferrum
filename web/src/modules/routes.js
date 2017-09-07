const validator = require("validator");
const passport = require("passport");
const bcrypt = require("bcryptjs");

const db = require("./db");
require("./passport")(passport);

// --------------------- SETUP ---------------------

module.exports.getSetup = (req, res) => {
    if (req.session && req.session.passport && req.session.passport.user) {
        res.locals.loggedIn = true;
        res.locals.userID = req.session.passport.user;
    } else {
        res.locals.loggedIn = false;
        res.locals.userID = null;
    }
    res.render("template", {
        path: req.path,
        loggedIn: res.locals.loggedIn
    });
}

module.exports.postSetup = (req, res, next) => {
    if (req.session && req.session.passport && req.session.passport.user) {
        res.locals.loggedIn = true;
        res.locals.userID = req.session.passport.user;
    } else {
        res.locals.loggedIn = false;
        res.locals.userID = null;
    }
    next();
}

// -------------------- PAGES --------------------

module.exports.home = (req, res) => {
    if (res.locals.loggedIn) {
        res.send("{}");
    } else {
        res.send("");
    }
}

// -------------------- POSTs --------------------

module.exports.login = (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let errors = {};
    if (validator.isEmpty(username))                errors.username = "empty";
    if (!validator.isLength(username, {max: 30}))   errors.username = "long";
    if (!validator.isLength(password, {min: 8}))    errors.password = "short";
    if (!validator.isLength(password, {max: 100}))  errors.password = "long";

    if (!errors.username && !errors.password) {
        // auth
        passport.authenticate("local", function(err, user, info) {
            if (err) return console.log(err);
            if (!user) {
                if (info.username) errors.username = info.username;
                if (info.password) errors.password = info.password;
                res.json({ "errors": errors });
            } else {
                req.login(user, function(err) {
                    if (err) return console.log(err);
                    res.json({ "errors": null });
                });
            }
        })(req, res);
    } else res.json({ "errors": errors });
}

module.exports.register = (req, res) => {
    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;
    let password2 = req.body.password2;
    let errors = {};
    if (validator.isEmpty(username))                errors.username = "empty";
    if (!validator.isLength(username, {max: 30}))   errors.username = "long";
    if (!validator.isEmail(email))                  errors.email = "invalid";
    if (validator.isEmpty(email))                   errors.email = "empty";
    if (!validator.isLength(email, {max: 60}))      errors.email = "long";
    if (!validator.isLength(password, {min: 8}))    errors.password = "short";
    if (!validator.isLength(password, {max: 100}))  errors.password = "long";
    if (!validator.equals(password2, password))     errors.password2 = "match";
    db.query("SELECT * FROM users WHERE username = ? OR email = ?", [username, email], function(err, result) {
        if (err) console.log(err);
        if (result[0] && result[0].username == username) errors.username = "exist";
        if (result[0] && result[0].email == email) errors.email = "exist";
        if (result[1] && result[1].username == username) errors.username = "exist";
        if (result[1] && result[1].email == email) errors.email = "exist";
        if (!errors.username && !errors.email && !errors.password && !errors.password2) {
            bcrypt.genSalt(10, function(err, salt) {
                if (err) console.log(err);
                bcrypt.hash(password, salt, function(err, hashedPassword) {
                    if (err) console.log(err);
                    var values = {
                        username: username,
                        email: email,
                        password: hashedPassword
                    };
                    db.query("INSERT INTO users SET ?", values, function(err, result) {
                        if (err) console.log(err);
                    });
                    res.json({ "errors": null });
                });
            });
        } else res.json({ "errors": errors });
    });
}

module.exports.logout = (req, res) => {
    req.logout();
    res.json({ "errors": null });
}
