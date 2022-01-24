extends Node


var server

var connected = false

var latest_w_packet_sent = 0


# Our WebSocketClient instance
var _client = WebSocketClient.new()

func _ready():
	# Connect base signals to get notified of connection open, close, and errors.
	_client.connect("connection_closed", self, "_closed")
	_client.connect("connection_error", self, "_closed")
	_client.connect("connection_established", self, "_connected")
	# This signal is emitted when not using the Multiplayer API every time
	# a full packet is received.
	# Alternatively, you could check get_peer(1).get_available_packets() in a loop.
	_client.connect("data_received", self, "_on_data")
	attempt_connection()



func attempt_connection():
	if connected == true:
		_client.disconnect_from_host()
		handle_lost_connection()
		return
	
	Global.world.clear()
	# Initiate connection to the given URL.
	print("attempting connection to ", Global.websocket_url)
	var err = _client.connect_to_url(Global.websocket_url)
	if err != OK:
		handle_lost_connection_and_retry()
#		print("Unable to connect")
#		set_process(false)
	yield(Global.main_ui, "ready")
	Global.main_ui.connecting_label_mode_connecting()

func _closed(_was_clean = false):
	print("closed: was_clean ", _was_clean)
	# was_clean will tell you if the disconnection was correctly notified
	# by the remote peer before closing the socket.
	handle_lost_connection_and_retry()
#	set_process(false)

func _connected(_proto = ""):
	connected = true
	Global.main_ui.connecting_label_mode_ok()
	# This is called on connection, "proto" will be the selected WebSocket
	# sub-protocol (which is optional)
#	print("Connected with protocol: ", proto)
	# You MUST always use get_peer(1).put_packet to send data to server,
	# and not put_packet directly when not using the MultiplayerAPI.
#	server.put_packet("Test packet".to_utf8())
	$ping_timer.start()
	server = _client.get_peer(1)
	# clear all world data, if there is any:


func _on_data():
	# Print the received packet, you MUST always use get_peer(1).get_packet
	# to receive data from server, and not get_packet directly when not
	# using the MultiplayerAPI.
	var packet = server.get_packet().get_string_from_utf8()
	var code = packet.left(1)
	var message = parse(packet.right(1))
	
#	$console.text += "\n"+ str(code) + " " + str(message)
	
	if code == "o":
		Global.world.own_id = message
	
	if code == "p":
		Global.world.create_units(message)
	if code == "u":
		Global.world.sync_positions(message)
	
	if code == "q":
		Global.world.destroy_player(message)
	
	if code == "c":
		Global.world.make_player_talk(message)

	if code == "a":
		Global.world.cosmetic_attack(message)

func _process(_delta):
	# Call this in _process or _physics_process. Data transfer, and signals
	# emission will only happen when calling this function.
	_client.poll()


func parse(message):
	return JSON.parse(message).result


func send_walk_message(step):
	var message = "w"+JSON.print([step, latest_w_packet_sent])
	server.put_packet(message.to_utf8())


func send_chat_message(chat_message):
	var message = "c"+JSON.print([Global.world.own_id, chat_message.left(Global.max_chat_message_characters)])
	server.put_packet(message.to_utf8())

func send_hit_message(target_id):
	var message = "h"+JSON.print([target_id, Global.world.own_player.get_dir()])
	server.put_packet(message.to_utf8())

func send_attack_message():
	var message = "a"+JSON.print([Global.world.own_id, Global.world.own_player.get_dir()])
	server.put_packet(message.to_utf8())


func _on_ping_timer_timeout():
	server.put_packet(("").to_utf8())


func handle_lost_connection():
	print("lost")
	connected = false
	Global.main_ui.connecting_label_mode_connection_failed()


func handle_lost_connection_and_retry():
	handle_lost_connection()
	yield(get_tree().create_timer(1.0), "timeout")
	attempt_connection()
