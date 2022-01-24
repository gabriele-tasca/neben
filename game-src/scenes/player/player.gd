extends Node2D

var id
var grid_x
var grid_y


var own_player = false

var properties = {}


onready var base_scale_x = Global.pixel_scale

func _ready():
	$Sprite.scale.x = base_scale_x
	$Sprite.scale.y = base_scale_x




func set_data(l_id, player_data):
	self.id = l_id
	for p in player_data:
		properties[p] = player_data[p]

func set_pos(pos_data):
	var real_x = pos_data[0]
	var real_y = pos_data[1]
	self.global_position = Vector2(real_x, real_y)


# entity interpolation
var client_only_ticks: float = 0
var past_lerp_pos = Vector2.ZERO
var latest_lerp_pos = Vector2.ZERO
func receive_lerp_pos(pos_data):
	past_lerp_pos = latest_lerp_pos
	latest_lerp_pos = Vector2(pos_data[0], pos_data[1])
	client_only_ticks = 0

func _physics_process(delta):
	if past_lerp_pos != Vector2.ZERO:
		client_only_ticks +=1
		var time_now = OS.get_ticks_usec()
		var weight = float(client_only_ticks)/4.0
		if weight > 0.01 && weight < 1.0:
			var x = lerp(past_lerp_pos.x, latest_lerp_pos.x, weight)
			var y = lerp(past_lerp_pos.y, latest_lerp_pos.y, weight)
			self.set_pos(Vector2(x,y))



func talk(string):
	$speech_bubble.text = string


var can_attack = true
var attack_cooldown = 0.25
var attack_duration = 0.1
func attack():
	if can_attack == true:
		Global.ws_client.send_attack_message()
		can_attack = false
		# rotate and move the hitbox?
		# enable area and sprite
		$attack_hurtbox/CollisionPolygon2D.disabled = false
		$attack_hurtbox/Sprite.visible = true
		yield(get_tree().create_timer(attack_duration), "timeout")
		# disable area and sprite
		$attack_hurtbox/CollisionPolygon2D.disabled = true
		$attack_hurtbox/Sprite.visible = false
		yield(get_tree().create_timer(attack_cooldown), "timeout")
		can_attack = true

func cosmetic_attack():
	# rotate and move the hitbox?
	$attack_hurtbox/Sprite.visible = true
	yield(get_tree().create_timer(attack_duration), "timeout")
	# disable area and sprite
	$attack_hurtbox/Sprite.visible = false


func _set(property, value):
	if own_player == false:
		if property == "global_position":
			if global_position.x - value.x < 0:
				self.scale.x = 1
			elif global_position.x - value.x > 0:
				self.scale.x = -1


func set_dir(dir):
	properties.dir = dir
	if dir == 1 || dir == 4 || dir == 5:
		self.scale.x = 1
#			$Sprite.scale.x = base_scale_x
	elif dir == 3 || dir == 6 || dir == 7 :
		self.scale.x = -1
#			$Sprite.scale.x = -base_scale_x


func get_dir():
	return properties.dir


func local_walk(dir, delta):
	#local walk
#	if properties.dir < 8:
#	print("wtf magic number ", delta*1000/60)
	self.global_position += Global.dirs[dir] * (properties.speed ) /Global.server_skip

