/* ==========================================================
   Ramo de girasoles: arma el ramo y orquesta la secuencia.
   Todo lo editable está en CONFIG.
   ========================================================== */

const CONFIG = {
  titulo: "",   // vacío: la tarjeta no muestra ningún nombre
  mensaje: "",   // frase opcional bajo el título; déjala vacía para mostrar solo la firma

  imgTallo: "assets/img/tallo_de_girasol.png",
  imgFlor: "assets/img/girasol.png",
  imgCorbata: "assets/img/corbata.png",

  /* Música: deja "" para usar la melodía de caja de música generada,
     o pon la ruta de tu archivo (aquí, tu canción en assets/audio/music.mp3) */
  musica: "assets/audio/music.mp3",
  volumen: 0.8,   // de 0 a 1

  /* Cada girasol: dónde queda su cabeza (x, y) y su tamaño.
     x: 0 es el centro; negativo = izquierda, positivo = derecha.
     y: altura desde el borde inferior (100 = borde superior de la pantalla).
     size: ancho de la flor. orden: en qué turno florece (1 = primera).
     Se listan de atrás hacia adelante: los últimos quedan por delante.
     Agrega o quita filas y el ramo se recalcula solo. */
  girasoles: [
    { x:   0, y: 71, size: 26, orden: 7, giro:   6 },
    { x: -13, y: 63, size: 24, orden: 3, giro: -14 },
    { x:  13, y: 64, size: 24, orden: 4, giro:  12 },
    { x: -25, y: 52, size: 23, orden: 1, giro:  -8 },
    { x:  25, y: 53, size: 23, orden: 2, giro:  18 },
    { x:  -7, y: 50, size: 25, orden: 5, giro:  10 },
    { x:   8, y: 47, size: 25, orden: 6, giro: -10 }
  ],

  /* Tiempos (segundos) */
  inicio: 0.3,        // cuándo sale el primer tallo
  entreTallos: 0.15,  // desfase entre un tallo y el siguiente
  duracionTallo: 2.2, // lo que tarda cada tallo en subir
  entreFlores: 0.4,   // desfase entre una flor y la siguiente
  duracionFlor: 1.3,
  duracionCorbata: 0.9
};

/* Geometría de la imagen del tallo (medida sobre el PNG) */
const BASE_X = 0.52;      // la base del tallo está al 52% del ancho
const PUNTA_X = 54.7;     // la yema superior está al 54.7% del ancho
const ALTO_PUNTA = 0.91;  // ...y a 91% de la altura, contada desde la base
const PIVOTE_Y = -4;      // la base queda 4u bajo el borde para ocultar el corte
const ASPECTO = 2 / 3;    // ancho / alto del PNG del tallo

const stage = document.getElementById("bouquet");
const message = document.getElementById("message");
const replayBtn = document.getElementById("replay");
const soundBtn = document.getElementById("sound");
const intro = document.getElementById("intro");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const tituloEl = document.getElementById("title");
tituloEl.textContent = CONFIG.titulo;
tituloEl.hidden = !CONFIG.titulo;
const textoEl = document.getElementById("text");
textoEl.textContent = CONFIG.mensaje;
textoEl.hidden = !CONFIG.mensaje;

function construir() {
  stage.innerHTML = "";
  replayBtn.classList.remove("is-ready");

  const flores = CONFIG.girasoles;
  const n = flores.length;

  // En pantallas angostas (celular vertical) el ramo se junta para que quepa a lo ancho
  const proporcion = window.innerWidth / window.innerHeight;
  const compresion = Math.max(0.58, Math.min(1, proporcion / 0.8));

  // Los tallos terminan de salir antes de que empiece la primera flor
  const finTallos = CONFIG.inicio + (n - 1) * CONFIG.entreTallos + CONFIG.duracionTallo;
  const inicioFlores = finTallos + 0.1;
  const finFlores = inicioFlores + (n - 1) * CONFIG.entreFlores + CONFIG.duracionFlor;
  const inicioCorbata = finFlores - 0.1;         // la corbata entra cuando ya floreció el último girasol
  const finCorbata = inicioCorbata + CONFIG.duracionCorbata;

  flores.forEach((f, i) => {
    // Distancia y ángulo desde la base del tallo hasta donde debe quedar la flor
    const dx = f.x * compresion;
    const dy = f.y - PIVOTE_Y;
    const angulo = Math.atan2(dx, dy) * 180 / Math.PI;
    const alto = Math.hypot(dx, dy) / ALTO_PUNTA;

    // Alternar el espejo da variedad a las hojas sin repetir el mismo tallo
    const espejo = i % 2 === 0 ? 1 : -1;
    const puntaX = espejo === 1 ? PUNTA_X : 2 * BASE_X * 100 - PUNTA_X;

    const stem = document.createElement("div");
    stem.className = "stem";
    stem.style.setProperty("--h", alto.toFixed(2));
    stem.style.setProperty("--a", angulo.toFixed(2) + "deg");
    stem.style.setProperty("--flip", espejo);
    stem.style.setProperty("--grow-dur", CONFIG.duracionTallo + "s");
    stem.style.setProperty("--grow-delay", (CONFIG.inicio + i * CONFIG.entreTallos).toFixed(2) + "s");
    stem.style.setProperty("--sway-delay", (finCorbata + 0.5).toFixed(2) + "s");
    stem.style.setProperty("--sway-dur", (5 + (i % 3) * 1.3).toFixed(1) + "s");

    const tallo = new Image();
    tallo.className = "stem__img";
    tallo.alt = "";
    tallo.src = CONFIG.imgTallo;
    // el retraso se aplica al <img>, que es quien anima el crecimiento
    tallo.style.setProperty("--grow-delay", (CONFIG.inicio + i * CONFIG.entreTallos).toFixed(2) + "s");
    tallo.style.setProperty("--grow-dur", CONFIG.duracionTallo + "s");

    const flor = new Image();
    flor.className = "flower";
    flor.alt = "";
    flor.src = CONFIG.imgFlor;
    flor.style.setProperty("--tip-x", puntaX + "%");
    flor.style.setProperty("--fs", f.size);
    flor.style.setProperty("--fr", (f.giro - angulo).toFixed(1) + "deg"); // compensa la inclinación del tallo
    flor.style.setProperty("--bloom-delay", (inicioFlores + (f.orden - 1) * CONFIG.entreFlores).toFixed(2) + "s");

    stem.append(tallo, flor);
    stage.append(stem);
  });

  // Corbata: cierra la secuencia, después de los girasoles
  const corbata = new Image();
  corbata.className = "ribbon";
  corbata.alt = "";
  corbata.src = CONFIG.imgCorbata;
  corbata.style.setProperty("--ribbon-delay", inicioCorbata.toFixed(2) + "s");
  stage.append(corbata);

  // Mensaje y botón al final
  message.style.setProperty("--msg-delay", (finCorbata - 0.3).toFixed(2) + "s");
  message.style.animation = "none";
  void message.offsetWidth;          // reinicia la animación
  message.style.animation = "";

  const espera = reducedMotion ? 0 : (finCorbata + 1.2) * 1000;
  clearTimeout(construir.timer);
  construir.timer = setTimeout(() => replayBtn.classList.add("is-ready"), espera);
}

replayBtn.addEventListener("click", construir);

/* ---------- Música ---------- */
const musica = new Musica({ archivo: CONFIG.musica, volumen: CONFIG.volumen });

function actualizarSonido() {
  soundBtn.classList.toggle("is-off", !musica.sonando);
  soundBtn.setAttribute("aria-pressed", String(musica.sonando));
  soundBtn.setAttribute("aria-label", musica.sonando ? "Silenciar música" : "Activar música");
}

soundBtn.addEventListener("click", async () => {
  await musica.alternar();
  actualizarSonido();
});

/* ---------- Arranque ---------- */
// Esperamos a que carguen las imágenes para que la secuencia no arranque a medias
const precarga = Promise.all([CONFIG.imgTallo, CONFIG.imgFlor, CONFIG.imgCorbata].map(src => new Promise(ok => {
  const im = new Image();
  im.onload = im.onerror = ok;
  im.src = src;
})));

intro.addEventListener("click", async () => {
  intro.disabled = true;
  const arranque = musica.iniciar();     // dentro del toque, para que el navegador permita el audio
  await precarga;
  intro.classList.add("is-hidden");
  soundBtn.classList.add("is-visible");
  construir();
  await arranque;
  actualizarSonido();
  setTimeout(() => intro.remove(), 1200);
}, { once: true });
