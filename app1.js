const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt');
//const bodyParser = require('body-parser');

const saltRounds = 10; // for hashing pass
const mySecret = "super_secret0001";

const app = express();
app.use(express.static('static'));
app.use(express.urlencoded({ extended: true }));
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

app.set('views', __dirname+'/templates');
app.set('view engine', 'ejs');


app.get('/',(req,res)=>{
  const token = req.cookies['token'];
  if (!token) res.redirect("/login");
  jwt.verify(token, mySecret, function(err, decoded) {
    if (err) res.redirect("/login");
    if(decoded['role']==0)res.render('about', { header: 'header_user' });
    else res.render('about', { header: 'header_admin' });
  });
});

app.get('/about',(req,res)=>{
  var token = req.cookies['token'];
  if (!token) res.redirect("/login");
  jwt.verify(token, mySecret, function(err, decoded) {
    if (err) res.redirect("/login");
    else{
    if(decoded['role']==0)res.render('about', { header: 'header_user' });
    else res.render('about', { header: 'header_admin' });
    }
  });
});

/************
ADD-PRODUCT API
************/
app.get('/add-product',(req,res)=>{
  const token = req.cookies['token'];
  if (!token) res.redirect("/login");
  jwt.verify(token, mySecret, function(err, decoded) {
    if (err) res.redirect("/login");
    else{
      if(decoded['role']==1)res.render('add-product', { header: 'header_admin'});
      else res.redirect("/products");
    }
  });
});
const createProduct = (request, response) => {
  const { title, price } = request.body
  pool.query('INSERT INTO products (title, price) VALUES ($1, $2)', [title, price], (error, results) => {
    try{
      if (error) {
        throw error
      }
      response.redirect("/products")
    }catch (e){
      console.log(e);
      response.redirect("/add-product");}
    });

}
app.post('/add-product', createProduct)
/************
HISTORY API
************/
app.get('/history',(req,res)=>{
  const token = req.cookies['token'];
  if (!token) res.redirect("/login");
  jwt.verify(token, mySecret, function(err, decoded) {
    if (err) res.redirect("/login");
    else{
    pool.query('select * from history join products on history.product_id = products.id  where user_id=$1', [decoded['id']], (error, results) => {
      console.log(results.rows);
      if(decoded['role']==0)res.render('history', { header: 'header_user' , products: results.rows});
      else res.redirect("/products");
      });
    }
  });
});
const delete_from_history = (request, response) => {
  const token = request.cookies['token'];
  if (!token) response.redirect("/login");
  jwt.verify(token, mySecret, function(err, decoded) {
    if (err) response.redirect("/login");
    else{
    pool.query('DELETE from history where user_id=$1', [decoded['id']], (error, results) => {
      try{
        if (error) {
          throw "Error while deleting from history."
        }
        console.log("Deleted from history.")
      }catch (e){
        console.log(e);}
      });
    }
  });
}
app.post('/history-delete', delete_from_history)

/************
BASKET API
************/
app.get('/basket',(req,res)=>{
  const token = req.cookies['token'];
  if (!token) res.redirect("/login");
  jwt.verify(token, mySecret, function(err, decoded) {
    if (err) res.redirect("/login");
    else{
    pool.query('select basket.id, title, price, products.id as product_id from basket join products on basket.product_id = products.id  where user_id=$1', [decoded['id']], (error, results) => {
      if(decoded['role']==0)res.render('basket', { header: 'header_user' , products: results.rows});
      else res.redirect("/products");
      });
    }
  });
});
const delete_from_basket = (request, response) => {
  const token = request.cookies['token'];
  if (!token) response.redirect("/login");
  jwt.verify(token, mySecret, function(err, decoded) {
    if (err) response.redirect("/login");
    else{
    pool.query('DELETE from basket where id=$1', [request.body['item_id']], (error, results) => {
      try{
        if (error) {
          throw "Error while deleting from basket."
        }
        pool.query('INSERT INTO history (user_id, product_id, status, date) VALUES ($1, $2, $3, $4)',
        [decoded['id'], request.body['product_id'], 0, new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')], (error, results) => {
          try{
            if (error) {
              throw error
            }
            console.log("Added to history: "+request.body['item_id']);
          }catch (e){
            console.log(e);}
          });
        console.log("Deleted from basket: "+request.body['item_id']);
      }catch (e){
        console.log(e);}
      });
    }
  });
}
const buy_all_from_basket = (request, response) => {
  const token = request.cookies['token'];
  if (!token) response.redirect("/login");
  jwt.verify(token, mySecret, function(err, decoded) {
    if (err) response.redirect("/login");
    else{
      pool.query('SELECT * FROM basket where user_id=$1',[decoded['id']], (error, results1) => {
        try{
          if (error) {
            throw "Error while selecting all from basket."
          }
          for (i = 0; i < results1.rows.length; i++) {
            pool.query('INSERT INTO history (user_id, product_id, status, date) VALUES ($1, $2, $3, $4)',
            [decoded['id'], results1.rows[i]['product_id'], 1, new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')], (error, results) => {
              try{
                if (error) {throw error}
              }catch (e){
                console.log(e);}});
          }

        }catch (e){
          console.log(e);}
        });

        pool.query('DELETE from basket where user_id=$1', [decoded['id']], (error, results) => {
          try{
            if (error) {
              throw "Error while deleting from basket."
            }
            console.log("Deleted from basket all products for user: "+decoded['id']);
          }catch (e){
            console.log(e);}
          });

    }
  });
}
app.post('/basket-delete', delete_from_basket)
app.post('/basket-buy-all', buy_all_from_basket)

/************
PRODUCTS USER API
************/
app.get('/products',(req,res)=>{
  const token = req.cookies['token'];
  if (!token) res.redirect("/login");
  jwt.verify(token, mySecret, function(err, decoded) {
    if (err) res.redirect("/login");
    else{
    pool.query('SELECT * FROM products', (error, results) => {
      if(decoded['role']==0)res.render('products', { header: 'header_user' , products: results.rows});
      else res.render('products-admin', { header: 'header_admin' , products: results.rows});
      });
    }
  });
});
const add_to_basket = (request, response) => {
  const token = request.cookies['token'];
  if (!token) response.redirect("/login");
  jwt.verify(token, mySecret, function(err, decoded) {
    if (err) response.redirect("/login");
    else{
    pool.query('INSERT INTO basket (user_id, product_id) VALUES ($1, $2)', [decoded['id'], request.body['item_id']], (error, results) => {
      try{
        if (error) {
          throw "Error while inserting"
        }
        console.log("Added to basket: "+request.body['item_id']);
      }catch (e){
        console.log(e);}
      });
    }
  });
  // const { uname, psw1, psw2 } = request.body
  // const pass_hash = bcrypt.hash(psw1, saltRounds, function (err,   hash){
  //   pool.query('INSERT INTO users (email, password, role) VALUES ($1, $2, $3)', [uname, hash, 0], (error, results) => {
  //     try{
  //       if (error) {
  //         throw "Error while inserting"
  //       }
  //       response.redirect("/login")
  //     }catch (e){
  //       console.log(e);
  //       response.redirect("/signup");}
  //     })
  // });
  console.log(request.body['item_id']);
}
app.post('/products', add_to_basket)

/************
SIGNUP API
************/
app.get('/signup',(req,res)=>{
  var token = req.cookies['token'];
  if (!token){
     res.sendFile(path.join(__dirname+'/static/pages/signup.html'));
  }else{
    jwt.verify(token, mySecret, function(err, decoded) {
      if (err) res.sendFile(path.join(__dirname+'/static/pages/signup.html'));
      else res.redirect('/about')
    });
  }
});
const createUser = (request, response) => {
  const { uname, psw1, psw2 } = request.body
  const pass_hash = bcrypt.hash(psw1, saltRounds, function (err,   hash){
    pool.query('INSERT INTO users (email, password, role) VALUES ($1, $2, $3)', [uname, hash, 0], (error, results) => {
      try{
        if (error) {
          throw "Error while inserting"
        }
        response.redirect("/login")
      }catch (e){
        console.log(e);
        response.redirect("/signup");}
      })
  });
}
app.post('/signup', createUser)

/************
LOGIN API
************/
app.get('/login',(req,res)=>{
  var token = req.cookies['token'];
  if (!token)
  {
    res.sendFile(path.join(__dirname+'/static/pages/login.html'));
  }else{
    jwt.verify(token, mySecret, function(err, decoded) {
      if (err) res.sendFile(path.join(__dirname+'/static/pages/login.html'));
      else
      res.redirect('/about');
    });
  }
});
const getUser = (request, response) => {
  const {uname, psw} = request.body
    pool.query('SELECT * FROM users WHERE email=$1', [uname], (error, results) => {
      try{
        var user_id = results.rows[0]['id'];
        var user_email = results.rows[0]['email'];
        var pass = results.rows[0]['password'];
        var role = results.rows[0]['role'];
        bcrypt.compare(psw, pass, function(err, res) {
          try{
              if (err){
                throw "Password do not match"
              }
              if (res){
                var token = jwt.sign({ id: user_id, role: role}, mySecret, { expiresIn: 86400 });// expires in 24 hours
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
404 API
************/
app.get('*', function(req, res){
   res.status(404).send('what???');
});


/************
START SERVER
************/
app.listen(3000, () => {
  console.log('Bakery store listening on port 3000!');
});
