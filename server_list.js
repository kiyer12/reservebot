var fs = require('fs');
var moment = require('moment-timezone');

module.exports = {
  dataStoreFileName: '.data/data.json',
  defaultData: [
            {
              name: 'beta'
            },
            {
              name: 'beta2'
            }
        ],
  
  read: function (callback) {
      fs.access(module.exports.dataStoreFileName, fs.constants.R_OK | fs.constants.W_OK, (err) => {
        console.log(err ? 'no access!' : 'can read/write');
        if (!err) {      
          console.log("reading db...");
          var fileContents = fs.readFileSync(module.exports.dataStoreFileName, 'utf8');
          var contents = JSON.parse(fileContents);
          console.log(module.exports.defaultData);
          if (contents === null || contents === "" || contents === undefined) {
            callback(module.exports.defaultData);
          }
          callback(contents);
        }
        else {
          callback(module.exports.defaultData);
        }
      });
  },
  save: function(value) {
    fs.writeFileSync(module.exports.dataStoreFileName, JSON.stringify(value));
  },
  delete: function() {
    try {
      fs.unlinkSync(module.exports.dataStoreFileName);
    }
    catch(e) {
      console.log('no file to delete. '+e);
    }
  },
  whenAvailable: function(server) {
    if (server.user === undefined || server.user === null) {
      return server.timestamp;    }
  },
  timestampString: function(ts) {
    var m = moment(ts);
    return m.tz('America/Los_Angeles').fromNow();
  }
};
