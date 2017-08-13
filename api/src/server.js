var express = require("express");
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
    type User {
        username: String
    }
    type Query {
        user: User
    }
`);

class User {
    constructor(id) {
        this.id = id;
    }
    username() {
        return new Promise((resolve, reject) => {
            connection.query("SELECT * FROM users WHERE id = 4", function(err, result, fields) {
                resolve(result[0].username);
            });
        });
    }
}
var root = {
    user: function() {
        return new User();
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
