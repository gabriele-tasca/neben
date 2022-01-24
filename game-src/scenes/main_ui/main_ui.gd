extends CanvasLayer

export var connecting_label_path: NodePath
onready var connecting_label = get_node(connecting_label_path)
export var retry_connection_button_path: NodePath
onready var retry_connection_button = get_node(retry_connection_button_path)

var connecting_label_mode = 0

const SERVER_PANEL = preload("res://scenes/main_ui/ServerPanel.tscn")
func _ready():
	if OS.get_name() != "HTML5":
		var server_panel = SERVER_PANEL.instance()
		$options_tree/VboxContainer.add_child(server_panel)


func connecting_label_mode_connecting():
	if connecting_label_mode != 0:
		$connection_tree.visible = true
		connecting_label.text = "connecting..."
		retry_connection_button.visible = false
		connecting_label_mode = 0
func connecting_label_mode_ok():
	if connecting_label_mode != 1:
		$connection_tree.visible = false
		connecting_label_mode = 1
func connecting_label_mode_connection_failed():
	if connecting_label_mode != 2:
		$connection_tree.visible = true
		connecting_label.text = "couldn't connect to the server."
		retry_connection_button.visible = true
	connecting_label_mode = 2
	


func _on_RetryConnectionButton_pressed():
	Global.ws_client.attempt_connection()
	var r = connecting_label.get_parent()
	for a in r.get_children():
		a.visible = false
	yield(get_tree().create_timer(0.03), "timeout")
	for a in r.get_children():
		a.visible = true

var visible_options = true
func _on_OptionsButton_pressed():
	visible_options = !visible_options
	for c in $options_tree/VboxContainer.get_children():
		if c != $options_tree/VboxContainer/OptionsButton:
			c.visible = visible_options
			print(c.visible)
