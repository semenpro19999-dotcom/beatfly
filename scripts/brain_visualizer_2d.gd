class_name BrainVisualizer2D
extends Control
## Визуальный монитор отделов мозга дрозофилы для Godot 4.7.2 (Клавиша J)
## Отрисовывает анатомические нейропили мозга мухи без текста через CanvasItem _draw()

var is_open: bool = true

var optic_left_act: float = 0.1
var optic_right_act: float = 0.1
var mb_left_act: float = 0.15
var mb_right_act: float = 0.15
var central_complex_act: float = 0.2
var dopamine_act: float = 0.25
var pain_act: float = 0.0
var descending_act: float = 0.1

func _ready() -> void:
	custom_minimum_size = Vector2(320, 260)
	visible = is_open

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_J or event.physical_keycode == KEY_J:
			is_open = !is_open
			visible = is_open
			queue_redraw()

func trigger_optic(lane: int, color_type: String) -> void:
	if lane < 2:
		optic_left_act = 1.0
	else:
		optic_right_act = 1.0
	central_complex_act = min(1.0, central_complex_act + 0.4)
	queue_redraw()

func trigger_dopamine() -> void:
	dopamine_act = 1.0
	mb_left_act = 1.0
	mb_right_act = 1.0
	central_complex_act = 0.85
	descending_act = 0.8
	queue_redraw()

func trigger_pain() -> void:
	pain_act = 1.0
	descending_act = 1.0
	mb_left_act = max(0.1, mb_left_act - 0.5)
	mb_right_act = max(0.1, mb_right_act - 0.5)
	queue_redraw()

func _process(delta: float) -> void:
	if not visible:
		return
	# Затухание активности
	optic_left_act = max(0.08, optic_left_act - delta * 1.8)
	optic_right_act = max(0.08, optic_right_act - delta * 1.8)
	mb_left_act = max(0.12, mb_left_act - delta * 1.4)
	mb_right_act = max(0.12, mb_right_act - delta * 1.4)
	central_complex_act = max(0.15, central_complex_act - delta * 1.6)
	dopamine_act = max(0.1, dopamine_act - delta * 1.2)
	pain_act = max(0.0, pain_act - delta * 2.5)
	descending_act = max(0.08, descending_act - delta * 1.8)
	queue_redraw()

func _draw() -> void:
	var w = size.x
	var h = size.y
	var cx = w / 2.0
	var cy = 110.0
	
	# Фон панели
	draw_rect(Rect2(0, 0, w, h), Color(0.03, 0.05, 0.09, 0.88), true, -1.0)
	draw_rect(Rect2(0, 0, w, h), Color(0.2, 0.5, 0.9, 0.35), false, 1.5)
	
	# 1. Зрительные доли (Optic Lobes)
	# Левая
	var col_opt_l = Color(0.0, 0.6, 1.0, 0.3 + optic_left_act * 0.7)
	draw_circle(Vector2(cx - 100, cy), 32, col_opt_l)
	# Правая
	var col_opt_r = Color(0.0, 0.6, 1.0, 0.3 + optic_right_act * 0.7)
	draw_circle(Vector2(cx + 100, cy), 32, col_opt_r)
	
	# 2. Центральный мозг (Protocerebrum)
	draw_circle(Vector2(cx, cy), 58, Color(0.12, 0.16, 0.28, 0.45))
	
	# 3. Грибовидные тела (Mushroom Bodies - Kenyon Cells)
	var col_mb_l = Color(0.7, 0.2, 1.0, 0.35 + mb_left_act * 0.65)
	var col_mb_r = Color(0.7, 0.2, 1.0, 0.35 + mb_right_act * 0.65)
	draw_circle(Vector2(cx - 32, cy - 14), 16, col_mb_l)
	draw_circle(Vector2(cx + 32, cy - 14), 16, col_mb_r)
	
	# 4. Центральный комплекс (Central Complex - навигация)
	var col_cc = Color(0.0, 0.9, 0.7, 0.35 + central_complex_act * 0.65)
	draw_circle(Vector2(cx, cy + 8), 14, col_cc)
	
	# 5. PAM-кластер (Дофаминовый центр награды)
	var col_pam = Color(1.0, 0.85, 0.1, 0.4 + dopamine_act * 0.6)
	draw_circle(Vector2(cx, cy + 32), 12 + dopamine_act * 4.0, col_pam)
	
	# 6. Нисходящий тракт гигантских волокон (DNp01 - Ноцицепция / Бобо)
	var col_dnp = Color(1.0, 0.1, 0.25, 0.8) if pain_act > 0.2 else Color(0.0, 0.8, 1.0, 0.4 + descending_act * 0.5)
	draw_line(Vector2(cx - 8, cy + 45), Vector2(cx - 8, h - 10), col_dnp, 4.0 + pain_act * 4.0)
	draw_line(Vector2(cx + 8, cy + 45), Vector2(cx + 8, h - 10), col_dnp, 4.0 + pain_act * 4.0)
