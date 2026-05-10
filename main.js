// main.js
import { loadHotspots, renderHotspots } from './game/board.js';
import { setupUI } from './ui/gameflow.js';

// CSS Cache-Bust
(function bustCSS() {
  const version = Date.now();
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const href = link.getAttribute("href").split("?")[0];
    link.setAttribute("href", `${href}?v=${version}`);
  });
})();

async function init() {
  const hotspots = await loadHotspots();
  renderHotspots(hotspots);
  setupUI(hotspots);
}

init();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}