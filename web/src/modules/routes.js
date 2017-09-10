const validator = require("validator");
const passport = require("passport");
const bcrypt = require("bcryptjs");

const db = require("./db");
require("./passport")(passport);

// --------------------- SETUP ---------------------

module.exports.getSetup = (req, res) => {
    if (req.session && req.session.passport && req.session.passport.user) {
        res.locals.loggedIn = true;
        res.locals.userId = req.session.passport.user;
    } else {
        res.locals.loggedIn = false;
        res.locals.userId = null;
    }
    res.render("template", {
        path: req.path,
        loggedIn: res.locals.loggedIn
    });
}

module.exports.postSetup = (req, res, next) => {
    if (req.session && req.session.passport && req.session.passport.user) {
        res.locals.loggedIn = true;
        res.locals.userId = req.session.passport.user;
    } else {
        res.locals.loggedIn = false;
        res.locals.userId = null;
    }
    next();
}

// -------------------- PAGES --------------------

module.exports.home = (req, res) => {
    if (res.locals.loggedIn) {
        let playlistQuery = `
            SELECT
                playlistId,
                name
            FROM playlists
            WHERE userId = ?`;
        db.query(playlistQuery, res.locals.userId, (err, playlists) => {
            let tracksQuery = `
                SELECT
                    trackId,
                    name,
                    artist,
                    TIME_FORMAT(SEC_TO_TIME(time), "%i:%S")
                        AS time,
                    album, DATE_FORMAT(dateAdded, "%e/%c/%y")
                        AS dateAdded,
                    plays
                FROM tracks
                WHERE userId = ?`
            db.query(tracksQuery, res.locals.userId, (err, tracks) => {
                let response = {
                    playlists: playlists,
                    tracks: tracks
                }
                res.send(JSON.stringify(response));
            });
        });
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
                    let values = {
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

module.exports.addTrackToPlaylist = (req, res) => {
    if (res.locals.loggedIn) {
        let trackId = req.body.trackId;
        let playlistId = req.body.playlistId;
        let errors = {};
        if (!errors.trackId && !errors.description) {
            let checkTrackOwner = new Promise((resolve, reject) => {
                let query = "SELECT * FROM tracks WHERE userId = ? AND trackId = ?";
                db.query(query, [res.locals.userId, trackId], function(err, result) {
                    if (err) reject(err);
                    else if (result.length == 1) resolve();
                    else if (result.length == 0) reject("noTrackResponse");
                });
            });
            let checkPlaylistOwner = new Promise((resolve, reject) => {
                let query = "SELECT * FROM playlists WHERE userId = ? AND playlistId = ?";
                db.query(query, [res.locals.userId, playlistId], function(err, result) {
                    if (err) reject(err);
                    else if (result.length == 1) resolve();
                    else if (result.length == 0) reject("noPlaylistResponse");
                });
            });
            let values = {
                playlistId: playlistId,
                trackId: trackId
            };
            Promise.all([checkTrackOwner, checkPlaylistOwner]).then(() => {
                db.query("INSERT INTO playlistTracks SET ?", [values], function(err, result) {
                    if (err) {
                        if (err.errno = 1062) res.json({ "errors": {duplicate: true} });
                        else console.log(err);
                    } else {
                        res.json({ "errors": null });
                    }
                });
            }).catch((err) => {
                console.log(err);
                res.json({ "errors": true });
            });
        }
    }
}
