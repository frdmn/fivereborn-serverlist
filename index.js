// Require modules
var raw = require ("raw-socket");
var dgram = require('dgram');

// FiveM dpmaster server
var fivem_host = "151.80.44.223";
var fivem_port = "30110";

// Timout configuration
var masterclient_timeout = 1000;
var client_timeout = 200;

// Function to convert an integer into an IP string (X.X.X.X)
function ip_to_str(ip_int){
    var ip_str = "";
    ip_str += ((ip_int >> 24) & 0xFF).toString() + ".";
    ip_str += ((ip_int >> 16) & 0xFF).toString() + ".";
    ip_str += ((ip_int >>  8) & 0xFF).toString() + ".";
    ip_str += ((ip_int >>  0) & 0xFF).toString();
    return ip_str;
}

var queryAvailableServers = function(callback) {
    //  Header elements
    var padding = new Buffer(4),
        command = new Buffer('getservers GTA5 4 full empty');

    // Fill padding with \xFF
    padding.writeUInt32LE(0xFFFFFFFF);

    // Combine into one header
    header = new Buffer.concat([padding, command]);

    // Array that holds server+port combinations
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

    // Send UDP packet
    client.send(header, 0, header.length, port, server, function(err, bytes) {
        if (err) throw err;
        console.log('UDP message sent to ' + server +':'+ port);
    });

    // Set timeout of 1 second
    var timeout = setTimeout(function() {
        client.close();
    }, client_timeout);

    // Process response from server
    client.on('message', function (message, remote) {
        message = message.slice(18); // Slice "\ff\ff\ff\ffinfoResponse\n\\"
        client.close();
        clearTimeout(timeout);
        callback(message);
    });
};

queryAvailableServers(function(data){
    for (var i = 0; i < data.length; i++) {
        socket = data[i].split(':');

        getServerInfo(socket[0], socket[1], function(data){
            var parts = data.toString().split("\\");
            var serverDetails = {};

            for(var i = 0; i < parts.length; i += 2) {  // take every second element
                var key = parts[i];
                var value = parts[i+1];
                serverDetails[key] = value;
            }

            console.log(serverDetails);
        });
    }
});
