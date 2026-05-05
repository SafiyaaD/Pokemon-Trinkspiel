// game.js

export function createGame({ hotspots, onMoveStep, onLand, onTurnChange }) {
  const state = {
    hotspots,
    players: [],
    currentPlayerIndex: 0,
    isAnimating: false,
    halfUntilPlayer: null
  };

  // 🔥 WICHTIG: Callbacks speichern!
  const callbacks = { onMoveStep, onLand, onTurnChange };


  // -------------------------------------------------------
  // Spieler setzen
  // -------------------------------------------------------
  function setPlayers(players) {
    state.players = players.map((p, index) => ({
      id: index,
      name: p.name || `Spieler ${index + 1}`,
      colorClass: `player-${index}`,
      position: 1,
      hasMoved: false
    }));

    state.currentPlayerIndex = 0;

    // 🔥 WICHTIG: Callback über callbacks aufrufen!
    callbacks.onTurnChange?.(state.players[state.currentPlayerIndex]);
  }


  // -------------------------------------------------------
  // Aktueller Spieler
  // -------------------------------------------------------
  function getCurrentPlayer() {
    return state.players[state.currentPlayerIndex];
  }


  // -------------------------------------------------------
  // Würfeln (inkl. Gate)
  // -------------------------------------------------------
function roll() {
  if (state.isAnimating || state.players.length === 0) return;

  const player = getCurrentPlayer();
  const rolledValue = Math.floor(Math.random() * 6) + 1;
  let moveValue = rolledValue;

  // 🔥 DoubleNextRoll → Bewegung verdoppeln, aber Wurf bleibt sichtbar
  if (player.doubleNextRoll) {
    moveValue = rolledValue * 2;
    player.doubleNextRoll = false;
  }

  // 🔥 Halbierungsregel (gilt für alle außer den Auslöser)
  if (state.halfUntilPlayer !== null && player.id !== state.halfUntilPlayer) {
    moveValue = Math.ceil(moveValue / 2);
  }

  // 🔥 MULTI-GATE (neue Regel)
  if (player.multiGate) {
    const mg = player.multiGate;
    const hit = mg.allowed.includes(rolledValue);

    if (hit) {
      mg.progress++;
    }

    const done = mg.progress >= mg.required;

    // Wenn fertig → MultiGate entfernen
    if (done) {
      player.multiGate = null;
    }

    return {
      value: rolledValue,
      gateFail: false,
      multiGate: {
        hit,
        progress: mg.progress,
        required: mg.required,
        allowed: mg.allowed,
        done
      }
    };
  }

  // 🔥 Gate-Fail prüft den ORIGINAL-Wurf, NICHT den modifizierten Move
  if (player.gate && !player.gate.includes(rolledValue)) {
    return { value: rolledValue, gateFail: true };
  }

  // 🔥 GateSuccess → Gate verbrauchen
  if (player.gate && player.gate.includes(rolledValue)) {
    player.gate = null;
  }

  // 🔥 Bewegung mit moveValue
  moveCurrentPlayer(moveValue);

  // UI bekommt den ORIGINAL-Wurf
  return { value: rolledValue, gateFail: false };
}

  // -------------------------------------------------------
  // Spieler bewegen (inkl. Stop-Felder)
  // -------------------------------------------------------
  function moveCurrentPlayer(steps) {

    if (steps === 0) {
      const player = getCurrentPlayer();
      const fieldId = player.position;

      state.isAnimating = false;

      callbacks.onLand?.(player, fieldId);
      return;
    }
    
    const player = getCurrentPlayer();
    const maxField = state.hotspots.length;

    let target = player.position + steps;

    if (target < 1) target = 1;
    if (target > maxField) target = maxField;

    let path = [];

    if (steps > 0) {
      for (let i = player.position + 1; i <= target; i++) {
        path.push(i);
      }
    } else {
      for (let i = player.position - 1; i >= target; i--) {
        path.push(i);
      }
    }

    // STOP-Felder abfangen
for (let i = 0; i < path.length; i++) {
  const fieldId = path[i];
  const hotspot = state.hotspots.find(h => h.id === fieldId);

  if (!hotspot?.rules) continue;

  const rules = Array.isArray(hotspot.rules) ? hotspot.rules : [hotspot.rules];
  const isStopField = rules.some(r => r.type === "stop");

  if (isStopField) {

    // Spieler darf Stop ignorieren?
    if (player.ignoreNextStop) {
      player.ignoreNextStop = false; // Fähigkeit verbraucht
      continue; // weiterlaufen
    }

    // normaler Stop → Bewegung abbrechen
    path = path.slice(0, i + 1);  // ← WICHTIG: Pfad kürzen, nicht ersetzen
    break;
  }
}


// -------------------------------------------------------
    // Animation starten
    // -------------------------------------------------------
    state.isAnimating = true;
    let index = 0;

    const tick = () => {
      const fieldId = path[index];

      callbacks.onMoveStep?.(player, fieldId);
      index++;

      if (index < path.length) {
        setTimeout(tick, 300);
      } else {
        // Spieler landet auf finalem Feld (Stop berücksichtigt!)
        const finalField = path[path.length - 1];

        player.position = finalField;
        player.hasMoved = true;
        state.isAnimating = false;

        // Group wirkt nur solange man draufsteht
        player.currentGroup = null;

        callbacks.onLand?.(player, finalField);
      }
    };


    tick();
  }


  // -------------------------------------------------------
  // Spielerwechsel
  // -------------------------------------------------------
  function nextPlayer() {
    state.currentPlayerIndex =
      (state.currentPlayerIndex + 1) % state.players.length;

    // 🔥 WICHTIG: callbacks benutzen!
    callbacks.onTurnChange?.(state.players[state.currentPlayerIndex]);
  }


  // -------------------------------------------------------
  // Manuelles Landen (Teleport etc.)
  // -------------------------------------------------------
  function triggerLand(player, fieldId) {
    callbacks.onLand?.(player, fieldId);
  }


  // -------------------------------------------------------
  // API
  // -------------------------------------------------------
  return {
    state,
    callbacks,
    setPlayers,
    getPlayers() { return state.players; },
    getCurrentPlayer,
    roll,
    moveCurrentPlayer,
    triggerLand,
    nextPlayer
  };
}