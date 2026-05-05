// ui/pokemon.js
import {
  pokemonModal,
  pokemonOptions,
  chosenPokemon,
  playerTokens
} from './dom.js';

let queue = [];
let open = false;

export function askForPokemon(player) {
  if (chosenPokemon.has(player.id)) return;
  queue.push(player);
  processQueue();
}

function processQueue() {
  if (open || queue.length === 0) return;

  const player = queue.shift();
  open = true;

  document.getElementById("pokemon-player-title").textContent =
    `${player.name} wählt sein Pokémon`;

  pokemonModal.classList.remove('hidden');

  pokemonOptions.forEach(opt => {
  opt.onclick = () => {
    const color = opt.dataset.color;
    const spriteUrl = opt.querySelector("img").src;

    const TYPE_MAP = {
      red: "glumanda",
      blue: "schiggy",
      green: "bisasam",
      yellow: "pikachu"
    };

    chosenPokemon.set(player.id, color);
    player.colorClass = `player-${color}`;

    // 🔥 WICHTIG: Typ setzen!
    player.type = TYPE_MAP[color];

    const token = playerTokens.get(player.id);
    if (token) {
      token.className = `player ${player.colorClass}`;
      token.querySelector(".player-icon").src = spriteUrl;
    }

    pokemonModal.classList.add('hidden');
    open = false;
    processQueue();
  };
});
}
