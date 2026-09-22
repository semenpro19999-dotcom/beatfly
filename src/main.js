import * as THREE from 'three';
import { audioManager } from './audio.js';
import { connectomeDB } from './connectome.js';
import { FlyCharacter } from './fly.js';
import { GameManager } from './game.js';
import { HUDManager } from './hud.js';

// Setup Three.js
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x03050d, 0.022);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.9, 3.2);
camera.lookAt(0, 1.0, -10);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x223355, 1.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xddeeff, 1.5);
dirLight.position.set(0, 6, 4);
scene.add(dirLight);

// Neon Accent Lights
const cyanLight = new THREE.PointLight(0x00f5ff, 2.5, 15);
cyanLight.position.set(-2, 2, 0);
scene.add(cyanLight);

const redLight = new THREE.PointLight(0xff0055, 2.5, 15);
redLight.position.set(2, 2, 0);
scene.add(redLight);

// Initialize Components
const fly = new FlyCharacter(scene);
const game = new GameManager(scene, camera, fly);
const hud = new HUDManager(document.getElementById('hud-root'));

game.onHudUpdate = (data) => hud.update(data);
audioManager.onBeatCallback = (event) => game.onBeat(event);

// Direct loading of neurons.csv
connectomeDB.onLoadedCallback = (stats) => {
  console.log(`[Connectome] База данных ${stats.total} нейронов подключена к игре!`);
  const statusEl = document.getElementById('fly-status');
  if (statusEl) {
    statusEl.innerHTML = `<span style="color:#00ffaa">🧠 База neurons.csv (${stats.total.toLocaleString()} нейронов) активна!</span>`;
  }
};
connectomeDB.load('/neurons.csv');

// User Controls Setup
let isPlaying = false;
const btnPlay = document.getElementById('btn-play');
const btnAutoPlay = document.getElementById('btn-autoplay');
const btnCam = document.getElementById('btn-cam');
const selectTrack = document.getElementById('select-track');

btnPlay.addEventListener('click', () => {
  if (!isPlaying) {
    audioManager.start(parseInt(selectTrack.value));
    isPlaying = true;
    btnPlay.textContent = '⏸ ПАУЗА';
    btnPlay.classList.remove('btn-primary');
  } else {
    audioManager.stop();
    isPlaying = false;
    btnPlay.textContent = '▶ СТАРТ РИТМА';
    btnPlay.classList.add('btn-primary');
  }
});

btnAutoPlay.addEventListener('click', () => {
  game.autoPlay = !game.autoPlay;
  if (game.autoPlay) {
    btnAutoPlay.classList.add('active');
    btnAutoPlay.textContent = '🤖 МУХА УЧИТСЯ САМА: ВКЛ';
  } else {
    btnAutoPlay.classList.remove('active');
    btnAutoPlay.textContent = '🎮 РУЧНОЕ УПРАВЛЕНИЕ';
  }
});

const camModes = ['thirdPerson', 'firstPerson', 'action'];
const camLabels = ['📷 КАМЕРА: СЗАДИ', '👁 КАМЕРА: ГЛАЗА МУХИ', '🎬 КАМЕРА: ЭКШН'];
let camIdx = 0;

btnCam.addEventListener('click', () => {
  camIdx = (camIdx + 1) % camModes.length;
  game.setCameraMode(camModes[camIdx]);
  btnCam.textContent = camLabels[camIdx];
});

selectTrack.addEventListener('change', () => {
  if (isPlaying) {
    audioManager.stop();
    audioManager.start(parseInt(selectTrack.value));
  }
});

// Mouse Interaction
window.addEventListener('mousemove', (e) => {
  if (game.autoPlay) return;

  const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
  const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;

  // Steer sabers with mouse
  const targetX = ndcX * 1.8;
  const targetY = 0.5 + (ndcY + 0.5) * 1.2;

  fly.leftSaberTarget.set(targetX - 0.4, targetY, 0.5);
  fly.rightSaberTarget.set(targetX + 0.4, targetY, 0.5);
});

window.addEventListener('mousedown', (e) => {
  audioManager.init();
  if (game.autoPlay) return;

  if (e.button === 0) {
    // Left Click: swing left Cyan saber
    fly.triggerSwing('left', 'down');
    audioManager.playSaberSwing('cyan');
  } else if (e.button === 2) {
    // Right Click: swing right Red saber
    fly.triggerSwing('right', 'down');
    audioManager.playSaberSwing('red');
  }
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (game.autoPlay) return;
    fly.triggerSwing('right', 'down');
    audioManager.playSaberSwing('red');
  } else if (e.code === 'KeyA') {
    if (game.autoPlay) return;
    fly.triggerSwing('left', 'left');
    audioManager.playSaberSwing('cyan');
  } else if (e.code === 'KeyD') {
    if (game.autoPlay) return;
    fly.triggerSwing('right', 'right');
    audioManager.playSaberSwing('red');
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Auto-start audio on first click anywhere
window.addEventListener('click', () => {
  if (!isPlaying) {
    audioManager.start(0);
    isPlaying = true;
    btnPlay.textContent = '⏸ ПАУЗА';
    btnPlay.classList.remove('btn-primary');
  }
}, { once: true });

// Animation Loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  fly.update(delta, time);
  game.update(delta, time);

  renderer.render(scene, camera);
}

animate();
