var express = require("express");
// var passport = require("passport");
// var localStrategy = require("passport-local").Strategy;
var graphqlHTTP = require("express-graphql");
var { buildSchema } = require("graphql");
var mysql = require("mysql");
var connection = mysql.createConnection({
    host     : "db",
    port     : "3306",
    user     : "api",
    password : "nXPwPs4e22*W2j42c9sdWa8FuII4y",
    database : "ferrum"
});
connection.connect(function(err) {
    if (err) console.log("MySQL error connecting: "+err.stack);
});

var schema = buildSchema(`
    type Playlist {
        name: String
        description: String
        isAuto: Boolean
        tracks: [Track]
    }
    type Track {
        trackID: Int
        name: String
        artist: String
        time: Int
        album: String
        dateAdded: String
        plays: Int
        genre: String
        tags: String
        bitrate: Int
        sourcePlatform: String
        appearsOn: String
    }
    type User {
        username: String
        email: String
        tracks: [Track]
        playlists: [Playlist]
    }
    type Query {
        user(userID: Int!): User
    }
`);
class Track {
    constructor(tracks) {
        this.tracks = tracks;
    }
    trackID() {
        return this.tracks.trackID;
    }
    name() {
        return this.tracks.name;
    }
    artist() {
        return this.tracks.artist;
    }
    time() {
        return this.tracks.time;
    }
    album() {
        return this.tracks.album;
    }
    dateAdded() {
        return this.tracks.dateAdded;
    }
    plays() {
        return this.tracks.plays;
    }
    genre() {
        return this.tracks.genre;
    }
    tags() {
        return this.tracks.tags;
    }
    bitrate() {
        return this.tracks.bitrate;
    }
    sourcePlatform() {
        return this.tracks.sourcePlatform;
    }
    appearsOn() {
        return this.tracks.appearsOn;
    }
}
class Playlist {
    constructor(playlist) {
        this.playlist = playlist;
        this.userID = this.playlist.userID;
        this.playlistID = this.playlist.playlistID;
    }
    name() {
        return this.playlist.name;
    }
    description() {
        return this.playlist.description;
    }
    isAuto() {
        return this.playlist.isAuto;
    }
    tracks() {
        this.tracks = new Promise((resolve, reject) => {
            connection.query(`SELECT * FROM playlistTracks RIGHT JOIN tracks ON playlistTracks.trackID=tracks.trackID WHERE playlistID = ${this.playlistID} AND userID = ${this.userID}`, function(err, result, fields) {
                    console.log(result);
                    resolve(result);
            });
        });
        return this.tracks.then(function(tracks) {
            var output = [];
            for (var i = 0; i < tracks.length; i++) {
                output.push(new Track(tracks[i]));
            }
            return output;
        });
    }
}
class User {
    constructor(userID) {
        this.userID = userID;
        this.result = new Promise((resolve, reject) => {
            connection.query(`SELECT * FROM users WHERE userID = ${this.userID}`, function(err, result, fields) {
                resolve(result[0]);
            });
        });
    }
    username() {
        return this.result.then(function(result) {
            return result.username;
        });
    }
    email() {
        return this.result.then(function(result) {
            return result.email;
        });
    }
    tracks() {
        this.tracks = new Promise((resolve, reject) => {
            connection.query(`SELECT * FROM tracks WHERE userID = ${this.userID}`, function(err, result, fields) {
                resolve(result);
            });
        });
        return this.tracks.then(function(tracks) {
            var output = [];
            for (var i = 0; i < tracks.length; i++) {
                output.push(new Track(tracks[i]));
            }
            return output;
        });
    }
    playlists() {
        this.playlists = new Promise((resolve, reject) => {
            connection.query(`SELECT * FROM playlists WHERE userID = ${this.userID}`, function(err, result, fields) {
                resolve(result);
            });
        });
        return this.playlists.then(function(playlists) {
            var output = [];
            for (var i = 0; i < playlists.length; i++) {
                output.push(new Playlist(playlists[i]));
            }
            return output;
        });
    }
}
var root = {
    user: function({userID}) {
        return new User(userID);
    }
}

var app = express();
app.use("/graphql", graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true
}));
app.listen(80);
console.log("Running GQL API server");
