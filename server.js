var dateFormat = require('dateformat');
var serverList = require('./server_list.js');
var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

var fs = require('fs');

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
    if (currentTime - server.timestamp > 0) {
      console.log(server.name+": expire reservation");
      return i;
    }
  }
  
  return null;
}

function reserveServer(server, user_name) {
  server.timestamp = (new Date()/1000) + 3600*4;
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

function listServers(db) {
  var results = [];
  for (var i = 0; i < db.length; i++) {  
    var line = ":computer: " + db[i].name;
    if (db[i].user === undefined || db[i].user === null) {
      line += " : available";
    }
    else {
      var until = new Date(db[i].timestamp*1000);
      line += ": reserved by @"+db[i].user+". Reservation expires "+serverList.timestampString(db[i].timestamp*1000);
    }
    results.push( {text: line} );
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
  console.log(command);
  if (command === 'list' || command === null) {
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
    var slackResponse = createBaseSlackResponse("All reservations cleared.", true);
    response.send(slackResponse);
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
        
        var until = new Date(db[openIndex].timestamp*1000);
        var slackResponse = createBaseSlackResponse(":computer: "+db[openIndex].name + " reserved by @"+user_name+". Expires "+serverList.timestampString(db[openIndex].timestamp*1000), true);
        response.send(slackResponse);
      }
    );
  }
  else if (command === 'help') {
    
    serverList.read(
      function(db) {
        var slackResponse = createBaseSlackResponse("Betabot commands:", false);
        slackResponse.attachments.push(
          { "text": "/list will list all servers and who is using them."},
          { "text": "/reserve will pick an open server and reserve it in your name"},
          { "text": "/clear will clear all reservations."}
        );
        response.send(slackResponse);
    });
  }
  else {
    serverList.read(
      function(db) {
        updateTimestamps(db);
        serverList.save(db);

        var slackResponse = createBaseSlackResponse(":computer: List of servers:", true);
        slackResponse.attachments = listServers(db);
        response.send(slackResponse);
      }
    );
  }
                                   
});



// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
