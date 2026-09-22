// Drosophila Visual Brain Neuropil Monitor (Toggled with Key 'J')
// Displays the biological anatomical regions of the fruit fly brain visually (NO TEXT!):
// - Left & Right Optic Lobes (Medulla / Lobula) -> Visual input
// - Mushroom Bodies (Calyx, Pedunculus, Lobes) -> Kenyon Cells & Memory
// - Central Complex (Ellipsoid Body, Fan-shaped Body) -> Motor steering
// - PAM Cluster (Dopaminergic reward) -> Golden / Emerald pulses
// - PPL1 Cluster & Giant Fiber (DNp01) -> Alarming red pain pulses

export class BrainVisualizer {
  constructor(container) {
    this.container = container;
    this.isOpen = true; // Open by default or toggleable with 'J'

    // Neuropil activity levels (0.0 to 1.0)
    this.activity = {
      opticLeft: 0.1,
      opticRight: 0.1,
      mushroomLeft: 0.15,
      mushroomRight: 0.15,
      centralComplex: 0.2,
      dopamineCluster: 0.25,
      painCluster: 0.0,
      descendingTract: 0.1
    };

    // Animated action potentials (flowing signal pulses)
    this.pulses = [];

    this.createDOM();
    this.initCanvas();
    this.setupKeyListener();
  }

  createDOM() {
    this.wrapper = document.createElement('div');
    this.wrapper.id = 'brain-window';
    this.wrapper.className = 'brain-window-wrapper visible';
    this.wrapper.innerHTML = `
      <div class="brain-window-header">
        <div class="brain-title">
          <span class="brain-icon">🧠</span>
          <span>АКТИВНОСТЬ МОЗГА</span>
          <span class="key-badge">J</span>
        </div>
        <button class="brain-close-btn" id="btn-close-brain" title="Скрыть (Клавиша J)">✕</button>
      </div>
      <div class="brain-canvas-box">
        <canvas id="brain-canvas" width="340" height="280"></canvas>
      </div>
    `;

    this.container.appendChild(this.wrapper);

    document.getElementById('btn-close-brain').addEventListener('click', () => {
      this.toggle();
    });
  }

  initCanvas() {
    this.canvas = document.getElementById('brain-canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  setupKeyListener() {
    window.addEventListener('keydown', (e) => {
      // Toggle on key 'j', 'J', or Russian 'о', 'О' (same key on layout)
      if (e.code === 'KeyJ' || e.key === 'j' || e.key === 'J' || e.key === 'о' || e.key === 'О') {
        this.toggle();
      }
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.wrapper.classList.add('visible');
    } else {
      this.wrapper.classList.remove('visible');
    }
  }

  // Visual sensory stimulus in optic lobes
  triggerOpticInput(lane, color) {
    if (lane < 2) {
      this.activity.opticLeft = 1.0;
      this.spawnPulse(70, 130, 140, 110, color === 'red' ? '#ff0055' : '#00a2ff');
    } else {
      this.activity.opticRight = 1.0;
      this.spawnPulse(270, 130, 200, 110, color === 'red' ? '#ff0055' : '#00a2ff');
    }
    this.activity.centralComplex = Math.min(1.0, this.activity.centralComplex + 0.4);
  }

  // Positive Reinforcement: Dopamine spike in Mushroom Body & PAM cluster
  triggerDopamineSpike() {
    this.activity.dopamineCluster = 1.0;
    this.activity.mushroomLeft = 1.0;
    this.activity.mushroomRight = 1.0;
    this.activity.centralComplex = 0.9;
    this.activity.descendingTract = 0.8;

    // Golden synaptic waves radiating across Mushroom Body
    for (let i = 0; i < 6; i++) {
      this.spawnPulse(170, 150, 140 + (i % 2 === 0 ? -30 : 30), 100, '#00ffaa');
    }
  }

  // Negative Reinforcement: "Бобо" / Nociceptive shock in PPL1 & Giant Fiber (DNp01)
  triggerPainSpike() {
    this.activity.painCluster = 1.0;
    this.activity.descendingTract = 1.0;
    this.activity.mushroomLeft = Math.max(0.1, this.activity.mushroomLeft - 0.5);
    this.activity.mushroomRight = Math.max(0.1, this.activity.mushroomRight - 0.5);

    // Alarming jagged pain shockwaves down the descending giant fiber tract
    for (let i = 0; i < 8; i++) {
      this.spawnPulse(170, 120, 170 + (Math.random() - 0.5) * 40, 250, '#ff0033');
    }
  }

  spawnPulse(x1, y1, x2, y2, color) {
    this.pulses.push({
      x1, y1, x2, y2,
      progress: 0,
      speed: 2.5 + Math.random() * 2.0,
      color: color,
      size: 4 + Math.random() * 3
    });
  }

  render(delta) {
    if (!this.isOpen) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2; // 170
    const cy = 120;

    // Decay activity organically
    this.activity.opticLeft = Math.max(0.08, this.activity.opticLeft - delta * 1.8);
    this.activity.opticRight = Math.max(0.08, this.activity.opticRight - delta * 1.8);
    this.activity.mushroomLeft = Math.max(0.12, this.activity.mushroomLeft - delta * 1.4);
    this.activity.mushroomRight = Math.max(0.12, this.activity.mushroomRight - delta * 1.4);
    this.activity.centralComplex = Math.max(0.15, this.activity.centralComplex - delta * 1.6);
    this.activity.dopamineCluster = Math.max(0.1, this.activity.dopamineCluster - delta * 1.2);
    this.activity.painCluster = Math.max(0.0, this.activity.painCluster - delta * 2.5);
    this.activity.descendingTract = Math.max(0.08, this.activity.descendingTract - delta * 1.8);

    // Clear background
    ctx.clearRect(0, 0, w, h);

    // Dark grid background
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Connective Synaptic Tracts (Neural pathways)
    this.drawTracts(ctx, cx, cy);

    // Draw Anatomical Neuropils:
    // 1. Left Optic Lobe (Medulla + Lobula)
    this.drawOpticLobe(ctx, 65, 125, -1, this.activity.opticLeft);

    // 2. Right Optic Lobe (Medulla + Lobula)
    this.drawOpticLobe(ctx, 275, 125, 1, this.activity.opticRight);

    // 3. Central Brain Capsule (Protocerebrum)
    this.drawCentralBrain(ctx, cx, cy);

    // 4. Mushroom Bodies (Calyx, Pedunculus, Alpha/Beta/Gamma lobes - Kenyon Cells)
    this.drawMushroomBodies(ctx, cx, cy, this.activity.mushroomLeft, this.activity.mushroomRight);

    // 5. Central Complex (Ellipsoid Body + Fan-shaped Body)
    this.drawCentralComplex(ctx, cx, cy + 5, this.activity.centralComplex);

    // 6. PAM Cluster (Dopaminergic Reward Nucleus)
    this.drawPAMCluster(ctx, cx, cy + 32, this.activity.dopamineCluster);

    // 7. PPL1 Cluster & Giant Fiber DNp01 (Pain / Nociception)
    this.drawPainAndGiantFiber(ctx, cx, cy, this.activity.painCluster, this.activity.descendingTract);

    // 8. Render flowing electric action potential pulses
    this.renderPulses(ctx, delta);
  }

  drawTracts(ctx, cx, cy) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.18)';

    // Optic chiasm tracts to Central brain
    ctx.beginPath();
    ctx.moveTo(70, 125);
    ctx.quadraticCurveTo(120, 125, cx - 25, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(270, 125);
    ctx.quadraticCurveTo(220, 125, cx + 25, cy);
    ctx.stroke();

    // Mushroom Body to Descending motor tract
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy + 20);
    ctx.quadraticCurveTo(cx - 15, cy + 70, cx, cy + 110);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 30, cy + 20);
    ctx.quadraticCurveTo(cx + 15, cy + 70, cx, cy + 110);
    ctx.stroke();
  }

  drawOpticLobe(ctx, x, y, side, act) {
    ctx.save();
    ctx.translate(x, y);

    // Outer Medulla glow
    const glowColor = `rgba(0, 180, 255, ${act * 0.9})`;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = act * 25;

    // Medulla (kidney shaped)
    ctx.fillStyle = `rgba(0, 130, 220, ${0.25 + act * 0.6})`;
    ctx.strokeStyle = `rgba(0, 220, 255, ${0.4 + act * 0.6})`;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 60, side * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Lobula complex (inner crescent)
    ctx.fillStyle = `rgba(0, 90, 180, ${0.3 + act * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(-side * 14, 5, 18, 38, side * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Subtle internal neural lattice
    ctx.strokeStyle = `rgba(255, 255, 255, ${act * 0.5})`;
    ctx.lineWidth = 1;
    for (let i = -20; i <= 20; i += 10) {
      ctx.beginPath();
      ctx.moveTo(-side * 10, i);
      ctx.lineTo(side * 22, i * 1.3);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawCentralBrain(ctx, cx, cy) {
    ctx.save();
    // Central brain capsule contour
    ctx.strokeStyle = 'rgba(70, 90, 140, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 68, 55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawMushroomBodies(ctx, cx, cy, actL, actR) {
    // Mushroom Body (Calyx + Pedunculus + Lobes)
    // Left MB
    this.drawSingleMB(ctx, cx - 28, cy - 12, -1, actL);
    // Right MB
    this.drawSingleMB(ctx, cx + 28, cy - 12, 1, actR);
  }

  drawSingleMB(ctx, x, y, side, act) {
    ctx.save();
    ctx.translate(x, y);

    const glow = `rgba(180, 0, 255, ${act * 0.9})`;
    ctx.shadowColor = glow;
    ctx.shadowBlur = act * 20;

    // Calyx (Mushroom cap / Kenyon Cell dendrites)
    ctx.fillStyle = `rgba(140, 20, 220, ${0.3 + act * 0.6})`;
    ctx.strokeStyle = `rgba(210, 80, 255, ${0.5 + act * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -22, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pedunculus (Stem)
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(side * 10, 16);
    ctx.lineWidth = 4;
    ctx.strokeStyle = `rgba(190, 60, 255, ${0.4 + act * 0.6})`;
    ctx.stroke();

    // Alpha / Beta / Gamma lobes (horizontal and vertical lobes)
    ctx.fillStyle = `rgba(200, 50, 255, ${0.35 + act * 0.65})`;
    ctx.beginPath();
    ctx.ellipse(side * 14, 20, 12, 6, side * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawCentralComplex(ctx, cx, cy, act) {
    ctx.save();
    ctx.translate(cx, cy);

    const glow = `rgba(0, 255, 200, ${act * 0.8})`;
    ctx.shadowColor = glow;
    ctx.shadowBlur = act * 18;

    // Fan-shaped body (FB)
    ctx.fillStyle = `rgba(0, 180, 140, ${0.25 + act * 0.6})`;
    ctx.strokeStyle = `rgba(0, 255, 220, ${0.5 + act * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -10, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ellipsoid body (EB - Ring shaped donut)
    ctx.fillStyle = `rgba(0, 220, 170, ${0.3 + act * 0.7})`;
    ctx.beginPath();
    ctx.arc(0, 6, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner hollow of ring
    ctx.fillStyle = 'rgba(8, 12, 22, 0.9)';
    ctx.beginPath();
    ctx.arc(0, 6, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawPAMCluster(ctx, cx, cy, act) {
    ctx.save();
    ctx.translate(cx, cy);

    // Dopaminergic reward cluster (glowing gold / emerald cluster)
    const glow = `rgba(255, 215, 0, ${act * 0.95})`;
    ctx.shadowColor = glow;
    ctx.shadowBlur = act * 25;

    ctx.fillStyle = `rgba(255, 200, 0, ${0.3 + act * 0.7})`;
    ctx.strokeStyle = `rgba(255, 240, 100, ${0.5 + act * 0.5})`;
    ctx.lineWidth = 2;

    // Clustered dopaminergic PAM somas
    for (const [ox, oy, r] of [[-12, 0, 7], [0, 2, 9], [12, 0, 7], [-6, -7, 6], [6, -7, 6]]) {
      ctx.beginPath();
      ctx.arc(ox, oy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  drawPainAndGiantFiber(ctx, cx, cy, painAct, descAct) {
    ctx.save();

    // PPL1 Nociceptive Clusters (Pain somas)
    if (painAct > 0.05) {
      ctx.shadowColor = `rgba(255, 0, 50, ${painAct})`;
      ctx.shadowBlur = painAct * 30;
      ctx.fillStyle = `rgba(255, 20, 60, ${0.4 + painAct * 0.6})`;
      ctx.strokeStyle = '#ff2244';
      ctx.lineWidth = 2;

      for (const [px, py] of [[cx - 45, cy + 25], [cx + 45, cy + 25]]) {
        ctx.beginPath();
        ctx.arc(px, py, 8 + painAct * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Descending Giant Fiber (DNp01) Tract to body/wings/legs
    const descGlow = painAct > 0.3 ? `rgba(255, 0, 50, ${painAct})` : `rgba(0, 245, 255, ${descAct * 0.8})`;
    ctx.shadowColor = descGlow;
    ctx.shadowBlur = Math.max(painAct, descAct) * 20;

    ctx.strokeStyle = painAct > 0.3 ? `rgba(255, 40, 70, ${0.6 + painAct * 0.4})` : `rgba(0, 220, 255, ${0.3 + descAct * 0.6})`;
    ctx.lineWidth = 4 + painAct * 4;

    // Two parallel giant descending axons
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sign * 8, cy + 45);
      if (painAct > 0.3) {
        // Jagged electrical pain spasms
        ctx.lineTo(cx + sign * 14, cy + 80);
        ctx.lineTo(cx + sign * 4, cy + 115);
        ctx.lineTo(cx + sign * 12, 255);
      } else {
        ctx.lineTo(cx + sign * 8, 255);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  renderPulses(ctx, delta) {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.progress += delta * p.speed;

      if (p.progress >= 1.0) {
        this.pulses.splice(i, 1);
        continue;
      }

      const px = p.x1 + (p.x2 - p.x1) * p.progress;
      const py = p.y1 + (p.y2 - p.y1) * p.progress;

      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.size * (1.0 - p.progress * 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
