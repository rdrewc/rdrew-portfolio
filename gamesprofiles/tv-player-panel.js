/**
 * Player Panel — Figma 96:3081. Opens from dashboard friends cards, lobby rows,
 * game-invite "View Player", etc. Pulls handle + avatar from prototype DOM / PROTOTYPE_PLAYER_HANDLES.
 */
(function () {
  "use strict";

  var PP_PREV_CONTEXT = null;
  /** True when this panel was opened from a Friends strip player card (dashboard transition). */
  var PP_FROM_FRIENDS_ROW = false;
  /** Opened from in-game lobby row — dashboard was raised for the modal; close returns to gameplay. */
  var PP_FROM_LOBBY_ROW = false;
  /** Opened from Notifications list friend-request row; return animates list back in. */
  var PP_FROM_NOTIFICATIONS = false;
  /** Opened via N from in-game friend-request toast — closing panel exits to gameplay (closes dashboard). */
  var PP_FROM_FRIEND_TOAST_N = false;
  /** Notifications list row that opened this incoming friend-request panel (accept/decline updates that row). */
  var PP_LINKED_FRIEND_REQUEST_NOTIFICATION_ROW = null;
  var DEFAULT_PLAYING_ART = "assets/raster/game-invite-1-6683/game-art-hero.png";
  /** TV game-invite toast / GI sheet — inviter is always a friend playing FIFA World Cup in the player panel. */
  var GAME_INVITE_INVITER_PANEL_GAME_TITLE = "FIFA World Cup";
  var GAME_INVITE_INVITER_PANEL_PLAYING_ART = "assets/raster/game-invite-tv-61-6933/hero-art.png";
  var FRIEND_REQUEST_SUFFIX_RE = /\s+wants to be friends\.?$/i;
  var ICON_MORE = "assets/raster/game-invite-1-6683/icon-more-horizontal.svg";
  var ICON_ONLINE = "assets/raster/game-invite-1-6683/status-online-dot.svg";
  var ICON_OFFLINE = "assets/raster/game-invite-1-6683/status-offline-dot.png";

  var ppFocusIx = 0;
  var ppFocusList = [];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function getApp() {
    return document.getElementById("app");
  }

  function isEvolutionMode() {
    var app = getApp();
    return !!(app && app.getAttribute("data-platform-experience") === "evolution");
  }

  /** Evolution routes in-game lobby profile taps to the phone dashboard. */
  function shouldRouteTvProfileTapToMobile() {
    return isEvolutionMode();
  }

  function getTvPlayersJoinedCountsSafe() {
    return typeof window.getTvPlayersJoinedCounts === "function"
      ? window.getTvPlayersJoinedCounts()
      : { local: 1, total: 1 };
  }

  /** Host row shows local identity when solo or when multiple local players are connected. */
  function isLobbyHostShowingLocalIdentity() {
    var counts = getTvPlayersJoinedCountsSafe();
    var localCount = counts.local || 1;
    var total = counts.total;
    if (!(total >= 1 && total <= 4)) total = 1;
    return localCount > 1 || total === 1;
  }

  /**
   * Lobby rows reuse role keys (lobby-host, lobby-p2) that do not always match the visible player.
   * Map taps on your own lobby slot to the canonical local profile key.
   */
  function normalizeLobbyProfileHandleKey(handleKey, sourceElement) {
    if (!handleKey || handleKey === "local") return handleKey;
    if (
      !sourceElement ||
      !sourceElement.closest ||
      !sourceElement.closest(".tv-gameplay-interactive__row-btn")
    ) {
      return handleKey;
    }
    if (handleKey === "lobby-host" && isLobbyHostShowingLocalIdentity()) return "local";
    if (handleKey === "lobby-p2") {
      var localExtra = Math.max(0, (getTvPlayersJoinedCountsSafe().local || 1) - 1);
      if (localExtra < 1) return "local";
    }
    return handleKey;
  }

  function tvDashboardOpenOptsForProfileTap() {
    return { context: "default" };
  }

  function getPanelRoot() {
    return document.getElementById("tvPlayerPanel");
  }

  function getShell() {
    return document.getElementById("tvDashboardPlayerPanelShell");
  }

  function getNotificationsCard() {
    var shell = document.getElementById("tvDashboardNotificationsShell");
    if (!shell) return null;
    return shell.querySelector(".game-invite-list--notifications");
  }

  function syncNotificationsCardDrillForPlayerPanel(opening) {
    var notifCard = getNotificationsCard();
    if (!notifCard) return;
    notifCard.classList.remove("tv-notif-panel--drill-out", "tv-notif-panel--drill-in");
    void notifCard.offsetWidth;
    notifCard.classList.add(opening ? "tv-notif-panel--drill-out" : "tv-notif-panel--drill-in");
    if (!opening) {
      window.setTimeout(function () {
        notifCard.classList.remove("tv-notif-panel--drill-in");
      }, 360);
    }
  }

  function deriveDisplayNameFromNotificationRow(row) {
    if (!row) return "GameHandle";
    var raw = "";
    var name = row.querySelector(".game-invite-list__name");
    if (name) raw = (name.textContent || "").trim();
    if (!raw) return "GameHandle";
    return raw.replace(FRIEND_REQUEST_SUFFIX_RE, "").trim() || raw;
  }

  /** Parse “You are now friends with {handle}” from a post-accept notifications row. */
  function deriveDisplayNameFromNowFriendsNotification(row, handleKey) {
    var raw = "";
    var name = row && row.querySelector(".game-invite-list__name");
    if (name) raw = (name.textContent || "").trim();
    var m = raw.match(/^\s*You are now friends with\s+(.+?)\s*$/i);
    if (m && m[1]) return m[1].trim();
    return readHandleFromPrototype(handleKey);
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function resolveFriendRequestNotificationRow(handle) {
    var h = (handle || "").replace(/\s+/g, " ").trim();
    var linked = PP_LINKED_FRIEND_REQUEST_NOTIFICATION_ROW;
    if (linked && linked.parentNode && linked.getAttribute("data-notification-source") === "friend-request") {
      var dn = deriveDisplayNameFromNotificationRow(linked);
      if (!h || dn === h) return linked;
    }
    var track =
      typeof window.getMobileNotificationTrack === "function"
        ? window.getMobileNotificationTrack()
        : null;
    if (!track) {
      track = document.getElementById("tvDashboardNotificationsListTrack");
    }
    if (!track || !h) return null;
    var items = track.querySelectorAll('.game-invite-list__item[data-notification-source="friend-request"]');
    var re = new RegExp("^" + escapeRegExp(h) + "\\s+wants to be friends\\.?$", "i");
    for (var i = 0; i < items.length; i++) {
      var nameEl = items[i].querySelector(".game-invite-list__name");
      var t = nameEl ? nameEl.textContent.trim() : "";
      if (re.test(t)) return items[i];
    }
    return null;
  }

  function applyFriendRequestAcceptedToNotificationRow(handle, acceptedHandleKey, opts) {
    opts = opts || {};
    var row = opts.row || resolveFriendRequestNotificationRow(handle);
    if (!row || !acceptedHandleKey) return;
    var nameEl = row.querySelector(".game-invite-list__name");
    if (nameEl) nameEl.textContent = "You are now friends with " + handle;
    row.classList.remove("game-invite-list__item--notification-unread");
    row.setAttribute("data-notification-source", "friend-connected");
    row.setAttribute("data-player-panel-handle-key", acceptedHandleKey);
    row.setAttribute("data-player-panel-state", "friend-connected");
    row.setAttribute("data-player-panel-entry", "external");
    row.setAttribute("data-player-panel-close-stack", "back");
    row.removeAttribute("data-player-panel-game-invite");
    var timeEl = row.querySelector(".game-invite-list__notification-time");
    if (timeEl) timeEl.textContent = "";
    PP_LINKED_FRIEND_REQUEST_NOTIFICATION_ROW = null;
    if (typeof window.syncTvHeaderGameInviteNotificationBadge === "function") {
      window.syncTvHeaderGameInviteNotificationBadge();
    }
    if (typeof window.syncTvNotificationsPanelLayout === "function") {
      window.requestAnimationFrame(function () {
        window.syncTvNotificationsPanelLayout();
      });
    }
    if (
      !opts.skipMobileSync &&
      typeof window.syncMobileNotificationList === "function"
    ) {
      window.requestAnimationFrame(window.syncMobileNotificationList);
    }
  }

  function isTvNotificationsPanelListForegroundVisible() {
    var app = document.getElementById("app");
    if (!app || app.getAttribute("data-notifications-panel") !== "open") return false;
    var shell = document.getElementById("tvDashboardNotificationsShell");
    return !!(shell && !shell.hasAttribute("hidden"));
  }

  function removeFriendRequestNotificationRowForDecline(handle, preferredRow) {
    var row =
      preferredRow && preferredRow.parentNode
        ? preferredRow
        : resolveFriendRequestNotificationRow(handle);
    if (!row || !row.parentNode) {
      PP_LINKED_FRIEND_REQUEST_NOTIFICATION_ROW = null;
      return;
    }
    var track = row.parentNode;
    var siblings = Array.prototype.slice.call(track.querySelectorAll(".game-invite-list__item"));
    var ix = siblings.indexOf(row);
    PP_LINKED_FRIEND_REQUEST_NOTIFICATION_ROW = null;

    var fr = window.__tvFriendInviteToastPerson;
    if (fr && fr.notificationRow === row) fr.notificationRow = null;

    function finalizeRemove() {
      if (row.parentNode) row.parentNode.removeChild(row);
      document.dispatchEvent(
        new CustomEvent("tvnotifications:row-removed", {
          bubbles: true,
          detail: { removedIndex: ix },
        })
      );
      if (typeof window.syncTvNotificationsPanelLayout === "function") {
        window.requestAnimationFrame(function () {
          window.syncTvNotificationsPanelLayout();
        });
      }
      if (typeof window.syncTvHeaderGameInviteNotificationBadge === "function") {
        window.syncTvHeaderGameInviteNotificationBadge();
      }
      if (typeof window.syncMobileNotificationList === "function") {
        window.requestAnimationFrame(window.syncMobileNotificationList);
      }
    }

    var animate =
      isTvNotificationsPanelListForegroundVisible() &&
      !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    if (!animate) {
      finalizeRemove();
      return;
    }

    row.style.overflow = "hidden";
    row.style.maxHeight = row.scrollHeight + "px";
    void row.offsetHeight;
    row.classList.add("game-invite-list__item--notification-removing");
    window.requestAnimationFrame(function () {
      row.style.maxHeight = "0";
    });

    var settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      row.removeEventListener("transitionend", onEnd);
      finalizeRemove();
    }
    function onEnd(e) {
      if (e.target !== row) return;
      if (e.propertyName !== "max-height") return;
      finish();
    }
    row.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, 450);
  }

  function readHandleFromPrototype(handleKey) {
    var H = window.PROTOTYPE_PLAYER_HANDLES;
    if (H && Object.prototype.hasOwnProperty.call(H, handleKey)) {
      return H[handleKey];
    }
    var span = document.querySelector(
      '[data-prototype-player-handle="' + handleKey + '"]'
    );
    return span ? span.textContent.trim() : "GameHandle";
  }

  function findAvatarSrc(el, handleKey) {
    if (el) {
      var img =
        el.querySelector(".tv-dashboard__friends-focus-player-avatar-img") ||
        el.querySelector(".game-invite-list__avatar img") ||
        el.querySelector(".tv-gameplay-interactive__avatar img");
      if (img && img.getAttribute("src")) return img.getAttribute("src");
    }
    var row = document.querySelector(
      '.game-invite-list__item [data-prototype-player-handle="' + handleKey + '"]'
    );
    if (row) {
      var card = row.closest(".game-invite-list__item");
      if (card) {
        var av = card.querySelector(".game-invite-list__avatar img");
        if (av && av.getAttribute("src")) return av.getAttribute("src");
      }
    }
    var AV = window.PROTOTYPE_PLAYER_AVATARS;
    if (handleKey && AV && typeof AV[handleKey] === "string") return AV[handleKey];
    return (
      (window.PROFILE_AVATAR_PATHS && window.PROFILE_AVATAR_PATHS.length && window.PROFILE_AVATAR_PATHS[0]) ||
      "assets/profile-avatars/type-01-haru.png"
    );
  }

  /**
   * Profile avatar for the TV game-invite “View Player” flow — use the Friends-strip player
   * currently shown as playing the invite game, not the toast / invite-sheet decorative art.
   */
  function findGameInviteInviterProfileAvatarSrc() {
    var cards = document.querySelectorAll(".tv-dashboard__friends-focus-player-card");
    for (var i = 0; i < cards.length; i++) {
      var titleEl = cards[i].querySelector(".tv-dashboard__friends-focus-player-game-title");
      var gt = titleEl ? titleEl.textContent.trim() : "";
      if (gt === GAME_INVITE_INVITER_PANEL_GAME_TITLE) {
        var img = cards[i].querySelector(".tv-dashboard__friends-focus-player-avatar-img");
        if (img && img.getAttribute("src")) return img.getAttribute("src");
      }
    }
    return findAvatarSrc(null, "inviter");
  }

  function findGameTitle(el) {
    if (!el) return "";
    var t = el.querySelector(".tv-dashboard__friends-focus-player-game-title");
    return t ? t.textContent.trim() : "";
  }

  function findPresenceDot(el) {
    if (!el) return ICON_ONLINE;
    var img = el.querySelector(".tv-dashboard__friends-focus-handle-status img");
    if (img && img.getAttribute("src")) return img.getAttribute("src");
    return ICON_ONLINE;
  }

  function findPresenceLabel(el) {
    if (!el) return "Online";
    var span = el.querySelector(".tv-dashboard__friends-focus-handle-status span");
    return span ? span.textContent.trim() : "Online";
  }

  function findFriendsFocusCardByDisplayName(displayName) {
    var target = (displayName || "").replace(/\s+/g, " ").trim();
    if (!target) return null;
    var cards = document.querySelectorAll(".tv-dashboard__friends-focus-player-card");
    for (var i = 0; i < cards.length; i++) {
      var span = cards[i].querySelector(".tv-dashboard__friends-focus-handle-name span");
      var name = span ? span.textContent.replace(/\s+/g, " ").trim() : "";
      if (name && name.localeCompare(target, undefined, { sensitivity: "base" }) === 0) {
        return cards[i];
      }
    }
    return null;
  }

  function deriveFriendDisplayNameFromRow(tvRow, handleKey) {
    if (!tvRow) return readHandleFromPrototype(handleKey);
    var name = tvRow.querySelector(".game-invite-list__name");
    var raw = name ? (name.textContent || "").trim() : "";
    var connected = raw.match(/^\s*You are now friends with\s+(.+?)\s*$/i);
    if (connected && connected[1]) return connected[1].trim();
    var plain = raw.replace(FRIEND_REQUEST_SUFFIX_RE, "").trim();
    return plain || readHandleFromPrototype(handleKey);
  }

  function findInviteListItemForHandleKey(handleKey) {
    if (!handleKey) return null;
    return document.querySelector(
      '#tvDashboardInviteShell .game-invite-list__item[data-player-panel-handle-key="' + handleKey + '"]'
    );
  }

  function findInviteListItemByDisplayName(displayName) {
    var target = (displayName || "").replace(/\s+/g, " ").trim();
    if (!target) return null;
    var items = document.querySelectorAll(
      '#tvDashboardInviteShell .game-invite-list__item[data-player-panel-handle-key]'
    );
    for (var i = 0; i < items.length; i++) {
      var nameEl =
        items[i].querySelector('[data-prototype-player-handle]') ||
        items[i].querySelector(".game-invite-list__name span") ||
        items[i].querySelector(".game-invite-list__name");
      var name = nameEl ? nameEl.textContent.replace(/\s+/g, " ").trim() : "";
      if (name && name.localeCompare(target, undefined, { sensitivity: "base" }) === 0) {
        return items[i];
      }
    }
    return null;
  }

  function readPresenceFromStatusEl(invStatus) {
    if (typeof window.PrototypePresence !== "undefined") {
      var p = window.PrototypePresence.readPresenceFromInviteStatus(invStatus);
      return {
        online: p.state !== window.PrototypePresence.STATE_OFFLINE,
        presenceState: p.state,
        presenceLabel: window.PrototypePresence.formatOnlinePlayerStatus(p),
        presenceDotSrc:
          p.state === window.PrototypePresence.STATE_OFFLINE
            ? ICON_OFFLINE
            : ICON_ONLINE,
        playingGame: p.gameTitle || "",
      };
    }
    if (!invStatus) return null;
    var online = invStatus.classList.contains("game-invite-list__status--online");
    var invLabel = invStatus.querySelector("span");
    var statusText = invLabel ? invLabel.textContent.replace(/\s+/g, " ").trim() : "";
    var playingGame = "";
    if (/offline/i.test(statusText)) online = false;
    else if (/playing\s+/i.test(statusText)) {
      online = true;
      playingGame = statusText.replace(/^playing\s+/i, "").trim();
    }
    var dotImg = invStatus.querySelector("img");
    return {
      online: online,
      presenceLabel: online ? "Online" : "Offline",
      presenceDotSrc:
        dotImg && dotImg.getAttribute("src")
          ? dotImg.getAttribute("src")
          : online
            ? ICON_ONLINE
            : ICON_OFFLINE,
      playingGame: playingGame,
    };
  }

  /**
   * Canonical “profile list” row for this player — Friends focus strip, or resolved from invite row handle key / PROTOTYPE_PLAYER_HANDLES.
   */
  function findFriendsFocusCardForPlayingLookup(handleKey, sourceElement) {
    if (sourceElement) {
      var fromFriends = sourceElement.closest(".tv-dashboard__friends-focus-player-card");
      if (fromFriends) return fromFriends;
      var item = sourceElement.closest(".game-invite-list__item");
      if (item && !item.classList.contains("game-invite-list__item--share")) {
        var ik = item.getAttribute("data-player-panel-handle-key");
        if (ik) {
          var match = document.querySelector(
            '.tv-dashboard__friends-focus-player-card[data-player-panel-handle-key="' + ik + '"]'
          );
          if (match) return match;
        }
      }
    }
    if (!handleKey) return null;
    var PH = window.PROTOTYPE_PLAYER_HANDLES;
    var card = document.querySelector(
      '.tv-dashboard__friends-focus-player-card[data-player-panel-handle-key="' + handleKey + '"]'
    );
    if (card) return card;
    if (!PH || !Object.prototype.hasOwnProperty.call(PH, handleKey)) {
      var displayName = deriveFriendDisplayNameFromRow(sourceElement, handleKey);
      return findFriendsFocusCardByDisplayName(displayName);
    }
    var target = PH[handleKey];
    var cards = document.querySelectorAll(
      ".tv-dashboard__friends-focus-player-card[data-player-panel-handle-key]"
    );
    for (var i = 0; i < cards.length; i++) {
      var ck = cards[i].getAttribute("data-player-panel-handle-key");
      if (ck && PH[ck] === target) return cards[i];
      var span = cards[i].querySelector(".tv-dashboard__friends-focus-handle-name span");
      if (span && span.textContent.trim() === target) return cards[i];
    }
    return findFriendsFocusCardByDisplayName(target);
  }

  function isPrototypeCurrentlyPlaying(handleKey, sourceElement) {
    var c = findFriendsFocusCardForPlayingLookup(handleKey, sourceElement);
    if (!c) return false;
    return !!c.querySelector(".tv-dashboard__friends-focus-player-playing-row");
  }

  /**
   * Friend profile fields for mobile notification cards — same Friends-strip source as populatePanel.
   * @param {{ sourceElement?: HTMLElement, handleKey?: string }} opts
   */
  function resolvePrototypeFriendProfile(opts) {
    opts = opts || {};
    var tvRow = opts.sourceElement;
    var handleKey =
      opts.handleKey || (tvRow && tvRow.getAttribute("data-player-panel-handle-key"));
    var displayName =
      opts.displayName || deriveFriendDisplayNameFromRow(tvRow, handleKey);
    var friendsCard = findFriendsFocusCardForPlayingLookup(handleKey, tvRow);
    if (!friendsCard && displayName) {
      friendsCard = findFriendsFocusCardByDisplayName(displayName);
    }

    var inviteItem =
      findInviteListItemForHandleKey(handleKey) ||
      (displayName ? findInviteListItemByDisplayName(displayName) : null);

    var online = false;
    var presenceLabel = "Offline";
    var presenceDotSrc = ICON_OFFLINE;
    var playingGame = "";
    var avatarSrc = "";
    var resolved = false;

    if (friendsCard) {
      presenceDotSrc = findPresenceDot(friendsCard);
      presenceLabel = findPresenceLabel(friendsCard);
      online =
        friendsCard.classList.contains("tv-dashboard__friends-focus-player-card--online") ||
        (!friendsCard.classList.contains("tv-dashboard__friends-focus-player-card--offline") &&
          !/offline/i.test(presenceLabel));
      if (isPrototypeCurrentlyPlaying(handleKey, tvRow)) {
        playingGame = findGameTitle(friendsCard);
      }
      var cardAv = friendsCard.querySelector(".tv-dashboard__friends-focus-player-avatar-img");
      if (cardAv && cardAv.getAttribute("src")) avatarSrc = cardAv.getAttribute("src");
      resolved = true;
    }

    var invitePresence = inviteItem
      ? readPresenceFromStatusEl(inviteItem.querySelector(".game-invite-list__status"))
      : null;
    if (invitePresence) {
      online = invitePresence.online;
      presenceLabel = invitePresence.presenceLabel;
      presenceDotSrc = invitePresence.presenceDotSrc;
      if (!playingGame && invitePresence.playingGame) {
        playingGame = invitePresence.playingGame;
      }
      if (!avatarSrc) {
        var invAv = inviteItem.querySelector(".game-invite-list__avatar img");
        if (invAv && invAv.getAttribute("src")) avatarSrc = invAv.getAttribute("src");
      }
      resolved = true;
    } else if (!resolved && tvRow) {
      var rowStatus = tvRow.querySelector(".game-invite-list__status");
      var rowPresence = readPresenceFromStatusEl(rowStatus);
      if (rowPresence) {
        online = rowPresence.online;
        presenceLabel = rowPresence.presenceLabel;
        presenceDotSrc = rowPresence.presenceDotSrc;
        if (!playingGame && rowPresence.playingGame) {
          playingGame = rowPresence.playingGame;
        }
        resolved = true;
      } else if (tvRow.getAttribute("data-friend-online") === "true") {
        online = true;
        presenceLabel = "Online";
        presenceDotSrc = ICON_ONLINE;
        resolved = true;
      } else if (tvRow.getAttribute("data-friend-online") === "false") {
        online = false;
        presenceLabel = "Offline";
        presenceDotSrc = ICON_OFFLINE;
        resolved = true;
      }

      var rowAv = tvRow.querySelector(".game-invite-list__avatar img");
      if (rowAv && rowAv.getAttribute("src")) avatarSrc = rowAv.getAttribute("src");
      if (!avatarSrc) {
        var lobbyAv = tvRow.querySelector(".tv-gameplay-interactive__avatar img");
        if (lobbyAv && lobbyAv.getAttribute("src")) avatarSrc = lobbyAv.getAttribute("src");
      }

      if (!playingGame) {
        var attrGame = tvRow.getAttribute("data-friend-playing-game");
        if (attrGame) playingGame = attrGame.replace(/\s+/g, " ").trim();
      }
    }

    if (!resolved) {
      online = false;
      presenceLabel = "Offline";
      presenceDotSrc = ICON_OFFLINE;
    } else if (typeof window.PrototypePresence !== "undefined" && friendsCard) {
      var cardPresence = window.PrototypePresence.readPresenceFromFriendsCard(friendsCard);
      online = cardPresence.state !== window.PrototypePresence.STATE_OFFLINE;
      presenceLabel = window.PrototypePresence.formatOnlinePlayerStatus(cardPresence, {
        suppressGameTitle:
          typeof window.PrototypePresence !== "undefined" &&
          typeof window.PrototypePresence.friendsFocusMetaVisible === "function"
            ? window.PrototypePresence.friendsFocusMetaVisible(friendsCard)
            : !!(function () {
                var meta = friendsCard.querySelector(".tv-dashboard__friends-focus-player-meta");
                return meta && !meta.hidden;
              })(),
      });
      if (!playingGame && cardPresence.gameTitle) playingGame = cardPresence.gameTitle;
    } else {
      presenceLabel = online ? "Online" : "Offline";
      if (online && presenceDotSrc === ICON_OFFLINE) presenceDotSrc = ICON_ONLINE;
      if (!online && presenceDotSrc === ICON_ONLINE) presenceDotSrc = ICON_OFFLINE;
    }

    return {
      friendsCard: friendsCard,
      handleKey: handleKey,
      online: online,
      presenceState:
        typeof window.PrototypePresence !== "undefined" && friendsCard
          ? window.PrototypePresence.readPresenceFromFriendsCard(friendsCard).state
          : online
            ? "online"
            : "offline",
      presenceLabel: presenceLabel,
      presenceDotSrc: presenceDotSrc,
      playingGame: playingGame,
      avatarSrc: avatarSrc,
      achievementSummary: "112 achievements",
    };
  }

  function applyPlayingCardVisibility(opts) {
    var root = getPanelRoot();
    if (!root) return;
    var st = root.getAttribute("data-state") || opts.state || "";
    var playing =
      !!(opts && opts.forceCurrentlyPlaying) ||
      (st === "current-friend" &&
        isPrototypeCurrentlyPlaying(opts.handleKey, opts.sourceElement));
    root.setAttribute("data-currently-playing", playing ? "true" : "false");
  }

  function applyPanelDataset(state, gameInvite) {
    var root = getPanelRoot();
    if (!root) return;
    root.setAttribute("data-state", state);
    root.setAttribute("data-game-invite", gameInvite ? "true" : "false");
  }

  function populatePanel(opts) {
    var root = getPanelRoot();
    if (!root) return;
    var friendsCard = findFriendsFocusCardForPlayingLookup(opts.handleKey, opts.sourceElement);
    var handle = opts.displayName || readHandleFromPrototype(opts.handleKey);
    var avatar = opts.avatarSrc || findAvatarSrc(opts.sourceElement, opts.handleKey);
    var gameTitle =
      opts.gameTitle ||
      findGameTitle(opts.sourceElement) ||
      findGameTitle(friendsCard) ||
      "Centipede: Recharged";
    var playingArt = opts.playingArtSrc || DEFAULT_PLAYING_ART;

    var hEl = $("#tvPlayerPanelHandle");
    if (hEl) hEl.textContent = handle;

    var av = $("#tvPlayerPanelAvatar");
    if (av) {
      av.src = avatar;
      av.alt = "";
    }

    if (typeof window.tvDashboardSyncPlayerPanelPlateGlowFromAvatar === "function") {
      window.tvDashboardSyncPlayerPanelPlateGlowFromAvatar();
    }

    var pt = $("#tvPlayerPanelPlayingTitle");
    if (pt) pt.textContent = gameTitle;

    var pb = $("#tvPlayerPanelPlayingBg");
    if (pb) {
      pb.src = playingArt;
      pb.alt = "";
    }

    var hasPlayingField =
      !!(opts && opts.forceCurrentlyPlaying) ||
      ((root.getAttribute("data-state") || opts.state || "") === "current-friend" &&
        isPrototypeCurrentlyPlaying(opts.handleKey, opts.sourceElement));
    root.setAttribute("data-currently-playing", hasPlayingField ? "true" : "false");

    var dotSrc = opts.presenceDotSrc || findPresenceDot(opts.sourceElement);
    var pr = $("#tvPlayerPanelPresenceDot");
    if (pr) pr.hidden = true;
    var pl = $("#tvPlayerPanelPresenceLabel");
    var presenceState = opts.presenceState;
    var presenceLabel = opts.presenceLabel || findPresenceLabel(opts.sourceElement);
    if (!presenceState && friendsCard && typeof window.PrototypePresence !== "undefined") {
      var cardPresence = window.PrototypePresence.readPresenceFromFriendsCard(friendsCard);
      presenceState = cardPresence.state;
      presenceLabel = window.PrototypePresence.formatOnlinePlayerStatus(cardPresence, {
        suppressGameTitle:
          typeof window.PrototypePresence !== "undefined" &&
          typeof window.PrototypePresence.friendsFocusMetaVisible === "function"
            ? window.PrototypePresence.friendsFocusMetaVisible(friendsCard)
            : !!(function () {
                var meta = friendsCard.querySelector(".tv-dashboard__friends-focus-player-meta");
                return meta && !meta.hidden;
              })(),
      });
    }
    if (!presenceState && opts.sourceElement) {
      var invStatus = opts.sourceElement.querySelector(".game-invite-list__status");
      if (invStatus && typeof window.PrototypePresence !== "undefined") {
        var invPresence = window.PrototypePresence.readPresenceFromInviteStatus(invStatus);
        presenceState = invPresence.state;
        presenceLabel = window.PrototypePresence.formatOnlinePlayerStatus(invPresence);
      }
    }
    if (!presenceState) {
      var offline =
        typeof dotSrc === "string" && dotSrc.toLowerCase().indexOf("offline") !== -1;
      presenceState = offline ? "offline" : "online";
      if (!presenceLabel) presenceLabel = offline ? "Offline" : "Online";
    }
    if (typeof window.PrototypePresence !== "undefined") {
      window.PrototypePresence.syncPlayerPanelPresence({
        state: presenceState,
        label: presenceLabel,
        gameTitle: gameTitle,
        hasPlayingField: hasPlayingField,
      });
    } else if (pl) {
      pl.textContent = presenceLabel;
    }
    var offlinePanel =
      presenceState === "offline" ||
      (typeof dotSrc === "string" && dotSrc.toLowerCase().indexOf("offline") !== -1);
    root.setAttribute("data-presence-online", offlinePanel ? "false" : "true");
    if (presenceState) root.setAttribute("data-presence-state", presenceState);

    var ach = $("#tvPlayerPanelAchievements");
    if (ach) {
      ach.textContent = opts.achievementSummary || "112 achievements";
    }

    var accountNote = document.querySelector(".player-panel__account-note");
    if (accountNote) {
      var st = root.getAttribute("data-state") || "";
      var showAccountNoteState =
        st === "incoming-request" || st === "outgoing-request" || st === "more-options-focus";
      var showSameAccountNote =
        showAccountNoteState &&
        typeof window.friendRequestShowsSameAccountNote === "function" &&
        window.friendRequestShowsSameAccountNote(handle);
      accountNote.hidden = !showSameAccountNote;
    }

    var moreImg = $(".player-panel__header-more-icon");
    if (moreImg) moreImg.src = ICON_MORE;

    applyPlayingCardVisibility(opts);
    resetIncomingRequestOutcomeUI();
  }

  var incomingFriendTimers = { load: null, fadeFallback: null };
  var incomingFadeListener = null;

  function clearIncomingFriendTimers() {
    if (incomingFriendTimers.load) {
      window.clearTimeout(incomingFriendTimers.load);
      incomingFriendTimers.load = null;
    }
    if (incomingFriendTimers.fadeFallback) {
      window.clearTimeout(incomingFriendTimers.fadeFallback);
      incomingFriendTimers.fadeFallback = null;
    }
  }

  /** Stop timers / transition listeners without restoring Accept/Decline (avoids buttons fading back in after done). */
  function stopIncomingFriendRequestTimersAndListeners() {
    clearIncomingFriendTimers();
    var E = getIncomingFriendRequestEls();
    if (E.actions && incomingFadeListener) {
      E.actions.removeEventListener("transitionend", incomingFadeListener);
      incomingFadeListener = null;
    }
  }

  function getIncomingFriendRequestEls() {
    return {
      root: getPanelRoot(),
      actions: document.getElementById("tvPlayerPanelIncomingActions"),
      accept: document.getElementById("tvPlayerPanelAccept"),
      decline: document.getElementById("tvPlayerPanelDecline"),
      confA: document.getElementById("tvPlayerPanelIncomingConfirmAccept"),
      confD: document.getElementById("tvPlayerPanelIncomingConfirmDecline"),
    };
  }

  function readPlayerPanelProfileSnapshot() {
    var hEl = document.getElementById("tvPlayerPanelHandle");
    var aEl = document.getElementById("tvPlayerPanelAvatar");
    var handle = hEl && hEl.textContent ? hEl.textContent.replace(/\s+/g, " ").trim() : "";
    var avatar = aEl ? aEl.getAttribute("src") || "" : "";
    return { handle: handle || "Friend", avatar: avatar };
  }

  /** After accepting an incoming friend request, mirror the player onto the Friends strip + invite list. */
  function appendAcceptedFriendFromProfile(profile) {
    var p = profile || { handle: "Friend", avatar: "" };
    var sid = "accepted-" + Date.now();

    var cardsWrap = document.querySelector(".tv-dashboard__friends-focus-player-cards");
    var friendTpl = document.querySelector(
      '.tv-dashboard__friends-focus-player-card[data-player-panel-handle-key="list-0"]'
    );
    if (cardsWrap && friendTpl) {
      var card = friendTpl.cloneNode(true);
      card.setAttribute("data-player-panel-handle-key", sid);
      card.setAttribute("data-player-panel-state", "current-friend");
      card.setAttribute("data-player-panel-game-invite", "false");
      card.setAttribute("data-player-panel-entry", "dashboard");
      var metaRm = card.querySelector(".tv-dashboard__friends-focus-player-meta");
      if (metaRm) metaRm.remove();
      var nameSpan = card.querySelector(".tv-dashboard__friends-focus-handle-name span");
      if (nameSpan) {
        nameSpan.removeAttribute("data-prototype-player-handle");
        nameSpan.textContent = p.handle;
      }
      var av = card.querySelector(".tv-dashboard__friends-focus-player-avatar-img");
      if (av && p.avatar) av.setAttribute("src", p.avatar);
      cardsWrap.appendChild(card);
    }

    var shell = document.getElementById("tvDashboardInviteShell");
    var track = shell && shell.querySelector(".game-invite-list__list-track");
    var invTpl =
      track && track.querySelector('.game-invite-list__item[data-player-panel-handle-key="list-0"]');
    if (track && invTpl) {
      var row = invTpl.cloneNode(true);
      row.classList.remove(
        "game-invite-list__item--state-button-focus",
        "game-invite-list__item--state-off-service-focused"
      );
      row.setAttribute("data-player-panel-handle-key", sid);
      row.setAttribute("data-player-panel-state", "outgoing-request");
      row.setAttribute("data-player-panel-game-invite", "false");
      row.setAttribute("data-player-panel-entry", "external");
      var nameSpan2 = row.querySelector(".game-invite-list__name span");
      if (nameSpan2) {
        nameSpan2.removeAttribute("data-prototype-player-handle");
        nameSpan2.textContent = p.handle;
      }
      var av2 = row.querySelector(".game-invite-list__avatar img");
      if (av2 && p.avatar) av2.setAttribute("src", p.avatar);
      var invBtn = row.querySelector(".game-invite-list__invite-btn");
      if (invBtn) {
        invBtn.classList.remove(
          "game-invite-list__invite-btn--loading",
          "game-invite-list__invite-btn--invited"
        );
      }
      track.appendChild(row);
    }

    window.requestAnimationFrame(function () {
      if (typeof window.syncTvInvitePanelLayout === "function") {
        window.syncTvInvitePanelLayout();
      }
      if (typeof window.syncTvFriendsFocusStripLayout === "function") {
        window.syncTvFriendsFocusStripLayout();
      }
      if (typeof window.syncMobileDashboardFriendsList === "function") {
        window.syncMobileDashboardFriendsList();
      }
      if (typeof window.PrototypePresence !== "undefined") {
        window.PrototypePresence.syncInviteListItem(row);
        window.PrototypePresence.syncFriendsFocusCard(
          document.querySelector(
            '.tv-dashboard__friends-focus-player-card[data-player-panel-handle-key="' + sid + '"]'
          )
        );
      }
    });

    var PH = window.PROTOTYPE_PLAYER_HANDLES;
    if (PH && typeof PH === "object") {
      PH[sid] = p.handle;
    }
    var AV = window.PROTOTYPE_PLAYER_AVATARS;
    if (AV && typeof AV === "object" && p.avatar) {
      AV[sid] = p.avatar;
    }
    return sid;
  }

  function appendAcceptedFriendToDashboard() {
    return appendAcceptedFriendFromProfile(readPlayerPanelProfileSnapshot());
  }

  function resetIncomingRequestOutcomeUI() {
    stopIncomingFriendRequestTimersAndListeners();
    var E = getIncomingFriendRequestEls();
    if (!E.root) return;
    E.root.removeAttribute("data-incoming-outcome");
    if (E.accept) {
      E.accept.classList.remove("player-panel__btn--loading");
      E.accept.removeAttribute("aria-busy");
      E.accept.disabled = false;
    }
    if (E.decline) {
      E.decline.classList.remove("player-panel__btn--loading");
      E.decline.removeAttribute("aria-busy");
      E.decline.disabled = false;
    }
    if (E.actions) {
      E.actions.removeAttribute("hidden");
      E.actions.classList.remove(
        "player-panel__incoming-actions--out",
        "player-panel__incoming-actions--finished"
      );
    }
    if (E.confA) {
      E.confA.hidden = true;
      E.confA.classList.remove("player-panel__incoming-confirmation--in");
    }
    if (E.confD) {
      E.confD.hidden = true;
      E.confD.classList.remove("player-panel__incoming-confirmation--in");
    }
  }

  function startIncomingFriendRequestOutcome(which) {
    var E = getIncomingFriendRequestEls();
    if (!E.root || E.root.getAttribute("data-state") !== "incoming-request") return;
    var phase = E.root.getAttribute("data-incoming-outcome");
    if (phase === "loading" || phase === "done") return;
    if (!E.accept || !E.decline || !E.actions) return;

    E.root.setAttribute("data-incoming-outcome", "loading");
    /* Active choice stays enabled for focus + spinner; peer must not activate. */
    E.accept.disabled = which !== "accept";
    E.decline.disabled = which !== "decline";
    if (which === "accept") {
      E.accept.classList.add("player-panel__btn--loading");
      E.accept.setAttribute("aria-busy", "true");
    } else {
      E.decline.classList.add("player-panel__btn--loading");
      E.decline.setAttribute("aria-busy", "true");
    }

    clearIncomingFriendTimers();
    incomingFriendTimers.load = window.setTimeout(function () {
      incomingFriendTimers.load = null;
      finishIncomingFriendRequestAfterLoading(which);
    }, 1000);
    resetPlayerPanelFocus();
  }

  function finishIncomingFriendRequestAfterLoading(which) {
    var E = getIncomingFriendRequestEls();
    if (!E.actions || !E.root || E.root.getAttribute("data-state") !== "incoming-request") return;

    var fadeSettled = false;
    function afterActionsFade() {
      if (fadeSettled) return;
      fadeSettled = true;
      if (E.actions && incomingFadeListener) {
        E.actions.removeEventListener("transitionend", incomingFadeListener);
        incomingFadeListener = null;
      }
      if (incomingFriendTimers.fadeFallback) {
        window.clearTimeout(incomingFriendTimers.fadeFallback);
        incomingFriendTimers.fadeFallback = null;
      }
      E.actions.setAttribute("hidden", "");
      E.actions.classList.add("player-panel__incoming-actions--finished");
      if (E.accept) {
        E.accept.classList.remove("player-panel__btn--loading");
        E.accept.removeAttribute("aria-busy");
        E.accept.disabled = false;
      }
      if (E.decline) {
        E.decline.classList.remove("player-panel__btn--loading");
        E.decline.removeAttribute("aria-busy");
        E.decline.disabled = false;
      }

      var conf = which === "accept" ? E.confA : E.confD;
      var other = which === "accept" ? E.confD : E.confA;
      if (other) {
        other.hidden = true;
        other.classList.remove("player-panel__incoming-confirmation--in");
      }
      if (conf) {
        conf.hidden = false;
        conf.classList.remove("player-panel__incoming-confirmation--in");
        void conf.offsetWidth;
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            conf.classList.add("player-panel__incoming-confirmation--in");
          });
        });
      }
      E.root.setAttribute("data-incoming-outcome", "done");
      var outcomeHandle = readPlayerPanelProfileSnapshot().handle;
      if (which === "accept") {
        var acceptedKey = appendAcceptedFriendToDashboard();
        applyFriendRequestAcceptedToNotificationRow(outcomeHandle, acceptedKey);
      } else if (which === "decline") {
        removeFriendRequestNotificationRowForDecline(outcomeHandle);
      }
      resetPlayerPanelFocus();
    }

    if (E.accept) E.accept.disabled = true;
    if (E.decline) E.decline.disabled = true;
    E.actions.classList.add("player-panel__incoming-actions--out");

    var reduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      incomingFriendTimers.fadeFallback = window.setTimeout(function () {
        incomingFriendTimers.fadeFallback = null;
        afterActionsFade();
      }, 40);
      return;
    }

    incomingFadeListener = function (ev) {
      if (ev.target !== E.actions) return;
      if (ev.propertyName !== "opacity") return;
      if (incomingFriendTimers.fadeFallback) {
        window.clearTimeout(incomingFriendTimers.fadeFallback);
        incomingFriendTimers.fadeFallback = null;
      }
      afterActionsFade();
    };
    E.actions.addEventListener("transitionend", incomingFadeListener);
    incomingFriendTimers.fadeFallback = window.setTimeout(function () {
      incomingFriendTimers.fadeFallback = null;
      if (E.actions && incomingFadeListener) {
        E.actions.removeEventListener("transitionend", incomingFadeListener);
        incomingFadeListener = null;
      }
      afterActionsFade();
    }, 420);
  }

  function inferCloseStackFromContext(dashboardContext) {
    if (dashboardContext === "invite" || dashboardContext === "game-invite") {
      return "back";
    }
    return "close";
  }

  /**
   * @param {object} opts
   * @param {string} [opts.closeStack] - 'back' | 'close'; default from dashboard context (invite / game-invite → back)
   */
  function resolveCloseStack(opts, app) {
    var cs = opts.closeStack;
    if (cs === "back" || cs === "close") return cs;
    return inferCloseStackFromContext(app.getAttribute("data-dashboard-context"));
  }

  function applyPlayerPanelCloseChrome(closeStack) {
    var app = getApp();
    var btn = document.getElementById("tvPlayerPanelClose");
    if (!app || !btn) return;
    if (closeStack === "back") {
      app.setAttribute("data-player-panel-close-mode", "back");
      btn.setAttribute("aria-label", "Back");
    } else {
      app.removeAttribute("data-player-panel-close-mode");
      btn.setAttribute("aria-label", "Close");
    }
  }

  function clearPlayerPanelCloseChrome() {
    var app = getApp();
    var btn = document.getElementById("tvPlayerPanelClose");
    if (app) app.removeAttribute("data-player-panel-close-mode");
    if (btn) btn.setAttribute("aria-label", "Close");
  }

  function isPlayerPanelHeaderFocusEl(el) {
    return !!(el && el.closest && el.closest(".player-panel__header"));
  }

  /** Incoming-request column + actions sit under `.player-panel__body`; notifications/friends entrance fades `.player-panel` opacity. */
  function useRelaxedOpacityForPlayerPanelFocus(el) {
    if (isPlayerPanelHeaderFocusEl(el)) return true;
    var root = getPanelRoot();
    if (!root || root.getAttribute("data-state") !== "incoming-request") return false;
    if (!el || !el.closest) return false;
    return !!el.closest(".player-panel__show-incoming");
  }

  function isElVisibleForFocus(el) {
    if (!el || el.disabled) return false;
    if (typeof el.checkVisibility === "function") {
      var strict = el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      if (strict) return true;
      /* Entrance animation opacity-fades `.player-panel`; strict opacity rejects header chrome for ~1 frame. */
      if (useRelaxedOpacityForPlayerPanelFocus(el)) {
        return el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
      }
      return false;
    }
    var st = window.getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden" || Number(st.opacity) === 0) {
      return false;
    }
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function stripPlayerPanelFocusRing() {
    var shell = getShell();
    if (!shell) return;
    var marked = shell.querySelectorAll(".game-invite-tv__focusable--current");
    for (var i = 0; i < marked.length; i++) {
      marked[i].classList.remove("game-invite-tv__focusable--current");
    }
  }

  function collectPlayerPanelFocusables() {
    var shell = getShell();
    var root = getPanelRoot();
    if (!shell || !root) return [];
    var list = [];
    var closeBtn = $("#tvPlayerPanelClose", shell);
    if (closeBtn && isElVisibleForFocus(closeBtn)) list.push(closeBtn);
    var moreWrap = $(".player-panel__header-more-wrap", shell);
    var moreBtn = $("#tvPlayerPanelMore", shell);
    if (moreBtn && moreWrap && isElVisibleForFocus(moreWrap) && isElVisibleForFocus(moreBtn)) {
      list.push(moreBtn);
    }
    /* Only buttons in a visible main column — avoids hidden state strips still matching querySelectorAll(".player-panel__main button"). */
    var inners = root.querySelectorAll(".player-panel__main-inner");
    for (var j = 0; j < inners.length; j++) {
      var inner = inners[j];
      if (!isElVisibleForFocus(inner)) continue;
      var btns = inner.querySelectorAll("button");
      for (var k = 0; k < btns.length; k++) {
        if (isElVisibleForFocus(btns[k])) list.push(btns[k]);
      }
    }
    appendIncomingFriendRequestFocusables(list);
    return list;
  }

  function incomingFriendRequestActionsAreFocusable() {
    var root = getPanelRoot();
    if (!root || root.getAttribute("data-state") !== "incoming-request") return false;
    var phase = root.getAttribute("data-incoming-outcome");
    if (phase === "done") return false;
    var actions = document.getElementById("tvPlayerPanelIncomingActions");
    if (!actions || actions.hasAttribute("hidden")) return false;
    if (actions.classList.contains("player-panel__incoming-actions--finished")) return false;
    return true;
  }

  /**
   * Visibility checks still occasionally drop Accept/Decline during panel entrance / opacity;
   * always chain them when the incoming-actions UI is active so vertical navigation can reach Decline.
   */
  function appendIncomingFriendRequestFocusables(list) {
    if (!incomingFriendRequestActionsAreFocusable()) return;
    var root = getPanelRoot();
    var phase = root.getAttribute("data-incoming-outcome");
    var acc = document.getElementById("tvPlayerPanelAccept");
    var dec = document.getElementById("tvPlayerPanelDecline");
    var toAdd = [];
    if (!phase || phase === "") {
      if (acc && !acc.disabled) toAdd.push(acc);
      if (dec && !dec.disabled) toAdd.push(dec);
    } else if (phase === "loading") {
      var lb =
        acc && acc.classList.contains("player-panel__btn--loading") && !acc.disabled
          ? acc
          : dec && dec.classList.contains("player-panel__btn--loading") && !dec.disabled
            ? dec
            : null;
      if (lb) toAdd.push(lb);
    }
    for (var i = 0; i < toAdd.length; i++) {
      if (list.indexOf(toAdd[i]) < 0) list.push(toAdd[i]);
    }
  }

  function playerPanelHasVisibleMainAction() {
    var root = getPanelRoot();
    if (!root) return false;
    var inners = root.querySelectorAll(".player-panel__main-inner");
    for (var j = 0; j < inners.length; j++) {
      var inner = inners[j];
      if (!isElVisibleForFocus(inner)) continue;
      var btns = inner.querySelectorAll("button");
      for (var k = 0; k < btns.length; k++) {
        if (isElVisibleForFocus(btns[k])) return true;
      }
    }
    return false;
  }

  function paintPlayerPanelFocus() {
    stripPlayerPanelFocusRing();
    if (!ppFocusList.length) return;
    if (ppFocusIx < 0) ppFocusIx = 0;
    if (ppFocusIx >= ppFocusList.length) ppFocusIx = ppFocusList.length - 1;
    var node = ppFocusList[ppFocusIx];
    node.classList.add("game-invite-tv__focusable--current");
    if (node && typeof node.focus === "function") {
      try {
        node.focus({ preventScroll: true });
      } catch (eFocus) {}
    }
  }

  /** After rebuilding the focus list, realign index with the ring or activeElement (avoids stale ix when chrome toggles). */
  function syncPlayerPanelFocusIxFromDom() {
    if (!ppFocusList.length) return;
    var shell = getShell();
    var marked = shell && shell.querySelector(".game-invite-tv__focusable--current");
    var el =
      marked && ppFocusList.indexOf(marked) >= 0 ? marked : document.activeElement;
    var ix = el ? ppFocusList.indexOf(el) : -1;
    if (ix >= 0) ppFocusIx = ix;
  }

  function refreshPlayerPanelFocusList() {
    ppFocusList = collectPlayerPanelFocusables();
    if (ppFocusIx >= ppFocusList.length) {
      ppFocusIx = Math.max(0, ppFocusList.length - 1);
    }
  }

  function resetPlayerPanelFocus() {
    ppFocusIx = 0;
    refreshPlayerPanelFocusList();
    var shell = getShell();
    var root = getPanelRoot();
    var closeBtn = shell && $("#tvPlayerPanelClose", shell);
    var st = root ? root.getAttribute("data-state") : "";
    var incomingPhase = root ? root.getAttribute("data-incoming-outcome") : null;

    if (st === "incoming-request") {
      var acceptBtn = document.getElementById("tvPlayerPanelAccept");
      var declineBtn = document.getElementById("tvPlayerPanelDecline");
      if (!incomingPhase) {
        var aix = acceptBtn ? ppFocusList.indexOf(acceptBtn) : -1;
        if (aix >= 0) ppFocusIx = aix;
      } else if (incomingPhase === "loading") {
        var loadingEl =
          acceptBtn && acceptBtn.classList.contains("player-panel__btn--loading")
            ? acceptBtn
            : declineBtn && declineBtn.classList.contains("player-panel__btn--loading")
              ? declineBtn
              : null;
        var lix = loadingEl ? ppFocusList.indexOf(loadingEl) : -1;
        if (lix >= 0) ppFocusIx = lix;
      } else if (incomingPhase === "done") {
        var dc = closeBtn ? ppFocusList.indexOf(closeBtn) : -1;
        if (dc >= 0) ppFocusIx = dc;
      }
    } else {
      var hasMain = playerPanelHasVisibleMainAction();
      if (!hasMain && closeBtn) {
        var ci = ppFocusList.indexOf(closeBtn);
        if (ci >= 0) ppFocusIx = ci;
      }
    }
    paintPlayerPanelFocus();
  }

  function playerPanelNavigateHorizontal(delta) {
    refreshPlayerPanelFocusList();
    syncPlayerPanelFocusIxFromDom();
    if (!ppFocusList.length || !delta) return;
    var shell = getShell();
    var closeBtn = $("#tvPlayerPanelClose", shell);
    var moreBtn = $("#tvPlayerPanelMore", shell);
    var moreWrap = $(".player-panel__header-more-wrap", shell);
    var moreVisible =
      moreBtn &&
      moreWrap &&
      isElVisibleForFocus(moreWrap) &&
      isElVisibleForFocus(moreBtn);
    if (!moreVisible) return;
    var cur = ppFocusList[ppFocusIx];
    if (delta > 0 && cur === closeBtn) {
      var mi = ppFocusList.indexOf(moreBtn);
      if (mi >= 0) ppFocusIx = mi;
    } else if (delta < 0 && cur === moreBtn) {
      var ci = ppFocusList.indexOf(closeBtn);
      if (ci >= 0) ppFocusIx = ci;
    }
    paintPlayerPanelFocus();
  }

  function playerPanelNavigateVertical(delta) {
    refreshPlayerPanelFocusList();
    syncPlayerPanelFocusIxFromDom();
    var list = ppFocusList;
    if (!list.length || !delta) return;
    var shell = getShell();
    var root = getPanelRoot();
    var closeBtn = $("#tvPlayerPanelClose", shell);
    var moreBtn = $("#tvPlayerPanelMore", shell);
    var moreWrap = $(".player-panel__header-more-wrap", shell);
    var moreVisible =
      moreBtn &&
      moreWrap &&
      isElVisibleForFocus(moreWrap) &&
      isElVisibleForFocus(moreBtn);
    var firstMainIx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i] !== closeBtn && list[i] !== moreBtn) {
        firstMainIx = i;
        break;
      }
    }
    var moreIx = moreVisible ? list.indexOf(moreBtn) : -1;
    var closeIx = list.indexOf(closeBtn);
    var ix = ppFocusIx;
    if (ix < 0 || ix >= list.length) {
      ppFocusIx = Math.max(0, Math.min(ppFocusIx, list.length - 1));
      ix = ppFocusIx;
    }
    var cur = list[ix];
    var acceptBtn = document.getElementById("tvPlayerPanelAccept");
    var incomingPhase = root ? root.getAttribute("data-incoming-outcome") : null;
    if (
      root &&
      root.getAttribute("data-state") === "incoming-request" &&
      incomingPhase !== "done" &&
      acceptBtn &&
      cur === acceptBtn &&
      delta < 0 &&
      closeIx >= 0
    ) {
      ppFocusIx = closeIx;
      paintPlayerPanelFocus();
      return;
    }

    if (delta > 0) {
      if (cur === closeBtn) {
        ppFocusIx = firstMainIx >= 0 ? firstMainIx : ix;
      } else if (moreVisible && cur === moreBtn) {
        ppFocusIx = firstMainIx >= 0 ? firstMainIx : ix;
      } else if (firstMainIx >= 0 && ix >= firstMainIx && ix < list.length - 1) {
        ppFocusIx = ix + 1;
      }
    } else {
      if (cur === closeBtn) {
        /* stay */
      } else if (moreVisible && cur === moreBtn) {
        if (closeIx >= 0) ppFocusIx = closeIx;
      } else if (firstMainIx >= 0 && ix > firstMainIx) {
        ppFocusIx = ix - 1;
      } else if (firstMainIx >= 0 && ix === firstMainIx) {
        ppFocusIx = moreIx >= 0 ? moreIx : closeIx >= 0 ? closeIx : ix;
      }
    }
    if (ppFocusIx < 0) ppFocusIx = 0;
    if (ppFocusIx >= list.length) ppFocusIx = list.length - 1;
    paintPlayerPanelFocus();
  }

  function playerPanelApplyPrimaryAction() {
    refreshPlayerPanelFocusList();
    syncPlayerPanelFocusIxFromDom();
    if (!ppFocusList.length) return;
    var el = ppFocusList[ppFocusIx];
    if (el && typeof el.click === "function") el.click();
  }

  window.playerPanelNavigateVertical = playerPanelNavigateVertical;
  window.playerPanelNavigateHorizontal = playerPanelNavigateHorizontal;
  window.playerPanelApplyPrimaryAction = playerPanelApplyPrimaryAction;
  window.resetPlayerPanelFocus = resetPlayerPanelFocus;

  /**
   * @param {object} opts
   * @param {'dashboard'|'external'} opts.entrypoint
   * @param {string} opts.handleKey - PROTOTYPE_PLAYER_HANDLES role e.g. list-0, inviter, lobby-p2
   * @param {string} [opts.state] - incoming-request | outgoing-request | current-friend | blocked | more-options-focus
   * @param {boolean} [opts.gameInvite]
   * @param {HTMLElement} [opts.sourceElement] - clicked row/card for avatar/game scraping
   * @param {HTMLElement} [opts.notificationRow] - notifications track row for incoming friend requests (accept/decline)
   * @param {'back'|'close'} [opts.closeStack]
   * @param {boolean} [opts.forceCurrentlyPlaying] — show “Currently playing” card without a Friends-strip row (e.g. game-invite inviter).
   * @param {boolean} [opts.fromFriendToastN] — opened via N from in-game friend-request toast; closing the panel closes the dashboard.
   */
  function openTvPlayerPanel(opts) {
    opts = opts || {};
    if (opts.handleKey) {
      opts.handleKey = normalizeLobbyProfileHandleKey(opts.handleKey, opts.sourceElement);
    }
    if (typeof window.applyPrototypeGameHandle === "function") {
      window.applyPrototypeGameHandle();
    }
    var app = getApp();
    var shell = getShell();
    if (!app || !shell) return;

    var fromFriendsRow =
      opts.fromFriendsRow === true ||
      (opts.sourceElement &&
        opts.sourceElement.classList &&
        opts.sourceElement.classList.contains("tv-dashboard__friends-focus-player-card"));

    var fromLobbyRow =
      opts.fromLobbyRow === true ||
      (opts.sourceElement &&
        opts.sourceElement.closest &&
        opts.sourceElement.closest(".tv-gameplay-interactive__row-btn"));
    var fromNotifications = opts.fromNotifications === true;

    if (
      typeof window.setTvDashboardOpen === "function" &&
      app.getAttribute("data-tv-dashboard") !== "open" &&
      fromLobbyRow
    ) {
      window.setTvDashboardOpen(true, tvDashboardOpenOptsForProfileTap());
    }

    var closeStack = resolveCloseStack(opts, app);
    if (fromFriendsRow) closeStack = "back";
    if (fromLobbyRow) closeStack = "close";

    var entry = opts.entrypoint === "external" ? "external" : "dashboard";
    if (entry === "external") {
      PP_PREV_CONTEXT = app.getAttribute("data-dashboard-context") || "";
      app.setAttribute("data-dashboard-context", "player-panel-external");
    } else {
      PP_PREV_CONTEXT = null;
    }

    var dash = document.getElementById("tvDashboard");
    var panelEl = getPanelRoot();

    if (fromLobbyRow) {
      PP_FROM_LOBBY_ROW = true;
      app.setAttribute("data-player-panel-from-lobby", "true");
    } else {
      PP_FROM_LOBBY_ROW = false;
      app.removeAttribute("data-player-panel-from-lobby");
    }

    if (fromNotifications) {
      PP_FROM_NOTIFICATIONS = true;
      app.setAttribute("data-player-panel-from-notifications", "true");
      syncNotificationsCardDrillForPlayerPanel(true);
    } else {
      PP_FROM_NOTIFICATIONS = false;
      app.removeAttribute("data-player-panel-from-notifications");
      if (panelEl) panelEl.classList.remove("player-panel--notifications-enter");
    }

    if (opts.fromFriendToastN === true) {
      PP_FROM_FRIEND_TOAST_N = true;
      app.setAttribute("data-player-panel-from-friend-toast-n", "true");
    } else {
      PP_FROM_FRIEND_TOAST_N = false;
      app.removeAttribute("data-player-panel-from-friend-toast-n");
    }

    PP_LINKED_FRIEND_REQUEST_NOTIFICATION_ROW = null;
    var incomingFriendReq = (opts.state || "") === "incoming-request" && !opts.gameInvite;
    if (incomingFriendReq) {
      if (opts.notificationRow && opts.notificationRow.parentNode) {
        PP_LINKED_FRIEND_REQUEST_NOTIFICATION_ROW = opts.notificationRow;
      } else if (opts.sourceElement && opts.sourceElement.closest) {
        var notifItem = opts.sourceElement.closest(".game-invite-list__item");
        if (notifItem && notifItem.getAttribute("data-notification-source") === "friend-request") {
          PP_LINKED_FRIEND_REQUEST_NOTIFICATION_ROW = notifItem;
        }
      }
    }

    if (fromFriendsRow) {
      PP_FROM_FRIENDS_ROW = true;
      app.setAttribute("data-player-panel-from-friends", "true");
      if (dash) {
        dash.classList.remove("tv-dashboard--friends-player-panel");
        void dash.offsetWidth;
        dash.classList.add("tv-dashboard--friends-player-panel");
      }
      if (typeof window.tvDashboardSuspendContentFocusForOverlay === "function") {
        window.tvDashboardSuspendContentFocusForOverlay();
      }
    } else {
      PP_FROM_FRIENDS_ROW = false;
      app.removeAttribute("data-player-panel-from-friends");
      if (dash) dash.classList.remove("tv-dashboard--friends-player-panel");
      if (panelEl) panelEl.classList.remove("player-panel--friends-enter");
    }

    applyPlayerPanelCloseChrome(closeStack);

    app.setAttribute("data-player-panel-open", "true");
    shell.setAttribute("aria-hidden", "false");

    if (typeof window.tvDashboardRefreshPrimaryNavChrome === "function") {
      window.tvDashboardRefreshPrimaryNavChrome();
    }

    var state = opts.state || "current-friend";
    var gameInvite = !!opts.gameInvite;
    applyPanelDataset(state, gameInvite);
    populatePanel(opts);

    if (typeof window.ensureTvDashboardGamepadLoop === "function") {
      window.ensureTvDashboardGamepadLoop();
    }

    if (fromFriendsRow && panelEl) {
      panelEl.classList.remove("player-panel--friends-enter");
      void panelEl.offsetWidth;
      requestAnimationFrame(function () {
        panelEl.classList.add("player-panel--friends-enter");
        requestAnimationFrame(function () {
          resetPlayerPanelFocus();
        });
      });
    } else if (fromNotifications && panelEl) {
      panelEl.classList.remove("player-panel--notifications-enter");
      void panelEl.offsetWidth;
      requestAnimationFrame(function () {
        panelEl.classList.add("player-panel--notifications-enter");
        function onNotificationsEnterAnimEnd(ev) {
          if (ev.target !== panelEl) return;
          panelEl.removeEventListener("animationend", onNotificationsEnterAnimEnd);
          resetPlayerPanelFocus();
        }
        panelEl.addEventListener("animationend", onNotificationsEnterAnimEnd);
        requestAnimationFrame(function () {
          resetPlayerPanelFocus();
        });
      });
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          resetPlayerPanelFocus();
        });
      });
    }
  }

  function closeTvPlayerPanel() {
    var app = getApp();
    var shell = getShell();
    if (!app || !shell) return;

    stopIncomingFriendRequestTimersAndListeners();
    PP_LINKED_FRIEND_REQUEST_NOTIFICATION_ROW = null;

    stripPlayerPanelFocusRing();
    ppFocusList = [];
    clearPlayerPanelCloseChrome();

    var panelRoot = getPanelRoot();
    if (panelRoot) {
      panelRoot.removeAttribute("data-currently-playing");
      panelRoot.removeAttribute("data-presence-online");
      panelRoot.style.removeProperty("--pp-plate-glow-r");
      panelRoot.style.removeProperty("--pp-plate-glow-g");
      panelRoot.style.removeProperty("--pp-plate-glow-b");
    }

    app.removeAttribute("data-player-panel-open");
    shell.setAttribute("aria-hidden", "true");

    if (PP_FROM_FRIENDS_ROW) {
      PP_FROM_FRIENDS_ROW = false;
      if (typeof window.tvDashboardRestoreContentFocusAfterPlayerPanel === "function") {
        window.tvDashboardRestoreContentFocusAfterPlayerPanel();
      }
    }
    if (PP_FROM_LOBBY_ROW) {
      PP_FROM_LOBBY_ROW = false;
      if (typeof window.setTvDashboardOpen === "function") {
        window.setTvDashboardOpen(false, { skipPanelClose: true });
      }
    }
    if (PP_FROM_NOTIFICATIONS) {
      PP_FROM_NOTIFICATIONS = false;
      syncNotificationsCardDrillForPlayerPanel(false);
    }
    app.removeAttribute("data-player-panel-from-notifications");
    app.removeAttribute("data-player-panel-from-lobby");
    app.removeAttribute("data-player-panel-from-friends");
    var dashClose = document.getElementById("tvDashboard");
    if (dashClose) dashClose.classList.remove("tv-dashboard--friends-player-panel");
    if (panelRoot) {
      panelRoot.classList.remove("player-panel--friends-enter");
      panelRoot.classList.remove("player-panel--notifications-enter");
    }

    if (PP_PREV_CONTEXT !== null) {
      if (PP_PREV_CONTEXT) {
        app.setAttribute("data-dashboard-context", PP_PREV_CONTEXT);
      } else {
        app.removeAttribute("data-dashboard-context");
      }
      PP_PREV_CONTEXT = null;
    }

    if (PP_FROM_FRIEND_TOAST_N) {
      PP_FROM_FRIEND_TOAST_N = false;
      app.removeAttribute("data-player-panel-from-friend-toast-n");
      if (typeof window.setTvDashboardOpen === "function") {
        window.setTvDashboardOpen(false, { skipPanelClose: true });
      }
    }

    if (typeof window.tvDashboardRefreshPrimaryNavChrome === "function") {
      window.tvDashboardRefreshPrimaryNavChrome();
    }
  }

  window.openTvPlayerPanel = openTvPlayerPanel;
  window.closeTvPlayerPanel = closeTvPlayerPanel;
  window.resolvePrototypeFriendProfile = resolvePrototypeFriendProfile;
  window.normalizeLobbyProfileHandleKey = normalizeLobbyProfileHandleKey;

  window.openTvPlayerPanelFromNotifications = function (rowEl) {
    var row = rowEl && rowEl.closest ? rowEl.closest(".game-invite-list__item") : null;
    if (!row) return false;
    var key = row.getAttribute("data-player-panel-handle-key") || "inviter";
    var av = row.querySelector(".game-invite-list__avatar img");
    var avatar = av && av.getAttribute("src") ? av.getAttribute("src") : undefined;
    var ns = row.getAttribute("data-notification-source") || "";
    var nameEl = row.querySelector(".game-invite-list__name");
    var rawName = nameEl ? (nameEl.textContent || "").trim() : "";
    var rowState = row.getAttribute("data-player-panel-state") || "";
    var isIncomingFriendReq =
      ns === "friend-request" || /\bwants to be friends\.?$/i.test(rawName);
    var isConnectedFriendNotif =
      ns === "friend-connected" ||
      (rowState === "friend-connected" &&
        /^\s*You are now friends with\s+/i.test(rawName));

    if (isIncomingFriendReq) {
      openTvPlayerPanel({
        entrypoint: "external",
        handleKey: key,
        state: "incoming-request",
        gameInvite: false,
        sourceElement: row,
        closeStack: "back",
        displayName: deriveDisplayNameFromNotificationRow(row),
        avatarSrc: avatar,
        fromNotifications: true,
      });
      return true;
    }

    if (isConnectedFriendNotif) {
      openTvPlayerPanel({
        entrypoint: "external",
        handleKey: key,
        state: "current-friend",
        gameInvite: false,
        sourceElement: row,
        closeStack: "back",
        displayName: deriveDisplayNameFromNowFriendsNotification(row, key),
        avatarSrc: avatar,
        fromNotifications: true,
      });
      return true;
    }

    return false;
  };

  window.declineFriendRequestNotificationRow = function (rowEl) {
    var row = rowEl && rowEl.closest ? rowEl.closest(".game-invite-list__item") : null;
    if (!row) return;
    var handle = deriveDisplayNameFromNotificationRow(row);
    if (!handle) {
      var nameEl = row.querySelector(".game-invite-list__name");
      var raw = nameEl ? (nameEl.textContent || "").trim() : "";
      handle = raw.replace(/\s+wants to be friends\.?$/i, "").trim();
    }
    if (handle) removeFriendRequestNotificationRowForDecline(handle, row);
  };

  window.acceptFriendRequestNotificationRow = function (rowEl, opts) {
    opts = opts || {};
    var row =
      rowEl && rowEl.closest
        ? rowEl.closest(".game-invite-list__item")
        : rowEl && rowEl.classList && rowEl.classList.contains("game-invite-list__item")
          ? rowEl
          : null;
    if (!row) return;
    var handle = deriveDisplayNameFromNotificationRow(row);
    if (!handle) {
      var nameEl = row.querySelector(".game-invite-list__name");
      var raw = nameEl ? (nameEl.textContent || "").trim() : "";
      handle = raw.replace(/\s+wants to be friends\.?$/i, "").trim();
    }
    if (!handle) return;
    var acceptOpts = Object.assign({ row: row }, opts);
    var fromKey = row.getAttribute("data-friend-request-from-key");
    var toKey = row.getAttribute("data-friend-request-to-key");
    var surfaceOpts = opts.skipMobileSync ? { skipNotificationListSync: true } : undefined;
    if (
      fromKey &&
      toKey &&
      typeof window.isLocalPlayerFriendKey === "function" &&
      window.isLocalPlayerFriendKey(fromKey) &&
      window.isLocalPlayerFriendKey(toKey) &&
      typeof window.acceptLocalPlayerFriendRequest === "function"
    ) {
      applyFriendRequestAcceptedToNotificationRow(handle, fromKey, acceptOpts);
      window.acceptLocalPlayerFriendRequest(toKey, fromKey, surfaceOpts);
      if (typeof window.syncMobileDashboardFriendsList === "function") {
        window.syncMobileDashboardFriendsList();
      }
      if (typeof window.syncMobileDashboardPlayerList === "function") {
        window.syncMobileDashboardPlayerList();
      }
      return;
    }
    var av = row.querySelector(".game-invite-list__avatar img");
    var avatar = av && av.getAttribute("src") ? av.getAttribute("src") : "";
    var sid = appendAcceptedFriendFromProfile({ handle: handle, avatar: avatar });
    applyFriendRequestAcceptedToNotificationRow(handle, sid, acceptOpts);
    if (typeof window.addActiveLocalPlayerFriend === "function") {
      window.addActiveLocalPlayerFriend(sid, surfaceOpts);
    }
  };

  function onTriggerClick(e) {
    if (
      e.target.closest &&
      e.target.closest(
        ".game-invite-list__invite-btn, .game-invite-list__share-btn, .fc-mobile-dash__invite-btn"
      )
    ) {
      return;
    }
    var btn = e.target.closest("[data-player-panel-handle-key]");
    if (!btn) return;
    /* Evolution mobile dashboard list rows — L3 detail on controller, not TV player panel */
    if (
      btn.closest &&
      (btn.closest("#fcMobileDashHomeFriendsList") ||
        btn.closest("#fcMobileDashFriendsL2List") ||
        btn.closest("#fcMobileDashFriendsList") ||
        btn.closest("#fcMobileDashPlayerList"))
    ) {
      return;
    }
    if (
      btn.closest &&
      btn.closest(".game-invite-list--notifications") &&
      typeof window.openTvPlayerPanelFromNotifications === "function"
    ) {
      var ns = btn.getAttribute("data-notification-source") || "";
      var nameEl = btn.querySelector(".game-invite-list__name");
      var rawName = nameEl ? (nameEl.textContent || "").trim() : "";
      var isFriendReq =
        ns === "friend-request" || /\bwants to be friends\.?$/i.test(rawName);
      var rowState = btn.getAttribute("data-player-panel-state") || "";
      var isFriendConnectedNotif =
        ns === "friend-connected" ||
        (rowState === "friend-connected" &&
          /^\s*You are now friends with\s+/i.test(rawName));
      if (isFriendReq || isFriendConnectedNotif) {
        e.preventDefault();
        e.stopPropagation();
        window.openTvPlayerPanelFromNotifications(btn);
        return;
      }
    }
    var key = btn.getAttribute("data-player-panel-handle-key");
    if (!key) return;
    key = normalizeLobbyProfileHandleKey(key, btn);
    var fromLobbyRow =
      btn.closest &&
      btn.closest(".tv-gameplay-interactive__row-btn") &&
      btn.closest("#tvGameplayInteractiveDefault");
    if (
      fromLobbyRow &&
      shouldRouteTvProfileTapToMobile() &&
      typeof window.openMobileFriendDetailByHandleKey === "function"
    ) {
      e.preventDefault();
      e.stopPropagation();
      window.openMobileFriendDetailByHandleKey(key, { sourceElement: btn });
      return;
    }
    var state = btn.getAttribute("data-player-panel-state") || "current-friend";
    var gameInvite = btn.getAttribute("data-player-panel-game-invite") === "true";
    var entry = btn.getAttribute("data-player-panel-entry") || "dashboard";
    var attrStack = btn.getAttribute("data-player-panel-close-stack");
    var closeStackOpt =
      attrStack === "back" || attrStack === "close" ? attrStack : undefined;
    e.preventDefault();
    e.stopPropagation();
    openTvPlayerPanel({
      entrypoint: entry,
      handleKey: key,
      state: state,
      gameInvite: gameInvite,
      sourceElement: btn,
      closeStack: closeStackOpt,
    });
  }

  function bindDelegatedTriggers() {
    document.addEventListener(
      "click",
      function (e) {
        if (!e.target.closest || !e.target.closest("[data-player-panel-handle-key]")) return;
        onTriggerClick(e);
      },
      true
    );
  }

  function bindCloseControls() {
    var shell = getShell();
    if (!shell) return;
    var bd = $(".player-panel__backdrop", shell);
    if (bd) {
      bd.addEventListener("click", function () {
        closeTvPlayerPanel();
      });
    }
    var closeBtn = $("#tvPlayerPanelClose");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        closeTvPlayerPanel();
      });
    }
    var moreBtn = $("#tvPlayerPanelMore");
    if (moreBtn) {
      moreBtn.addEventListener("click", function (e) {
        e.preventDefault();
        applyPanelDataset("more-options-focus", false);
        resetPlayerPanelFocus();
      });
    }

    var ids = [
      "tvPlayerPanelAddFriend",
      "tvPlayerPanelAddFriendInverse",
      "tvPlayerPanelUnblock",
      "tvPlayerPanelReport",
      "tvPlayerPanelInvite",
    ];
    for (var i = 0; i < ids.length; i++) {
      var b = document.getElementById(ids[i]);
      if (b) {
        b.addEventListener("click", function () {
          closeTvPlayerPanel();
        });
      }
    }

    function bindIncomingFriendRequestActions() {
      var accept = document.getElementById("tvPlayerPanelAccept");
      var decline = document.getElementById("tvPlayerPanelDecline");
      if (!accept || !decline || accept.getAttribute("data-incoming-fr-bound") === "1") return;
      accept.setAttribute("data-incoming-fr-bound", "1");
      decline.setAttribute("data-incoming-fr-bound", "1");
      accept.addEventListener("click", function (e) {
        var r = getPanelRoot();
        if (!r || r.getAttribute("data-state") !== "incoming-request") return;
        e.preventDefault();
        e.stopPropagation();
        startIncomingFriendRequestOutcome("accept");
      });
      decline.addEventListener("click", function (e) {
        var r = getPanelRoot();
        if (!r || r.getAttribute("data-state") !== "incoming-request") return;
        e.preventDefault();
        e.stopPropagation();
        startIncomingFriendRequestOutcome("decline");
      });
    }
    bindIncomingFriendRequestActions();
  }

  function patchGameInviteViewPlayer() {
    var viewBtn = document.getElementById("tvGameInviteViewPlayerBtn");
    if (!viewBtn || viewBtn.getAttribute("data-player-panel-patched") === "1") return;
    viewBtn.setAttribute("data-player-panel-patched", "1");
    viewBtn.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        openGameInviteInviterPlayerPanel();
      },
      true
    );
  }

  function openGameInviteInviterPlayerPanel() {
    openTvPlayerPanel({
      entrypoint: "external",
      handleKey: "inviter",
      state: "current-friend",
      gameInvite: false,
      sourceElement: null,
      closeStack: "back",
      gameTitle: GAME_INVITE_INVITER_PANEL_GAME_TITLE,
      playingArtSrc: GAME_INVITE_INVITER_PANEL_PLAYING_ART,
      avatarSrc: findGameInviteInviterProfileAvatarSrc(),
      presenceLabel: "Online",
      forceCurrentlyPlaying: true,
    });
  }

  window.openGameInviteInviterPlayerPanel = openGameInviteInviterPlayerPanel;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bindDelegatedTriggers();
      bindCloseControls();
      patchGameInviteViewPlayer();
    });
  } else {
    bindDelegatedTriggers();
    bindCloseControls();
    patchGameInviteViewPlayer();
  }
})();
