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
    type Query {
        hello: String
        random: Float!
        rollDice(numDice: Int!, numSides: Int): [Int]
        test(id: Int!): String
    }
`);

var root = {
    hello: () => {
        return "hey";
    },
    random: () => {
        return Math.random();
    },
    rollDice: function({numDice, numSides}) {
        var output = [];
        for (var i = 0; i < numDice; i++) {
            output.push(1 + Math.floor(Math.random() * (numSides || 6)));
        }
        return output;
    }
};
connection.query("SELECT * FROM users WHERE id = 4", function(err, result, fields) {
    root.test = function() {
        return result[0].username;
    }

    var app = express();
    app.use("/graphql", graphqlHTTP({
        schema: schema,
        rootValue: root,
        graphiql: true
    }));
    app.listen(80);
    console.log("Running GQL API server");
});
