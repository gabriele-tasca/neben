extends CanvasLayer

export var line_edit_path: NodePath
onready var line_edit = get_node(line_edit_path)

export var chatbox_scrollcontainer_path: NodePath
onready var chatbox_scrollcontainer = get_node(chatbox_scrollcontainer_path)

export var chatbox_vbox_path: NodePath
onready var chatbox_vbox = get_node(chatbox_vbox_path)

export var mouse_detect_panel_path: NodePath
onready var mouse_detect_panel = get_node(mouse_detect_panel_path)
onready var mouse_detect_AABB = Rect2(mouse_detect_panel.rect_global_position, mouse_detect_panel.rect_size)

func _input(event):
	if event.is_action_pressed("chat"):
		if line_edit.visible == false:
			line_edit.visible = true
			line_edit.grab_focus()
		elif line_edit.visible == true:
			if line_edit.text != "": local_send(line_edit.text)
			line_edit.clear()
			line_edit.visible = false

	if event.is_action_pressed("ui_cancel"):
		line_edit.visible = false
		line_edit.clear()
	
	
	if event is InputEventMouseMotion:
		if mouse_detect_AABB.has_point(event.position):
			show_chatbox_scrollbar()
		else:
			hide_chatbox_scrollbar()


func local_send(message):
	if Global.ws_client.connected == true:
		Global.ws_client.send_chat_message(message)
		add_to_chatbox(chatbox_format(Global.world.own_player.properties.name, message))
		Global.world.own_player.talk(message)

func _ready():
	line_edit.visible = false
#	hide_chatbox_scrollbar()



func hide_chatbox_scrollbar():
	chatbox_scrollcontainer.get_v_scrollbar().rect_scale.x = 0

func show_chatbox_scrollbar():
	chatbox_scrollcontainer.get_v_scrollbar().rect_scale.x = 1


var CHAT_MESSAGE = preload("res://scenes/chat/chat_message.tscn")

func add_to_chatbox(string):
	var a = CHAT_MESSAGE.instance()
	a.text = string
	chatbox_vbox.add_child(a)
	yield(get_tree(), "idle_frame")
	chatbox_scrollcontainer.scroll_vertical = chatbox_scrollcontainer.get_v_scrollbar().max_value

func chatbox_format(name, message):
	return name + ": " + message

func is_focused():
	return ($Control.get_focus_owner() == null)
