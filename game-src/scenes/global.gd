extends Node

var server_skip = 4

var dirs = [Vector2.UP, Vector2.RIGHT, Vector2.DOWN, Vector2.LEFT, \
			  (Vector2.UP + Vector2.RIGHT).normalized(), 
			  (Vector2.RIGHT + Vector2.DOWN).normalized(), 
			  (Vector2.DOWN + Vector2.LEFT).normalized(), 
			  (Vector2.LEFT + Vector2.UP).normalized(), 
			  Vector2.ZERO, ]

const pixel_scale = 3
const tile_size = 24 * 4
const max_chat_message_characters = 200

onready var ws_client = get_node("/root/root/ws_client")

onready var chat = get_node("/root/root/chat")

onready var main_ui = get_node("/root/root/main_ui")

onready var world = get_node("/root/root/world")




# insanity looms.
# there are at least four relevant cases.
# ITCH BUILD + REMOTE SERVER: 
#         needs SSL.
#         url: "wss://frozen-woodland-25572.herokuapp.com:443" CONFIRMED
# NATIVE + REMOTE SERVER:
#         needs NO SSL. it needs SSL to NOT be used.
#         url: "ws://frozen-woodland-25572.herokuapp.com:80" ALMOST CONFIRMED
#            note that in the theoretical future people might want to have SSL 
#               working in this case (from native) as well   
# NATIVE + LOCALHOST:
#         needs NO SSL. it needs SSL to NOT be used.
#         url: "ws://localhost:9080" CONFIRMED
# ITCH BUILD + LOCALHOST:
#         don't care about this right now.
#         probably needs no SSL, but whatever.

onready var localhost = decide_if_localhost()


# for HTML5, always go remote, in case I fuck up and upload 
#    a debug build. localhost from itch doesn't work anyway.
# for native, go localhost only if debugging.
#    this correctly sends the F5 debug to localhost,
#    but means that when exporting native builds debug has 
#    to be turned off.
func decide_if_localhost():
#	return false
	if OS.get_name() == "HTML5":
		return false
	else:
		return OS.is_debug_build()


func get_websocket_url():
	if localhost == true:
		# LOCALHOST is always the same.
		return "ws://localhost:9080"
	else:
		if OS.get_name() == "HTML5":
			# REMOTE HTML5 (ITCH BUILD)
			return "wss://frozen-woodland-25572.herokuapp.com:443"
		else:
			# REMOTE NATIVE (F5 testing)
			return "ws://frozen-woodland-25572.herokuapp.com:80"


onready var websocket_url = get_websocket_url()

