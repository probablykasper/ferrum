var express = require("express");
var app = express();

var graphqlHTTP = require("express-graphql");
var schema = require("./schema");
var resolvers = require("./resolvers");
app.use("/graphql", graphqlHTTP({
    schema: schema,
    rootValue: resolvers,
    graphiql: true
}));
app.listen(80);
console.log("Running GQL API server");
