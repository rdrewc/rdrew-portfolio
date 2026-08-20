/**
 * TV — Figma "FIFA Screens" (component set 1:255) as the in-game full-bleed layer.
 * Canvas "Game Screens" 1:7890 is an instance of Figma variant "Property 1=Default" (1:256); the in-prototype UI label for that screen is "Lobby".
 *
 * HIGHER-RES EXPORTS
 * - Each *variant* component in Figma (1:256, 1:290, 1:293, 1:327, 1:361, 1:364) is set up with
 *   Export: PNG, width 2560, "contents only" (≈2× of the 1280×720 artboard). Re-export in Figma
 *   (or File → Export) and replace the matching `assets/raster/tv-fifa-*.png`. MCP screenshots are
 *   often low-res (~1024 wide); a native 2560 export is best for a sharp 1280 CSS TV.
 * - For a quick up-scale from the existing PNGs on your machine, run (macOS, from project root):
 *   `bash scripts/refresh-tv-fifa-exports.sh` — uses `sips`; for quality, prefer Figma exports.
 *
 * VECTORS IN FIGMA
 * - Keep interface elements as *vector* where possible: shapes, frames with vector strokes,
 *   and auto layout text — avoid *Flatten* / *Outline stroke* unless you need a baked look.
 * - Use **place** high-resolution bitmaps for photo / texture layers; keep them separate from
 *   vector UI so re-exports stay crisp and SVG (where applicable) stays small.
 * - The full screens mix raster and vector; a single SVG of the whole frame is often very large
 *   in this file — the prototype uses full-frame PNG; sub-frames that are all-vector can be
 *   exported as SVG separately if you add another asset type later.
 */
/** 1×1 transparent GIF — Lobby uses DOM + solid `#111522` fill instead of `tv-fifa-default.png`. */
var TV_RASTER_TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

window.FIGMA_TV_RASTERS = {
  figmaFile: "Game-invites---Prototype",
  componentSetName: "FIFA Screens",
  componentSetNode: "1:255",
  /** Placed on Page 1 — Figma instance may still show the Lobby (Property 1=Default) variant; UI can start on another (see `defaultGameplayVariantId`). */
  canvasInstanceNode: "1:7890",
  figmaName: "Game Screens",
  /** Design size (pt) and target pixel export (2×) for sharp display on a 1280px-wide TV. */
  export: {
    designWidth: 1280,
    designHeight: 720,
    pixelExportWidth: 2560,
    pixelExportHeight: 1440,
    /** `sizes` for srcset: TV is 1280px wide. */
    displayWidthCss: 1280
  },
  /** Initial selection in the in-game TV selector (see `gameplayVariants` ids). */
  defaultGameplayVariantId: "start-screen",
  /** Legacy single reference — same as Lobby (Figma Property 1=Default) / 1:256. */
  gameplay: {
    node: "1:256",
    name: "FIFA Screens — Lobby",
    path: TV_RASTER_TRANSPARENT_PIXEL
  },
  gameplayVariants: [
    {
      id: "default",
      label: "Lobby",
      /** No PNG — layered DOM (`30:3184`) + solid fill `#111522` on the raster stack in CSS. */
      path: TV_RASTER_TRANSPARENT_PIXEL,
      node: "1:256",
      figmaName: "Property 1=Default",
      interactiveFrame: "30:3184"
    },
    {
      id: "menu",
      label: "Menu",
      path: "assets/raster/tv-fifa-menu-bg.png",
      node: "1:290",
      figmaName: "Property 1=Failed"
    },
    {
      id: "start-screen",
      label: "Start screen",
      path: "assets/raster/tv-fifa-start-screen.png",
      node: "1:361",
      figmaName: "Property 1=Start Sreen"
    },
    {
      id: "gameplay",
      label: "Gameplay",
      path: "assets/raster/tv-fifa-gameplay.png",
      node: "1:364",
      figmaName: "Property 1=Gameplay"
    }
  ]
};
