/**
 * TV dashboard backdrop — Figma Overlay instance 14:2959 (component 1:5014).
 * Glow + Particles use VIDEO fills in Figma (hashes below); the prototype loads
 * local files because the Figma API cannot export video fills by hash.
 * Replace paths after exporting from the design file.
 */
window.FIGMA_DASHBOARD_OVERLAY = {
  figmaOverlayInstance: "14:2959",
  figmaMainComponent: "1:5014",
  figmaVideoHashes: {
    glow: "8349dbf93b8898486bdedce77861e931db5d304e",
    particles: "2c55d413096030ceffd2d8d049a9b9b1da11aca6"
  },
  /**
   * Full-frame bottom-glow plate (raster: black field + bottom magenta wash).
   */
  bottomGlowPlate: {
    path: "assets/raster/Color%20Gradient.png",
    figmaNode: ""
  },
  /** Ellipse / radial lockup exported from Figma (MCP asset; may be SVG). */
  colorGradientCircle: {
    path: "assets/raster/dashboard-color-gradient-circle.png",
    figmaNode: "4903:24254"
  },
  /** Full-bleed video rectangle — mix-blend-screen in design */
  glowVideo: {
    webm: "",
    /** Copied from Google Drive: …/Dashboard Motion_GlowLoop.mp4 (replaces placeholder “flower” clip). */
    mp4: "assets/video/dashboard-glow-loop.mp4"
  },
  /** Full-bleed video — screen blend; particles 0.7, glow 0.85 opacity in CSS */
  particlesVideo: {
    webm: "",
    /** Copied from Google Drive: …/Dashboard Motion_ParticlesLoop.mp4 */
    mp4: "assets/video/dashboard-particles-loop.mp4"
  },
  /** Figma Color Gradient — inline SVG in index.html (node 14:3033, same spec as overlay 4903:24032). */
  colorGradientRadialSvg: {
    figmaNode: "14:3033",
    dataUri: ""
  }
};
