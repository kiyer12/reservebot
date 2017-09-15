
var express = require('express');
var app = express();

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

var fs = require('fs');

var dataStoreFileName = '.data/data.json';

function readServerList() {
  
  fs.access(dataStoreFileName, fs.constants.R_OK | fs.constants.W_OK, (err) => {
    console.log(err ? 'no access!' : 'can read/write');
    if (!err) {      
      var contents = fs.readFileSync(dataStoreFileName, 'utf8');
      console.log(contents);
      if (contents === null || contents === "" || contents === undefined) {
        
        return [
            {
              name: 'beta'
            },
            {
              name: 'beta2'
            }
        ];
      }

      return JSON.parse(contents);
    }
    else {
      contents = [
        {
          name: 'beta'
        },
        {
          name: 'beta2'
        }
      ];
      return contents;
    }
  });
  
}

function saveServerList(value) {
  fs.writeFileSync(dataStoreFileName, value);
}

function findOpenServer(servers, user) {
  
  for (var i = 0; i < servers.length; i++) {
    var server = servers[i];
    var currentTime = new Date() / 1000;
    console.log(server);
    console.log(currentTime - server.timestamp);
    if (user === server.user) {
      return null;
    }
    if (server.timestamp === undefined || server.timestamp === null ) {
      console.log(server.name+": no timestamp");
      return i;
    }
    else if (currentTime - server.timestamp > 3600) {
      console.log(server.name+": expire reservation");
      return i;
    }
  }
  
  return null;
}

// could also use the POST body instead of query string: http://expressjs.com/en/api.html#req.body
app.post("/betabot", function (request, response) {
  var user_name = request.body.user_name;
  var commandText = request.body.text;
  var channel_name = request.body.channel_name;
  
  
  // console.log(request.body);
  /*
  if (channel_name !== 'eng' && channel_name !=='directmessage') {
    response.send("This bot is only available from #eng.");
    return;
  }
  */
  
  var parts = commandText.split(" ");
  if (parts[0] === 'list') {
    var servers = readServerList();
    saveServerList(servers);
    return;
    var results = "List of servers: \n";
    for (var i = 0; i < servers.server.length; i++) {
      var server = servers.server[i];
      console.log(server);
      var line = server.name;
      if (server.user === undefined || server.user === null) {
        line += " : available";
      }
      else {
        line += ": "+server.user+"\n";
      }
      results += line + "\n";
    }
    response.send(results); // sends dbUsers back to the page
  }
  else if (parts[0] === 'clear') {
    fs.unlinkSync(dataStoreFileName)
    response.send("clear complete.");
  }
  else { 
    var servers = readServerList();
    var openIndex = findOpenServer(servers.server, user_name);
    if (openIndex === null) {
      response.send("No server available. Run /betabot list to see current users.");      
      return;
    }
    
    servers.server[openIndex].timestamp = new Date()/1000;
    servers.server[openIndex].user = user_name;
    saveServerList(servers);
    
    var result = {
      "response_type": "in_channel",
      "text": servers.server[openIndex].name + ".payjoy.com was reserved by "+user_name+" for one hour.",
      "attachments": [
        {
            "text":""
        }
      ]
    };
    
    response.send(result);
  }
});



// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
