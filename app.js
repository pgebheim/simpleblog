
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

// Database
require.paths.unshift('support/mongoose');
var mongoose = require('mongoose').Mongoose;

mongoose.model('user', {
    properties: ['login', 'password'],
    indexes: ['login'],
    static: {
        authenticate: function(login, password) {
            return this.find({login: login, password: password}, {user_id: 1});
        },
        create: function(login, password) {
            var user = db.model('user');
            var u = new user();
            u.login = login;
            u.password = password;
            return u;
        }
    }
});

mongoose.model('post', {
    properties: ['login', 'posted_on', 'title', 'content'],
    indexes: ['user_id'],
    static: {
        create: function(login, title, content) {
            var post = db.model('post');
            var p = new post();
            p.login = login;
            p.posted_on = new Date();
            p.title = title;
            p.content = content;
            return p;
        }
    }
});

var db = mongoose.connect('mongodb://localhost/simpleblog');

// Custom Middleware
// Should put this in a module

var authenticate = function(redirect) {
    return function(req, res, next) {
        var user_id = req.session.user_id;
        if(user_id) {
            db.model('user').findById(user_id).one(function(user) {
                if (user) {
                    req.user = user;
                    next();
                } else {
                    res.redirect('/login');
                }
            });
        } else {
            if(redirect) {
                res.redirect('/login');
            } else {
                next()
            }
        }
    };
};

var require_user_params = function(req, res, next) {
    if(!req.body.login || !req.body.password) {
        res.redirect('/login');
    } else {
        next();
    }
};

// Routes

app.get('/', authenticate(false), function(req, res){
  res.render('index.jade', {
    locals: {
        title: 'Woah! Tis a blog!',
        user: req.user
    },
    layout: 'front_page_layout.jade'
  });
});

app.get('/login', function(req, res) {
    res.render('user_password_form.jade', {
        locals: {
            title: "Login",
            action: '/login',
            show_create_account: true
        }
    });
});

app.post('/login', require_user_params, function(req, res) {
    // Really not secure for now
    var user = db.model('user');
    user.authenticate(req.body.login, req.body.password).one(function(u) {
        if(!u) {
            res.redirect('/login');
        } else {
            // SOO hard to hack, better to have a real authentication token
            req.session.user_id = u._id;

            // Open redirect at the moment. Bad bad bad.
            res.redirect(req.params.redirect || '/');
        }
    });
});

app.get('/new_user', function(req, res) {
    res.render('user_password_form.jade', {
        locals: {
            title: "Create User",
            action: '/new_user',
            show_create_account: false
        }
    });
});

app.post('/new_user', require_user_params, function(req, res) {
    var user = db.model('user');
    user.create(req.body.login, req.body.password).save(function() {
        res.redirect('/');
    });
});

app.get('/posts/create', authenticate(true), function(req, res) {
    res.render('post_create.jade', {
        locals: {
            title: 'Create a new post!'
        }
    });
});

app.post('/posts/create', authenticate(true), function(req, res) {
    var posts = db.model('post');
    posts.create(req.user.login, req.body.title, req.body.content).save(function() {
        res.redirect('/');
    });
});

app.get('/posts/:id?', function(req, res, next) {
    if(req.params.id) {
        var posts = db.model('post');
        posts.findById(req.params.id).one(function(p) {
            if(p) {
                res.render('posts.jade', {
                    locals: {
                        title: p.title,
                        posts: [p]
                    }    
                });
            } else {
                res.render('posts.jade', {
                    title: 'No posts found'
                });
            }
        });
    } else {
        next();
    }
});

var render_posts = function(req, res, use_layout) {
    var posts = db.model('post');
    posts.find().all(function(p) {
        if(p && p.length > 0) {
            res.render('posts.jade', {
                locals: {
                    title: "All posts",
                    posts: p
                },
                layout: use_layout
            });
        } else {
            res.render('posts.jade', {
                locals: {
                    title: 'No posts found',
                    posts: []
                },
                layout: use_layout
            });
        }
    });
};

app.get('/posts', function(req, res) {
    render_posts(req, res, true);
});

app.get('/ajax/posts', function(req, res) {
    render_posts(req, res, false);
});
// Only listen on $ node app.js
if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port)
}
