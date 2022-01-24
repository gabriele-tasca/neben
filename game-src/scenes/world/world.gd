extends Node2D

var player_list = {}

var own_id = null
var own_player = null


const PLAYER = preload("res://scenes/player/player.tscn")
const SLIME = preload("res://scenes/slime/slime.tscn")

func create_new_unit(id, unit_data):
	if unit_data["type"] == "player":
		print(unit_data)
		var player = PLAYER.instance()
		Global.world.add_child(player)
		player.set_data(id, unit_data)
		player_list[str(id)] = player
		if id == str(own_id):
			setup_own_player(player)
	elif unit_data["type"] == "slime":
		var slime = SLIME.instance()
		Global.world.add_child(slime)
		slime.set_data(id, unit_data)
		player_list[id] = slime



func setup_own_player(player):
	own_player = player
	var camera = Camera2D.new()
	player.add_child(camera)
	player.own_player = true
	camera.current = true


func destroy_player(id):
	if player_list.has(id):
		if is_instance_valid(player_list[id]):
			player_list[id].queue_free()
	player_list.erase(id)


func clear():
	for id in player_list:
		if is_instance_valid(player_list[id]):
			player_list[id].queue_free()
	for id in player_list:
		player_list.erase(id)
	own_player = null
	own_id = null

# multiple players
func create_units(player_data_list):
	for id in player_data_list:
		create_new_unit(id, player_data_list[id])

func sync_positions(units_pos_list):
	# NOTE: this might still be an error (not that it matters)
	for id in units_pos_list:
		if id != str(own_id):
			# just update
#			player_list[id].set_pos(units_pos_list[id])
			# use entity interpolation
			player_list[id].receive_lerp_pos(units_pos_list[id])
		# own_id works differently because he needs
		#    client side prediction.
		else:
			own_player_sync_pos(units_pos_list[id])



func make_player_talk(message):
	if message != null && message.size() == 2:
		var id = message[0]
		var sender = player_list.get(str(id))
		if sender != null && id != own_id:
			var string = message[1]
			if string is String:
				sender.talk(string)
				var formatted_str = Global.chat.chatbox_format(sender.properties.name, string)
				Global.chat.add_to_chatbox(formatted_str)


func cosmetic_attack(message):
	var id = message[0]
	var sender = player_list.get(str(id))
	if sender != null && id != own_id:
		var dir = message[1]
		if dir <= 8:
			sender.set_dir(dir)
			sender.cosmetic_attack()




func _physics_process(delta):
	if Global.ws_client.connected == true && Global.world.own_player != null:
			var have_to_send = false
			
			if Input.is_action_pressed("walk_up"):
				own_player.set_dir(0)
				have_to_send = true
			if Input.is_action_pressed("walk_right"):
				own_player.set_dir(1)
				have_to_send = true
			if Input.is_action_pressed("walk_down"):
				own_player.set_dir(2)
				have_to_send = true
			if Input.is_action_pressed("walk_left"):
				own_player.set_dir(3)
				have_to_send = true
			if Input.is_action_pressed("walk_right") and Input.is_action_pressed("walk_up"):
				own_player.set_dir(4)
				have_to_send = true
			if Input.is_action_pressed("walk_right") and Input.is_action_pressed("walk_down"):
				own_player.set_dir(5)
				have_to_send = true
			if Input.is_action_pressed("walk_left") and Input.is_action_pressed("walk_down"):
				own_player.set_dir(6)
				have_to_send = true
			if Input.is_action_pressed("walk_left") and Input.is_action_pressed("walk_up"):
				own_player.set_dir(7)
				have_to_send = true
			
			if own_player.properties.dir != 8 && have_to_send == true:
				Global.ws_client.latest_w_packet_sent += 1
				own_player_sent_dirs.push_back([own_player.properties.dir, Global.ws_client.latest_w_packet_sent])
				Global.ws_client.send_walk_message(own_player.properties.dir)
				own_player.local_walk(own_player.properties.dir, delta)
			
			if Input.is_action_pressed("attack"):
				own_player.attack()

var own_player_sent_dirs = []

var last_server_pos = Vector2.ZERO
func own_player_sync_pos(message):
	var x = message[0]
	var y = message[1]
	var pos = [x,y]
	var n_w_packet = message[2]
	var count = 0
	# read
	for p in own_player_sent_dirs:
		if p[1] <= (n_w_packet ):
			count += 1
			pass
		else:
			if p[0] != 8:
				apply_dir(pos,p[0],own_player.properties.speed / Global.server_skip)
	# clear
	for i in range(0,count):
		own_player_sent_dirs.pop_front()
#	print("server sync - ",Vector2(pos[0], pos[1]) )
#	get_node("/root/root/Sprite/Label").text += (str(Vector2(pos[0], pos[1])) + "\n")
	own_player.set_pos(pos)
	last_server_pos = Vector2(pos[0], pos[1])


func apply_dir(pos,dir,speed):
	pos[0] += Global.dirs[dir][0] * (speed)
	pos[1] += Global.dirs[dir][1] * (speed)
