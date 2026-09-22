class_name ConnectomeLoader
extends RefCounted
## Загрузчик и анализатор полного коннектома дрозофилы из neurons.csv
## Обрабатывает 166 701 нейронов и строит функциональные нейросети:
## 1. Зрительные нейроны (Visual Projection / LC / VS / HS) -> детекция кубиков
## 2. Клетки Кеньона (Kenyon Cells / KC) -> грибовидное тело (ассоциации)
## 3. Дофаминовые нейроны награды (DA / PAM cluster) -> выброс дофамина при успехе
## 4. Аверсивные нейроны наказания (PPL1 / Nociceptive) -> сигнал "Бобо" при ошибке
## 5. Выходные нейроны (MBON) и нисходящие моторные нейроны (DNp01 Giant Fiber, vnc_motor)

var visual_neurons: Array[Dictionary] = []
var kenyon_cells: Array[Dictionary] = []
var dopamine_neurons: Array[Dictionary] = []
var pain_neurons: Array[Dictionary] = []
var mbon_neurons: Array[Dictionary] = []
var motor_neurons: Array[Dictionary] = []

var is_loaded: bool = false
var total_loaded: int = 0

## Загрузка neurons.csv
func load_from_file(csv_path: String = "res://neurons.csv") -> bool:
	if not FileAccess.file_exists(csv_path):
		printerr("[ConnectomeLoader] Файл не найден: ", csv_path)
		return false
		
	var file = FileAccess.open(csv_path, FileAccess.READ)
	if not file:
		printerr("[ConnectomeLoader] Не удалось открыть: ", csv_path)
		return false
		
	print("[ConnectomeLoader] Чтение полного коннектома из: ", csv_path, "...")
	var header_line = file.get_line() # Заголовок
	
	var row_count = 0
	while not file.eof_reached():
		var line = file.get_line().strip_edges()
		if line == "":
			continue
			
		row_count += 1
		# Быстрый парсинг CSV
		var parts = line.split(",")
		if parts.size() < 17:
			continue
			
		var root_id = parts[0]
		var nt_type = parts[3].strip_edges()
		var super_class = parts[10].strip_edges()
		var cell_type = parts[16].strip_edges()
		var soma_side = parts[15].strip_edges()
		
		var neuron_data = {
			"id": root_id,
			"nt": nt_type,
			"sc": super_class,
			"type": cell_type,
			"side": soma_side
		}
		
		# 1. Зрительная система
		if "visual" in super_class or "ol_" in super_class:
			if visual_neurons.size() < 2000:
				visual_neurons.append(neuron_data)
				
		# 2. Клетки Кеньона (Грибовидное тело)
		if "KC" in cell_type or "Kenyon" in line:
			kenyon_cells.append(neuron_data)
			
		# 3. Дофаминовые нейроны (PAM-кластер награды)
		if nt_type == "DA":
			dopamine_neurons.append(neuron_data)
			
		# 4. Нейроны наказания / ноцицепции ("Бобо")
		if "descending" in super_class or "DNp" in cell_type or "PPL1" in line:
			pain_neurons.append(neuron_data)
			
		# 5. MBON (Выходные нейроны)
		if "MBON" in cell_type:
			mbon_neurons.append(neuron_data)
			
		# 6. Мотонейроны лапок
		if "motor" in super_class:
			motor_neurons.append(neuron_data)

	total_loaded = row_count
	is_loaded = true
	
	print("[ConnectomeLoader] Коннектом успешно загружен!")
	print("  -> Всего записей: %d" % total_loaded)
	print("  -> Зрительных нейронов в буфере: %d" % visual_neurons.size())
	print("  -> Клеток Кеньона (KC): %d" % kenyon_cells.size())
	print("  -> Дофаминовых нейронов (DA): %d" % dopamine_neurons.size())
	print("  -> Нейронов тревоги/боли (PPL1/DNp01): %d" % pain_neurons.size())
	print("  -> MBON нейронов: %d" % mbon_neurons.size())
	print("  -> Мотонейронов: %d" % motor_neurons.size())
	return true

## Выбор случайного дофаминового нейрона при успешном попадании (+Дофамин)
func get_random_dopamine_neuron() -> Dictionary:
	if dopamine_neurons.is_empty():
		return {"id": "PAM-DA", "type": "PAM01", "nt": "DA", "desc": "Дофаминовый нейрон награды"}
	return dopamine_neurons[randi() % dopamine_neurons.size()]

## Выбор нейрона тревоги и боли при промахе ("Бобо")
func get_random_pain_neuron() -> Dictionary:
	if pain_neurons.is_empty():
		return {"id": "DNp01", "type": "DNp01_GiantFiber", "nt": "ACH", "desc": "Нисходящий рефлекс тревоги"}
	return pain_neurons[randi() % pain_neurons.size()]
