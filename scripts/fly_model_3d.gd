class_name FlyModel3D
extends Node3D
## 3D-модель мухи дрозофилы (Drosophila melanogaster) со световыми мечами
## Имеет процедурную анимацию трепетания крыльев (200 Гц), глаз и световых мечей

@onready var body_root: Node3D = $BodyRoot
@onready var left_wing: Node3D = $BodyRoot/LeftWing
@onready var right_wing: Node3D = $BodyRoot/RightWing
@onready var left_saber: Node3D = $LeftSaber
@onready var right_saber: Node3D = $RightSaber
@onready var left_eye: MeshInstance3D = $BodyRoot/LeftEye
@onready var right_eye: MeshInstance3D = $BodyRoot/RightEye

var wing_time: float = 0.0
var wing_speed: float = 65.0
var flutter_amplitude: float = 0.65

# Анимация взмахов мечами
var left_swing_timer: float = 0.0
var right_swing_timer: float = 0.0
var swing_duration: float = 0.18

# Реакция на "Бобо" (дрожь / спазм)
var pain_shake_timer: float = 0.0

func _process(delta: float) -> void:
	# 1. Трепетание крыльев с частотой ~200 Гц
	wing_time += delta * wing_speed
	var flap = sin(wing_time) * flutter_amplitude
	if left_wing and right_wing:
		left_wing.rotation.x = flap
		right_wing.rotation.x = -flap
		
	# 2. Дрожь при получении "бобо" (рефлекторный спазм)
	if pain_shake_timer > 0.0:
		pain_shake_timer -= delta
		var shake = (randf() - 0.5) * 0.12
		body_root.position.x = shake
		body_root.position.y = shake * 0.8
	else:
		# Плавное зависание в воздухе
		body_root.position.x = lerp(body_root.position.x, 0.0, delta * 10.0)
		body_root.position.y = sin(Time.get_ticks_msec() * 0.003) * 0.05
		
	# 3. Анимация левого меча (Cyan)
	if left_swing_timer > 0.0:
		left_swing_timer -= delta
		var progress = 1.0 - (left_swing_timer / swing_duration)
		left_saber.rotation.x = -0.4 - sin(progress * PI) * 1.5
	else:
		left_saber.rotation.x = lerp(left_saber.rotation.x, -0.25, delta * 15.0)
		
	# 4. Анимация правого меча (Red)
	if right_swing_timer > 0.0:
		right_swing_timer -= delta
		var progress = 1.0 - (right_swing_timer / swing_duration)
		right_saber.rotation.x = -0.4 - sin(progress * PI) * 1.5
	else:
		right_saber.rotation.x = lerp(right_saber.rotation.x, -0.25, delta * 15.0)

## Взмах мечом
func swing_saber(saber: String, direction: String) -> void:
	if saber == "left":
		left_swing_timer = swing_duration
	elif saber == "right":
		right_swing_timer = swing_duration

## Визуальная реакция на дофамин (глаза сияют, крылья бьются быстрее)
func on_dopamine_boost(amount: float) -> void:
	flutter_amplitude = 0.9
	wing_speed = 85.0
	# Возвращаем к норме через таймер
	var tween = create_tween()
	tween.tween_property(self, "flutter_amplitude", 0.65, 0.5)
	tween.parallel().tween_property(self, "wing_speed", 65.0, 0.5)

## Визуальная реакция на "бобо" (муха дёргается от ноцицептивного шока)
func on_pain_hit(severity: float) -> void:
	pain_shake_timer = 0.25
	flutter_amplitude = 0.3 # Крылья на миг замирают от шока
	var tween = create_tween()
	tween.tween_property(self, "flutter_amplitude", 0.65, 0.4)
