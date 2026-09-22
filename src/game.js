import * as THREE from 'three';
import { audioManager } from './audio.js';
import neuronsData from './neurons_sample.json';

export class GameManager {
  constructor(scene, camera, fly) {
    this.scene = scene;
    this.camera = camera;
    this.fly = fly;

    this.blocks = [];
    this.particles = [];
    this.slicedHalves = [];

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.multiplier = 1;
    this.health = 100;
    this.totalNotes = 0;
    this.hitNotes = 0;

    this.autoPlay = true; // Default ON so fly is immediately seen shredding Beat Saber!
    this.cameraMode = 'thirdPerson'; // 'thirdPerson', 'firstPerson', 'action'

    this.speed = 14; // Blocks move towards player at 14 units/sec
    this.spawnZ = -45;
    this.hitZ = 0.5;
    this.missZ = 4.0;

    // Connectome / Neurotransmitter gauges
    this.ntLevels = {
      ACH: 50,
      DA: 30,
      GABA: 40,
      GLUT: 25
    };

    this.recentNeurons = [];
    this.onHudUpdate = null;

    this.initMaterials();
    this.initEnvironment();
    this.initParticles();
  }

  initMaterials() {
    // Arrow textures generated on canvas
    this.arrowTextures = {};
    const directions = ['up', 'down', 'left', 'right', 'any'];
    for (const dir of directions) {
      this.arrowTextures[dir] = this.createArrowTexture(dir);
    }

    this.cyanMat = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      emissive: 0x005577,
      roughness: 0.2,
      metalness: 0.5
    });

    this.redMat = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      emissive: 0x660022,
      roughness: 0.2,
      metalness: 0.5
    });

    this.goldMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0x886600,
      roughness: 0.1,
      metalness: 0.8
    });

    this.bombMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.6,
      metalness: 0.8
    });
  }

  createArrowTexture(direction) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.translate(128, 128);

    if (direction === 'up') ctx.rotate(0);
    else if (direction === 'down') ctx.rotate(Math.PI);
    else if (direction === 'left') ctx.rotate(-Math.PI / 2);
    else if (direction === 'right') ctx.rotate(Math.PI / 2);

    if (direction === 'any') {
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -60);
      ctx.lineTo(50, 20);
      ctx.lineTo(20, 20);
      ctx.lineTo(20, 65);
      ctx.lineTo(-20, 65);
      ctx.lineTo(-20, 20);
      ctx.lineTo(-50, 20);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  initEnvironment() {
    // Cyberpunk grid tunnel
    const gridHelper = new THREE.GridHelper(100, 50, 0x00f5ff, 0x112233);
    gridHelper.position.set(0, -0.4, -20);
    this.scene.add(gridHelper);
    this.grid = gridHelper;

    // Glowing rails on lanes
    const railMat = new THREE.MeshBasicMaterial({ color: 0x114466 });
    for (const x of [-1.2, -0.4, 0.4, 1.2]) {
      const railGeo = new THREE.CylinderGeometry(0.02, 0.02, 100, 6);
      railGeo.rotateX(Math.PI / 2);
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(x, -0.38, -20);
      this.scene.add(rail);
    }

    // Tunnel neon ring portals
    this.rings = [];
    for (let i = 0; i < 8; i++) {
      const ringGeo = new THREE.TorusGeometry(3.6, 0.04, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00f5ff : 0xff0055,
        transparent: true,
        opacity: 0.35
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 1.2, -i * 8 - 5);
      this.scene.add(ring);
      this.rings.push(ring);
    }
  }

  initParticles() {
    const particleCount = 400;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100; // inactive below
      positions[i * 3 + 2] = 0;

      colors[i * 3] = 0;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;

      velocities.push(new THREE.Vector3());
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(geo, mat);
    this.particleVelocities = velocities;
    this.particleLifetimes = new Float32Array(particleCount);
    this.scene.add(this.particleSystem);
  }

  emitSparks(origin, colorHex, count = 25) {
    const color = new THREE.Color(colorHex);
    const posAttr = this.particleSystem.geometry.attributes.position;
    const colAttr = this.particleSystem.geometry.attributes.color;

    let emitted = 0;
    for (let i = 0; i < this.particleLifetimes.length && emitted < count; i++) {
      if (this.particleLifetimes[i] <= 0) {
        this.particleLifetimes[i] = 0.5 + Math.random() * 0.3;

        posAttr.setXYZ(i, origin.x, origin.y, origin.z);
        colAttr.setXYZ(i, color.r, color.g, color.b);

        const speed = 4 + Math.random() * 5;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;

        this.particleVelocities[i].set(
          Math.cos(theta) * Math.cos(phi) * speed,
          Math.sin(phi) * speed + 2,
          Math.sin(theta) * Math.cos(phi) * speed
        );

        emitted++;
      }
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  onBeat(event) {
    // Animate tunnel rings to the beat
    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i].scale.setScalar(1.08);
    }

    // Spawn blocks on beats based on pattern
    const beat = event.beat;
    this.spawnBeatPattern(beat, event.track.intensity);
  }

  spawnBeatPattern(beat, intensity) {
    // Lanes: -1.2 (L2), -0.4 (L1), 0.4 (R1), 1.2 (R2)
    // Heights: 0.7 (Low), 1.4 (High)
    const lanes = [-1.2, -0.4, 0.4, 1.2];
    const heights = [0.8, 1.5];
    const directions = ['down', 'up', 'left', 'right', 'any'];

    // Decide if we spawn note(s) this beat
    const spawnChance = Math.min(0.85, 0.5 + intensity * 0.2);
    if (Math.random() > spawnChance) return;

    // Single or Double note
    const isDouble = Math.random() < 0.35 && intensity > 1.0;

    if (isDouble) {
      // One Cyan on left side, one Red on right side
      const leftLane = lanes[Math.floor(Math.random() * 2)];
      const rightLane = lanes[2 + Math.floor(Math.random() * 2)];
      const h1 = heights[Math.floor(Math.random() * heights.length)];
      const h2 = heights[Math.floor(Math.random() * heights.length)];
      const d1 = directions[Math.floor(Math.random() * directions.length)];
      const d2 = directions[Math.floor(Math.random() * directions.length)];

      this.createBlock('cyan', leftLane, h1, d1);
      this.createBlock('red', rightLane, h2, d2);
    } else {
      const isBomb = Math.random() < 0.1;
      const isSpecial = !isBomb && Math.random() < 0.12;

      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      const height = heights[Math.floor(Math.random() * heights.length)];
      const dir = directions[Math.floor(Math.random() * directions.length)];

      if (isBomb) {
        this.createBomb(lane, height);
      } else if (isSpecial) {
        this.createBlock('gold', lane, height, 'any', true);
      } else {
        // Color correlates to side
        const color = lane < 0 ? 'cyan' : 'red';
        this.createBlock(color, lane, height, dir);
      }
    }
  }

  createBlock(colorType, x, y, direction, isSpecial = false) {
    const size = 0.55;
    const geo = new THREE.BoxGeometry(size, size, size);

    let baseMat;
    let emissiveColor;
    if (colorType === 'cyan') {
      baseMat = this.cyanMat;
      emissiveColor = 0x00f5ff;
    } else if (colorType === 'red') {
      baseMat = this.redMat;
      emissiveColor = 0xff0055;
    } else {
      baseMat = this.goldMat;
      emissiveColor = 0xffdd00;
    }

    const arrowTex = this.arrowTextures[direction];
    const frontMat = new THREE.MeshStandardMaterial({
      map: arrowTex,
      color: emissiveColor,
      emissive: emissiveColor,
      emissiveIntensity: 0.6,
      roughness: 0.2
    });

    // Box faces: [right, left, top, bottom, front, back]
    const materials = [baseMat, baseMat, baseMat, baseMat, frontMat, baseMat];
    const blockMesh = new THREE.Mesh(geo, materials);
    blockMesh.position.set(x, y, this.spawnZ);

    const block = {
      mesh: blockMesh,
      type: 'note',
      colorType: colorType,
      direction: direction,
      isSpecial: isSpecial,
      active: true,
      x: x,
      y: y,
      sliceBox: new THREE.Box3()
    };

    this.scene.add(blockMesh);
    this.blocks.push(block);
    this.totalNotes++;
  }

  createBomb(x, y) {
    const geo = new THREE.DodecahedronGeometry(0.3, 1);
    const bombMesh = new THREE.Mesh(geo, this.bombMat);
    bombMesh.position.set(x, y, this.spawnZ);

    // Spikes on bomb
    for (let i = 0; i < 8; i++) {
      const spikeGeo = new THREE.ConeGeometry(0.08, 0.25, 4);
      spikeGeo.translate(0, 0.2, 0);
      const spikeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      bombMesh.add(spike);
    }

    const bomb = {
      mesh: bombMesh,
      type: 'bomb',
      active: true,
      x: x,
      y: y,
      sliceBox: new THREE.Box3()
    };

    this.scene.add(bombMesh);
    this.blocks.push(bomb);
  }

  sliceBlock(block, saberColor) {
    if (!block.active) return;
    block.active = false;
    this.scene.remove(block.mesh);

    // Pick a real neuron from dataset (from neurons.csv!)
    const neuron = neuronsData[Math.floor(Math.random() * neuronsData.length)];
    this.recentNeurons.unshift(neuron);
    if (this.recentNeurons.length > 5) this.recentNeurons.pop();

    // Positive reinforcement: Dopamine surge!
    this.dopamineLevel = Math.min(100, (this.dopamineLevel || 30) + 12);
    this.painLevel = Math.max(0, (this.painLevel || 0) - 8);

    // Score & Combo calculation
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.multiplier = Math.min(8, 1 + Math.floor(this.combo / 8));

    const basePoints = block.isSpecial ? 250 : 100;
    this.score += basePoints * this.multiplier;
    this.hitNotes++;
    this.health = Math.min(100, this.health + 2);

    // Sound effect
    audioManager.playSliceHit(this.multiplier, block.isSpecial);

    // Particle sparks
    const colorHex = block.colorType === 'cyan' ? 0x00f5ff : (block.colorType === 'red' ? 0xff0055 : 0xffdd00);
    this.emitSparks(block.mesh.position, colorHex, block.isSpecial ? 40 : 25);

    // Create 3D sliced halves tumbling away
    this.createCutHalves(block.mesh.position, block.colorType);

    // Fly swing trigger and visual euphoria
    this.fly.triggerSwing(saberColor === 'cyan' ? 'left' : 'right', block.direction);
    this.fly.flutterIntensity = 1.6;

    if (this.onHudUpdate) {
      this.onHudUpdate({
        event: 'hit',
        neuron: neuron,
        score: this.score,
        combo: this.combo,
        multiplier: this.multiplier,
        health: this.health,
        dopamine: this.dopamineLevel,
        pain: this.painLevel,
        accuracy: Math.round((this.hitNotes / Math.max(1, this.totalNotes)) * 100),
        ntLevels: this.ntLevels
      });
    }
  }

  missBlock(block) {
    if (!block.active) return;
    block.active = false;
    this.scene.remove(block.mesh);

    if (block.type === 'note') {
      this.combo = 0;
      this.multiplier = 1;
      this.health = Math.max(0, this.health - 6);

      // Negative reinforcement: "Бобо" (Nociceptive shock)
      this.painLevel = Math.min(100, (this.painLevel || 0) + 20);
      this.dopamineLevel = Math.max(0, (this.dopamineLevel || 30) - 10);

      // Fly flinches from pain
      this.fly.flutterIntensity = 0.4;
      this.fly.bodyRoot.position.x += (Math.random() - 0.5) * 0.15;

      audioManager.playMiss();

      if (this.onHudUpdate) {
        this.onHudUpdate({
          event: 'miss',
          score: this.score,
          combo: this.combo,
          multiplier: this.multiplier,
          health: this.health,
          dopamine: this.dopamineLevel,
          pain: this.painLevel,
          accuracy: Math.round((this.hitNotes / Math.max(1, this.totalNotes)) * 100),
          ntLevels: this.ntLevels
        });
      }
    }
  }

  hitBomb(bomb) {
    if (!bomb.active) return;
    bomb.active = false;
    this.scene.remove(bomb.mesh);

    this.combo = 0;
    this.multiplier = 1;
    this.health = Math.max(0, this.health - 20);

    // Severe pain spike!
    this.painLevel = Math.min(100, (this.painLevel || 0) + 40);
    this.dopamineLevel = Math.max(0, (this.dopamineLevel || 30) - 20);

    audioManager.playBombHit();
    this.emitSparks(bomb.mesh.position, 0xff2200, 50);

    // Fly temporary spin reflex (Giant fiber escape tumble)
    this.fly.group.rotation.y += Math.PI * 2;

    if (this.onHudUpdate) {
      this.onHudUpdate({
        event: 'bomb',
        score: this.score,
        combo: 0,
        multiplier: 1,
        health: this.health,
        dopamine: this.dopamineLevel,
        pain: this.painLevel,
        accuracy: Math.round((this.hitNotes / Math.max(1, this.totalNotes)) * 100),
        ntLevels: this.ntLevels
      });
    }
  }

  // Auto-play AI for Fly
  updateAutoPlay(delta) {
    if (!this.autoPlay) return;

    let closestCyan = null;
    let closestRed = null;
    let closestDistCyan = 999;
    let closestDistRed = 999;

    for (const block of this.blocks) {
      if (!block.active || block.type === 'bomb') continue;
      const dist = block.mesh.position.z - this.hitZ;
      if (dist > -1.5 && dist < 12) {
        if (block.colorType === 'cyan' || block.isSpecial) {
          if (dist < closestDistCyan) {
            closestDistCyan = dist;
            closestCyan = block;
          }
        }
        if (block.colorType === 'red' || block.isSpecial) {
          if (dist < closestDistRed) {
            closestDistRed = dist;
            closestRed = block;
          }
        }
      }
    }

    // Guide left saber towards upcoming cyan block
    if (closestCyan) {
      this.fly.leftSaberTarget.set(
        closestCyan.mesh.position.x,
        closestCyan.mesh.position.y,
        0.5
      );
    } else {
      this.fly.leftSaberTarget.set(-0.7, 0.4, 0.5);
    }

    // Guide right saber towards upcoming red block
    if (closestRed) {
      this.fly.rightSaberTarget.set(
        closestRed.mesh.position.x,
        closestRed.mesh.position.y,
        0.5
      );
    } else {
      this.fly.rightSaberTarget.set(0.7, 0.4, 0.5);
    }
  }

  update(delta, time) {
    // 1. Move rings and reset scale
    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i].scale.lerp(new THREE.Vector3(1, 1, 1), delta * 8);
    }

    // 2. Fly AI auto-play
    this.updateAutoPlay(delta);

    // 3. Move blocks towards player
    const moveStep = this.speed * delta;
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      if (!block.active) {
        this.blocks.splice(i, 1);
        continue;
      }

      block.mesh.position.z += moveStep;

      // Rotation for bombs
      if (block.type === 'bomb') {
        block.mesh.rotation.x += delta * 2;
        block.mesh.rotation.y += delta * 3;
      }

      // Check hit collision
      const z = block.mesh.position.z;
      if (z >= this.hitZ - 0.7 && z <= this.hitZ + 0.8) {
        if (this.autoPlay) {
          // AI automatically performs slice when in hit zone
          if (block.type === 'note') {
            const saberColor = block.colorType === 'cyan' ? 'cyan' : 'red';
            this.sliceBlock(block, saberColor);
            continue;
          }
        } else {
          // Player manual hit check
          this.checkPlayerCollision(block);
        }
      }

      // Missed note passed behind player
      if (z > this.missZ) {
        this.missBlock(block);
        this.blocks.splice(i, 1);
      }
    }

    // 4. Update sliced halves physics
    for (let i = this.slicedHalves.length - 1; i >= 0; i--) {
      const h = this.slicedHalves[i];
      h.lifetime -= delta;
      h.vel.y -= 9.8 * delta; // Gravity
      h.mesh.position.addScaledVector(h.vel, delta);
      h.mesh.rotation.x += h.rotVel.x * delta;
      h.mesh.rotation.y += h.rotVel.y * delta;
      h.mesh.rotation.z += h.rotVel.z * delta;

      if (h.lifetime <= 0) {
        this.scene.remove(h.mesh);
        this.slicedHalves.splice(i, 1);
      }
    }

    // 5. Update spark particles
    const posAttr = this.particleSystem.geometry.attributes.position;
    for (let i = 0; i < this.particleLifetimes.length; i++) {
      if (this.particleLifetimes[i] > 0) {
        this.particleLifetimes[i] -= delta;
        const vel = this.particleVelocities[i];
        vel.y -= 8.0 * delta; // Gravity on sparks
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

    // Decay neurotransmitter levels gradually
    this.ntLevels.ACH = Math.max(10, this.ntLevels.ACH - delta * 0.8);
    this.ntLevels.DA = Math.max(5, this.ntLevels.DA - delta * 1.2);
    this.ntLevels.GABA = Math.max(10, this.ntLevels.GABA - delta * 0.6);
    this.ntLevels.GLUT = Math.max(5, this.ntLevels.GLUT - delta * 0.9);

    // Smooth return of fly flutter
    this.fly.flutterIntensity = THREE.MathUtils.lerp(this.fly.flutterIntensity, 1.0, delta * 3);
  }

  checkPlayerCollision(block) {
    if (!block.active) return;
    const box = new THREE.Box3().setFromObject(block.mesh);

    // Check left saber
    const leftDist = box.distanceToPoint(this.fly.leftSaber.userData.tipPos);
    if (leftDist < 0.45 && (block.colorType === 'cyan' || block.isSpecial)) {
      this.sliceBlock(block, 'cyan');
      return;
    }

    // Check right saber
    const rightDist = box.distanceToPoint(this.fly.rightSaber.userData.tipPos);
    if (rightDist < 0.45 && (block.colorType === 'red' || block.isSpecial)) {
      this.sliceBlock(block, 'red');
      return;
    }

    // Check bomb collision with either saber
    if (block.type === 'bomb') {
      if (leftDist < 0.35 || rightDist < 0.35) {
        this.hitBomb(block);
      }
    }
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    if (mode === 'thirdPerson') {
      this.camera.position.set(0, 1.9, 3.2);
      this.camera.lookAt(0, 1.0, -10);
      this.fly.group.visible = true;
    } else if (mode === 'firstPerson') {
      // First person from fly's eyes
      this.camera.position.set(0, 1.15, -0.6);
      this.camera.lookAt(0, 1.15, -20);
      this.fly.thorax.visible = false;
      this.fly.abdomen.visible = false;
    } else if (mode === 'action') {
      // Side isometric action cam
      this.camera.position.set(2.8, 2.5, 2.2);
      this.camera.lookAt(0, 1.0, -2);
      this.fly.thorax.visible = true;
      this.fly.abdomen.visible = true;
      this.fly.group.visible = true;
    }
  }
}
