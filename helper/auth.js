module.exports = {
    ensureAuthenticatedAdmin:function(){
    return function(req,res,next){
      // console.log(req.user);
      if(req.isAuthenticated() && req.user.flag=='0'){
        return next();
      }
      else{
        req.logout();
        req.flash('error_msg','Not Authorized');
        res.redirect('/');
      }
    }
  }
}