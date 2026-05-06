// ui/controls.js
import {
  rollBtn, dice, rollResult,
  manualInput, manualBtn,
  manualNextBtn, zoomResetBtn
} from './dom.js';

import { zoomToFullBoard, zoomToPlayer } from './zoom.js';
import { showPopup} from './popup.js';
import { germanTexts } from '../data/text.js';

const rotations = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: 0, y: 180 },
  4: { x: 0, y: 90 },
  5: { x: -90, y: 0 },
  6: { x: 90, y: 0 }
};

let zoomReset = false;

export function initControls(game, playerTokens) {

  // -------------------------------------------------------
  // 🎲 Würfel-Animation
  // -------------------------------------------------------
  function animateDice(value) {
    const numberFace = document.querySelector('.face-number');
    const face1 = dice.querySelector('.face-1');

    if (value >= 1 && value <= 6) {
      face1.style.opacity = '1';
      numberFace.style.display = 'none';
      numberFace.style.opacity = '0';

      dice.querySelectorAll('.face').forEach(f => f.style.opacity = '1');

      const preX = 720 + Math.random() * 180;
      const preY = 1080 + Math.random() * 180;

      dice.style.transition = "transform 0.45s cubic-bezier(.25,.8,.25,1)";
      dice.style.transform = `rotateX(${preX}deg) rotateY(${preY}deg)`;

      setTimeout(() => {
        const { x, y } = rotations[value];
        dice.style.transition = "transform 0.35s cubic-bezier(.33,1.4,.4,1)";
        dice.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
      }, 120);

      return;
    }

    numberFace.textContent = value;
    numberFace.style.display = 'flex';
    numberFace.style.opacity = '1';
    face1.style.opacity = '0';

    dice.querySelectorAll('.face:not(.face-1)').forEach(f => {
      f.style.opacity = '1';
    });

    numberFace.style.transform = 'translateZ(48px)';
    dice.style.transition = "transform 0.3s ease";
    dice.style.transform = `rotateX(0deg) rotateY(0deg)`;

    dice.classList.add('rolling');
    setTimeout(() => dice.classList.remove('rolling'), 300);
  }

function rollDice(manualValue = null) {
  let result, gateFail, gateSuccess, multiGate;

  // Automatischer Wurf
  if (manualValue === null) {
    const r = game.roll();

    if (!r) return;
    result = r.value;
    gateFail = r.gateFail;
    gateSuccess = r.gateSuccess;
    multiGate = r.multiGate;
  } 
  // Manuelle Eingabe
  else {
    result = manualValue;
    gateFail = false;
    gateSuccess = false;
    multiGate = null;
  }

  // UI aktualisieren
  manualInput.value = result;
  animateDice(result);
  rollResult.textContent = `Gewürfelt: ${result}`;

  // 🔥 Gate-Fail → Popup + Spielerwechsel
  if (gateFail) {
    const player = game.getCurrentPlayer();
    const fieldId = player.position;
    const data = germanTexts[fieldId];

    const fieldTitle = data?.title ?? "Unbenanntes Feld";
    const fieldText  = data?.text  ?? "Kein deutscher Text hinterlegt.";

    const allowed = player.gate?.join(", ") ?? "-";

    showPopup(
      fieldTitle,
      `
        ${fieldText}<br><br>
        Du hast eine <b>${result}</b> gewürfelt.<br>
        Erlaubt: <b>${allowed}</b>
      `,
      () => {
        game.nextPlayer();
      }
    );
    return;
  }

  // 🔥 Gate-Success → Popup + Feldtext + Spielerwechsel
if (gateSuccess) {
  const player = game.getCurrentPlayer();
  const fieldId = player.position;
  const data = germanTexts[fieldId];

  const fieldTitle = data?.title ?? "Unbenanntes Feld";
  const fieldText  = data?.text  ?? "Kein deutscher Text hinterlegt.";

  // 1) Erfolgsmeldung
  showPopup(
    fieldTitle,
    `Hurra, du hast gewonnen!`,
    () => {

      // 2) Danach Feldtext anzeigen
      showPopup(
        fieldTitle,
        fieldText,
        () => {
          // 3) Danach Spielerwechsel
          game.nextPlayer();
        }
      );

    }
  );

  return;
}

  // 🔥 Multi-Gate → Popup + Spielerwechsel
  if (multiGate) {

    if (!multiGate.done) {
      showPopup(
        "Blockiert!",
        `
          Du bist blockiert, bis du <b>${multiGate.required}</b> Treffer geschafft hast.<br>
          Erlaubte Zahlen: <b>${multiGate.allowed.join(", ")}</b><br><br>

          Gewürfelt: <b>${result}</b><br>
          ${multiGate.hit ? "Treffer!" : "Kein Treffer. Trink 1"}<br><br>

          Fortschritt: <b>${multiGate.progress} / ${multiGate.required}</b><br><br>
          Nächster Spieler ist dran.
        `,
        () => game.nextPlayer()
      );
      return;
    }

    // Gate fertig
    showPopup(
      "Frei!",
      `
        Du hast alle <b>${multiGate.required}</b> Treffer geschafft!<br>
        Du darfst dich ab jetzt wieder normal bewegen.
      `,
      () => game.nextPlayer()
    );
    return;
  }

  // 🔥 Manuelle Eingabe → Move hier auslösen
  if (manualValue !== null) {
    game.moveCurrentPlayer(result);
  }
}


  // -------------------------------------------------------
  // 🖱 Event-Listener
  // -------------------------------------------------------
  rollBtn.addEventListener('click', () => rollDice());
  dice.addEventListener('click', () => rollDice());

  manualBtn?.addEventListener('click', () => {
    const v = parseInt(manualInput.value, 10);
    if (!isNaN(v)) rollDice(v);
  });

  manualNextBtn.addEventListener('click', () => {
    game.nextPlayer();
  });

  zoomResetBtn.addEventListener('click', () => {
    if (zoomReset) zoomToFullBoard();
    else zoomToPlayer(game.getCurrentPlayer(), playerTokens);
    zoomReset = !zoomReset;
  });
}
