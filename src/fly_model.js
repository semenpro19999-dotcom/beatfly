import * as THREE from 'three';

export class RealisticDrosophilaModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    this.wingSpeed = 85.0;
    this.wingAngle = 0;
    this.flutterAmplitude = 0.55;

    // Saber target positions
    this.leftSaberTarget = new THREE.Vector3(-0.6, 0.45, 0.6);
    this.rightSaberTarget = new THREE.Vector3(0.6, 0.45, 0.6);

    this.leftSaberPos = new THREE.Vector3(-0.6, 0.45, 0.6);
    this.rightSaberPos = new THREE.Vector3(0.6, 0.45, 0.6);

    this.leftSwingTimer = 0;
    this.rightSwingTimer = 0;
    this.swingDuration = 0.16;

    // Emotional / physical feedback states
    this.painFlinchTimer = 0;
    this.dopamineGlowTimer = 0;

    this.buildAnatomy();
    this.scene.add(this.group);

    // Initial position in front of camera
    this.group.position.set(0, 1.0, 0);
  }

  buildAnatomy() {
    this.bodyRoot = new THREE.Group();
    this.group.add(this.bodyRoot);

    // Realistic Drosophila materials
    const chitinDarkMat = new THREE.MeshStandardMaterial({
      color: 0x24170d,
      roughness: 0.35,
      metalness: 0.65
    });

    const chitinAmberMat = new THREE.MeshStandardMaterial({
      color: 0x8a5b28,
      roughness: 0.45,
      metalness: 0.35
    });

    const bristleMat = new THREE.MeshBasicMaterial({ color: 0x110c08 });

    // 1. Thorax (Scutum + Scutellum)
    const thoraxGeo = new THREE.SphereGeometry(0.42, 24, 24);
    thoraxGeo.scale(0.85, 0.8, 1.35);
    this.thorax = new THREE.Mesh(thoraxGeo, chitinDarkMat);
    this.thorax.position.set(0, 0, 0);
    this.thorax.castShadow = true;
    this.bodyRoot.add(this.thorax);

    // Scutellum (characteristic posterior shield plate)
    const scutGeo = new THREE.ConeGeometry(0.22, 0.3, 16);
    scutGeo.scale(1.2, 0.6, 1.0);
    scutGeo.rotateX(Math.PI / 2 + 0.3);
    const scutellum = new THREE.Mesh(scutGeo, chitinAmberMat);
    scutellum.position.set(0, 0.12, -0.45);
    this.bodyRoot.add(scutellum);

    // Thoracic Macrochaetae (stiff sensory bristles)
    const bristlePositions = [
      [-0.2, 0.28, 0.1], [0.2, 0.28, 0.1],
      [-0.18, 0.3, -0.15], [0.18, 0.3, -0.15],
      [-0.12, 0.24, -0.5], [0.12, 0.24, -0.5]
    ];
    for (const [bx, by, bz] of bristlePositions) {
      const bGeo = new THREE.CylinderGeometry(0.006, 0.002, 0.22, 4);
      bGeo.translate(0, 0.11, 0);
      const bristle = new THREE.Mesh(bGeo, bristleMat);
      bristle.position.set(bx, by, bz);
      bristle.rotation.set(0.35, 0, (bx > 0 ? 0.2 : -0.2));
      this.bodyRoot.add(bristle);
    }

    // 2. Abdomen (Segmented Drosophila pattern with dark bands)
    this.buildAbdomen(chitinAmberMat);

    // 3. Head & Compound Eyes & Proboscis
    this.buildHead(chitinDarkMat, bristleMat);

    // 4. Halteres (Balancing drumsticks under the wings)
    this.buildHalteres();

    // 5. Authentic Drosophila Wings (with vein texture)
    this.buildWings();

    // 6. Six Articulated Legs (Front 2 holding sabers)
    this.buildLegs(chitinDarkMat);

    // 7. Beat Saber Lightsabers (Authentic Red Left / Blue Right)
    this.leftSaber = this.createLightsaber(0xff0044, 0xff2266, 'red');
    this.rightSaber = this.createLightsaber(0x0088ff, 0x00d4ff, 'blue');

    this.group.add(this.leftSaber);
    this.group.add(this.rightSaber);
  }

  buildAbdomen(amberMat) {
    this.abdomenGroup = new THREE.Group();
    this.abdomenGroup.position.set(0, -0.05, -0.55);
    this.abdomenGroup.rotation.x = -0.2;
    this.bodyRoot.add(this.abdomenGroup);

    // 5 tergite segments tapering to rear
    const segmentCount = 6;
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x181008,
      roughness: 0.4
    });

    for (let i = 0; i < segmentCount; i++) {
      const radius = 0.32 * Math.cos((i / segmentCount) * 1.1);
      const segGeo = new THREE.CylinderGeometry(radius * 0.95, radius, 0.22, 20);
      segGeo.rotateX(Math.PI / 2);
      const isTip = i >= 4;
      const segMesh = new THREE.Mesh(segGeo, isTip ? stripeMat : amberMat);
      segMesh.position.set(0, -i * 0.04, -i * 0.2);
      this.abdomenGroup.add(segMesh);

      // Dark posterior stripe on each segment
      if (!isTip) {
        const stripeGeo = new THREE.TorusGeometry(radius * 0.98, 0.025, 8, 20);
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, -i * 0.04, -i * 0.2 - 0.07);
        this.abdomenGroup.add(stripe);
      }
    }
  }

  buildHead(darkMat, bristleMat) {
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.06, 0.52);
    this.bodyRoot.add(this.headGroup);

    // Head capsule
    const headCapsuleGeo = new THREE.SphereGeometry(0.26, 20, 20);
    headCapsuleGeo.scale(1.05, 0.95, 0.85);
    this.headCapsule = new THREE.Mesh(headCapsuleGeo, darkMat);
    this.headGroup.add(this.headCapsule);

    // Ruby Red Faceted Compound Eyes
    const eyeCanvas = document.createElement('canvas');
    eyeCanvas.width = 128;
    eyeCanvas.height = 128;
    const ctx = eyeCanvas.getContext('2d');
    ctx.fillStyle = '#b50e29';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#6e0012';
    ctx.lineWidth = 1.5;
    // Hexagonal ommatidia pattern
    for (let y = 0; y < 128; y += 8) {
      for (let x = 0; x < 128; x += 12) {
        const ox = (y % 16 === 0) ? 6 : 0;
        ctx.strokeRect(x + ox, y, 8, 8);
      }
    }
    const eyeTexture = new THREE.CanvasTexture(eyeCanvas);

    this.eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xdd1133,
      emissive: 0x440011,
      emissiveIntensity: 0.4,
      map: eyeTexture,
      roughness: 0.15,
      metalness: 0.35
    });

    const eyeGeo = new THREE.SphereGeometry(0.19, 20, 20);
    eyeGeo.scale(0.85, 1.3, 1.05);

    this.leftEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    this.leftEye.position.set(-0.21, 0.05, 0.05);
    this.leftEye.rotation.set(0.1, -0.35, 0.25);
    this.headGroup.add(this.leftEye);

    this.rightEye = new THREE.Mesh(eyeGeo, this.eyeMaterial.clone());
    this.rightEye.position.set(0.21, 0.05, 0.05);
    this.rightEye.rotation.set(0.1, 0.35, -0.25);
    this.headGroup.add(this.rightEye);

    // Antennae & Feathery Aristae
    for (const sign of [-1, 1]) {
      const antRoot = new THREE.Group();
      antRoot.position.set(sign * 0.08, 0.12, 0.22);
      antRoot.rotation.set(0.4, 0, sign * 0.2);

      // Antenna scape & pedicel
      const antSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.015, 0.1, 8), darkMat);
      antSeg.position.set(0, 0.05, 0);
      antRoot.add(antSeg);

      // Feathered arista stem
      const aristaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.002, 0.25, 4), bristleMat);
      aristaStem.position.set(0, 0.18, 0.06);
      aristaStem.rotation.x = 0.5;
      antRoot.add(aristaStem);

      // Feathery hairs on arista
      for (let h = 0; h < 5; h++) {
        const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.001, 0.08, 4), bristleMat);
        hair.position.set(sign * 0.02, 0.12 + h * 0.03, 0.06 + h * 0.02);
        hair.rotation.z = sign * 0.8;
        antRoot.add(hair);
      }

      this.headGroup.add(antRoot);
    }

    // Proboscis (Mouthparts)
    const probRoot = new THREE.Group();
    probRoot.position.set(0, -0.15, 0.1);
    probRoot.rotation.x = 0.6;
    const rostrum = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.18, 10), darkMat);
    probRoot.add(rostrum);
    const labellum = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), darkMat);
    labellum.position.y = -0.1;
    labellum.scale.set(1.4, 0.8, 1.0);
    probRoot.add(labellum);
    this.headGroup.add(probRoot);
  }

  buildHalteres() {
    const haltereMat = new THREE.MeshStandardMaterial({ color: 0xeeddbb, roughness: 0.3 });
    for (const sign of [-1, 1]) {
      const haltere = new THREE.Group();
      haltere.position.set(sign * 0.22, 0.05, -0.32);

      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.16, 6), haltereMat);
      stalk.rotation.z = sign * 1.1;
      haltere.add(stalk);

      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), haltereMat);
      knob.position.set(sign * 0.12, 0.04, 0);
      haltere.add(knob);

      this.bodyRoot.add(haltere);
    }
  }

  buildWings() {
    // Generate realistic Drosophila wing venation texture on canvas
    const wingCanvas = document.createElement('canvas');
    wingCanvas.width = 512;
    wingCanvas.height = 1024;
    const wctx = wingCanvas.getContext('2d');

    // Translucent glass wing membrane
    wctx.fillStyle = 'rgba(230, 245, 255, 0.12)';
    wctx.fillRect(0, 0, 512, 1024);

    // Draw veins
    wctx.strokeStyle = 'rgba(70, 50, 35, 0.85)';
    wctx.lineWidth = 6;
    wctx.lineCap = 'round';

    // Costa (leading edge)
    wctx.beginPath();
    wctx.moveTo(256, 950);
    wctx.quadraticCurveTo(80, 600, 100, 250);
    wctx.quadraticCurveTo(130, 80, 256, 50);
    wctx.stroke();

    // R1, R2+3, R4+5, M1 veins
    wctx.lineWidth = 3.5;
    const veins = [
      [[256, 950], [180, 500], [160, 200]],
      [[256, 950], [220, 500], [256, 120]],
      [[256, 950], [290, 550], [360, 250]],
      [[256, 950], [350, 650], [420, 450]]
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
    wingShape.quadraticCurveTo(0.35, 0.6, 0.42, 1.35);
    wingShape.quadraticCurveTo(0.25, 1.65, 0.0, 1.7);
    wingShape.quadraticCurveTo(-0.25, 1.6, -0.28, 1.25);
    wingShape.quadraticCurveTo(-0.2, 0.55, 0, 0);

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    const wingMat = new THREE.MeshPhysicalMaterial({
      color: 0xf0f6ff,
      map: wingTexture,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.05,
      transmission: 0.6,
      ior: 1.45,
      side: THREE.DoubleSide
    });

    this.leftWingHinge = new THREE.Group();
    this.leftWingHinge.position.set(-0.18, 0.28, -0.05);
    this.leftWingMesh = new THREE.Mesh(wingGeo, wingMat);
    this.leftWingMesh.rotation.x = -Math.PI / 2 + 0.25;
    this.leftWingMesh.rotation.z = 0.45;
    this.leftWingHinge.add(this.leftWingMesh);
    this.bodyRoot.add(this.leftWingHinge);

    this.rightWingHinge = new THREE.Group();
    this.rightWingHinge.position.set(0.18, 0.28, -0.05);
    this.rightWingMesh = new THREE.Mesh(wingGeo, wingMat);
    this.rightWingMesh.rotation.x = -Math.PI / 2 + 0.25;
    this.rightWingMesh.rotation.z = -0.45;
    this.rightWingHinge.add(this.rightWingMesh);
    this.bodyRoot.add(this.rightWingHinge);
  }

  buildLegs(legMat) {
    // Front legs (holding sabers)
    this.frontLegs = [];
    for (const sign of [-1, 1]) {
      const legRoot = new THREE.Group();
      legRoot.position.set(sign * 0.2, -0.15, 0.22);

      // Coxa & Femur
      const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, 0.38, 8), legMat);
      femur.position.set(sign * 0.12, 0.1, 0.12);
      femur.rotation.set(-0.6, 0, -sign * 0.6);
      legRoot.add(femur);

      // Tibia reaching forward to saber hilt
      const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 0.42, 8), legMat);
      tibia.position.set(sign * 0.22, 0.18, 0.32);
      tibia.rotation.set(0.8, 0, sign * 0.3);
      legRoot.add(tibia);

      this.bodyRoot.add(legRoot);
      this.frontLegs.push(legRoot);
    }

    // Middle & Hind legs (tucked in flight)
    const legConfigs = [
      { z: 0.0, angleZ: 0.9, rotX: -0.3 },   // Mid leg
      { z: -0.25, angleZ: 1.1, rotX: -0.7 }  // Hind leg
    ];
    for (const cfg of legConfigs) {
      for (const sign of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(sign * 0.22, -0.15, cfg.z);

        const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.014, 0.45, 6), legMat);
        femur.position.set(sign * 0.18, -0.12, -0.12);
        femur.rotation.set(cfg.rotX, 0, sign * cfg.angleZ);
        leg.add(femur);

        const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.008, 0.48, 6), legMat);
        tibia.position.set(sign * 0.3, -0.25, -0.32);
        tibia.rotation.set(cfg.rotX - 0.4, 0, sign * 0.4);
        leg.add(tibia);

        this.bodyRoot.add(leg);
      }
    }
  }

  createLightsaber(bladeColorHex, coreColorHex, name) {
    const saber = new THREE.Group();
    saber.name = name;

    // Textured Hilt
    const hiltGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.38, 16);
    const hiltMat = new THREE.MeshStandardMaterial({
      color: 0x18181c,
      roughness: 0.25,
      metalness: 0.85
    });
    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
    hilt.position.y = -0.18;
    saber.add(hilt);

    // Chrome emitter rings
    for (let r = 0; r < 3; r++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.052, 0.008, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.95, roughness: 0.1 })
      );
      ring.position.y = -0.28 + r * 0.08;
      saber.add(ring);
    }

    // Glowing Emitter guard
    const guard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.052, 0.06, 16),
      new THREE.MeshBasicMaterial({ color: bladeColorHex })
    );
    guard.position.y = 0.02;
    saber.add(guard);

    // Outer plasma blade (cylinder)
    const bladeGeo = new THREE.CylinderGeometry(0.042, 0.042, 1.45, 16);
    bladeGeo.translate(0, 0.72, 0);
    const bladeMat = new THREE.MeshBasicMaterial({
      color: bladeColorHex,
      transparent: true,
      opacity: 0.88
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    saber.add(blade);

    // Inner pure bright beam
    const coreGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.42, 12);
    coreGeo.translate(0, 0.72, 0);
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    saber.add(core);

    // Point light on blade
    const light = new THREE.PointLight(bladeColorHex, 1.5, 3.8);
    light.position.set(0, 0.8, 0);
    saber.add(light);

    saber.userData = {
      color: name,
      tipPos: new THREE.Vector3(),
      basePos: new THREE.Vector3()
    };

    return saber;
  }

  // Trigger saber swing
  swing(saberColor, direction = 'down') {
    if (saberColor === 'red') {
      this.leftSwingTimer = this.swingDuration;
      this.leftSwingDir = direction;
    } else {
      this.rightSwingTimer = this.swingDuration;
      this.rightSwingDir = direction;
    }
  }

  // Visual dopamine surge reaction
  triggerDopamineReaction() {
    this.dopamineGlowTimer = 0.35;
    this.flutterAmplitude = 0.85; // Wings flutter faster with joy
    this.wingSpeed = 110.0;
  }

  // Visual pain "бобо" flinch reaction
  triggerPainReaction() {
    this.painFlinchTimer = 0.3;
    this.flutterAmplitude = 0.25; // Shock pause
  }

  update(delta, time) {
    // 1. Insect wing flutter (200Hz realism)
    this.wingAngle += delta * this.wingSpeed;
    const flap = Math.sin(this.wingAngle) * this.flutterAmplitude;
    if (this.leftWingHinge && this.rightWingHinge) {
      this.leftWingHinge.rotation.x = flap;
      this.rightWingHinge.rotation.x = -flap;
    }

    // 2. Flinch / Shake from "Бобо" (Nociceptive escape spasm)
    if (this.painFlinchTimer > 0) {
      this.painFlinchTimer -= delta;
      const shake = (Math.random() - 0.5) * 0.18;
      this.bodyRoot.position.set(shake, shake * 0.7, 0);
      this.eyeMaterial.emissive.setHex(0x220000);
    } else {
      // Natural organic hovering
      const hoverY = Math.sin(time * 3.8) * 0.05;
      const hoverRoll = Math.sin(time * 2.4) * 0.03;
      this.bodyRoot.position.set(0, hoverY, 0);
      this.bodyRoot.rotation.z = hoverRoll;

      // Dopamine eye glow
      if (this.dopamineGlowTimer > 0) {
        this.dopamineGlowTimer -= delta;
        this.eyeMaterial.emissive.setHex(0xff3300);
        this.eyeMaterial.emissiveIntensity = 0.9;
      } else {
        this.eyeMaterial.emissive.setHex(0x440011);
        this.eyeMaterial.emissiveIntensity = 0.4;
      }
    }

    // 3. Left Saber Swing (Red)
    if (this.leftSwingTimer > 0) {
      this.leftSwingTimer -= delta;
      const p = 1.0 - (this.leftSwingTimer / this.swingDuration);
      const angle = Math.sin(p * Math.PI) * 1.8;
      this.leftSaber.rotation.x = -0.4 - angle;
      this.leftSaber.rotation.z = 0.2 + (this.leftSwingDir === 'left' ? -0.6 : 0.4);
    } else {
      this.leftSaber.rotation.x = THREE.MathUtils.lerp(this.leftSaber.rotation.x, -0.3, delta * 15);
      this.leftSaber.rotation.z = THREE.MathUtils.lerp(this.leftSaber.rotation.z, 0.15, delta * 15);
    }
    this.leftSaber.position.lerp(this.leftSaberTarget, delta * 22);

    // 4. Right Saber Swing (Blue)
    if (this.rightSwingTimer > 0) {
      this.rightSwingTimer -= delta;
      const p = 1.0 - (this.rightSwingTimer / this.swingDuration);
      const angle = Math.sin(p * Math.PI) * 1.8;
      this.rightSaber.rotation.x = -0.4 - angle;
      this.rightSaber.rotation.z = -0.2 + (this.rightSwingDir === 'right' ? 0.6 : -0.4);
    } else {
      this.rightSaber.rotation.x = THREE.MathUtils.lerp(this.rightSaber.rotation.x, -0.3, delta * 15);
      this.rightSaber.rotation.z = THREE.MathUtils.lerp(this.rightSaber.rotation.z, -0.15, delta * 15);
    }
    this.rightSaber.position.lerp(this.rightSaberTarget, delta * 22);

    // Restore normal wing flutter
    this.flutterAmplitude = THREE.MathUtils.lerp(this.flutterAmplitude, 0.55, delta * 3);
    this.wingSpeed = THREE.MathUtils.lerp(this.wingSpeed, 85.0, delta * 3);

    // Update tip & base world positions for exact blade hit collisions
    this.updateSaberPositions(this.leftSaber);
    this.updateSaberPositions(this.rightSaber);
  }

  updateSaberPositions(saber) {
    const base = new THREE.Vector3(0, 0, 0);
    const tip = new THREE.Vector3(0, 1.45, 0);
    saber.localToWorld(base);
    saber.localToWorld(tip);
    saber.userData.basePos.copy(base);
    saber.userData.tipPos.copy(tip);
  }
}
