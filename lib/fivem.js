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
 * @param  {Object}   options
 * @param  {Function} callback
 * @return {Array}
 * @example
    [
      '123.124.125.126:30120'
      '124.125.126.127:30120',
    ]
 */
var queryAvailableServers = function(options, callback) {
    // Empty array that holds server+port combinations
    var serverListArray = [];

    // Buffers for header elements
    var serial = new Buffer(4),
        command = new Buffer('getservers GTA5 4 full empty');

    // Fill serial with \xFF
    serial.writeUInt32LE(0xFFFFFFFF);

    // Combine into one header
    header = new Buffer.concat([serial, command]);

    // Create UDP socket
    var masterclient = dgram.createSocket('udp4');

    // Send UDP packet
    masterclient.send(header, 0, header.length, options.port, options.server, function(err, bytes) {
        if (err) throw err;
        // console.log('UDP message sent to ' + options.server +':'+ options.port);
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

    // Set timeout of options.timeout
    var timeout = setTimeout(function() {
        masterclient.close();
        return callback(serverListArray);
    }, options.timeout);
}

/**
 * Get general information of specific game server. Returns an
 * object that holds the data.
 * @param  {Object}   options
 * @param  {String}   server
 * @param  {String}   port
 * @param  {Function} callback
 * @return {Object}
 * @example
    {
      sv_maxclients: '24',
      clients: '0',
      challenge: 'r4nd0m',
      gamename: 'GTA5',
      protocol: '4',
      hostname: 'test.hostname.com',
      gametype: 'Multi-Gaming-Community-RP',
      mapname: 'Multi-Gaming-Roleplay-Community',
      iv: '-1768428733'
    }
 */
var getServerInfo = function(options, server, port, callback) {
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

    // Set timeout of options.timeout
    var timeout = setTimeout(function() {
        client.close();
        serverDetailObject.responsetime = options.timeout;
        serverDetailObject.data.error = 'Timeout of ' + options.timeout + ' ms exceeded.';
        return callback(serverDetailObject);
    }, options.timeout);

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
}

/**
 * Get resource information of specific game server. Returns an
 * object that holds the data.
 * @param  {Object}   options
 * @param  {String}   server
 * @param  {String}   port
 * @param  {Function} callback
 * @return {Object}
 * @example
    {
        "success": true,
        "responsetime": 265,
        "data": {
            "resources": [
                "mapmanager",
                "jscoreboard",
                "stunt-east-coast",
                "stunt-h200",
                "stunt-maze-bank-ascent",
                "stunt-splits",
                "stunt-vespucci",
                "object-loader",
                "object-teleports",
                "baseevents",
                "chat",
                "hardcap",
                "rconlog",
                "sessionmanager",
                "spawnmanager",
                "fivem",
                "fivem-map-skater",
                "ivpack",
                "kng-veh-misc",
                "oui-trainer-2",
                "vehshop"
            ],
            "server": "1.0.0.0 (git 45c2dc7)",
            "version": 1804880686
        }
    }
 */
var getServerResource = function (options, server, port, callback){
    // Store current time to meassure response time of request
    var clientTimer = new Date();

    // Empty object to store data
    var resultObject = {
        success: false,
        responsetime: 0,
        data: {}
    };

    // Send GET request with configured httpTimeout
    request('http://' + server + ':' + port + '/info.json', {timeout: options.timeout}, function (error, response, body) {
        resultObject.responsetime = new Date() - clientTimer;
        resultObject.data.error = 'Timeout of ' + options.timeout + ' ms exceeded.';
        // Check for success
        if (!error && response.statusCode == 200) {
            // Set success to true and parse JSON response
            resultObject.success = true;
            resultObject.data = JSON.parse(body);
        } else {
            // Otherwise, pass error message
            resultObject.data.error = error.message;
        }

        // Return resultObject
        return callback(resultObject);
    });
}

/**
 * List connected players of specific game server. Returns an object
 * that holds the data.
 * @param  {Object}   options
 * @param  {String}   server
 * @param  {String}   port
 * @param  {Function} callback
 * @return {Object}
 * @example
    {
        "success": true,
        "responsetime": 113,
        "data": [
            {
                "name": "playerA",
                "identifiers": [
                    "ip:203.0.113.47"
                ],
                "endpoint": "203.0.113.47:9979",
                "ping": 33,
                "id": 1910
            },
            {
                "name": "playerB",
                "identifiers": [
                    "steam:110000115fffff0"
                ],
                "endpoint": "192.0.2.199:53222",
                "ping": 44,
                "id": 1912
            }
        ]
    }
 */
var getConnectedPlayers = function (options, server, port, callback){
    // Store current time to meassure response time of request
    var clientTimer = new Date();

    // Empty object to store data
    var resultObject = {
        success: false,
        responsetime: 0,
        data: {}
    };

    // Send GET request with configured httpTimeout
    request('http://' + server + ':' + port + '/players.json', {timeout: options.timeout}, function (error, response, body) {
        resultObject.responsetime = new Date() - clientTimer;
        resultObject.data.error = 'Timeout of ' + options.timeout + ' ms exceeded.';
        // Check for success
        if (!error && response.statusCode == 200) {
            // Set success to true and parse JSON response
            resultObject.success = true;
            resultObject.data = JSON.parse(body);
        } else {
            // Otherwise, pass error message
            resultObject.data.error = error.message;
        }

        // Return resultObject
        return callback(resultObject);
    });
}

// Export above functions
module.exports = {
   queryAvailableServers: queryAvailableServers,
   getServerInfo: getServerInfo,
   getServerResource: getServerResource,
   getConnectedPlayers: getConnectedPlayers
}
