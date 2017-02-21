// Require modules
var raw = require ('raw-socket'),
    dgram = require('dgram'),
    async = require('async');

// FiveM dpmaster server
var fivem_host = 'updater.fivereborn.com',
    fivem_port = '30110';

// Timout configuration
var masterclient_timeout = 1000,
    client_timeout = 200;

// Function to convert an integer into an IP string (X.X.X.X)

/**
 * Convert an integer into an IP string (x.x.x.x)
 * @param  {Integer} ip_int
 * @return {String}
 */
var ip_to_str = function(ip_int){
    var ip_str = ((ip_int >> 24) & 0xFF).toString() + '.';
    ip_str += ((ip_int >> 16) & 0xFF).toString() + '.';
    ip_str += ((ip_int >>  8) & 0xFF).toString() + '.';
    ip_str += ((ip_int >>  0) & 0xFF).toString();

    // Return constructed string
    return ip_str;
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
    var padding = new Buffer(4),
        command = new Buffer('getservers GTA5 4 full empty');

    // Fill padding with \xFF
    padding.writeUInt32LE(0xFFFFFFFF);

    // Combine into one header
    header = new Buffer.concat([padding, command]);

    // Empty array that holds server+port combinations
    var serverList = [];

    // Create UDP socket
    var masterclient = dgram.createSocket('udp4');

    // Send UDP packet
    masterclient.send(header, 0, header.length, fivem_port, fivem_host, function(err, bytes) {
        if (err) throw err;
        // console.log('UDP message sent to ' + fivem_host +':'+ fivem_port);
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
            var ip_str = ip_to_str(ip);

            // Stop on "EOT\0\0\0"
            if (ip !== 0x454f5400) {
                serverList.push(ip_str + ':' + port)
            }
        }
    });

    // Set timeout of 1 second
    var timeout = setTimeout(function() {
        masterclient.close();
        callback(serverList);
    }, masterclient_timeout);
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
    var padding = new Buffer(4),
        command = new Buffer('getinfo r4nd0m');

    // Fill padding with \xFF
    padding.writeUInt32LE(0xFFFFFFFF);

    // Combine into one header
    header = new Buffer.concat([padding, command]);

    // Create UDP socket
    var client = dgram.createSocket('udp4');

    // Store current time to meassure response time of request
    var start = new Date();

    // Send UDP packet
    client.send(header, 0, header.length, port, server, function(err, bytes) {
        if (err) throw err;
        // console.log('UDP message sent to ' + server +':'+ port);
    });

    // Set timeout of 1 second
    var timeout = setTimeout(function() {
        client.close();
        callback(false);
    }, client_timeout);

    // Process response from server
    client.on('message', function (message, remote) {
        // Slice "\ff\ff\ff\ffinfoResponse\n\\"
        message = message.slice(18);

        // Split buffer by "\\" separator
        var parts = message.toString().split('\\'),
            serverDetails = {};

        // Inject responsetime
        serverDetails.responsetime = new Date() - start;

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

// Run function to get all servers
queryAvailableServers(function(serverlist){
    // Empty array that holds the server information
    var serversObject = {};

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
            serversObject[server + ':' + port] = data;
            callback();
        });
    }, function(err) {
        if (err) throw err;
        // Print result as formatted JSON
        console.log(JSON.stringify(serversObject, null, 4));
    });
});
