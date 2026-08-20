/**
 * Games Dashboard — Controller States (2:2442) — layered image paths (local rasters).
 * Re-export from Figma MCP when the file changes: sh scripts/download-controller-mcp-assets.sh
 * Last exported: 2026-06-03.
 */
const NGC = "assets/raster/ngc";
const NCC = "assets/raster/ncc";

/* Inlined so the voice mic always loads (file://, subpath servers, and broken relative paths). */
const NGC_MIC_VOICE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"/><path fill="#fff" d="M19 10a1 1 0 0 0-2 0v1a5 5 0 0 1-10 0v-1a1 1 0 1 0-2 0v1a7 7 0 0 0 6 6.92V20H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2.08A7 7 0 0 0 19 11v-1z"/></svg>'
  );

/** Offline dot beside profile handle — inline SVG avoids another expired raster. */
const NCC_OFFLINE_ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.25"/><path stroke="rgba(255,255,255,0.55)" stroke-width="1.25" stroke-linecap="round" d="M4.5 11.5l7-7"/></svg>'
  );

/** Not-connected phone (NCC) — local slices in assets/raster/phone-ios-states-mcp/ */
const NCC_RASTER = {
  qr: "assets/raster/phone-ios-states-mcp/QR-Code.png",
  help: "assets/raster/phone-ios-states-mcp/circle-question-mark.png",
  gameController16: "assets/raster/phone-ios-states-mcp/game-controller.png",
  profilePhotoFallback: "assets/profile-avatars/type-01-luffy.png"
};

window.FIGMA_CONTROLLER_ASSETS = {
  figmaFile: "Game-invites---Prototype",
  figmaNode: "2:2442",

  /* --- NGC (852×393) per Property 1 variant; keys match [data-fg] on the active layer --- */
  ngc: {
    generic: {
      _node: "5:15197",
      backgroundGlow: `${NGC}-generic/backgroundGlow.svg`,
      avatar: `${NGC}-generic/avatar.png`,
      nLogo: `${NGC}-generic/nLogo.png`,
      menu: `${NGC}-generic/menu.png`,
      mic: `${NGC}-generic/mic.svg`,
      dpadBaseFill: `${NGC}-platform/dpadBaseFill.svg`,
      dpadArrowL: `${NGC}-platform/dpadArrowL.png`,
      dpadArrowD: `${NGC}-platform/dpadArrowD.png`,
      dpadArrowR: `${NGC}-platform/dpadArrowR.png`,
      dpadArrowU: `${NGC}-platform/dpadArrowU.png`,
      btnA: `${NGC}-generic/btnA.png`,
      btnB: `${NGC}-generic/btnB.png`,
      btnY: `${NGC}-generic/btnY.png`,
      btnX: `${NGC}-generic/btnX.png`
    },
    voice: {
      _node: "5:14708",
      backgroundGlow: `${NGC}-voice/backgroundGlow.svg`,
      avatar: `${NGC}-voice/avatar.png`,
      nLogo: `${NGC}-voice/nLogo.png`,
      menu: `${NGC}-voice/menu.png`,
      mic: NGC_MIC_VOICE,
      dpadBaseFill: `${NGC}-platform/dpadBaseFill.svg`,
      dpadArrowL: `${NGC}-platform/dpadArrowL.png`,
      dpadArrowD: `${NGC}-platform/dpadArrowD.png`,
      dpadArrowR: `${NGC}-platform/dpadArrowR.png`,
      dpadArrowU: `${NGC}-platform/dpadArrowU.png`,
      btnA: `${NGC}-voice/btnA.png`,
      btnB: `${NGC}-voice/btnB.png`,
      btnY: `${NGC}-voice/btnY.png`,
      btnX: `${NGC}-voice/btnX.png`
    },
    fifa: {
      _node: "5:14669",
      backgroundGlow: `${NGC}-fifa/backgroundGlow.svg`,
      avatar: `${NGC}-fifa/avatar.png`,
      nLogo: `${NGC}-fifa/nLogo.png`,
      menu: `${NGC}-fifa/menu.png`,
      mic: `${NGC}-fifa/mic.svg`,
      dpadBaseFill: `${NGC}-platform/dpadBaseFill.svg`,
      dpadArrowL: `${NGC}-platform/dpadArrowL.png`,
      dpadArrowD: `${NGC}-platform/dpadArrowD.png`,
      dpadArrowR: `${NGC}-platform/dpadArrowR.png`,
      dpadArrowU: `${NGC}-platform/dpadArrowU.png`,
      btnA: `${NGC}-fifa/btnA.png`,
      btnB: `${NGC}-fifa/btnB.png`,
      btnX: `${NGC}-fifa/btnX.png`
    },
    platform: {
      _node: "5:14682",
      backgroundGlow: `${NGC}-platform/backgroundGlow.svg`,
      avatar: `${NGC}-platform/avatar.png`,
      nLogo: `${NGC}-platform/nLogo.png`,
      menu: `${NGC}-platform/menu.png`,
      mic: `${NGC}-platform/mic.svg`,
      dpadBaseFill: `${NGC}-platform/dpadBaseFill.svg`,
      dpadArrowL: `${NGC}-platform/dpadArrowL.png`,
      dpadArrowD: `${NGC}-platform/dpadArrowD.png`,
      dpadArrowR: `${NGC}-platform/dpadArrowR.png`,
      dpadArrowU: `${NGC}-platform/dpadArrowU.png`,
      btnA: `${NGC}-platform/btnA.png`,
      btnB: `${NGC}-platform/btnB.png`
    },
    loading: {
      _node: "5:14721",
      backgroundGlow: `${NGC}-loading/backgroundGlow.svg`,
      avatar: `${NGC}-loading/avatar.png`,
      nLogo: `${NGC}-loading/nLogo.png`,
      menu: `${NGC}-loading/menu.png`,
      mic: `${NGC}-loading/mic.svg`,
      spinner: `${NGC}-loading/spinner.svg`
    }
  },

  /* --- Not connected (393×852) — signedOut / signedIn / invite --- */
  ncc: {
    signedOut: {
      _node: "2:9419",
      headerLogo: `${NCC}-signedOut/headerLogo.png`,
      hero: `${NCC}-signedOut/hero.png`,
      qr: NCC_RASTER.qr,
      help: NCC_RASTER.help
    },
    signedIn: {
      _node: "2:9335",
      headerLogo: `${NCC}-signedIn/headerLogo.png`,
      hero: `${NCC}-signedIn/hero.png`,
      qr: NCC_RASTER.qr,
      help: NCC_RASTER.help,
      profilePhoto: NCC_RASTER.profilePhotoFallback,
      profileMask: `${NCC}-signedIn/profileMask.svg`,
      gameController16: NCC_RASTER.gameController16
    },
    invite: {
      _node: "113:3107",
      headerLogo: `${NCC}-signedIn/headerLogo.png`,
      hero: `${NCC}-signedIn/hero.png`,
      profilePhoto: NCC_RASTER.profilePhotoFallback,
      profileMask: `${NCC}-signedIn/profileMask.svg`,
      gameController16: NCC_RASTER.gameController16,
      statusOffline: NCC_OFFLINE_ICON,
      qr: NCC_RASTER.qr,
      help: NCC_RASTER.help,
      sheetGameArt2: `${NCC}-invite/sheetGameArt2.png`,
      invitePoster: `${NCC}-invite/invitePoster.png`,
      closeX: "assets/raster/game-invite-1-6683/icon-close-x.svg",
      netflixN: `${NCC}-invite/netflixN.png`
    }
  }
};
