const WebSocketServer = require('ws');
const crypto = require("crypto");
const express=require('express');


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

// "public" properties, get sent to everybody when they join, 
//      or on event when they change
let unit_list = {};
// private properties, only for internal use. there's like 1 of these
let unit_priv_list = {};
// position, sent to everyone every frame
let unit_pos_list = {};

let slime_count = 0;



function CreateNewPlayer(newId) {
    unit_list[newId] = { type:"player", name:randomName(), speed: 15, dir: 9 };
    unit_pos_list[newId] = randomPosition();
    unit_priv_list[newId] = {n_w_pack: 0};
    broadcast(createPlayerMessage( newId ));
}

function spawnSlime() {
    slime_count += 1;
    let newId = randomId()
    unit_pos_list[newId] = randomPosition();
    unit_list[newId] = {type: "slime", speed: 1, hp: 50, dir: randomDir()};
    unit_priv_list[newId] = {interval: setInterval(slimeAI, 2500, newId)};
    // startSlimeActionLoop(newId);
    broadcast(createPlayerMessage( newId ));
}

function slimeAI(id) {

    // unit_list[id].dir = 2;
    unit_list[id].dir = randomDir();
}


function destroyUnit(id) {
    if (unit_priv_list[id].interval != null) {
        clearInterval(unit_priv_list[id].interval);
        if (unit_list[id].type == "slime") slime_count -= 1;
    }
    delete unit_list[id];
    delete unit_pos_list[id];
    broadcast(destroyUnitMessage(id))
}

function broadcast(data) {
    wss.clients.forEach(client => client.send(data));
}


// message for destroying single player
function destroyUnitMessage(player_id) {
    return "q"+JSON.stringify(player_id);
}


function playerDict(id) {
    let dict = {};
    dict[id] = Object.assign({}, unit_list[id]);
    return dict;
}
// message for creating a single player
function createPlayerMessage(id) {
    return "p"+JSON.stringify(playerDict(id));
}


// message for creating all existing unit_list 
function CreateAllPlayersMessage() {
    return "p"+JSON.stringify(unit_list);
}

function syncAllUnitPosMessage() {
    return "u"+JSON.stringify(unit_pos_list);
}

// function syncSingleUnitPosMessage() {
//     return "v"+JSON.stringify(unit_pos_list[id]);
// }

// message for letting the client know his own ID
function OwnIdMessage(clientId) {
    return "o"+JSON.stringify(clientId);
}



function readMessageWalk(senderId, message) {
    let params = JSON.parse(message);
    if (params.length == 2) {
        unit_priv_list[senderId].n_w_pack += 1;
        set_dir(senderId, params[0]);
    } else { throw Error }
}

function readMessageHit(senderId, message) {
    let params;
    try { params = JSON.parse(message); }
    catch (error) { console.log(e); }
    let targetId = params[0];
    let damage = 20;
    // CHECK that it hits, and that the target can be hit, etc
    unit_list[targetId]["hp"] -= damage
    if (unit_list[targetId]["hp"] <= 0) destroyUnit(targetId);
}

function CreateWalkReply(senderId, message) {
    let serverPos = unit_pos_list[senderId];
    let n_w_pack = unit_priv_list[senderId].n_w_pack;
    return "W"+JSON.stringify([serverPos, n_w_pack]);
}



// connections / events
wss.on("connection", ws => {
    console.log("new connection ", ws._socket.remoteAddress);
    let clientId = randomId();
    ws.send( OwnIdMessage(clientId) );

    // tell the newfriend to create all pre-existing unit_list
    ws.send( CreateAllPlayersMessage() );
    // and maybe sync their positions immediately?
    ws.send( syncAllUnitPosMessage() );

    // add the newfriend's player to the list and tell everyone to create him
    CreateNewPlayer(clientId);

    // sending message
    ws.on("message", data => {
        let packet = String(data);
        let code = packet.substring(0,1);
        let message = packet.substring(1)

        // modify server state
        if (code == "w") {
                // world effect
                readMessageWalk(clientId, message);
                // reply to sender
                ws.send( CreateWalkReply(clientId, message) );

        } 

        if (code == "h") {
            readMessageHit(clientId, message);
        }


        if (code == "c") {
            // since normally the message isn't even parsed,
            // we don't bother validating it in any way.
            // this time it's the clients that will have to deal with it
            broadcast(data);
            console.log(Date.now(), "-", message)
        }

        if (code == "a") {
            // this is purely cosmetic. actually hitting things
            // works with the "h" message, so that the server 
            // has to do way less collision checks.
            // so it's not validated.
            broadcast(data);
        }

    });


    // handling what to do when clients disconnects from server
    ws.on("close", () => {
        console.log(ws._socket.remoteAddress, " disconnected");
        destroyUnit(clientId);
    });


    // handling client connection error
    ws.onerror = function () {
        console.log("Some Error occurred")
    }
});
console.log("The WebSocket server is running on port", "???");


// // background processes or whatever
function background() {
    if (slime_count < 20) {
        if (slime_count < 5) {
            for (let i = 0; i < 4; i++) spawnSlime()
        }
        spawnSlime()
        broadcast( syncAllUnitPosMessage() );

    }
}
background();
setInterval( function() {
    background()
}, 7600);

let frame_ms = 1000/15;
// frame / tick / update loop
let oldTime = Date.now()
function frameTick() {
    moveUnits();
    broadcast(syncAllUnitPosMessage());
    
    let delta = getFrameTime();
    if (delta > (frame_ms+2 )) console.log("frame time:", delta);
}
setInterval( function() {
    frameTick()
}, frame_ms);


function moveUnits() {
    for (var id in unit_list) {
        make_unit_walk(id, unit_list[id].dir);
    }
}

// 0,1,2,3 is clockwise from noon (with the godot convention for y, i.e. negative north)
function set_dir(id, dir) {
    if (dir <= 8) unit_list[id].dir = dir;
    else throw Error;
}


// 0,1,2,3 is clockwise from noon (with the godot convention for y, i.e. negative north)
function make_unit_walk(id, dir) {
    var speed = unit_list[id].speed;
    var diag_speed = speed * 0.707106781;
    switch (dir) {
        case 0:
            unit_pos_list[id][1] -= speed; return;
        case 1:
            unit_pos_list[id][0] += speed; return;
        case 2:
            unit_pos_list[id][1] += speed; return;
        case 3:
            unit_pos_list[id][0] -= speed; return;

        case 4:
            unit_pos_list[id][0] += diag_speed;
            unit_pos_list[id][1] -= diag_speed; return;
        case 5:
            unit_pos_list[id][0] += diag_speed;
            unit_pos_list[id][1] += diag_speed; return;
        case 6:
            unit_pos_list[id][0] -= diag_speed;
            unit_pos_list[id][1] += diag_speed; return; 
        case 7:
            unit_pos_list[id][0] -= diag_speed;
            unit_pos_list[id][1] -= diag_speed; return; 
    }
}



function randomId() {
	return Math.abs(new Int32Array(crypto.randomBytes(4).buffer)[0]);
}


function randomPosition() {
    let x = Math.floor(Math.random()*600);
    let y = Math.floor(Math.random()*400);
    return [x,y]
}

function randomName() {
    return "anon"+String(Math.floor(Math.random()*999));
}

function randomDir() {
    return Math.floor(Math.random()*9);
}

function getFrameTime() {
    let newTime = Date.now();
    let delta = newTime - oldTime;
    oldTime = newTime;
    return delta;
}