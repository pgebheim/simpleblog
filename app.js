
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.use(express.logger({
      format: ':date - :method - :url - :status'
  }));

  app.use(express.bodyDecoder());
  app.use(express.methodOverride());

  // Sessions
  app.use(express.cookieDecoder());
  app.use(express.session());

  // CSS
  app.use(express.compiler({
      src: __dirname + '/public',
      enable: ['sass']
  }));

  app.use(app.router);

  app.use(express.favicon());

  app.use(express.staticProvider(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Custom Middleware
// Should put this in a module
var authenticate = function(req, res, next) {
    var user = users[req.session.user_id];
    if (user) {
        req.user = user;
        next();
    } else {
        next(new Error('Failed to load user ' + req.params.id));
    }
};

// Routes

app.get('/', function(req, res){
  res.render('index.jade', {
    locals: {
        title: 'Express'
    }
  });
});

app.get('/posts/:id', authenticate, function(req, res) {
    res.render('entry.jade', {
        locals: {
        }
    });
});

app.post('/posts', authenticate, function(req, res) {
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port)
}
