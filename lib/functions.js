// Require modules
var raw = require ('raw-socket'),
    dgram = require('dgram'),
    request = require('request');

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
    var serverListArray = [];

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
                serverListArray.push(ipStr + ':' + port)
            }
        }
    });

    // Set timeout of masterclientTimeout
    var timeout = setTimeout(function() {
        masterclient.close();
        return callback(serverListArray);
    }, masterclientTimeout);
};

/**
 * Get general information of specific game server. Returns an
 * object that holds the data.
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

    // Empty object that holds the server details
    var serverDetailObject = {
        success: false,
        responsetime: 0,
        data: {}
    };

    // Send UDP packet
    client.send(header, 0, header.length, port, server, function(err, bytes) {
        if (err) throw err;
        // console.log('UDP message sent to ' + server +':'+ port);
    });

    // Set timeout of clientTimeout
    var timeout = setTimeout(function() {
        client.close();
        serverDetailObject.responsetime = clientTimeout;
        serverDetailObject.data.error = 'Timeout of ' + clientTimeout + ' ms exceeded.';
        return callback(serverDetailObject);
    }, clientTimeout);

    // Process response from server
    client.on('message', function (message, remote) {
        // Slice "\ff\ff\ff\ffinfoResponse\n\\"
        message = message.slice(18);

        // Split buffer by "\\" separator
        var parts = message.toString().split('\\');

        // Inject responsetime and empty data object
        serverDetailObject.responsetime = new Date() - clientTimer;

        // For each element, even = key; off = value
        for(var i = 0; i < parts.length; i += 2) {
            var key = parts[i],
                value = parts[i+1];

            // Transfer value into key
            serverDetailObject.data[key] = value;
        }

        // Set success to "true"
        serverDetailObject.success = true;

        // Close connection, clear timer and call callback
        client.close();
        clearTimeout(timeout);
        return callback(serverDetailObject);
    });
};

/**
 * Get resource information of specific game server. Returns an
 * object that holds the data.
 * @param  {String}   server
 * @param  {String}   port
 * @param  {Function} callback
 * @return {Object}
 * @example
 * {
 *   resources: [
 *     'mapmanager',
 *     'CarCleanUp',
 *     'Ivvepivve',
 *     'NeverWanted',
 *     'baseevents',
 *     'chat',
 *     'hardcap',
 *     'rconlog',
 *     'scoreboard',
 *     'spawnmanager',
 *     'keks',
 *     'carcrash',
 *     'essentialmode',
 *     'fivem',
 *     'fivem-map-skater',
 *     'handsup',
 *     'mods',
 *     'mxhandcuff',
 *     'siren',
 *     'whitelist'
 *   ],
 *   server: '1.0.0.0 (git 8d735e1)',
 *   version: -2413476
 * }
 */
var getServerResource = function (server, port, callback){
    // Empty object to store data
    var resultObject = {};

    // Send GET request with configured httpTimeout
    request('http://' + server + ':' + port + '/info.json', {timeout: httpTimeout}, function (error, response, body) {
        // Check for success
        if (!error && response.statusCode == 200) {
            // Parse JSON
            var parsedBody = JSON.parse(body);
            // Return parsedBody to callback
            return callback(parsedBody);
        } else {
            // Otherwise, return false
            return callback(false);
        }
    })
};

module.exports = {
   queryAvailableServers: queryAvailableServers,
   getServerInfo: getServerInfo,
   getServerResource: getServerResource
}
