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

var stringToJSON = function(string){
    return JSON.stringify(string, null, 4);
};

cmdr
    .option('-s, --servers', 'List all available game server nodes')
    .option('-i, --info <server:port>', 'Get general information of a specific game server')
    .option('-r, --resources <server:port>', 'List server resources (server version, info version, git revision) of specific server')
    .on('--help', function(){
        console.log('  Examples:');
        console.log('');
        console.log('    $ fivem-query -s');
        console.log('    $ fivem-query -i 203.0.113.2:30130');
        console.log('    $ fivem-query -r 192.0.2.199:30130');
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
        console.log(stringToJSON(serverlist));
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
        console.log(stringToJSON(serverinfo));
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

    // Try to parse server resources using HTTP (http://<server>:<port>/info.json) API
    fivem.getServerResource({timeout: httpTimeout}, server, port, function(serverresources){
        console.log(stringToJSON(serverresources));
        if(serverresources && serverresources.success){
            process.exit(0);
        } else {
            process.exit(1);
        }
    });
}
