// --------------------
// 0) Настройки
// --------------------
const RELATIONSHIP_START = "2026-01-06"; // мы вместе с 6 января 2026

// Вариант B: автосбор треков music/track1.mp3 ... music/trackN.mp3
// (нужен запуск через http://localhost или GitHub Pages; в file:/// fetch(HEAD) обычно не работает)
let PLAYLIST = [];
const TRACK_PREFIX = "music/track";
const TRACK_EXT = ".mp3";
const MAX_TRACKS = 50;

// --------------------
// 1) Персонализация
// --------------------
const params = new URLSearchParams(location.search);
const to = params.get("to");
const from = params.get("from");

const nameEl = document.getElementById("name");
const fromEl = document.getElementById("from");

if (to) nameEl.textContent = to;
fromEl.textContent = from ? from : "Арчи";

// --------------------
// 2) Счётчик “мы вместе”
// --------------------
const counterEl = document.getElementById("counter");

function updateCounter() {
  const start = new Date(RELATIONSHIP_START + "T00:00:00");
  const now = new Date();
  const ms = now - start;
  const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  const dayWord = pluralRu(days, ["день", "дня", "дней"]);
  counterEl.innerHTML = `<span class="dot"></span> Мы вместе: <b>${days}</b> ${dayWord}`;
}
updateCounter();
setInterval(updateCounter, 60 * 1000);

// --------------------
// 3) Мини-стикеры
// --------------------
const miniSticker = document.getElementById("miniSticker");
const STICKERS = [
  "Моя принцесса",
  "самая милая сегодня 💗",
  "моя удача 🍀",
  "обнимаю мысленно 🤍",
  "У тебя все получится",
  "ты — мой дом 🏠"
];

let stickerIdx = 0;

function showSticker(){
  // показываем
  miniSticker.textContent = STICKERS[stickerIdx % STICKERS.length];
  stickerIdx++;

  miniSticker.classList.remove("is-off");
  miniSticker.classList.add("is-on");

  // плавно прячем
  setTimeout(() => {
    miniSticker.classList.remove("is-on");
    miniSticker.classList.add("is-off");
  }, 2200);
}
setTimeout(showSticker, 700);
setInterval(showSticker, 5200);

// --------------------
// 4) Открытие письма + милость (купон)
// --------------------
const openBtn = document.getElementById("openBtn");
const letter = document.getElementById("letter");
const coupon = document.getElementById("coupon");

openBtn.addEventListener("click", () => {
  const isHidden = letter.hasAttribute("hidden");
  if (isHidden) {
    letter.removeAttribute("hidden");
    openBtn.textContent = "Спрятать послание";
    burst(18);

    coupon.classList.add("is-on");
    setTimeout(() => coupon.classList.remove("is-on"), 3200);
  } else {
    letter.setAttribute("hidden", "");
    openBtn.textContent = "Открыть послание";
  }
});

// --------------------
// 5) Бейдж: билетик
// --------------------
const badgeBtn = document.getElementById("badgeBtn");
const ticket = document.getElementById("ticket");
let ticketTimer = null;

badgeBtn.addEventListener("click", () => {
  ticket.classList.add("is-on");
  burst(14);
  clearTimeout(ticketTimer);
  ticketTimer = setTimeout(() => ticket.classList.remove("is-on"), 2600);
});

// --------------------
// 6) Парные авы (панель)
// --------------------
const avaBtn = document.getElementById("avaBtn");
const avaPanel = document.getElementById("avaPanel");

avaBtn.addEventListener("click", () => {
  const hidden = avaPanel.hasAttribute("hidden");
  if (hidden) {
    avaPanel.removeAttribute("hidden");
    avaBtn.textContent = "💞 Ну давай? 👉👈";
    burst(12);
  } else {
    avaPanel.setAttribute("hidden", "");
    avaBtn.textContent = "💞 Поставим парные авы?";
  }
});

// --------------------
// 7) Minecraft achievement + звук + ducking музыки
// --------------------
const mcAchievement = document.getElementById("mcAchievement");
const achievementSfx = document.getElementById("achievementSfx");

let achTimer = null;

document.getElementById("titleHeart").addEventListener("click", async () => {
  burst(28);
  sparkleTitle();

  mcAchievement.classList.add("is-on");
  clearTimeout(achTimer);
  achTimer = setTimeout(() => mcAchievement.classList.remove("is-on"), 2600);

  await duckMusicForSfx(() => playAchievementSfx());
});

function sparkleTitle() {
  nameEl.animate(
    [
      { filter: "drop-shadow(0 0 0px rgba(255,61,127,0))" },
      { filter: "drop-shadow(0 0 18px rgba(255,61,127,.75))" },
      { filter: "drop-shadow(0 0 0px rgba(255,61,127,0))" }
    ],
    { duration: 700, easing: "ease-out" }
  );
}

async function playAchievementSfx() {
  try {
    achievementSfx.currentTime = 0;
    achievementSfx.volume = 0.95;
    await achievementSfx.play();
  } catch {
    // если файла нет/браузер блокирует — просто без звука
  }
}

// --------------------
// 8) Плейлист музыки + кроссфейд + закольцовка (с автосбором)
// --------------------
const musicBtn = document.getElementById("musicBtn");
const trackA = document.getElementById("trackA");
const trackB = document.getElementById("trackB");

const BASE_VOL = 0.35;
const DUCK_VOL = 0.12;
const FADE_SEC = 2.4;

let active = trackA;
let standby = trackB;
let trackIndex = 0;
let playing = false;
let crossfadeArmed = false;

setAudioDefaults(trackA);
setAudioDefaults(trackB);

function setAudioDefaults(a) {
  a.volume = 0;
  a.loop = false;
  a.preload = "auto";
}

function nextTrackUrl() {
  if (PLAYLIST.length === 0) return null;
  const url = PLAYLIST[trackIndex];
  trackIndex++;
  if (trackIndex >= PLAYLIST.length) trackIndex = 0; // закольцовка
  return url;
}

function swapPlayers() {
  const tmp = active;
  active = standby;
  standby = tmp;
}

// Автосбор плейлиста: ищем track1..trackN пока файлы существуют
async function buildPlaylistByPattern(maxN = MAX_TRACKS) {
  const list = [];
  for (let i = 1; i <= maxN; i++) {
    const url = `${TRACK_PREFIX}${i}${TRACK_EXT}`;
    try {
      const r = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (!r.ok) break;
      list.push(url);
    } catch {
      // если HEAD не доступен (например file:///), останавливаемся
      break;
    }
  }

  // Фолбэк для file:/// — пробуем хотя бы первые 2 трека (если ты их обычно кладёшь)
  if (list.length === 0 && location.protocol === "file:") {
    list.push(`${TRACK_PREFIX}1${TRACK_EXT}`, `${TRACK_PREFIX}2${TRACK_EXT}`);
  }

  PLAYLIST = list;
}

async function startPlaylistAutoplay() {
  if (PLAYLIST.length === 0) {
    musicBtn.textContent = "♫ Музыка";
    musicBtn.setAttribute("aria-pressed", "false");
    return;
  }

  active.src = nextTrackUrl();
  active.load(); // важный load
  active.volume = BASE_VOL;
  standby.volume = 0;

  try {
    await active.play();
    playing = true;
    musicBtn.textContent = "♫ Выключить";
    musicBtn.setAttribute("aria-pressed", "true");
  } catch (e) {
    try {
      active.muted = true;
      await active.play();
      playing = true;
      musicBtn.textContent = "♫ Включить звук";
      musicBtn.setAttribute("aria-pressed", "false");
      armUnmuteOnFirstGesture();
    } catch {
      playing = false;
      musicBtn.textContent = "♫ Музыка";
      musicBtn.setAttribute("aria-pressed", "false");
    }
  }

  attachCrossfadeWatcher(active);

  // если какой-то трек битый/не найден — перескочим на следующий
  active.onerror = () => {
    if (playing) {
      crossfadeArmed = false;
      crossfadeToNext().catch(() => {});
    }
  };
  standby.onerror = () => {
    if (playing) {
      crossfadeArmed = false;
      crossfadeToNext().catch(() => {});
    }
  };
}

// Старт: сначала собираем плейлист, потом автозапуск
(async () => {
  await buildPlaylistByPattern();
  await startPlaylistAutoplay();
})();

function armUnmuteOnFirstGesture() {
  const handler = async () => {
    if (!playing) return;
    try {
      active.muted = false;
      await active.play();
      musicBtn.textContent = "♫ Выключить";
      musicBtn.setAttribute("aria-pressed", "true");
    } catch {}
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
  };
  window.addEventListener("pointerdown", handler);
  window.addEventListener("keydown", handler);
}

musicBtn.addEventListener("click", async () => {
  try {
    if (!playing) {
      if (PLAYLIST.length === 0) {
        await buildPlaylistByPattern();
      }
      if (!active.src) active.src = nextTrackUrl();
      active.load();

      active.muted = false;
      active.volume = BASE_VOL;
      await active.play();

      playing = true;
      musicBtn.textContent = "♫ Выключить";
      musicBtn.setAttribute("aria-pressed", "true");
      burst(10);
      attachCrossfadeWatcher(active);
      return;
    }

    if (active.muted) {
      active.muted = false;
      await active.play();
      musicBtn.textContent = "♫ Выключить";
      musicBtn.setAttribute("aria-pressed", "true");
      burst(10);
      return;
    }

    active.pause();
    standby.pause();
    playing = false;
    musicBtn.textContent = "♫ Музыка";
    musicBtn.setAttribute("aria-pressed", "false");
  } catch {
    musicBtn.textContent = "♫ Нажми для звука";
    musicBtn.setAttribute("aria-pressed", "false");
  }
});

function attachCrossfadeWatcher(player) {
  player.ontimeupdate = () => {
    if (!playing) return;
    if (!player.duration || !isFinite(player.duration) || player.duration < 5) return;

    const remain = player.duration - player.currentTime;
    if (remain <= FADE_SEC && !crossfadeArmed) {
      crossfadeArmed = true;
      crossfadeToNext().catch(() => {});
    }
  };

  player.onended = () => {
    if (!playing) return;
    if (!crossfadeArmed) crossfadeToNext().catch(() => {});
  };
}

async function crossfadeToNext() {
  if (PLAYLIST.length === 0) return;

  const nextUrl = nextTrackUrl();
  if (!nextUrl) return;

  standby.src = nextUrl;
  standby.load(); // важный load
  standby.currentTime = 0;
  standby.muted = active.muted;
  standby.volume = 0;

  try {
    await standby.play();
  } catch {
    // если не смогли стартануть следующий — попробуем ещё раз дальше
    crossfadeArmed = false;
    return;
  }

  const start = performance.now();
  const fadeMs = FADE_SEC * 1000;

  const fromVol = active.volume;
  const toVol = active.muted ? 0 : BASE_VOL;

  await new Promise((resolve) => {
    const step = (t) => {
      const k = Math.min(1, (t - start) / fadeMs);
      const e = k * (2 - k);
      standby.volume = toVol * e;
      active.volume = fromVol * (1 - e);
      if (k < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });

  try { active.pause(); } catch {}
  active.currentTime = 0;

  swapPlayers();
  crossfadeArmed = false;
  attachCrossfadeWatcher(active);
}

// --------------------
// 9) Ducking музыки под SFX
// --------------------
async function duckMusicForSfx(playSfxFn) {
  if (!playing) {
    await playSfxFn();
    return;
  }

  await fadeMusicTo(DUCK_VOL, 160);
  await playSfxFn();
  await wait(850);

  const target = active.muted ? 0 : BASE_VOL;
  await fadeMusicTo(target, 260);
}

function fadeMusicTo(targetVol, ms) {
  const a0 = active.volume;
  const b0 = standby.volume;
  const start = performance.now();

  return new Promise((resolve) => {
    const step = (t) => {
      const k = Math.min(1, (t - start) / ms);
      const e = k * (2 - k);
      active.volume = a0 + (targetVol - a0) * e;
      standby.volume = b0 + (Math.min(targetVol, b0) - b0) * e;
      if (k < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// --------------------
// 10) Сердечки на canvas
// --------------------
const canvas = document.getElementById("hearts");
const ctx = canvas.getContext("2d", { alpha: true });

let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  W = Math.floor(window.innerWidth);
  H = Math.floor(window.innerHeight);
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize);
resize();

const hearts = [];
function rand(min, max) { return Math.random() * (max - min) + min; }

function addHeart(x = rand(0, W), y = H + 20, big = false) {
  hearts.push({
    x, y,
    vx: rand(-0.25, 0.25),
    vy: rand(-1.4, -0.7) * (big ? 1.25 : 1),
    s: rand(10, 18) * (big ? 1.2 : 1),
    a: rand(0.35, 0.85),
    r: rand(-0.4, 0.4),
    spin: rand(-0.01, 0.01),
  });
}
for (let i = 0; i < 28; i++) addHeart(rand(0, W), rand(0, H), false);

function drawHeart(x, y, size, rot, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;

  const s = size / 18;
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-10, -4, -18, 4, -10, 14);
  ctx.bezierCurveTo(-4, 20, 0, 22, 0, 26);
  ctx.bezierCurveTo(0, 22, 4, 20, 10, 14);
  ctx.bezierCurveTo(18, 4, 10, -4, 0, 6);
  ctx.closePath();

  const g = ctx.createLinearGradient(-18, -8, 18, 26);
  g.addColorStop(0, "rgba(255,61,127,0.95)");
  g.addColorStop(1, "rgba(168,85,247,0.95)");
  ctx.fillStyle = g;
  ctx.fill();

  ctx.restore();
}

function tick() {
  ctx.clearRect(0, 0, W, H);
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.x += h.vx;
    h.y += h.vy;
    h.r += h.spin;
    h.x += Math.sin((h.y + i * 30) * 0.01) * 0.2;

    drawHeart(h.x, h.y, h.s, h.r, h.a);

    if (h.y < -40 || h.x < -60 || h.x > W + 60) {
      hearts.splice(i, 1);
      addHeart(rand(0, W), H + 30, Math.random() < 0.15);
    }
  }
  requestAnimationFrame(tick);
}
tick();

function burst(n = 16) {
  const centerX = W * 0.5;
  const centerY = H * 0.35;
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2) * (i / n);
    const speed = rand(0.6, 1.8);
    hearts.push({
      x: centerX + rand(-10, 10),
      y: centerY + rand(-10, 10),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(0.3, 1.2),
      s: rand(14, 22),
      a: rand(0.45, 0.95),
      r: rand(-0.5, 0.5),
      spin: rand(-0.03, 0.03),
    });
  }
}

// --------------------
// Utils
// --------------------
function pluralRu(n, forms) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
  return forms[2];
}
