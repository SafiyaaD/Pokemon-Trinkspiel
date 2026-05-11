const bgMusic = document.getElementById("bg-music");

const playlist = [
    "../assets/music/Intro.mp3",
    "../assets/music/Labor.mp3",
    "../assets/music/Route1.mp3",
    "../assets/music/Orania.mp3",
    "../assets/music/Route2425.mp3",
];

let currentTrack = 0;

function playNextTrack() {
  bgMusic.src = playlist[currentTrack];
  bgMusic.volume = 0.2;
  bgMusic.play();

  currentTrack = (currentTrack + 1) % playlist.length;
}

bgMusic.addEventListener("ended", playNextTrack);

function startPlaylist() {
  playNextTrack();
}

// -------------------------------------------------------
// Fade‑Funktionen (Crossfade)
// -------------------------------------------------------
function fadeOut(audio, duration = 5000) {
  return new Promise(resolve => {
    const steps = 20;
    const stepTime = duration / steps;
    const volumeStep = audio.volume / steps;

    let currentStep = 0;

    const fade = setInterval(() => {
      currentStep++;
      audio.volume = Math.max(0, audio.volume - volumeStep);

      if (currentStep >= steps) {
        clearInterval(fade);
        audio.pause();
        resolve();
      }
    }, stepTime);
  });
}

function fadeIn(audio, targetVolume = 1.0, duration = 5000) {
  return new Promise(resolve => {
    const steps = 20;
    const stepTime = duration / steps;
    const volumeStep = targetVolume / steps;

    audio.volume = 0;
    audio.play();

    let currentStep = 0;

    const fade = setInterval(() => {
      currentStep++;
      audio.volume = Math.min(targetVolume, audio.volume + volumeStep);

      if (currentStep >= steps) {
        clearInterval(fade);
        resolve();
      }
    }, stepTime);
  });
}



// -------------------------------------------------------
// Event‑Sounds – Crossfade zwischen Events + Crossfade zur Playlist
// -------------------------------------------------------
let activeEventSounds = 0;
let activeSfx = null; // nur EIN aktiver Event-Sound

async function playEventSound(src) {

  // 1) Wenn ein Event-Sound läuft → smooth ausfaden (3000 ms)
  if (activeSfx) {
    activeSfx.onended = null;
    await fadeOut(activeSfx, 3000);
    activeSfx = null;
    activeEventSounds = 0;
  }

  // 2) Playlist ausfaden (3000 ms)
  if (bgMusic.volume > 0) {
    await fadeOut(bgMusic, 3000);
  }

  // 3) Neuen Event-Sound starten + einblenden (2000 ms)
  const sfx = new Audio(src);
  activeSfx = sfx;
  activeEventSounds = 1;

  await fadeIn(sfx, 0.2, 2000);

  // 4) Warten bis Event-Sound fertig ist
  await new Promise(resolve => {
    sfx.onended = resolve;
  });

  // 5) Event-Sound ausfaden (3000 ms)
  await fadeOut(sfx, 3000);

  activeEventSounds = 0;
  activeSfx = null;

  // 6) Playlist wieder einblenden (2000 ms)
  await fadeIn(bgMusic, 0.2, 2000);
}
