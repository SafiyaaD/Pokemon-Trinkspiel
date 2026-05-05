export function applyRule(rules, player, game) {
  const list = Array.isArray(rules) ? rules : [rules];

  let lastResult = null;

  for (const rule of list) {
    const result = applySingleRule(rule, player, game);

    // Sofortiger Abbruch bei endTurn (nur wenn wirklich kein Popup gewünscht ist)
    if (result === "endTurn") {
      return "endTurn";
    }

    // Alle Popup-relevanten Ergebnisse merken
    if (result) {
      lastResult = result;
    }
  }

  return lastResult;
}


function applySingleRule(rule, player, game) {
  switch (rule.type) {

    //
    // STOP → Popup anzeigen → KEIN endTurn zurückgeben
    //
    case "stop":
      return { type: "stop" };

    //
    // TELEPORT → Spieler bewegen → Popup anzeigen
    //
    case "teleport": {
      player.position = rule.target;
      game.callbacks.onMoveStep(player, rule.target);
      return { type: "teleport", target: rule.target };
    }

    //
    // SKIP → Popup anzeigen
    //
    case "skip":
      player.skipRounds = rule.rounds;
      return { type: "skip", rounds: rule.rounds };

    case "doubleRollSkipDrink":
      return { type: "doubleRollSkipDrink" };


    //
    // GATE → Popup anzeigen
    //
    case "gate":
      player.gate = rule.requiredRolls;
      return { type: "gate", requiredRolls: rule.requiredRolls };

    case "multiGate":
      player.multiGate = {
        required: rule.requiredCount,
        allowed: rule.allowedRolls,
        progress: 0
      };
      return { 
        type: "multiGate",
        requiredCount: rule.requiredCount,
        allowedRolls: rule.allowedRolls
      };



    //
    // GROUP → KEIN Popup (wie bei dir vorgesehen)
    //
    case "group":
      return { type: "group", groupId: rule.groupId };

    //
    // REROLL → Popup mit Würfel
    //
    case "reroll":
      return { type: "reroll" };

    //
    // BACK → Popup mit Auswahl
    //
    case "back":
      return { type: "back", steps: rule.steps };

    case "giveGateToPlayer":
      return {
        type: "giveGateToPlayer",
        requiredRolls: rule.requiredRolls
      };

      case "threeRolls":
        return { type: "threeRolls" };


    //
    // DOUBLE NEXT ROLL → Popup anzeigen
    //
    case "doubleNextRoll":
      player.doubleNextRoll = true;
      return { type: "doubleNextRoll" };

    case "halfNextRound":
      game.state.halfUntilPlayer = player.id;   // Effekt aktivieren / verlängern
      return { type: "halfNextRound" };

    case "guessRoll":
      return { type: "guessRoll" };

    case "rollUntilOdd":
       return { type: "rollUntilOdd" };

    //
    // DICE POPUP → Popup mit Würfel
    //
    case "dicePopup":
      return {
        type: "dicePopup",
        effects: rule.effects || []
      };

      case "changePokemon": {
  if (rule.to === "pikachu") {
    player.colorClass = "player-yellow";
    player.pokemonIcon = "/assets/pikachu.png";
    player.type = "pikachu";
  }

  return { type: "changePokemon" };
}

case "chooseRerollOrIgnoreStop":
  return { type: "chooseRerollOrIgnoreStop" };

case "randomFieldText":
  return { type: "randomFieldText" };




    default:
      return null;
  }
}
