var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var cors = require('cors');
//const options = {};
app.use(cors());
var port = process.env.PORT || 3000;
const mongoose = require('mongoose');
const Document = require('./model/documents');

connectionString = "mongodb+srv://back:Lumos35@nlpf.t3ynp.mongodb.net/nlpf?retryWrites=true&w=majority"
mongoose.connect(connectionString, {useNewUrlParser: true, useUnifiedTopology: true
}).then(() => {
	console.log('connected to db')
}).catch((error) => {
	console.log(error)
})
  

  // Routing
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/document', function(req, res, next) {
    var doc_name = req.query.name;
    var query = Document.find({name: doc_name})
    query.sort({created_on: 'desc'}).limit(1).lean().exec(function(err, documents){
      if (err) return res.status(400).json(err);
      res.json(documents);
    });
  });

  app.get('/documenthistory', function(req, res, next) {
    var doc_name = req.query.name;
    var query = Document.find({name: doc_name})
    query.sort({created_on: 'desc'}).lean().exec(function(err, documents){
      if (err) return res.status(400).json(err);
      res.json(documents);
    });
  });

  app.get('/listdocuments', function(req, res, next) {
    var query = Document.find({'dinit': true});
    query.sort({created_on: 'asc'}).lean().exec(function(err, documents){
      if (err) return res.status(400).json(err);
      res.json(documents);
    });
  });

  const io = require('socket.io')(server);
  server.listen(port);

  var active_users = [];

  io.on('connection', (socket) => {
    console.log('new connection : ' + socket.id);

    socket.on('hello', (data) => {
      active_users.push(data.username)
      console.log(active_users);
      io.emit('users', active_users);
    })

    socket.on('bye', (data) => {
      console.log("received bye")
      console.log(data);
      var index = active_users.indexOf(data.username);
      if (index) {
        active_users.splice(index, 1);
      }
      socket.broadcast.emit('users', active_users);
    })

    socket.on('SEND_DOCUMENT', (data) => {
      console.log("edit doc");
      console.log(data);
      var updated_doc = new Document({
        name: data.name,
        content: data.content,
        author: data.user,
        created_on: Date.now(),
        dinit: false
      });
      updated_doc.save();
      socket.broadcast.emit('DOCUMENT', {name: data.name, content: data.content});
    });

    socket.on('RM_DOCUMENT', (data) => {
      console.log("remove doc");
      Document.remove({name: data.name}, function(err, result) {
        if (err) {
          console.err(err);
        } else {
          var query = Document.find({'dinit': true});
          query.sort({created_on: 'asc'}).lean().exec(function(err, documents){
            io.emit('INFO_DOC', {list: documents});
          });
        }
      })
      
    })

    socket.on('NEW_DOCUMENT', (data) => {
      console.log("new doc");
      var new_doc = new Document({
        name: data.name,
        author: data.user,
        created_on: Date.now(),
        content: "<p></p>",
        dinit: true
      });
      new_doc.save().then( new_doc => {
        console.log("new_doc before")
        var query = Document.find({'dinit': true});
        query.sort({created_on: 'asc'}).lean().exec(function(err, documents){
          io.emit('INFO_DOC', {list: documents});
        console.log(documents);
        console.log("new_doc after");
      })
    });
    })

    socket.on('disconnect', (reason) => {
      console.log(reason);
    });
  });
