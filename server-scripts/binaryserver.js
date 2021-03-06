const fs = require('fs')
    , junk = require('junk')
    , wav = require('wav')
    , BinaryServer = require('binaryjs').BinaryServer
    , binaryServer = BinaryServer({port: 9002});

binaryServer.on('connection', function(client) {

  client.on('stream', function(stream, meta) {

    var username = meta.username
      , roomname = meta.roomname
      , numUsers = meta.numUsers
      , duration = meta.duration
      , time = Date.now()
      , roomAddress = './data/recordings/' + roomname + "/";
      
    if (!fs.existsSync(roomAddress)){
      fs.mkdirSync(roomAddress);
    }

    var outFile = roomAddress + '/' + roomname + username + time + '.wav'
      , fileWriter = new wav.FileWriter(outFile, {
          channels: 1,
          sampleRate: 48000,
          bitDepth: 16
        });

    stream.pipe(fileWriter);
    stream.on('end', writeFile());

    function writeFile() {
      return function(e) {
        fileWriter.end();
        checkIfFilesShouldMerge(roomAddress, duration);
      }
    }
  });
});


// File Merging Functions
function checkIfFilesShouldMerge(roomAddress, duration) {
  fs.readdir(roomAddress, function(err, files) {
    if (!err) {
      var sounds = {};
      files = files.filter(junk.not);
      var num = 1;
      files.forEach(function(file) {
        sounds['sound' + num] = file;
        num++
      });
      if (files.length == numUsers) {
        orderFileMerge(roomAddress, sounds, duration);
      }
    } else {
      throw err; 
    }
  });
}

function orderFileMerge(roomAddress, sounds, duration) {
  var spawn = require("child_process").spawn;
  var process = spawn('python', ['./server-scripts/overdub.py', roomAddress.toString(), JSON.stringify(sounds), duration.toString()]);

  var PythonShell = require('python-shell');
  var options = {
    args: [roomAddress.toString(), JSON.stringify(sounds), duration.toString()]
  };
  PythonShell.run('./server-scripts/overdub.py', options, function (err) {
    if (err) throw err;
    console.log('finished');
  });
}

module.exports.binaryServer = binaryServer;