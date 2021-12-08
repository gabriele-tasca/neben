// Importing the required modules
const WebSocketServer = require('ws');
const crypto = require("crypto");
const express=require('express');

const fs = require('fs');
const http = require('http');
const https = require('https');

var privateKey  = fs.readFileSync('game/sslcert/privkey.pem', 'utf8');
var certificate = fs.readFileSync('game/sslcert/cert.pem', 'utf8');
var credentials = {key: privateKey, cert: certificate};

const HTTP_PORT = process.env.PORT || 3000;

// const server = express()
//   .use( express.static('game') )
//   .listen(HTTP_PORT, () => console.log(`The HTTP server is listening on ${HTTP_PORT}`));

var server = express();

var httpServer = http.createServer(server);
var httpsServer = https.createServer(credentials, server);

httpServer.listen(8080);
httpsServer.listen(8443);

server.use( express.static('game') )
  .listen(HTTP_PORT, () => console.log(`The HTTP server is listening on port ${HTTP_PORT}`));





// //ENABLE CORS
// // server.all('/', function(req, res, next) {
// //   res.header("Access-Control-Allow-Origin", "*");
// //   res.header("Access-Control-Allow-Headers", "X-Requested-With");
// //   next();
// //  });





const frame_msecs = 100

// game data
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

let player_list = {};


function playerDict(id) {
    let dict = {};
    dict[id] = player_list[id];
    return dict;
}

function addNewPlayer(newId) {
    let pos = randomPosition()
    let newPlayer = new Player( pos[0], pos[1] );
    player_list[newId] = newPlayer;
}

function broadcastOpaqueData(data) {
    wss.clients.forEach(client => client.send(data));
}


// message for destroying single player
function destroyPlayerMessage(player_id) {
    return "q"+JSON.stringify(player_id);
}
function broadcastDestroyPlayerMessage(player_id) {
    wss.clients.forEach(client => client.send( destroyPlayerMessage(player_id)) );
}


// message for creating a single player
function createPlayerMessage(player_id) {
    return "p"+JSON.stringify(playerDict(player_id));
}
function broadcastCreatePlayerMessage(player_id) {
    wss.clients.forEach(client => client.send( createPlayerMessage(player_id)) );
}

// message for creating all existing player_list 
function CreateAllPlayersMessage(player_list) {
    return "p"+JSON.stringify(player_list);
}

// message for letting the client know his own ID
function OwnIdMessage(clientId) {
    return "o"+JSON.stringify(clientId);
}





// Creating a new websocket server
const wss = new WebSocketServer.Server({ httpsServer });

// Creating connection using websocket
wss.on("connection", ws => {
    console.log("new connection ", ws._socket.remoteAddress);
    let clientId = randomId();
    ws.send( OwnIdMessage(clientId) );

    // tell the newfriend to create all pre-existing player_list
    ws.send( CreateAllPlayersMessage(player_list) );

    // add the newfriend's player to the list and tell everyone to create him
    addNewPlayer(clientId);
    broadcastCreatePlayerMessage( clientId );


    // sending message
    ws.on("message", data => {
        let packet = String(data);
        let code = packet.substring(0,1);
        message = JSON.parse(packet.substring(1));
        
        // modify server state
        if (code == "w") walk(message[0], message[1], message[2]);


        // for all events, simply rebroadcast the received packet 
        // to everyone, and they'll know what to do
        broadcastOpaqueData(data);
    });


    // handling what to do when clients disconnects from server
    ws.on("close", () => {
        console.log(ws._socket.remoteAddress, " disconnected");
        broadcastDestroyPlayerMessage(clientId)
        delete player_list[clientId];
    });


    // handling client connection error
    ws.onerror = function () {
        console.log("Some Error occurred")
    }
});
console.log("The WebSocket server is running on port", "???");




// frame tick loop or whatever. currently not used.
// setInterval( function() {
//     frameTick()
// }, 100);
// function frameTick() {
//     broadcastPlayerData(JSON.stringify(player_list));
// }




function walk(id, x, y) {
    player_list[id].x += x
    player_list[id].y += y
}





function randomId() {
	return Math.abs(new Int32Array(crypto.randomBytes(4).buffer)[0]);
}


function randomPosition() {
    let x = Math.floor(Math.random()*12);
    let y = Math.floor(Math.random()*7);
    console.log(y);
    return [x,y]
}
