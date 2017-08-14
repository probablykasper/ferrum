var db = require("./db");

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
            db.query(`SELECT * FROM playlistTracks RIGHT JOIN tracks ON playlistTracks.trackID=tracks.trackID WHERE playlistID = ${this.playlistID} AND userID = ${this.userID}`, function(err, result, fields) {
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
            db.query(`SELECT * FROM users WHERE userID = ${this.userID}`, function(err, result, fields) {
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
            db.query(`SELECT * FROM tracks WHERE userID = ${this.userID}`, function(err, result, fields) {
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
            db.query(`SELECT * FROM playlists WHERE userID = ${this.userID}`, function(err, result, fields) {
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
module.exports = root;
