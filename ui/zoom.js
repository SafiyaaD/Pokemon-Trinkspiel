// ui/zoom.js
import { boardViewport, boardWrapper } from './dom.js';

export function zoomToFullBoard() {
  const bw = boardWrapper.offsetWidth;
  const bh = boardWrapper.offsetHeight;
  const vw = boardViewport.clientWidth;
  const vh = boardViewport.clientHeight;

  const zoom = Math.min(vw / bw, vh / bh);
  const offsetX = (vw - bw * zoom) / 2;
  const offsetY = (vh - bh * zoom) / 2;

  boardViewport.style.transition = "transform 0.6s ease";
  boardViewport.style.transform =
    `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
}

export function zoomToPlayer(player, playerTokens) {
  const token = playerTokens.get(player.id);
  if (!token) return;

  const vw = boardViewport.clientWidth;
  const vh = boardViewport.clientHeight;

  const zoom = 1.25;
  const offsetX = vw / 2 - token.offsetLeft * zoom;
  const offsetY = vh / 2 - token.offsetTop * zoom;

  boardViewport.style.transition = "transform 0.6s ease";
  boardViewport.style.transform =
    `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
}
