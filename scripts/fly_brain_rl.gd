class_name FlyBrainRL
extends Node
## Модель обучения мозга дрозофилы (Drosophila Mushroom Body RL)
## Основано на реальном коннектоме из neurons.csv:
## - Вход: Kenyon Cells (KC) - кодируют зрительный паттерн кубика
## - Награда: PAM-нейроны (Dopamine / DA) - всплеск при успешном срезе
## - Наказание ("Бобо"): PPL1-нейроны (Nociception) - штраф при промахе
## - Выход: MBON (Mushroom Body Output Neurons) -> команды мотонейронам лапок

signal dopamine_spike(amount: float, neuron_id: String)
signal nociception_spike(pain_amount: float, neuron_id: String)
signal action_taken(saber: String, direction: String)

# Действия: 0: Idle, 1: L-Down, 2: L-Up, 3: L-Left, 4: L-Right, 
# 5: R-Down, 6: R-Up, 7: R-Left, 8: R-Right
const ACTIONS = [
	{"saber": "none", "dir": "none"},
	{"saber": "left", "dir": "down"},
	{"saber": "left", "dir": "up"},
	{"saber": "left", "dir": "left"},
	{"saber": "left", "dir": "right"},
	{"saber": "right", "dir": "down"},
	{"saber": "right", "dir": "up"},
	{"saber": "right", "dir": "left"},
	{"saber": "right", "dir": "right"}
]

# Параметры Q-таблицы / нейросети
var q_table: Dictionary = {}
var learning_rate: float = 0.25 # Синаптическая пластичность
var discount_factor: float = 0.85
var epsilon: float = 0.4 # Вероятность случайного исследования (снижается по мере обучения)
var min_epsilon: float = 0.05
var epsilon_decay: float = 0.995

# Уровни нейромедиаторов
var dopamine_level: float = 20.0 # 0..100
var pain_level: float = 0.0 # "Бобо" (ноцицепция) 0..100
var total_hits: int = 0
var total_misses: int = 0

# Последнее принятое решение для расчета ошибки награды
var last_state_key: String = ""
var last_action_idx: int = 0

# Подключение биологического загрузчика коннектома
var connectome: ConnectomeLoader = null

func _ready() -> void:
	connectome = ConnectomeLoader.new()
	# Загружаем реальный коннектом из neurons.csv
	connectome.load_from_file("res://neurons.csv")
	print("[FlyBrainRL] Нейронная сеть мухи напрямую связана с базой neurons.csv!")

## Кодирование состояния (вход в грибовидное тело / Kenyon Cells)
func get_state_key(lane: int, height: int, color_type: String, direction: String) -> String:
	return "%d_%d_%s_%s" % [lane, height, color_type, direction]

func init_state_if_needed(state_key: String) -> void:
	if not q_table.has(state_key):
		q_table[state_key] = []
		for i in range(ACTIONS.size()):
			q_table[state_key].append(0.0)

## Выбор действия мухой
func decide_action(lane: int, height: int, color_type: String, direction: String) -> Dictionary:
	var state_key = get_state_key(lane, height, color_type, direction)
	init_state_if_needed(state_key)
	
	last_state_key = state_key
	
	# Epsilon-greedy: исследование vs использование выученного
	if randf() < epsilon:
		# Случайный взмах лапкой (исследование)
		last_action_idx = randi() % ACTIONS.size()
	else:
		# Выбираем действие с максимальной ожидаемой дофаминовой наградой
		var best_idx = 0
		var max_val = -999999.0
		for i in range(ACTIONS.size()):
			if q_table[state_key][i] > max_val:
				max_val = q_table[state_key][i]
				best_idx = i
		last_action_idx = best_idx
		
	var act = ACTIONS[last_action_idx]
	action_taken.emit(act.saber, act.dir)
	return act

## Всплеск дофамина при попадании (Positive Reinforcement)
func reward_dopamine(hit_quality: float = 1.0) -> void:
	total_hits += 1
	var reward = 10.0 * hit_quality
	dopamine_level = clamp(dopamine_level + 25.0 * hit_quality, 0.0, 100.0)
	pain_level = max(0.0, pain_level - 15.0)
	
	# Обучение: усиливаем синапс (Long-Term Potentiation)
	if last_state_key != "":
		var old_val = q_table[last_state_key][last_action_idx]
		q_table[last_state_key][last_action_idx] = old_val + learning_rate * (reward - old_val)
	
	# Снижаем случайность, муха становится опытнее
	epsilon = max(min_epsilon, epsilon * epsilon_decay)
	
	var da_neuron = connectome.get_random_dopamine_neuron() if connectome else {"type": "PAM", "id": "10013"}
	var neuron_title = "%s (Root ID: %s, NT: DA)" % [da_neuron.get("type", "PAM"), da_neuron.get("id", "")]
	dopamine_spike.emit(reward, neuron_title)
	print("[FlyBrain] +ДОФАМИН от %s! Уровень: %.1f | Хитов: %d" % [neuron_title, dopamine_level, total_hits])

## Наказание "Бобо" при промахе (Negative Reinforcement / Nociception)
func penalize_pain(severity: float = 1.0) -> void:
	total_misses += 1
	var penalty = -12.0 * severity
	pain_level = clamp(pain_level + 30.0 * severity, 0.0, 100.0)
	dopamine_level = max(0.0, dopamine_level - 10.0)
	
	# Обучение: ослабляем синапс (Long-Term Depression / аверсивное обучение)
	if last_state_key != "":
		var old_val = q_table[last_state_key][last_action_idx]
		q_table[last_state_key][last_action_idx] = old_val + learning_rate * (penalty - old_val)
		
	var pain_neuron = connectome.get_random_pain_neuron() if connectome else {"type": "DNp01", "id": "10001"}
	var neuron_title = "%s (Root ID: %s, Рефлекс тревоги)" % [pain_neuron.get("type", "DNp01"), pain_neuron.get("id", "")]
	nociception_spike.emit(penalty, neuron_title)
	print("[FlyBrain] -БОБО от %s! Боль: %.1f | Промахов: %d" % [neuron_title, pain_level, total_misses])

func _process(delta: float) -> void:
	# Естественный метаболизм нейромедиаторов
	dopamine_level = max(10.0, dopamine_level - delta * 2.5)
	pain_level = max(0.0, pain_level - delta * 8.0)
