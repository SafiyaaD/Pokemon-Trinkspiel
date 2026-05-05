// rules/grouprules.js
import { showPopup, updatePopupText, showPopupOkButton, setPopupAction } from "./popup.js";

export const GROUP_RULES = {
  Tower: {
    id: "Tower",
    name: "Pokémon-Turm (Lavandia)",
    icon: "👻",
    description: "Pssst! Nicht sprechen…",

    onEnter(player, game, continueOnLand) {
      showPopup(
        "Pssst!",
        "Nicht sprechen!",
        continueOnLand
      );
    }
  },

  Silph: {
    id: "Silph",
    name: "Silph Co. – Team Rocket",
    icon: "🧪",
    description: "Trink 2 um deine Nerven zu beruhigen!",

    onEnter(player, game, continueOnLand) {
      showPopup(
        "Silph Co.",
        "Trink 2 um deine Nerven zu beruhigen!",
        continueOnLand
      );
    }
  },

  Safari: {
  id: "Safari",
  name: "Safari Zone",
  icon: "🐾",
  description: "Würfle einmal und erlebe ein Safari‑Event!",

  onEnter(player, game, continueOnLand) {

    showPopup(
      "Safari Zone",
      "Du bist in der Safari Zone! Würfle einmal.",
      null,
      {
        showDiceButton: true,

        onDice: (roll) => {

          // --- Ergebnistext im selben Popup anzeigen ---
          let resultText = "";

          if (roll <= 2) {
            resultText = "Du wirfst einen Köder. Verteile 1 Schluck.";
          }
          else if (roll <= 4) {
            player.skipRounds = (player.skipRounds || 0) + 1;
            resultText = "Du wirfst einen Stein. Trink 4 und setze 1 Runde aus!";
          }
          else {
            resultText = "Du wirfst einen Safariball. Trinke 2. Safraribälle sind einfach Scheiße.";
          }

          // Popup‑Text aktualisieren (Animation bleibt sichtbar!)
          updatePopupText(`
            Du bist in der Safari Zone! Würfle einmal.
            <br><br>
            <b>Gewürfelt: ${roll}</b>
            <br><br>
            ${resultText}
          `);

          // OK‑Button anzeigen
          showPopupOkButton();

          // OK‑Button führt das Safari‑Event aus
          setPopupAction(() => {
            continueOnLand();
          });
        }
      }
    );
  }
}
};
