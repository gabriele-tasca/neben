const WebSocketServer = require('ws');
const crypto = require("crypto");
const express=require('express');
const { match } = require('assert');


// server setup

const HTTP_PORT = process.env.PORT || 9080;

const server = express()
  .use( express.static('game') )
  .listen(HTTP_PORT, () => console.log(`The HTTP server is listening on port ${HTTP_PORT}`));


// //ENABLE CORS
// // server.all('/', function(req, res, next) {
// //   res.header("Access-Control-Allow-Origin", "*");
// //   res.header("Access-Control-Allow-Headers", "X-Requested-With");
// //   next();
// //  });


const wss = new WebSocketServer.Server({ server });


// game data
class Player {
    constructor(x, y, name) {
        this.x = x;
        this.y = y;
        this.name = name;
    }
}

let player_list = {};


function playerDict(id) {
    let dict = {};
    dict[id] = player_list[id];
    return dict;
}

function CreateNewPlayer(newId) {
    let pos = randomPosition();
    let name = randomName();
    let newPlayer = new Player( pos[0], pos[1], name );
    player_list[newId] = newPlayer;
}

function broadcastData(data) {
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


function readMessageWalk(message) {
    let params = JSON.parse(message)
    if (params.length == 2) {
        walk(params[0], params[1]);
    } else { throw Error }

}



// Creating connection using websocket
wss.on("connection", ws => {
    console.log("new connection ", ws._socket.remoteAddress);
    let clientId = randomId();
    ws.send( OwnIdMessage(clientId) );

    // tell the newfriend to create all pre-existing player_list
    ws.send( CreateAllPlayersMessage(player_list) );

    // add the newfriend's player to the list and tell everyone to create him
    CreateNewPlayer(clientId);
    broadcastCreatePlayerMessage( clientId );


    // sending message
    ws.on("message", data => {
        let packet = String(data);
        let code = packet.substring(0,1);
        let message = packet.substring(1)

        // modify server state
        if (code == "w") {
            try {
                readMessageWalk(message);
                broadcastData(data);
            } catch(e) {console.log(e)}
        } 

        if (code == "c") {
            // since normally the message isn't even parsed,
            // we don't bother validating it in any way.
            // this time it's the clients that will have to deal with it
            broadcastData(data);
            console.log(Date.now())
        }

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



// 0,1,2,3 is clockwise from noon (with the godot convention for y, i.e. negative north)
function walk(id, dir) {
    switch (dir) {
        case 0:
            player_list[id].y -= 1; return;
        case 1:
            player_list[id].x += 1; return;
        case 2:
            player_list[id].y -= 1; return;
        case 3:
            player_list[id].x -= 1; return;
    }
    throw Error;
}





function randomId() {
	return Math.abs(new Int32Array(crypto.randomBytes(4).buffer)[0]);
}


function randomPosition() {
    let x = Math.floor(Math.random()*6);
    let y = Math.floor(Math.random()*3);
    console.log(y);
    return [x,y]
}

function randomName() {
    return "anon"+String(Math.floor(Math.random()*999))
}

