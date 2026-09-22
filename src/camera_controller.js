import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraFlightManager {
  constructor(camera, domElement, flyModel) {
    this.camera = camera;
    this.domElement = domElement;
    this.fly = flyModel;

    this.mode = 'orbit'; // 'orbit', 'follow', 'cockpit'

    // Initialize OrbitControls
    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = 25;
    this.controls.minDistance = 0.8;
    this.controls.target.set(0, 1.0, 0); // Focus on fly

    // Keyboard state for WASD camera flight
    this.keys = {
      KeyW: false,
      KeyS: false,
      KeyA: false,
      KeyD: false,
      KeyQ: false,
      KeyE: false,
      ShiftLeft: false
    };

    this.flySpeed = 10.0;
    this.setupKeyboard();

    // Default position
    this.camera.position.set(0, 2.2, 4.2);
    this.controls.update();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (this.keys[e.code] !== undefined) {
        this.keys[e.code] = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys[e.code] !== undefined) {
        this.keys[e.code] = false;
      }
    });
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'orbit') {
      this.controls.enabled = true;
      this.camera.position.set(0, 2.2, 4.2);
      this.controls.target.set(0, 1.0, 0);
    } else if (mode === 'cockpit') {
      this.controls.enabled = false;
      this.camera.position.set(0, 1.1, 0.55);
      this.camera.lookAt(0, 1.1, -20);
    } else if (mode === 'side') {
      this.controls.enabled = true;
      this.camera.position.set(3.5, 1.8, 1.5);
      this.controls.target.set(0, 1.0, 0);
    }
  }

  update(delta) {
    if (this.mode === 'cockpit') {
      // First person view from inside fly head
      this.camera.position.set(0, 1.1 + Math.sin(Date.now() * 0.003) * 0.03, 0.55);
      this.camera.lookAt(0, 1.1, -30);
      return;
    }

    // WASD Free Camera flight movement
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveVector = new THREE.Vector3();
    const speed = (this.keys.ShiftLeft ? this.flySpeed * 2 : this.flySpeed) * delta;

    if (this.keys.KeyW) moveVector.addScaledVector(forward, speed);
    if (this.keys.KeyS) moveVector.addScaledVector(forward, -speed);
    if (this.keys.KeyD) moveVector.addScaledVector(right, speed);
    if (this.keys.KeyA) moveVector.addScaledVector(right, -speed);
    if (this.keys.KeyE) moveVector.y += speed;
    if (this.keys.KeyQ) moveVector.y -= speed;

    if (moveVector.lengthSq() > 0) {
      this.camera.position.add(moveVector);
      this.controls.target.add(moveVector);
    }

    if (this.controls.enabled) {
      this.controls.update();
    }
  }
}
