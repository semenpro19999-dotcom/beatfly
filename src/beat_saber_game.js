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

    this.speed = 16.0; // Units per second
    this.spawnZ = -55.0;
    this.hitZ = 0.6;
    this.missZ = 3.5;

    this.score = 0;
    this.combo = 0;
    this.multiplier = 1;
    this.maxCombo = 0;

    // Lanes: 4 lanes (-1.5, -0.5, 0.5, 1.5), 2 heights (0.8, 1.55)
    this.lanesX = [-1.5, -0.5, 0.5, 1.5];
    this.heightsY = [0.8, 1.55];

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
  }

  initVisualAssets() {
    this.arrowTextures = {};
    const dirs = ['down', 'up', 'left', 'right', 'any'];
    for (const d of dirs) {
      this.arrowTextures[d] = this.createArrowTexture(d);
    }

    // Authentic Beat Saber Red & Blue materials
    this.redMat = new THREE.MeshStandardMaterial({
      color: 0xff0044,
      emissive: 0x880022,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.4
    });

    this.blueMat = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      emissive: 0x003388,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.4
    });

    this.innerMat = new THREE.MeshBasicMaterial({ color: 0x111118 });
  }

  createArrowTexture(dir) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.translate(128, 128);

    if (dir === 'down') ctx.rotate(Math.PI);
    else if (dir === 'left') ctx.rotate(-Math.PI / 2);
    else if (dir === 'right') ctx.rotate(Math.PI / 2);

    if (dir === 'any') {
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -65);
      ctx.lineTo(55, 20);
      ctx.lineTo(24, 20);
      ctx.lineTo(24, 65);
      ctx.lineTo(-24, 65);
      ctx.lineTo(-24, 20);
      ctx.lineTo(-55, 20);
      ctx.closePath();
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  initEnvironment() {
    // Floor grid
    const grid = new THREE.GridHelper(120, 60, 0x0088ff, 0x111828);
    grid.position.set(0, -0.4, -25);
    this.scene.add(grid);

    // Neon lane rails
    const railMat = new THREE.MeshBasicMaterial({ color: 0x004488 });
    for (const lx of this.lanesX) {
      const geo = new THREE.CylinderGeometry(0.02, 0.02, 120, 6);
      geo.rotateX(Math.PI / 2);
      const rail = new THREE.Mesh(geo, railMat);
      rail.position.set(lx, -0.38, -25);
      this.scene.add(rail);
    }

    // Tunnel neon portals
    this.portals = [];
    for (let i = 0; i < 10; i++) {
      const pGeo = new THREE.TorusGeometry(4.2, 0.05, 8, 36);
      const pMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff0044 : 0x0088ff,
        transparent: true,
        opacity: 0.35
      });
      const portal = new THREE.Mesh(pGeo, pMat);
      portal.position.set(0, 1.2, -i * 8 - 4);
      this.scene.add(portal);
      this.portals.push(portal);
    }
  }

  initSparks() {
    const count = 500;
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
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    this.sparkSystem = new THREE.Points(geo, mat);
    this.scene.add(this.sparkSystem);
  }

  emitSparks(origin, colorHex, count = 30) {
    const col = new THREE.Color(colorHex);
    const posAttr = this.sparkSystem.geometry.attributes.position;
    const colAttr = this.sparkSystem.geometry.attributes.color;

    let emitted = 0;
    for (let i = 0; i < this.sparkLifetimes.length && emitted < count; i++) {
      if (this.sparkLifetimes[i] <= 0) {
        this.sparkLifetimes[i] = 0.5 + Math.random() * 0.3;
        posAttr.setXYZ(i, origin.x, origin.y, origin.z);
        colAttr.setXYZ(i, col.r, col.g, col.b);

        const spd = 4.5 + Math.random() * 6;
        const th = Math.random() * Math.PI * 2;
        const ph = (Math.random() - 0.5) * Math.PI;

        this.sparkVelocities[i].set(
          Math.cos(th) * Math.cos(ph) * spd,
          Math.sin(ph) * spd + 2.5,
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

    // Stop existing audio
    this.stopAudio();

    const result = await this.analyzer.analyzeFile(file);
    this.customAudioBuffer = result.audioBuffer;
    this.customBeatmap = result.beatmap;
    this.beatmapIndex = 0;

    console.log(`[BeatSaber] Битмап создан: ${this.customBeatmap.length} кубиков под музыку ${file.name}`);
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
      console.log('[BeatSaber] Пользовательский трек завершился');
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

  // Spawn cube from custom beatmap based on audio playback time
  updateCustomBeatmapSpawning() {
    if (!this.isCustomTrackPlaying || !this.customBeatmap) return;

    const ctx = audioManager.ctx;
    const currentTrackTime = ctx.currentTime - this.audioStartTime;

    // Travel time from spawnZ (-55) to hitZ (0.6)
    const travelDistance = this.hitZ - this.spawnZ; // 55.6
    const travelTime = travelDistance / this.speed;  // ~3.47 seconds

    while (
      this.beatmapIndex < this.customBeatmap.length &&
      this.customBeatmap[this.beatmapIndex].time <= currentTrackTime + travelTime
    ) {
      const note = this.customBeatmap[this.beatmapIndex];
      this.spawnBlock(note.lane, note.height, note.color, note.direction);
      this.beatmapIndex++;
    }
  }

  // Fallback procedural beat pattern (when no custom audio is uploaded)
  onProceduralBeat(event) {
    if (this.isCustomTrackPlaying) return; // Do not spawn procedural blocks if custom track plays!

    // Animate portals to beat
    for (const p of this.portals) {
      p.scale.setScalar(1.08);
    }

    const lane = Math.floor(Math.random() * 4);
    const height = Math.random() < 0.7 ? 0 : 1;
    const color = lane < 2 ? 'red' : 'blue';
    const dirs = ['down', 'down', 'up', 'left', 'right', 'any'];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];

    this.spawnBlock(lane, height, color, dir);
  }

  spawnBlock(lane, height, color, direction) {
    const size = 0.58;
    const geo = new THREE.BoxGeometry(size, size, size);

    const baseMat = color === 'red' ? this.redMat : this.blueMat;
    const arrowTex = this.arrowTextures[direction] || this.arrowTextures['down'];

    const frontMat = new THREE.MeshStandardMaterial({
      map: arrowTex,
      color: color === 'red' ? 0xff0044 : 0x0088ff,
      emissive: color === 'red' ? 0xff0044 : 0x0088ff,
      emissiveIntensity: 0.6,
      roughness: 0.2
    });

    // Box faces: [right, left, top, bottom, front, back]
    const materials = [baseMat, baseMat, baseMat, baseMat, frontMat, this.innerMat];
    const mesh = new THREE.Mesh(geo, materials);

    const posX = this.lanesX[lane] || 0;
    const posY = this.heightsY[height] || 0.8;
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

    // Audio & visuals
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.multiplier = Math.min(8, 1 + Math.floor(this.combo / 8));
    this.score += 100 * this.multiplier;

    audioManager.playSliceHit(this.multiplier, false);
    const colorHex = block.color === 'red' ? 0xff0044 : 0x0088ff;
    this.emitSparks(block.mesh.position, colorHex, 35);
    this.createCutPieces(block.mesh.position, block.color);

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
    const halfGeo = new THREE.BoxGeometry(0.28, 0.56, 0.56);
    const colorHex = color === 'red' ? 0xff0044 : 0x0088ff;
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.4
    });

    for (const sign of [-1, 1]) {
      const piece = new THREE.Mesh(halfGeo, mat);
      piece.position.copy(pos);
      piece.position.x += sign * 0.16;

      this.scene.add(piece);
      this.slicedPieces.push({
        mesh: piece,
        vel: new THREE.Vector3(sign * (2.5 + Math.random() * 2), 2.5 + Math.random() * 2, 4 + Math.random() * 3),
        rotVel: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
        lifetime: 0.7
      });
    }
  }

  update(delta, time) {
    // 1. Spawning from custom audio track
    this.updateCustomBeatmapSpawning();

    // 2. Animate portals back to base scale
    for (const p of this.portals) {
      p.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 8);
    }

    // 3. Move blocks towards player
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
      // (Visual receptive field activates when block enters striking range)
      if (distToStrike < 6.0 && distToStrike > -1.0 && !block.evaluated) {
        this.agent.evaluateAndAct(block, distToStrike);
        block.evaluated = true;
      }

      // Check physical blade collision in the strike zone
      if (z >= this.hitZ - 0.8 && z <= this.hitZ + 0.9) {
        block.sliceBox.setFromObject(block.mesh);

        // Check Left Saber (Red)
        const leftDist = block.sliceBox.distanceToPoint(this.fly.leftSaber.userData.tipPos);
        if (leftDist < 0.48 && block.color === 'red') {
          this.sliceBlock(block, 'red');
          continue;
        }

        // Check Right Saber (Blue)
        const rightDist = block.sliceBox.distanceToPoint(this.fly.rightSaber.userData.tipPos);
        if (rightDist < 0.48 && block.color === 'blue') {
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
        vel.y -= 7.5 * delta;
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
