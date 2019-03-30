const express = require('express');
const router = express.Router();
const session = require("express-session");
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const passport = require('passport');
const formidable = require('formidable');
const fs = require('fs-extra');
const {ensureAuthenticatedAdmin} = require('../helper/auth');

router.get('/',ensureAuthenticatedAdmin(),(req,res)=>{
    res.render('admin/index'); 
});

router.get('/city',ensureAuthenticatedAdmin(),(req,res)=>{
    pool.getConnection((err,db)=>{
        if(err) throw err;
        else{
            db.query('SELECT city FROM cities',(err,result)=>{
                if(err) throw err;
                else{
                    req.session.city = result;
                    res.render('admin/city',{
                        city:result
                    });
                }
            });
        }
    });
});

router.get('/addFleet',ensureAuthenticatedAdmin(),(req,res)=>{
    res.render('admin/addFleet');
});

router.get('/addDriver',(req,res)=>{
    res.render('admin/addDriver');
});

router.get('/addTrans',ensureAuthenticatedAdmin(),(req,res)=>{
    // console.log(req.session.city);
    // var city = JSON.stringify(req.session.city);
    // console.log(city);
    pool.getConnection((err,db)=>{
        if(err) throw err;
        db.query("SELECT * FROM trans_tab",(err,result)=>{
            res.render('admin/addTrans',{
                trans:result,
                city:req.session.city
            });
        });
    });
});

router.get('/search', function(req, res){
    pool.getConnection((err,db)=>{
        if(err) throw err;
        db.query('SELECT city from cities where city like "%'+req.query.key+'%"',(err,rows)=>{
            if (err) throw err;
                var data=[];
            for(i=0;i<rows.length;i++)
            {
            data.push(rows[i].city);
            }
            res.send(JSON.stringify(data));
        });
    });
});

router.get('/vehicles',ensureAuthenticatedAdmin(),(req,res)=>{
    pool.getConnection((err,db)=>{
        if(err) throw err;
        db.query('SELECT id,name,city FROM trans_tab;SELECT type_name,dimension,capacity FROM vehicle_type',(err,result)=>{
            req.session.trans = result[0];
            req.session.type = result[1];
            res.render('admin/vehicles',{
                trans:result[0],
                info:null,
                type:result[1],
                vehicles:null
            });
        });
    });
});

router.post('/login',function(req,res,next){
    pool.getConnection((err,db)=>{
        if(err) throw err;
        var sqlquery = 'SELECT * FROM log_tab WHERE u_id = ?';
        db.query(sqlquery,[req.body.username],(err,result)=>{
            passport.authenticate('admin',{
              successRedirect:'/admin',
              failureRedirect:'/',
              failureFlash:true
            })(req,res,next);
        });
      }); 
});

router.post('/addTrans',function(req,res,next){
    pool.getConnection((err,db)=>{
        if(err) throw err;
        var sqlquery = 'SELECT name FROM trans_tab WHERE name = ?';
        db.query(sqlquery,[req.body.username],(err,result)=>{
            if(err) throw err;
            else if(result.length){
            req.flash('error_msg','Transporter is already registered');
            res.redirect('/admin/addTrans');
            }
            else{
                var trans = {
                    name:req.body.username,
                    password:req.body.password,
                    city:req.body.city,
                    state:req.body.state,
                    fleet_size:req.body.fleet,
                    mob:req.body.mob
                }
                db.query("INSERT INTO trans_tab (name,password,city,state,fleet_size,mob) VALUES (?,?,?,?,?,?)",[trans.name,trans.password,trans.city,trans.state,trans.fleet_size,trans.mob],function(err,result){
                    if (err) {
                      req.flash('error', err)
                    }
                    else{
                      req.flash('success_msg','Transporter Added');
                      res.redirect('/admin/addTrans');
                    }
                  });
            }
        });
    });
});

router.post('/addFleet',function(req,res,next){
    pool.getConnection((err,db)=>{
        if(err) throw err;
        var sqlquery = 'SELECT type_name FROM vehicle_type WHERE type_name = ?';
        db.query(sqlquery,[req.body.fleetType],(err,result)=>{
            if(err) throw err;
            else if(result.length){
            req.flash('error_msg','Transporter is already registered');
            res.redirect('/admin/addTrans');
            }
            else{
                var vehicle = {
                    type_name:req.body.fleetType,
                    capacity:req.body.capacity
                }
                var dimension = `${req.body.l}x${req.body.b}x${req.body.h}`
                db.query("INSERT INTO vehicle_type (type_name,capacity,dimension) VALUES (?,?,?)",[vehicle.type_name,vehicle.capacity,dimension],function(err,result){
                    if (err) {
                      console.log(err);
                    }
                    else{
                      req.flash('success_msg','Vehicle Added');
                      res.redirect('/admin/vehicles');
                    }
                  });
            }
        });
    });
});

router.get('/vehicles/:id',ensureAuthenticatedAdmin(),(req,res)=>{
    pool.getConnection((err,db)=>{
        if(err) throw err;
        var sqlquery = 'SELECT trans_tab.*,vehicle_table.* FROM trans_tab LEFT JOIN vehicle_table ON trans_tab.id=vehicle_table.t_id WHERE trans_tab.id = ?'
        db.query(sqlquery,[req.params.id],(err,result)=>{
            if(err) throw err;
            else{
                req.session.transid = req.params.id;
                req.session.vehicle = result;
                res.render('admin/vehicles',{
                    trans:req.session.trans,
                    type:req.session.type,
                    vehicles:result
                });
            }
        });
    });
});

router.post('/addVehicle',function(req,res,next){
    pool.getConnection((err,db)=>{
        if(err) throw err;
        var form = new formidable.IncomingForm();
        form.keepExtensions = true;
        form.multiples = true;
        form.parse(req,(err,fields,files)=>{
        if (err) throw err;
        var sqlquery1 = 'SELECT v_num FROM vehicle_table WHERE v_num = ?';
        db.query(sqlquery1,[fields.vehicle_num],(err,result)=>{
            if(err) throw err;
            else if(result.length){
                req.flash('error_msg','Vehicle is already registered');
                res.redirect('/admin/vehicles');
            }
            else{
                if(files.pic_rc_back){
                    var oldpath = files.pic_rc_back.path;
                    var newpath = `./public/images/rc_back/${fields.vehicle_num}.jpg`;
                    fs.move(oldpath, newpath)
                        .then(()=>{
                            console.log('Success');
                        })
                        .catch(err => {
                            console.error(err)
                        });
                }
                if(files.pic_rc_front){
                    var oldpath = files.pic_rc_front.path;
                    var newpath = `./public/images/rc_front/${fields.vehicle_num}.jpg`;
                    fs.move(oldpath, newpath)
                        .then(()=>{
                            console.log('Success');
                        })
                        .catch(err => {
                            console.error(err)
                        });
                }
                if(files.pic_v){
                    var oldpath = files.pic_v.path;
                    var newpath = `./public/images/vehicle/${fields.vehicle_num}.jpg`;
                    fs.move(oldpath, newpath)
                        .then(()=>{
                            console.log('Success');
                        })
                        .catch(err => {
                            console.error(err)
                        });
                }
                var vehicle = {
                    v_type:fields.type,
                    v_num:fields.vehicle_num,
                    pic_rc_front:`${fields.vehicle_num}.jpg`,
                    pic_rc_back:`${fields.vehicle_num}.jpg`,
                    pic_v:`${fields.vehicle_num}.jpg`,
                    verif_flag:false,
                    insurance_num:fields.insurance_num,
                    permit_type:fields.permit,
                    active:false,
                    t_id:req.session.transid
                }
                var sqlquery = 'INSERT INTO vehicle_table (v_type,v_num,pic_rc_front,pic_rc_back,pic_v,verif_flag,insurance_num,permit_type,active,t_id) VALUES (?,?,?,?,?,?,?,?,?,?)'
                db.query(sqlquery,[vehicle.v_type,vehicle.v_num,vehicle.pic_rc_front,vehicle.pic_rc_back,vehicle.pic_v,vehicle.verif_flag,vehicle.insurance_num,vehicle.permit_type,vehicle.active,vehicle.t_id],(err,result)=>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        req.flash('success_msg','Vehicle Added');
                        res.redirect(`/admin/vehicles/${req.session.transid}`);
                    }
                });
            }
        });    
    });
    });
});

router.get('/display/:type/:pic',ensureAuthenticatedAdmin(),(req,res)=>{
    res.render('admin/display',{
        type:req.params.type,
        vehicles:req.params.pic
    });
});

router.post('/addCity',(req,res,next)=>{
    pool.getConnection((err,db)=>{
        if(err) throw err;
        else{
            var sqlquery = 'SELECT city FROM cities where city = ?';
            db.query(sqlquery,[req.body.city],(err,result)=>{
                if(err) throw err;
                else if(result.length){
                    req.flash('error_msg','City already registered');
                    res.redirect('/admin/city');
                }
                else{
                    var city = {
                        city:req.body.city,
                        state:req.body.state
                    }
                    var sqlquery1 = 'INSERT INTO cities (state,city) VALUES (?,?)';
                    db.query(sqlquery1,[city.state,city.city],(err,result)=>{
                        if(err) throw err;
                        else{
                            req.flash('success_msg','City Added');
                            res.redirect(`/admin/city`);
                        }
                    });
                }
            });
        }
    })
});

router.get('/logout',(req,res)=>{
    req.logout();
    req.flash('success_msg','You are loged out');
    res.redirect('/');
  });

module.exports=router;