extends PanelContainer

export var server_option_button_path: NodePath
onready var server_option_button = get_node(server_option_button_path)

var server_option_button_active = false


func _ready():
#	if OS.get_name() == "HTML5":
#		pass
	# setup server_option_button
	# NOTE: 1 and 0 are not arbitrary. they mean true/false.
	server_option_button.add_item("default", 0)
	server_option_button.add_item("localhost", 1)
#	# no important decisions will be taken in this 
#	# shitty UI script. the real default values are decided
#	# in Global.gd. (but the button will still mirror it 
	if Global.localhost == true:
		server_option_button.select(1)
	elif Global.localhost == false:
		server_option_button.select(0)
	
	server_option_button_active = true


func _on_ServerOptionButton_item_selected(index):
	if server_option_button_active == true:
		# 0 and 1 get used as true/false.
		Global.localhost = bool(index)
		Global.websocket_url = Global.get_websocket_url()
		Global.ws_client.attempt_connection()
