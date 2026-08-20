/**
 * Canonical names for Games Dashboard prototype regions.
 * Used by humans, Cursor, and scripts — keep in sync with docs/VOCABULARY.md
 */
(function () {
  "use strict";

  /** Global game art — TV is source of truth; bind with data-prototype-game-asset="…" */
  var GAME_ASSETS = Object.freeze({
    tvGameInviteThumb: "assets/raster/tv-game-invite-toast-61-6870/image-1898.png",
    tvInviteListHero: "assets/raster/game-invite-1-6683/game-art-hero.png",
    tvGameInviteDetailHero: "assets/raster/game-invite-tv-61-6933/hero-art.png",
  });

  window.PROTOTYPE_GAME_ASSETS = GAME_ASSETS;
  window.PROTOTYPE_TV_GAME_INVITE_THUMB = GAME_ASSETS.tvGameInviteThumb;

  window.hydratePrototypeGameAssetSurfaces = function (root) {
    root = root || document;
    root.querySelectorAll("[data-prototype-game-asset]").forEach(function (el) {
      var key = el.getAttribute("data-prototype-game-asset");
      if (key && GAME_ASSETS[key]) el.setAttribute("src", GAME_ASSETS[key]);
    });
  };

  var REGIONS = {
    "control-panel": {
      label: "Control panel",
      description: "Left sidebar — prototype dev controls (not shipped UI).",
      selector: '[data-prototype-region="control-panel"]',
      domId: null,
      files: { markup: "index.html", css: [], js: [] },
      aliases: ["sidebar", "dev tools", "controls column", "advanced settings"],
    },
    "living-room-tv": {
      label: "Living room TV",
      description: "1280×720 TV frame and everything drawn on the TV canvas.",
      selector: '[data-prototype-region="living-room-tv"]',
      domId: null,
      files: {
        markup: "index.html",
        css: ["tv-gameplay.css", "tv-game-invite-toast.css"],
        js: ["tv-assets.js"],
      },
      aliases: ["the TV", "big screen", "living room"],
    },
    "tv-gameplay": {
      label: "TV gameplay layer",
      description: "Game running under the dashboard (lobby, FIFA, menu variants).",
      selector: "#tvGameplayRasterStack",
      domId: "tvGameplayRasterStack",
      files: {
        markup: "index.html",
        css: ["tv-gameplay.css"],
        js: ["tv-assets.js"],
      },
      aliases: ["game screen", "lobby", "FIFA gameplay", "game underlay"],
    },
    "tv-dashboard": {
      label: "TV dashboard overlay",
      description: "In-game games dashboard opened via controller N or TV interactions.",
      selector: '[data-prototype-region="tv-dashboard"]',
      domId: "tvDashboard",
      files: {
        markup: "index.html",
        css: [
          "tv-dashboard-overlay.css",
          "tv-dashboard-nav.css",
          "tv-dashboard-header.css",
          "tv-dashboard-key-guide.css",
        ],
        js: ["tv-dashboard.js", "tv-dashboard-overlay.js", "tv-dashboard-assets.js"],
      },
      aliases: ["games dashboard", "TV overlay", "NGC dashboard", "press N menu"],
      figma: { file: "Game-invites---Prototype", section: "14:2957" },
    },
    "tv-dashboard-header": {
      label: "TV dashboard header",
      selector: "#tvDashboardHeader",
      domId: "tvDashboardHeader",
      files: { css: ["tv-dashboard-header.css"], js: ["tv-dashboard-header-assets.js"] },
      aliases: ["dashboard top bar", "bell header"],
      figma: { node: "5:12871" },
    },
    "tv-dashboard-primary-nav": {
      label: "TV dashboard primary nav",
      description: "Bottom tabs: Play Game, Profile, Friends, Controllers, Achievements, Exit.",
      selector: "#tvDashboardPrimaryNav",
      domId: "tvDashboardPrimaryNav",
      files: { css: ["tv-dashboard-nav.css"], js: ["tv-dashboard.js"] },
      aliases: ["bottom nav", "primary menu", "dashboard tabs"],
      figma: { node: "14:3041" },
    },
    "tv-focus-profile": {
      label: "TV dashboard — Profile tab",
      selector: "#tvDashboardProfileFocus",
      domId: "tvDashboardProfileFocus",
      files: { css: ["tv-focus-profile.css"] },
      aliases: ["profile tab", "profile focus"],
    },
    "tv-focus-friends": {
      label: "TV dashboard — Friends tab",
      selector: "#tvDashboardFriendsFocus",
      domId: "tvDashboardFriendsFocus",
      aliases: ["friends tab", "friends list on TV"],
    },
    "tv-focus-controllers": {
      label: "TV dashboard — Controllers tab",
      selector: "#tvDashboardControllersFocus",
      domId: "tvDashboardControllersFocus",
      aliases: ["controllers tab", "QR tab"],
    },
    "tv-focus-achievements": {
      label: "TV dashboard — Achievements tab",
      selector: "#tvDashboardAchievementsFocus",
      domId: "tvDashboardAchievementsFocus",
      aliases: ["achievements tab", "trophies"],
    },
    "tv-focus-exit": {
      label: "TV dashboard — Exit tab",
      selector: "#tvDashboardExitFocus",
      domId: "tvDashboardExitFocus",
      aliases: ["exit game tab"],
    },
    "tv-invite-list": {
      label: "TV game invite list",
      description: "Side pane listing friends to invite.",
      selector: '[data-prototype-region="tv-invite-list"]',
      domId: "tvDashboardInviteShell",
      files: { css: ["tv-invite-list.css"] },
      aliases: ["invite list", "game invite list", "friends invite pane"],
      figma: { node: "1:6683", name: "Game Invite List" },
    },
    "tv-game-invite-detail": {
      label: "TV game invite detail sheet",
      selector: '[data-prototype-region="tv-game-invite-detail"]',
      domId: "tvDashboardGameInviteShell",
      files: { css: ["tv-invite-list.css"] },
      aliases: ["game invite TV sheet", "join invite panel"],
      figma: { node: "61:6933", name: "Game Invite - TV" },
    },
    "tv-notifications-panel": {
      label: "TV notifications panel",
      selector: '[data-prototype-region="tv-notifications-panel"]',
      domId: "tvDashboardNotificationsShell",
      files: { css: ["tv-notifications-panel.css", "tv-game-invite-toast.css"] },
      aliases: ["notification center TV", "bell panel", "notifications drill"],
    },
    "tv-game-invite-toast": {
      label: "TV game invite toast",
      selector: '[data-prototype-region="tv-game-invite-toast"]',
      domId: "tvGameInviteToastLayer",
      files: { css: ["tv-game-invite-toast.css"] },
      aliases: ["game invite toast", "invite toast on TV"],
      figma: { node: "61:6870" },
    },
    "tv-friend-invite-toast": {
      label: "TV friend invite toast",
      selector: '[data-prototype-region="tv-friend-invite-toast"]',
      domId: "tvFriendInviteToastLayer",
      aliases: ["friend request toast", "friend invite toast"],
    },
    "tv-player-panel": {
      label: "TV player panel",
      selector: '[data-prototype-region="tv-player-panel"]',
      domId: "tvDashboardPlayerPanelShell",
      files: {
        css: ["tv-player-panel.css"],
        js: ["tv-player-panel.js"],
      },
      aliases: ["player panel", "profile sheet", "incoming request panel"],
      figma: { node: "96:3081" },
    },
    "phone-device": {
      label: "Phone device",
      description: "Phone bezel and all controller / mobile / iOS mounts.",
      selector: '[data-prototype-region="phone-device"]',
      domId: "phoneOuter",
      files: { css: ["phone-controller.css"], markup: "index.html" },
      aliases: ["the phone", "controller phone", "right panel phone"],
    },
    "phone-controller-connected": {
      label: "Connected game controller (NGC)",
      selector: '[data-prototype-region="phone-controller-connected"]',
      domId: "fcConnectedMount",
      files: {
        css: ["phone-controller.css"],
        js: ["phone-controller-assets.js"],
      },
      aliases: ["NGC", "connected controller", "painted controller"],
      figma: { node: "2:2442" },
    },
    "phone-not-connected": {
      label: "Not connected / NCC flows",
      selector: "#fcNotConnectedMount",
      domId: "fcNotConnectedMount",
      aliases: ["NCC", "signed out phone", "invite sheet phone"],
    },
    "phone-ios": {
      label: "iOS phone surfaces",
      selector: '[data-prototype-region="phone-ios"]',
      domId: "fcIosMount",
      files: {
        css: [
          "phone-ios.css",
          "phone-share-sheet.css",
          "phone-imessage-composer.css",
        ],
      },
      aliases: ["lock screen", "messages", "share sheet", "iMessage"],
    },
    "mobile-dashboard": {
      label: "Mobile dashboard (Evolution)",
      selector: '[data-prototype-region="mobile-dashboard"]',
      domId: "fcMobileDashboard",
      files: {
        css: ["mobile-dashboard.css"],
        js: ["mobile-dashboard.js", "mobile-dashboard-assets.js", "mobile-dashboard-peek-assets.js"],
      },
      aliases: ["evolution mobile", "mobile overlay", "phone dashboard"],
      figma: { node: "127:3959" },
    },
    "mobile-notifications": {
      label: "Mobile notifications list",
      selector: "#fcMobileDashViewNotifications",
      domId: "fcMobileDashViewNotifications",
      files: {
        css: ["mobile-notifications.css"],
        js: ["mobile-notifications.js"],
      },
      aliases: ["mobile notification center"],
      figma: { node: "132:3895" },
    },
    "mobile-notifications-detail": {
      label: "Mobile notification detail",
      selector: "#fcMobileDashViewNotifDetail",
      domId: "fcMobileDashViewNotifDetail",
      files: {
        css: ["mobile-notifications-detail.css"],
        js: ["mobile-notifications-detail.js"],
      },
      figma: { node: "168:5112" },
    },
    "mobile-add-players": {
      label: "Mobile add players",
      selector: "#fcMobileDashViewAddPlayers",
      domId: "fcMobileDashViewAddPlayers",
      files: { js: ["mobile-add-players-assets.js"] },
      aliases: ["add players", "share invite mobile"],
      figma: { node: "129:7959" },
    },
    "mobile-voice-chat-sheet": {
      label: "Voice chat participants sheet",
      selector: '[data-prototype-region="mobile-voice-chat-sheet"]',
      domId: "fcVoiceChatLayer",
      files: {
        css: ["mobile-voice-chat.css"],
        js: ["mobile-voice-chat.js", "mobile-voice-chat-assets.js"],
      },
      aliases: ["voice chat", "games sheet", "voice participants"],
      figma: { node: "6453:55226" },
    },
    "controller-evolution-toast": {
      label: "Controller evolution toast",
      selector: "#fcEvoToastLayer",
      domId: "fcEvoToastLayer",
      files: {
        css: ["controller-evolution-toast.css"],
        js: ["controller-evolution-toast.js"],
      },
      figma: { node: "166:4888" },
    },
  };

  window.PROTOTYPE_VOCABULARY = Object.freeze({
    version: 1,
    projectName: "Games Dashboard",
    repository: "Games-Platform",
    instructionFormat:
      'Change `[region-id]`: [what to change] — optional Figma node or asset path',
    documentation: "docs/VOCABULARY.md",
    platformExperience: Object.freeze({
      current: { label: "Current", attribute: "data-platform-experience", value: "current" },
      evolution: {
        label: "Controller Evolution",
        attribute: "data-platform-experience",
        value: "evolution",
      },
    }),
    tvStates: Object.freeze({
      "tv-off": "TV off",
      "netflix-main": "Netflix main",
      "netflix-search": "Netflix Search",
      "netflix-games": "Netflix Game Tab",
      "in-game": "In game",
    }),
    tvDashboardTabs: Object.freeze({
      resume: "Play Game",
      profile: "Profile",
      friends: "Friends",
      controllers: "Controllers",
      achievements: "Achievements",
      exit: "Exit Game",
    }),
    regions: REGIONS,
    resolveRegion: function (idOrAlias) {
      if (!idOrAlias) return null;
      var key = String(idOrAlias).trim().toLowerCase();
      if (REGIONS[key]) return REGIONS[key];
      var keys = Object.keys(REGIONS);
      for (var i = 0; i < keys.length; i++) {
        var r = REGIONS[keys[i]];
        if (r.aliases) {
          for (var j = 0; j < r.aliases.length; j++) {
            if (r.aliases[j].toLowerCase() === key) return r;
          }
        }
        if (r.label && r.label.toLowerCase() === key) return r;
      }
      return null;
    },
    listRegionIds: function () {
      return Object.keys(REGIONS).sort();
    },
  });
})();
