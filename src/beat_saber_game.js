import * as THREE from 'three';
import { audioManager } from './audio.js';
import { AudioBeatAnalyzer } from './audio_analyzer.js';

export class BeatSaberEngine {
  constructor(scene, flyModel, neuroAgent) {
    this.scene = scene;
    this.fly = flyModel;
    this.agent = neuroAgent;

    this.blocks = [];
    this.slicedPieces = [];
    this.sparks = [];

    this.speed = 15.0; // Units per second
    this.spawnZ = -55.0;
    this.hitZ = 0.55;
    this.missZ = 3.2;

    this.score = 0;
    this.combo = 0;
    this.multiplier = 1;
    this.maxCombo = 0;

    // Authentic Beat Saber 4 lanes (-1.5, -0.5, 0.5, 1.5) and 2 heights (0.85, 1.55)
    this.lanesX = [-1.5, -0.5, 0.5, 1.5];
    this.heightsY = [0.85, 1.55];

    // User Audio & Beatmap state
    this.analyzer = new AudioBeatAnalyzer(audioManager.ctx || new AudioContext());
    this.customBeatmap = null;
    this.beatmapIndex = 0;
    this.audioStartTime = 0;
    this.isCustomTrackPlaying = false;
    this.customSourceNode = null;
    this.customAudioBuffer = null;

    this.initVisualAssets();
    this.initEnvironment();
    this.initSparks();

    this.onStateChange = null;
    this.onVisualStimulus = null;
  }

  initVisualAssets() {
    this.arrowTextures = {};
    const dirs = ['down', 'up', 'left', 'right', 'any'];
    for (const d of dirs) {
      this.arrowTextures[d] = this.createArrowTexture(d);
    }

    // Authentic Beat Saber Red (#e51c44) & Blue (#1573fe) Materials
    // Soft, deep, elegant, no harsh glare
    this.redBlockMat = new THREE.MeshStandardMaterial({
      color: 0xe51c44,
      roughness: 0.25,
      metalness: 0.35
    });

    this.blueBlockMat = new THREE.MeshStandardMaterial({
      color: 0x1573fe,
      roughness: 0.25,
      metalness: 0.35
    });

    this.blockDarkMat = new THREE.MeshStandardMaterial({
      color: 0x141822,
      roughness: 0.5,
      metalness: 0.6
    });
  }

  createArrowTexture(dir) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Deep contrasting dark center with soft rounded white arrow
    ctx.fillStyle = '#0f141e';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.translate(128, 128);

    if (dir === 'down') ctx.rotate(Math.PI);
    else if (dir === 'left') ctx.rotate(-Math.PI / 2);
    else if (dir === 'right') ctx.rotate(Math.PI / 2);

    if (dir === 'any') {
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -60);
      ctx.lineTo(52, 18);
      ctx.lineTo(22, 18);
      ctx.lineTo(22, 60);
      ctx.lineTo(-22, 60);
      ctx.lineTo(-22, 18);
      ctx.lineTo(-52, 18);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  initEnvironment() {
    // Dark glossy runway platform
    const runwayGeo = new THREE.BoxGeometry(4.2, 0.15, 80);
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0x070912,
      roughness: 0.2,
      metalness: 0.8
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.position.set(0, -0.4, -20);
    this.scene.add(runway);

    // Glowing lane borders (Left Red / Right Blue edge)
    const edgeGeo = new THREE.CylinderGeometry(0.018, 0.018, 80, 6);
    edgeGeo.rotateX(Math.PI / 2);

    const leftEdge = new THREE.Mesh(edgeGeo, new THREE.MeshBasicMaterial({ color: 0xe51c44 }));
    leftEdge.position.set(-2.1, -0.32, -20);
    this.scene.add(leftEdge);

    const rightEdge = new THREE.Mesh(edgeGeo, new THREE.MeshBasicMaterial({ color: 0x1573fe }));
    rightEdge.position.set(2.1, -0.32, -20);
    this.scene.add(rightEdge);

    // Subtle runway lane markers
    for (const lx of this.lanesX) {
      const railGeo = new THREE.CylinderGeometry(0.008, 0.008, 80, 4);
      railGeo.rotateX(Math.PI / 2);
      const rail = new THREE.Mesh(railGeo, new THREE.MeshBasicMaterial({ color: 0x1e293b }));
      rail.position.set(lx, -0.32, -20);
      this.scene.add(rail);
    }

    // Distant Beat Saber Laser Pillars (soft atmospheric sweeps)
    this.lasers = [];
    const laserMatRed = new THREE.MeshBasicMaterial({ color: 0xe51c44, transparent: true, opacity: 0.25 });
    const laserMatBlue = new THREE.MeshBasicMaterial({ color: 0x1573fe, transparent: true, opacity: 0.25 });

    for (let i = 0; i < 8; i++) {
      const lGeo = new THREE.CylinderGeometry(0.03, 0.03, 40, 6);
      const isRed = i % 2 === 0;
      const laser = new THREE.Mesh(lGeo, isRed ? laserMatRed : laserMatBlue);
      const side = isRed ? -1 : 1;
      laser.position.set(side * (4.5 + (i % 3) * 1.5), 10, -10 - i * 6);
      laser.rotation.z = side * 0.35;
      this.scene.add(laser);
      this.lasers.push({ mesh: laser, baseRot: laser.rotation.z, speed: 0.8 + i * 0.2 });
    }
  }

  initSparks() {
    const count = 400;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    this.sparkVelocities = [];
    this.sparkLifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] = -100;
      this.sparkVelocities.push(new THREE.Vector3());
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.sparkSystem = new THREE.Points(geo, mat);
    this.scene.add(this.sparkSystem);
  }

  emitSparks(origin, colorHex, count = 25) {
    const col = new THREE.Color(colorHex);
    const posAttr = this.sparkSystem.geometry.attributes.position;
    const colAttr = this.sparkSystem.geometry.attributes.color;

    let emitted = 0;
    for (let i = 0; i < this.sparkLifetimes.length && emitted < count; i++) {
      if (this.sparkLifetimes[i] <= 0) {
        this.sparkLifetimes[i] = 0.45 + Math.random() * 0.25;
        posAttr.setXYZ(i, origin.x, origin.y, origin.z);
        colAttr.setXYZ(i, col.r, col.g, col.b);

        const spd = 3.5 + Math.random() * 4.5;
        const th = Math.random() * Math.PI * 2;
        const ph = (Math.random() - 0.5) * Math.PI;

        this.sparkVelocities[i].set(
          Math.cos(th) * Math.cos(ph) * spd,
          Math.sin(ph) * spd + 1.8,
          Math.sin(th) * Math.cos(ph) * spd
        );
        emitted++;
      }
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  // Load and play custom user audio file
  async loadCustomAudioFile(file) {
    if (!audioManager.ctx) audioManager.init();
    this.analyzer.ctx = audioManager.ctx;

    this.stopAudio();
    const result = await this.analyzer.analyzeFile(file);
    this.customAudioBuffer = result.audioBuffer;
    this.customBeatmap = result.beatmap;
    this.beatmapIndex = 0;

    console.log(`[BeatSaber] Карта готова: ${this.customBeatmap.length} кубиков под музыку ${file.name}`);
    this.startCustomTrack();
    return result;
  }

  startCustomTrack() {
    if (!this.customAudioBuffer) return;
    this.stopAudio();

    const ctx = audioManager.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.customAudioBuffer;
    src.connect(audioManager.masterGain);

    this.audioStartTime = ctx.currentTime;
    src.start(0);
    this.customSourceNode = src;
    this.isCustomTrackPlaying = true;
    this.beatmapIndex = 0;

    src.onended = () => {
      this.isCustomTrackPlaying = false;
    };
  }

  stopAudio() {
    if (this.customSourceNode) {
      try { this.customSourceNode.stop(); } catch (e) {}
      this.customSourceNode = null;
    }
    this.isCustomTrackPlaying = false;
    audioManager.stop();
  }

  updateCustomBeatmapSpawning() {
    if (!this.isCustomTrackPlaying || !this.customBeatmap) return;

    const ctx = audioManager.ctx;
    const currentTrackTime = ctx.currentTime - this.audioStartTime;
    const travelDistance = this.hitZ - this.spawnZ;
    const travelTime = travelDistance / this.speed;

    while (
      this.beatmapIndex < this.customBeatmap.length &&
      this.customBeatmap[this.beatmapIndex].time <= currentTrackTime + travelTime
    ) {
      const note = this.customBeatmap[this.beatmapIndex];
      this.spawnBlock(note.lane, note.height, note.color, note.direction);
      this.beatmapIndex++;
    }
  }

  onProceduralBeat(event) {
    if (this.isCustomTrackPlaying) return;

    const lane = Math.floor(Math.random() * 4);
    const height = Math.random() < 0.75 ? 0 : 1;
    const color = lane < 2 ? 'red' : 'blue';
    const dirs = ['down', 'down', 'up', 'left', 'right', 'any'];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];

    this.spawnBlock(lane, height, color, dir);
  }

  spawnBlock(lane, height, color, direction) {
    const size = 0.54;
    // Elegant beveled rounded box geometry
    const geo = new THREE.BoxGeometry(size, size, size);

    const baseMat = color === 'red' ? this.redBlockMat : this.blueBlockMat;
    const arrowTex = this.arrowTextures[direction] || this.arrowTextures['down'];

    const frontMat = new THREE.MeshStandardMaterial({
      map: arrowTex,
      roughness: 0.2
    });

    const materials = [baseMat, baseMat, baseMat, baseMat, frontMat, this.blockDarkMat];
    const mesh = new THREE.Mesh(geo, materials);

    const posX = this.lanesX[lane] || 0;
    const posY = this.heightsY[height] || 0.85;
    mesh.position.set(posX, posY, this.spawnZ);

    const block = {
      id: 'block_' + Math.random().toString(36).substr(2, 9),
      mesh: mesh,
      lane: lane,
      height: height,
      color: color,
      direction: direction,
      active: true,
      evaluated: false,
      sliceBox: new THREE.Box3()
    };

    this.scene.add(mesh);
    this.blocks.push(block);
  }

  sliceBlock(block, saberColor) {
    if (!block.active) return;
    block.active = false;
    this.scene.remove(block.mesh);

    // Reinforce agent with Dopamine!
    this.agent.receiveDopamineReward(block.id, 1.0);

    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.multiplier = Math.min(8, 1 + Math.floor(this.combo / 8));
    const points = 100 * this.multiplier;
    this.score += points;

    audioManager.playSliceHit(this.multiplier, false);
    const colorHex = block.color === 'red' ? 0xe51c44 : 0x1573fe;
    this.emitSparks(block.mesh.position, colorHex, 24);
    this.createCutPieces(block.mesh.position, block.color);

    // Spawn floating score number
    this.spawnFloatingScore(`+${points}`, block.mesh.position);

    if (this.onStateChange) {
      this.onStateChange({
        event: 'hit',
        score: this.score,
        combo: this.combo,
        multiplier: this.multiplier
      });
    }
  }

  missBlock(block) {
    if (!block.active) return;
    block.active = false;
    this.scene.remove(block.mesh);

    // Punish agent with "Бобо" (Nociception penalty)!
    this.agent.receivePainPenalty(block.id, 1.0);

    this.combo = 0;
    this.multiplier = 1;
    audioManager.playMiss();

    if (this.onStateChange) {
      this.onStateChange({
        event: 'miss',
        score: this.score,
        combo: this.combo,
        multiplier: this.multiplier
      });
    }
  }

  createCutPieces(pos, color) {
    const halfGeo = new THREE.BoxGeometry(0.26, 0.52, 0.52);
    const colorHex = color === 'red' ? 0xe51c44 : 0x1573fe;
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.3
    });

    for (const sign of [-1, 1]) {
      const piece = new THREE.Mesh(halfGeo, mat);
      piece.position.copy(pos);
      piece.position.x += sign * 0.15;

      this.scene.add(piece);
      this.slicedPieces.push({
        mesh: piece,
        vel: new THREE.Vector3(sign * (2.2 + Math.random() * 1.5), 2.2 + Math.random() * 1.5, 3.5 + Math.random() * 2),
        rotVel: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        lifetime: 0.65
      });
    }
  }

  spawnFloatingScore(text, worldPos) {
    const el = document.createElement('div');
    el.className = 'floating-hit';
    el.textContent = text;
    document.getElementById('hud-root').appendChild(el);

    // Project 3D world position to 2D screen coordinates
    const screenPos = worldPos.clone().project(this.scene.userData.camera || new THREE.PerspectiveCamera());
    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    setTimeout(() => {
      el.remove();
    }, 600);
  }

  update(delta, time) {
    // 1. Spawning from custom audio track
    this.updateCustomBeatmapSpawning();

    // 2. Animate distant laser sweeps
    for (const l of this.lasers) {
      l.mesh.rotation.z = l.baseRot + Math.sin(time * l.speed) * 0.12;
    }

    // 3. Move blocks towards fly
    const moveStep = this.speed * delta;
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      if (!block.active) {
        this.blocks.splice(i, 1);
        continue;
      }

      block.mesh.position.z += moveStep;
      const z = block.mesh.position.z;
      const distToStrike = this.hitZ - z;

      // The Fly evaluates the oncoming block using its neural network!
      if (distToStrike < 5.5 && distToStrike > -1.0 && !block.evaluated) {
        this.agent.evaluateAndAct(block, distToStrike);
        block.evaluated = true;
        if (this.onVisualStimulus) {
          this.onVisualStimulus(block.lane, block.color);
        }
      }

      // Check physical blade collision in the strike zone
      if (z >= this.hitZ - 0.75 && z <= this.hitZ + 0.85) {
        block.sliceBox.setFromObject(block.mesh);

        // Check Left Saber (Red)
        const leftDist = block.sliceBox.distanceToPoint(this.fly.leftSaber.userData.tipPos);
        if (leftDist < 0.46 && block.color === 'red') {
          this.sliceBlock(block, 'red');
          continue;
        }

        // Check Right Saber (Blue)
        const rightDist = block.sliceBox.distanceToPoint(this.fly.rightSaber.userData.tipPos);
        if (rightDist < 0.46 && block.color === 'blue') {
          this.sliceBlock(block, 'blue');
          continue;
        }
      }

      // Missed block passed behind fly
      if (z > this.missZ) {
        this.missBlock(block);
        this.blocks.splice(i, 1);
      }
    }

    // 4. Update cut pieces
    for (let i = this.slicedPieces.length - 1; i >= 0; i--) {
      const p = this.slicedPieces[i];
      p.lifetime -= delta;
      p.vel.y -= 9.8 * delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.rotation.x += p.rotVel.x * delta;
      p.mesh.rotation.y += p.rotVel.y * delta;
      p.mesh.rotation.z += p.rotVel.z * delta;

      if (p.lifetime <= 0) {
        this.scene.remove(p.mesh);
        this.slicedPieces.splice(i, 1);
      }
    }

    // 5. Update sparks
    const posAttr = this.sparkSystem.geometry.attributes.position;
    for (let i = 0; i < this.sparkLifetimes.length; i++) {
      if (this.sparkLifetimes[i] > 0) {
        this.sparkLifetimes[i] -= delta;
        const vel = this.sparkVelocities[i];
        vel.y -= 6.5 * delta;
        posAttr.setXYZ(
          i,
          posAttr.getX(i) + vel.x * delta,
          posAttr.getY(i) + vel.y * delta,
          posAttr.getZ(i) + vel.z * delta
        );
      } else {
        posAttr.setY(i, -100);
      }
    }
    posAttr.needsUpdate = true;
  }
}
