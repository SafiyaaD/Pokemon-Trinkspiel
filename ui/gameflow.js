// ui/gameflow.js
import { createGame } from '../game/game.js';
import { currentPlayerLabel, playerTokens } from './dom.js';

import { zoomToPlayer } from './zoom.js';
import { showPopup } from './popup.js';
import { movePlayerToken, restackField } from './tokens.js';
import { askForPokemon } from './pokemon.js';
import { initControls } from './controls.js';
import { initSetup } from './setup.js';
import { initLeaderboard } from './leaderboard.js';

import { germanTexts } from '../data/text.js';
import { applyRule } from './rules.js';
import { GROUP_RULES } from "./grouprules.js";
import { updatePopupText, showPopupOkButton, hidePopupOkButton, enableDiceButton, disableDiceButton, setPopupAction} from "./popup.js";

const TYPE_ADV = {
  schiggy: ["glumanda"],
  glumanda: ["bisasam"],
  bisasam: ["schiggy"],
  pikachu: ["schiggy"]
};


export function setupUI(hotspots) {

  let leaderboard = null;

  const game = createGame({ hotspots });

  // ⬇️ HIER den Hook einfügen
const originalNextPlayer = game.nextPlayer.bind(game);

game.nextPlayer = () => {

  // Erst normal weiter
  originalNextPlayer();

  const player = game.getCurrentPlayer();

  // Skip erst NACH allen anderen Popups
  setTimeout(() => {

    if (player.skipRounds > 0) {

      const drink = player.drinkValue;

      // WICHTIG: action IMMER direkt übergeben → pendingAction wird gesetzt
      const action = () => {
        player.skipRounds--;

        if (player.skipRounds === 0) {
          player.drinkValue = null;
        }

        game.nextPlayer();
        leaderboard?.update();
      };

      showPopup(
        drink ? "Trinken & Aussetzen!" : "Aussetzen!",
        drink
          ? `
              Du musst <b>${drink}</b> Schlücke trinken!<br><br>
              (Noch ${player.skipRounds} Runde(n) aussetzen)
            `
          : `
              Du setzt <b>${player.skipRounds}</b> Runde(n) aus!
            `,
        action   // <-- WICHTIG: pendingAction wird hier gesetzt
      );
    }

  }, 0); // <-- garantiert: Skip-Popup kommt NACH allen anderen Popups
};
  // ⬆️ bis hier

  leaderboard = initLeaderboard(game, hotspots);

  initControls(game, playerTokens);
  initSetup(game, hotspots, leaderboard);

  game.callbacks.onMoveStep = (player, fieldId) => {
    movePlayerToken(player, fieldId, hotspots);
    zoomToPlayer(player, playerTokens);
    leaderboard?.update();

        // -------------------------------------------------------
        // GROUP: Icon entfernen/setzen beim Betreten eines neuen Feldes
        // -------------------------------------------------------
        const hotspot = hotspots[fieldId - 1];
        let groupId = null;

        if (hotspot && Array.isArray(hotspot.rules)) {
          const groupRule = hotspot.rules.find(r => r.type === "group");
          if (groupRule) {
            groupId = groupRule.groupId;
          }
        }

        // Token-Element holen (kann am Anfang noch NICHT existieren!)
        const tokenIconEl = player.tokenElement
          ? player.tokenElement.querySelector(".group-icon")
          : null;

        if (groupId) {
          player.currentGroup = groupId;

          if (tokenIconEl) {
            const icon = GROUP_RULES[groupId]?.icon || "";
            tokenIconEl.dataset.groupIcon = icon;
          }

        } else {
          // Keine Group → Icon entfernen
          if (tokenIconEl) {
            tokenIconEl.dataset.groupIcon = "";
          }
          player.currentGroup = null;
        }
  };

game.callbacks.onLand = (player, fieldId) => {

  // FIX: Spielerposition aktualisieren
  player.position = fieldId;

  zoomToPlayer(player, playerTokens);

  const hotspot = hotspots[fieldId - 1];
  const data = germanTexts[fieldId];

  const fieldTitle = data?.title ?? "Unbenanntes Feld";
  const fieldText  = data?.text  ?? "Kein deutscher Text hinterlegt.";

// -------------------------------------------------------
// 0) GLOBAL: Kampf prüfen BEVOR Hotspot-Regeln
// -------------------------------------------------------

// --- Replace finishTurn with this ---
function finishTurn() {
  player._battleReturning = true;

  setTimeout(() => {
    // WICHTIG: fighter weiterverarbeiten, nicht currentPlayer
    game.callbacks.onLand(player, fieldId);
  }, 0);
}

// Wenn Kampf bereits abgehandelt wurde → NICHT nochmal auslösen
if (!player._battleDone && !player._battleReturning) {

  const playersHere = game.getPlayers().filter(p => p.position === fieldId);

  // 🔹 Fall 1: Genau 2 Spieler → einfacher Kampf
  if (playersHere.length === 2) {

    const [p1, p2] = playersHere;

    const p1HasAdv = TYPE_ADV[p1.type]?.includes(p2.type);
    const p2HasAdv = TYPE_ADV[p2.type]?.includes(p1.type);

    function rollFor(hasAdv) {
      const r1 = Math.floor(Math.random() * 6) + 1;
      if (!hasAdv) return { rolls: [r1], final: r1 };
      const r2 = Math.floor(Math.random() * 6) + 1;
      return { rolls: [r1, r2], final: Math.max(r1, r2) };
    }

    const r1 = rollFor(p1HasAdv);
    const r2 = rollFor(p2HasAdv);

    let winner = null;
    if (r1.final > r2.final) winner = p1;
    if (r2.final > r1.final) winner = p2;

    const text = `
      <b>${p1.name}</b> würfelt: ${r1.rolls.join(", ")} → <b>${r1.final}</b> ${p1HasAdv ? "(Vorteil)" : ""}<br>
      <b>${p2.name}</b> würfelt: ${r2.rolls.join(", ")} → <b>${r2.final}</b> ${p2HasAdv ? "(Vorteil)" : ""}<br><br>
      ${winner ? `<b>${winner.name}</b> gewinnt den Kampf!` : "Unentschieden!"}
    `;

    player._battleDone = true;

    showPopup("Kampf!", "Verlierer Trinkt 2!<br>"+ text, () => {
      leaderboard?.update();
      finishTurn();
    });

    return;
  }

  // 🔹 Fall 2: Mehr als 2 Spieler → neuer Spieler kämpft gegen alle anderen
  if (playersHere.length > 2) {

    const fighter = player; // ← fixiere den Kämpfer
    const opponents = [...playersHere.filter(p => p !== fighter)]; // ← fixiere Gegnerliste


    if (!player._battleStartedHere) {

      player._battleDone = false;
      player._battleStartedHere = true;

      let index = 0;

      function rollFor(hasAdv) {
        const r1 = Math.floor(Math.random() * 6) + 1;
        if (!hasAdv) return { rolls: [r1], final: r1 };
        const r2 = Math.floor(Math.random() * 6) + 1;
        return { rolls: [r1, r2], final: Math.max(r1, r2) };
      }

      function nextFight() {

        // Alle Kämpfe fertig → jetzt EINMAL sauber beenden
        if (index >= opponents.length) {
          player._battleStartedHere = false;
          player._battleDone = true
          finishTurn();
          return;
        }

        const p1 = fighter;
        const p2 = opponents[index++];

        const p1HasAdv = TYPE_ADV[p1.type]?.includes(p2.type);
        const p2HasAdv = TYPE_ADV[p2.type]?.includes(p1.type);

        const r1 = rollFor(p1HasAdv);
        const r2 = rollFor(p2HasAdv);

        let winner = null;
        if (r1.final > r2.final) winner = p1;
        if (r2.final > r1.final) winner = p2;

        const text = `
          <b>${p1.name}</b> würfelt: ${r1.rolls.join(", ")} → <b>${r1.final}</b> ${p1HasAdv ? "(Vorteil)" : ""}<br>
          <b>${p2.name}</b> würfelt: ${r2.rolls.join(", ")} → <b>${r2.final}</b> ${p2HasAdv ? "(Vorteil)" : ""}<br><br>
          ${winner ? `<b>${winner.name}</b> gewinnt den Kampf!</b>` : "Unentschieden!"}
        `;

        showPopup(`Kampf gegen ${p2.name}!`, text, () => {
          console.log("Popup für Kampf gegen", p2.name, "geschlossen; rufe nextFight()");
          leaderboard?.update();
          nextFight();
        });
      }

      nextFight();
      return;
    }
  }
}

// Beim ersten Eintritt in onLand → Flag zurücksetzen
if (!player._battleStartedHere) {
    player._battleDone = false;
    player._battleReturning = false;
}

// -------------------------------------------------------
// GROUP: Regel sofort beim Betreten ausführen
// -------------------------------------------------------
const hotspotGroupRule =
  hotspot && Array.isArray(hotspot.rules)
    ? hotspot.rules.find(r => r.type === "group")
    : null;

if (hotspotGroupRule) {
  const groupId = hotspotGroupRule.groupId;
  player.currentGroup = groupId;

  const groupRule = GROUP_RULES[groupId];

  if (groupRule?.onEnter) {

    // Group-Popup öffnen → danach weiter mit continueAfterGroup()
    groupRule.onEnter(player, game, () => {
      continueAfterGroup();
    });

    return; // ← WICHTIG: onLand hier pausieren
  }


} else {
  // Group verlassen → Icon entfernen
  const tokenIconEl = player.tokenElement
    ? player.tokenElement.querySelector(".group-icon")
    : null;

  if (tokenIconEl) tokenIconEl.dataset.groupIcon = "";
  player.currentGroup = null;

  // ❗ WICHTIG: Wenn KEINE Group → direkt Hotspot-Flow starten
  continueAfterGroup();
  return;
}

// === GAME END HANDLER ===
function triggerGameEnd() {
  const player = game.getCurrentPlayer();

  const ranking = [...game.getPlayers()].sort((a, b) => b.position - a.position);

  const podiumHtml = `
    <div style="display:flex; justify-content:center; gap:20px; margin-top:10px;">

      <div style="text-align:center;">
        <div style="font-size:32px;">🥈</div>
        <div><b>${ranking[1]?.name ?? "-"}</b></div>
      </div>

      <div style="text-align:center;">
        <div style="font-size:40px;">🥇</div>
        <div><b>${ranking[0].name}</b></div>
      </div>

      <div style="text-align:center;">
        <div style="font-size:32px;">🥉</div>
        <div><b>${ranking[2]?.name ?? "-"}</b></div>
      </div>

    </div>
  `;

  showPopup(
    "🎉 Spiel beendet! 🎉",
    `
      <div style="font-size:22px; margin-bottom:10px;">
        <b>${player.name}</b> ist Pokémon‑Meister!
      </div>

      ${podiumHtml}

      <br><br>
      <div style="font-size:18px;">
        <b>Kompletter Endstand:</b><br>
        ${ranking.map((p, i) => `${i + 1}. ${p.name}`).join("<br>")}
      </div>
    `,
    () => location.reload()
  );

  // ⭐ Konfetti starten – direkt nach Popup
  if (typeof startConfetti === "function") {
    setTimeout(() => startConfetti(), 50);
  }
}


// -------------------------------------------------------
// AFTER GROUP POPUP: Rest von onLand abarbeiten
// -------------------------------------------------------
function continueAfterGroup() {

  // -------------------------------------------------------
  // 1) Hotspot-Regeln prüfen
  // -------------------------------------------------------
  if (hotspot?.rules) {
    const handled = applyRule(hotspot.rules, player, game);

//
// === BACK ===
//
if (handled?.type === "back") {

  showPopup(
    fieldTitle,     // ⭐ Titel des aktuellen Feldes
    fieldText,      // ⭐ Text des aktuellen Feldes
    null,           // ⭐ kein OK-Button
    {
      hideOk: true, // ⭐ OK-Button ausblenden (wie bei chooseRerollOrIgnoreStop)
      playerSelect: game.getPlayers(),

      onSelect: (selectedPlayer) => {

        const steps = handled.steps;
        const newPos = Math.max(1, selectedPlayer.position - steps);

        selectedPlayer.position = newPos;
        game.callbacks.onMoveStep(selectedPlayer, newPos);

        leaderboard?.update();
        game.nextPlayer();
      }
    }
  );

  return;
}


    //
// === GIVE GATE TO PLAYER ===
//
if (handled?.type === "giveGateToPlayer") {

  showPopup(
    fieldTitle,   // ⭐ Titel des aktuellen Feldes
    fieldText,    // ⭐ Text des aktuellen Feldes
    null,         // ⭐ kein OK-Button
    {
      hideOk: true,               // ⭐ OK-Button ausblenden
      playerSelect: game.getPlayers(),

      onSelect: (selectedPlayer) => {

        selectedPlayer.gate = handled.requiredRolls;

        showPopup(
          "Blockiert!",
          `
            <b>${selectedPlayer.name}</b> ist blockiert,<br>
            bis er eine der folgenden Zahlen würfelt:<br>
            <b>${handled.requiredRolls.join(", ")}</b>
          `,
          () => {
            game.nextPlayer();
            leaderboard?.update();
          }
        );
      }
    }
  );

  return;
}


    //
    // === REROLL ===
    //
    if (handled?.type === "reroll") {
      showPopup(
        fieldTitle,
        fieldText + "<br><br><b>Du bist nochmal dran!</b>",
        () => {
          leaderboard?.update();
        }
      );
      return;
    }

//
// === STOP ===
//
if (handled?.type === "stop") {
  // ⭐ Normales STOP-Feld
  if (fieldId === 72) {
    showPopup(
      fieldTitle,
      "<b>Stopp!</b><br><br>" + fieldText,
      () => triggerGameEnd()
    );
    return;
  }

  showPopup(
    fieldTitle,
    "<b>Stopp!</b><br><br>" + fieldText,
    () => game.nextPlayer()
  );
  return;
}


    //
    // === TELEPORT ===
    //
    if (handled?.type === "teleport") {
      showPopup(
        fieldTitle,
        fieldText + "<br><br><b>Teleportiert!</b>",
        () => {
          game.nextPlayer();
          leaderboard?.update();
        }
      );
      return;
    }

    //
    // === SKIP ===
    //
    if (handled?.type === "skip") {
      showPopup(
        fieldTitle,
        fieldText,
        () => {
          game.nextPlayer();
          leaderboard?.update();
        }
      );
      return;
    }

    //
    // === GATE ===
    //
    if (handled?.type === "gate") {
      showPopup(
        fieldTitle,
        fieldText + `<br><br><b> Du sitzt fest. Du brauchst 1 Treffer (${handled.requiredRolls.join(" oder ")})!</b>`,
        () => {
          game.nextPlayer();
          leaderboard?.update();
        }
      );
      return;
    }

    //
    // === MULTI GATE ===
    //
    if (handled?.type === "multiGate") {
      showPopup(
        fieldTitle,
        fieldText + `<br><br><b>Blockiert: Du brauchst ${handled.requiredCount} Treffer (${handled.allowedRolls.join(", ")})!</b>`,
        () => {
          game.nextPlayer();
          leaderboard?.update();
        }
      );
      return;
    }

    //
    // === DOUBLE NEXT ROLL ===
    //
    if (handled?.type === "doubleNextRoll") {
      showPopup(
        fieldTitle,
        fieldText + "<br><br><b>Nächster Wurf zählt doppelt!</b>",
        () => {
          game.nextPlayer();
          leaderboard?.update();
        }
      );
      return;
    }

    //
    // === CHOOSE REROLL OR IGNORE NEXT STOP ===
    //
    if (handled?.type === "chooseRerollOrIgnoreStop") {

      showPopup(
        fieldTitle,
        `
          ${fieldText}<br><br>
          <b>Wähle eine Option:</b><br>
          • 🎲 Nochmal würfeln<br>
          • ➡️ Nächste Arena übersrpingen
        `,
        null,
        {
          hideOk: true, // ← OK-Button ausblenden
          numberSelect: ["🎲 Nochmal würfeln", "➡️ Arena überspringen"],

          onSelect: (choice) => {

            // OPTION A: REROLL
            if (choice === "🎲 Nochmal würfeln") {
              showPopup(
                fieldTitle,
                "<b>Huch... die Entwicklung wurde abgebrochen</b>",
                () => {
                  leaderboard?.update();
                }
              );
              return;
            }

            // OPTION B: STOP IGNORIEREN
            if (choice === "➡️ Arena ignorieren") {
              player.ignoreNextStop = true;

              showPopup(
                fieldTitle,
                "<b>Hurra, dein Pokemon hat sich weiterentwickelt!</b>",
                () => {
                  game.nextPlayer();
                  leaderboard?.update();
                }
              );
            }
          }
        }
      );


      return;
    }


    //
    // === HALF NEXT ROUND ===
    //
    if (handled?.type === "halfNextRound") {
      game.state.halfUntilPlayer = player.id;

      showPopup(
        fieldTitle,
        fieldText + "<br><br><b>Bis zu deinem nächsten Zug sind alle Würfe halbiert (aufgerundet)!</b>",
        () => {
          game.nextPlayer();
          leaderboard?.update();
        }
      );
      return;
    }

    //
    // === CHANGE POKEMON ===
    //
    if (handled?.type === "changePokemon") {

      const token = playerTokens.get(player.id);
      if (token) {
        token.className = `player ${player.colorClass}`;

        const img = token.querySelector("img");
        if (img && player.pokemonIcon) {
          img.src = player.pokemonIcon;
        }
      }

      showPopup(
        fieldTitle,
        fieldText + "<br><br><b>Dein Starter ist jetzt Pikachu!</b>",
        () => {
          game.nextPlayer();
          leaderboard?.update();
        }
      );
      return;
    }

//
// === RANDOM FIELD TEXT ===
//
if (handled?.type === "randomFieldText") {

  let randomId;

  while (true) {
    randomId = Math.floor(Math.random() * 72) + 1;

    if (randomId === fieldId) continue;
    if (randomId === 99) continue;

    const hs = hotspots[randomId - 1];
    const hasRule = hs?.rules && Object.keys(hs.rules).length > 0;

    if (hasRule) continue;   // ⭐ Felder mit Regeln ausschließen

    break;
  }

  const randomData  = germanTexts[randomId];
  const randomTitle = randomData?.title ?? "Zufälliges Feld";
  const randomText  = randomData?.text  ?? "Kein Text vorhanden.";

  showPopup(
    fieldTitle,
    `
      ${fieldText}
      <br><br>
      <b>Zufälliges anderes Feld (${randomId}):</b><br>
      <i>${randomTitle}</i><br>
      ${randomText}
    `,
    () => {
      game.nextPlayer();
      leaderboard?.update();
    }
  );

  return;
}

    //
    // === DOUBLE ROLL SKIP + DRINK ===
    //
    if (handled?.type === "doubleRollSkipDrink") {
      // (dein kompletter Block bleibt unverändert)
      let firstDone = false;
      let skipRounds = 0;

      function rollPopup() {
        const baseText = !firstDone
          ? `
            ${fieldText}<br><br>
            <b>Erster Wurf:</b> Anzahl der Runden, die du aussetzen musst.
          `
          : `
            Du setzt <b>${skipRounds}</b> Runde(n) aus.<br><br>
            <b>Zweiter Wurf:</b> Bestimmt, wie viele Schlücke du trinken musst.
          `;

        showPopup(
          "Würfeln!",
          baseText,
          null,
          {
            showDiceButton: true,

            onDice: (roll) => {

              if (!firstDone) {
                firstDone = true;
                skipRounds = roll;
                player.skipRounds = skipRounds;

                updatePopupText(`
                  ${fieldText}<br><br>
                  <b>Erster Wurf:</b> Anzahl der Runden, die du aussetzen musst.
                  <br><br>
                  <b>Gewürfelt: ${roll}</b><br>
                  Du setzt <b>${skipRounds}</b> Runde(n) aus.
                  <br><br>
                  Klicke OK für den zweiten Wurf.
                `);

                showPopupOkButton();
                setPopupAction(() => rollPopup());
                return;
              }

              player.drinkValue = roll;

              updatePopupText(`
                <b>Zweiter Wurf:</b> Schlücke zum Trinken.
                <br><br>
                <b>Gewürfelt: ${roll}</b><br>
                Du musst <b>${roll}</b> Schlücke trinken!
              `);

              showPopupOkButton();
              setPopupAction(() => {
                game.nextPlayer();
                leaderboard?.update();
              });
            }
          }
        );
      }

      rollPopup();
      return;
    }

//
// === THREE ROLLS NEED 5 OR 6 ===
//
if (handled?.type === "threeRolls") {

  let rolls = [];
  let rollCount = 0;

  function rollPopup() {

    showPopup(
      "3× Würfeln!",
      `
        Du würfelst bis zu <b>3×</b>.<br>
        Sobald eine <b>5</b> oder <b>6</b> fällt, hast du MissinNo gefangen.<br>
        Wenn nicht, wirst du nach Alabastia teleportiert!
        <br><br>
        Bisherige Würfe: <b>${rolls.join(", ") || "-"}</b>
      `,
      null,
      {
        showDiceButton: true,

        onDice: (roll) => {

          rolls.push(roll);
          rollCount++;

          // Sofort Erfolg?
          if (roll === 5 || roll === 6) {

            updatePopupText(`
              <b>Erfolg!</b><br>
              Du hast eine <b>${roll}</b> gewürfelt.<br><br>
              Deine Reise geht normal weiter.
            `);

            showPopupOkButton();
            setPopupAction(() => {
              game.nextPlayer();
              leaderboard?.update();
            });

            return;
          }

          // Noch keine 5/6 → aber noch Würfe übrig?
          if (rollCount < 3) {

            updatePopupText(`
              Du würfelst bis zu <b>3×</b>.<br>
              Bisher keine 5 oder 6.
              <br><br>
              <b>Gewürfelt: ${roll}</b><br>
              Bisherige Würfe: <b>${rolls.join(", ")}</b>
              <br><br>
              Klicke OK für den nächsten Wurf.
            `);

            showPopupOkButton();
            setPopupAction(() => rollPopup());
            return;
          }

          // 3 Würfe vorbei → kein Erfolg
          updatePopupText(`
            <b>Fehlschlag!</b><br>
            Keine <b>5</b> oder <b>6</b> dabei.<br><br>
            Du wirst nach <b>Alabastia</b> teleportiert!
          `);

          showPopupOkButton();
          setPopupAction(() => {

            // Position setzen
            player.position = 1;

            // Token visuell bewegen
            game.callbacks.onMoveStep(player, 1);

            // Mini-Delay, damit UI rendern kann
            setTimeout(() => {
              game.triggerLand(player, 1);
              leaderboard?.update();
            }, 50);
          });
        }
      }
    );
  }

  rollPopup();
  return;
}


    //
    // === GUESS ROLL ===
    //
    if (handled?.type === "guessRoll") {
      // (dein kompletter Block bleibt unverändert)
      let chosen = null;

      showPopup(
        fieldTitle,
        `
          ${fieldText}<br><br>
          <b>Wähle eine Zahl (1–6):</b>
        `,
        null,
        {
          numberSelect: [1, 2, 3, 4, 5, 6],
          onSelect: (num) => {
            chosen = num;

            showPopup(
              "Würfeln!",
              `
                Du hast <b>${chosen}</b> gewählt.<br><br>
                Wenn du richtig liegst, bist du nochmal dran.<br>
                Wenn nicht, ist der nächste Spieler dran und du Trinkst 2.
              `,
              null,
              {
                showDiceButton: true,
                onDice: (roll) => {

                  if (roll === chosen) {
                    leaderboard?.update();
                  } else {
                    game.nextPlayer();
                    leaderboard?.update();
                  }
                }
              }
            );
          }
        }
      );

      return;
    }

    //
    // === ROLL UNTIL ODD ===
    //
    if (handled?.type === "rollUntilOdd") {
      // (dein kompletter Block bleibt unverändert)
      let evenCount = 0;

      function rollPopup() {
        showPopup(
          "Würfeln!",
          `
            Du würfelst so lange, bis eine <b>ungerade</b> Zahl kommt.</b><br>
            Bisher: <b>${evenCount}</b> gerade Zahl(en).
          `,
          null,
          {
            showDiceButton: true,

            onDice: (roll) => {

              if (roll % 2 === 0) {
                evenCount++;

                updatePopupText(`
                  Du würfelst so lange, bis eine <b>ungerade</b> Zahl kommt.</b><br>
                  Bisher: <b>${evenCount}</b> gerade Zahl(en).
                  <br><br>
                  <b>Gewürfelt: ${roll}</b> (gerade)
                  <br><br>
                  Klicke OK zum Weiterwürfeln.
                `);

                showPopupOkButton();

                setPopupAction(() => rollPopup());
                return;
              }

              updatePopupText(`
                <b>Gewürfelt: ${roll}</b> (ungerade)
                <br><br>
                Insgesamt hast du <b>${evenCount}</b> mal eine gerade Zahl gewürfelt.<br>
                Trinke <b>${evenCount*2}</b> Schlücke.
              `);

              showPopupOkButton();

              setPopupAction(() => {
                game.nextPlayer();
                leaderboard?.update();
              });
            }
          }
        );
      }

      rollPopup();
      return;
    }

    //
    // === DICE POPUP ===
    //
    if (handled?.type === "dicePopup") {
      leaderboard?.update();

      let rolled = null;

      showPopup(
        fieldTitle,
        `
          ${fieldText}<br><br>
        `,
        () => {
          if (rolled == null) return;

          const effects = handled.effects || [];
          const effect = effects.find(e => e.roll === rolled);

          if (effect) {
            if (effect.action === "skip") {
              player.skipRounds = effect.rounds;
            }

            if (effect.action === "reroll") {
              return;
            }
          }

          game.nextPlayer();
        },
        {
          showDiceButton: true,
          onDice: (roll) => {
            rolled = roll;
          }
        }
      );

      return;
    }

    //
    // === END TURN ===
    //
    if (handled === "endTurn") {
      leaderboard?.update();
      game.nextPlayer();
      return;
    }
  }

  // -------------------------------------------------------
  // 2) Standard: Feld-Popup → danach Spielerwechsel
  // -------------------------------------------------------
  showPopup(
    fieldTitle,
    fieldText,
    () => {
      game.nextPlayer();
      leaderboard?.update();
    }
  );
}
}

game.callbacks.onTurnChange = (player) => {

  zoomToPlayer(player, playerTokens);

  // -------------------------------------------------------
  // ⭐ GROUP: Regel am Anfang des Zugs ausführen
  // -------------------------------------------------------
  const groupId = player.currentGroup;
  const groupRule = GROUP_RULES[groupId];

  if (groupRule?.onTurn) {

    // Turn pausieren, aber NICHT abbrechen
    groupRule.onTurn(player, game, () => {
      runTurnStartUI(player);
    });

    return;
  }

  runTurnStartUI(player);
};

function runTurnStartUI(player) {
  currentPlayerLabel.textContent = player.name;

  playerTokens.forEach((t, id) => {
    t.style.zIndex = id === player.id ? 999 : 900;
  });

  if (game.state.halfUntilPlayer === player.id) {
    game.state.halfUntilPlayer = null;
  }

  askForPokemon(player);
  restackField(player.position, hotspots);
  leaderboard?.update();
}

function startConfetti() {
  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "99999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const w = canvas.width = window.innerWidth;
  const h = canvas.height = window.innerHeight;

  const pokeballs = [];

  // Pokéball zeichnen
  function drawPokeball(x, y, size, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Außenkreis
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();

    // Obere Hälfte rot
    ctx.beginPath();
    ctx.arc(0, 0, size, Math.PI, 0);
    ctx.fillStyle = "#ff1c1c";
    ctx.fill();

    // Schwarzer Mittelstreifen
    ctx.fillStyle = "black";
    ctx.fillRect(-size, -size * 0.15, size * 2, size * 0.3);

    // Weißer Mittelkreis
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();

    // Schwarzer Rand
    ctx.lineWidth = size * 0.1;
    ctx.strokeStyle = "black";
    ctx.stroke();

    ctx.restore();
  }

  // Pokébälle erzeugen
  for (let i = 0; i < 40; i++) {
    pokeballs.push({
      x: Math.random() * w,
      y: Math.random() * -h,
      size: 12 + Math.random() * 18,
      speed: 2 + Math.random() * 3,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1
    });
  }

  function animate() {
    ctx.clearRect(0, 0, w, h);

    pokeballs.forEach(p => {
      p.y += p.speed;
      p.rotation += p.rotationSpeed;

      drawPokeball(p.x, p.y, p.size, p.rotation);

      if (p.y > h + p.size) {
        p.y = -p.size;
        p.x = Math.random() * w;
      }
    });

    requestAnimationFrame(animate);
  }

  animate();

  // Konfetti nach 6 Sekunden entfernen
  setTimeout(() => {
    canvas.remove();
  }, 6000);
}


  return game;
}