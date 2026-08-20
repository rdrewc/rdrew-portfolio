/**
 * Evolution mobile notification center — Figma 132:3895.
 * Re-export: sh scripts/download-mobile-notifications-mcp-assets.sh
 */
const MDN = "assets/figma/mobile-notifications-132-3895";

window.FIGMA_MOBILE_DASHBOARD_NOTIFICATIONS_ASSETS = {
  figmaFile: "Game-invites---Prototype",
  figmaNode: "132:3895",
  chevronLeftSmall: `${MDN}/chevronLeftSmall.svg`,
  listItemThumbnail:
    (window.PROTOTYPE_GAME_ASSETS && window.PROTOTYPE_GAME_ASSETS.tvGameInviteThumb) ||
    window.PROTOTYPE_TV_GAME_INVITE_THUMB ||
    "assets/raster/tv-game-invite-toast-61-6870/image-1898.png",
  listItemGameImage:
    (window.PROTOTYPE_GAME_ASSETS && window.PROTOTYPE_GAME_ASSETS.tvGameInviteThumb) ||
    window.PROTOTYPE_TV_GAME_INVITE_THUMB ||
    "assets/raster/tv-game-invite-toast-61-6870/image-1898.png",
  listItemAvatar: `${MDN}/listItemAvatar.png`,
  unreadBadge: `${MDN}/unreadBadge.svg`,
  checkSmall: "assets/raster/mobile-notifications/check-small.svg"
};
