extends Node2D

var id
var grid_x
var grid_y
var player_name

var properties = {}

onready var base_scale_x = Global.pixel_scale

func _ready():
	$Sprite.scale.x = base_scale_x
	$Sprite.scale.y = base_scale_x


func _set(property, value):
	if property == "global_position":
		if value.x > global_position.x:
			$Sprite.scale.x = base_scale_x
		elif value.x < global_position.x:
			$Sprite.scale.x = -base_scale_x


func set_data(l_id, unit_data):
	self.id = l_id
	for p in unit_data:
		properties[p] = unit_data[p]



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


func _on_Area2D_area_entered(_area):
	Global.ws_client.send_hit_message(id)
