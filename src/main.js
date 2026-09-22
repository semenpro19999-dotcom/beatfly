import * as THREE from 'three';
import { audioManager } from './audio.js';
import { connectomeDB } from './connectome.js';
import { RealisticDrosophilaModel } from './fly_model.js';
import { DrosophilaNeuroAgent } from './neuro_agent.js';
import { BeatSaberEngine } from './beat_saber_game.js';
import { CameraFlightManager } from './camera_controller.js';
import { HUDManager } from './hud.js';
import { BrainVisualizer } from './brain_visualizer.js';

// Setup Three.js Scene
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06080e, 0.016);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 150);
camera.position.set(0, 2.0, 4.0);
scene.userData.camera = camera;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05; // Balanced, gentle on the eyes
container.appendChild(renderer.domElement);

// Lighting: Cinematic, subtle, no blinding glare
const ambientLight = new THREE.AmbientLight(0x1e2638, 1.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xf1f5f9, 1.3);
dirLight.position.set(3, 8, 5);
scene.add(dirLight);

// Subtle Red & Blue Beat Saber Accent Lights
const redLight = new THREE.PointLight(0xe51c44, 1.4, 16, 2);
redLight.position.set(-2.5, 2.2, 0);
scene.add(redLight);

const blueLight = new THREE.PointLight(0x1573fe, 1.4, 16, 2);
blueLight.position.set(2.5, 2.2, 0);
scene.add(blueLight);

// Initialize Components
const fly = new RealisticDrosophilaModel(scene);
const agent = new DrosophilaNeuroAgent(fly);
const game = new BeatSaberEngine(scene, fly, agent);
const cameraFlight = new CameraFlightManager(camera, renderer.domElement, fly);
const hud = new HUDManager(document.getElementById('hud-root'));
const brainVis = new BrainVisualizer(document.getElementById('hud-root'));

// Connect agent events to HUD & Brain Visualizer
agent.onBrainEvent = (data) => {
  hud.update(data);
  if (data.type === 'dopamine') {
    brainVis.triggerDopamineSpike();
  } else if (data.type === 'pain') {
    brainVis.triggerPainSpike();
  }
};

game.onStateChange = (data) => {
  hud.update(data);
  if (data.event === 'hit') {
    brainVis.triggerDopamineSpike();
  } else if (data.event === 'miss') {
    brainVis.triggerPainSpike();
  }
};

game.onVisualStimulus = (lane, color) => {
  brainVis.triggerOpticInput(lane, color);
};

audioManager.onBeatCallback = (event) => game.onProceduralBeat(event);

// Direct loading of neurons.csv
connectomeDB.onLoadedCallback = (stats) => {
  console.log(`[Connectome] База данных ${stats.total.toLocaleString()} нейронов подключена к мозгу мухи!`);
  const statusEl = document.getElementById('fly-status');
  if (statusEl) {
    statusEl.innerHTML = `<span style="color:#38bdf8">🧠 База neurons.csv (${stats.total.toLocaleString()} нейронов) активна</span>`;
  }
};
connectomeDB.load('/neurons.csv');

// HUD Event Handlers
hud.onUploadAudio = async (file) => {
  hud.showToast(`🎵 Анализ трека ${file.name}... Создаем карту кубиков!`);
  try {
    const res = await game.loadCustomAudioFile(file);
    hud.showToast(`✨ Готово! Сгенерировано ${res.beatmap.length} кубиков под музыку! Муха начинает играть!`);
    isPlaying = true;
    btnPlay.textContent = '⏸ ПАУЗА';
    btnPlay.classList.remove('btn-primary');
  } catch (err) {
    console.error('Ошибка анализа аудио:', err);
    hud.showToast(`❌ Ошибка загрузки аудио: ${err.message}`);
  }
};

hud.onResetBrain = () => {
  agent.resetBrain();
  hud.update({
    accuracy: 0,
    epsilon: agent.epsilon,
    dopamine: agent.dopamineLevel,
    pain: agent.painLevel
  });
};

hud.onCameraChange = (mode) => {
  cameraFlight.setMode(mode);
};

hud.onToggleBrain = () => {
  brainVis.toggle();
};

// Play / Pause Button
let isPlaying = false;
const btnPlay = document.getElementById('btn-play');
btnPlay.addEventListener('click', () => {
  if (!isPlaying) {
    if (game.customAudioBuffer && !game.isCustomTrackPlaying) {
      game.startCustomTrack();
    } else {
      audioManager.start(0);
    }
    isPlaying = true;
    btnPlay.textContent = '⏸ ПАУЗА';
    btnPlay.classList.remove('btn-primary');
  } else {
    game.stopAudio();
    isPlaying = false;
    btnPlay.textContent = '▶ СТАРТ';
    btnPlay.classList.add('btn-primary');
  }
});

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Auto-start on first click
window.addEventListener('click', () => {
  if (!isPlaying && !game.customAudioBuffer) {
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

  cameraFlight.update(delta);
  fly.update(delta, time);
  agent.update(delta);
  game.update(delta, time);
  brainVis.render(delta);

  renderer.render(scene, camera);
}

animate();
