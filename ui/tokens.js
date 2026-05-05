// ui/tokens.js
import { boardWrapper, playerTokens, fieldOccupants } from './dom.js';
import { getFieldById } from '../game/board.js';

export function movePlayerToken(player, fieldId, hotspots) {
  const token = playerTokens.get(player.id);
  if (!token) return;

  const field = getFieldById(hotspots, fieldId);
  if (!field) return;

  // Spieler aus allen Feldern entfernen
  for (const arr of fieldOccupants.values()) {
    const i = arr.indexOf(player.id);
    if (i !== -1) arr.splice(i, 1);
  }

  // Spieler in neues Feld eintragen
  if (!fieldOccupants.has(fieldId)) fieldOccupants.set(fieldId, []);
  const occ = fieldOccupants.get(fieldId);
  if (!occ.includes(player.id)) occ.push(player.id);

  const w = field.width ?? 8;
  const h = field.height ?? 8;

  token.style.left = (field.left + w / 2 - 1.5) + '%';
  token.style.top  = (field.top  + h / 2 - 1.5) + '%';

  // nur Verteilung, kein zIndex
  restackField(fieldId, hotspots);
}


export function restackField(fieldId, hotspots) {
  const occupants = fieldOccupants.get(fieldId) || [];
  const count = occupants.length;

  occupants.forEach((playerId, index) => {
    const token = playerTokens.get(playerId);
    if (!token) return;

    if (fieldId === 1 || count === 1) {
      token.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const field = hotspots.find(h => h.id === fieldId);
    const hotspotWidthPx =
      ((field.width ?? 8) / 100) * boardWrapper.offsetWidth;

    const tokenSize = 96;
    const maxScale = (hotspotWidthPx * 0.8) / (count * tokenSize);
    const scale = Math.min(0.8, maxScale);

    const spacing = tokenSize * scale * 1.1;
    const offset = (index - (count - 1) / 2) * spacing;

    token.style.transform =
      `translate(-50%, -50%) translateX(${offset}px) scale(${scale})`;
  });
}