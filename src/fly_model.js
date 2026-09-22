import * as THREE from 'three';

export class RealisticDrosophilaModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    this.wingSpeed = 75.0;
    this.wingAngle = 0;
    this.flutterAmplitude = 0.45;

    // Saber target positions
    this.leftSaberTarget = new THREE.Vector3(-0.55, 0.45, 0.55);
    this.rightSaberTarget = new THREE.Vector3(0.55, 0.45, 0.55);

    this.leftSaberPos = new THREE.Vector3(-0.55, 0.45, 0.55);
    this.rightSaberPos = new THREE.Vector3(0.55, 0.45, 0.55);

    this.leftSwingTimer = 0;
    this.rightSwingTimer = 0;
    this.swingDuration = 0.16;

    // Subtle natural feedback
    this.painFlinchTimer = 0;
    this.dopamineGlowTimer = 0;

    this.buildAnatomy();
    this.scene.add(this.group);

    this.group.position.set(0, 0.95, 0);
  }

  buildAnatomy() {
    this.bodyRoot = new THREE.Group();
    this.group.add(this.bodyRoot);

    // Natural PBR Materials (gentle on the eyes, organic)
    const chitinThoraxMat = new THREE.MeshStandardMaterial({
      color: 0x221a14,
      roughness: 0.38,
      metalness: 0.55
    });

    const chitinAmberMat = new THREE.MeshStandardMaterial({
      color: 0x5a3e20,
      roughness: 0.45,
      metalness: 0.25
    });

    const bristleMat = new THREE.MeshStandardMaterial({
      color: 0x140e0a,
      roughness: 0.8
    });

    // 1. Thorax
    const thoraxGeo = new THREE.SphereGeometry(0.38, 24, 24);
    thoraxGeo.scale(0.85, 0.8, 1.3);
    this.thorax = new THREE.Mesh(thoraxGeo, chitinThoraxMat);
    this.thorax.position.set(0, 0, 0);
    this.bodyRoot.add(this.thorax);

    // Scutellum (posterior shield plate)
    const scutGeo = new THREE.ConeGeometry(0.2, 0.28, 16);
    scutGeo.scale(1.1, 0.55, 0.95);
    scutGeo.rotateX(Math.PI / 2 + 0.3);
    const scutellum = new THREE.Mesh(scutGeo, chitinAmberMat);
    scutellum.position.set(0, 0.1, -0.42);
    this.bodyRoot.add(scutellum);

    // Macrochaetae (delicate sensory bristles)
    const bristleCoords = [
      [-0.18, 0.26, 0.08], [0.18, 0.26, 0.08],
      [-0.15, 0.28, -0.15], [0.15, 0.28, -0.15],
      [-0.1, 0.22, -0.45], [0.1, 0.22, -0.45]
    ];
    for (const [bx, by, bz] of bristleCoords) {
      const bGeo = new THREE.CylinderGeometry(0.005, 0.001, 0.18, 4);
      bGeo.translate(0, 0.09, 0);
      const bMesh = new THREE.Mesh(bGeo, bristleMat);
      bMesh.position.set(bx, by, bz);
      bMesh.rotation.set(0.35, 0, bx > 0 ? 0.2 : -0.2);
      this.bodyRoot.add(bMesh);
    }

    // 2. Abdomen (Segmented Drosophila pattern with muted dark bands)
    this.buildAbdomen(chitinAmberMat);

    // 3. Head & Deep Ruby Compound Eyes
    this.buildHead(chitinThoraxMat, bristleMat);

    // 4. Halteres
    this.buildHalteres();

    // 5. Delicate Gossamer Wings
    this.buildWings();

    // 6. Six Slender Articulated Legs
    this.buildLegs(chitinThoraxMat);

    // 7. Authentic Beat Saber Lightsabers (Crimson Red Left / Royal Blue Right)
    this.leftSaber = this.createSaber(0xe51c44, 'red');
    this.rightSaber = this.createSaber(0x1573fe, 'blue');

    this.group.add(this.leftSaber);
    this.group.add(this.rightSaber);
  }

  buildAbdomen(amberMat) {
    this.abdomenGroup = new THREE.Group();
    this.abdomenGroup.position.set(0, -0.04, -0.5);
    this.abdomenGroup.rotation.x = -0.18;
    this.bodyRoot.add(this.abdomenGroup);

    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x16100c,
      roughness: 0.45
    });

    const segmentCount = 6;
    for (let i = 0; i < segmentCount; i++) {
      const r = 0.28 * Math.cos((i / segmentCount) * 1.05);
      const segGeo = new THREE.CylinderGeometry(r * 0.95, r, 0.2, 20);
      segGeo.rotateX(Math.PI / 2);
      const isTip = i >= 4;
      const segMesh = new THREE.Mesh(segGeo, isTip ? stripeMat : amberMat);
      segMesh.position.set(0, -i * 0.035, -i * 0.18);
      this.abdomenGroup.add(segMesh);

      if (!isTip) {
        const stripeGeo = new THREE.TorusGeometry(r * 0.98, 0.02, 8, 20);
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, -i * 0.035, -i * 0.18 - 0.06);
        this.abdomenGroup.add(stripe);
      }
    }
  }

  buildHead(darkMat, bristleMat) {
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.05, 0.48);
    this.bodyRoot.add(this.headGroup);

    const headGeo = new THREE.SphereGeometry(0.24, 20, 20);
    headGeo.scale(1.05, 0.92, 0.85);
    this.headMesh = new THREE.Mesh(headGeo, darkMat);
    this.headGroup.add(this.headMesh);

    // Velvety Deep Ruby Compound Eyes (Subtle, realistic, pleasant on the eyes)
    const eyeCanvas = document.createElement('canvas');
    eyeCanvas.width = 128;
    eyeCanvas.height = 128;
    const ctx = eyeCanvas.getContext('2d');
    ctx.fillStyle = '#6b0f1a';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#3b050c';
    ctx.lineWidth = 1.2;
    for (let y = 0; y < 128; y += 8) {
      for (let x = 0; x < 128; x += 12) {
        const ox = (y % 16 === 0) ? 6 : 0;
        ctx.strokeRect(x + ox, y, 8, 8);
      }
    }
    const eyeTexture = new THREE.CanvasTexture(eyeCanvas);

    this.eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a1424,
      roughness: 0.22,
      metalness: 0.35,
      map: eyeTexture
    });

    const eyeGeo = new THREE.SphereGeometry(0.17, 20, 20);
    eyeGeo.scale(0.85, 1.25, 1.0);

    this.leftEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    this.leftEye.position.set(-0.19, 0.04, 0.04);
    this.leftEye.rotation.set(0.1, -0.32, 0.22);
    this.headGroup.add(this.leftEye);

    this.rightEye = new THREE.Mesh(eyeGeo, this.eyeMaterial.clone());
    this.rightEye.position.set(0.19, 0.04, 0.04);
    this.rightEye.rotation.set(0.1, 0.32, -0.22);
    this.headGroup.add(this.rightEye);

    // Delicate Feathered Aristae (Antennae)
    for (const sign of [-1, 1]) {
      const ant = new THREE.Group();
      ant.position.set(sign * 0.07, 0.1, 0.2);
      ant.rotation.set(0.35, 0, sign * 0.18);

      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.002, 0.22, 4), bristleMat);
      stalk.position.set(0, 0.11, 0.04);
      stalk.rotation.x = 0.45;
      ant.add(stalk);

      for (let h = 0; h < 4; h++) {
        const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.001, 0.06, 3), bristleMat);
        hair.position.set(sign * 0.015, 0.08 + h * 0.03, 0.04 + h * 0.015);
        hair.rotation.z = sign * 0.75;
        ant.add(hair);
      }
      this.headGroup.add(ant);
    }

    // Proboscis
    const prob = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.15, 8), darkMat);
    prob.position.set(0, -0.16, 0.1);
    prob.rotation.x = 0.65;
    this.headGroup.add(prob);
  }

  buildHalteres() {
    const hMat = new THREE.MeshStandardMaterial({ color: 0xc4b59d, roughness: 0.4 });
    for (const sign of [-1, 1]) {
      const h = new THREE.Group();
      h.position.set(sign * 0.2, 0.04, -0.28);
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.14, 5), hMat);
      stalk.rotation.z = sign * 1.1;
      h.add(stalk);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), hMat);
      knob.position.set(sign * 0.1, 0.03, 0);
      h.add(knob);
      this.bodyRoot.add(h);
    }
  }

  buildWings() {
    const wingCanvas = document.createElement('canvas');
    wingCanvas.width = 512;
    wingCanvas.height = 1024;
    const wctx = wingCanvas.getContext('2d');

    // Translucent soft membrane
    wctx.fillStyle = 'rgba(240, 248, 255, 0.15)';
    wctx.fillRect(0, 0, 512, 1024);

    // Delicate organic veins
    wctx.strokeStyle = 'rgba(60, 45, 35, 0.75)';
    wctx.lineWidth = 5;
    wctx.beginPath();
    wctx.moveTo(256, 920);
    wctx.quadraticCurveTo(80, 580, 110, 240);
    wctx.quadraticCurveTo(140, 70, 256, 50);
    wctx.stroke();

    wctx.lineWidth = 3;
    const veins = [
      [[256, 920], [180, 480], [165, 180]],
      [[256, 920], [225, 480], [256, 110]],
      [[256, 920], [290, 530], [355, 240]],
      [[256, 920], [345, 630], [415, 440]]
    ];
    for (const v of veins) {
      wctx.beginPath();
      wctx.moveTo(v[0][0], v[0][1]);
      wctx.quadraticCurveTo(v[1][0], v[1][1], v[2][0], v[2][1]);
      wctx.stroke();
    }

    const wingTexture = new THREE.CanvasTexture(wingCanvas);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(0.32, 0.55, 0.38, 1.25);
    wingShape.quadraticCurveTo(0.22, 1.55, 0.0, 1.6);
    wingShape.quadraticCurveTo(-0.22, 1.5, -0.25, 1.15);
    wingShape.quadraticCurveTo(-0.18, 0.5, 0, 0);

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    const wingMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      map: wingTexture,
      transparent: true,
      opacity: 0.55,
      roughness: 0.12,
      metalness: 0.05,
      transmission: 0.5,
      side: THREE.DoubleSide
    });

    this.leftWingHinge = new THREE.Group();
    this.leftWingHinge.position.set(-0.16, 0.25, -0.04);
    this.leftWingMesh = new THREE.Mesh(wingGeo, wingMat);
    this.leftWingMesh.rotation.x = -Math.PI / 2 + 0.22;
    this.leftWingMesh.rotation.z = 0.42;
    this.leftWingHinge.add(this.leftWingMesh);
    this.bodyRoot.add(this.leftWingHinge);

    this.rightWingHinge = new THREE.Group();
    this.rightWingHinge.position.set(0.16, 0.25, -0.04);
    this.rightWingMesh = new THREE.Mesh(wingGeo, wingMat);
    this.rightWingMesh.rotation.x = -Math.PI / 2 + 0.22;
    this.rightWingMesh.rotation.z = -0.42;
    this.rightWingHinge.add(this.rightWingMesh);
    this.bodyRoot.add(this.rightWingHinge);
  }

  buildLegs(legMat) {
    // 6 legs with natural insect articulation
    for (const sign of [-1, 1]) {
      // Front legs
      const front = new THREE.Group();
      front.position.set(sign * 0.18, -0.12, 0.2);
      const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.34, 6), legMat);
      femur.position.set(sign * 0.1, 0.08, 0.1);
      femur.rotation.set(-0.55, 0, -sign * 0.55);
      front.add(femur);

      const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.01, 0.38, 6), legMat);
      tibia.position.set(sign * 0.18, 0.15, 0.28);
      tibia.rotation.set(0.75, 0, sign * 0.25);
      front.add(tibia);
      this.bodyRoot.add(front);

      // Mid & Hind legs folded in flight
      for (const [z, aZ, rX] of [[-0.02, 0.85, -0.25], [-0.22, 1.05, -0.65]]) {
        const leg = new THREE.Group();
        leg.position.set(sign * 0.2, -0.12, z);

        const f = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.4, 5), legMat);
        f.position.set(sign * 0.15, -0.1, -0.1);
        f.rotation.set(rX, 0, sign * aZ);
        leg.add(f);

        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.007, 0.42, 5), legMat);
        t.position.set(sign * 0.25, -0.22, -0.28);
        t.rotation.set(rX - 0.35, 0, sign * 0.35);
        leg.add(t);

        this.bodyRoot.add(leg);
      }
    }
  }

  createSaber(colorHex, name) {
    const saber = new THREE.Group();
    saber.name = name;

    // Authentic Beat Saber Ergonomic Hilt
    const hiltGeo = new THREE.CylinderGeometry(0.038, 0.042, 0.34, 16);
    const hiltMat = new THREE.MeshStandardMaterial({
      color: 0x111318,
      roughness: 0.3,
      metalness: 0.75
    });
    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
    hilt.position.y = -0.16;
    saber.add(hilt);

    // Metallic ring and color stripe on hilt
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.044, 0.04, 16),
      new THREE.MeshBasicMaterial({ color: colorHex })
    );
    ring.position.y = -0.06;
    saber.add(ring);

    // Saber blade: Soft glowing cylinder aura
    const auraGeo = new THREE.CylinderGeometry(0.036, 0.036, 1.38, 16);
    auraGeo.translate(0, 0.69, 0);
    const auraMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    saber.add(aura);

    // Saber core: Pure white bright beam
    const coreGeo = new THREE.CylinderGeometry(0.016, 0.016, 1.36, 12);
    coreGeo.translate(0, 0.69, 0);
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    saber.add(core);

    // Subtle localized blade light
    const light = new THREE.PointLight(colorHex, 0.85, 2.5);
    light.position.set(0, 0.7, 0);
    saber.add(light);

    saber.userData = {
      color: name,
      tipPos: new THREE.Vector3(),
      basePos: new THREE.Vector3()
    };

    return saber;
  }

  swing(saberColor, direction = 'down') {
    if (saberColor === 'red') {
      this.leftSwingTimer = this.swingDuration;
      this.leftSwingDir = direction;
    } else {
      this.rightSwingTimer = this.swingDuration;
      this.rightSwingDir = direction;
    }
  }

  triggerDopamineReaction() {
    this.dopamineGlowTimer = 0.3;
    this.flutterAmplitude = 0.65;
    this.wingSpeed = 95.0;
  }

  triggerPainReaction() {
    this.painFlinchTimer = 0.22;
    this.flutterAmplitude = 0.2;
  }

  update(delta, time) {
    // 1. Organic wing flutter
    this.wingAngle += delta * this.wingSpeed;
    const flap = Math.sin(this.wingAngle) * this.flutterAmplitude;
    if (this.leftWingHinge && this.rightWingHinge) {
      this.leftWingHinge.rotation.x = flap;
      this.rightWingHinge.rotation.x = -flap;
    }

    // 2. Flinch / Shake from "Бобо" (Natural subtle flinch, no eye-hurting flashes)
    if (this.painFlinchTimer > 0) {
      this.painFlinchTimer -= delta;
      const shake = (Math.random() - 0.5) * 0.08;
      this.bodyRoot.position.set(shake, shake * 0.6, 0);
    } else {
      const hoverY = Math.sin(time * 3.5) * 0.035;
      const hoverRoll = Math.sin(time * 2.2) * 0.02;
      this.bodyRoot.position.set(0, hoverY, 0);
      this.bodyRoot.rotation.z = hoverRoll;
    }

    // 3. Left Saber Swing (Red)
    if (this.leftSwingTimer > 0) {
      this.leftSwingTimer -= delta;
      const p = 1.0 - (this.leftSwingTimer / this.swingDuration);
      const angle = Math.sin(p * Math.PI) * 1.6;
      this.leftSaber.rotation.x = -0.35 - angle;
      this.leftSaber.rotation.z = 0.15 + (this.leftSwingDir === 'left' ? -0.5 : 0.3);
    } else {
      this.leftSaber.rotation.x = THREE.MathUtils.lerp(this.leftSaber.rotation.x, -0.25, delta * 14);
      this.leftSaber.rotation.z = THREE.MathUtils.lerp(this.leftSaber.rotation.z, 0.12, delta * 14);
    }
    this.leftSaber.position.lerp(this.leftSaberTarget, delta * 20);

    // 4. Right Saber Swing (Blue)
    if (this.rightSwingTimer > 0) {
      this.rightSwingTimer -= delta;
      const p = 1.0 - (this.rightSwingTimer / this.swingDuration);
      const angle = Math.sin(p * Math.PI) * 1.6;
      this.rightSaber.rotation.x = -0.35 - angle;
      this.rightSaber.rotation.z = -0.15 + (this.rightSwingDir === 'right' ? 0.5 : -0.3);
    } else {
      this.rightSaber.rotation.x = THREE.MathUtils.lerp(this.rightSaber.rotation.x, -0.25, delta * 14);
      this.rightSaber.rotation.z = THREE.MathUtils.lerp(this.rightSaber.rotation.z, -0.12, delta * 14);
    }
    this.rightSaber.position.lerp(this.rightSaberTarget, delta * 20);

    this.flutterAmplitude = THREE.MathUtils.lerp(this.flutterAmplitude, 0.45, delta * 3);
    this.wingSpeed = THREE.MathUtils.lerp(this.wingSpeed, 75.0, delta * 3);

    this.updateSaberPositions(this.leftSaber);
    this.updateSaberPositions(this.rightSaber);
  }

  updateSaberPositions(saber) {
    const base = new THREE.Vector3(0, 0, 0);
    const tip = new THREE.Vector3(0, 1.38, 0);
    saber.localToWorld(base);
    saber.localToWorld(tip);
    saber.userData.basePos.copy(base);
    saber.userData.tipPos.copy(tip);
  }
}
