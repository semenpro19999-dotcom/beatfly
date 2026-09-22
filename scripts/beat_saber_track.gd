class_name BeatSaberTrack
extends Node3D
## Главный координатор трассы Beat Saber и системы самостоятельного обучения мухи
## Блоки летят по 4 полосам, как в оригинальном Beat Saber:
## Красный (Левая лапка) и Синий (Правая лапка).

@export var bpm: float = 128.0
@export var speed: float = 16.0

@onready var fly_model: FlyModel3D = $FlyModel
@onready var fly_brain: FlyBrainRL = $FlyBrain
@onready var cubes_container: Node3D = $CubesContainer
@onready var hud_label: Label = $CanvasLayer/HUD/StatsLabel
@onready var dopamine_bar: ProgressBar = $CanvasLayer/HUD/DopamineBar
@onready var pain_bar: ProgressBar = $CanvasLayer/HUD/PainBar
@onready var neuron_label: Label = $CanvasLayer/HUD/NeuronLabel

var spawn_timer: float = 0.0
var beat_interval: float = 60.0 / 128.0

# 4 полосы Beat Saber и 2 уровня высоты
var lanes = [-1.5, -0.5, 0.5, 1.5]
var heights = [0.8, 1.55]
var directions = ["down", "down", "up", "left", "right"]

func _ready() -> void:
	beat_interval = 60.0 / bpm
	fly_brain.dopamine_spike.connect(_on_dopamine_spike)
	fly_brain.nociception_spike.connect(_on_pain_spike)
	fly_brain.action_taken.connect(_on_fly_action)

func _process(delta: float) -> void:
	spawn_timer += delta
	if spawn_timer >= beat_interval:
		spawn_timer -= beat_interval
		spawn_cube_wave()
		
	# Муха оценивает кубики и самостоятельно пытается их разрезать
	process_fly_interaction()
	update_ui()

func spawn_cube_wave() -> void:
	var lane_idx = randi() % lanes.size()
	var height_idx = randi() % heights.size()
	var dir_idx = randi() % directions.size()
	
	var cube_x = lanes[lane_idx]
	var cube_y = heights[height_idx]
	var dir = directions[dir_idx]
	# По классике Beat Saber: красные блоки (слева), синие блоки (справа)
	var color = "red" if cube_x < 0 else "blue"
	
	var cube = Cube3D.new()
	cube.color_type = color
	cube.slice_direction = dir
	cube.speed = speed
	cube.position = Vector3(cube_x, cube_y, -50.0)
	
	cube.missed.connect(_on_cube_missed)
	cubes_container.add_child(cube)

func process_fly_interaction() -> void:
	for child in cubes_container.get_children():
		var cube = child as Cube3D
		if cube and cube.is_active:
			var dist = 0.6 - cube.position.z
			# Зона принятия решений мухи: от 4.0 до -0.5 метров
			if cube.position.z >= -4.0 and not cube.has_meta("evaluated"):
				cube.set_meta("evaluated", true)
				var lane_id = 0 if cube.position.x < 0 else 1
				var height_id = 0 if cube.position.y < 1.1 else 1
				
				# Муха САМА принимает решение через грибовидное тело (Q-Learning)
				var action = fly_brain.decide_action(lane_id, height_id, cube.color_type, cube.slice_direction)
				cube.set_meta("action", action)
			
			# Физическое попадание в зоне рассечения (z от -0.5 до 1.0)
			if cube.position.z >= -0.5 and cube.position.z <= 1.0:
				if cube.has_meta("action"):
					var action = cube.get_meta("action")
					var expected_saber = "left" if cube.color_type == "red" else "right"
					
					# Проверка: смогла ли муха выбрать правильный меч и взмах?
					if action.saber == expected_saber and action.dir != "none":
						# ПОПАДАНИЕ! Разрубание кубика и выброс ДОФАМИНА
						cube.cut(action.saber, action.dir)
						fly_brain.reward_dopamine(1.0)
					else:
						# Муха ошиблась в выборе действия -> БОБО!
						fly_brain.penalize_pain(1.0)

func _on_cube_missed(_cube: Cube3D) -> void:
	# Пропуск кубика мимо мухи -> штраф "бобо"
	fly_brain.penalize_pain(0.8)

func _on_dopamine_spike(amount: float, neuron_id: String) -> void:
	fly_model.on_dopamine_boost(amount)
	if neuron_label:
		neuron_label.text = "АКТИВЕН (neurons.csv): " + neuron_id + " (+%.1f Дофамин)" % amount
		neuron_label.modulate = Color(0.2, 1.0, 0.4)

func _on_pain_spike(pain_amount: float, neuron_id: String) -> void:
	fly_model.on_pain_hit(abs(pain_amount))
	if neuron_label:
		neuron_label.text = "БОБО! " + neuron_id + " (Штраф %.1f)" % pain_amount
		neuron_label.modulate = Color(1.0, 0.2, 0.2)

func _on_fly_action(saber: String, dir: String) -> void:
	fly_model.swing_saber(saber, dir)

func update_ui() -> void:
	if dopamine_bar:
		dopamine_bar.value = fly_brain.dopamine_level
	if pain_bar:
		pain_bar.value = fly_brain.pain_level
	if hud_label:
		var total = fly_brain.total_hits + fly_brain.total_misses
		var acc = 0.0
		if total > 0:
			acc = (float(fly_brain.total_hits) / total) * 100.0
		hud_label.text = "Срезов: %d | Промахов: %d | Точность мухи: %.1f%%\nИсследование (Эпсилон): %.1f%%" % [
			fly_brain.total_hits, fly_brain.total_misses, acc, fly_brain.epsilon * 100.0
		]
