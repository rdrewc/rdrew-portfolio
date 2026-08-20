/**
 * Games Dashboard — TV section 14:2957 (Figma Game-invites---Prototype).
 * Each entry is one primary-level frame; paths are raster exports of full frames.
 */
window.FIGMA_DASHBOARD = {
  figmaFile: "Game-invites---Prototype",
  figmaNode: "14:2957",
  designCssPx: { w: 1280, h: 720 },
  /**
   * Full-screen layers (fixed order for DOM). Notifications is not in the horizontal strip.
   * Focus stack (primary row): ↑ from nav → content (stage), ↑ from content → header bell, ↑ from header → notifications panel.
   * ↓ reverses toward the nav. Left/right change the active screen from nav or from content.
   */
  primaryStates: [
    { id: "resume", label: "Resume", figmaFrame: "5:12866", path: "assets/raster/dashboard/primary-resume.png" },
    { id: "notifications", label: "Notifications", figmaFrame: "5:12872", path: "assets/raster/dashboard/primary-notifications.png" },
    { id: "profile", label: "Profile", figmaFrame: "5:12878", path: "assets/raster/dashboard/primary-profile.png" },
    { id: "friends", label: "Friends", figmaFrame: "5:12907", path: "assets/raster/dashboard/primary-friends.png" },
    { id: "controllers", label: "Controllers", figmaFrame: "5:12931", path: "assets/raster/dashboard/primary-controllers.png" },
    { id: "achievements", label: "Achievements", figmaFrame: "5:12938", path: "assets/raster/dashboard/primary-achievements.png" },
    { id: "exit", label: "Exit", figmaFrame: "5:12950", path: "assets/raster/dashboard/primary-exit.png" }
  ],
  /** Left/right (and edge chevrons) cycle this order only — excludes notifications. */
  horizontalNavStateIds: ["resume", "profile", "friends", "controllers", "achievements", "exit"],
  notificationsStateId: "notifications"
};
