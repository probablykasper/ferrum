const mysql = require("mysql");
const connection = mysql.createConnection({
  host     : 'db',
  port     : '3306',
  user     : 'api',
  password : 'nXPwPs4e22*W2j42c9sdWa8FuII4y',
  database : 'ferrum'
});
connection.connect(function(err) {
    if (err) console.error("error connecting: "+err.stack);
});
// function query(sql, fields = "") {
//     var result = {};
//     connection.query(sql, fields, function(error, results, fields) {
//         if (error) throw error;
//         else result = {results: results, fields: fields};
//     });
//     console.log(result);
// }
connection.query("SELECT * FROM users WHERE id = 4", function(err, result) {
    const links = [
        {
            id: result[0].id,
            url: 'http://graphql.org/',
            description: 'The Best Query Language'
        },
        {
            id: 2,
            url: 'http://dev.apollodata.com',
            description: 'Awesome GraphQL Client'
        },
    ];

    module.exports = {
        Query: {
            allLinks: () => links,
        }
    };
});
