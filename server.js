var serverList = require('./server_list.js');

var express = require('express');
var app = express();

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

var fs = require('fs');

app.get("/list", function (request, response) { 
  serverList.read(
    function(db) {
      console.log("back from reading list.");
      response.send(constructServerList(db));      
    }
  );
});



app.get("/clear", function (request, response) {
  serverList.delete();
  response.send("clear done");
});



function updateTimestamps(db) {
  for (var i = 0; i < db.length; i++) {
    var server = db[i];
    var currentTime = new Date() / 1000;
        
    if (server.timestamp === undefined || server.timestamp === null ) {
      
    }
    else if (currentTime - server.timestamp > 3600) {
      delete server.timestamp;  
    }
  }
}


function findOpenServer(db, user) {
  
  for (var i = 0; i < db.length; i++) {
    var server = db[i];
    var currentTime = new Date() / 1000;
    console.log(server);
    console.log(currentTime - server.timestamp);
    if (user === server.user) {
      return i;
    }
    
    var timestamp = serverList.whenAvailable(server);
    if (!timestamp) {
      return i;
    }
    if (currentTime - server.timestamp > 3600) {
      console.log(server.name+": expire reservation");
      return i;
    }
  }
  
  return null;
}

function reserveServer(server, user_name) {
  server.timestamp = new Date()/1000;
  server.user = user_name;
}

function constructServerList(db) {
  var results = "";
  for (var i = 0; i < db.length; i++) {  
    var server = db[i];
    var line = ":computer: " + server.name;
    if (server.user === undefined || server.user === null) {
      line += " : available";
    }
    else {
      line += ": "+server.user+"\n";
    }
    results += line + "\n";
  }
  return results;
}

function createBaseSlackResponse(text, in_channel) {
  var result = {
    "text": text,
    "attachments": [
    ]
  };
  
  if (in_channel) {
    result.response_type = in_channel;
  }
  
  return result;
}


// could also use the POST body instead of query string: http://expressjs.com/en/api.html#req.body
app.post("/betabot", function (request, response) {
  var user_name = request.body.user_name;
  var commandText = request.body.text;
  var channel_name = request.body.channel_name;

  /*
  if (channel_name !== 'eng' && channel_name !=='directmessage') {
    response.send("This bot is only available from #eng.");
    return;
  }
  */
  
  var parts = commandText.split(" ");
  var command = parts[0];
  if (command === 'list') {
    serverList.read(
      function(db) {
        updateTimestamps(db);
        serverList.save(db);
        response.send(constructServerList(db));
      }
    );
  }
  else if (command === 'clear') {
    serverList.delete();
    response.send("clear complete.");
  }
  else if (command === 'reserve') { 
    serverList.read(
      function(db) {
        var openIndex = findOpenServer(db, user_name);
        if (openIndex === null) {
          response.send("No server available.\n"+constructServerList(db));      
          return;
        }
        
        reserveServer(db[openIndex], user_name);
        serverList.save(db);
        
        var slackResponse = createBaseSlackResponse(db[openIndex].name + " is now reserved for you for an hour.", true);
        response.send(slackResponse);
      }
    );
  }
  else if (command === 'help') {
    
    serverList.read(
      function(db) {


    var slackResponse = createBaseSlackResponse("Betabot commands:", false);
    slackResponse.attachments.push(
      { "text": "/list lists all servers and who is using them."},
      { "text": "/reserve will pick an open server and reserve it in your name"},
      { "text": "/clear will clear all reservations."}
    );
    response.send(slackResponse);
  });
}
                                   
});



// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
