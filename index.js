// Require modules
var raw = require ('raw-socket'),
    dgram = require('dgram'),
    async = require('async');

// FiveM dpmaster server
var fivemHost = 'updater.fivereborn.com',
    fivemPort = '30110';

// Timout configuration
var masterclientTimeout = 1000,
    clientTimeout = 200;

// Function to convert an integer into an IP string (X.X.X.X)

/**
 * Convert an integer into an IP string (x.x.x.x)
 * @param  {Integer} ipInt
 * @return {String}
 */
var ipToStr = function(ipInt){
    var ipStr = ((ipInt >> 24) & 0xFF).toString() + '.';
    ipStr += ((ipInt >> 16) & 0xFF).toString() + '.';
    ipStr += ((ipInt >>  8) & 0xFF).toString() + '.';
    ipStr += ((ipInt >>  0) & 0xFF).toString();

    // Return constructed string
    return ipStr;
}

/**
 * Query the GTA5 dpmaster server to get a list of available
 * game servers. Returns an array that holds each server and
 * port separated by ":".
 * @param  {Function} callback
 * @return {Array}
 * @example
 * [
 *   '123.124.125.126:30120'
 *   '124.125.126.127:30120',
 * ]
 */
var queryAvailableServers = function(callback) {
    //  Header elements
    var serial = new Buffer(4),
        command = new Buffer('getservers GTA5 4 full empty');

    // Fill serial with \xFF
    serial.writeUInt32LE(0xFFFFFFFF);

    // Combine into one header
    header = new Buffer.concat([serial, command]);

    // Empty array that holds server+port combinations
    var serverList = [];

    // Create UDP socket
    var masterclient = dgram.createSocket('udp4');

    // Send UDP packet
    masterclient.send(header, 0, header.length, fivemPort, fivemHost, function(err, bytes) {
        if (err) throw err;
        // console.log('UDP message sent to ' + fivemHost +':'+ fivemPort);
    });

    // Process response from server
    masterclient.on('message', function (message, remote) {
        message = message.slice(22); // Slice "\ff\ff\ff\ffgetserversResponse\"
        // For each IP address, skip 7 bits ("\" delimiter character)
        for (var i = 0; i < message.length; i += 7) {
            // Store IP and port
            var ip = message.readUInt32BE(i + 1);
            var port = message.readUInt16BE(i + 5);
            // Convert integer IP into string
            var ipStr = ipToStr(ip);

            // Skip on "EOT\0\0\0" (0x454f5400)
            if (ip !== 0x454f5400) {
                serverList.push(ipStr + ':' + port)
            }
        }
    });

    // Set timeout of 1 second
    var timeout = setTimeout(function() {
        masterclient.close();
        callback(serverList);
    }, masterclientTimeout);
};

/**
 * Get general information of specific game server. Returns an
 * object that holds the data
 * @param  {String}   server
 * @param  {String}   port
 * @param  {Function} callback
 * @return {Object}
 * @example
 * {
 *   sv_maxclients: '24',
 *   clients: '0',
 *   challenge: 'r4nd0m',
 *   gamename: 'GTA5',
 *   protocol: '4',
 *   hostname: 'test.hostname.com',
 *   gametype: 'Multi-Gaming-Community-RP',
 *   mapname: 'Multi-Gaming-Roleplay-Community',
 *   iv: '-1768428733'
 * }
 */
var getServerInfo = function(server, port, callback) {
    //  Header elements
    var serial = new Buffer(4),
        command = new Buffer('getinfo r4nd0m');

    // Fill serial with \xFF
    serial.writeUInt32LE(0xFFFFFFFF);

    // Combine into one header
    header = new Buffer.concat([serial, command]);

    // Create UDP socket
    var client = dgram.createSocket('udp4');

    // Store current time to meassure response time of request
    var clientTimer = new Date();

    // Send UDP packet
    client.send(header, 0, header.length, port, server, function(err, bytes) {
        if (err) throw err;
        // console.log('UDP message sent to ' + server +':'+ port);
    });

    // Set timeout of 1 second
    var timeout = setTimeout(function() {
        client.close();
        callback(false);
    }, clientTimeout);

    // Process response from server
    client.on('message', function (message, remote) {
        // Slice "\ff\ff\ff\ffinfoResponse\n\\"
        message = message.slice(18);

        // Split buffer by "\\" separator
        var parts = message.toString().split('\\'),
            serverDetails = {};

        // Inject responsetime
        serverDetails.responsetime = new Date() - clientTimer;

        // For each element, even = key; off = value
        for(var i = 0; i < parts.length; i += 2) {
            var key = parts[i],
                value = parts[i+1];

            // Transfer value into key
            serverDetails[key] = value;
        }

        // Close connection, clear timer and call callback
        client.close();
        clearTimeout(timeout);
        callback(serverDetails);
    });
};

// Empty array that holds the server information
var serversObject = {
    success: false,
    data: {}
};

// Store current time to meassure response time of request
var totalTimer = new Date();

// Run function to get all servers
queryAvailableServers(function(serverlist){
    serversObject.success = true;

    // For each server, execute getServerInfo (synchronously)
    async.forEachSeries(serverlist, function(server, callback) {
        // Split by ":" and store in variables
        var socket = server.split(':'),
            server = socket[0],
            port = socket[1];

        // Get server information for current server
        getServerInfo(server, port, function(data){
            // Abort if callback is false
            if (!data) return callback();

            // console.log(data);

            // Push to serverDetails
            serversObject.data[server + ':' + port] = data;
            callback();
        });
    }, function(err) {
        if (err) throw err;

        // Inject update timestamp and execution runtime
        serversObject.timestamp = new Date();
        serversObject.runtime = new Date() - totalTimer;

        // Print result as formatted JSON
        console.log(JSON.stringify(serversObject, null, 4));
    });
});
