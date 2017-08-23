// core modules
const path = require("path");
// modules
const bodyParser = require("body-parser");
const validator = require("validator");
const passport = require("passport");
const bcrypt = require("bcryptjs");

// express modules
const express = require("express");
const session = require("express-session");
const mySQLstore = require("express-mysql-session")(session);
const app = express();
// local modules
const compile = require("./modules/compile");
const db = require("./modules/db");
require("./modules/passport")(passport);
compile();

// load view engine
app.set("views", "pug");
app.set("view engine", "pug");

// static content
app.use("/", express.static("static/", { redirect: false }));
app.use("/", express.static("static/favicon/", { redirect: false }));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());


// express session
let sessionStore = new mySQLstore({
    host: "db",
    port: "3306",
    user: "sess",
    password: "0hBXABnVzSk/s$728",
    database: "ferrum"
});
app.use(session({
    key: "sess",
    secret: 'bananaboy',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {}
}));
// cookie: {secure: true} for production (HTTPS required)

// passport
app.use(passport.initialize());

app.get("*", (req, res) => {
    res.locals.loggedIn = req.session.passport.user ? true : false;
    if (res.locals.loggedIn) res.locals.userID = req.session.passport.user;

    var path = req.path;
    if (res.locals.loggedIn) {
        db.query("SELECT users.pref FROM users WHERE userID = ?", [res.locals.userID], function(err, result) {
            res.render("template", {
                pref: result[0].pref,
                path: path
            });
        });
    } else {
        res.render("template", {
            pref: `""`,
            path: path
        });
    }
});

// -------------------- POSTs --------------------

app.post("*", (req, res, next) => {
    res.locals.loggedIn = req.session.passport.user ? true : false;
    if (res.locals.loggedIn) res.locals.userID = req.session.passport.user;
    next();
});

app.post("/login", (req, res) => {
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
});

app.post("/logout", (req, res) => {
    req.logout();
    res.json({ "errors": null });
});

app.post("/register", (req, res) => {
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
                        password: hashedPassword,
                        pref: `{"table":{"cols":{"name":{"width":500000},"time":{"width":"auto"},"artist":{"width":250000},"album": {"width":250000},"dateAdded":{"width":"auto"},"plays":{"width":"auto"}}}}`
                    };
                    db.query("INSERT INTO users SET ?", values, function(err, result) {
                        if (err) console.log(err);
                    });
                    res.json({ "errors": null });
                });
            });
        } else res.json({ "errors": errors });
    });
});

app.post("/updatepref", (req, res) => {
    db.query("UPDATE users SET pref=? WHERE userID = ?", [req.body.pref, res.locals.userID], function(err, result) {
        res.json({ "errors": null });
    });
});

// -------------------- pages --------------------

app.post("/", (req, res) => {
    res.render("home", function(err, html) {
        res.send({
            html: html,
            title: "Ferrum",
            initFunc: `initHome(${res.locals.loggedIn});`
        });
    });
});

app.post("/music", (req, res) => {
    if (res.locals.loggedIn) {
        var cols = `name, artist, time, album, DATE_FORMAT(dateAdded, "%e/%c/%y") AS dateAdded, plays`;
        db.query(`SELECT ${cols} FROM tracks WHERE userID = ?`, [res.locals.userID], function(err, result) {
            console.log(result);
            res.render("music", {
                tracks: result
            }, function(err, html) {
                res.send({
                    html: html,
                    title: "Music",
                    initFunc: "initMusic();"
                });
            });
        });
    } else {
        res.render("home", function(err, html) {
            res.send({
                html: html,
                title: "Ferrum",
                initFunc: `initHome(${res.locals.loggedIn});`
            });
        });
    }
});

// start server
app.listen(80, function() {
    console.log("Express server listening");
});
