export class HUDManager {
  constructor(container) {
    this.container = container;
    this.createUI();
  }

  createUI() {
    this.container.innerHTML = `
      <div class="hud-overlay">
        <!-- Top bar: Score, Multiplier, Fly Learning stats -->
        <div class="hud-top">
          <div class="hud-card score-card">
            <div class="label">СЧЁТ / SCORE</div>
            <div class="val-big" id="score-val">0</div>
            <div class="sub-label">МНОЖИТЕЛЬ: <span id="mult-val" class="highlight">x1</span></div>
          </div>

          <div class="hud-card rl-card">
            <div class="label">МУХА: ОБУЧЕНИЕ С ПОДКРЕПЛЕНИЕМ (RL)</div>
            <div class="accuracy-row">
              <span>ТОЧНОСТЬ:</span>
              <span id="acc-val" class="highlight">100%</span>
              <span class="sub-text">КОМБО: <span id="combo-val">0</span></span>
            </div>
            <!-- Neurotransmitter Bars: Dopamine vs Бобо -->
            <div class="meter-group">
              <div class="meter-row">
                <span class="meter-name dopamine-text">ДОФАМИН (Награда):</span>
                <div class="meter-track">
                  <div class="meter-fill dopamine-fill" id="dopamine-fill" style="width: 30%"></div>
                </div>
                <span class="meter-num dopamine-text" id="dopamine-num">30%</span>
              </div>
              <div class="meter-row">
                <span class="meter-name pain-text">БОБО (Штраф):</span>
                <div class="meter-track">
                  <div class="meter-fill pain-fill" id="pain-fill" style="width: 0%"></div>
                </div>
                <span class="meter-num pain-text" id="pain-num">0%</span>
              </div>
            </div>
          </div>

          <div class="hud-card neuron-card">
            <div class="label">АКТИВНЫЙ НЕЙРОН (neurons.csv)</div>
            <div class="neuron-id" id="neuron-id">DNp01 Giant Fiber</div>
            <div class="neuron-details" id="neuron-details">Медиатор: ACH | Спайк: 0.96</div>
            <div class="fly-status" id="fly-status">Состояние: Рефлекторный полёт</div>
          </div>
        </div>

        <!-- Pain Vignette flash on screen when "Бобо" occurs -->
        <div class="pain-vignette" id="pain-vignette"></div>
        <!-- Dopamine Golden Sparkle flash on hit -->
        <div class="dopamine-flash" id="dopamine-flash"></div>

        <!-- Bottom bar: Controls, Track select, Camera toggle -->
        <div class="hud-bottom">
          <div class="controls-panel">
            <button class="btn btn-primary" id="btn-play">▶ СТАРТ РИТМА</button>
            <button class="btn btn-toggle active" id="btn-autoplay">🤖 МУХА УЧИТСЯ САМА: ВКЛ</button>
            <button class="btn" id="btn-cam">📷 КАМЕРА: СЗАДИ</button>
            <div class="track-select">
              <label>ТРЕК:</label>
              <select id="select-track">
                <option value="0">1. Synaptic Surge (128 BPM)</option>
                <option value="1">2. Dopamine Frenzy (136 BPM)</option>
                <option value="2">3. DNp01 Escape Run (148 BPM)</option>
              </select>
            </div>
          </div>
          <div class="hint-text">
            Мышь: Движение лапок мухи | ЛКМ: Синий меч (ACH) | ПКМ / Пробел: Красный меч (DA)
          </div>
        </div>
      </div>
    `;

    this.scoreEl = document.getElementById('score-val');
    this.multEl = document.getElementById('mult-val');
    this.accEl = document.getElementById('acc-val');
    this.comboEl = document.getElementById('combo-val');
    this.dopamineFill = document.getElementById('dopamine-fill');
    this.dopamineNum = document.getElementById('dopamine-num');
    this.painFill = document.getElementById('pain-fill');
    this.painNum = document.getElementById('pain-num');
    this.neuronIdEl = document.getElementById('neuron-id');
    this.neuronDetailsEl = document.getElementById('neuron-details');
    this.flyStatusEl = document.getElementById('fly-status');
    this.painVignette = document.getElementById('pain-vignette');
    this.dopamineFlash = document.getElementById('dopamine-flash');
  }

  update(data) {
    if (data.score !== undefined) this.scoreEl.textContent = data.score;
    if (data.multiplier !== undefined) this.multEl.textContent = 'x' + data.multiplier;
    if (data.combo !== undefined) this.comboEl.textContent = data.combo;
    if (data.accuracy !== undefined) this.accEl.textContent = data.accuracy + '%';

    if (data.dopamine !== undefined) {
      const val = Math.min(100, Math.max(0, Math.round(data.dopamine)));
      this.dopamineFill.style.width = val + '%';
      this.dopamineNum.textContent = val + '%';
    }

    if (data.pain !== undefined) {
      const val = Math.min(100, Math.max(0, Math.round(data.pain)));
      this.painFill.style.width = val + '%';
      this.painNum.textContent = val + '%';
    }

    if (data.neuron) {
      this.neuronIdEl.textContent = `${data.neuron.type} (ID: ${data.neuron.id})`;
      this.neuronDetailsEl.textContent = `Медиатор: ${data.neuron.nt} | Класс: ${data.neuron.sc} | Сторона: ${data.neuron.side || 'center'}`;
    }

    if (data.event === 'hit') {
      this.flyStatusEl.innerHTML = `<span style="color:#00ffaa">✨ ВСПЛЕСК ДОФАМИНА! Синапс усилен!</span>`;
      this.dopamineFlash.style.opacity = '0.35';
      setTimeout(() => { this.dopamineFlash.style.opacity = '0'; }, 120);
    } else if (data.event === 'miss') {
      this.flyStatusEl.innerHTML = `<span style="color:#ff3355">⚡ БОБО! Ноцицепция: штраф связи!</span>`;
      this.painVignette.style.opacity = '0.45';
      setTimeout(() => { this.painVignette.style.opacity = '0'; }, 150);
    } else if (data.event === 'bomb') {
      this.flyStatusEl.innerHTML = `<span style="color:#ff0000">💥 МУХА ЗАДЕЛА БОМБУ! Рефлекторный спазм!</span>`;
      this.painVignette.style.opacity = '0.7';
      setTimeout(() => { this.painVignette.style.opacity = '0'; }, 250);
    }
  }
}
