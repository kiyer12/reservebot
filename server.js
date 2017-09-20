// var fs = require('fs');
var dateFormat = require('dateformat');
var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var serverList = require('./serverList.js');
var slackResponseLib = require('./slackResponse.js');

function reserveServer(server, user_name) {
  server.timestamp = (new Date()/1000) + 3600*4;
  server.user = user_name;
}

function slackServersAsAttachments(db) {
  var results = [];
  for (var i = 0; i < db.length; i++) {  
    var line = ":computer: " + db[i].name;
    if (db[i].user === undefined || db[i].user === null) {
      line += " : available";
    }
    else {
      var until = new Date(db[i].timestamp*1000);
      line += ": reserved by @"+db[i].user+". Reservation expires "+serverList.timestampString(db[i].timestamp*1000)+".";
    }
    results.push( {text: line} );
  }
  return results;
}

app.post("/betabot", function (request, response) {
  var user_name = request.body.user_name;
  var commandText = request.body.text;
  var channel_name = request.body.channel_name;

  /*
  if (channel_name !== 'eng') {
    response.send("This bot is only available from #eng.");
    return;
  }
*/
  var parts = commandText.split(" ");
  var command = parts[0];
  console.log(command);
  if (command === 'clear') {
  
    serverList.delete();
    var slackResponse = slackResponseLib.base("All reservations cleared.", true);
    response.send(slackResponse);
  }
  else if (command === 'reserve') { 
    serverList.read(
      function(db) {
        
        if (parts.length >= 2) {
          var optionalServerName = parts[1];
          var serverIndex = serverList.findServerByName(db, optionalServerName);          
          
          if (serverIndex == null) {
            var slackResponse = slackResponseLib.base("No server named "+optionalServerName+".", true);
            slackResponse.attachments = slackServersAsAttachments(db);
            response.send(slackResponse);
          }
          else {
            reserveServer(db[serverIndex], user_name);
            serverList.save(db);

            var slackResponse = slackResponseLib.base(":computer: "+db[serverIndex].name + " reserved by @"+user_name+". Expires "+serverList.timestampString(db[serverIndex].timestamp*1000), true);
            response.send(slackResponse);
          }
        }
        else {
          var openIndex = serverList.findOpenServer(db, user_name);
          if (openIndex === null) {
            var slackResponse = slackResponseLib.base("No server available.", true);
            slackResponse.attachments = slackServersAsAttachments(db);
            response.send(slackResponse);
            return;
          }
          console.log("here"+openIndex);
          reserveServer(db[openIndex], user_name);
          serverList.save(db);

          var until = new Date(db[openIndex].timestamp*1000);
          var slackResponse = slackResponseLib.base(":computer: "+db[openIndex].name + " reserved by @"+user_name+". Expires "+serverList.timestampString(db[openIndex].timestamp*1000), true);
          response.send(slackResponse);
        }
      }
    );
  }
  else if (command === 'help') {
    
    serverList.read(
      function(db) {
        var slackResponse = slackResponseLib.base("Betabot commands:", false);
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
        serverList.updateTimestamps(db);
        serverList.save(db);

        var slackResponse = slackResponseLib.base(":computer: :open_book:", true);
        slackResponse.attachments = slackServersAsAttachments(db);
        response.send(slackResponse);
      }
    );
  }                                
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
