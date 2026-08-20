/**
 * Shared online / idle / offline presence — mobile avatar dots + list status labels.
 */
(function () {
  "use strict";

  var STATE_ONLINE = "online";
  var STATE_IDLE = "idle";
  var STATE_OFFLINE = "offline";

  function friendsFocusMetaVisible(card) {
    if (!card) return false;
    var meta = card.querySelector(".tv-dashboard__friends-focus-player-meta");
    return !!(meta && !meta.hidden);
  }

  function readPresenceFromFriendsCard(card) {
    if (!card) return { state: STATE_OFFLINE, gameTitle: "" };
    var online = card.classList.contains("tv-dashboard__friends-focus-player-card--online");
    if (!online) return { state: STATE_OFFLINE, gameTitle: "" };
    if (!friendsFocusMetaVisible(card)) return { state: STATE_IDLE, gameTitle: "" };
    var titleEl = card.querySelector(".tv-dashboard__friends-focus-player-game-title");
    var gameTitle = titleEl ? titleEl.textContent.replace(/\s+/g, " ").trim() : "";
    if (gameTitle) return { state: STATE_ONLINE, gameTitle: gameTitle };
    return { state: STATE_IDLE, gameTitle: "" };
  }

  function readPresenceFromInviteStatus(statusEl) {
    if (!statusEl) return { state: STATE_OFFLINE, gameTitle: "" };
    if (statusEl.classList.contains("game-invite-list__status--offline")) {
      return { state: STATE_OFFLINE, gameTitle: "" };
    }
    if (statusEl.classList.contains("game-invite-list__status--idle")) {
      return { state: STATE_IDLE, gameTitle: "" };
    }
    var labelEl = statusEl.querySelector("span");
    var text = labelEl ? labelEl.textContent.replace(/\s+/g, " ").trim() : "";
    if (/offline/i.test(text)) return { state: STATE_OFFLINE, gameTitle: "" };
    if (/^playing\s+/i.test(text)) {
      return {
        state: STATE_ONLINE,
        gameTitle: text.replace(/^playing\s+/i, "").trim(),
      };
    }
    if (text && !/^online$/i.test(text) && !/^offline$/i.test(text)) {
      return { state: STATE_ONLINE, gameTitle: text };
    }
    if (/^online$/i.test(text)) return { state: STATE_IDLE, gameTitle: "" };
    return { state: STATE_ONLINE, gameTitle: "" };
  }

  function formatOnlinePlayerStatus(presence, options) {
    options = options || {};
    presence = presence || {};
    if (presence.state === STATE_OFFLINE) return "Offline";
    if (presence.gameTitle && !options.suppressGameTitle) return presence.gameTitle;
    return "Online";
  }

  function formatLocalPlayerStatus(presence) {
    presence = presence || {};
    if (presence.disconnected || presence.state === STATE_OFFLINE) return "disconnected";
    if (presence.state === STATE_IDLE) return "Idle";
    return "Connected";
  }

  function isMobileAvatarHost(container) {
    if (!container || !container.classList) return false;
    if (container.classList.contains("fc-mobile-notif-detail__image-wrap")) {
      return !!container.querySelector(
        ".fc-mobile-notif-detail__image--avatar:not([hidden])"
      );
    }
    return (
      container.classList.contains("fc-mobile-dash__avatar-wrap") ||
      container.classList.contains("fc-mobile-dash__friend-avatar") ||
      container.classList.contains("fc-mobile-notif__thumb")
    );
  }

  function removePresenceDot(container, inline) {
    if (!container) return;
    var sel = inline ? ".fc-presence-dot--inline" : ".fc-presence-dot--avatar";
    var dot = container.querySelector(sel);
    if (dot) dot.remove();
  }

  function ensurePresenceDot(container, inline) {
    if (!container) return null;
    var sel = inline ? ".fc-presence-dot--inline" : ".fc-presence-dot--avatar";
    var dot = container.querySelector(sel);
    if (!dot) {
      dot = document.createElement("span");
      dot.className = inline
        ? "fc-presence-dot fc-presence-dot--inline"
        : "fc-presence-dot fc-presence-dot--avatar";
      dot.setAttribute("aria-hidden", "true");
      container.appendChild(dot);
    }
    return dot;
  }

  function statusLabelEl(statusWrap) {
    if (!statusWrap) return null;
    return (
      statusWrap.querySelector(".fc-mobile-dash__friend-status-text") ||
      statusWrap.querySelector(".fc-mobile-notif-detail__status-label") ||
      statusWrap.querySelector("span:not(.fc-presence-dot)")
    );
  }

  function rowHasAvatarPresenceDot(contextEl) {
    if (!contextEl) return false;
    var row = contextEl.closest(
      ".fc-mobile-dash__friend-row, .fc-mobile-notif__row, .fc-mobile-notif-detail__profile, .player-panel__profile-col"
    );
    if (!row) return false;
    return !!row.querySelector(".fc-presence-dot--avatar");
  }

  function applyPresenceState(el, state) {
    if (!el) return;
    el.classList.remove(
      "fc-presence-dot--online",
      "fc-presence-dot--idle",
      "fc-presence-dot--offline"
    );
    if (state === STATE_OFFLINE) el.classList.add("fc-presence-dot--offline");
    else el.classList.add("fc-presence-dot--online");
  }

  function applyPresenceToAvatar(container, state) {
    if (!container) return;
    if (!isMobileAvatarHost(container)) {
      removePresenceDot(container, false);
      return;
    }
    applyPresenceState(ensurePresenceDot(container, false), state);
  }

  function applyPresenceStatusRow(statusWrap, state, label, options) {
    options = options || {};
    if (!statusWrap) return;

    var img = statusWrap.querySelector("img");
    if (img) img.hidden = true;

    var showDot = options.showDot !== false;
    if (showDot && options.hideDotWhenAvatarNearby !== false && rowHasAvatarPresenceDot(statusWrap)) {
      showDot = false;
    }

    var labelEl = statusLabelEl(statusWrap);
    if (showDot) {
      var dot = ensurePresenceDot(statusWrap, true);
      applyPresenceState(dot, state);
      if (labelEl) statusWrap.insertBefore(dot, labelEl);
    } else {
      removePresenceDot(statusWrap, true);
    }

    if (labelEl) labelEl.textContent = label;

    statusWrap.classList.remove(
      "game-invite-list__status--online",
      "game-invite-list__status--idle",
      "game-invite-list__status--offline",
      "fc-mobile-dash__friend-status--online",
      "fc-mobile-dash__friend-status--idle",
      "fc-mobile-dash__friend-status--offline"
    );
    if (state === STATE_OFFLINE) {
      statusWrap.classList.add(
        "game-invite-list__status--offline",
        "fc-mobile-dash__friend-status--offline"
      );
    } else if (state === STATE_IDLE) {
      statusWrap.classList.add(
        "game-invite-list__status--idle",
        "fc-mobile-dash__friend-status--idle"
      );
    } else {
      statusWrap.classList.add(
        "game-invite-list__status--online",
        "fc-mobile-dash__friend-status--online"
      );
    }
  }

  function clearTvAvatarPresenceDots() {
    document
      .querySelectorAll(
        "#tvDashboard .fc-presence-dot--avatar, " +
          ".tv-gameplay-interactive .fc-presence-dot--avatar, " +
          ".player-panel .fc-presence-dot--avatar, " +
          ".game-invite-list .fc-presence-dot--avatar"
      )
      .forEach(function (dot) {
        dot.remove();
      });
  }

  function syncFriendsFocusCard(card) {
    var presence = readPresenceFromFriendsCard(card);
    var hasPlayingField = friendsFocusMetaVisible(card);
    var label = formatOnlinePlayerStatus(presence, { suppressGameTitle: hasPlayingField });
    removePresenceDot(
      card.querySelector(".tv-dashboard__friends-focus-player-lockup") ||
        card.querySelector(".tv-dashboard__friends-focus-player-avatar"),
      false
    );
    applyPresenceStatusRow(
      card.querySelector(".tv-dashboard__friends-focus-handle-status"),
      presence.state,
      label,
      { hideDotWhenAvatarNearby: false }
    );
  }

  function syncInviteListItem(item) {
    if (!item || item.classList.contains("game-invite-list__item--share")) return;
    var key = item.getAttribute("data-player-panel-handle-key");
    var card =
      key &&
      document.querySelector(
        '.tv-dashboard__friends-focus-player-card[data-player-panel-handle-key="' + key + '"]'
      );
    var presence = card
      ? readPresenceFromFriendsCard(card)
      : readPresenceFromInviteStatus(item.querySelector(".game-invite-list__status"));
    var label = formatOnlinePlayerStatus(presence);
    removePresenceDot(
      item.querySelector(".game-invite-list__thumb--avatar") ||
        item.querySelector(".game-invite-list__avatar"),
      false
    );
    applyPresenceStatusRow(item.querySelector(".game-invite-list__status"), presence.state, label, {
      hideDotWhenAvatarNearby: false,
    });
  }

  function syncAllFriendsPresenceSurfaces() {
    clearTvAvatarPresenceDots();
    document.querySelectorAll(".tv-dashboard__friends-focus-player-card").forEach(function (card) {
      syncFriendsFocusCard(card);
    });
    document
      .querySelectorAll(
        '#tvDashboardInviteShell .game-invite-list__item[data-player-panel-handle-key], ' +
          '.game-invite-list--notifications .game-invite-list__item[data-player-panel-handle-key]'
      )
      .forEach(syncInviteListItem);
  }

  function syncMobileLocalProfilePresence() {
    var app = document.getElementById("app");
    if (
      app &&
      app.getAttribute("data-platform-experience") === "evolution" &&
      app.getAttribute("data-platform-phase") === "0.5"
    ) {
      return;
    }
    var wrap = document.querySelector(".fc-mobile-dash__avatar-wrap");
    if (!wrap) return;
    var disconnected = !!window.PROTOTYPE_LOCAL_PROFILE_DISCONNECTED;
    var appearOffline = isLocalPlayerAppearOffline(getLocalPlayerKey());
    if (disconnected || appearOffline) {
      applyPresenceToAvatar(wrap, STATE_OFFLINE);
    } else {
      applyPresenceToAvatar(wrap, STATE_ONLINE);
    }
  }

  var PROFILE_FOCUS_STATUS_ONLINE =
    "assets/raster/dashboard-profile-focus-72-7008/status-online-dot.png";
  var PROFILE_FOCUS_STATUS_OFFLINE =
    "assets/raster/game-invite-1-6683/status-offline-dot.png";

  /** @type {Record<string, "online" | "appear-offline">} */
  window.PROTOTYPE_LOCAL_ONLINE_STATUS = window.PROTOTYPE_LOCAL_ONLINE_STATUS || Object.create(null);

  function getLocalPlayerKey() {
    return typeof window.getActiveLocalPlayerKey === "function"
      ? window.getActiveLocalPlayerKey()
      : "local";
  }

  function getLocalOnlineStatus(key) {
    key = key || getLocalPlayerKey();
    var stored = window.PROTOTYPE_LOCAL_ONLINE_STATUS[key];
    return stored === "appear-offline" ? "appear-offline" : "online";
  }

  function setLocalOnlineStatus(key, value) {
    key = key || getLocalPlayerKey();
    window.PROTOTYPE_LOCAL_ONLINE_STATUS[key] =
      value === "appear-offline" ? "appear-offline" : "online";
  }

  function isLocalPlayerFriendKey(key) {
    return (
      typeof window.isLocalPlayerFriendKey === "function" && window.isLocalPlayerFriendKey(key)
    );
  }

  function isLocalPlayerAppearOffline(key) {
    return getLocalOnlineStatus(key) === "appear-offline";
  }

  function isLocalPlayerAppearOfflineToOthers(key) {
    if (!key) return false;
    if (!!window.PROTOTYPE_LOCAL_PROFILE_DISCONNECTED && key === getLocalPlayerKey()) {
      return true;
    }
    return isLocalPlayerAppearOffline(key);
  }

  function syncTvProfileFocusLocalPresence() {
    var statusWrap = document.querySelector(".tv-dashboard__profile-focus-status");
    if (!statusWrap) return;

    var key = getLocalPlayerKey();
    var disconnected = !!window.PROTOTYPE_LOCAL_PROFILE_DISCONNECTED;
    var appearOffline = isLocalPlayerAppearOffline(key);
    var img = statusWrap.querySelector("img");
    var labelEl = statusWrap.querySelector("span");
    var label = "Online";
    var state = STATE_ONLINE;

    if (disconnected) {
      label = "disconnected";
      state = STATE_OFFLINE;
    } else if (appearOffline) {
      label = "Appear offline";
      state = STATE_OFFLINE;
    }

    if (img) {
      img.src =
        state === STATE_OFFLINE ? PROFILE_FOCUS_STATUS_OFFLINE : PROFILE_FOCUS_STATUS_ONLINE;
      img.hidden = false;
    }
    if (labelEl) labelEl.textContent = label;

    applyPresenceStatusRow(statusWrap, state, label, { hideDotWhenAvatarNearby: false, showDot: false });
  }

  function applyLocalPlayerOnlineStatusToFriendCard(card, playerKey) {
    if (!card || !playerKey || !isLocalPlayerFriendKey(playerKey)) return;

    var appearOffline = isLocalPlayerAppearOfflineToOthers(playerKey);
    var meta = card.querySelector(".tv-dashboard__friends-focus-player-meta");

    if (appearOffline) {
      card.classList.remove("tv-dashboard__friends-focus-player-card--online");
      card.classList.add("tv-dashboard__friends-focus-player-card--offline");
      if (meta) meta.hidden = true;
    } else {
      card.classList.add("tv-dashboard__friends-focus-player-card--online");
      card.classList.remove("tv-dashboard__friends-focus-player-card--offline");
      if (meta) meta.hidden = false;
    }

    syncFriendsFocusCard(card);
  }

  function syncLocalPlayerFriendCardsPresence() {
    document
      .querySelectorAll(
        '.tv-dashboard__friends-focus-player-card[data-local-player-friend="true"]'
      )
      .forEach(function (card) {
        applyLocalPlayerOnlineStatusToFriendCard(
          card,
          card.getAttribute("data-player-panel-handle-key")
        );
      });
  }

  function refreshOpenLocalProfileDetail() {
    if (typeof window.refreshMobileDetailPresenceForKey !== "function") return;
    var key = getLocalPlayerKey();
    if (typeof window.getMobileDetailActiveHandleKey === "function") {
      var activeDetailKey = window.getMobileDetailActiveHandleKey();
      if (activeDetailKey) key = activeDetailKey;
    }
    window.refreshMobileDetailPresenceForKey(key);
  }

  function syncLocalPlayerPresenceUi() {
    var key = getLocalPlayerKey();

    syncTvProfileFocusLocalPresence();
    syncMobileLocalProfilePresence();
    syncLocalPlayerFriendCardsPresence();
    syncAllFriendsPresenceSurfaces();
    refreshOpenLocalProfileDetail();

    if (typeof window.syncMobileDashboardPlayerList === "function") {
      window.syncMobileDashboardPlayerList();
    }
    if (typeof window.syncMobileDashboardFriendsList === "function") {
      window.syncMobileDashboardFriendsList();
    }
    if (typeof window.applyActiveLocalPlayerFriendsVisibility === "function") {
      var state =
        typeof window.getActiveLocalPlayerState === "function"
          ? window.getActiveLocalPlayerState()
          : null;
      window.applyActiveLocalPlayerFriendsVisibility(state);
    }
  }

  function syncLobbyLocalRowPresence() {
    clearTvAvatarPresenceDots();
  }

  function syncProfileFocusPresence() {
    syncTvProfileFocusLocalPresence();
    removePresenceDot(document.querySelector(".tv-dashboard__profile-focus-avatar"), false);
  }

  function syncPlayerPanelPresence(opts) {
    opts = opts || {};
    var root = document.getElementById("tvPlayerPanel");
    var statusWrap = document.querySelector(
      ".player-panel__show-friend .tv-dashboard__friends-focus-handle-status"
    );
    var imgDot = document.getElementById("tvPlayerPanelPresenceDot");
    if (imgDot) imgDot.hidden = true;
    removePresenceDot(document.querySelector(".player-panel__avatar"), false);

    var state = opts.state || STATE_ONLINE;
    var label = opts.label || "Online";
    if (typeof opts.online === "boolean") {
      state = opts.online ? STATE_ONLINE : STATE_OFFLINE;
      label = opts.online ? "Online" : "Offline";
    }

    var hasPlayingField =
      opts.hasPlayingField != null
        ? !!opts.hasPlayingField
        : !!(root && root.getAttribute("data-currently-playing") === "true");

    if (opts.gameTitle && !hasPlayingField) {
      state = STATE_ONLINE;
      label = opts.gameTitle;
    } else if (opts.idle) {
      state = STATE_IDLE;
      label = "Online";
    } else {
      label = formatOnlinePlayerStatus(
        { state: state, gameTitle: opts.gameTitle || "" },
        { suppressGameTitle: hasPlayingField }
      );
    }

    applyPresenceStatusRow(statusWrap, state, label, { hideDotWhenAvatarNearby: false });
    if (root) root.setAttribute("data-presence-state", state);
  }

  function initPresenceSurfaces() {
    clearTvAvatarPresenceDots();
    syncAllFriendsPresenceSurfaces();
    syncMobileLocalProfilePresence();
    syncProfileFocusPresence();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPresenceSurfaces);
  } else {
    initPresenceSurfaces();
  }

  window.PrototypePresence = {
    STATE_ONLINE: STATE_ONLINE,
    STATE_IDLE: STATE_IDLE,
    STATE_OFFLINE: STATE_OFFLINE,
    friendsFocusMetaVisible: friendsFocusMetaVisible,
    readPresenceFromFriendsCard: readPresenceFromFriendsCard,
    readPresenceFromInviteStatus: readPresenceFromInviteStatus,
    formatOnlinePlayerStatus: formatOnlinePlayerStatus,
    formatLocalPlayerStatus: formatLocalPlayerStatus,
    applyPresenceToAvatar: applyPresenceToAvatar,
    applyPresenceStatusRow: applyPresenceStatusRow,
    syncFriendsFocusCard: syncFriendsFocusCard,
    syncInviteListItem: syncInviteListItem,
    syncAllFriendsPresenceSurfaces: syncAllFriendsPresenceSurfaces,
    syncMobileLocalProfilePresence: syncMobileLocalProfilePresence,
    syncLobbyLocalRowPresence: syncLobbyLocalRowPresence,
    syncProfileFocusPresence: syncProfileFocusPresence,
    syncTvProfileFocusLocalPresence: syncTvProfileFocusLocalPresence,
    applyLocalPlayerOnlineStatusToFriendCard: applyLocalPlayerOnlineStatusToFriendCard,
    syncLocalPlayerFriendCardsPresence: syncLocalPlayerFriendCardsPresence,
    getLocalOnlineStatus: getLocalOnlineStatus,
    setLocalOnlineStatus: setLocalOnlineStatus,
    isLocalPlayerAppearOffline: isLocalPlayerAppearOffline,
    isLocalPlayerAppearOfflineToOthers: isLocalPlayerAppearOfflineToOthers,
    syncPlayerPanelPresence: syncPlayerPanelPresence,
    clearTvAvatarPresenceDots: clearTvAvatarPresenceDots,
  };

  window.syncLocalPlayerPresenceUi = syncLocalPlayerPresenceUi;
  window.getLocalOnlineStatusForKey = getLocalOnlineStatus;
  window.isLocalPlayerAppearOfflineToOthers = isLocalPlayerAppearOfflineToOthers;
})();
