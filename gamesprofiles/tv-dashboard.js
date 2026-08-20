(function () {
  "use strict";

  var prototypeGameHandleApplied = false;
  var PROTOTYPE_FRIEND_SLOT_COUNT = 10;
  var PROTOTYPE_FRIEND_LIST_KEYS = [];
  for (var _fi = 0; _fi < PROTOTYPE_FRIEND_SLOT_COUNT; _fi++) {
    PROTOTYPE_FRIEND_LIST_KEYS.push("list-" + _fi);
  }
  window.PROTOTYPE_FRIEND_SLOT_COUNT = PROTOTYPE_FRIEND_SLOT_COUNT;
  window.PROTOTYPE_FRIEND_LIST_KEYS = PROTOTYPE_FRIEND_LIST_KEYS;

  var PROTOTYPE_GAME_HANDLE_POOL = [
    "VoidSerpent",
    "NeonRavager",
    "CrimsonEcho",
    "IronSpectre",
    "StormCipher",
    "ArcaneVolt",
    "ShadowKnell",
    "FrostWarden",
    "ObsidianRift",
    "ThunderWraith",
    "SilverFang",
    "CosmicBane",
    "EmberLurk",
    "GlitchReaper",
    "NullHunter",
    "PixelPuff",
    "SnuggleBot",
    "WaffleWizard",
    "MochiMage",
    "ToastRanger",
    "BubbleByte",
    "NoodleKnight",
    "SockPuppetPrime",
    "LagMonkey42",
    "CtrlAltDefeat",
    "CampingReported",
    "BuffNerfRepeat",
    "PatchCable404",
    "RubberDucky007",
    "AFKPhilosopher",
    "CriticalMiss99",
    "RespawnClown",
    "QuantumQuokka",
    "SyntaxSherpa",
    "RecursiveRaccoon",
    "BigOLogN",
    "NaNinja",
    "HeapOverflow",
    "KernelPanic13",
    "GitBlameSteve",
    "DockerWhale",
    "TerraformTrout",
    "IPvFun",
    "PingPlotTwist",
    "sudoMakeSandwich",
    "chmod777Cat",
    "BracketLizard",
    "SemicolonSamurai",
    "YAMLYetAnother",
    "DeployOnFriday",
    "MergeConflictKoala",
    "UnicodeUnicorn",
    "RegexRaptor",
    "BinaryBoba",
    "CacheMeOwOside",
    "FlipTableGuy",
    "PotatoAimAcademy",
    "CarriedByLag",
    "OneMoreQuest",
    "SleepDeprivedDev",
    "CoffeeCompiler",
    "StackSmoosher",
    "NullPointerNoodle"
  ];

  window.PROTOTYPE_GAME_HANDLE_POOL = PROTOTYPE_GAME_HANDLE_POOL;

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /** Fallback deck when `profile-avatars-manifest.js` is missing or empty (web-safe `type-##-name.png` under `assets/profile-avatars/`). */
  var LEGACY_PROTOTYPE_AVATAR_DECK = [
    "assets/profile-avatars/type-01-fei-fei.png",
    "assets/profile-avatars/type-01-front-man.png",
    "assets/profile-avatars/type-01-geralt.png",
    "assets/profile-avatars/type-01-haru.png",
    "assets/profile-avatars/type-01-luffy.png",
    "assets/profile-avatars/type-01-scarlet-1.png",
    "assets/profile-avatars/type-01-scarlet.png",
    "assets/profile-avatars/type-02-bungee.png",
    "assets/profile-avatars/type-02-ciri.png"
  ];

  function buildShuffledPrototypeAvatarDeck() {
    var paths = window.PROFILE_AVATAR_PATHS;
    if (paths && paths.length >= 9) {
      return shuffleArray(paths.slice());
    }
    return shuffleArray(LEGACY_PROTOTYPE_AVATAR_DECK.slice());
  }

  function setAvatarOnPlayerPanelHandleKey(handleKey, src) {
    if (!src) return;
    var nodes = document.querySelectorAll('[data-player-panel-handle-key="' + handleKey + '"]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var img =
        el.querySelector(".tv-dashboard__friends-focus-player-avatar-img") ||
        el.querySelector(".game-invite-list__avatar img") ||
        el.querySelector(".tv-gameplay-interactive__avatar img");
      if (img) img.setAttribute("src", src);
    }
  }

  function applyInviterAvatarSurfaces(src) {
    if (!src) return;
    var ios = document.querySelector(
      ".ios-msgs__list > .ios-msgs__row:first-child .ios-msgs__avatar:not(.ios-msgs__avatar--ngc-app) img"
    );
    if (ios) ios.setAttribute("src", src);
    var pp = document.getElementById("tvPlayerPanelAvatar");
    if (pp) pp.setAttribute("src", src);
  }

  function getLocalPrototypeAvatarSrc() {
    var AV = window.PROTOTYPE_PLAYER_AVATARS;
    if (AV && AV.local) return AV.local;
    var youAv = document.getElementById("prototypeYouAvatar");
    return youAv ? youAv.getAttribute("src") : null;
  }

  function applyLocalAvatarSurfaces(src) {
    if (!src) return;
    var youAv = document.getElementById("prototypeYouAvatar");
    if (youAv) {
      youAv.setAttribute("src", src);
      youAv.alt = "";
    }
    var mobileAv = document.querySelector("#fcMobileDashboard .fc-mobile-dash__avatar");
    if (mobileAv) {
      mobileAv.setAttribute("src", src);
      mobileAv.alt = "";
    }
    var navProfileAv = document.querySelector(
      '.tv-dashboard__nav-item[data-state-id="profile"] .tv-dashboard__nav-item__icon img'
    );
    if (navProfileAv) {
      navProfileAv.setAttribute("src", src);
      navProfileAv.alt = "";
    }
    var profImg = document.querySelector(".tv-dashboard__profile-focus-avatar-img");
    if (profImg) profImg.setAttribute("src", src);
    if (typeof window.applyNgcControlAvatars === "function") {
      window.applyNgcControlAvatars(document.getElementById("fcNgcRoot"), src);
    } else {
      var ngcRoot = document.getElementById("fcNgcRoot");
      if (ngcRoot) {
        ngcRoot.querySelectorAll('[data-ngc-slot="home"] [data-ngc-profile-img]').forEach(function (img) {
          img.setAttribute("src", src);
          img.alt = "";
        });
        ngcRoot.querySelectorAll('[data-ngc-slot="left"] [data-fg="avatar"]').forEach(function (img) {
          img.setAttribute("src", src);
          img.alt = "";
        });
      }
    }
    var nccPhotos = document.querySelectorAll(
      '#fccSignedIn img[data-fg="profilePhoto"], #fccInvite img[data-fg="profilePhoto"]'
    );
    for (var n = 0; n < nccPhotos.length; n++) {
      var img = nccPhotos[n];
      img.setAttribute("src", src);
      img.alt = "";
      var wrap = img.closest(".ncc-avatar--mask");
      if (wrap) {
        wrap.style.maskImage = "";
        wrap.style.webkitMaskImage = "";
      }
    }
  }

  function syncLocalProfileAvatarSurfaces() {
    if (typeof window.isMultiLocalSession === "function" && window.isMultiLocalSession()) {
      if (typeof window.applyActiveLocalPlayerToSurfaces === "function") {
        window.applyActiveLocalPlayerToSurfaces();
        return;
      }
    }
    applyLocalAvatarSurfaces(getLocalPrototypeAvatarSrc());
  }

  window.syncLocalProfileAvatarSurfaces = syncLocalProfileAvatarSurfaces;

  /**
   * Not-connected controller (NCC) hydrates profilePhoto from Figma MCP URLs after init.
   * Re-apply the same avatar URL as the sidebar "You" chip and keep handle text in sync.
   */
  function syncNccProfileFromPrototypeYou() {
    var AV = window.PROTOTYPE_PLAYER_AVATARS;
    var src = AV && AV.local;
    if (!src) {
      var youAv = document.getElementById("prototypeYouAvatar");
      if (youAv) src = youAv.getAttribute("src");
    }
    if (src) {
      var imgs = document.querySelectorAll(
        '#fccSignedIn img[data-fg="profilePhoto"], #fccInvite img[data-fg="profilePhoto"], #ngcControllerSettingsProfile img[data-fg="profilePhoto"]'
      );
      for (var i = 0; i < imgs.length; i++) {
        var imgEl = imgs[i];
        imgEl.setAttribute("src", src);
        imgEl.alt = "";
        var wrap = imgEl.closest(".ncc-avatar--mask");
        if (wrap) {
          wrap.style.maskImage = "";
          wrap.style.webkitMaskImage = "";
        }
      }
    }
    var H = window.PROTOTYPE_PLAYER_HANDLES;
    if (!H || H.local == null || H.local === "") return;
    var handles = document.querySelectorAll(
      '#fccSignedIn .ncc-handle[data-prototype-player-handle="local"], #fccInvite .ncc-handle[data-prototype-player-handle="local"], #ngcControllerSettingsProfile .ncc-handle[data-prototype-player-handle="local"]'
    );
    for (var h = 0; h < handles.length; h++) {
      handles[h].textContent = H.local;
    }
  }

  window.syncNccProfileFromPrototypeYou = syncNccProfileFromPrototypeYou;

  function configureClonedFriendCard(card, key, online) {
    card.setAttribute("data-player-panel-handle-key", key);
    card.classList.toggle("tv-dashboard__friends-focus-player-card--online", !!online);
    card.classList.toggle("tv-dashboard__friends-focus-player-card--offline", !online);
    var handleSpan = card.querySelector(".tv-dashboard__friends-focus-handle-name span");
    if (handleSpan) {
      handleSpan.setAttribute("data-prototype-player-handle", key);
      handleSpan.textContent = "";
    }
    var statusRow = card.querySelector(".tv-dashboard__friends-focus-handle-status");
    if (statusRow) {
      var statusImg = statusRow.querySelector("img");
      var statusLabel = statusRow.querySelector("span:not(.fc-presence-dot)");
      if (statusImg) {
        statusImg.src = online
          ? "assets/raster/game-invite-1-6683/status-online-dot.svg"
          : "assets/raster/game-invite-1-6683/status-offline-dot.png";
      }
      if (statusLabel) statusLabel.textContent = online ? "Online" : "Offline";
    }
    var meta = card.querySelector(".tv-dashboard__friends-focus-player-meta");
    if (meta) meta.hidden = !online;
    card.hidden = true;
    card.setAttribute("aria-hidden", "true");
    if (typeof window.PrototypePresence !== "undefined") {
      window.PrototypePresence.syncFriendsFocusCard(card);
    }
  }

  function configureClonedInviteListItem(item, key, online) {
    item.setAttribute("data-player-panel-handle-key", key);
    var nameSpan = item.querySelector(".game-invite-list__name span");
    if (nameSpan) {
      nameSpan.setAttribute("data-prototype-player-handle", key);
      nameSpan.textContent = "";
    }
    var status = item.querySelector(".game-invite-list__status");
    if (status) {
      status.classList.toggle("game-invite-list__status--online", !!online);
      status.classList.toggle("game-invite-list__status--offline", !online);
      status.classList.remove("game-invite-list__status--idle");
      var statusImg = status.querySelector("img");
      var statusLabel = status.querySelector("span");
      if (statusImg) {
        statusImg.src = online
          ? "assets/raster/game-invite-1-6683/status-online-dot.svg"
          : "assets/raster/game-invite-1-6683/status-offline-dot.png";
      }
      if (statusLabel) statusLabel.textContent = online ? "Online" : "Offline";
    }
    item.hidden = true;
    item.setAttribute("aria-hidden", "true");
  }

  function ensurePrototypeFriendRosterSlots() {
    if (ensurePrototypeFriendRosterSlots.done) return;
    ensurePrototypeFriendRosterSlots.done = true;

    var cardsWrap = document.querySelector(".tv-dashboard__friends-focus-player-cards");
    var offlineTemplate =
      cardsWrap && cardsWrap.querySelector('[data-player-panel-handle-key="list-4"]');
    var onlineTemplate =
      cardsWrap && cardsWrap.querySelector('[data-player-panel-handle-key="list-1"]');
    var inviteTrack = document.querySelector("#tvDashboardInviteShell .game-invite-list__list-track");
    var offlineInviteTemplate =
      inviteTrack && inviteTrack.querySelector('[data-player-panel-handle-key="list-4"]');
    var onlineInviteTemplate =
      inviteTrack && inviteTrack.querySelector('[data-player-panel-handle-key="list-1"]');
    if (!cardsWrap || !offlineTemplate) return;

    for (var i = 5; i < PROTOTYPE_FRIEND_SLOT_COUNT; i++) {
      var key = "list-" + i;
      if (cardsWrap.querySelector('[data-player-panel-handle-key="' + key + '"]')) continue;
      var online = i % 2 === 0;
      var card = (online && onlineTemplate ? onlineTemplate : offlineTemplate).cloneNode(true);
      configureClonedFriendCard(card, key, online);
      cardsWrap.appendChild(card);

      if (inviteTrack) {
        var inviteTemplate = online && onlineInviteTemplate ? onlineInviteTemplate : offlineInviteTemplate;
        if (inviteTemplate) {
          var inviteItem = inviteTemplate.cloneNode(true);
          configureClonedInviteListItem(inviteItem, key, online);
          inviteTrack.appendChild(inviteItem);
        }
      }
    }
  }

  window.ensurePrototypeFriendRosterSlots = ensurePrototypeFriendRosterSlots;

  function applyPrototypeGameHandle() {
    ensurePrototypeFriendRosterSlots();
    if (prototypeGameHandleApplied) return;
    prototypeGameHandleApplied = true;
    var deck = shuffleArray(PROTOTYPE_GAME_HANDLE_POOL);
    var byRole = {};
    byRole.inviter = deck[0];
    byRole["friend-requester"] = deck[1];
    byRole["list-0"] = deck[1];
    byRole["list-1"] = deck[2];
    byRole["list-2"] = deck[3];
    byRole["list-3"] = deck[4];
    byRole["list-4"] = deck[5];
    byRole["list-5"] = deck[9];
    byRole["list-6"] = deck[10];
    byRole["list-7"] = deck[11];
    byRole["list-8"] = deck[12];
    byRole["list-9"] = deck[13];
    byRole.local = deck[6];
    byRole["lobby-p3"] = deck[7];
    byRole["lobby-p4"] = deck[8];
    byRole["lobby-host"] = byRole.inviter;
    byRole["lobby-p2"] = byRole.local;

    window.PROTOTYPE_PLAYER_HANDLES = byRole;
    window.PROTOTYPE_GAME_HANDLE = byRole.inviter;
    window.PROTOTYPE_LOCAL_HANDLE = byRole.local;
    if (
      typeof window.PROTOTYPE_LOCAL_SESSION_GAME_TITLE !== "string" ||
      !String(window.PROTOTYPE_LOCAL_SESSION_GAME_TITLE).trim()
    ) {
      window.PROTOTYPE_LOCAL_SESSION_GAME_TITLE = "FIFA World Cup";
    }

    var slots = document.querySelectorAll("[data-prototype-player-handle]");
    for (var s = 0; s < slots.length; s++) {
      var el = slots[s];
      var key = el.getAttribute("data-prototype-player-handle");
      if (key && Object.prototype.hasOwnProperty.call(byRole, key)) {
        el.textContent = byRole[key];
      }
    }

    if (typeof window.syncTvDashboardIdentityDisplay === "function") {
      window.syncTvDashboardIdentityDisplay();
    }

    function syncLobbyRow(selector, roleKey, suffix) {
      var row = document.querySelector(selector);
      if (!row) return;
      var h = byRole[roleKey];
      var base = h + ", " + suffix;
      row.setAttribute("data-aria-label-base", base);
      row.setAttribute("aria-label", base);
    }
    syncLobbyRow(
      ".tv-gameplay-interactive__row--p2.tv-gameplay-interactive__row-btn",
      "lobby-p2",
      "Player 2"
    );
    syncLobbyRow(
      ".tv-gameplay-interactive__row--p3.tv-gameplay-interactive__row-btn",
      "lobby-p3",
      "Player 3"
    );
    syncLobbyRow(
      ".tv-gameplay-interactive__row--p4.tv-gameplay-interactive__row-btn",
      "lobby-p4",
      "Player 4"
    );

    var avDeck = buildShuffledPrototypeAvatarDeck();
    var byAvatar = {};
    byAvatar.inviter = avDeck[0];
    byAvatar["friend-requester"] = avDeck[1];
    byAvatar["list-0"] = avDeck[1];
    byAvatar["list-1"] = avDeck[2];
    byAvatar["list-2"] = avDeck[3];
    byAvatar["list-3"] = avDeck[4];
    byAvatar["list-4"] = avDeck[5];
    byAvatar["list-5"] = avDeck[9];
    byAvatar["list-6"] = avDeck[10];
    byAvatar["list-7"] = avDeck[11];
    byAvatar["list-8"] = avDeck[12];
    byAvatar["list-9"] = avDeck[13];
    byAvatar.local = avDeck[6];
    byAvatar["lobby-p3"] = avDeck[7];
    byAvatar["lobby-p4"] = avDeck[8];
    byAvatar["lobby-host"] = byAvatar.inviter;
    byAvatar["lobby-p2"] = byAvatar.local;
    applyPrototypePlayerAvatarMap(byAvatar);
    if (typeof window.syncMobileDashboardFriendsList === "function") {
      window.syncMobileDashboardFriendsList();
    }
  }

  window.applyPrototypeGameHandle = applyPrototypeGameHandle;

  var SOLO_HOST_AVATAR = "assets/profile-avatars/type-01-luffy.png";
  var MULTI_HOST_AVATAR = "assets/profile-avatars/type-01-haru.png";

  /**
   * Host row shows you (local) when solo or when multiple local players are connected;
   * inviter when an online guest joins a single-local session. Stop playing hides the host row.
   */
  function syncLobbyHostIdentityForPlayerCount() {
    var H = window.PROTOTYPE_PLAYER_HANDLES;
    if (!H) return;
    var counts =
      typeof window.getTvPlayersJoinedCounts === "function"
        ? window.getTvPlayersJoinedCounts()
        : { local: 1, total: 1 };
    var localCount = counts.local || 1;
    if (!(localCount >= 1 && localCount <= 4)) localCount = 1;
    var total = counts.total;
    if (!(total >= 1 && total <= 4)) total = 1;
    var profileDisconnected = !!window.PROTOTYPE_LOCAL_PROFILE_DISCONNECTED;

    var hostRow = document.querySelector(
      ".tv-gameplay-interactive__row--host.tv-gameplay-interactive__row-btn"
    );
    if (!hostRow) return;

    if (profileDisconnected) {
      hostRow.classList.add("tv-gameplay-interactive__row--join-hidden");
      hostRow.tabIndex = -1;
      hostRow.classList.remove("tv-gameplay-interactive__row--tv-focused");
      return;
    }

    hostRow.classList.remove("tv-gameplay-interactive__row--join-hidden");

    var showLocalAsHost = localCount > 1 || total === 1;
    var handle = showLocalAsHost ? H.local : H.inviter;
    var nameSpan = hostRow.querySelector('[data-prototype-player-handle="lobby-host"]');
    if (nameSpan) nameSpan.textContent = handle;

    var base = handle + ", Host";
    hostRow.setAttribute("data-aria-label-base", base);
    if (hostRow.classList.contains("tv-gameplay-interactive__row--team-right")) {
      hostRow.setAttribute("aria-label", base + ", right team");
    } else if (hostRow.classList.contains("tv-gameplay-interactive__row--team-left")) {
      hostRow.setAttribute("aria-label", base + ", left team");
    } else {
      hostRow.setAttribute("aria-label", base);
    }

    var hostAv = hostRow.querySelector(".tv-gameplay-interactive__avatar img");
    if (hostAv) {
      var AV = window.PROTOTYPE_PLAYER_AVATARS;
      hostAv.src = showLocalAsHost
        ? (AV && AV.local) || SOLO_HOST_AVATAR
        : (AV && AV.inviter) || MULTI_HOST_AVATAR;
      hostAv.alt = "";
    }
  }

  window.syncLobbyHostIdentityForPlayerCount = syncLobbyHostIdentityForPlayerCount;

  var LOCAL_COPLAYER_SLOT_KEYS = ["local-p2", "local-p3", "local-p4"];
  var ONLINE_COPLAYER_SLOT_KEYS = ["online-p1", "online-p2", "online-p3", "online-p4"];
  var CONTROLLER_SLOT_ICON_EMPTY =
    "assets/raster/dashboard-controllers-focus-74-7142/icon-plus-38.png";
  var DEFAULT_LOCAL_CONTROLLER_AVATAR = "assets/profile-avatars/type-01-luffy.png";
  /** @type {{ key: string, handle: string, avatar: string }[]} */
  var localCoplayerRoster = [];
  /** @type {{ key: string, handle: string, avatar: string, online: boolean }[]} */
  var onlineCoplayerRoster = [];

  function collectReservedLocalCoplayerIdentities() {
    var handles = Object.create(null);
    var avatars = Object.create(null);
    var H = window.PROTOTYPE_PLAYER_HANDLES || {};
    var A = window.PROTOTYPE_PLAYER_AVATARS || {};
    var keys = Object.keys(H);
    for (var i = 0; i < keys.length; i++) {
      var hk = H[keys[i]];
      if (hk) handles[String(hk)] = true;
    }
    keys = Object.keys(A);
    for (var j = 0; j < keys.length; j++) {
      var av = A[keys[j]];
      if (av) avatars[String(av)] = true;
    }
    for (var k = 0; k < localCoplayerRoster.length; k++) {
      if (localCoplayerRoster[k].handle) handles[localCoplayerRoster[k].handle] = true;
      if (localCoplayerRoster[k].avatar) avatars[localCoplayerRoster[k].avatar] = true;
    }
    for (var o = 0; o < onlineCoplayerRoster.length; o++) {
      if (onlineCoplayerRoster[o].handle) handles[onlineCoplayerRoster[o].handle] = true;
      if (onlineCoplayerRoster[o].avatar) avatars[onlineCoplayerRoster[o].avatar] = true;
    }
    return { handles: handles, avatars: avatars };
  }

  function pickRandomUnusedHandle(reservedHandles) {
    var pool = PROTOTYPE_GAME_HANDLE_POOL.slice();
    shuffleArray(pool);
    for (var i = 0; i < pool.length; i++) {
      if (!reservedHandles[pool[i]]) return pool[i];
    }
    var suffix = 2;
    var base = pool[0] || "LocalPlayer";
    while (reservedHandles[base + suffix] && suffix < 99) suffix++;
    return base + suffix;
  }

  function pickRandomUnusedAvatar(reservedAvatars) {
    var paths = window.PROFILE_AVATAR_PATHS;
    var pool =
      paths && paths.length
        ? paths.slice()
        : LEGACY_PROTOTYPE_AVATAR_DECK.slice();
    shuffleArray(pool);
    for (var i = 0; i < pool.length; i++) {
      if (!reservedAvatars[pool[i]]) return pool[i];
    }
    return pool[0] || "assets/profile-avatars/type-01-luffy.png";
  }

  function createRandomLocalCoplayerEntry(index) {
    var reserved = collectReservedLocalCoplayerIdentities();
    return {
      key: LOCAL_COPLAYER_SLOT_KEYS[index] || "local-p" + (index + 2),
      handle: pickRandomUnusedHandle(reserved.handles),
      avatar: pickRandomUnusedAvatar(reserved.avatars),
      online: false,
    };
  }

  function createRandomOnlineCoplayerEntry(index) {
    var reserved = collectReservedLocalCoplayerIdentities();
    return {
      key: ONLINE_COPLAYER_SLOT_KEYS[index] || "online-p" + (index + 1),
      handle: pickRandomUnusedHandle(reserved.handles),
      avatar: pickRandomUnusedAvatar(reserved.avatars),
      online: true,
    };
  }

  function getLocalPlayerIdentityForControllerSlot(slotIndex) {
    if (slotIndex === 0) {
      var H = window.PROTOTYPE_PLAYER_HANDLES || {};
      var A = window.PROTOTYPE_PLAYER_AVATARS || {};
      return {
        handle: H.local || "You",
        avatar: A.local || getLocalPrototypeAvatarSrc() || DEFAULT_LOCAL_CONTROLLER_AVATAR,
      };
    }
    var coplayer = localCoplayerRoster[slotIndex - 1];
    if (!coplayer) return null;
    return {
      handle: coplayer.handle,
      avatar: coplayer.avatar,
    };
  }

  function setControllerFocusSlotEmpty(slotEl) {
    if (!slotEl) return;
    slotEl.classList.remove("tv-dashboard__controllers-focus-slot--connected");
    slotEl.classList.add("tv-dashboard__controllers-focus-slot--empty");
    slotEl.setAttribute("aria-hidden", "true");
    slotEl.removeAttribute("aria-label");
    slotEl.innerHTML =
      '<img src="' +
      CONTROLLER_SLOT_ICON_EMPTY +
      '" alt="" width="38" height="38" decoding="async" />';
  }

  function setControllerFocusSlotPlayer(slotEl, player) {
    if (!slotEl || !player) return;
    var handle = String(player.handle || "Player").replace(/\s+/g, " ").trim() || "Player";
    var avatar = player.avatar || DEFAULT_LOCAL_CONTROLLER_AVATAR;
    slotEl.classList.add("tv-dashboard__controllers-focus-slot--connected");
    slotEl.classList.remove("tv-dashboard__controllers-focus-slot--empty");
    slotEl.setAttribute("aria-hidden", "false");
    slotEl.setAttribute("aria-label", handle);
    slotEl.innerHTML =
      '<div class="tv-dashboard__controllers-focus-slot-avatar-wrap">' +
      '<img class="tv-dashboard__controllers-focus-slot-avatar" src="' +
      avatar +
      '" alt="" decoding="async" />' +
      "</div>" +
      '<p class="tv-dashboard__controllers-focus-slot-handle"></p>';
    var handleEl = slotEl.querySelector(".tv-dashboard__controllers-focus-slot-handle");
    if (handleEl) handleEl.textContent = handle;
  }

  function buildConnectedControllerSlotPlayers(localCount) {
    var players = [];
    var profileDisconnected = !!window.PROTOTYPE_LOCAL_PROFILE_DISCONNECTED;
    if (!profileDisconnected) {
      players.push(getLocalPlayerIdentityForControllerSlot(0));
    }
    for (var c = 0; c < localCoplayerRoster.length; c++) {
      players.push({
        handle: localCoplayerRoster[c].handle,
        avatar: localCoplayerRoster[c].avatar,
      });
    }
    var maxSlots = localCount;
    if (!(maxSlots >= 1 && maxSlots <= 4)) maxSlots = 1;
    if (profileDisconnected) {
      maxSlots = Math.max(localCoplayerRoster.length, 0);
    }
    return { players: players, visibleCount: Math.min(maxSlots, players.length) };
  }

  function syncTvDashboardControllerSlots(localCount) {
    var slots = document.querySelectorAll(
      "#tvDashboardControllersFocus .tv-dashboard__controllers-focus-slots .tv-dashboard__controllers-focus-slot"
    );
    var built = buildConnectedControllerSlotPlayers(localCount);
    for (var i = 0; i < slots.length; i++) {
      if (i < built.visibleCount && built.players[i]) {
        setControllerFocusSlotPlayer(slots[i], built.players[i]);
      } else {
        setControllerFocusSlotEmpty(slots[i]);
      }
    }
  }

  var LOBBY_COPLAYER_ROWS = [
    {
      selector: ".tv-gameplay-interactive__row--p2.tv-gameplay-interactive__row-btn",
      roleKey: "lobby-p2",
      suffix: "Player 2",
    },
    {
      selector: ".tv-gameplay-interactive__row--p3.tv-gameplay-interactive__row-btn",
      roleKey: "lobby-p3",
      suffix: "Player 3",
    },
    {
      selector: ".tv-gameplay-interactive__row--p4.tv-gameplay-interactive__row-btn",
      roleKey: "lobby-p4",
      suffix: "Player 4",
    },
  ];

  function applyLobbyRowIdentity(rowDef, handle, avatar) {
    var row = document.querySelector(rowDef.selector);
    if (!row) return;
    var nameSpan = row.querySelector(
      '[data-prototype-player-handle="' + rowDef.roleKey + '"]'
    );
    if (nameSpan) nameSpan.textContent = handle;
    var av = row.querySelector(".tv-gameplay-interactive__avatar img");
    if (av && avatar) {
      av.setAttribute("src", avatar);
      av.alt = "";
    }
    var base = handle + ", " + rowDef.suffix;
    row.setAttribute("data-aria-label-base", base);
    if (row.classList.contains("tv-gameplay-interactive__row--team-right")) {
      row.setAttribute("aria-label", base + ", right team");
    } else if (row.classList.contains("tv-gameplay-interactive__row--team-left")) {
      row.setAttribute("aria-label", base + ", left team");
    } else {
      row.setAttribute("aria-label", base);
    }
  }

  function restoreDefaultLobbyRowIdentity(rowDef) {
    var H = window.PROTOTYPE_PLAYER_HANDLES || {};
    var A = window.PROTOTYPE_PLAYER_AVATARS || {};
    applyLobbyRowIdentity(rowDef, H[rowDef.roleKey] || rowDef.suffix, A[rowDef.roleKey] || "");
  }

  function syncLobbyLocalCoplayerSurfaces() {
    var counts =
      typeof window.getTvPlayersJoinedCounts === "function"
        ? window.getTvPlayersJoinedCounts()
        : { local: 1, total: 1 };
    var total = counts.total;
    if (!(total >= 1 && total <= 4)) total = 1;
    var localExtra = Math.max(0, (counts.local || 1) - 1);
    var onlineExtra = Math.max(0, total - (counts.local || 1));

    for (var i = 0; i < LOBBY_COPLAYER_ROWS.length; i++) {
      if (total < i + 2) continue;
      if (i < localExtra && localCoplayerRoster[i]) {
        applyLobbyRowIdentity(
          LOBBY_COPLAYER_ROWS[i],
          localCoplayerRoster[i].handle,
          localCoplayerRoster[i].avatar
        );
      } else if (i - localExtra < onlineExtra && onlineCoplayerRoster[i - localExtra]) {
        applyLobbyRowIdentity(
          LOBBY_COPLAYER_ROWS[i],
          onlineCoplayerRoster[i - localExtra].handle,
          onlineCoplayerRoster[i - localExtra].avatar
        );
      } else {
        restoreDefaultLobbyRowIdentity(LOBBY_COPLAYER_ROWS[i]);
      }
    }
  }

  function publishSessionCoplayerRosters() {
    window.PROTOTYPE_LOCAL_COPLAYERS = localCoplayerRoster.slice();
    window.PROTOTYPE_ONLINE_COPLAYERS = onlineCoplayerRoster.slice();
    window.PROTOTYPE_SESSION_COPLAYERS = localCoplayerRoster.concat(onlineCoplayerRoster);
  }

  function syncPrototypeLocalCoplayers() {
    var counts =
      typeof window.getTvPlayersJoinedCounts === "function"
        ? window.getTvPlayersJoinedCounts()
        : { local: 1, online: 0, total: 1 };
    var localCount = counts.local;
    if (!(localCount >= 1 && localCount <= 4)) localCount = 1;
    if (localCount === 1) {
      window.PROTOTYPE_LOCAL_PROFILE_DISCONNECTED = false;
    }
    var onlineCount = counts.online;
    if (!(onlineCount >= 0 && onlineCount <= 4)) onlineCount = 0;
    var targetLocalCoplayers = Math.max(0, localCount - 1);
    var targetOnlineCoplayers = onlineCount;

    while (localCoplayerRoster.length < targetLocalCoplayers) {
      localCoplayerRoster.push(createRandomLocalCoplayerEntry(localCoplayerRoster.length));
    }
    while (localCoplayerRoster.length > targetLocalCoplayers) {
      localCoplayerRoster.pop();
    }

    while (onlineCoplayerRoster.length < targetOnlineCoplayers) {
      onlineCoplayerRoster.push(createRandomOnlineCoplayerEntry(onlineCoplayerRoster.length));
    }
    while (onlineCoplayerRoster.length > targetOnlineCoplayers) {
      onlineCoplayerRoster.pop();
    }

    publishSessionCoplayerRosters();
    syncTvDashboardControllerSlots(localCount);
    syncLobbyHostIdentityForPlayerCount();
    syncLobbyLocalCoplayerSurfaces();
    if (typeof window.syncMobileDashboardPlayerList === "function") {
      window.syncMobileDashboardPlayerList();
    }
    if (typeof window.syncVoiceChatChrome === "function") {
      window.syncVoiceChatChrome();
    }
    if (typeof window.syncMobileDashboardStopPlayingMenuItem === "function") {
      window.syncMobileDashboardStopPlayingMenuItem();
    }
    if (typeof window.syncMobileDashboardDisconnectedUi === "function") {
      window.syncMobileDashboardDisconnectedUi();
    }
    if (typeof window.PrototypePresence !== "undefined") {
      window.PrototypePresence.syncAllFriendsPresenceSurfaces();
      window.PrototypePresence.syncProfileFocusPresence();
      window.PrototypePresence.syncLobbyLocalRowPresence();
      window.PrototypePresence.syncMobileLocalProfilePresence();
    }
    if (typeof window.refreshLocalPlayerData === "function") {
      window.refreshLocalPlayerData();
    }
  }

  /**
   * Remove a co-player from the session by roster key and sync control-panel player counts.
   * @param {string} playerKey
   * @returns {boolean}
   */
  function removeSessionCoplayerByKey(playerKey) {
    if (!playerKey) return false;
    if (
      typeof window.getActiveLocalPlayerKey === "function" &&
      playerKey === window.getActiveLocalPlayerKey()
    ) {
      return false;
    }

    var counts =
      typeof window.getTvPlayersJoinedCounts === "function"
        ? window.getTvPlayersJoinedCounts()
        : { local: 1, online: 0 };
    var local = counts.local;
    var online = counts.online;
    if (!(local >= 1 && local <= 4)) local = 1;
    if (!(online >= 0 && online <= 4)) online = 0;
    var removed = false;

    if (
      typeof window.isMultiLocalSession === "function" &&
      window.isMultiLocalSession() &&
      typeof window.getLocalPlayerKeyForIndex === "function"
    ) {
      for (var mi = 0; mi < local; mi++) {
        if (window.getLocalPlayerKeyForIndex(mi) !== playerKey) continue;
        if (mi > 0 && mi - 1 < localCoplayerRoster.length) {
          localCoplayerRoster.splice(mi - 1, 1);
        } else if (mi === 0 && localCoplayerRoster.length > 0) {
          localCoplayerRoster.splice(0, 1);
        }
        if (typeof window.setTvPlayersCountValue === "function") {
          window.setTvPlayersCountValue("local", String(Math.max(1, local - 1)));
        }
        removed = true;
        break;
      }
    }

    if (!removed) {
      for (var li = 0; li < localCoplayerRoster.length; li++) {
        if (localCoplayerRoster[li].key !== playerKey) continue;
        localCoplayerRoster.splice(li, 1);
        if (typeof window.setTvPlayersCountValue === "function") {
          window.setTvPlayersCountValue("local", String(Math.max(1, local - 1)));
        }
        removed = true;
        break;
      }
    }

    if (!removed) {
      for (var oi = 0; oi < onlineCoplayerRoster.length; oi++) {
        if (onlineCoplayerRoster[oi].key !== playerKey) continue;
        onlineCoplayerRoster.splice(oi, 1);
        if (typeof window.setTvPlayersCountValue === "function") {
          window.setTvPlayersCountValue("online", String(Math.max(0, online - 1)));
        }
        removed = true;
        break;
      }
    }

    if (!removed) return false;

    publishSessionCoplayerRosters();
    if (typeof window.clearPlayerListEntryConnecting === "function") {
      window.clearPlayerListEntryConnecting(playerKey);
    }
    if (typeof window.syncPrototypeLocalCoplayers === "function") {
      window.syncPrototypeLocalCoplayers();
    }
    if (typeof window.applyTvPlayersJoinedFromControl === "function") {
      window.applyTvPlayersJoinedFromControl();
    }
    if (typeof window.refreshLocalPlayerData === "function") {
      window.refreshLocalPlayerData();
    }
    if (typeof window.syncMobileDashboardPlayerList === "function") {
      window.syncMobileDashboardPlayerList();
    }
    if (typeof window.syncVoiceChatChrome === "function") {
      window.syncVoiceChatChrome();
    }
    return true;
  }

  window.syncPrototypeLocalCoplayers = syncPrototypeLocalCoplayers;
  window.syncTvDashboardControllerSlots = syncTvDashboardControllerSlots;
  window.removeSessionCoplayerByKey = removeSessionCoplayerByKey;

  function applyPrototypePlayerAvatarMap(byAvatar) {
    window.PROTOTYPE_PLAYER_AVATARS = byAvatar;
    var keys = PROTOTYPE_FRIEND_LIST_KEYS.concat(["lobby-p2", "lobby-p3", "lobby-p4"]);
    for (var k = 0; k < keys.length; k++) {
      var role = keys[k];
      if (byAvatar[role]) setAvatarOnPlayerPanelHandleKey(role, byAvatar[role]);
    }
    if (byAvatar.inviter) applyInviterAvatarSurfaces(byAvatar.inviter);
    if (byAvatar.local) applyLocalAvatarSurfaces(byAvatar.local);
    syncLobbyHostIdentityForPlayerCount();
    if (typeof window.syncTvFriendsFocusStripLayout === "function") {
      window.requestAnimationFrame(function () {
        window.syncTvFriendsFocusStripLayout();
      });
    }
  }

  function pickRandomPrototypeGameHandle() {
    var pool = PROTOTYPE_GAME_HANDLE_POOL;
    if (!pool || !pool.length) return "NeonRavager";
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function getCurrentFriendKeysForGameInvite() {
    var candidates = [];
    var seen = Object.create(null);

    function addKey(key) {
      if (!key || seen[key]) return;
      if (
        typeof window.isActiveLocalPlayerFriend === "function" &&
        !window.isActiveLocalPlayerFriend(key)
      ) {
        return;
      }
      if (
        typeof window.isNonFriendLocalPlayerForActive === "function" &&
        window.isNonFriendLocalPlayerForActive(key)
      ) {
        return;
      }
      var activeKey =
        typeof window.getActiveLocalPlayerKey === "function"
          ? window.getActiveLocalPlayerKey()
          : "local";
      if (key === activeKey) return;
      seen[key] = true;
      candidates.push(key);
    }

    if (typeof window.getActiveLocalPlayerFriendKeys === "function") {
      var rosterKeys = window.getActiveLocalPlayerFriendKeys();
      for (var ri = 0; ri < rosterKeys.length; ri++) {
        addKey(rosterKeys[ri]);
      }
    }

    if (!candidates.length) {
      var app = document.getElementById("app");
      var countRaw = app && app.getAttribute("data-friends-count");
      var count = parseInt(countRaw, 10);
      if (!(count >= 0)) {
        var sel = document.getElementById("selFriendsCount");
        count = sel ? parseInt(sel.value, 10) : PROTOTYPE_FRIEND_LIST_KEYS.length;
      }
      if (!(count >= 0)) count = PROTOTYPE_FRIEND_LIST_KEYS.length;
      count = Math.max(0, Math.min(PROTOTYPE_FRIEND_SLOT_COUNT, count));
      for (var fi = 0; fi < count; fi++) {
        addKey(PROTOTYPE_FRIEND_LIST_KEYS[fi]);
      }
    }

    return candidates;
  }

  /**
   * Picks a random current friend as the game-invite inviter, updates all
   * `[data-prototype-player-handle="inviter"]` nodes, and refreshes lobby host copy.
   * Returns the chosen friend handle key, or null when no current friends exist.
   * Used when simulating a new TV game-invite toast.
   */
  function applyRandomInviterHandleToPrototype() {
    if (typeof window.refreshLocalPlayerData === "function") {
      window.refreshLocalPlayerData();
    }
    if (!prototypeGameHandleApplied) {
      applyPrototypeGameHandle();
    }
    var H = window.PROTOTYPE_PLAYER_HANDLES;
    if (!H) return null;

    var friendKeys = getCurrentFriendKeysForGameInvite();
    if (!friendKeys.length) {
      delete window.PROTOTYPE_GAME_INVITE_INVITER_KEY;
      return null;
    }

    var friendKey = friendKeys[Math.floor(Math.random() * friendKeys.length)];
    var tries = 0;
    while (friendKeys.length > 1 && tries < 12) {
      var candidateHandle = H[friendKey];
      if (candidateHandle && candidateHandle !== H.inviter) break;
      friendKey = friendKeys[Math.floor(Math.random() * friendKeys.length)];
      tries++;
    }

    var next = H[friendKey];
    if (!next) return null;

    H.inviter = next;
    H["lobby-host"] = next;
    window.PROTOTYPE_GAME_HANDLE = next;
    window.PROTOTYPE_GAME_INVITE_INVITER_KEY = friendKey;

    var inviterSlots = document.querySelectorAll('[data-prototype-player-handle="inviter"]');
    for (var i = 0; i < inviterSlots.length; i++) {
      inviterSlots[i].textContent = next;
    }

    var AV = window.PROTOTYPE_PLAYER_AVATARS;
    if (AV) {
      var avatarSrc = AV[friendKey];
      if (!avatarSrc) {
        var card = document.querySelector(
          '.tv-dashboard__friends-focus-player-card[data-player-panel-handle-key="' +
            friendKey +
            '"] .tv-dashboard__friends-focus-player-avatar-img'
        );
        if (card && card.getAttribute("src")) avatarSrc = card.getAttribute("src");
      }
      if (avatarSrc) {
        AV.inviter = avatarSrc;
        AV["lobby-host"] = avatarSrc;
        applyInviterAvatarSurfaces(avatarSrc);
      }
    }
    syncLobbyHostIdentityForPlayerCount();
    return friendKey;
  }

  window.applyRandomInviterHandleToPrototype = applyRandomInviterHandleToPrototype;

  function dashboardContextIsInviteLike(appEl) {
    var c = appEl && appEl.getAttribute("data-dashboard-context");
    return (
      c === "invite" ||
      c === "game-invite" ||
      c === "player-panel-external"
    );
  }

  function isExitOnlyDashboardContext() {
    var app = document.getElementById("app");
    return app && app.getAttribute("data-dashboard-context") === "exit-only";
  }

  function isControllersOnlyDashboardContext() {
    var app = document.getElementById("app");
    return app && app.getAttribute("data-dashboard-context") === "controllers-only";
  }

  function isChromelessDashboardContext() {
    return isExitOnlyDashboardContext() || isControllersOnlyDashboardContext();
  }

  var bank = window.FIGMA_DASHBOARD;
  var levels = [];
  var levelIndex = 0;
  var stateIndex = 0;
  var savedRowSlot = 0;
  var listeners = [];
  var gpPrev = { left: false, right: false, up: false, down: false, a: false, b: false };
  var rafId = 0;
  var inited = false;
  /** True when focus is on the header notifications control (not yet in the notifications full-screen state). */
  var headerNotificationsFocused = false;
  /** If true, ↓ from notifications header returns to content; if false (came via ↑ from nav), ↓ returns to main nav only. */
  var headerNotificationsFromContent = false;
  /** After closing the notifications panel, restore this on the header so ↓ returns to content when applicable. */
  var notificationsExitReturnToContent = false;
  /** Snapshot of `contentInnerSlot` when leaving content for the header Notifications control (↑). Restored on ↓ back to content. */
  var contentInnerSlotSavedForHeaderReturn = null;
  /** True when TV focus has moved up from the main nav into the dashboard content (stage) area. */
  var contentFocusActive = false;
  /** Horizontal index into the active tab's content focus chain while content focus is on. */
  var contentInnerSlot = 0;
  /** Centered notifications panel open (Figma 76:7471); bottom nav scaled/blurred/disabled. */
  var notificationsPanelOpen = false;
  /** Friends content focus was active before opening player panel from the Friends strip; restore slot on close. */
  var tvDashboardFriendsPanelSuspended = false;
  var tvDashboardFriendsSavedSlot = null;
  /** Previous main-row `stateIndex` after last `applyDom`, for tab-switch content motion. */
  var dashboardNavContentAnimPrevIndex = null;
  var DASH_NAV_ENTER_CLASS = "tv-dashboard__dash-nav-enter";
  var DASH_NAV_ENTER_CLEAR_MS = 820;
  /** Gamepad / programmatic focus does not match :focus-visible; mirror ring via class (see tv-focus-profile.css). */
  var DASH_CONTENT_TV_RING_CLASS = "tv-dashboard__dash-content-focusable--tv-ring";
  var DASH_STAGE_WRAP_TV_RING_CLASS = "tv-dashboard__stage-wrap--tv-ring";

  function clearDashboardTvFocusRingClasses() {
    var dash = document.getElementById("tvDashboard");
    if (dash) {
      var marked = dash.querySelectorAll("." + DASH_CONTENT_TV_RING_CLASS);
      for (var i = 0; i < marked.length; i++) {
        marked[i].classList.remove(DASH_CONTENT_TV_RING_CLASS);
      }
    }
    var wrap = document.getElementById("tvDashboardContentFocus");
    if (wrap) wrap.classList.remove(DASH_STAGE_WRAP_TV_RING_CLASS);
  }

  function syncDashboardContentTvRingClass() {
    clearDashboardTvFocusRingClasses();
    if (!contentFocusActive) return;
    var ae = document.activeElement;
    var wrap = document.getElementById("tvDashboardContentFocus");
    if (ae && ae.classList && ae.classList.contains("tv-dashboard__dash-content-focusable")) {
      ae.classList.add(DASH_CONTENT_TV_RING_CLASS);
      return;
    }
    if (wrap && ae === wrap) {
      wrap.classList.add(DASH_STAGE_WRAP_TV_RING_CLASS);
    }
  }

  function getPrimaryStates() {
    if (bank && bank.primaryStates && bank.primaryStates.length) {
      return bank.primaryStates;
    }
    return [];
  }

  function indexOfStateId(id) {
    var all = getPrimaryStates();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return i;
    }
    return -1;
  }

  function getRowIndices() {
    var all = getPrimaryStates();
    var ids = (bank && bank.horizontalNavStateIds) || [];
    var out = [];
    for (var i = 0; i < ids.length; i++) {
      var ix = indexOfStateId(ids[i]);
      if (ix >= 0) out.push(ix);
    }
    if (out.length) return out;
    var notif = indexOfStateId((bank && bank.notificationsStateId) || "notifications");
    for (var j = 0; j < all.length; j++) {
      if (j !== notif) out.push(j);
    }
    return out;
  }

  function getNotificationsIndex() {
    var id = (bank && bank.notificationsStateId) || "notifications";
    var ix = indexOfStateId(id);
    if (ix >= 0) return ix;
    return 1;
  }

  function usePrimaryNavModel() {
    return !levels.length && bank && getPrimaryStates().length > 0;
  }

  function currentStates() {
    var L = levels.length ? levels : [{ id: "primary", states: getPrimaryStates() }];
    var lev = L[levelIndex] || L[0];
    return (lev && lev.states) || [];
  }

  function isNotificationsView() {
    if (!usePrimaryNavModel()) return false;
    return notificationsPanelOpen;
  }

  function rowSlotForStateIndex(ix) {
    var row = getRowIndices();
    for (var s = 0; s < row.length; s++) {
      if (row[s] === ix) return s;
    }
    return 0;
  }

  /** True if current state is a main horizontal row item (not the notifications full-screen state). */
  function isOnMainRowState() {
    var row = getRowIndices();
    for (var r = 0; r < row.length; r++) {
      if (row[r] === stateIndex) return true;
    }
    return false;
  }

  function notify() {
    var st = currentStates();
    var s = st[stateIndex];
    var payload = {
      levelIndex: levelIndex,
      stateIndex: stateIndex,
      levelId: (levels[levelIndex] && levels[levelIndex].id) || "primary",
      state: s || null,
      states: st
    };
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](payload);
      } catch (e) {}
    }
  }

  function resolveAssetUrl(relative) {
    if (!relative || typeof relative !== "string") return relative;
    if (/^https?:\/\//i.test(relative) || relative.indexOf("data:") === 0 || relative.indexOf("blob:") === 0) {
      return relative;
    }
    try {
      return new URL(relative, document.baseURI || document.documentURI || document.URL).href;
    } catch (e) {
      return relative;
    }
  }

  function hydratePrimaryNav() {
    var cfg = window.FIGMA_DASHBOARD_PRIMARY_NAV;
    if (!cfg || !cfg.items || !cfg.items.length) return;
    var nav = document.getElementById("tvDashboardPrimaryNav");
    if (!nav) return;
    for (var h = 0; h < cfg.items.length; h++) {
      var it = cfg.items[h];
      if (!it || !it.icon) continue;
      var el = nav.querySelector('[data-state-id="' + it.stateId + '"]');
      if (!el) continue;
      var img = el.querySelector(".tv-dashboard__nav-item__icon img");
      if (!img) continue;
      var url = resolveAssetUrl(it.icon);
      if (url) img.setAttribute("src", url);
    }
    syncLocalProfileAvatarSurfaces();
    nav.setAttribute("data-nav-hydrated", "1");
  }

  function hydrateHeader() {
    var cfg = window.FIGMA_DASHBOARD_HEADER;
    if (!cfg) return;
    var header = document.getElementById("tvDashboardHeader");
    if (!header) return;
    if (header.getAttribute("data-header-hydrated") === "1") return;
    var nImg = header.querySelector(".tv-dashboard__header-n");
    if (nImg && cfg.brandMark && cfg.brandMark.src) {
      nImg.setAttribute("src", resolveAssetUrl(cfg.brandMark.src));
    }
    var bImg = header.querySelector(".tv-dashboard__header-notif__icon img");
    if (bImg && cfg.notificationsButton && cfg.notificationsButton.icon) {
      bImg.setAttribute("src", resolveAssetUrl(cfg.notificationsButton.icon));
    }
    header.setAttribute("data-header-hydrated", "1");
  }

  function updateHeader() {
    var btn = document.getElementById("tvDashboardHeaderNotif");
    if (!btn) return;
    var inNotif = isNotificationsView();
    if (inNotif || isChromelessDashboardContext()) {
      btn.classList.remove("tv-dashboard__header-notif--focused");
      btn.classList.add("tv-dashboard__header-notif--disabled");
      btn.setAttribute("aria-disabled", "true");
      btn.setAttribute("aria-pressed", inNotif ? "true" : "false");
      return;
    }
    btn.classList.remove("tv-dashboard__header-notif--disabled");
    btn.removeAttribute("aria-disabled");
    btn.classList.toggle("tv-dashboard__header-notif--focused", headerNotificationsFocused);
    btn.setAttribute("aria-pressed", headerNotificationsFocused ? "true" : "false");
  }

  function updateNotificationsShell() {
    var dash = document.getElementById("tvDashboard");
    var shell = document.getElementById("tvDashboardNotificationsShell");
    var appEl = document.getElementById("app");
    if (!dash || !shell) return;
    var open = usePrimaryNavModel() && notificationsPanelOpen;
    dash.classList.toggle("notifications-panel-open", open);
    if (appEl) {
      if (open) {
        appEl.setAttribute("data-notifications-panel", "open");
      } else {
        appEl.removeAttribute("data-notifications-panel");
      }
    }
    if (open) {
      shell.removeAttribute("hidden");
      shell.setAttribute("aria-hidden", "false");
      if (typeof window.resetTvNotificationsPanelFocus === "function") {
        window.resetTvNotificationsPanelFocus();
      }
      if (typeof window.syncTvNotificationsPanelLayout === "function") {
        window.requestAnimationFrame(function () {
          window.syncTvNotificationsPanelLayout();
        });
      }
    } else {
      shell.setAttribute("hidden", "");
      shell.setAttribute("aria-hidden", "true");
      if (typeof window.syncTvNotificationsPanelLayout === "function") {
        window.syncTvNotificationsPanelLayout();
      }
    }
  }

  function onDashboardNavigateUp() {
    if (!usePrimaryNavModel()) return;
    if (isNotificationsView()) return;
    if (headerNotificationsFocused) {
      return;
    }
    if (contentFocusActive) {
      var stNavUp = currentStates();
      var curNavUp = stNavUp[stateIndex];
      if (
        curNavUp &&
        curNavUp.id === "exit" &&
        !isExitDiscoveryMode() &&
        navigateDashboardContentVertical(-1)
      ) {
        return;
      }
      if (isChromelessDashboardContext()) {
        return;
      }
      contentInnerSlotSavedForHeaderReturn = contentInnerSlot;
      contentFocusActive = false;
      headerNotificationsFocused = true;
      headerNotificationsFromContent = true;
      applyDom();
      return;
    }
    if (!isOnMainRowState()) return;
    var stUp = currentStates();
    var curUp = stUp[stateIndex];
    var idUp = curUp && curUp.id;
    /* Play Game has no content “selected” row — ↑ goes to Notifications. Other tabs ↑ enter stage content first. */
    if (idUp === "resume") {
      contentInnerSlotSavedForHeaderReturn = null;
      headerNotificationsFocused = true;
      headerNotificationsFromContent = false;
      applyDom();
      return;
    }
    headerNotificationsFromContent = false;
    contentInnerSlotSavedForHeaderReturn = null;
    /* Keep prior slot / strip scroll when toggling ↑ from nav ↔ content on the same tab. */
    contentFocusActive = true;
    applyDom();
  }

  function onDashboardNavigateDown() {
    if (!usePrimaryNavModel()) return;
    if (isNotificationsView()) {
      exitNotifications();
      return;
    }
    if (headerNotificationsFocused) {
      headerNotificationsFocused = false;
      if (headerNotificationsFromContent) {
        if (contentInnerSlotSavedForHeaderReturn != null) {
          contentInnerSlot = contentInnerSlotSavedForHeaderReturn;
        } else {
          resetContentInnerSlotForCurrentState();
        }
        contentFocusActive = true;
      }
      headerNotificationsFromContent = false;
      applyDom();
      return;
    }
    if (contentFocusActive) {
      var stNavDn = currentStates();
      var curNavDn = stNavDn[stateIndex];
      if (
        curNavDn &&
        curNavDn.id === "exit" &&
        !isExitDiscoveryMode() &&
        navigateDashboardContentVertical(1)
      ) {
        return;
      }
      if (isChromelessDashboardContext()) {
        return;
      }
      contentFocusActive = false;
      applyDom();
      return;
    }
    /* Main nav row: ↓ is intentionally ignored (enter content only via ↑ on non–Play Game tabs). */
  }

  function requestCloseDashboard() {
    try {
      document.dispatchEvent(new CustomEvent("tvdashboard:requestClose", { bubbles: true, cancelable: true }));
    } catch (e) {}
  }

  /**
   * A / Enter while the header notifications control is focused — open the notifications panel.
   * @returns {boolean} true if the panel was opened
   */
  function tryOpenNotificationsFromHeaderPrimaryAction() {
    if (!usePrimaryNavModel()) return false;
    if (isNotificationsView()) return false;
    if (!headerNotificationsFocused) return false;
    if (!isOnMainRowState()) return false;
    enterNotifications();
    return true;
  }

  /**
   * Enter / A (primary) while Play Game (resume) is the focused main-row item — return to game (close dashboard).
   * @returns {boolean} true if the close event was fired
   */
  function tryCloseDashboardFromPlayGameAction() {
    if (!usePrimaryNavModel()) return false;
    if (isNotificationsView()) return false;
    if (headerNotificationsFocused) return false;
    var st = currentStates();
    var cur = st[stateIndex];
    if (!cur || cur.id !== "resume") return false;
    requestCloseDashboard();
    return true;
  }

  /**
   * Primary (A / Enter) while main nav has focus — enter content “selected” row for tabs that use it (not Play Game).
   * Matches ↑ from nav into content for non-resume tabs.
   */
  function tryActivateDashboardNavSelectedStateFromPrimary() {
    if (!usePrimaryNavModel()) return false;
    if (isNotificationsView()) return false;
    if (headerNotificationsFocused) return false;
    if (contentFocusActive) return false;
    if (!isOnMainRowState()) return false;
    var st = currentStates();
    var cur = st[stateIndex];
    var curId = cur && cur.id;
    if (!curId || curId === "resume") return false;
    headerNotificationsFromContent = false;
    contentInnerSlotSavedForHeaderReturn = null;
    contentFocusActive = true;
    applyDom();
    return true;
  }

  /**
   * A / Enter while a Friends-row player card is focused — open player panel (same as click).
   */
  function tryFriendsPlayerCardPrimaryAction() {
    if (!contentFocusActive || !usePrimaryNavModel()) return false;
    if (isNotificationsView()) return false;
    if (headerNotificationsFocused) return false;
    var st = currentStates();
    var cur = st[stateIndex];
    if (!cur || cur.id !== "friends") return false;
    var chain = getDashboardContentFocusables();
    if (!chain.length) return false;
    clampContentInnerSlot(chain.length);
    var el = chain[contentInnerSlot];
    if (!el || !el.getAttribute("data-player-panel-handle-key")) return false;
    try {
      el.click();
    } catch (e) {}
    return true;
  }

  function tvDashboardSuspendContentFocusForOverlay() {
    var st = currentStates();
    var cur = st[stateIndex];
    if (cur && cur.id === "friends" && contentFocusActive) {
      tvDashboardFriendsPanelSuspended = true;
      tvDashboardFriendsSavedSlot = contentInnerSlot;
    } else {
      tvDashboardFriendsPanelSuspended = false;
      tvDashboardFriendsSavedSlot = null;
    }
    contentFocusActive = false;
    syncContentFocusDom();
    applyDom();
  }

  function tvDashboardRestoreContentFocusAfterPlayerPanel() {
    if (!tvDashboardFriendsPanelSuspended) return;
    tvDashboardFriendsPanelSuspended = false;
    contentFocusActive = true;
    var chain = getDashboardContentFocusables();
    if (chain.length && tvDashboardFriendsSavedSlot != null) {
      var max = chain.length - 1;
      var s = tvDashboardFriendsSavedSlot;
      if (s >= 0 && s <= max) contentInnerSlot = s;
    }
    tvDashboardFriendsSavedSlot = null;
    syncContentFocusDom();
    applyDom();
  }

  window.tvDashboardSuspendContentFocusForOverlay = tvDashboardSuspendContentFocusForOverlay;
  window.tvDashboardRestoreContentFocusAfterPlayerPanel = tvDashboardRestoreContentFocusAfterPlayerPanel;

  function applyExitContinuePlaying() {
    requestCloseDashboard();
  }

  function isExitDiscoveryMode() {
    var app = document.getElementById("app");
    return app && app.getAttribute("data-exit-screen") === "discovery";
  }

  function applyExitGameToNetflixGamesTab() {
    try {
      if (window.TvPrototypeBridge && typeof window.TvPrototypeBridge.setTvState === "function") {
        window.TvPrototypeBridge.setTvState("netflix-games");
      }
    } catch (e1) {}
    requestCloseDashboard();
  }

  function tryDashboardExitPanelPrimaryAction() {
    if (!usePrimaryNavModel()) return false;
    if (isNotificationsView()) return false;
    if (headerNotificationsFocused) return false;
    if (!contentFocusActive) return false;
    var st = currentStates();
    var cur = st[stateIndex];
    if (!cur || cur.id !== "exit") return false;
    var chain = getDashboardContentFocusables();
    if (!chain.length) return false;
    clampContentInnerSlot(chain.length);
    var el = chain[contentInnerSlot];
    if (isExitDiscoveryMode()) {
      if (el && el.getAttribute("data-exit-discovery-action") === "exit") {
        applyExitGameToNetflixGamesTab();
        return true;
      }
      return false;
    }
    var bid = el && el.id;
    if (bid === "tvDashboardExitContinue") {
      applyExitContinuePlaying();
      return true;
    }
    if (bid === "tvDashboardExitExit") {
      applyExitGameToNetflixGamesTab();
      return true;
    }
    return false;
  }

  /** Enter / A while Controllers tab Ready is focused — close dashboard and return to gameplay. */
  function tryControllersReadyPrimaryAction() {
    if (!usePrimaryNavModel()) return false;
    if (isNotificationsView()) return false;
    if (headerNotificationsFocused) return false;
    if (!contentFocusActive) return false;
    var st = currentStates();
    var cur = st[stateIndex];
    if (!cur || cur.id !== "controllers") return false;
    var chain = getDashboardContentFocusables();
    if (!chain.length) return false;
    clampContentInnerSlot(chain.length);
    var el = chain[contentInnerSlot];
    if (!el || el.getAttribute("data-dash-controllers-focus") !== "ready") return false;
    requestCloseDashboard();
    return true;
  }

  function updatePrimaryNav() {
    var nav = document.getElementById("tvDashboardPrimaryNav");
    if (!nav) return;
    var st = currentStates();
    var cur = st[stateIndex];
    var curId = cur && cur.id;
    var inNotif = isNotificationsView();
    var appNav = document.getElementById("app");
    var playerPanelOpen = appNav && appNav.getAttribute("data-player-panel-open") === "true";
    var items = nav.querySelectorAll(".tv-dashboard__nav-item");
    for (var n = 0; n < items.length; n++) {
      var btn = items[n];
      var sid = btn.getAttribute("data-state-id");
      if (!sid) continue;
      var isFocused =
        !inNotif &&
        !headerNotificationsFocused &&
        !contentFocusActive &&
        !playerPanelOpen &&
        curId === sid;
      /* Play Game (resume) never uses the content “selected” pill — only other tabs show selected while stage has focus. */
      var isSelected =
        !inNotif &&
        !headerNotificationsFocused &&
        contentFocusActive &&
        curId === sid &&
        sid !== "resume";
      btn.classList.toggle("tv-dashboard__nav-item--focused", isFocused);
      btn.classList.toggle("tv-dashboard__nav-item--selected", isSelected);
      if (isFocused || isSelected) {
        btn.setAttribute("aria-current", "true");
      } else {
        btn.removeAttribute("aria-current");
      }
    }
  }

  window.tvDashboardRefreshPrimaryNavChrome = updatePrimaryNav;

  /** Larger grid + circular mask + chroma-weighted average — better skin/warm tones on square avatar art than histogram peak alone. */
  var PLAYER_PANEL_GLOW_SAMPLE_SIZE = 96;
  var PLAYER_PANEL_GLOW_MIN_CHROMA = 12;
  var PLAYER_PANEL_GLOW_CIRCLE_R2 = 0.22;

  function samplePlayerPanelGlowAccentRgb(img) {
    try {
      var w = PLAYER_PANEL_GLOW_SAMPLE_SIZE;
      var h = PLAYER_PANEL_GLOW_SAMPLE_SIZE;
      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      var data = ctx.getImageData(0, 0, w, h).data;
      var rs = 0;
      var gs = 0;
      var bs = 0;
      var ns = 0;
      var rall = 0;
      var gall = 0;
      var ball = 0;
      var nall = 0;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var nx = (x + 0.5) / w - 0.5;
          var ny = (y + 0.5) / h - 0.5;
          if (nx * nx + ny * ny > PLAYER_PANEL_GLOW_CIRCLE_R2) continue;
          var i = (y * w + x) * 4;
          var a = data[i + 3];
          if (a < 12) continue;
          var rp = data[i];
          var gp = data[i + 1];
          var bp = data[i + 2];
          var maxc = rp > gp ? (rp > bp ? rp : bp) : gp > bp ? gp : bp;
          var minc = rp < gp ? (rp < bp ? rp : bp) : gp < bp ? gp : bp;
          var chroma = maxc - minc;
          rall += rp;
          gall += gp;
          ball += bp;
          nall++;
          if (chroma >= PLAYER_PANEL_GLOW_MIN_CHROMA) {
            rs += rp;
            gs += gp;
            bs += bp;
            ns++;
          }
        }
      }
      if (ns >= 24) {
        return { r: Math.round(rs / ns), g: Math.round(gs / ns), b: Math.round(bs / ns) };
      }
      if (nall >= 12) {
        return { r: Math.round(rall / nall), g: Math.round(gall / nall), b: Math.round(ball / nall) };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  var PROFILE_AVATAR_WASH_SAMPLE_SIZE = 48;
  /** 8 bins per channel (>> 5) → histogram peak = dominant swatch, not gray average. */
  var DOMINANT_BIN_SHIFT = 5;
  var DOMINANT_MIN_CHROMA = 20;

  function sampleImageDominantRgb(img, cx0, cx1, cy0, cy1) {
    try {
      var w = PROFILE_AVATAR_WASH_SAMPLE_SIZE;
      var h = PROFILE_AVATAR_WASH_SAMPLE_SIZE;
      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      var data = ctx.getImageData(0, 0, w, h).data;
      var x0 = Math.floor(w * cx0);
      var x1 = Math.ceil(w * cx1);
      var y0 = Math.floor(h * cy0);
      var y1 = Math.ceil(h * cy1);
      var all = {};
      var colorful = {};
      var totalOpaque = 0;

      function bump(map, key, rp, gp, bp) {
        var cell = map[key];
        if (!cell) {
          map[key] = { n: 1, r: rp, g: gp, b: bp };
        } else {
          cell.n++;
          cell.r += rp;
          cell.g += gp;
          cell.b += bp;
        }
      }

      function bestFrom(map) {
        var bestKey = null;
        var bestN = 0;
        for (var k in map) {
          if (map[k].n > bestN) {
            bestN = map[k].n;
            bestKey = k;
          }
        }
        if (bestKey == null) return null;
        var s = map[bestKey];
        return {
          r: Math.round(s.r / s.n),
          g: Math.round(s.g / s.n),
          b: Math.round(s.b / s.n),
          weight: s.n,
        };
      }

      for (var y = y0; y < y1; y++) {
        for (var x = x0; x < x1; x++) {
          var i = (y * w + x) * 4;
          var a = data[i + 3];
          if (a < 12) continue;
          totalOpaque++;
          var rp = data[i];
          var gp = data[i + 1];
          var bp = data[i + 2];
          var maxc = rp > gp ? (rp > bp ? rp : bp) : gp > bp ? gp : bp;
          var minc = rp < gp ? (rp < bp ? rp : bp) : gp < bp ? gp : bp;
          var chroma = maxc - minc;
          var key =
            ((rp >> DOMINANT_BIN_SHIFT) << 6) |
            ((gp >> DOMINANT_BIN_SHIFT) << 3) |
            (bp >> DOMINANT_BIN_SHIFT);
          bump(all, key, rp, gp, bp);
          if (chroma >= DOMINANT_MIN_CHROMA) {
            bump(colorful, key, rp, gp, bp);
          }
        }
      }

      if (!totalOpaque) return null;

      var minVotes = Math.max(10, Math.floor(totalOpaque * 0.04));
      var cBest = bestFrom(colorful);
      var aBest = bestFrom(all);
      if (cBest && cBest.weight >= minVotes) {
        return { r: cBest.r, g: cBest.g, b: cBest.b };
      }
      if (aBest) {
        return { r: aBest.r, g: aBest.g, b: aBest.b };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function applyRadialAvatarWash(washEl, rgb) {
    if (!washEl) return;
    if (!rgb) {
      washEl.style.background = "";
      return;
    }
    var r = rgb.r;
    var g = rgb.g;
    var b = rgb.b;
    washEl.style.background =
      "radial-gradient(130% 85% at 50% 0%, rgba(" +
      r +
      "," +
      g +
      "," +
      b +
      ", 0.18) 0%, rgba(" +
      r +
      "," +
      g +
      "," +
      b +
      ", 0) 72%)";
  }

  function applyAvatarGlowShadow(glowEl, rgb, glowOpts) {
    if (!glowEl) return;
    glowOpts = glowOpts || {};
    var blurPx = glowOpts.blurPx != null ? glowOpts.blurPx : 48;
    var alpha = glowOpts.alpha != null ? glowOpts.alpha : 0.45;
    if (!rgb) {
      glowEl.style.boxShadow = "";
      return;
    }
    var r = rgb.r;
    var g = rgb.g;
    var b = rgb.b;
    glowEl.style.boxShadow = "0 0 " + blurPx + "px rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function paintRadialWashFromImg(washEl, img, glowEl, glowOpts) {
    if (!img) return;
    var face = sampleImageDominantRgb(img, 0.15, 0.85, 0.12, 0.62);
    var full = sampleImageDominantRgb(img, 0, 1, 0, 1);
    var rgb = face || full;
    applyRadialAvatarWash(washEl, rgb);
    applyAvatarGlowShadow(glowEl, rgb, glowOpts);
  }

  function whenImgDecoded(img, onReady) {
    if (typeof img.decode === "function") {
      img.decode().then(onReady).catch(onReady);
    } else {
      onReady();
    }
  }

  /**
   * Player panel hero glow — samples avatar; sets `--pp-plate-glow-r/g/b` on `#tvPlayerPanel`
   * (gradient shape lives in tv-player-panel.css).
   */
  function syncPlayerPanelPlateGlowFromAvatar() {
    var root = document.getElementById("tvPlayerPanel");
    var img = document.getElementById("tvPlayerPanelAvatar");
    if (!root || !img) return;

    function applyGlowRgb(rgb) {
      if (!rgb) {
        root.style.removeProperty("--pp-plate-glow-r");
        root.style.removeProperty("--pp-plate-glow-g");
        root.style.removeProperty("--pp-plate-glow-b");
        return;
      }
      root.style.setProperty("--pp-plate-glow-r", String(rgb.r));
      root.style.setProperty("--pp-plate-glow-g", String(rgb.g));
      root.style.setProperty("--pp-plate-glow-b", String(rgb.b));
    }

    function paintGlow() {
      var rgb =
        samplePlayerPanelGlowAccentRgb(img) ||
        sampleImageDominantRgb(img, 0.25, 0.75, 0.2, 0.78) ||
        sampleImageDominantRgb(img, 0.15, 0.85, 0.12, 0.62) ||
        sampleImageDominantRgb(img, 0, 1, 0, 1);
      applyGlowRgb(rgb);
    }

    function afterLoad() {
      whenImgDecoded(img, function () {
        requestAnimationFrame(paintGlow);
      });
    }

    function onImgError() {
      applyGlowRgb(null);
    }

    if (img.complete && img.naturalWidth) {
      afterLoad();
    } else {
      img.addEventListener("load", afterLoad, { once: true });
      img.addEventListener("error", onImgError, { once: true });
    }
  }

  window.tvDashboardSyncPlayerPanelPlateGlowFromAvatar = syncPlayerPanelPlateGlowFromAvatar;

  function samplePrototypeAvatarAccentRgb(img) {
    if (!img) return null;
    return (
      samplePlayerPanelGlowAccentRgb(img) ||
      sampleImageDominantRgb(img, 0.25, 0.75, 0.2, 0.78) ||
      sampleImageDominantRgb(img, 0.15, 0.85, 0.12, 0.62) ||
      sampleImageDominantRgb(img, 0, 1, 0, 1)
    );
  }

  window.samplePrototypeAvatarAccentRgb = samplePrototypeAvatarAccentRgb;

  function syncAvatarWashFromImg(washEl, img, glowEl, glowOpts) {
    if (!img || (!washEl && !glowEl)) return;

    function paintWash() {
      paintRadialWashFromImg(washEl, img, glowEl, glowOpts);
    }

    function afterLoad() {
      whenImgDecoded(img, paintWash);
    }

    function onImgError() {
      applyRadialAvatarWash(washEl, null);
      applyAvatarGlowShadow(glowEl, null);
    }

    if (img.complete && img.naturalWidth) {
      afterLoad();
    } else {
      img.addEventListener("load", afterLoad, { once: true });
      img.addEventListener("error", onImgError, { once: true });
    }
  }

  function syncProfileCardWashFromAvatar(layer) {
    var wash = layer.querySelector(".tv-dashboard__profile-focus-card-wash");
    var img = layer.querySelector(".tv-dashboard__profile-focus-avatar-img");
    var glow = layer.querySelector(".tv-dashboard__profile-focus-avatar");
    syncAvatarWashFromImg(wash, img, glow, { blurPx: 60, alpha: 0.5 });
  }

  function clearFriendsPlayerCardWashes(layer) {
    var washes = layer.querySelectorAll(".tv-dashboard__friends-focus-player-topwash");
    for (var i = 0; i < washes.length; i++) {
      washes[i].style.background = "";
    }
    var avatars = layer.querySelectorAll(".tv-dashboard__friends-focus-player-avatar");
    for (var a = 0; a < avatars.length; a++) {
      avatars[a].style.boxShadow = "";
    }
  }

  function syncFriendsPlayerCardWashesFromAvatars(layer) {
    var cards = layer.querySelectorAll(".tv-dashboard__friends-focus-player-card");
    for (var c = 0; c < cards.length; c++) {
      var wash = cards[c].querySelector(".tv-dashboard__friends-focus-player-topwash");
      var img = cards[c].querySelector(".tv-dashboard__friends-focus-player-avatar-img");
      var glow = cards[c].querySelector(".tv-dashboard__friends-focus-player-avatar");
      syncAvatarWashFromImg(wash, img, glow, { blurPx: 29, alpha: 0.22 });
    }
  }

  function updateProfileFocusLayer() {
    var layer = document.getElementById("tvDashboardProfileFocus");
    if (!layer) return;
    var app = document.getElementById("app");
    var inviteCtx = app && app.getAttribute("data-dashboard-context") === "invite";
    var st = currentStates();
    var cur = st[stateIndex];
    var curId = cur && cur.id;
    var inNotif = isNotificationsView();
    var show = !inviteCtx && !inNotif && curId === "profile";
    if (show) {
      layer.removeAttribute("hidden");
      layer.setAttribute("aria-hidden", "false");
      var identityState =
        typeof window.getTvDashboardIdentityState === "function"
          ? window.getTvDashboardIdentityState()
          : null;
      var navImg = document.querySelector(
        '#tvDashboardPrimaryNav [data-state-id="profile"] .tv-dashboard__nav-item__icon img'
      );
      var cardImg = layer.querySelector(".tv-dashboard__profile-focus-avatar-img");
      if (cardImg) {
        var src =
          (identityState && identityState.avatar) ||
          getLocalPrototypeAvatarSrc() ||
          (navImg && navImg.getAttribute("src"));
        if (src) cardImg.setAttribute("src", resolveAssetUrl(src));
      }
      var handleSlot = layer.querySelector(
        '.tv-dashboard__profile-focus-handle [data-prototype-player-handle="local"]'
      );
      if (handleSlot) {
        var ht = identityState && identityState.handle ? identityState.handle : "";
        if (!ht) {
          var navHandle = document.querySelector(
            '.tv-dashboard__nav-item__handle[data-prototype-player-handle="local"]'
          );
          ht =
            (typeof window.PROTOTYPE_LOCAL_HANDLE === "string" && window.PROTOTYPE_LOCAL_HANDLE) ||
            (navHandle && (navHandle.textContent || "").trim()) ||
            "";
        }
        if (ht) {
          handleSlot.textContent =
            typeof window.getTvDashboardDisplayHandle === "function"
              ? window.getTvDashboardDisplayHandle(ht)
              : ht;
        }
      }
      syncProfileCardWashFromAvatar(layer);
    } else {
      layer.setAttribute("hidden", "");
      layer.setAttribute("aria-hidden", "true");
      var washHidden = layer.querySelector(".tv-dashboard__profile-focus-card-wash");
      if (washHidden) applyRadialAvatarWash(washHidden, null);
      var glowHidden = layer.querySelector(".tv-dashboard__profile-focus-avatar");
      if (glowHidden) applyAvatarGlowShadow(glowHidden, null);
    }
  }

  /**
   * Friends strip sort when the dashboard opens: online + playing same session game, online +
   * playing another title, online idle, offline — each bucket A–Z by visible handle.
   * Same-game uses `window.PROTOTYPE_LOCAL_SESSION_GAME_TITLE` (default set in applyPrototypeGameHandle).
   */
  function sortFriendsFocusPlayerCardsByPresenceAndGame() {
    var friendsRoot = document.getElementById("tvDashboardFriendsFocus");
    var cardsWrap = friendsRoot && friendsRoot.querySelector(".tv-dashboard__friends-focus-player-cards");
    if (!cardsWrap) return;
    var nodeList = cardsWrap.querySelectorAll("button.tv-dashboard__friends-focus-player-card");
    if (!nodeList.length) return;

    var refRaw = window.PROTOTYPE_LOCAL_SESSION_GAME_TITLE;
    var refGame = (typeof refRaw === "string" ? refRaw : "").replace(/\s+/g, " ").trim() || "FIFA World Cup";
    var refLower = refGame.toLowerCase();

    function sortKeyForCard(card) {
      var online = card.classList.contains("tv-dashboard__friends-focus-player-card--online");
      var meta = card.querySelector(".tv-dashboard__friends-focus-player-meta");
      var metaVisible = !!(meta && !meta.hidden);
      var titleEl = card.querySelector(".tv-dashboard__friends-focus-player-game-title");
      var gameTitle =
        metaVisible && titleEl ? titleEl.textContent.replace(/\s+/g, " ").trim() : "";
      var playing = !!gameTitle;
      var sameGame = playing && gameTitle.toLowerCase() === refLower;
      var nameSpan = card.querySelector(".tv-dashboard__friends-focus-handle-name span");
      var handle = nameSpan ? nameSpan.textContent.replace(/\s+/g, " ").trim() : "";
      var tier;
      if (!online) tier = 3;
      else if (playing && sameGame) tier = 0;
      else if (playing) tier = 1;
      else tier = 2;
      return { tier: tier, handle: handle };
    }

    var decorated = [];
    var hiddenCards = [];
    for (var i = 0; i < nodeList.length; i++) {
      if (nodeList[i].hidden) {
        hiddenCards.push(nodeList[i]);
        continue;
      }
      decorated.push({ card: nodeList[i], key: sortKeyForCard(nodeList[i]) });
    }
    decorated.sort(function (a, b) {
      if (a.key.tier !== b.key.tier) return a.key.tier - b.key.tier;
      return a.key.handle.localeCompare(b.key.handle, undefined, { sensitivity: "base" });
    });
    for (var h = 0; h < hiddenCards.length; h++) {
      cardsWrap.appendChild(hiddenCards[h]);
    }
    for (var j = 0; j < decorated.length; j++) {
      cardsWrap.appendChild(decorated[j].card);
    }

    if (typeof window.syncTvFriendsFocusStripLayout === "function") {
      window.requestAnimationFrame(function () {
        window.syncTvFriendsFocusStripLayout();
      });
    }
    if (typeof window.syncMobileDashboardFriendsList === "function") {
      window.syncMobileDashboardFriendsList();
    }
    if (typeof window.PrototypePresence !== "undefined") {
      window.PrototypePresence.syncAllFriendsPresenceSurfaces();
    }
  }

  window.sortFriendsFocusPlayerCardsByPresenceAndGame = sortFriendsFocusPlayerCardsByPresenceAndGame;

  function applyPrototypeFriendsCount(count) {
    count = Math.max(0, Math.min(PROTOTYPE_FRIEND_SLOT_COUNT, parseInt(count, 10) || 0));
    var app = document.getElementById("app");
    if (app) app.setAttribute("data-friends-count", String(count));

    var multiLocal =
      typeof window.isMultiLocalSession === "function" && window.isMultiLocalSession();

    if (!multiLocal) {
      if (typeof window.removeLocalPlayerFriendCards === "function") {
        window.removeLocalPlayerFriendCards();
      }
      for (var i = 0; i < PROTOTYPE_FRIEND_LIST_KEYS.length; i++) {
        var visible = i < count;
        var key = PROTOTYPE_FRIEND_LIST_KEYS[i];
        var card = document.querySelector(
          '.tv-dashboard__friends-focus-player-card:not([data-local-player-friend])[data-player-panel-handle-key="' +
            key +
            '"]'
        );
        if (card) {
          card.hidden = !visible;
          card.setAttribute("aria-hidden", visible ? "false" : "true");
        }
        var invItem = document.querySelector(
          '#tvDashboardInviteShell .game-invite-list__item[data-player-panel-handle-key="' + key + '"]'
        );
        if (invItem) {
          invItem.hidden = !visible;
          invItem.setAttribute("aria-hidden", visible ? "false" : "true");
        }
      }

      var friendsRoot = document.getElementById("tvDashboardFriendsFocus");
      var cardsWrap =
        friendsRoot && friendsRoot.querySelector(".tv-dashboard__friends-focus-player-cards");
      var emptyEl = document.getElementById("tvDashboardFriendsFocusEmpty");
      if (cardsWrap) {
        cardsWrap.hidden = count === 0;
        cardsWrap.setAttribute("aria-hidden", count === 0 ? "true" : "false");
      }
      if (emptyEl) {
        emptyEl.hidden = count > 0;
        emptyEl.setAttribute("aria-hidden", count > 0 ? "true" : "false");
      }
    }

    if (multiLocal) {
      if (typeof window.refreshLocalPlayerData === "function") {
        window.refreshLocalPlayerData();
      }
    } else if (typeof window.sortFriendsFocusPlayerCardsByPresenceAndGame === "function") {
      window.sortFriendsFocusPlayerCardsByPresenceAndGame();
    } else if (typeof window.syncMobileDashboardFriendsList === "function") {
      window.syncMobileDashboardFriendsList();
    }

    if (contentFocusActive) {
      var st = currentStates();
      var cur = st[stateIndex];
      if (cur && cur.id === "friends") {
        clampContentInnerSlot(getDashboardContentFocusables().length);
        applyDashboardInnerContentFocus();
      }
    }

    if (typeof window.syncTvInvitePanelLayout === "function") {
      window.syncTvInvitePanelLayout();
    }
  }

  window.applyPrototypeFriendsCount = applyPrototypeFriendsCount;

  function updateFriendsFocusLayer() {
    var layer = document.getElementById("tvDashboardFriendsFocus");
    if (!layer) return;
    var app = document.getElementById("app");
    var inviteCtx = app && app.getAttribute("data-dashboard-context") === "invite";
    var st = currentStates();
    var cur = st[stateIndex];
    var curId = cur && cur.id;
    var inNotif = isNotificationsView();
    var show = !inviteCtx && !inNotif && curId === "friends";
    if (show) {
      layer.removeAttribute("hidden");
      layer.setAttribute("aria-hidden", "false");
      var PH = window.PROTOTYPE_PLAYER_HANDLES;
      for (var fi = 0; fi < PROTOTYPE_FRIEND_LIST_KEYS.length; fi++) {
        var key = PROTOTYPE_FRIEND_LIST_KEYS[fi];
        var slot = layer.querySelector(
          '.tv-dashboard__friends-focus-handle-name [data-prototype-player-handle="' + key + '"]'
        );
        if (!slot) continue;
        var fromDeck = PH && typeof PH[key] === "string" ? PH[key] : "";
        var listEl = document.querySelector(
          '.game-invite-list .game-invite-list__item:not(.game-invite-list__item--share) [data-prototype-player-handle="' +
            key +
            '"]'
        );
        var fromList = listEl && (listEl.textContent || "").trim();
        var htf = fromDeck || fromList || "";
        if (htf) slot.textContent = htf;
      }
      syncFriendsPlayerCardWashesFromAvatars(layer);
    } else {
      layer.setAttribute("hidden", "");
      layer.setAttribute("aria-hidden", "true");
      clearFriendsPlayerCardWashes(layer);
    }
  }

  function updateControllersFocusLayer() {
    var layer = document.getElementById("tvDashboardControllersFocus");
    if (!layer) return;
    var app = document.getElementById("app");
    var inviteCtx = app && app.getAttribute("data-dashboard-context") === "invite";
    var st = currentStates();
    var cur = st[stateIndex];
    var curId = cur && cur.id;
    var inNotif = isNotificationsView();
    var show = !inviteCtx && !inNotif && curId === "controllers";
    if (show) {
      layer.removeAttribute("hidden");
      layer.setAttribute("aria-hidden", "false");
    } else {
      layer.setAttribute("hidden", "");
      layer.setAttribute("aria-hidden", "true");
    }
  }

  function updateAchievementsFocusLayer() {
    var layer = document.getElementById("tvDashboardAchievementsFocus");
    if (!layer) return;
    var app = document.getElementById("app");
    var inviteCtx = app && app.getAttribute("data-dashboard-context") === "invite";
    var st = currentStates();
    var cur = st[stateIndex];
    var curId = cur && cur.id;
    var inNotif = isNotificationsView();
    var show = !inviteCtx && !inNotif && curId === "achievements";
    if (show) {
      layer.removeAttribute("hidden");
      layer.setAttribute("aria-hidden", "false");
    } else {
      layer.setAttribute("hidden", "");
      layer.setAttribute("aria-hidden", "true");
    }
  }

  function clearFriendsFocusCardEnterStagger() {
    var cardsWrap = document.querySelector(".tv-dashboard__friends-focus-player-cards");
    if (!cardsWrap) return;
    var cards = cardsWrap.querySelectorAll("button.tv-dashboard__friends-focus-player-card");
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.animationDelay = "";
    }
  }

  /** Stagger fade-in by visible strip index — nth-child includes hidden cards and skews local co-player timing. */
  function syncFriendsFocusCardEnterStagger(motionRoot) {
    if (!motionRoot) return;
    var cardsWrap = motionRoot.querySelector(".tv-dashboard__friends-focus-player-cards");
    if (!cardsWrap) return;
    clearFriendsFocusCardEnterStagger();
    var visible = cardsWrap.querySelectorAll(
      "button.tv-dashboard__friends-focus-player-card:not([hidden])"
    );
    for (var v = 0; v < visible.length; v++) {
      visible[v].style.animationDelay = 0.18 + v * 0.08 + "s";
    }
  }

  function clearAllDashboardNavEnterMotion() {
    clearFriendsFocusCardEnterStagger();
    var nodes = document.querySelectorAll("." + DASH_NAV_ENTER_CLASS);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el._tvDashNavEnterTimer) {
        clearTimeout(el._tvDashNavEnterTimer);
        el._tvDashNavEnterTimer = 0;
      }
      el.classList.remove(DASH_NAV_ENTER_CLASS);
    }
  }

  /** Slide/fade tab panels when the main nav selection changes (not resume stage, not overlays). */
  function maybeTriggerDashboardNavContentEnterAnimation() {
    if (!usePrimaryNavModel()) {
      dashboardNavContentAnimPrevIndex = stateIndex;
      return;
    }
    var app = document.getElementById("app");
    if (!app || app.getAttribute("data-tv-dashboard") !== "open") {
      dashboardNavContentAnimPrevIndex = stateIndex;
      return;
    }
    var dash = document.getElementById("tvDashboard");
    if (!dash || !dash.classList.contains("is-open")) {
      dashboardNavContentAnimPrevIndex = stateIndex;
      return;
    }
    if (dashboardContextIsInviteLike(app)) {
      dashboardNavContentAnimPrevIndex = stateIndex;
      return;
    }
    if (isNotificationsView()) {
      dashboardNavContentAnimPrevIndex = stateIndex;
      return;
    }
    if (contentFocusActive || headerNotificationsFocused) {
      dashboardNavContentAnimPrevIndex = stateIndex;
      return;
    }

    var st = currentStates();
    var cur = st[stateIndex];
    var curId = cur && cur.id;
    var tabChanged =
      dashboardNavContentAnimPrevIndex !== null && dashboardNavContentAnimPrevIndex !== stateIndex;
    dashboardNavContentAnimPrevIndex = stateIndex;

    if (!tabChanged || !curId || curId === "resume") return;

    var layerId = "";
    var innerSel = "";
    if (curId === "profile") {
      layerId = "tvDashboardProfileFocus";
      innerSel = ".tv-dashboard__profile-focus-inner";
    } else if (curId === "friends") {
      layerId = "tvDashboardFriendsFocus";
      innerSel = ".tv-dashboard__friends-focus-inner";
    } else if (curId === "controllers") {
      layerId = "tvDashboardControllersFocus";
      innerSel = ".tv-dashboard__controllers-focus-inner";
    } else if (curId === "achievements") {
      layerId = "tvDashboardAchievementsFocus";
      innerSel = ".tv-dashboard__achievements-focus-inner";
    } else if (curId === "exit") {
      if (isExitDiscoveryMode()) {
        layerId = "tvDashboardExitDiscoveryFocus";
        innerSel = ".tv-dashboard__exit-discovery-inner";
      } else {
        layerId = "tvDashboardExitFocus";
        innerSel = ".tv-dashboard__exit-focus-inner";
      }
    } else {
      return;
    }

    var layerEl = document.getElementById(layerId);
    if (!layerEl || layerEl.hasAttribute("hidden")) return;

    var motionRoot = layerEl.querySelector(innerSel);
    if (!motionRoot) return;

    clearAllDashboardNavEnterMotion();
    void motionRoot.offsetWidth;
    motionRoot.classList.add(DASH_NAV_ENTER_CLASS);
    if (curId === "friends") {
      syncFriendsFocusCardEnterStagger(motionRoot);
    }
    motionRoot._tvDashNavEnterTimer = setTimeout(function () {
      motionRoot.classList.remove(DASH_NAV_ENTER_CLASS);
      motionRoot._tvDashNavEnterTimer = 0;
    }, DASH_NAV_ENTER_CLEAR_MS);
  }

  function updateExitFocusLayer() {
    var defaultLayer = document.getElementById("tvDashboardExitFocus");
    var discoveryLayer = document.getElementById("tvDashboardExitDiscoveryFocus");
    var app = document.getElementById("app");
    var inviteCtx = app && app.getAttribute("data-dashboard-context") === "invite";
    var st = currentStates();
    var cur = st[stateIndex];
    var curId = cur && cur.id;
    var inNotif = isNotificationsView();
    var show = !inviteCtx && !inNotif && curId === "exit";
    var discovery = isExitDiscoveryMode();
    if (defaultLayer) {
      if (show && !discovery) {
        defaultLayer.removeAttribute("hidden");
        defaultLayer.setAttribute("aria-hidden", "false");
      } else {
        defaultLayer.setAttribute("hidden", "");
        defaultLayer.setAttribute("aria-hidden", "true");
      }
    }
    if (discoveryLayer) {
      if (show && discovery) {
        discoveryLayer.removeAttribute("hidden");
        discoveryLayer.setAttribute("aria-hidden", "false");
      } else {
        discoveryLayer.setAttribute("hidden", "");
        discoveryLayer.setAttribute("aria-hidden", "true");
      }
    }
  }

  function applyDom() {
    var stage = document.getElementById("tvDashboardStage");
    var label = document.getElementById("tvDashboardStateLabel");
    if (!stage) return;
    var st = currentStates();
    var imgs = stage.querySelectorAll(".tv-dashboard__layer");
    for (var i = 0; i < imgs.length; i++) {
      var on = i === stateIndex;
      imgs[i].classList.toggle("is-active", on);
      imgs[i].setAttribute("aria-hidden", on ? "false" : "true");
    }
    if (label) {
      var cur = st[stateIndex];
      label.textContent = cur && cur.label ? cur.label : "";
    }
    updatePrimaryNav();
    updateProfileFocusLayer();
    updateFriendsFocusLayer();
    updateControllersFocusLayer();
    updateAchievementsFocusLayer();
    updateExitFocusLayer();
    updateHeader();
    updateNotificationsShell();
    syncContentFocusDom();
    maybeTriggerDashboardNavContentEnterAnimation();
    notify();
  }

  function resetContentInnerSlotForCurrentState() {
    var st = currentStates();
    var cur = st[stateIndex];
    var id = cur && cur.id;
    if (id === "exit") {
      contentInnerSlot = isExitDiscoveryMode() ? 0 : 1;
    } else {
      contentInnerSlot = 0;
    }
  }

  /** After open-from-controller, ensure Discovery exit prompt card is focused once layers are visible. */
  function scheduleExitDiscoveryPromptFocus() {
    requestAnimationFrame(function () {
      if (!contentFocusActive) return;
      var st = currentStates();
      var cur = st[stateIndex];
      if (!cur || cur.id !== "exit") return;
      if (isExitDiscoveryMode()) {
        contentInnerSlot = 0;
      }
      applyDom();
      var chain = getDashboardContentFocusables();
      if (!chain.length) {
        requestAnimationFrame(function () {
          if (!contentFocusActive) return;
          applyDom();
          applyDashboardInnerContentFocus();
        });
        return;
      }
      clampContentInnerSlot(chain.length);
      syncDashboardHorizontalStripScroll();
      for (var i = 0; i < chain.length; i++) {
        chain[i].setAttribute("tabindex", i === contentInnerSlot ? "0" : "-1");
      }
      var target =
        isExitDiscoveryMode() && document.getElementById("tvDashboardExitDiscoveryPrompt")
          ? document.getElementById("tvDashboardExitDiscoveryPrompt")
          : chain[contentInnerSlot];
      if (!target) return;
      try {
        target.focus({ preventScroll: true });
      } catch (e) {
        try {
          target.focus();
        } catch (e2) {}
      }
      syncDashboardContentTvRingClass();
    });
  }

  /** After open-from-controller, ensure Ready is focused once the Controllers layer is visible. */
  function scheduleControllersReadyFocus() {
    requestAnimationFrame(function () {
      if (!contentFocusActive) return;
      var st = currentStates();
      var cur = st[stateIndex];
      if (!cur || cur.id !== "controllers") return;
      contentInnerSlot = 0;
      applyDom();
      var chain = getDashboardContentFocusables();
      if (!chain.length) {
        requestAnimationFrame(function () {
          if (!contentFocusActive) return;
          applyDom();
          applyDashboardInnerContentFocus();
        });
        return;
      }
      clampContentInnerSlot(chain.length);
      for (var i = 0; i < chain.length; i++) {
        chain[i].setAttribute("tabindex", i === contentInnerSlot ? "0" : "-1");
      }
      var ready = document.querySelector('[data-dash-controllers-focus="ready"]');
      var target = ready || chain[contentInnerSlot];
      if (!target) return;
      try {
        target.focus({ preventScroll: true });
      } catch (e) {
        try {
          target.focus();
        } catch (e2) {}
      }
      syncDashboardContentTvRingClass();
    });
  }

  function getDashboardContentFocusables() {
    var out = [];
    if (!contentFocusActive || !usePrimaryNavModel()) return out;
    var st = currentStates();
    var cur = st[stateIndex];
    var id = cur && cur.id;
    if (id === "profile") {
      var pr = document.getElementById("tvDashboardProfileFocus");
      if (!pr || pr.hasAttribute("hidden")) return out;
      var edit = pr.querySelector('[data-dash-profile-focus="edit-status"]');
      var playing = pr.querySelector('[data-dash-profile-focus="playing-panel"]');
      if (edit) out.push(edit);
      if (playing) out.push(playing);
    } else if (id === "friends") {
      var fr = document.getElementById("tvDashboardFriendsFocus");
      if (!fr || fr.hasAttribute("hidden")) return out;
      var findBtn = fr.querySelector('[data-dash-friends-focus="find"]');
      if (findBtn) out.push(findBtn);
      var cards = fr.querySelectorAll(
        "button.tv-dashboard__friends-focus-player-card.tv-dashboard__dash-content-focusable"
      );
      for (var fi = 0; fi < cards.length; fi++) {
        if (!cards[fi].hidden) out.push(cards[fi]);
      }
    } else if (id === "controllers") {
      var ct = document.getElementById("tvDashboardControllersFocus");
      if (!ct || ct.hasAttribute("hidden")) return out;
      var ready = ct.querySelector('[data-dash-controllers-focus="ready"]');
      if (ready) out.push(ready);
    } else if (id === "achievements") {
      var ach = document.getElementById("tvDashboardAchievementsFocus");
      if (!ach || ach.hasAttribute("hidden")) return out;
      var strip = ach.querySelector(".tv-dashboard__achievements-focus-cards");
      if (!strip) return out;
      var nodes = strip.querySelectorAll(
        "button.tv-dashboard__achievements-focus-card.tv-dashboard__dash-content-focusable," +
          "button.tv-dashboard__achievements-focus-locked.tv-dashboard__dash-content-focusable," +
          "button.tv-dashboard__achievements-focus-mystery.tv-dashboard__dash-content-focusable"
      );
      for (var aj = 0; aj < nodes.length; aj++) out.push(nodes[aj]);
    } else if (id === "exit") {
      if (isExitDiscoveryMode()) {
        var disc = document.getElementById("tvDashboardExitDiscoveryFocus");
        if (!disc || disc.hasAttribute("hidden")) return out;
        var track = disc.querySelector(".tv-dashboard__exit-discovery-track");
        if (!track) return out;
        var discCards = track.querySelectorAll(
          "button.tv-dashboard__exit-discovery-prompt.tv-dashboard__dash-content-focusable," +
            "button.tv-dashboard__exit-discovery-game.tv-dashboard__dash-content-focusable"
        );
        for (var di = 0; di < discCards.length; di++) out.push(discCards[di]);
      } else {
        var ex = document.getElementById("tvDashboardExitFocus");
        if (!ex || ex.hasAttribute("hidden")) return out;
        var cont = document.getElementById("tvDashboardExitContinue");
        var ext = document.getElementById("tvDashboardExitExit");
        if (cont) out.push(cont);
        if (ext) out.push(ext);
      }
    }
    return out;
  }

  function clampContentInnerSlot(len) {
    if (len <= 0) return;
    if (contentInnerSlot < 0) contentInnerSlot = 0;
    if (contentInnerSlot >= len) contentInnerSlot = len - 1;
  }

  /** Friends / Achievements horizontal strips: translate the track so the focused card stays in the third visible column (same window idea as TV invite / notifications lists). */
  var STRIP_FOCUS_GAP_PX = 12;
  var STRIP_VISIBLE_PLAYER_CARDS = 4;
  /** 0-based index within the visible card window where focus should anchor (third column). */
  var STRIP_FOCUS_ANCHOR_CARD = 2;

  function computeStripFirstCardScrollOffset(cardIndex, numCards) {
    var maxS = Math.max(0, numCards - STRIP_VISIBLE_PLAYER_CARDS);
    var ideal = cardIndex - STRIP_FOCUS_ANCHOR_CARD;
    if (ideal < 0) ideal = 0;
    if (ideal > maxS) ideal = maxS;
    return ideal;
  }

  function syncDashboardHorizontalStripScroll() {
    var friendsRoot = document.getElementById("tvDashboardFriendsFocus");
    var achRoot = document.getElementById("tvDashboardAchievementsFocus");
    var friendsTrack = friendsRoot && friendsRoot.querySelector(".tv-dashboard__friends-focus-track");
    var achTrack = achRoot && achRoot.querySelector(".tv-dashboard__achievements-focus-track");
    var exitDiscRoot = document.getElementById("tvDashboardExitDiscoveryFocus");
    var exitDiscTrack =
      exitDiscRoot && exitDiscRoot.querySelector(".tv-dashboard__exit-discovery-track");

    if (!contentFocusActive) {
      /* Leave translate intact when focus returns to main nav so ↑ restores the same strip window. */
      return;
    }

    if (friendsTrack) friendsTrack.style.transform = "";
    if (achTrack) achTrack.style.transform = "";
    if (exitDiscTrack) exitDiscTrack.style.transform = "";

    var st = currentStates();
    var cur = st[stateIndex];
    var id = cur && cur.id;

    if (id === "friends" && friendsRoot && !friendsRoot.hasAttribute("hidden") && friendsTrack) {
      var titleCard = friendsRoot.querySelector(".tv-dashboard__friends-focus-title-card");
      var cardsWrap = friendsRoot.querySelector(".tv-dashboard__friends-focus-player-cards");
      var allCards = cardsWrap
        ? cardsWrap.querySelectorAll(
            "button.tv-dashboard__friends-focus-player-card.tv-dashboard__dash-content-focusable"
          )
        : [];
      var cards = [];
      for (var ci = 0; ci < allCards.length; ci++) {
        if (!allCards[ci].hidden) cards.push(allCards[ci]);
      }
      var n = cards.length;
      var translate = 0;
      if (contentInnerSlot > 0 && titleCard && n) {
        var playerCardIndex = contentInnerSlot - 1;
        var scrollCard = computeStripFirstCardScrollOffset(playerCardIndex, n);
        if (scrollCard > 0) {
          translate = titleCard.offsetWidth + STRIP_FOCUS_GAP_PX;
          for (var i = 0; i < scrollCard && i < n; i++) {
            translate += cards[i].offsetWidth + STRIP_FOCUS_GAP_PX;
          }
        }
      }
      friendsTrack.style.transform = "translateX(" + -translate + "px)";
      return;
    }

    if (id === "achievements" && achRoot && !achRoot.hasAttribute("hidden") && achTrack) {
      var header = achRoot.querySelector(".tv-dashboard__achievements-focus-header");
      var strip = achRoot.querySelector(".tv-dashboard__achievements-focus-cards");
      var achCards = strip
        ? strip.querySelectorAll(
            "button.tv-dashboard__achievements-focus-card.tv-dashboard__dash-content-focusable," +
              "button.tv-dashboard__achievements-focus-locked.tv-dashboard__dash-content-focusable," +
              "button.tv-dashboard__achievements-focus-mystery.tv-dashboard__dash-content-focusable"
          )
        : [];
      var na = achCards.length;
      var translateA = 0;
      /* No header CTA in focus chain — slot index matches achievement card index (same strip math as Friends player cards after Find). */
      if (header && na) {
        var scrollA = computeStripFirstCardScrollOffset(contentInnerSlot, na);
        if (scrollA > 0) {
          translateA = header.offsetWidth + STRIP_FOCUS_GAP_PX;
          for (var j = 0; j < scrollA && j < na; j++) {
            translateA += achCards[j].offsetWidth + STRIP_FOCUS_GAP_PX;
          }
        }
      }
      achTrack.style.transform = "translateX(" + -translateA + "px)";
      return;
    }

    if (
      id === "exit" &&
      isExitDiscoveryMode() &&
      exitDiscRoot &&
      !exitDiscRoot.hasAttribute("hidden") &&
      exitDiscTrack
    ) {
      var exitCards = exitDiscTrack.querySelectorAll(
        "button.tv-dashboard__exit-discovery-prompt.tv-dashboard__dash-content-focusable," +
          "button.tv-dashboard__exit-discovery-game.tv-dashboard__dash-content-focusable"
      );
      var ne = exitCards.length;
      var translateE = 0;
      if (ne) {
        var scrollE = computeStripFirstCardScrollOffset(contentInnerSlot, ne);
        for (var k = 0; k < scrollE && k < ne; k++) {
          translateE += exitCards[k].offsetWidth + STRIP_FOCUS_GAP_PX;
        }
      }
      exitDiscTrack.style.transform = "translateX(" + -translateE + "px)";
    }
  }

  window.syncTvFriendsFocusStripLayout = function () {
    var layer = document.getElementById("tvDashboardFriendsFocus");
    if (layer) syncFriendsPlayerCardWashesFromAvatars(layer);
    syncDashboardHorizontalStripScroll();
  };

  function applyDashboardInnerContentFocus() {
    var chain = getDashboardContentFocusables();
    var wrap = document.getElementById("tvDashboardContentFocus");
    clampContentInnerSlot(chain.length);
    syncDashboardHorizontalStripScroll();
    for (var i = 0; i < chain.length; i++) {
      chain[i].setAttribute("tabindex", i === contentInnerSlot ? "0" : "-1");
    }
    if (!chain.length) {
      if (wrap && contentFocusActive) {
        requestAnimationFrame(function () {
          if (!contentFocusActive) return;
          try {
            wrap.focus({ preventScroll: true });
          } catch (e) {
            try {
              wrap.focus();
            } catch (e2) {}
          }
          syncDashboardContentTvRingClass();
        });
      }
      return;
    }
    var target = chain[contentInnerSlot];
    var stNav = currentStates();
    var curNavId = stNav[stateIndex] && stNav[stateIndex].id;
    requestAnimationFrame(function () {
      if (!contentFocusActive) return;
      try {
        target.focus({ preventScroll: true });
      } catch (e) {
        try {
          target.focus();
        } catch (e2) {}
      }
      if (curNavId !== "friends" && curNavId !== "achievements") {
        try {
          target.scrollIntoView({ inline: "nearest", block: "nearest" });
        } catch (e3) {}
      }
      syncDashboardContentTvRingClass();
    });
  }

  function navigateDashboardContentHorizontal(delta) {
    var chain = getDashboardContentFocusables();
    if (!chain.length) return;
    var nextSlot = contentInnerSlot + delta;
    if (nextSlot < 0 || nextSlot >= chain.length) return;
    contentInnerSlot = nextSlot;
    applyDashboardInnerContentFocus();
  }

  /** ↑ / ↓ (or D-pad vertical) between stacked content focusables — Exit tab Continue ↔ Exit Game. */
  function navigateDashboardContentVertical(delta) {
    var chain = getDashboardContentFocusables();
    if (!chain.length) return false;
    var nextSlot = contentInnerSlot + delta;
    if (nextSlot < 0 || nextSlot >= chain.length) return false;
    contentInnerSlot = nextSlot;
    applyDashboardInnerContentFocus();
    return true;
  }

  function syncContentFocusDom() {
    var dash = document.getElementById("tvDashboard");
    if (dash) {
      dash.setAttribute("data-content-focus", contentFocusActive ? "true" : "false");
      dash.setAttribute(
        "data-header-notif-focus",
        headerNotificationsFocused && !isNotificationsView() ? "true" : "false"
      );
    }
    var wrap = document.getElementById("tvDashboardContentFocus");
    if (!contentFocusActive) {
      clearDashboardTvFocusRingClasses();
      var ae = document.activeElement;
      if (ae && ae.classList && ae.classList.contains("tv-dashboard__dash-content-focusable")) {
        try {
          ae.blur();
        } catch (e) {}
      }
      var all = document.querySelectorAll(".tv-dashboard__dash-content-focusable");
      for (var z = 0; z < all.length; z++) {
        all[z].setAttribute("tabindex", "-1");
      }
      if (wrap && document.activeElement === wrap) {
        try {
          wrap.blur();
        } catch (e2) {}
      }
      syncDashboardHorizontalStripScroll();
      return;
    }
    if (wrap && document.activeElement === wrap) {
      try {
        wrap.blur();
      } catch (e3) {}
    }
    applyDashboardInnerContentFocus();
  }

  function setStateIndex(i, wrap) {
    var st = currentStates();
    if (!st.length) return;
    var n = st.length;
    if (wrap) {
      while (i < 0) i += n;
      i = i % n;
    } else {
      if (i < 0 || i >= n) return;
    }
    headerNotificationsFocused = false;
    headerNotificationsFromContent = false;
    notificationsExitReturnToContent = false;
    contentInnerSlotSavedForHeaderReturn = null;
    contentFocusActive = false;
    notificationsPanelOpen = false;
    stateIndex = i;
    applyDom();
  }

  function next() {
    if (isChromelessDashboardContext()) {
      if (contentFocusActive) {
        navigateDashboardContentHorizontal(1);
      }
      return;
    }
    if (usePrimaryNavModel()) {
      if (isNotificationsView()) return;
      if (headerNotificationsFocused) return;
      if (contentFocusActive) {
        navigateDashboardContentHorizontal(1);
        return;
      }
      var row = getRowIndices();
      if (!row.length) return;
      var slot = rowSlotForStateIndex(stateIndex);
      var nextSlot = (slot + 1) % row.length;
      stateIndex = row[nextSlot];
      applyDom();
      return;
    }
    setStateIndex(stateIndex + 1, true);
  }

  function prev() {
    if (isChromelessDashboardContext()) {
      if (contentFocusActive) {
        navigateDashboardContentHorizontal(-1);
      }
      return;
    }
    if (usePrimaryNavModel()) {
      if (isNotificationsView()) return;
      if (headerNotificationsFocused) return;
      if (contentFocusActive) {
        navigateDashboardContentHorizontal(-1);
        return;
      }
      var row = getRowIndices();
      if (!row.length) return;
      var slot = rowSlotForStateIndex(stateIndex);
      var prevSlot = (slot - 1 + row.length) % row.length;
      stateIndex = row[prevSlot];
      applyDom();
      return;
    }
    setStateIndex(stateIndex - 1, true);
  }

  function enterNotifications() {
    if (!usePrimaryNavModel()) return;
    if (isNotificationsView()) return;
    if (!isOnMainRowState()) return;
    notificationsExitReturnToContent = headerNotificationsFromContent;
    headerNotificationsFocused = false;
    headerNotificationsFromContent = false;
    contentFocusActive = false;
    savedRowSlot = rowSlotForStateIndex(stateIndex);
    notificationsPanelOpen = true;
    applyDom();
  }

  function exitNotifications() {
    if (!usePrimaryNavModel()) return;
    if (!isNotificationsView()) return;
    notificationsPanelOpen = false;
    contentFocusActive = false;
    headerNotificationsFocused = true;
    headerNotificationsFromContent = notificationsExitReturnToContent;
    notificationsExitReturnToContent = false;
    applyDom();
  }

  /** Escape / controller B — leave nested dashboard UI, then dismiss overlay. */
  function onDashboardBack() {
    if (isChromelessDashboardContext()) {
      requestCloseDashboard();
      return;
    }
    if (usePrimaryNavModel()) {
      if (isNotificationsView()) {
        exitNotifications();
        return;
      }
      if (headerNotificationsFocused) {
        headerNotificationsFocused = false;
        headerNotificationsFromContent = false;
        applyDom();
        return;
      }
      if (contentFocusActive) {
        contentFocusActive = false;
        applyDom();
        return;
      }
      requestCloseDashboard();
      return;
    }
    if (levels.length && levelIndex > 0) {
      levelIndex--;
      stateIndex = 0;
      applyDom();
      return;
    }
    requestCloseDashboard();
  }

  /** True when a GamepadButton is active — some pads expose D-pad / face via `value` only. */
  function gamepadButtonActive(btn) {
    if (!btn) return false;
    if (btn.pressed) return true;
    var v = btn.value;
    return typeof v === "number" && v > 0.35;
  }

  function readGamepadDpadXY(gp) {
    var x = 0;
    var y = 0;
    if (!gp || !gp.buttons) return { x: x, y: y };
    var b = gp.buttons;
    if (gamepadButtonActive(b[14])) x -= 1;
    if (gamepadButtonActive(b[15])) x += 1;
    if (gamepadButtonActive(b[12])) y -= 1;
    if (gamepadButtonActive(b[13])) y += 1;
    if (y === 0) {
      if (gamepadButtonActive(b[16])) y -= 1;
      if (gamepadButtonActive(b[17])) y += 1;
    }
    if (x === 0 && gp.axes && gp.axes.length > 6) {
      if (gp.axes[6] < -0.5) x -= 1;
      if (gp.axes[6] > 0.5) x += 1;
    }
    if (y === 0 && gp.axes && gp.axes.length > 7) {
      if (gp.axes[7] < -0.5) y -= 1;
      if (gp.axes[7] > 0.5) y += 1;
    }
    if (y === 0 && gp.axes && gp.axes.length > 1) {
      if (gp.axes[1] < -0.45) y -= 1;
      else if (gp.axes[1] > 0.45) y += 1;
    }
    if (x === 0 && gp.axes && gp.axes.length > 0) {
      if (gp.axes[0] < -0.45) x -= 1;
      else if (gp.axes[0] > 0.45) x += 1;
    }
    return { x: x, y: y };
  }

  /**
   * Single routing path for TV dashboard semantic input (arrows, confirm, cancel).
   * Keyboard, painted controller, and gamepad should all map to InputIntent then call this
   * so behavior cannot drift between input devices.
   *
   * @param {string} intent - window.InputIntent.*
   * @param {{ repeat?: boolean, pulse?: boolean }} [opts]
   * @returns {boolean} true if the intent was consumed (keyboard: preventDefault when true).
   */
  function routeTvDashboardInputIntent(intent, opts) {
    opts = opts || {};
    var repeat = !!opts.repeat;
    var pulse = opts.pulse !== false;
    var app = document.getElementById("app");
    if (!app || !intent || !window.InputIntent) return false;
    var I = window.InputIntent;

    function pulseNow() {
      if (pulse && window.pulseNgcForIntent) window.pulseNgcForIntent(intent);
    }

    if (app.getAttribute("data-player-panel-open") === "true") {
      pulseNow();
      if (intent === I.CONFIRM) {
        if (repeat) return true;
        if (typeof window.playerPanelApplyPrimaryAction === "function") window.playerPanelApplyPrimaryAction();
        return true;
      }
      if (intent === I.CANCEL) {
        if (repeat) return true;
        if (typeof window.closeTvPlayerPanel === "function") window.closeTvPlayerPanel();
        return true;
      }
      if (intent === I.MOVE_UP || intent === I.MOVE_DOWN) {
        if (repeat) return true;
        if (typeof window.playerPanelNavigateVertical === "function") {
          window.playerPanelNavigateVertical(intent === I.MOVE_UP ? -1 : 1);
        }
        return true;
      }
      if (intent === I.MOVE_LEFT || intent === I.MOVE_RIGHT) {
        if (repeat) return true;
        if (typeof window.playerPanelNavigateHorizontal === "function") {
          window.playerPanelNavigateHorizontal(intent === I.MOVE_RIGHT ? 1 : -1);
        }
        return true;
      }
      return true;
    }

    if (app.getAttribute("data-tv-dashboard") !== "open") return false;

    pulseNow();

    if (intent === I.CONFIRM) {
      if (repeat) return false;
      if (
        app.getAttribute("data-notifications-panel") === "open" &&
        app.getAttribute("data-dashboard-context") !== "game-invite"
      ) {
        if (typeof window.notificationsPanelApplyPrimaryAction === "function") {
          window.notificationsPanelApplyPrimaryAction();
        }
        return true;
      }
      if (app.getAttribute("data-dashboard-context") === "invite") {
        return !!(typeof window.invitePanelApplyPrimaryAction === "function" && window.invitePanelApplyPrimaryAction());
      }
      if (app.getAttribute("data-dashboard-context") === "game-invite") {
        if (typeof window.gameInviteTvPanelApplyPrimaryAction === "function") {
          window.gameInviteTvPanelApplyPrimaryAction();
        }
        return true;
      }
      if (tryOpenNotificationsFromHeaderPrimaryAction()) return true;
      if (tryFriendsPlayerCardPrimaryAction()) return true;
      if (tryControllersReadyPrimaryAction()) return true;
      if (tryDashboardExitPanelPrimaryAction()) return true;
      if (tryActivateDashboardNavSelectedStateFromPrimary()) return true;
      tryCloseDashboardFromPlayGameAction();
      return true;
    }

    if (intent === I.CANCEL) {
      if (repeat) return false;
      var imessageRoot = document.getElementById("phoneImessageComposerRoot");
      if (imessageRoot && imessageRoot.classList.contains("phone-imessage--open")) {
        if (typeof window.closePhoneImessageComposer === "function") {
          window.closePhoneImessageComposer();
        }
        return true;
      }
      var sheetRoot = document.getElementById("phoneShareSheetRoot");
      if (sheetRoot && sheetRoot.classList.contains("phone-share-sheet--open")) {
        if (typeof window.closePhoneInviteShareSheet === "function") {
          window.closePhoneInviteShareSheet();
        }
        return true;
      }
      if (
        app.getAttribute("data-dashboard-context") === "game-invite" &&
        app.getAttribute("data-game-invite-entry") === "notifications" &&
        typeof window.closeTvGameInviteDetailToNotifications === "function"
      ) {
        window.closeTvGameInviteDetailToNotifications();
        return true;
      }
      if (app.getAttribute("data-dashboard-context") === "invite" || app.getAttribute("data-dashboard-context") === "game-invite") {
        requestCloseDashboard();
        return true;
      }
      onDashboardBack();
      return true;
    }

    if (app.getAttribute("data-dashboard-context") === "invite") {
      if (intent === I.MOVE_UP || intent === I.MOVE_DOWN) {
        if (repeat) return true;
        if (typeof window.invitePanelNavigateVertical === "function") {
          window.invitePanelNavigateVertical(intent === I.MOVE_DOWN ? 1 : -1);
        }
        return true;
      }
      return false;
    }

    if (app.getAttribute("data-dashboard-context") === "game-invite") {
      if (intent === I.MOVE_UP || intent === I.MOVE_DOWN) {
        if (repeat) return true;
        if (typeof window.gameInviteTvPanelNavigateVertical === "function") {
          window.gameInviteTvPanelNavigateVertical(intent === I.MOVE_DOWN ? 1 : -1);
        }
        return true;
      }
      return false;
    }

    if (
      app.getAttribute("data-notifications-panel") === "open" &&
      app.getAttribute("data-dashboard-context") !== "game-invite"
    ) {
      if (intent === I.MOVE_UP || intent === I.MOVE_DOWN) {
        if (repeat) return true;
        if (typeof window.notificationsPanelNavigateVertical === "function") {
          window.notificationsPanelNavigateVertical(intent === I.MOVE_DOWN ? 1 : -1);
        }
        return true;
      }
      if (intent === I.MOVE_LEFT || intent === I.MOVE_RIGHT) {
        if (repeat) return true;
        if (typeof window.notificationsPanelNavigateHorizontal === "function") {
          window.notificationsPanelNavigateHorizontal(intent === I.MOVE_RIGHT ? 1 : -1);
        }
        return true;
      }
      return false;
    }

    if (dashboardContextIsInviteLike(app)) return false;

    if (
      intent !== I.MOVE_LEFT &&
      intent !== I.MOVE_RIGHT &&
      intent !== I.MOVE_UP &&
      intent !== I.MOVE_DOWN
    ) {
      return false;
    }

    if (repeat) return false;
    if (intent === I.MOVE_LEFT) prev();
    else if (intent === I.MOVE_RIGHT) next();
    else if (intent === I.MOVE_UP) onDashboardNavigateUp();
    else if (intent === I.MOVE_DOWN) onDashboardNavigateDown();
    return true;
  }

  function pollAggregatedGamepadDigital() {
    var left = false;
    var right = false;
    var up = false;
    var down = false;
    var aBtn = false;
    var bBtn = false;
    var gps = navigator.getGamepads && navigator.getGamepads();
    if (gps) {
      for (var g = 0; g < gps.length; g++) {
        var gp = gps[g];
        if (!gp || !gp.buttons) continue;
        var d = readGamepadDpadXY(gp);
        if (d.x < 0) left = true;
        if (d.x > 0) right = true;
        if (d.y < 0) up = true;
        if (d.y > 0) down = true;
        if (gamepadButtonActive(gp.buttons[0])) aBtn = true;
        if (gamepadButtonActive(gp.buttons[1])) bBtn = true;
      }
    }
    return { left: left, right: right, up: up, down: down, a: aBtn, b: bBtn };
  }

  function gamepadTick() {
    var app = document.getElementById("app");
    if (!app) {
      gpPrev.left = gpPrev.right = gpPrev.up = gpPrev.down = gpPrev.a = gpPrev.b = false;
      rafId = 0;
      return;
    }

    var agg = pollAggregatedGamepadDigital();
    var IM = window.InputIntent;

    if (app.getAttribute("data-player-panel-open") === "true") {
      if (IM) {
        if (agg.left && !gpPrev.left) routeTvDashboardInputIntent(IM.MOVE_LEFT, { pulse: true });
        if (agg.right && !gpPrev.right) routeTvDashboardInputIntent(IM.MOVE_RIGHT, { pulse: true });
        if (agg.up && !gpPrev.up) routeTvDashboardInputIntent(IM.MOVE_UP, { pulse: true });
        if (agg.down && !gpPrev.down) routeTvDashboardInputIntent(IM.MOVE_DOWN, { pulse: true });
        if (agg.a && !gpPrev.a) routeTvDashboardInputIntent(IM.CONFIRM, { pulse: true });
        if (agg.b && !gpPrev.b) routeTvDashboardInputIntent(IM.CANCEL, { pulse: true });
      }
      gpPrev.left = agg.left;
      gpPrev.right = agg.right;
      gpPrev.up = agg.up;
      gpPrev.down = agg.down;
      gpPrev.a = agg.a;
      gpPrev.b = agg.b;
      rafId = requestAnimationFrame(gamepadTick);
      return;
    }

    if (app.getAttribute("data-tv-dashboard") !== "open") {
      gpPrev.left = gpPrev.right = gpPrev.up = gpPrev.down = gpPrev.a = gpPrev.b = false;
      rafId = 0;
      return;
    }

    if (IM) {
      if (agg.left && !gpPrev.left) routeTvDashboardInputIntent(IM.MOVE_LEFT, { pulse: true });
      if (agg.right && !gpPrev.right) routeTvDashboardInputIntent(IM.MOVE_RIGHT, { pulse: true });
      if (agg.up && !gpPrev.up) routeTvDashboardInputIntent(IM.MOVE_UP, { pulse: true });
      if (agg.down && !gpPrev.down) routeTvDashboardInputIntent(IM.MOVE_DOWN, { pulse: true });
      if (agg.a && !gpPrev.a) routeTvDashboardInputIntent(IM.CONFIRM, { pulse: true });
      if (agg.b && !gpPrev.b) routeTvDashboardInputIntent(IM.CANCEL, { pulse: true });
    }

    gpPrev.left = agg.left;
    gpPrev.right = agg.right;
    gpPrev.up = agg.up;
    gpPrev.down = agg.down;
    gpPrev.a = agg.a;
    gpPrev.b = agg.b;
    rafId = requestAnimationFrame(gamepadTick);
  }

  function ensureGamepadLoop() {
    if (rafId) return;
    rafId = requestAnimationFrame(gamepadTick);
  }

  window.ensureTvDashboardGamepadLoop = ensureGamepadLoop;

  function stopGamepadLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    gpPrev.left = gpPrev.right = gpPrev.up = gpPrev.down = gpPrev.a = gpPrev.b = false;
  }

  function buildStage() {
    var stage = document.getElementById("tvDashboardStage");
    if (!stage || stage.getAttribute("data-dash-built") === "1") return;
    var st = currentStates();
    if (!st.length) return;
    stage.textContent = "";
    for (var i = 0; i < st.length; i++) {
      var img = document.createElement("img");
      img.className = "tv-dashboard__layer";
      img.alt = st[i].label || "";
      img.decoding = "async";
      img.loading = "eager";
      img.src = st[i].path || "";
      img.setAttribute("data-figma-frame", st[i].figmaFrame || "");
      img.setAttribute("data-dash-state-id", st[i].id || "");
      img.setAttribute("aria-hidden", i === 0 ? "false" : "true");
      if (i === 0) img.classList.add("is-active");
      stage.appendChild(img);
    }
    stage.setAttribute("data-dash-built", "1");
  }

  /** Randomize FIFA achievement strip once per load (see `tvDashboardAchievementsCards`). */
  function shuffleAchievementCardsOnce() {
    var wrap = document.getElementById("tvDashboardAchievementsCards");
    if (!wrap || wrap.getAttribute("data-achievements-shuffled") === "1") return;
    if (
      typeof window.isMultiLocalSession === "function" &&
      window.isMultiLocalSession()
    ) {
      return;
    }
    var kids = Array.prototype.slice.call(wrap.children);
    shuffleArray(kids);
    var frag = document.createDocumentFragment();
    for (var i = 0; i < kids.length; i++) frag.appendChild(kids[i]);
    wrap.appendChild(frag);
    wrap.setAttribute("data-achievements-shuffled", "1");
  }

  function init() {
    if (inited) return;
    inited = true;
    applyPrototypeGameHandle();
    syncPrototypeLocalCoplayers();
    shuffleAchievementCardsOnce();
    var contExit = document.getElementById("tvDashboardExitContinue");
    var extExit = document.getElementById("tvDashboardExitExit");
    if (contExit && !contExit.getAttribute("data-dash-exit-actions")) {
      contExit.setAttribute("data-dash-exit-actions", "1");
      contExit.addEventListener("click", function () {
        var ap = document.getElementById("app");
        if (!ap || ap.getAttribute("data-tv-dashboard") !== "open") return;
        applyExitContinuePlaying();
      });
    }
    if (extExit && !extExit.getAttribute("data-dash-exit-actions")) {
      extExit.setAttribute("data-dash-exit-actions", "1");
      extExit.addEventListener("click", function () {
        var ap = document.getElementById("app");
        if (!ap || ap.getAttribute("data-tv-dashboard") !== "open") return;
        applyExitGameToNetflixGamesTab();
      });
    }
    var readyBtn = document.querySelector('[data-dash-controllers-focus="ready"]');
    if (readyBtn && !readyBtn.getAttribute("data-dash-controllers-actions")) {
      readyBtn.setAttribute("data-dash-controllers-actions", "1");
      readyBtn.addEventListener("click", function () {
        var ap = document.getElementById("app");
        if (!ap || ap.getAttribute("data-tv-dashboard") !== "open") return;
        requestCloseDashboard();
      });
    }
    var prevBtn = document.getElementById("tvDashboardBtnPrev");
    var nextBtn = document.getElementById("tvDashboardBtnNext");
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { next(); });
    function bumpGamepadLoop() {
      var a = document.getElementById("app");
      if (
        a &&
        (a.getAttribute("data-tv-dashboard") === "open" ||
          a.getAttribute("data-player-panel-open") === "true")
      ) {
        ensureGamepadLoop();
      }
    }
    window.addEventListener("gamepadconnected", bumpGamepadLoop);
    window.addEventListener("resize", function () {
      syncDashboardHorizontalStripScroll();
    });
    document.addEventListener("keydown", function (e) {
      var app = document.getElementById("app");
      if (!app) return;
      if (app.getAttribute("data-player-panel-open") === "true") {
        if (e.target && e.target.closest) {
          if (e.target.closest("input, textarea, select, [contenteditable='true']")) return;
        }
        if (e.code === "KeyN") {
          if (e.repeat) return;
          e.preventDefault();
          if (typeof window.closeTvPlayerPanel === "function") {
            window.closeTvPlayerPanel();
          }
          return;
        }
        var Ipp = window.InputIntent;
        if (!window.mapKeyboardEventToIntent || !Ipp) return;
        var ippIntent = window.mapKeyboardEventToIntent(e);
        if (!ippIntent) return;
        if (routeTvDashboardInputIntent(ippIntent, { repeat: e.repeat, pulse: true })) {
          e.preventDefault();
        }
        return;
      }
      if (app.getAttribute("data-tv-dashboard") !== "open") return;
      if (e.target && e.target.closest) {
        if (e.target.closest("input, textarea, select, [contenteditable='true']")) return;
      }
      var I = window.InputIntent;
      if (!window.mapKeyboardEventToIntent || !I) return;
      var intent = window.mapKeyboardEventToIntent(e);
      if (!intent) return;
      if (routeTvDashboardInputIntent(intent, { repeat: e.repeat, pulse: true })) {
        e.preventDefault();
      }
    });
    var root = document.getElementById("fcNgcRoot");
    if (root) {
      root.addEventListener("click", function (e) {
        var app = document.getElementById("app");
        if (!app) return;

        /** D-pad wedges / arrows: same as keyboard arrows — TV dashboard when open, else default gameplay TV focus. */
        var navT =
          (e.target && e.target.closest && e.target.closest("[data-dash-nav]")) ||
          (e.target && e.target.closest && e.target.closest("[data-dpad-dir]"));
        if (navT) {
          if (app.getAttribute("data-state") !== "in-game") return;
          var dir = navT.getAttribute("data-dash-nav") || navT.getAttribute("data-dpad-dir");
          if (!dir || (dir !== "left" && dir !== "right" && dir !== "up" && dir !== "down")) return;
          if (app.getAttribute("data-player-panel-open") === "true" || app.getAttribute("data-tv-dashboard") === "open") {
            e.preventDefault();
            e.stopPropagation();
            var IdPad = window.InputIntent;
            if (!IdPad) return;
            var dpadIntent =
              dir === "left"
                ? IdPad.MOVE_LEFT
                : dir === "right"
                  ? IdPad.MOVE_RIGHT
                  : dir === "up"
                    ? IdPad.MOVE_UP
                    : IdPad.MOVE_DOWN;
            routeTvDashboardInputIntent(dpadIntent, { repeat: false, pulse: false });
            return;
          }
          if (
            typeof window.isTvGamePauseMenuOpen === "function" &&
            window.isTvGamePauseMenuOpen()
          ) {
            e.preventDefault();
            e.stopPropagation();
            if (dir === "up" || dir === "down") {
              var IpPause = window.InputIntent;
              if (IpPause && typeof window.routePauseMenuIntent === "function") {
                if (window.pulseNgcForIntent) {
                  window.pulseNgcForIntent(dir === "down" ? IpPause.MOVE_DOWN : IpPause.MOVE_UP);
                }
                window.routePauseMenuIntent(dir === "down" ? IpPause.MOVE_DOWN : IpPause.MOVE_UP);
              }
            }
            return;
          }
          var menuInterNav = document.getElementById("tvGameplayInteractiveMenu");
          if (menuInterNav && menuInterNav.classList.contains("is-active")) {
            e.preventDefault();
            e.stopPropagation();
            if (dir === "up" || dir === "down") {
              var Imn = window.InputIntent;
              if (Imn && window.tvRouteMenuIntent) {
                window.tvRouteMenuIntent(dir === "down" ? Imn.MOVE_DOWN : Imn.MOVE_UP);
              }
            }
            return;
          }
          var inter = document.getElementById("tvGameplayInteractiveDefault");
          if (!inter || !inter.classList.contains("is-active")) return;
          e.preventDefault();
          e.stopPropagation();
          var Il = window.InputIntent;
          if (dir === "up" || dir === "down") {
            if (Il && window.tvRouteLobbyIntent) {
              window.tvRouteLobbyIntent(dir === "down" ? Il.MOVE_DOWN : Il.MOVE_UP);
            }
            return;
          }
          if (Il && window.tvRouteLobbyIntent) {
            window.tvRouteLobbyIntent(dir === "right" ? Il.MOVE_RIGHT : Il.MOVE_LEFT);
          }
          return;
        }

        var bPainted = e.target && e.target.closest && e.target.closest(".ngc-b-b");
        if (bPainted) {
          if (app.getAttribute("data-state") !== "in-game") return;
          e.preventDefault();
          e.stopPropagation();
          if (app.getAttribute("data-dashboard-context") === "invite" || app.getAttribute("data-dashboard-context") === "game-invite") {
            var imessageR = document.getElementById("phoneImessageComposerRoot");
            if (
              imessageR &&
              imessageR.classList.contains("phone-imessage--open") &&
              typeof window.closePhoneImessageComposer === "function"
            ) {
              window.closePhoneImessageComposer();
            } else {
              var sheetR = document.getElementById("phoneShareSheetRoot");
              if (
                sheetR &&
                sheetR.classList.contains("phone-share-sheet--open") &&
                typeof window.closePhoneInviteShareSheet === "function"
              ) {
                window.closePhoneInviteShareSheet();
              } else if (
                app.getAttribute("data-dashboard-context") === "game-invite" &&
                app.getAttribute("data-game-invite-entry") === "notifications" &&
                typeof window.closeTvGameInviteDetailToNotifications === "function"
              ) {
                window.closeTvGameInviteDetailToNotifications();
              } else {
                requestCloseDashboard();
              }
            }
            return;
          }
          if (app.getAttribute("data-tv-dashboard") === "open") {
            var dashB = document.getElementById("tvDashboard");
            if (dashB) {
              dashB.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })
              );
            }
            return;
          }
          if (
            typeof window.isTvGamePauseMenuOpen === "function" &&
            window.isTvGamePauseMenuOpen() &&
            window.dispatchInGameTvIntent &&
            window.InputIntent
          ) {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchInGameTvIntent(window.InputIntent.CANCEL, { skipPulse: true });
            return;
          }
          var menuPaintedB = document.getElementById("tvGameplayInteractiveMenu");
          if (
            menuPaintedB &&
            menuPaintedB.classList.contains("is-active") &&
            window.dispatchInGameTvIntent &&
            window.InputIntent
          ) {
            window.dispatchInGameTvIntent(window.InputIntent.CANCEL, { skipPulse: true });
            return;
          }
          var interB = document.getElementById("tvGameplayInteractiveDefault");
          if (interB && interB.classList.contains("is-active") && window.dispatchInGameTvIntent && window.InputIntent) {
            window.dispatchInGameTvIntent(window.InputIntent.CANCEL, { skipPulse: true });
            return;
          }
          if (typeof window.tryFifaDefaultBackToStart === "function") {
            window.tryFifaDefaultBackToStart();
          }
          return;
        }

        /** Painted A when TV dashboard is closed — must run before the early `return` below (this handler is registered during TVDashboard.init from setDashboardOpen, typically before index's fcNgcRoot listener). */
        var aPaintedDashClosed = e.target && e.target.closest && e.target.closest(".ngc-b-a");
        if (
          aPaintedDashClosed &&
          app.getAttribute("data-tv-dashboard") !== "open" &&
          app.getAttribute("data-state") === "in-game" &&
          window.dispatchInGameTvIntent &&
          window.InputIntent
        ) {
          e.preventDefault();
          e.stopPropagation();
          window.dispatchInGameTvIntent(window.InputIntent.CONFIRM, { skipPulse: true });
          return;
        }

        if (app.getAttribute("data-tv-dashboard") !== "open") return;
        var aPainted = e.target && e.target.closest && e.target.closest(".ngc-b-a");
        if (aPainted) {
          e.preventDefault();
          e.stopPropagation();
          var dashEl = document.getElementById("tvDashboard");
          if (dashEl) {
            dashEl.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true })
            );
          }
          return;
        }
        if (dashboardContextIsInviteLike(app)) return;
      });
    }
    var headerNotif = document.getElementById("tvDashboardHeaderNotif");
    if (headerNotif) {
      headerNotif.addEventListener("click", function (e) {
        var ap = document.getElementById("app");
        if (!ap || ap.getAttribute("data-tv-dashboard") !== "open") return;
        if (dashboardContextIsInviteLike(ap)) return;
        if (!usePrimaryNavModel() || isNotificationsView()) return;
        if (!isOnMainRowState()) return;
        e.preventDefault();
        e.stopPropagation();
        enterNotifications();
      });
    }
    var notifShell = document.getElementById("tvDashboardNotificationsShell");
    if (notifShell) {
      var notifBd = notifShell.querySelector(".tv-dashboard__notifications-backdrop");
      if (notifBd) {
        notifBd.addEventListener("click", function () {
          exitNotifications();
        });
      }
      var notifClose = document.getElementById("tvDashboardNotificationsClose");
      if (notifClose) {
        notifClose.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          exitNotifications();
        });
      }
    }
    var primaryNav = document.getElementById("tvDashboardPrimaryNav");
    if (primaryNav) {
      primaryNav.addEventListener("click", function (e) {
        var app = document.getElementById("app");
        if (!app || app.getAttribute("data-tv-dashboard") !== "open") return;
        if (dashboardContextIsInviteLike(app)) return;
        var t = e.target && e.target.closest && e.target.closest(".tv-dashboard__nav-item");
        if (!t) return;
        var sid = t.getAttribute("data-state-id");
        if (!sid) return;
        var ix = indexOfStateId(sid);
        if (ix < 0) return;
        e.preventDefault();
        e.stopPropagation();
        setStateIndex(ix, false);
      });
    }
    hydratePrimaryNav();
    hydrateHeader();
  }

  function setOpen(open) {
    init();
    if (window.DashboardOverlay && typeof window.DashboardOverlay.hydrate === "function") {
      window.DashboardOverlay.hydrate();
    }
    if (open) {
      dashboardNavContentAnimPrevIndex = null;
      levelIndex = 0;
      var row = getRowIndices();
      stateIndex = row.length ? row[0] : 0;
      savedRowSlot = 0;
      headerNotificationsFocused = false;
      headerNotificationsFromContent = false;
      notificationsExitReturnToContent = false;
      contentInnerSlotSavedForHeaderReturn = null;
      contentFocusActive = false;
      notificationsPanelOpen = false;
      buildStage();
      hydratePrimaryNav();
      hydrateHeader();
      applyDom();
      sortFriendsFocusPlayerCardsByPresenceAndGame();
      ensureGamepadLoop();
    } else {
      dashboardNavContentAnimPrevIndex = null;
      clearAllDashboardNavEnterMotion();
      stopGamepadLoop();
      notificationsPanelOpen = false;
      headerNotificationsFocused = false;
      headerNotificationsFromContent = false;
      notificationsExitReturnToContent = false;
      contentInnerSlotSavedForHeaderReturn = null;
      contentFocusActive = false;
      applyDom();
    }
    if (window.DashboardOverlay && typeof window.DashboardOverlay.setPlayback === "function") {
      window.DashboardOverlay.setPlayback(open);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      hydratePrimaryNav();
      hydrateHeader();
      init();
    });
  } else {
    hydratePrimaryNav();
    hydrateHeader();
    init();
  }

  window.refreshTvDashboardProfileFocusLayer = updateProfileFocusLayer;

  window.TVDashboard = {
    init: init,
    setOpen: setOpen,
    /** Select primary dashboard nav state by id (e.g. `"friends"`) after the dashboard is open. */
    refreshExitFocus: function () {
      var st = currentStates();
      var cur = st[stateIndex];
      if (contentFocusActive && cur && cur.id === "exit") {
        resetContentInnerSlotForCurrentState();
      }
      applyDom();
    },
    setStateById: function (id, opts) {
      opts = opts || {};
      if (!id) return false;
      var ix = indexOfStateId(id);
      if (ix < 0) return false;
      setStateIndex(ix, false);
      if (opts.contentFocus) {
        headerNotificationsFromContent = false;
        contentInnerSlotSavedForHeaderReturn = null;
        resetContentInnerSlotForCurrentState();
        if (opts.focusPrompt && id === "exit" && isExitDiscoveryMode()) {
          contentInnerSlot = 0;
        } else if (opts.contentSlot != null) {
          contentInnerSlot = opts.contentSlot;
        }
        contentFocusActive = true;
        applyDom();
        if (id === "exit" && opts.focusPrompt && isExitDiscoveryMode()) {
          scheduleExitDiscoveryPromptFocus();
        } else if (id === "controllers") {
          scheduleControllersReadyFocus();
        }
      }
      return true;
    },
    hydratePrimaryNav: hydratePrimaryNav,
    hydrateHeader: hydrateHeader,
    getSnapshot: function () {
      var st = currentStates();
      return {
        levelIndex: levelIndex,
        stateIndex: stateIndex,
        state: st[stateIndex] || null,
        states: st,
        contentFocusActive: contentFocusActive,
        headerNotificationsFocused: headerNotificationsFocused
      };
    },
    setStateIndex: setStateIndex,
    next: next,
    prev: prev,
    enterNotifications: enterNotifications,
    exitNotifications: exitNotifications,
    requestCloseDashboard: requestCloseDashboard,
    onDashboardBack: onDashboardBack,
    onChange: function (fn) {
      if (typeof fn !== "function") return function () {};
      listeners.push(fn);
      return function () {
        var j = listeners.indexOf(fn);
        if (j >= 0) listeners.splice(j, 1);
      };
    },
    registerLevel: function (level) {
      if (!level || !level.states || !level.states.length) return;
      levels.push(level);
    }
  };
})();
