var createError = require('http-errors');
var express = require('express');
var http = require('http');
var path = require('path');
var crypto = require('crypto')
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var mongojs = require('mongojs')

var mongojs = require('mongojs')
var db = mongojs('blog', ['post']);

var app = express();

// view engine setup
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});
app.get('/', function(req, res) {
  var fields = { subject: 1, created: 1, author: 1 };
  db.post.find({ state: 'published'}, fields, function(err, posts) {
    if (!err && posts) {
      res.render('index.jade');
    }
  });
});
app.param('postid', function(req, res, next, id) {
   db.post.findOne({ _id: db.ObjectId(id) }, function(err, post) {
    if (err) return next(new Error('Make sure you provided correct post id'));
    if (!post) return next(new Error('Post loading failed'));
    req.post = post;
    next();
  });
});
 
app.get('/post/:postid', function(req, res) {
  res.render('show.jade', {
    title: 'Showing post - ' + req.post.subject,
    post: req.post
  });
});

app.post('/post/comment', function(req, res) {
  var data = {
      name: req.body.name
    , body: req.body.comment
    , created: new Date()
  };
  db.post.update({ _id: db.ObjectId(req.body.id) }, {
    $push: { comments: data }}, { safe: true }, function(err, field) {
      res.redirect('/');
  });
});

function isUser(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    next(new Error('You must be user to access this page'));
  }
}

app.get('/login', function(req, res) {
  res.render('login.jade', {
    title: 'Login user'
  });
});
 
app.get('/logout', isUser, function(req, res) {
  req.session.destroy();
  res.redirect('/');
});
 
app.post('/login', function(req, res) {
  var select = {
      user: req.body.username
    , pass: crypto.createHash('sha256').update(req.body.password + conf.salt).digest('hex')
  };
 
  db.user.findOne(select, function(err, user) {
    if (!err && user) {
      // Found user register session
      req.session.user = user;
      res.redirect('/');
    } else {
      // User not found lets go through login again
      res.redirect('/login');
    }
 
  });
});

app.get('/post/add', isUser, function(req, res) {
  res.render('add.jade', { title: 'Add new blog post '});
});
 
app.post('/post/add', isUser, function(req, res) {
  var values = {
      subject: req.body.subject
    , body: req.body.body
    , tags: req.body.tags.split(',')
    , state: 'published'
    , created: new Date()
    , modified: new Date()
    , comments: []
    , author: {
        username: req.session.user.user
    }
  };
 
  db.post.insert(values, function(err, post) {
    console.log(err, post);
    res.redirect('/');
  });
});

app.get('/post/edit/:postid', isUser, function(req, res) {
res.render('edit.jade', { title: 'Edit post', blogPost: req.post } );
});
 
app.post('/post/edit/:postid', isUser, function(req, res) {
db.post.update({ _id: db.ObjectId(req.body.id) }, {
$set: {
subject: req.body.subject
, body: req.body.body
, tags: req.body.tags.split(',')
, modified: new Date()
}}, function(err, post) {
res.redirect('/');
});
});

app.get('/post/delete/:postid', isUser, function(req, res) {
  db.post.remove({ _id: db.ObjectId(req.params.postid) }, function(err, field) {
    res.redirect('/');
  });
});
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

module.exports = app;
