const validator = require("validator");
const passport = require("passport");
const bcrypt = require("bcryptjs");

const db = require("./db");
require("./passport")(passport);

const crypto = require("crypto");
const base32 = require("base32");
function b32(x) {
    // if      (x == 4) x = 2;
    // else if (x == 7) x = 4;
    // else if (x == 8) x = 5;
    // else if (x == 10) x = 6;
    return base32.encode(crypto.randomBytes(x, "hex"));
}

const multer = require("multer");
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "tracks/");
    },
    filename: function(req, file, cb) {
        file.trackId = b32(6);
        var extension;
        if      (file.mimetype == "audio/wav") extension = ".wav";
        else if (file.mimetype == "audio/mp3") extension = ".mp3";
        else res.err = "wrongExt";
        cb(null, file.trackId+extension);
    }
});
const upload = multer({storage: storage});

const mm = require("music-metadata");
const util = require("util");

const elasticsearch = require("elasticsearch");
const client = new elasticsearch.Client({
    host: "elastic:9200",
    httpAuth: "elastic:changeme",
    apiVersion: "5.5",
    log: "trace"
});

function jsonRes(res, one, two) {
    let resObj = {};
    if (one == "err") {
        resObj.errors = two;
    } else {
        resObj = one;
        one.errors = null;
    }
    res.json(resObj);
}

// -------------------- STATIC --------------------

module.exports.track = (req, res) => {
    res.sendFile("/usr/src/app/tracks/"+req.params.trackId);
}

module.exports.dl = (req, res) => {
    res.download("/usr/src/app/tracks/"+req.params.trackId);
}

// -------------------- SETUP --------------------

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
            WHERE
                userId = ?
                AND inTrash = 0`;
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
                WHERE
                    userId = ?
                    AND inTrash = 0`;
            db.query(tracksQuery, res.locals.userId, (err, tracks) => {
                let response = {
                    playlists: playlists,
                    tracks: tracks
                };
                res.send(JSON.stringify(response));
            });
        });
    }
}

module.exports.playlist = (req, res) => {
    if (res.locals.loggedIn) {
        let playlistsQuery = `
            SELECT
                playlistId,
                name
            FROM playlists
            WHERE
                userId = ?
                AND inTrash = 0`;
        db.query(playlistsQuery, res.locals.userId, (err, playlists) => {
            let tracksQuery = `
                SELECT
                    tracks.trackId,
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
                    ON playlistTracks.trackId = tracks.trackId
                WHERE
                    playlistId = ?
                    AND userId = ?
                    AND inTrash = 0`;
            db.query(tracksQuery, [req.params.playlistId, res.locals.userId], (err, tracks) => {
                let currentPlaylistQuery = `
                    SELECT
                        playlistId,
                        name,
                        description
                    FROM
                        playlists
                    WHERE playlistId = ? AND userId = ?`;
                db.query(currentPlaylistQuery, [req.params.playlistId, res.locals.userId], function(err, playlist) {
                    let response = {
                        playlists: playlists,
                        tracks: tracks,
                        playlist: playlist[0]
                    }
                    res.send(JSON.stringify(response));
                });
            });
        });
    }
}

// -------------------- POSTs --------------------

// ---------- account ----------

module.exports.login = (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    let errors = {};
    if (!validator.isEmail(email))                  errors.email = "invalid";
    if (validator.isEmpty(email))                   errors.email = "empty";
    if (!validator.isLength(email, {max: 60}))      errors.email = "long";
    if (!validator.isLength(password, {min: 8}))    errors.password = "short";
    if (!validator.isLength(password, {max: 100}))  errors.password = "long";


    if (!errors.email && !errors.password) {
        // auth
        req.body.username = email;
        passport.authenticate("local", function(err, user, info) {
            if (err) return console.log(err);
            if (!user) {
                if (info.email) errors.email = info.email;
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
    let email = req.body.email;
    let password = req.body.password;
    let password2 = req.body.password2;
    let errors = {};
    if (!validator.isEmail(email))                  errors.email = "invalid";
    if (validator.isEmpty(email))                   errors.email = "empty";
    if (!validator.isLength(email, {max: 60}))      errors.email = "long";
    if (!validator.isLength(password, {min: 8}))    errors.password = "short";
    if (!validator.isLength(password, {max: 100}))  errors.password = "long";
    if (!validator.equals(password2, password))     errors.password2 = "match";
    db.query("SELECT * FROM users WHERE email = ?", email, function(err, result) {
        if (err) console.log(err);
        if (result[0] && result[0].email == email) errors.email = "exist";
        if (result[1] && result[1].email == email) errors.email = "exist";
        if (!errors.email && !errors.password && !errors.password2) {
            bcrypt.genSalt(10, function(err, salt) {
                if (err) console.log(err);
                bcrypt.hash(password, salt, function(err, hashedPassword) {
                    if (err) console.log(err);
                    let values = {
                        userId: b32(6),
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

// ---------- tracks ----------

function getMD(filepath, callback) {
    mm.parseFile(filepath, {
        duration: true,
        native: true
    }).then(function(md) {
        // console.log(  util.inspect(md, {showHidden: false, depth: null})  );
        function min2(x) {
            if (x.toString().length == 1) return `0${x}`;
            else return x;
        }
        let d = new Date();
        let YYYY = d.getFullYear();
        let MM = min2(d.getMonth()+1);
        let DD = min2(d.getDate());
        let hh = min2(d.getHours());
        let mm = min2(d.getMinutes());
        let ss = min2(d.getSeconds());
        let response = {
            time: Math.round(md.format.duration),
            dateAdded: `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`,
            plays: 0,
            bitrate: md.format.bitrate
        }
        response.name = (md.common.title) ? md.common.title : "";
        response.artist = (md.common.artist) ? md.common.artist : "";
        response.album = (md.common.album) ? md.common.album : "";
        response.genre = (md.common.genre) ? md.common.genre : "";
        callback(response);
    }).catch(function(err) {
        console.log(err);
    });
}
function insertTrack(req, res, filepath, trackId, callback) {
    getMD(filepath, (value) => {
        value.userId = res.locals.userId;
        value.trackId = trackId;
        value.tags = "";
        value.sourcePlatform = "upload";
        value.appearsOn = "";
        var tracksQuery = "INSERT INTO tracks SET ?";
        db.query(tracksQuery, value, function(err, result) {
            if (err) console.log(err);
            else callback();
        });
    });
}
module.exports.uploadTracks = (req, res) => {
    if (res.locals.loggedIn) {
        upload.array("tracks")(req, res, function(err) {
            if (err) {
                console.log(err);
                res.json({ "errors": 23623 });
            } else {
                let uploadedCount = 0;
                function oneUploaded() {
                    uploadedCount++;
                    if (uploadedCount == req.files.length) {
                        res.json({ "errors": null })
                    }
                }
                for (var i = 0; i < req.files.length; i++) {
                    var path = req.files[i].path;
                    var trackId = req.files[i].trackId;
                    insertTrack(req, res, path, trackId, function() {
                        oneUploaded();
                    });
                }
            }
        });
    }
}

module.exports.deleteTrack = (req, res) => {
    if (res.locals.loggedIn) {
        let trackId = req.body.trackId;
        let errors = {};
        if (!errors.playlistId) {
            let tracksQuery = `
                UPDATE tracks
                SET
                    inTrash = 1
                WHERE
                    trackId = ?
                    AND userId = ?`;
            db.query(tracksQuery, [trackId, res.locals.userId], function(err, result) {
                if (err) {
                    res.json({ "errors": true });
                    console.log(err);
                } else if (result[0]) {
                    res.json({ "errors": true });
                } else {
                    res.json({ "errors": null });
                }
            });
        }
    }
}

module.exports.reviveTrack = (req, res) => {
    if (res.locals.loggedIn) {
        let trackId = req.body.trackId;
        let errors = {};
        if (!errors.playlistId) {
            let tracksQuery = `
                UPDATE tracks
                SET
                    inTrash = 0
                WHERE
                    trackId = ?
                    AND userId = ?`;
            db.query(tracksQuery, [trackId, res.locals.userId], function(err, result) {
                if (err) {
                    res.json({ "errors": true });
                    console.log(err);
                } else if (result[0]) {
                    res.json({ "errors": true });
                } else {
                    let responseTrackQuery = `
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
                        WHERE
                            trackId = ?
                            AND userId = ?`;
                    db.query(responseTrackQuery, [trackId, res.locals.userId], (err, tracks) => {
                        res.json({
                            "tracks": tracks,
                            "errors": null
                        });
                    });
                }
            });
        }
    }
}

module.exports.getTrackInfo = (req, res) => {
    if (res.locals.loggedIn) {
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
            WHERE
                userId = ?
                AND trackId = ?
                AND inTrash = 0`;
        db.query(tracksQuery, [res.locals.userId, req.body.trackId], (err, track) => {
            let response = {
                track: track[0]
            };
            res.send(JSON.stringify(response));
        });
    }
}

module.exports.IncrementTrackPlayCount = (req, res) => {
    if (res.locals.loggedIn) {
        let tracksQuery = `
            UPDATE tracks
            SET
                plays = plays + 1
            WHERE
                userId = ?
                AND trackId = ?`;
        db.query(tracksQuery, [res.locals.userId, req.body.trackId], (err, result) => {
            if (err) {
                console.log(err);
                res.json({ "errors": 73942 });
            } else if (result.affectedRows == 0) {
                res.json({ "errors": 27222 });
            } else if (result.affectedRows == 1) {
                res.json({ "errors": null });
            }
        });
    }
}

// ---------- playlists ----------

module.exports.createPlaylist = (req, res) => {
    if (res.locals.loggedIn) {
        let name = req.body.name;
        let description = req.body.description;
        let errors = {};
        if (!errors.name && !errors.description) {
            let values = {
                playlistId: b32(6),
                userId: res.locals.userId,
                name: name,
                description: description
            }
            db.query("INSERT INTO playlists SET ?", [values], function(err, result) {
                if (err) console.log(err);
                else res.json({ "errors": null, "playlistId": result.insertId });
            });
        }
    } else res.json({ "errors": 83623 });
}

module.exports.deletePlaylist = (req, res) => {
    if (res.locals.loggedIn) {
        let playlistId = req.body.playlistId;
        let errors = {};
        if (!errors.playlistId) {
            let playlistQuery = `
                UPDATE playlists
                SET
                    inTrash = 1
                WHERE
                    playlistId = ?
                    AND userId = ?`;
            db.query(playlistQuery, [playlistId, res.locals.userId], function(err, result) {
                if (err) {
                    res.json({ "errors": true });
                    console.log(err);
                } else if (result[0]) {
                    res.json({ "errors": true });
                } else {
                    res.json({ "errors": null });
                }
            });
        }
    } else res.json({ "errors": 49102 });
}

module.exports.revivePlaylist = (req, res) => {
    if (res.locals.loggedIn) {
        let playlistId = req.body.playlistId;
        let errors = {};
        if (!errors.playlistId) {
            let playlistQuery = `
                UPDATE playlists
                SET
                    inTrash = 0
                WHERE
                    playlistId = ?
                    AND userId = ?
                    AND inTrash = 1`;
            db.query(playlistQuery, [playlistId, res.locals.userId], function(err, result) {
                if (err) {
                    res.json({ "errors": true });
                    console.log(err);
                } else if (result[0]) {
                    res.json({ "errors": true });
                } else {
                    res.json({ "errors": null });
                }
            });
        }
    } else res.json({ "errors": 27238 });
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

module.exports.removeTrackFromPlaylist = (req, res) => {
    if (res.locals.loggedIn) {
        let trackId = req.body.trackId;
        let playlistId = req.body.playlistId;
        let errors = {};
        if (!errors.trackId && !errors.description) {
            let checkPlaylistOwner = new Promise((resolve, reject) => {
                let query = "SELECT * FROM playlists WHERE userId = ? AND playlistId = ?";
                db.query(query, [res.locals.userId, playlistId], function(err, result) {
                    if (err) reject(err);
                    else if (result.length == 1) resolve();
                    else if (result.length == 0) reject("noTrackResponse");
                });
            });
            let values = {
                playlistId: playlistId,
                trackId: trackId
            };
            Promise.all([checkPlaylistOwner]).then(() => {
                let deleteQuery = "DELETE FROM playlistTracks WHERE playlistId = ? AND trackId = ?";
                db.query(deleteQuery, [playlistId, trackId], function(err, result) {
                    if (err) console.log(err);
                    else res.json({ "errors": null });
                });
            }).catch((err) => {
                console.log(err);
                res.json({ "errors": true });
            });
        }
    }
}
