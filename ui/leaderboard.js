import { playerTokens } from './dom.js';

export function initLeaderboard(game, hotspots) {
  const lb = document.getElementById('leaderboard');
  const toggle = document.getElementById('leaderboard-toggle');
  const content = document.getElementById('leaderboard-content');

  toggle.addEventListener('click', () => {
    lb.classList.toggle('open');
    toggle.textContent = lb.classList.contains('open') ? "⮜" : "⮞";
  });

function update() {
  const players = game.getPlayers();
  const maxField = hotspots.length - 1; // 99 ignorieren

  // 🔥 Sortierung: wer am weitesten ist, steht oben
  const sorted = [...players].sort((a, b) => b.position - a.position);

  content.innerHTML = sorted.map(p => {
    const pos = p.position;
    const remaining = Math.max(0, maxField - pos);

    // 🔥 Farbcodierung: Spielerfarbe als kleiner Kreis
    const colorClass = p.colorClass.replace("player-", "");

    return `
      <div class="leaderboard-player">
        <div class="leaderboard-player-name">
          <span class="lb-color ${colorClass}"></span>
          ${p.name}
        </div>
        <div>Feld: ${pos}</div>
        <div>Bis Ziel: ${remaining}</div>
      </div>
    `;
  }).join('');
}


  return { update };
}
