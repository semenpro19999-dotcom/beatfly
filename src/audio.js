// Procedural Web Audio Synthesizer & Sound FX Engine for BeatFly

class AudioManager {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.bpm = 128;
    this.currentTrackIndex = 0;
    this.onBeatCallback = null;
    this.step = 0;
    this.timerId = null;
    this.nextNoteTime = 0;
    this.scheduleAheadTime = 0.1;
    this.lookahead = 25; // ms
    this.volume = 0.7;

    this.tracks = [
      {
        id: 'synaptic',
        title: 'Synaptic Surge (FlyWire Overdrive)',
        bpm: 128,
        scale: [60, 63, 65, 67, 70, 72], // C minor pentatonic
        bassNotes: [36, 36, 39, 39, 41, 41, 43, 38],
        intensity: 1.0
      },
      {
        id: 'dopamine',
        title: 'Dopamine Frenzy (PAM Cluster)',
        bpm: 136,
        scale: [62, 65, 67, 69, 72, 74], // D minor
        bassNotes: [38, 38, 41, 43, 45, 41, 38, 43],
        intensity: 1.2
      },
      {
        id: 'escape',
        title: 'DNp01 Giant Fiber Escape',
        bpm: 148,
        scale: [58, 61, 63, 65, 68, 70], // Bb minor
        bassNotes: [34, 34, 34, 37, 39, 39, 42, 41],
        intensity: 1.4
      }
    ];

    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    // Compressor for punchy master sound
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.1, this.ctx.currentTime);

    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    this.createNoiseBuffer();
  }

  createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Instrument: Kick drum
  playKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  // Instrument: Snare drum
  playSnare(time) {
    if (!this.noiseBuffer) return;
    // Noise component
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1200, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // Tonal snap component
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);

    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.25);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  // Instrument: Hi-hat
  playHihat(time, open = false) {
    if (!this.noiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);

    const gain = this.ctx.createGain();
    const duration = open ? 0.22 : 0.05;
    gain.gain.setValueAtTime(open ? 0.35 : 0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(time);
    source.stop(time + duration + 0.01);
  }

  // Instrument: Bass synth
  playBass(time, midiPitch, duration = 0.18) {
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    subOsc.type = 'sine';

    const freq = this.midiToFreq(midiPitch);
    osc.frequency.setValueAtTime(freq, time);
    subOsc.frequency.setValueAtTime(freq / 2, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(300, time + duration);
    filter.Q.setValueAtTime(6, time);

    gain.gain.setValueAtTime(0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    subOsc.start(time);
    osc.stop(time + duration);
    subOsc.stop(time + duration);
  }

  // Instrument: Melodic synth lead
  playLead(time, midiPitch, duration = 0.3) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    const freq = this.midiToFreq(midiPitch);
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.004, time); // slight detune

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.Q.setValueAtTime(2, time);

    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  }

  // Sound FX: Laser saber swing
  playSaberSwing(color = 'cyan') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const baseFreq = color === 'cyan' ? 380 : 320;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.16);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, now);
    filter.Q.setValueAtTime(4, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Sound FX: Block slice hit (satisfying crisp neon shatter)
  playSliceHit(combo = 1, isSpecial = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // High crystal chord ping
    const pitches = [72, 76, 79, 84, 88];
    const pitch = pitches[Math.min(combo, pitches.length - 1)];

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.midiToFreq(pitch), now);
    osc.frequency.exponentialRampToValueAtTime(this.midiToFreq(pitch + 7), now + 0.08);

    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);

    // Noise shatter click
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(4000, now);
      filter.Q.setValueAtTime(3, now);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(isSpecial ? 0.5 : 0.3, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.16);
    }
  }

  // Sound FX: Miss / Buzz
  playMiss() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // Annoying insect glitch buzz
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.setValueAtTime(110, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Sound FX: Bomb hit
  playBombHit() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.4);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Beat Sequencer Scheduler
  start(trackIndex = 0) {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.currentTrackIndex = trackIndex % this.tracks.length;
    const track = this.tracks[this.currentTrackIndex];
    this.bpm = track.bpm;
    this.isPlaying = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  scheduler() {
    if (!this.isPlaying) return;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.advanceStep();
    }

    this.timerId = setTimeout(() => this.scheduler(), this.lookahead);
  }

  advanceStep() {
    // 16th note step
    const secondsPer16th = 60.0 / this.bpm / 4.0;
    this.nextNoteTime += secondsPer16th;
    this.step = (this.step + 1) % 64; // 4 measures of 16 steps
  }

  scheduleStep(step, time) {
    const track = this.tracks[this.currentTrackIndex];
    const isQuarter = step % 4 === 0;
    const beatIndex = Math.floor(step / 4);

    // Quarter beat event (for game block spawning and visual pulse)
    if (isQuarter) {
      if (this.onBeatCallback) {
        this.onBeatCallback({
          beat: beatIndex,
          totalBeat: Math.floor(step / 4),
          time: time,
          bpm: this.bpm,
          track: track
        });
      }

      // Kick on beats 0, 2 (or 0, 1, 2, 3 in 4-on-the-floor)
      if (step % 8 === 0 || step % 16 === 8) {
        this.playKick(time);
      }

      // Snare on beats 2, 4
      if (step % 16 === 4 || step % 16 === 12) {
        this.playSnare(time);
      }
    }

    // Hi-hat on every 16th or 8th
    if (step % 2 === 0) {
      const isOpen = (step % 4 === 2);
      this.playHihat(time, isOpen);
    }

    // Rolling Bassline
    const bassIndex = Math.floor(step / 2) % track.bassNotes.length;
    if (step % 2 === 0) {
      const pitch = track.bassNotes[bassIndex];
      this.playBass(time, pitch, 0.12);
    }

    // Synth Melody Lead on select 16ths
    if (step % 8 === 0 || step % 8 === 3 || step % 8 === 6) {
      const melodyIndex = (Math.floor(step / 4) + step) % track.scale.length;
      const leadPitch = track.scale[melodyIndex];
      this.playLead(time, leadPitch, 0.22);
    }
  }

  setVolume(val) {
    this.volume = val;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }
}

export const audioManager = new AudioManager();
