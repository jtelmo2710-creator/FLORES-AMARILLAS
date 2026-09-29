/* ==========================================================
   Música de la tarjeta.

   - Si indicas un archivo (CONFIG.musica = "assets/audio/musica.mp3")
     se reproduce ese audio en bucle.
   - Si lo dejas vacío, se genera una melodía original tipo caja de
     música con Web Audio (no necesita ningún archivo).

   Los navegadores solo dejan sonar el audio después de un toque del
   usuario; por eso la tarjeta empieza con "Toca para abrir".
   ========================================================== */

class Musica {
  constructor({ archivo = "", volumen = 0.5 } = {}) {
    this.archivo = archivo;
    this.volumen = volumen;
    this.sonando = false;
    this.iniciada = false;
  }

  /* ---------- API pública ---------- */

  async iniciar() {
    if (this.iniciada) return this.reanudar();
    this.iniciada = true;
    try {
      if (this.archivo) await this._iniciarArchivo();
      else this._iniciarGenerada();
      this.sonando = true;
    } catch (err) {
      console.warn("No se pudo iniciar la música:", err);
      this.iniciada = false;
      this.sonando = false;
    }
  }

  async alternar() {
    if (!this.iniciada) return this.iniciar();
    return this.sonando ? this.silenciar() : this.reanudar();
  }

  silenciar() {
    this.sonando = false;
    if (this.audio) this._fundirAudio(0, () => this.audio.pause());
    if (this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
    }
  }

  async reanudar() {
    this.sonando = true;
    if (this.audio) {
      await this.audio.play();
      this._fundirAudio(this.volumen);
    }
    if (this.ctx) {
      await this.ctx.resume();
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(this.volumen * 0.7, this.ctx.currentTime, 0.3);
    }
  }

  /* ---------- Archivo de audio ---------- */

  async _iniciarArchivo() {
    this.audio = new Audio(this.archivo);
    this.audio.loop = true;
    this.audio.volume = 0;
    await this.audio.play();
    this._fundirAudio(this.volumen);
  }

  _fundirAudio(destino, alTerminar) {
    clearInterval(this._fade);
    this._fade = setInterval(() => {
      const v = this.audio.volume;
      const paso = destino > v ? 0.03 : -0.05;
      const nuevo = Math.min(1, Math.max(0, v + paso));
      this.audio.volume = nuevo;
      if (Math.abs(nuevo - destino) < 0.03) {
        this.audio.volume = destino;
        clearInterval(this._fade);
        if (alTerminar) alTerminar();
      }
    }, 60);
  }

  /* ---------- Melodía generada (caja de música) ---------- */

  _iniciarGenerada() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.ctx.resume();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    this.master.gain.setTargetAtTime(this.volumen * 0.7, this.ctx.currentTime, 0.8); // entra suave

    // Un poco de reverberación para que suene a sala y no a sintetizador
    const largo = Math.floor(this.ctx.sampleRate * 2.4);
    const impulso = this.ctx.createBuffer(2, largo, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = impulso.getChannelData(c);
      for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 2.6);
    }
    const reverb = this.ctx.createConvolver();
    reverb.buffer = impulso;
    const humedo = this.ctx.createGain();
    humedo.gain.value = 0.42;
    this.bus = this.ctx.createGain();
    this.bus.connect(this.master);
    this.bus.connect(reverb);
    reverb.connect(humedo);
    humedo.connect(this.master);

    // Vals suave en Do mayor: Do - Lam - Fa - Sol, dos vueltas y repite
    const corchea = 60 / 88 / 2;
    const acordes = [
      [60, 64, 67, 72],   // Do
      [57, 60, 64, 69],   // La menor
      [53, 57, 60, 65],   // Fa
      [55, 59, 62, 67]    // Sol
    ];
    const melodia = [   // por compás: [tiempo (corcheas), nota MIDI, duración (corcheas)]
      [[0, 76, 2], [2, 79, 2], [4, 76, 2]],
      [[0, 72, 3], [3, 76, 3]],
      [[0, 72, 2], [2, 77, 2], [4, 76, 2]],
      [[0, 74, 4], [4, 71, 2]],
      [[0, 76, 2], [2, 79, 2], [4, 84, 2]],
      [[0, 81, 3], [3, 76, 3]],
      [[0, 77, 2], [2, 81, 2], [4, 79, 2]],
      [[0, 79, 3], [3, 74, 3]]
    ];
    const arpegio = [0, 1, 2, 3, 2, 1];

    const compas = (n, t) => {
      const acorde = acordes[n % 4];
      this._nota(acorde[0] - 12, t, 1.6, 0.22);                       // bajo
      arpegio.forEach((idx, k) => this._nota(acorde[idx], t + k * corchea, 1.1, 0.16));
      melodia[n % 8].forEach(([k, midi, dur]) =>
        this._nota(midi, t + k * corchea, dur * corchea + 0.9, 0.34));
    };

    let n = 0;
    let siguiente = this.ctx.currentTime + 0.15;
    const programar = () => {
      while (siguiente < this.ctx.currentTime + 0.8) {
        compas(n, siguiente);
        siguiente += 6 * corchea;
        n++;
      }
    };
    programar();
    this._timer = setInterval(programar, 200);
  }

  _nota(midi, t, dur, vel) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    // ratio, volumen relativo, duración relativa: el timbre de campanita
    [[1, 1, 1], [2, 0.25, 0.5], [4.1, 0.06, 0.25]].forEach(([ratio, amp, k]) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f * ratio;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel * amp, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * k);
      osc.connect(g);
      g.connect(this.bus);
      osc.start(t);
      osc.stop(t + dur * k + 0.05);
    });
  }
}
