var fs = require('fs');
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
    fs.unlinkSync(module.exports.dataStoreFileName);
  },
  whenAvailable: function(server) {
    if (server.user === undefined || server.user === null) {
      return server.timestamp;    }
  }
};
