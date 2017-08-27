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
    if (req.session && req.session.passport && req.session.passport.user) {
        res.locals.loggedIn = true;
        res.locals.userID = req.session.passport.user;
    } else res.locals.loggedIn = false;
    var path = req.path;
    res.render("template", {
        path: path
    });
});

// -------------------- POSTs --------------------

app.post("*", (req, res, next) => {
    if (req.session && req.session.passport && req.session.passport.user) {
        res.locals.loggedIn = true;
        res.locals.userID = req.session.passport.user;
    } else res.locals.loggedIn = false;
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
});

app.post("/new-playlist", (req, res) => {
    if (res.locals.loggedIn) {
        let name = req.body.name;
        let description = req.body.description;
        let errors = {};
        if (!errors.name && !errors.description) {
            var values = {
                userID: res.locals.userID,
                name: name,
                description: description
            }
            db.query("INSERT INTO playlists SET ?", values, function(err, result) {
                if (err) console.log(err);
                else res.json({ "errors": null });
            });
        }
    }
})

// app.post("/updatepref", (req, res) => {
//     db.query("UPDATE users SET pref=? WHERE userID = ?", [req.body.pref, res.locals.userID], function(err, result) {
//         res.json({ "errors": null });
//     });
// });

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
        var query = `SELECT name, artist, TIME_FORMAT(SEC_TO_TIME(time), "%i:%S") AS time, album, DATE_FORMAT(dateAdded, "%e/%c/%y") AS dateAdded, plays FROM tracks WHERE userID = ?`;
        db.query(query, [res.locals.userID], function(err, result) {
            for (let i = 0; i < result.length; i++) {
                if (result[i].time.indexOf(0) == "0") result[i].time = result[i].time.substr(1);
            }
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
