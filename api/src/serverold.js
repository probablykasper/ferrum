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
    type RandomDie {
        numSides: Int!
        rollOnce: Int!
        roll(numRolls: Int!): [Int]
    }
    type Query {
        getDie(numSides: Int): RandomDie
    }
`);

class RandomDie {
    constructor(numSides) {
        this.numSides = numSides;
    }

    rollOnce() {
        return 1 + Math.floor(Math.random() * this.numSides);
    }

    roll({numRolls}) {
        var output = [];
        for (var i = 0; i < numRolls; i++) {
            output.push(this.rollOnce());
        }
        return output;
    }
}

var root = {
    getDie: function({numSides}) {
        return new RandomDie(numSides || 6);
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
