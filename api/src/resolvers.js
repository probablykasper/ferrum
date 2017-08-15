var db = require("./db");

class Track {
    constructor(track) {
        this.track = track;
    }
    owner() {
        return new User(this.track.userID);
    }
    trackID() {
        return this.track.trackID;
    }
    name() {
        return this.track.name;
    }
    artist() {
        return this.track.artist;
    }
    time() {
        return this.track.time;
    }
    album() {
        return this.track.album;
    }
    dateAdded() {
        return this.track.dateAdded;
    }
    plays() {
        return this.track.plays;
    }
    genre() {
        return this.track.genre;
    }
    tags() {
        return this.track.tags;
    }
    bitrate() {
        return this.track.bitrate;
    }
    sourcePlatform() {
        return this.track.sourcePlatform;
    }
    appearsOn() {
        return this.track.appearsOn;
    }
}
class Playlist {
    constructor(playlist) {
        this.playlist = playlist;
        this.userID = this.playlist.userID;
        this.playlistID = this.playlist.playlistID;
    }
    owner() {
        return new User(this.userID);
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
