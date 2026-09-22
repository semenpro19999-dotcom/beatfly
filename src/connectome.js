// Direct Connectome Loader for neurons.csv in WebGL
export class ConnectomeDatabase {
  constructor() {
    this.isLoaded = false;
    this.totalCount = 0;
    this.dopamineNeurons = [];
    this.painNeurons = [];
    this.visualNeurons = [];
    this.kenyonCells = [];
    this.onLoadedCallback = null;
  }

  async load(csvUrl = '/neurons.csv') {
    try {
      console.log(`[Connectome] Загрузка ${csvUrl}...`);
      const response = await fetch(csvUrl);
      if (!response.ok) {
        console.warn(`[Connectome] Не удалось загрузить ${csvUrl}, статус: ${response.status}`);
        return false;
      }

      // Stream read and parse lines efficiently
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let leftover = '';
      let isFirstLine = true;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = (leftover + chunk).split('\n');
        leftover = lines.pop(); // save incomplete trailing line

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          if (isFirstLine) {
            isFirstLine = false;
            continue; // Skip CSV header
          }

          this.parseLine(line);
        }
      }

      if (leftover && !isFirstLine) {
        this.parseLine(leftover.trim());
      }

      this.isLoaded = true;
      console.log(`[Connectome] Успешно загружен полный датасет neurons.csv!`);
      console.log(`Всего нейронов: ${this.totalCount}`);
      console.log(`Дофаминовых (DA): ${this.dopamineNeurons.length}`);
      console.log(`Ноцицептивных / Тревоги (DNp/PPL1): ${this.painNeurons.length}`);
      console.log(`Клеток Кеньона (KC): ${this.kenyonCells.length}`);

      if (this.onLoadedCallback) {
        this.onLoadedCallback(this.getStats());
      }
      return true;
    } catch (err) {
      console.error('[Connectome] Ошибка чтения neurons.csv:', err);
      return false;
    }
  }

  parseLine(line) {
    this.totalCount++;

    // Quick regex or comma split for key columns
    // Root ID (0), Top in/out (1), Comm labels (2), Predicted NT type (3), ...
    // Super Class (10), Soma side (15), Primary Cell Type (16)
    const cols = line.split(',');
    if (cols.length < 17) return;

    const rootId = cols[0];
    const nt = cols[3] ? cols[3].trim() : '';
    const superClass = cols[10] ? cols[10].trim() : '';
    const soma = cols[15] ? cols[15].trim() : '';
    const cellType = cols[16] ? cols[16].trim() : '';

    const entry = {
      id: rootId,
      nt: nt,
      sc: superClass,
      side: soma,
      type: cellType || 'Neuron'
    };

    // Index dopamine reward neurons
    if (nt === 'DA') {
      this.dopamineNeurons.push(entry);
    }

    // Index pain/nociceptive & descending escape neurons
    if (superClass.includes('descending') || cellType.includes('DNp') || line.includes('PPL1')) {
      this.painNeurons.push(entry);
    }

    // Index visual sensory
    if (superClass.includes('visual') || superClass.includes('ol_')) {
      if (this.visualNeurons.length < 3000) {
        this.visualNeurons.push(entry);
      }
    }

    // Index Kenyon cells
    if (cellType.includes('KC') || line.includes('Kenyon')) {
      this.kenyonCells.push(entry);
    }
  }

  getRandomDopamine() {
    if (this.dopamineNeurons.length > 0) {
      return this.dopamineNeurons[Math.floor(Math.random() * this.dopamineNeurons.length)];
    }
    return { id: 'PAM01-DA', nt: 'DA', sc: 'cb_intrinsic', type: 'PAM-Cluster', side: 'right' };
  }

  getRandomPain() {
    if (this.painNeurons.length > 0) {
      return this.painNeurons[Math.floor(Math.random() * this.painNeurons.length)];
    }
    return { id: 'DNp01', nt: 'ACH', sc: 'descending_neuron', type: 'Giant Fiber (Ноцицепция)', side: 'left' };
  }

  getRandomVisual() {
    if (this.visualNeurons.length > 0) {
      return this.visualNeurons[Math.floor(Math.random() * this.visualNeurons.length)];
    }
    return { id: 'VS1', nt: 'ACH', sc: 'visual_projection', type: 'VS Tangential', side: 'right' };
  }

  getStats() {
    return {
      total: this.totalCount,
      dopamine: this.dopamineNeurons.length,
      pain: this.painNeurons.length,
      visual: this.visualNeurons.length,
      kenyon: this.kenyonCells.length
    };
  }
}

export const connectomeDB = new ConnectomeDatabase();
