const LocalStrategy = require("passport-local");
const bcrypt = require("bcryptjs");
const db = require("./db");

module.exports = function(passport) {
    // local strategy
    passport.use(new LocalStrategy(function(username, password, done) {
        // match username
        db.query("SELECT * FROM users WHERE username = ?", [username], function(err, result) {
            if (err) console.log(err);
            if (!result[0]) return done(null, false, {username: "exist"});

            // match password
            bcrypt.compare(password, result[0].password, function(err, isMatch) {
                if (err) console.log(err);
                if (isMatch) return done(null, result[0]);
                else return done(null, false, {password: "incorrect"});
            });
        });
    }));

    passport.serializeUser(function(user, done) {
        done(null, user.userId);
    });

    passport.deserializeUser(function(userId, done) {
        db.query("SELECT * FROM users WHERE userId = ?", [userId], function(err, result) {
            done(err, result[0]);
        });
    });

}
