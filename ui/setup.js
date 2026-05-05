// ui/setup.js
import {
  setupModal, setupPlayerCount, setupPlayerNames,
  setupStartBtn, controls, playerTokens, boardWrapper
} from './dom.js';

import { movePlayerToken, restackField } from './tokens.js';
import { zoomToFullBoard } from './zoom.js';

export function initSetup(game, hotspots, leaderboard) {

  function renderNameInputs() {
    setupPlayerNames.innerHTML = '';
    const count = Math.max(1, parseInt(setupPlayerCount.value, 10) || 1);

    for (let i = 0; i < count; i++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Spieler ${i + 1}`;
      setupPlayerNames.appendChild(input);
    }
  }

  setupPlayerCount.addEventListener('change', renderNameInputs);
  renderNameInputs();

  setupStartBtn.addEventListener('click', () => {
    const inputs = setupPlayerNames.querySelectorAll('input');
    const players = Array.from(inputs).map((input, index) => ({
      id: index,
      name: input.value.trim() || `Spieler ${index + 1}`,
      colorClass: `player-neutral`
    }));

    game.setPlayers(players);

    players.forEach(p => {
      const token = document.createElement('div');
      token.className = `player ${p.colorClass}`;

      const img = document.createElement('img');
      img.className = "player-icon";
      token.appendChild(img);

      boardWrapper.appendChild(token);
      playerTokens.set(p.id, token);

      movePlayerToken(p, 1, hotspots);
    });

    // 🔥 Startspieler sofort oben setzen
    const active = game.getCurrentPlayer();

    playerTokens.forEach((t, id) => {
      t.style.zIndex = id === active.id ? 999 : 900;
    });

    restackField(active.position, hotspots);

    // 🔥 Leaderboard direkt nach dem Setup aktualisieren
    leaderboard.update();

    setupModal.classList.add('hidden');
    controls.classList.remove('hidden');

    setTimeout(() => zoomToFullBoard(), 50);
  });
}
