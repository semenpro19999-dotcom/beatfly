export class HUDManager {
  constructor(container) {
    this.container = container;
    this.onUploadAudio = null;
    this.onResetBrain = null;
    this.onCameraChange = null;
    this.createUI();
  }

  createUI() {
    this.container.innerHTML = `
      <div class="hud-overlay">
        <!-- Top bar: Score, Brain RL stats, Active Neuron -->
        <div class="hud-top">
          <div class="hud-card score-card">
            <div class="label">СЧЁТ / SCORE</div>
            <div class="val-big" id="score-val">0</div>
            <div class="sub-label">МНОЖИТЕЛЬ: <span id="mult-val" class="highlight">x1</span> | КОМБО: <span id="combo-val">0</span></div>
          </div>

          <div class="hud-card rl-card">
            <div class="label">МОЗГ МУХИ: САМОСТОЯТЕЛЬНОЕ ОБУЧЕНИЕ (RL)</div>
            <div class="accuracy-row">
              <span>ТОЧНОСТЬ:</span>
              <span id="acc-val" class="highlight">0%</span>
              <span class="sub-text">ЭПСИЛОН (Случайность): <span id="epsilon-val">65%</span></span>
              <button class="btn-micro" id="btn-reset-brain" title="Сбросить синапсы мухи и начать обучение с нуля">🔄 Сбросить мозг</button>
            </div>
            <!-- Neurotransmitter Bars: Dopamine vs Бобо -->
            <div class="meter-group">
              <div class="meter-row">
                <span class="meter-name dopamine-text">ДОФАМИН (+Награда):</span>
                <div class="meter-track">
                  <div class="meter-fill dopamine-fill" id="dopamine-fill" style="width: 25%"></div>
                </div>
                <span class="meter-num dopamine-text" id="dopamine-num">25%</span>
              </div>
              <div class="meter-row">
                <span class="meter-name pain-text">БОБО (-Штраф):</span>
                <div class="meter-track">
                  <div class="meter-fill pain-fill" id="pain-fill" style="width: 0%"></div>
                </div>
                <span class="meter-num pain-text" id="pain-num">0%</span>
              </div>
            </div>
          </div>

          <div class="hud-card neuron-card">
            <div class="label">АКТИВНЫЙ НЕЙРОН (neurons.csv)</div>
            <div class="neuron-id" id="neuron-id">Загрузка базы 166 701 нейронов...</div>
            <div class="neuron-details" id="neuron-details">Медиатор: DA / ACH | Сторона: bilateral</div>
            <div class="fly-status" id="fly-status">Статус: Муха ориентируется в потоке</div>
          </div>
        </div>

        <!-- Pain Vignette flash on screen when "Бобо" occurs -->
        <div class="pain-vignette" id="pain-vignette"></div>
        <!-- Dopamine Golden Sparkle flash on hit -->
        <div class="dopamine-flash" id="dopamine-flash"></div>

        <!-- Notification Toast -->
        <div class="toast-notice" id="toast-notice"></div>

        <!-- Bottom bar: Audio Upload, Camera Flying, Track Controls -->
        <div class="hud-bottom">
          <div class="controls-panel">
            <!-- Custom Audio Upload -->
            <label class="btn btn-upload" id="label-upload">
              📁 ЗАГРУЗИТЬ СВОЮ МУЗЫКУ
              <input type="file" id="input-audio" accept="audio/*" style="display: none;" />
            </label>

            <button class="btn btn-primary" id="btn-play">▶ СТАРТ / ПАУЗА</button>

            <!-- Camera Flight Modes -->
            <div class="btn-group">
              <button class="btn btn-cam active" data-cam="orbit">📷 СВОБОДНАЯ КАМЕРА</button>
              <button class="btn btn-cam" data-cam="cockpit">👁 ИЗ ГЛАЗ МУХИ</button>
              <button class="btn btn-cam" data-cam="side">🎬 СБОКУ</button>
            </div>
          </div>

          <div class="hint-text">
            🎮 <b>Свободная камера:</b> Зажмите <b>ЛКМ</b> для вращения вокруг мухи | Колесо мыши — приближение | Клавиши <b>W, A, S, D, Q, E</b> — свободный полет камеры!
          </div>
        </div>
      </div>
    `;

    this.scoreEl = document.getElementById('score-val');
    this.multEl = document.getElementById('mult-val');
    this.accEl = document.getElementById('acc-val');
    this.comboEl = document.getElementById('combo-val');
    this.epsilonEl = document.getElementById('epsilon-val');
    this.dopamineFill = document.getElementById('dopamine-fill');
    this.dopamineNum = document.getElementById('dopamine-num');
    this.painFill = document.getElementById('pain-fill');
    this.painNum = document.getElementById('pain-num');
    this.neuronIdEl = document.getElementById('neuron-id');
    this.neuronDetailsEl = document.getElementById('neuron-details');
    this.flyStatusEl = document.getElementById('fly-status');
    this.painVignette = document.getElementById('pain-vignette');
    this.dopamineFlash = document.getElementById('dopamine-flash');
    this.toastEl = document.getElementById('toast-notice');

    // Audio upload
    const inputAudio = document.getElementById('input-audio');
    inputAudio.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0] && this.onUploadAudio) {
        this.onUploadAudio(e.target.files[0]);
      }
    });

    // Reset Brain
    document.getElementById('btn-reset-brain').addEventListener('click', () => {
      if (this.onResetBrain) this.onResetBrain();
      this.showToast('🧠 Мозг мухи сброшен! Обучение начато с нуля.');
    });

    // Camera buttons
    const camButtons = document.querySelectorAll('.btn-cam');
    camButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        camButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.onCameraChange) {
          this.onCameraChange(btn.getAttribute('data-cam'));
        }
      });
    });
  }

  showToast(text) {
    if (!this.toastEl) return;
    this.toastEl.textContent = text;
    this.toastEl.style.opacity = '1';
    setTimeout(() => {
      this.toastEl.style.opacity = '0';
    }, 3000);
  }

  update(data) {
    if (data.score !== undefined) this.scoreEl.textContent = data.score;
    if (data.multiplier !== undefined) this.multEl.textContent = 'x' + data.multiplier;
    if (data.combo !== undefined) this.comboEl.textContent = data.combo;
    if (data.accuracy !== undefined) this.accEl.textContent = data.accuracy + '%';
    if (data.epsilon !== undefined) this.epsilonEl.textContent = Math.round(data.epsilon * 100) + '%';

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
      this.neuronDetailsEl.textContent = `Медиатор: ${data.neuron.nt || 'DA/ACH'} | Класс: ${data.neuron.sc || 'intrinsic'} | Сторона: ${data.neuron.side || 'soma'}`;
    }

    if (data.event === 'hit' || data.type === 'dopamine') {
      this.flyStatusEl.innerHTML = `<span style="color:#00ffaa">✨ ВСПЛЕСК ДОФАМИНА! Синапс усилен (LTP)!</span>`;
      this.dopamineFlash.style.opacity = '0.35';
      setTimeout(() => { this.dopamineFlash.style.opacity = '0'; }, 100);
    } else if (data.event === 'miss' || data.type === 'pain') {
      this.flyStatusEl.innerHTML = `<span style="color:#ff3355">⚡ БОБО! Ноцицептивный штраф (LTD)!</span>`;
      this.painVignette.style.opacity = '0.45';
      setTimeout(() => { this.painVignette.style.opacity = '0'; }, 120);
    }
  }
}
