const LocalStrategy=require('passport-local').Strategy;
const bcrypt=require('bcryptjs');
var mysql = require('mysql');
const pool = require('../config/database');

module.exports = 
    function(passport){
        passport.use('admin',new LocalStrategy((username,password,done)=>{
        pool.getConnection((err,db)=>{
        var sqlquery = 'SELECT * FROM log_tab WHERE u_id = ?';
        db.query(sqlquery,[username],(err,result)=>{
            if (result.length){
            bcrypt.compare(password,result[0].pass,(err,isMatch)=>{
                if(err) console.log(err);
                if(isMatch){
                return done(null,result);
                }else {
                return done(null,false,{message:'Incorrect Password'});
                }
            });
            }else{
            return done(null,false,{message:'Incorrect Email'});
            }
        });
        db.release();
        });
    }));

    passport.serializeUser(function(user,done){
        done(null,user[0].id);
      });
    
      passport.deserializeUser(function(uid, done) {
        pool.getConnection((err,db)=>{
          db.query('SELECT * FROM log_tab WHERE id = ?',[uid],function(err,rows){
            if(err){console.log(err);}
            else{
              if(rows.length!=0){ done(err,rows[0]);}
              else{ done(err,null); }
            }
          });
          db.release();
        });
      });
}