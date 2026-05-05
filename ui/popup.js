// ui/popup.js
import { popup, popupTitle, popupText, popupClose } from './dom.js';

let pendingAction = null;

//
// === PUBLIC HELPERS FOR GAMEFLOW ===
//
export function updatePopupText(html) {
  popupText.innerHTML = html;
}

export function showPopupOkButton() {
  popupClose.classList.remove("hidden");
}

export function hidePopupOkButton() {
  popupClose.classList.add("hidden");
}

export function enableDiceButton() {
  const diceBtn = document.getElementById("popup-dice");
  diceBtn.classList.remove("hidden");
  diceBtn.disabled = false;
}

export function disableDiceButton() {
  const diceBtn = document.getElementById("popup-dice");
  diceBtn.classList.add("hidden");
  diceBtn.disabled = true;
}

export function setPopupAction(fn) {
  pendingAction = fn;
}

//
// === MAIN POPUP FUNCTION ===
//
export function showPopup(title, text, action, options = {}) {
  popupTitle.textContent = title;
  popupText.innerHTML = text;

  const extra = document.getElementById("popup-extra");
  extra.innerHTML = "";

  const popupDiceContainer = document.getElementById("popup-dice-container");
  popupDiceContainer.innerHTML = "";

  const diceBtn = document.getElementById("popup-dice");

  // --- GLOBAL RESET ---
  popupClose.classList.add("hidden");
  diceBtn.classList.add("hidden");
  diceBtn.disabled = false;

  // WICHTIG: OK-Button bekommt für DIESES Popup seinen eigenen Handler
  popupClose.onclick = () => {
  popup.classList.add("hidden");

  // 1) zuerst pendingAction ausführen (z. B. rollPopup)
  if (typeof pendingAction === "function") {
    const fn = pendingAction;
    pendingAction = null;
    fn();
    return;
  }

  // 2) falls keine pendingAction → normales action ausführen
  if (typeof action === "function") {
    action();
  }
};


  //
  // === PLAYER SELECTION POPUP ===
  //
  if (options.playerSelect) {
    options.playerSelect.forEach(player => {
      const btn = document.createElement("button");
      btn.textContent = player.name;
      btn.classList.add("popup-player-btn");

      btn.addEventListener("click", () => {
        popup.classList.add("hidden");
        options.onSelect?.(player);
      });

      extra.appendChild(btn);
    });
  }

  //
  // === NUMBER SELECTION POPUP ===
  //
  if (options.numberSelect) {
    popupClose.classList.add("hidden");

    const container = document.createElement("div");
    container.className = "number-select";

    options.numberSelect.forEach(num => {
      const btn = document.createElement("button");
      btn.textContent = num;
      btn.classList.add("number-btn");

      btn.addEventListener("click", () => {
        options.onSelect?.(num);
      });

      container.appendChild(btn);
    });

    extra.appendChild(container);
  }

  //
  // === DICE POPUP ===
  //
  if (options.showDiceButton) {

    diceBtn.classList.remove("hidden");
    popupDiceContainer.classList.remove("hidden");

    const uiDice = document.getElementById("dice");
    const popupDice = uiDice.cloneNode(true);

    popupDice.id = "";
    popupDice.style.position = "relative";
    popupDice.style.pointerEvents = "none";

    const size = 70;
    const z = size / 2;

    popupDice.style.width = size + "px";
    popupDice.style.height = size + "px";
    popupDice.style.margin = "10px auto";

    popupDice.querySelector(".face-1").style.transform = `rotateY(0deg) translateZ(${z}px)`;
    popupDice.querySelector(".face-2").style.transform = `rotateY(90deg) translateZ(${z}px)`;
    popupDice.querySelector(".face-3").style.transform = `rotateY(180deg) translateZ(${z}px)`;
    popupDice.querySelector(".face-4").style.transform = `rotateY(-90deg) translateZ(${z}px)`;
    popupDice.querySelector(".face-5").style.transform = `rotateX(90deg) translateZ(${z}px)`;
    popupDice.querySelector(".face-6").style.transform = `rotateX(-90deg) translateZ(${z}px)`;

    popupDiceContainer.appendChild(popupDice);

    const rotations = {
      1: { x: 0, y: 0 },
      2: { x: 0, y: -90 },
      3: { x: 0, y: -180 },
      4: { x: 0, y: 90 },
      5: { x: -90, y: 0 },
      6: { x: 90, y: 0 }
    };

    diceBtn.onclick = () => {

      diceBtn.disabled = true;

      const roll = Math.floor(Math.random() * 6) + 1;

      const preX = 360 * 2 + Math.random() * 90;
      const preY = 360 * 2 + Math.random() * 90;

      popupDice.style.transition = "transform 0.45s cubic-bezier(.25,.8,.25,1)";
      popupDice.style.transform = `rotateX(${preX}deg) rotateY(${preY}deg)`;

      setTimeout(() => {
        const { x, y } = rotations[roll];
        popupDice.style.transition = "transform 0.35s cubic-bezier(.33,1.4,.4,1)";
        popupDice.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
      }, 120);

      popupText.innerHTML = `
        ${text}
        <br><br>
        <b>Gewürfelt: ${roll}</b>
      `;

      options.onDice?.(roll);

      //
      // === continueRolling ===
      //
      if (options.continueRolling) {
        diceBtn.classList.remove("hidden");
        diceBtn.disabled = false;
        popupClose.classList.add("hidden");
        return;
      }

      //
      // === FINALER WURF ===
      //
      diceBtn.classList.add("hidden");
      popupClose.classList.remove("hidden");
    };

  } else {

  diceBtn.classList.add("hidden");
  popupDiceContainer.classList.add("hidden");
  diceBtn.onclick = null;

  // OK-Button nur anzeigen, wenn KEINE numberSelect-Buttons existieren
  if (!options.numberSelect) {
    popupClose.classList.remove("hidden");
  }
}

  popup.classList.remove("hidden");
}

/*
popupClose.addEventListener("click", () => {
  popup.classList.add("hidden");
  pendingAction?.();
  pendingAction = null;
});
*/