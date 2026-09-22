// Advanced Beat & Onset Detection Engine for BeatFly
// Analyzes uploaded audio files or procedural audio and generates Beat Saber cube beatmaps

export class AudioBeatAnalyzer {
  constructor(audioContext) {
    this.ctx = audioContext;
  }

  // Analyze an uploaded audio File object (MP3, WAV, OGG, FLAC)
  async analyzeFile(file) {
    console.log(`[AudioAnalyzer] Загрузка и декодирование аудиофайла: ${file.name}...`);
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    console.log(`[AudioAnalyzer] Декодировано успешно: ${audioBuffer.duration.toFixed(1)} сек, ${audioBuffer.sampleRate} Гц`);

    const beatmap = this.generateBeatmapFromBuffer(audioBuffer);
    return {
      audioBuffer: audioBuffer,
      beatmap: beatmap,
      duration: audioBuffer.duration,
      name: file.name
    };
  }

  // Perform spectral flux and onset detection
  generateBeatmapFromBuffer(audioBuffer) {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0); // Left/Mono channel
    const totalSamples = channelData.length;

    // Window / Frame setup
    const frameSize = 1024;
    const hopSize = 512;
    const numFrames = Math.floor((totalSamples - frameSize) / hopSize);

    // Energy calculation per frame
    const energies = new Float32Array(numFrames);
    for (let i = 0; i < numFrames; i++) {
      let sum = 0;
      const offset = i * hopSize;
      for (let j = 0; j < frameSize; j += 4) {
        const val = channelData[offset + j];
        sum += val * val;
      }
      energies[i] = Math.sqrt(sum / (frameSize / 4));
    }

    // Dynamic threshold onset detection
    const windowSize = 16;
    const multiplier = 1.35;
    const onsets = [];
    let minTimeBetweenNotes = 0.28; // Minimum spacing between cubes (seconds)
    let lastOnsetTime = -999;

    for (let i = windowSize; i < numFrames - windowSize; i++) {
      let localSum = 0;
      for (let j = i - windowSize; j <= i + windowSize; j++) {
        localSum += energies[j];
      }
      const localAvg = localSum / (windowSize * 2 + 1);
      const time = (i * hopSize) / sampleRate;

      // Peak detection
      if (
        energies[i] > localAvg * multiplier &&
        energies[i] > energies[i - 1] &&
        energies[i] > energies[i + 1] &&
        energies[i] > 0.05
      ) {
        if (time - lastOnsetTime >= minTimeBetweenNotes) {
          onsets.push({
            time: time,
            intensity: Math.min(2.0, energies[i] / (localAvg + 0.001))
          });
          lastOnsetTime = time;
        }
      }
    }

    console.log(`[AudioAnalyzer] Найдено ${onsets.length} ритмических ударов в треке`);

    // Lanes: 0 (Far Left), 1 (Mid Left), 2 (Mid Right), 3 (Far Right)
    // Heights: 0 (Low: 0.8), 1 (High: 1.5)
    // Colors: 'red' (Left hand), 'blue' (Right hand)
    // Directions: 'down', 'up', 'left', 'right', 'any'
    const beatmap = [];
    const directions = ['down', 'down', 'down', 'left', 'right', 'up', 'any'];
    let lastColor = 'red';
    let lastLane = 1;

    for (let k = 0; k < onsets.length; k++) {
      const onset = onsets[k];
      const isHighEnergy = onset.intensity > 1.5;

      // Alternating color flow with occasional double notes on drops
      const isDouble = isHighEnergy && Math.random() < 0.25;

      if (isDouble) {
        // Red on left side, Blue on right side
        const dir1 = directions[Math.floor(Math.random() * directions.length)];
        const dir2 = directions[Math.floor(Math.random() * directions.length)];

        beatmap.push({
          time: onset.time,
          lane: 1, // Mid left
          height: 0,
          color: 'red',
          direction: dir1,
          intensity: onset.intensity
        });

        beatmap.push({
          time: onset.time,
          lane: 2, // Mid right
          height: 0,
          color: 'blue',
          direction: dir2,
          intensity: onset.intensity
        });
      } else {
        // Alternate red/blue hands
        const color = lastColor === 'red' ? 'blue' : 'red';
        lastColor = color;

        // Red favors left lanes (0, 1), Blue favors right lanes (2, 3)
        let lane;
        if (color === 'red') {
          lane = Math.random() < 0.75 ? 1 : 0;
        } else {
          lane = Math.random() < 0.75 ? 2 : 3;
        }

        const height = Math.random() < 0.7 ? 0 : 1;
        const dir = directions[Math.floor(Math.random() * directions.length)];

        beatmap.push({
          time: onset.time,
          lane: lane,
          height: height,
          color: color,
          direction: dir,
          intensity: onset.intensity
        });
      }
    }

    return beatmap;
  }
}
