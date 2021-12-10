const WebSocketServer = require('ws');
const crypto = require("crypto");
const express=require('express');
const Ajv = require("ajv/dist/jtd")


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


const ajv = new Ajv() // options can be passed, e.g. {allErrors: true}


// schemas for JSON messages

// ajv functions:
// compile --> JSON validation
//          for when the message gets relayed to 
//          others but not used here. 
//          example: chat
//
// compileSerializer --> turn server object into JSON
//          for when the server sends a message on its own volition
//          example: NPC actions I guess. 
//          no validation needed.
//
// compileParser --> turn JSON into server object
//          for when the incoming data gets passed to some function and used here on server.
//          example: player walking
//          Parser also validates it, so if Parser is successful the message 
//          can also be safely relayed to everyone else.


// chat message - "c"
// Validate only
const chat_schema = { "type": "string" }
const chat_val = ajv.compile(chat_schema) 

// walk message - "w"
// Parse only. 
// NPCs will need Serialize. 
const walk_schema = {
    properties: {
        id: {type: "int32"},
        x: {type: "int32"},
        y: {type: "int32"},
    },
}
const walk_parse = ajv.compileParser(walk_schema)





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

        // modify server state
        if (code == "w") {
            let obj = walk_parse(packet.substring(1));
            if (obj) walk(obj);
            broadcastOpaqueData(data);
        }

        if (code == "c") {
            if (chat_val(packet.substring(1))) broadcastOpaqueData(data);
            console.log(packet.substring(1))
            console.log("validated? ",chat_val(packet.substring(1)))
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




function walk(info) {
    player_list[info.id].x += info.x
    player_list[info.id].y += info.y
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

