//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption')

const app = express();

// console.log(process.env.API_KEY);

app.use(express.static('public'));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));
mongoose.set('strictQuery', true);
mongoose.connect("mongodb://127.0.0.1:27017/userDB",{useNewUrlParser: true});

const userSchema = ({
    email: String,
    password:String
});

// userSchema.plugin(encrypt, {           
//     secret: process.env.SECRET,         
//     encryptedFields: ["password"],     
// });


const User = new mongoose.model('user',userSchema);

app.get('/',function(req,res) {
    res.render('home');    
})

app.get('/login',function(req,res){
    res.render('login');
});

app.get('/register',function(req,res){
    res.render('register');
});

app.post('/register',function(req,res){
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });

    newUser.save(function(err){
        if(err){
            console.log(err);
        }else{
            res.render('secrets')
        }
    });

});

app.post('/login',function(req,res){
    const userName = req.body.username;
    const password = req.body.password;

    User.findOne({email:userName},function(err,foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                if(foundUser.password === password){
                    res.render('secrets');
                }else{
                    console.log('Password not valid!');
                }
            }else{
                console.log('User not found!');
            }
        }
    });
});

app.listen(3000,function() {
    console.log('Server stated at port 3000.');
});