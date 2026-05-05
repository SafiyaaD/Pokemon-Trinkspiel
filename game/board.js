// board.js

import { germanTexts } from '../data/text.js';
import { showPopup } from '../ui/popup.js';


export async function loadHotspots() {
  const res = await fetch("/data/hotspots.json");
  return await res.json();
}

export function renderHotspots(hotspots) {
  const wrapper = document.querySelector('.board-wrapper');

  hotspots.forEach(h => {
    const div = document.createElement('div');
    div.className = 'hotspot';
    div.dataset.id = h.id;

    // Position
    div.style.left = h.left + '%';
    div.style.top = h.top + '%';

    // Größe: entweder aus JSON oder Standard 8%
    const sizeW = h.width ?? 8;
    const sizeH = h.height ?? 8;

    div.style.width = sizeW + '%';
    div.style.height = sizeH + '%';

    // Debug sichtbar
    div.style.background = "rgba(255,0,0,0.25)";
    div.style.outline = "2px solid red";
    div.style.position = "absolute";

    // 🔥 Klick-Handler für Popup + Pulsieren
    div.style.pointerEvents = "auto";
    div.style.cursor = "pointer";

    div.onclick = () => {
      const id = Number(div.dataset.id);
      const data = germanTexts[id];

      // Pulsieren
      div.classList.add("hotspot-pulse");
      setTimeout(() => div.classList.remove("hotspot-pulse"), 400);

      // Popup
      showPopup(
        data?.title ?? "Unbenanntes Feld",
        data?.text ?? "Kein deutscher Text hinterlegt."
      );
    };

    wrapper.appendChild(div);
  });
}

export function getFieldById(hotspots, id) {
  return hotspots.find(h => h.id === id) || null;
}
