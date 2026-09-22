class_name Cube3D
extends Node3D
## Кубик Beat Saber для дрозофилы
## Летит навстречу мухе, разрубается на 2 половинки

signal sliced(cube: Cube3D, hit_direction: String)
signal missed(cube: Cube3D)

@export var color_type: String = "cyan" # "cyan" (left) или "red" (right)
@export var slice_direction: String = "down" # "up", "down", "left", "right", "any"
@export var speed: float = 14.0

var is_active: bool = true
var target_z: float = 0.5
var miss_z: float = 3.5

func _ready() -> void:
	update_appearance()

func update_appearance() -> void:
	var mesh_inst = $MeshInstance3D
	if not mesh_inst:
		return
	var mat = StandardMaterial3D.new()
	if color_type == "cyan":
		mat.albedo_color = Color(0.0, 0.85, 1.0)
		mat.emission_enabled = true
		mat.emission = Color(0.0, 0.5, 0.9)
	elif color_type == "red":
		mat.albedo_color = Color(1.0, 0.05, 0.35)
		mat.emission_enabled = true
		mat.emission = Color(0.9, 0.0, 0.2)
	else:
		mat.albedo_color = Color(1.0, 0.8, 0.1) # Золотой дофаминовый кубик
		mat.emission_enabled = true
		mat.emission = Color(0.8, 0.6, 0.0)
	mesh_inst.material_override = mat

func _process(delta: float) -> void:
	if not is_active:
		return
	
	# Движение вперед к мухе
	position.z += speed * delta
	
	# Пропуск кубика
	if position.z > miss_z:
		is_active = false
		missed.emit(self)
		queue_free()

## Разрубание кубика
func cut(by_saber: String, direction: String) -> void:
	if not is_active:
		return
	is_active = false
	sliced.emit(self, direction)
	
	# Спавн двух разлетающихся половинок
	spawn_cut_halves()
	queue_free()

func spawn_cut_halves() -> void:
	# Две половинки разлетаются в стороны
	for sign_dir in [-1, 1]:
		var half = RigidBody3D.new()
		var box_mesh = MeshInstance3D.new()
		var box_geo = BoxMesh.new()
		box_geo.size = Vector3(0.25, 0.5, 0.5)
		box_mesh.mesh = box_geo
		
		var mat = StandardMaterial3D.new()
		mat.albedo_color = Color(0.0, 0.9, 1.0) if color_type == "cyan" else Color(1.0, 0.1, 0.3)
		mat.emission_enabled = true
		mat.emission = mat.albedo_color * 0.7
		box_mesh.material_override = mat
		
		half.add_child(box_mesh)
		get_parent().add_child(half)
		half.global_position = global_position + Vector3(sign_dir * 0.15, 0, 0)
		half.linear_velocity = Vector3(sign_dir * 3.5, 3.0, 4.0)
		half.angular_velocity = Vector3(randf() * 10, randf() * 10, randf() * 10)
		
		# Удаление осколков через 1 секунду
		var timer = get_tree().create_timer(1.0)
		timer.timeout.connect(half.queue_free)
