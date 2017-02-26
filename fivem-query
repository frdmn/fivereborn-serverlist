// Require modules
var async = require('async'),
    cmdr = require('commander'),
    fivem = require('./lib/fivem');

// FiveM dpmaster server
var fivemHost = 'updater.fivereborn.com',
    fivemPort = '30110';

// Timout configuration
var masterclientTimeout = 1000,
    clientTimeout = 1000,
    httpTimeout = 500;

// Empty object that holds the JSON result
var resultObject = {
    success: false,
    timestamp: "",
    runtime: 0,
    data: {}
};

/**
 * Turn input object into prettyfied JSON string
 * @param  {Object|Array} object
 * @return {String}
 */
var objectToJSON = function(object){
    return JSON.stringify(object, null, 4);
};

// Initialize commander.js
cmdr
    .option('-s, --servers', 'List all available game server nodes')
    .option('-i, --info <server:port>', 'Get general information of a specific game server')
    .option('-r, --resources <server:port>', 'List server resources (server version, info version, git revision) of specific server')
    .option('-p, --players <server:port>', 'List connected players of specific server')
    .option('-c, --chat <server:port>', 'Get latest chat logs')
    .on('--help', function(){
        console.log('  Examples:');
        console.log('');
        console.log('    $ fivem-query -s');
        console.log('    $ fivem-query -i 203.0.113.2:30130');
        console.log('    $ fivem-query -r 192.0.2.199:30130');
        console.log('    $ fivem-query -p 198.51.100.43:30130');
        console.log('    $ fivem-query -c 203.0.113.43:30132');
        console.log('');
      })
    .parse(process.argv);

// Output help if no option given
if (cmdr.rawArgs.length < 3 ){
    cmdr.help();
    process.exit(1);
}

// List all servers, if '-s' is set
if (cmdr.servers){
    fivem.queryAvailableServers({server: fivemHost, port: fivemPort, timeout: masterclientTimeout}, function(serverlist){
        console.log(objectToJSON(serverlist));
        process.exit(0);
    });
}

// Get general info, if '-i' is set
if (cmdr.info){
    // Split by ":" and store in variables
    var socket = cmdr.info.split(':'),
        server = socket[0],
        port = socket[1];

    // Get server information for current server
    fivem.getServerInfo({timeout: clientTimeout}, server, port, function(serverinfo){
        console.log(objectToJSON(serverinfo));
        // Check for success to exit with proper status code
        if(serverinfo && serverinfo.success){
            process.exit(0);
        } else {
            process.exit(1);
        }
    });
}

// Get server resources, if '-r' is set
if (cmdr.resources){
    // Split by ":" and store in variables
    var socket = cmdr.resources.split(':'),
        server = socket[0],
        port = socket[1];

    // Try to parse server resources using HTTP
    fivem.getServerResource({timeout: httpTimeout}, server, port, function(serverresources){
        console.log(objectToJSON(serverresources));
        // Check for success to exit with proper status code
        if(serverresources && serverresources.success){
            process.exit(0);
        } else {
            process.exit(1);
        }
    });
}

// List connected players, if '-p' is set
if (cmdr.players){
    // Split by ":" and store in variables
    var socket = cmdr.players.split(':'),
        server = socket[0],
        port = socket[1];

    // Get connected players using HTTP
    fivem.getConnectedPlayers({timeout: httpTimeout}, server, port, function(serverplayers){
        console.log(objectToJSON(serverplayers));
        // Check for success to exit with proper status code
        if(serverplayers && serverplayers.success){
            process.exit(0);
        } else {
            process.exit(1);
        }
    });
}

// Get chat logs, if '-c' is set
if (cmdr.chat){
    // Split by ":" and store in variables
    var socket = cmdr.logs.split(':'),
        server = socket[0],
        port = socket[1];

    // Get connected players using HTTP
    fivem.getEventLog({timeout: httpTimeout}, server, port, function(serverevents){
        // Check for success
        if(serverevents && serverevents.success){
            var serverchat = [];

            // For each event entry
            for(var i = 0; i < serverevents.data.length; i += 2) {
                // Check if event type is "chatMessage"
                if (serverevents.data[i].msgType === 'chatMessage') {
                    // If so, push event to serverchat array
                    serverchat.push(serverevents.data[i]);
                }
            }

            // Overwrite events with chat events in serverevents.data
            serverevents.data = serverchat;

            // Output result and exit
            console.log(objectToJSON(serverevents));
            process.exit(0);
        } else {
            // Output result and exit
            console.log(objectToJSON(serverevents));
            process.exit(1);
        }
    });
}
