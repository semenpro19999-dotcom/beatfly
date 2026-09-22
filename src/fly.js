import * as THREE from 'three';

export class FlyCharacter {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    this.leftSaberTarget = new THREE.Vector3(-0.7, 0.4, 0.5);
    this.rightSaberTarget = new THREE.Vector3(0.7, 0.4, 0.5);

    this.leftSaberPos = new THREE.Vector3(-0.7, 0.4, 0.5);
    this.rightSaberPos = new THREE.Vector3(0.7, 0.4, 0.5);

    this.leftSaberRot = new THREE.Euler(0, 0, 0);
    this.rightSaberRot = new THREE.Euler(0, 0, 0);

    this.leftSwingTimer = 0;
    this.rightSwingTimer = 0;
    this.swingDuration = 0.18;

    this.wingFlapSpeed = 65; // High-speed flutter
    this.wingAngle = 0;
    this.flutterIntensity = 1.0;

    this.createModel();
    this.scene.add(this.group);
  }

  createModel() {
    // Fly body root
    this.bodyRoot = new THREE.Group();
    this.group.add(this.bodyRoot);

    // 1. Thorax (Chitin, dark iridescent bronze/grey)
    const thoraxGeo = new THREE.SphereGeometry(0.38, 16, 16);
    thoraxGeo.scale(0.9, 0.85, 1.3);
    const thoraxMat = new THREE.MeshStandardMaterial({
      color: 0x3d3024,
      roughness: 0.35,
      metalness: 0.65
    });
    this.thorax = new THREE.Mesh(thoraxGeo, thoraxMat);
    this.thorax.position.set(0, 0, 0);
    this.thorax.castShadow = true;
    this.bodyRoot.add(this.thorax);

    // 2. Abdomen (Segmented Drosophila abdomen, striped)
    const abdoGeo = new THREE.SphereGeometry(0.34, 16, 16);
    abdoGeo.scale(0.8, 0.75, 1.6);
    const abdoMat = new THREE.MeshStandardMaterial({
      color: 0x6e522a,
      roughness: 0.5,
      metalness: 0.2
    });
    this.abdomen = new THREE.Mesh(abdoGeo, abdoMat);
    this.abdomen.position.set(0, -0.05, -0.7);
    this.abdomen.rotation.x = -0.15;
    this.bodyRoot.add(this.abdomen);

    // Abdomen stripes (Drosophila dark tergites)
    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.TorusGeometry(0.24 - i * 0.03, 0.025, 8, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x1b1308 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, -0.05 - i * 0.04, -0.5 - i * 0.2);
      this.bodyRoot.add(ring);
    }

    // 3. Head
    const headGeo = new THREE.SphereGeometry(0.26, 16, 16);
    headGeo.scale(1.1, 0.95, 0.9);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x2a1c12,
      roughness: 0.4,
      metalness: 0.4
    });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.set(0, 0.05, 0.45);
    this.bodyRoot.add(this.head);

    // 4. Iconic Drosophila Compound Eyes (Bright Ruby Red!)
    const eyeGeo = new THREE.SphereGeometry(0.18, 16, 16);
    eyeGeo.scale(0.85, 1.25, 0.95);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xdd1122,
      emissive: 0x550011,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.3
    });

    this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.leftEye.position.set(-0.2, 0.08, 0.48);
    this.leftEye.rotation.set(0.1, -0.3, 0.2);
    this.bodyRoot.add(this.leftEye);

    this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.rightEye.position.set(0.2, 0.08, 0.48);
    this.rightEye.rotation.set(0.1, 0.3, -0.2);
    this.bodyRoot.add(this.rightEye);

    // Antennae
    const antMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    for (const sign of [-1, 1]) {
      const antGeo = new THREE.CylinderGeometry(0.015, 0.01, 0.2, 6);
      const ant = new THREE.Mesh(antGeo, antMat);
      ant.position.set(sign * 0.07, 0.2, 0.6);
      ant.rotation.set(0.5, 0, sign * 0.3);
      this.bodyRoot.add(ant);
    }

    // 5. Translucent Fluttering Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(0.25, 0.5, 0.35, 1.1);
    wingShape.quadraticCurveTo(0.2, 1.35, 0.0, 1.4);
    wingShape.quadraticCurveTo(-0.15, 1.35, -0.2, 1.0);
    wingShape.quadraticCurveTo(-0.15, 0.5, 0, 0);

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xddf0ff,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.leftWingRoot = new THREE.Group();
    this.leftWingRoot.position.set(-0.16, 0.24, -0.1);
    this.leftWing = new THREE.Mesh(wingGeo, wingMat);
    this.leftWing.rotation.x = -Math.PI / 2 + 0.3;
    this.leftWing.rotation.z = 0.5;
    this.leftWingRoot.add(this.leftWing);
    this.bodyRoot.add(this.leftWingRoot);

    this.rightWingRoot = new THREE.Group();
    this.rightWingRoot.position.set(0.16, 0.24, -0.1);
    this.rightWing = new THREE.Mesh(wingGeo, wingMat);
    this.rightWing.rotation.x = -Math.PI / 2 + 0.3;
    this.rightWing.rotation.z = -0.5;
    this.rightWingRoot.add(this.rightWing);
    this.bodyRoot.add(this.rightWingRoot);

    // 6. Dual Beat Sabers (Cyan Left / Red Right)
    this.leftSaber = this.createSaber(0x00f5ff, 0x00a2ff, 'cyan');
    this.rightSaber = this.createSaber(0xff0055, 0xff3300, 'red');

    this.group.add(this.leftSaber);
    this.group.add(this.rightSaber);

    // Fly legs holding the sabers
    this.createLegs();

    // Position fly comfortably in view
    this.group.position.set(0, 1.1, -1.0);
  }

  createSaber(bladeColorHex, coreColorHex, name) {
    const saber = new THREE.Group();
    saber.name = name;

    // Hilt / Handle
    const hiltGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.35, 12);
    const hiltMat = new THREE.MeshStandardMaterial({
      color: 0x222226,
      roughness: 0.3,
      metalness: 0.8
    });
    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
    hilt.position.y = -0.15;
    saber.add(hilt);

    // Emitter guard ring
    const guardGeo = new THREE.CylinderGeometry(0.065, 0.05, 0.05, 12);
    const guardMat = new THREE.MeshBasicMaterial({ color: bladeColorHex });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = 0.02;
    saber.add(guard);

    // Outer neon glow blade
    const bladeGeo = new THREE.CylinderGeometry(0.038, 0.038, 1.3, 16);
    bladeGeo.translate(0, 0.65, 0);
    const bladeMat = new THREE.MeshBasicMaterial({
      color: bladeColorHex,
      transparent: true,
      opacity: 0.85
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    saber.add(blade);

    // Core bright white beam
    const coreGeo = new THREE.CylinderGeometry(0.016, 0.016, 1.28, 12);
    coreGeo.translate(0, 0.65, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    saber.add(core);

    // Point light on blade for neon reflections
    const bladeLight = new THREE.PointLight(bladeColorHex, 1.2, 3.5);
    bladeLight.position.set(0, 0.7, 0);
    saber.add(bladeLight);

    // Blade tip reference vector for hit testing
    saber.userData = {
      bladeLength: 1.3,
      color: name,
      tipPos: new THREE.Vector3(),
      basePos: new THREE.Vector3()
    };

    return saber;
  }

  createLegs() {
    // 4 walking legs tucked in flight mode
    const legMat = new THREE.MeshStandardMaterial({ color: 0x251a14, roughness: 0.6 });
    for (let side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.2, -0.1, -0.1 + i * 0.2);

        const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.35), legMat);
        femur.position.set(side * 0.15, -0.1, 0);
        femur.rotation.z = side * 0.6;
        leg.add(femur);

        this.bodyRoot.add(leg);
      }
    }
  }

  // Trigger saber swing animation
  triggerSwing(side, direction = 'down') {
    if (side === 'left') {
      this.leftSwingTimer = this.swingDuration;
      this.leftSwingDir = direction;
    } else {
      this.rightSwingTimer = this.swingDuration;
      this.rightSwingDir = direction;
    }
  }

  update(delta, time) {
    // 1. High frequency wing flutter (200Hz insect realism)
    this.wingAngle += delta * this.wingFlapSpeed;
    const flap = Math.sin(this.wingAngle) * (0.65 * this.flutterIntensity);
    if (this.leftWingRoot && this.rightWingRoot) {
      this.leftWingRoot.rotation.x = flap;
      this.rightWingRoot.rotation.x = -flap;
    }

    // 2. Fly subtle organic hover bobbing
    const hoverY = Math.sin(time * 3.5) * 0.06;
    const hoverRoll = Math.sin(time * 2.2) * 0.04;
    this.bodyRoot.position.y = hoverY;
    this.bodyRoot.rotation.z = hoverRoll;

    // 3. Update Left Saber (Cyan)
    if (this.leftSwingTimer > 0) {
      this.leftSwingTimer -= delta;
      const progress = 1 - (this.leftSwingTimer / this.swingDuration);
      const slashAngle = Math.sin(progress * Math.PI) * 1.6;
      this.leftSaber.rotation.x = -0.4 - slashAngle;
      this.leftSaber.rotation.z = 0.2 + (this.leftSwingDir === 'left' ? -0.5 : 0.4);
    } else {
      this.leftSaber.rotation.x = THREE.MathUtils.lerp(this.leftSaber.rotation.x, -0.3, delta * 12);
      this.leftSaber.rotation.z = THREE.MathUtils.lerp(this.leftSaber.rotation.z, 0.1, delta * 12);
    }
    this.leftSaber.position.lerp(this.leftSaberTarget, delta * 20);

    // 4. Update Right Saber (Red)
    if (this.rightSwingTimer > 0) {
      this.rightSwingTimer -= delta;
      const progress = 1 - (this.rightSwingTimer / this.swingDuration);
      const slashAngle = Math.sin(progress * Math.PI) * 1.6;
      this.rightSaber.rotation.x = -0.4 - slashAngle;
      this.rightSaber.rotation.z = -0.2 + (this.rightSwingDir === 'right' ? 0.5 : -0.4);
    } else {
      this.rightSaber.rotation.x = THREE.MathUtils.lerp(this.rightSaber.rotation.x, -0.3, delta * 12);
      this.rightSaber.rotation.z = THREE.MathUtils.lerp(this.rightSaber.rotation.z, -0.1, delta * 12);
    }
    this.rightSaber.position.lerp(this.rightSaberTarget, delta * 20);

    // Compute tip and base world coordinates for hit detection
    this.updateSaberWorldPoints(this.leftSaber);
    this.updateSaberWorldPoints(this.rightSaber);
  }

  updateSaberWorldPoints(saber) {
    const baseLocal = new THREE.Vector3(0, 0, 0);
    const tipLocal = new THREE.Vector3(0, 1.3, 0);
    saber.localToWorld(baseLocal);
    saber.localToWorld(tipLocal);
    saber.userData.basePos.copy(baseLocal);
    saber.userData.tipPos.copy(tipLocal);
  }
}
