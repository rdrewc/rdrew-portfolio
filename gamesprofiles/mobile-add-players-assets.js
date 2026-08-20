/**
 * Games Dashboard — Evolution mobile Add Players overlay (129:7959).
 * Re-export: sh scripts/download-mobile-add-players-mcp-assets.sh
 * Last exported: 2026-06-03.
 */
const MDAP = "assets/raster/mobile-dashboard-add-players-129-7959";
const TV_GAME_INVITE_THUMB =
  (window.PROTOTYPE_GAME_ASSETS && window.PROTOTYPE_GAME_ASSETS.tvGameInviteThumb) ||
  window.PROTOTYPE_TV_GAME_INVITE_THUMB ||
  "assets/raster/tv-game-invite-toast-61-6870/image-1898.png";
window.FIGMA_MOBILE_DASHBOARD_ADD_PLAYERS_ASSETS = {
  figmaFile: "Game-invites---Prototype",
  figmaNode: "129:7959",
  gameBoxart: TV_GAME_INVITE_THUMB,
  hostBadge: `${MDAP}/hostBadge.png`,
  topGlow: `${MDAP}/topGlow.svg`,
  moreHorizontalSmall: `${MDAP}/moreHorizontalSmall.svg`,
  shareMessages: `${MDAP}/shareMessages.svg`,
  shareWhatsapp: `${MDAP}/shareWhatsapp.svg`,
  shareDiscordMask: `${MDAP}/shareDiscordMask.svg`,
  shareDiscordIcon: `${MDAP}/shareDiscordIcon.svg`,
  shareCopyLinkSecondary: `${MDAP}/shareCopyLinkSecondary.png`,
  shareSheetSecondary: `${MDAP}/shareSheetSecondary.png`,
  userAddSmall: `${MDAP}/userAddSmall.svg`
};
