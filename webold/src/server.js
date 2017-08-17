const path = require("path");

const express = require("express");
const passport = require("passport");
const bodyParser = require("body-parser");
const validator = require("validator");
const session = require("express-session");
const flash = require("connect-flash");

const db = require("./db");
const pug = require("./pug");
const compile = require("./compile");


compile.dir("pages");

// Init server
const app = express();

// load view engine
app.set("views", "pages");
app.set("view engine", "pug");

// js/css/favicons
app.use("/", express.static("static/", { redirect: false }));
app.use("/", express.static("static/favicon/", { redirect: false }));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

// passport init
app.use(passport.initialize());
app.use(passport.session());

// express session
app.use(session({
  secret: 'bananaboy',
  resave: false,
  saveUninitialized: true,
  cookie: {}
}));
// cookie: {secure: true} for production (HTTPS required)

// express messages
app.use(require("connect-flash")());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

function page(url, pugOptions = {}) {
    app.get(`${url}`, (req, res) => {
        // remove query and last slash if it exists
        global.reqPath = req.url.split("?")[0];
        if (global.reqPath == "/") global.reqPath = "";
        pugOptions.filters = {
            "head": pug.head,
            "js": pug.js
        };
        if (url == "/") res.render("index", pugOptions)
        else {
            let renderPath = global.reqPath.substr(1);
            res.render(renderPath+"/index", pugOptions);
        }
    });
}
page("/");
page("/music");

app.post("/", (req, res) => {
    if (req.body.type == "login") {
        let username = req.body.username;
        let password = req.body.password;
        let errors = {};
        if (validator.isEmpty(username))                errors.username = "empty";
        if (!validator.isLength(username, {max: 30}))   errors.username = "long";
        if (!validator.isLength(password, {min: 8}))    errors.password = "short";
        if (!validator.isLength(password, {max: 100}))  errors.password = "long";
        db.query("SELECT users.username FROM users WHERE username = ?", [username], function(err, result) {
            if (!result[0]) errors.username = "exist";
            if (errors.username || errors.email || errors.password || errors.password2) {
                res.json({ "errors": errors });
            } else {
                req.flash("success", "WOAH FANCY");
                res.redirect("/");
            }
        });
    } else if (req.body.type == "register") {
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
    }
});

// start server
app.listen(80, function() {
    console.log("Express server listening");
});
