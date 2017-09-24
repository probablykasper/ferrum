"use strict";
// core modules
const path = require("path");
// modules
const bodyParser = require("body-parser");
const passport = require("passport");
// express modules
const express = require("express");
const session = require("express-session");
const mySQLstore = require("express-mysql-session")(session);
const app = express();
// local modules
const routes = require("./modules/routes");
require("./modules/compile")();



// load view engine
app.set("views", "pug");
app.set("view engine", "pug");

// static content
app.use("/", express.static("static", { redirect: false }));
app.use("/", express.static("static/favicon", { redirect: false }));

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
    secret: "bananaboy",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {}
}));
// cookie: {secure: true} for production (HTTPS required)

// passport
app.use(passport.initialize());

// set up routes
    // STATIC
    app.get("/track/:trackId", routes.track);
    app.get("/dl/:trackId", routes.dl);
    // SETUP
    app.get("*", routes.getSetup);
    app.post("*", routes.postSetup);
    // PAGES
    app.post("/", routes.home);
    app.post("/playlist/:playlistId", routes.playlist);
    // POSTs
        // account
        app.post("/login", routes.login);
        app.post("/register", routes.register);
        app.post("/logout", routes.logout);
        // tracks
        app.post("/upload-tracks", routes.uploadTracks);
        app.post("/delete-track", routes.deleteTrack);
        app.post("/revive-track", routes.reviveTrack);
        app.post("/get-track-info", routes.getTrackInfo);
        // playlists
        app.post("/create-playlist", routes.createPlaylist);
        app.post("/delete-playlist", routes.deletePlaylist);
        app.post("/revive-playlist", routes.revivePlaylist);
        app.post("/add-track-to-playlist", routes.addTrackToPlaylist);
        app.post("/remove-track-from-playlist", routes.removeTrackFromPlaylist);

// start server
app.listen(80, function() {
    console.log("Express server listening");
});
