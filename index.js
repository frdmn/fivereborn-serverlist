// Require modules
var async = require('async'),
    functions = require('./lib/functions');

// FiveM dpmaster server
var fivemHost = 'updater.fivereborn.com',
    fivemPort = '30110';

// Timout configuration
var masterclientTimeout = 1000,
    clientTimeout = 200,
    httpTimeout = 100;

// Empty object that holds the JSON result
var resultObject = {
    success: false,
    timestamp: "",
    runtime: 0,
    data: {}
};

// Store current time to meassure response time of request
var totalTimer = new Date();

// Run function to get all servers
functions.queryAvailableServers(function(serverlist){
    // Set success to "true"
    resultObject.success = true;

    // For each server, execute getServerInfo (synchronously)
    async.forEachSeries(serverlist, function(server, callback) {
        // Split by ":" and store in variables
        var socket = server.split(':'),
            server = socket[0],
            port = socket[1];

        // Get server information for current server
        functions.getServerInfo(server, port, function(data){
            // Push to resultObject
            resultObject.data[server + ':' + port] = data;

            // Abort if invalid data
            if (!data || data.success === false) {
                return callback()
            };

            // Try to parse server resources using HTTP (http://<server>:<port>/info.json) API
            functions.getServerResource(server, port, function(data){
                // Abort if invalid data
                if (!data) {
                    return callback()
                } else {
                    // Push to resultObject
                    resultObject.data[server + ':' + port].data.resources =  data;
                    return callback();
                }
            });
        });
    }, function(err) {
        // Throw possible errors
        if (err) throw err;

        // Inject update timestamp and execution runtime
        resultObject.timestamp = new Date();
        resultObject.runtime = new Date() - totalTimer;

        // Print result as formatted JSON
        console.log(JSON.stringify(resultObject, null, 4));
    });
});
