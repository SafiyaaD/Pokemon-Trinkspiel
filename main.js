// main.js
import { loadHotspots, renderHotspots } from './game/board.js';
import { setupUI } from './ui/gameflow2.js';

async function init() {
  const hotspots = await loadHotspots();
  renderHotspots(hotspots);
  setupUI(hotspots);
}

init();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}