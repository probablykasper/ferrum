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

function extend(obj, src) {
    for (var key in src) {
        if (src.hasOwnProperty(key)) obj[key] = src[key];
    }
    return obj;
}

// --------------------- GET ---------------------

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
            let values = {
                userID: res.locals.userID,
                name: name,
                description: description
            }
            db.query("INSERT INTO playlists SET ?", [values], function(err, result) {
                if (err) console.log(err);
                else res.json({ "errors": null, "playlistID": result.insertId });
            });
        }
    }
});

app.post("/add-track-to-playlist", (req, res) => {
    if (res.locals.loggedIn) {
        let trackID = req.body.trackID;
        let playlistID = req.body.playlistID;
        let errors = {};
        if (!errors.trackID && !errors.description) {
            let values = {
                playlistID: playlistID,
                trackID: trackID
            }
            let checkTrackOwner = new Promise((resolve, reject) => {
                let query = "SELECT * FROM tracks WHERE userID = ? AND trackID = ?";
                db.query(query, [res.locals.userID, trackID], function(err, result) {
                    if (err) reject(err);
                    else if (result.length == 1) resolve();
                    else if (result.length == 0) reject("noPlaylistResponse");
                });
            });
            let checkPlaylistOwner = new Promise((resolve, reject) => {
                let query = "SELECT * FROM playlists WHERE userID = ? AND playlistID = ?";
                db.query(query, [res.locals.userID, playlistID], function(err, result) {
                    if (err) reject(err);
                    else if (result.length == 1) resolve();
                    else if (result.length == 0) reject("noPlaylistResponse");
                });
            });
            Promise.all([checkTrackOwner, checkPlaylistOwner]).then(() => {
                db.query("INSERT INTO playlistTracks SET ?", [values], function(err, result) {
                    if (err) console.log(err);
                    res.json({ "errors": null });
                });
            }).catch((err) => {
                res.json({ "errors": true });
            });
        }
    }
});

// -------------------- pages --------------------

function resMusicPage(query, queryParams, req, res, pageType, options = {}) {
    if (res.locals.loggedIn) {
        db.query(query, queryParams, function(err, tracks) {
            for (let i = 0; i < tracks.length; i++) {
                if (tracks[i].time.indexOf(0) == "0") tracks[i].time = tracks[i].time.substr(1);
            }
            let query = "SELECT playlistID, name FROM playlists WHERE userID = ?";
            db.query(query, [res.locals.userID], function(err, playlists) {
                res.render("music", extend(options, {
                    tracks: tracks,
                    playlists: playlists,
                    pageType: pageType
                }), function(err, html) {
                    res.send({
                        html: html,
                        title: "Music",
                        initFunc: "initMusic();"
                    });
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
}

app.post("/", (req, res) => {
    let query = `
        SELECT
            trackID,
            name,
            artist,
            TIME_FORMAT(SEC_TO_TIME(time), "%i:%S")
                AS time,
            album, DATE_FORMAT(dateAdded, "%e/%c/%y")
                AS dateAdded,
            plays
        FROM tracks
        WHERE userID = ?`;
    resMusicPage(query, [res.locals.userID], req, res, "tracks");
});

app.post("/playlist/:playlistID", (req, res) => {
    let query = `
        SELECT
            tracks.trackID,
            name,
            artist,
            TIME_FORMAT(SEC_TO_TIME(time), "%i:%S")
                AS time,
            album,
            DATE_FORMAT(dateAdded, "%e/%c/%y")
                AS dateAdded,
            plays
        FROM playlistTracks
        RIGHT JOIN tracks
            ON playlistTracks.trackID = tracks.trackID
        WHERE playlistID = ? AND userID = ?`;
    resMusicPage(query, [req.params.playlistID, res.locals.userID], req, res, "playlist");
});

// start server
app.listen(80, function() {
    console.log("Express server listening");
});
