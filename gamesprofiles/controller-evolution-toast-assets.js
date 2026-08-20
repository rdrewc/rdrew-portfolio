/**
 * Evolution controller notification toast — Figma 166:4888 (Messaging/Notification).
 * Re-export: sh scripts/download-evolution-toast-mcp-assets.sh
 */
const ETO = "assets/figma/evolution-toast-131-3597";

window.FIGMA_CONTROLLER_EVOLUTION_TOAST_ASSETS = {
  figmaFile: "Game-invites---Prototype",
  figmaNode: "166:4888",
  thumbnail:
    (window.PROTOTYPE_GAME_ASSETS && window.PROTOTYPE_GAME_ASSETS.tvGameInviteThumb) ||
    "assets/raster/tv-game-invite-toast-61-6870/image-1898.png",
  gameImage:
    (window.PROTOTYPE_GAME_ASSETS && window.PROTOTYPE_GAME_ASSETS.tvGameInviteThumb) ||
    "assets/raster/tv-game-invite-toast-61-6870/image-1898.png",
  avatarBadge: `${ETO}/avatarBadge.png`
};
