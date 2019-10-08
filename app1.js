const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt');
//const bodyParser = require('body-parser');

const saltRounds = 10; // for hashing pass
const mySecret = "super_secret001";

const app = express();
app.use(express.static('static'));
app.use(express.urlencoded());
app.use(cookieParser())

//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended: true,}));

const Pool = require('pg').Pool
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bakery',
  password: '12345',
  port: 5432,
})



app.get('/',(req,res)=>{
  const token = req.cookies['token'];
  if (!token) res.redirect("/login");

  jwt.verify(token, mySecret, function(err, decoded) {
    if (err) res.redirect("/login");
    res.sendFile(path.join(__dirname+'/static/pages/about.html'));
  });
});


app.get('/products',(req,res)=>{
  //console.log(req.cookies['token']);
  const token = req.cookies['token'];
  if (!token) res.redirect("/login");

  jwt.verify(token, mySecret, function(err, decoded) {
    if (err) res.redirect("/login");
    res.sendFile(path.join(__dirname+'/static/pages/products.html'));
  });
});


/************
SIGNUP API
************/
app.get('/signup',(req,res)=>{
  res.sendFile(path.join(__dirname+'/static/pages/signup.html'));
});
const createUser = (request, response) => {
  const { uname, psw1, psw2 } = request.body
  const pass_hash = bcrypt.hash(psw1, saltRounds, function (err,   hash){
    pool.query('INSERT INTO users (email, password, role) VALUES ($1, $2, $3)', [uname, hash, 0], (error, results) => {
      try{
        console.log(results);
        if (error) {
          throw "Error while inserting"
        }
        response.redirect("/login")
      }catch (e){
        console.log(e);
        response.redirect("/signup");}
      })
    // bcrypt.compare(psw1, hash).then(function(res) {
    // console.log(res);});
  });
}
app.post('/signup', createUser)

/************
LOGIN API
************/
app.get('/login',(req,res)=>{
  res.sendFile(path.join(__dirname+'/static/pages/login.html'));
});
const getUser = (request, response) => {
  const {uname, psw} = request.body

    pool.query('SELECT * FROM users WHERE email=$1', [uname], (error, results) => {
      try{
        var user_id = results.rows[0]['id'];
        var user_email = results.rows[0]['email'];
        var pass = results.rows[0]['password'];

        bcrypt.compare(psw, pass, function(err, res) {
          console.log(res);
          try{
              if (err){
                throw "Password do not match"
              }
              if (res){
                var token = jwt.sign({ id: user_id }, mySecret, { expiresIn: 86400 });// expires in 24 hours
                response.cookie('token', token);
                response.redirect("/products");
              } else {
                response.json({message: 'Passwords do not match :c'});
                response.end();
                //response.redirect("/login");
              }
          }catch(e)
          {
            console.log(e);
            response.redirect("/login");
          }
        });
        if (error) {throw "Error while finding user"}
      }catch (e){
        console.log(e);
        response.redirect("/login");}
      });
}
app.post('/login', getUser)

/************
LOGOUT API
************/
app.get('/logout',(req,res)=>{
  res.clearCookie("token");
  res.redirect("/login");
});


/************
START SERVER
************/
app.listen(3000, () => {
  console.log('Bakery store listening on port 3000!');
});
