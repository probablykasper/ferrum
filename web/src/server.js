// core modules
const path = require("path");
// modules
const bodyParser = require("body-parser");
const validator = require("validator");
// express modules
const express = require("express");
const app = express();
// local modules
const compile = require("./modules/compile");
const db = require("./modules/db");
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

// {"table":{"cols": {"name": {"width": 500000},"time": {"width": "auto"},"artist": {"width": 250000},"album": {"width": 250000},"date-added": {"width": "auto"},"plays": {"width": "auto"}}}}

app.get("\*", (req, res) => {
    var path = req.path;
    if (path == "/") path = "/home";
    db.query("SELECT users.pref FROM users WHERE username = ?", ["kh"], function(err, result) {
        res.render("template", {
            pref: result[0].pref,
            path: path
        });
    });
});

// -------------------- POSTs --------------------

app.post("/login", (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let errors = {};
    if (validator.isEmpty(username))                errors.username = "empty";
    if (!validator.isLength(username, {max: 30}))   errors.username = "long";
    if (!validator.isLength(password, {min: 8}))    errors.password = "short";
    if (!validator.isLength(password, {max: 100}))  errors.password = "long";
    db.query("SELECT users.username FROM users WHERE username = ?", [username], function(err, result) {
        if (!result[0]) errors.username = "exist";
        if (!errors.username || !errors.email || !errors.password || !errors.password2) errors = null;
        res.json({ "errors": errors });
    });
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
    db.query("SELECT users.username FROM users WHERE username = ?", [username], function(err, result) {
        if (result[0]) errors.username = "exist";
        if (!errors.username || !errors.email || !errors.password || !errors.password2) errors = null;
        res.json({ "errors": errors });
    });
});

// -------------------- pages --------------------

app.post("/home", (req, res) => {
    if (req.body.type == "page") {
        res.render("home", function(err, html) {
            res.send(html);
        });
    }
});

app.post("/music", (req, res) => {
    if (req.body.type == "page") {
        res.render("music", function(err, html) {
            res.send(html);
        });
    }
});

// start server
app.listen(80, function() {
    console.log("Express server listening");
});
