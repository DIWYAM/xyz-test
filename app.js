const express = require("express");
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
// const connection = require('express-myconnection');
var mysql = require('mysql');

const app=express();
const admin=require('./routes/admin');
//const pool = require('../config/database');
const PORT=process.env.PORT||3000;

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname,'public')));
app.use(methodOverride('_method'));
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(flash());

app.use(function(req,res,next) {
  res.locals.success_msg=req.flash('success_msg');
  res.locals.error_msg=req.flash('error_msg');
  res.locals.error=req.flash('error');
  res.locals.user=req.user||null;
  next();
});

app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

app.get('/',(req,res)=>{
    res.render("index");
});

app.use('/admin',admin);

app.listen(PORT,()=>{
    console.log(`Server started on port ${PORT}`);
});