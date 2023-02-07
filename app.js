//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const FacebookStrategy = require('passport-facebook-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const { name } = require('ejs');

const app = express();

// Initialized some variables
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
mongoose.set('strictQuery', true);

// Initialized session
app.use(session({
    secret: "Our little secrect.",
    resave: false,
    saveUninitialized: false
}));

// Initialize passport
app.use(passport.initialize());

// Connecting session
app.use(passport.session());

// Setting up connection with mongodb at our localhost
mongoose.connect("mongodb://127.0.0.1:27017/userDB", { useNewUrlParser: true });

// Creating the structure of our data-types
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    name: String,
    family_name: String,
    picture: String,
    secret: String
});
// Connect user-schema with passport local mongooses with plugin
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Connecting structure data-types with mongoose model
const User = new mongoose.model('user', userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());

// Initialized serialized and un-serialized sesson using passport local
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

// Google auth code
passport.use(new GoogleStrategy({
    clientID: process.env.G_CLIENT_ID,
    clientSecret: process.env.G_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ googleId: profile.id, name:profile.name.givenName, family_name: profile.name.familyName, picture: profile.photos.value }, function (err, user) {
            return cb(err, user);
        });
    }
));

//Facebook auth
// passport.use(new FacebookStrategy({
//     clientID: process.env.CLIENT_ID,
//     clientSecret: process.env.F.CLIENT_SECRET,
//     callbackURL: "http://localhost:3000/auth/facebook/secrets"
//   },
//   function(accessToken, refreshToken, profile, cb) {
//     User.findOrCreate({ facebookId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

// Home route
app.get('/', function (req, res) {
    res.render('home');
})

// Auth by google
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));


app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect secrets.
        res.redirect('/secrets');
    });

// Login route
app.get('/login', function (req, res) {
    res.render('login');
});

// Register route
app.get('/register', function (req, res) {
    res.render('register');
});

// secrets route where we check for user session credentials
app.get('/secrets', function (req, res) {
    User.find({'secrets':{$ne: null}}, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                res.render('secrets', {userWithSecrets: foundUser})
            }
        }
    });
});

// Authenticate user at the time of registration
app.post('/register', function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect('/register');
        }
        else {
            passport.authenticate('local')(req, res, function () {
                res.redirect('/secrets');
            });
        }
    });
});

// Authenticate the user at the time of login
app.post('/login', function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate('local')(req, res, function () {
                res.redirect('/secrets');
            });
        }
    });

});

app.get('/submit',function(req,res){
    if (req.isAuthenticated(true)) {
        res.render('submit');
    }
    else {
        res.redirect('login');
    }
});

app.post('/submit', function(req,res){
    const submittedSecret = req.body.secret;
    console.log(submittedSecret);
    console.log(req.user.id);
    User.findById(req.user.id, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect('/secrets');
                });
            }
        }
    });
});

//logout route for logout user
app.get('/logout', function (req, res) {
    res.redirect('/');
});
// Listening through the port 3000 at our localhost
app.listen(3000, function () {
    console.log('Server stated at port 3000.');
});