// ui/dom.js
export const boardViewport = document.querySelector('.board-viewport');
export const boardWrapper = document.querySelector('.board-wrapper');

export const popup = document.getElementById('popup');
export const popupTitle = document.getElementById('popup-title');
export const popupText = document.getElementById('popup-text');
export const popupClose = document.getElementById('popup-close');

export const setupModal = document.getElementById('player-setup-modal');
export const setupPlayerCount = document.getElementById('setup-player-count');
export const setupPlayerNames = document.getElementById('setup-player-names');
export const setupStartBtn = document.getElementById('setup-start-btn');

export const pokemonModal = document.getElementById('pokemon-select-modal');
export const pokemonOptions = document.querySelectorAll('.poke-option');

export const controls = document.getElementById('game-controls');
export const currentPlayerLabel = document.getElementById('current-player-label');

export const dice = document.getElementById('dice');
export const rollBtn = document.getElementById('roll-btn');
export const rollResult = document.getElementById('roll-result');
export const zoomResetBtn = document.getElementById('zoom-reset-btn');

export const manualInput = document.getElementById('manual-roll');
export const manualBtn = document.getElementById('manual-roll-btn');
export const manualNextBtn = document.getElementById('manual-next-btn');

export const playerTokens = new Map();
export const chosenPokemon = new Map();
export const fieldOccupants = new Map();