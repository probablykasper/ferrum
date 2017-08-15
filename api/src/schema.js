var { buildSchema } = require("graphql");

var schema = buildSchema(`
    type Playlist {
        owner: User
        name: String
        description: String
        isAuto: Boolean
        tracks: [Track]
    }
    type Track {
        owner: User
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

module.exports = schema;
