// Biological Drosophila Reinforcement Learning Agent (NeuroAgent)
// Implements Mushroom Body associative learning without cheating!
// The fly observes incoming visual cues, chooses actions via Q-learning,
// and adjusts its synaptic weights based on Dopamine vs Pain ("Бобо") feedback.

import { connectomeDB } from './connectome.js';

export class DrosophilaNeuroAgent {
  constructor(flyModel) {
    this.fly = flyModel;

    // Reinforcement Learning parameters
    this.alpha = 0.35;        // Synaptic plasticity rate (Learning rate)
    this.gamma = 0.85;        // Discount factor
    this.epsilon = 0.65;      // Exploration rate (starts high: fly experiments with swings)
    this.minEpsilon = 0.05;   // Minimum exploration floor
    this.epsilonDecay = 0.992;// Decays per decision as fly learns

    // Q-Table: Map[StateKey -> Array of Action Q-Values]
    this.qTable = new Map();

    // Action definitions for Left Saber (Red) and Right Saber (Blue)
    this.actions = [
      { name: 'Idle', left: 'none', right: 'none' },
      { name: 'Left-Down', left: 'down', right: 'none' },
      { name: 'Left-Up', left: 'up', right: 'none' },
      { name: 'Left-Side', left: 'left', right: 'none' },
      { name: 'Right-Down', left: 'none', right: 'down' },
      { name: 'Right-Up', left: 'none', right: 'up' },
      { name: 'Right-Side', left: 'none', right: 'right' },
      { name: 'Dual-Down', left: 'down', right: 'down' }
    ];

    // Connectome Neurotransmitter levels
    this.dopamineLevel = 25.0; // 0..100%
    this.painLevel = 0.0;      // 0..100%

    // Stats
    this.totalHits = 0;
    this.totalMisses = 0;
    this.recentHits = [];
    this.episodes = 0;

    // Current state & pending actions
    this.lastStateKey = null;
    this.lastActionIndex = 0;
    this.pendingDecisions = new Map(); // blockId -> { stateKey, actionIdx }

    this.onBrainEvent = null;
  }

  // Encode the fly's visual receptive field into a discrete state
  // (Models visual projection & Kenyon Cell sparse activation)
  encodeVisualState(lane, height, color, direction, dist) {
    // Discrete distance bucket: Near (0.5 to 3.0), Mid (3.0 to 7.0)
    const distBucket = dist < 2.5 ? 'near' : 'mid';
    return `L${lane}_H${height}_C${color}_D${direction}_${distBucket}`;
  }

  // Get or initialize Q-values for a state
  getQValues(stateKey) {
    if (!this.qTable.has(stateKey)) {
      // Initialize with small random weights (unbiased fly brain)
      const initVals = new Float32Array(this.actions.length);
      for (let i = 0; i < initVals.length; i++) {
        initVals[i] = (Math.random() - 0.5) * 0.1;
      }
      this.qTable.set(stateKey, initVals);
    }
    return this.qTable.get(stateKey);
  }

  // The Fly's brain evaluates the oncoming block and decides an action
  evaluateAndAct(block, dist) {
    const stateKey = this.encodeVisualState(
      block.lane,
      block.height,
      block.color,
      block.direction,
      dist
    );

    const qVals = this.getQValues(stateKey);
    let chosenActionIdx = 0;

    // Epsilon-Greedy Action Selection
    if (Math.random() < this.epsilon) {
      // Exploration: Fly tries a random swing / motor reflex
      chosenActionIdx = Math.floor(Math.random() * this.actions.length);
    } else {
      // Exploitation: Fly picks the action with highest expected dopamine reward
      let maxQ = -Infinity;
      for (let i = 0; i < qVals.length; i++) {
        if (qVals[i] > maxQ) {
          maxQ = qVals[i];
          chosenActionIdx = i;
        }
      }
    }

    const action = this.actions[chosenActionIdx];

    // Guide the fly's sabers physically according to its decision
    this.executeMotorCommand(action, block);

    // Save decision for reward/punishment when block hits or misses
    this.pendingDecisions.set(block.id, {
      stateKey: stateKey,
      actionIdx: chosenActionIdx,
      expectedColor: block.color,
      expectedDir: block.direction
    });

    return action;
  }

  // Physical motor command execution (driving the fly's limbs)
  executeMotorCommand(action, block) {
    // Fly moves its sabers towards the lanes
    const laneX = [-1.5, -0.5, 0.5, 1.5][block.lane] || 0;
    const heightY = block.height === 0 ? 0.75 : 1.45;

    if (action.left !== 'none') {
      this.fly.leftSaberTarget.set(laneX, heightY, 0.6);
      this.fly.swing('red', action.left);
    } else {
      this.fly.leftSaberTarget.set(-0.6, 0.45, 0.6);
    }

    if (action.right !== 'none') {
      this.fly.rightSaberTarget.set(laneX, heightY, 0.6);
      this.fly.swing('blue', action.right);
    } else {
      this.fly.rightSaberTarget.set(0.6, 0.45, 0.6);
    }
  }

  // POSITIVE REINFORCEMENT: Dopamine Surge!
  // Triggered when the fly's saber successfully slices a cube
  receiveDopamineReward(blockId, hitAccuracy = 1.0) {
    this.totalHits++;
    this.episodes++;
    this.recentHits.push(1);
    if (this.recentHits.length > 30) this.recentHits.shift();

    const decision = this.pendingDecisions.get(blockId);
    const reward = 12.0 * hitAccuracy;

    // Biological update: Dopamine spikes, pain subsides
    this.dopamineLevel = Math.min(100, this.dopamineLevel + 22.0);
    this.painLevel = Math.max(0, this.painLevel - 15.0);
    this.fly.triggerDopamineReaction();

    // Synaptic Plasticity: Long-Term Potentiation (LTP)
    if (decision) {
      const qVals = this.getQValues(decision.stateKey);
      const oldQ = qVals[decision.actionIdx];
      // Q-learning Bellman update: Q(s, a) += alpha * (Reward - Q(s, a))
      qVals[decision.actionIdx] = oldQ + this.alpha * (reward - oldQ);
      this.pendingDecisions.delete(blockId);
    }

    // Brain maturation: Exploration decays as the fly learns
    this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);

    // Query real dopamine neuron from neurons.csv
    const daNeuron = connectomeDB.isLoaded
      ? connectomeDB.getRandomDopamine()
      : { id: 'PAM01', type: 'PAM-Cluster', nt: 'DA' };

    if (this.onBrainEvent) {
      this.onBrainEvent({
        type: 'dopamine',
        reward: reward,
        neuron: daNeuron,
        dopamine: this.dopamineLevel,
        pain: this.painLevel,
        epsilon: this.epsilon,
        accuracy: this.calculateAccuracy()
      });
    }

    console.log(`[NeuroAgent] ✨ +ДОФАМИН! Нейрон: ${daNeuron.type} (ID: ${daNeuron.id}) | Точность: ${this.calculateAccuracy()}%`);
  }

  // NEGATIVE REINFORCEMENT: "Бобо" (Nociceptive Shock)
  // Triggered when a block passes unsliced or the fly misses
  receivePainPenalty(blockId, severity = 1.0) {
    this.totalMisses++;
    this.episodes++;
    this.recentHits.push(0);
    if (this.recentHits.length > 30) this.recentHits.shift();

    const decision = this.pendingDecisions.get(blockId);
    const penalty = -14.0 * severity;

    // Biological update: Pain spikes, dopamine drops
    this.painLevel = Math.min(100, this.painLevel + 28.0 * severity);
    this.dopamineLevel = Math.max(0, this.dopamineLevel - 12.0);
    this.fly.triggerPainReaction();

    // Synaptic Depression: Long-Term Depression (LTD)
    // Punish the chosen action so the fly avoids doing it next time!
    if (decision) {
      const qVals = this.getQValues(decision.stateKey);
      const oldQ = qVals[decision.actionIdx];
      qVals[decision.actionIdx] = oldQ + this.alpha * (penalty - oldQ);
      this.pendingDecisions.delete(blockId);
    }

    // Query real pain / escape reflex neuron from neurons.csv
    const painNeuron = connectomeDB.isLoaded
      ? connectomeDB.getRandomPain()
      : { id: 'DNp01', type: 'DNp01 Giant Fiber', nt: 'ACH' };

    if (this.onBrainEvent) {
      this.onBrainEvent({
        type: 'pain',
        penalty: penalty,
        neuron: painNeuron,
        dopamine: this.dopamineLevel,
        pain: this.painLevel,
        epsilon: this.epsilon,
        accuracy: this.calculateAccuracy()
      });
    }

    console.log(`[NeuroAgent] ⚡ -БОБО! Нейрон: ${painNeuron.type} (ID: ${painNeuron.id}) | Боль: ${this.painLevel.toFixed(1)}`);
  }

  calculateAccuracy() {
    if (this.recentHits.length === 0) return 0;
    const hits = this.recentHits.reduce((a, b) => a + b, 0);
    return Math.round((hits / this.recentHits.length) * 100);
  }

  // Reset fly brain memory to watch it learn from scratch!
  resetBrain() {
    this.qTable.clear();
    this.epsilon = 0.7;
    this.totalHits = 0;
    this.totalMisses = 0;
    this.recentHits = [];
    this.dopamineLevel = 25.0;
    this.painLevel = 0.0;
    this.pendingDecisions.clear();
    console.log('[NeuroAgent] Память мозга мухи сброшена! Начинаем обучение с нуля.');
  }

  update(delta) {
    // Natural metabolic decay
    this.dopamineLevel = Math.max(10.0, this.dopamineLevel - delta * 2.0);
    this.painLevel = Math.max(0.0, this.painLevel - delta * 6.0);
  }
}
