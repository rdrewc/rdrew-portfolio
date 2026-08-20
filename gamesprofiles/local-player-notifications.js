/**
 * Per-local-player notification tracks — mobile dashboard reads the active player's list.
 * Phase 0.5: prototype toasts/notifications always award to the TV profile (host / local).
 */
(function () {
  "use strict";

  var LOCAL_KEYS = ["local", "local-p2", "local-p3", "local-p4"];
  var tracksByKey = Object.create(null);
  var missedByKey = Object.create(null);
  var container = null;
  var notifIdCounter = 0;

  function isMultiLocal() {
    return typeof window.isMultiLocalSession === "function" && window.isMultiLocalSession();
  }

  function getLocalCount() {
    var counts =
      typeof window.getTvPlayersJoinedCounts === "function"
        ? window.getTvPlayersJoinedCounts()
        : { local: 1 };
    var local = counts.local;
    if (!(local >= 1 && local <= 4)) local = 1;
    return local;
  }

  function getActiveKey() {
    return typeof window.getActiveLocalPlayerKey === "function"
      ? window.getActiveLocalPlayerKey()
      : "local";
  }

  function getTvIdentityKey() {
    if (!isMultiLocal()) return "local";
    if (
      typeof window.getTvDashboardIdentityMode === "function" &&
      window.getTvDashboardIdentityMode() === "host"
    ) {
      return "local";
    }
    return getActiveKey();
  }

  function isPlatformPhase05() {
    if (typeof window.isPlatformPhase05 === "function") {
      return window.isPlatformPhase05();
    }
    var app = document.getElementById("app");
    return !!(
      app &&
      app.getAttribute("data-platform-experience") === "evolution" &&
      app.getAttribute("data-platform-phase") === "0.5"
    );
  }

  function getTvProfileNotificationKey() {
    return "local";
  }

  function avatarPool() {
    if (window.PROFILE_AVATAR_PATHS && window.PROFILE_AVATAR_PATHS.length) {
      return window.PROFILE_AVATAR_PATHS;
    }
    return [
      "assets/profile-avatars/type-01-scarlet.png",
      "assets/profile-avatars/type-01-luffy.png",
      "assets/profile-avatars/type-01-haru.png",
      "assets/profile-avatars/type-02-nami.png",
    ];
  }

  function handlePool() {
    if (window.PROTOTYPE_GAME_HANDLE_POOL && window.PROTOTYPE_GAME_HANDLE_POOL.length) {
      return window.PROTOTYPE_GAME_HANDLE_POOL;
    }
    return ["NeonRavager", "StormCipher", "IronSpectre", "VoidSerpent", "ShadowKnell"];
  }

  function nextNotifId() {
    notifIdCounter += 1;
    return "local-notif-" + notifIdCounter;
  }

  function ensureContainer() {
    if (container) return container;
    container = document.getElementById("localPlayerNotificationTracks");
    if (!container) {
      container = document.createElement("div");
      container.id = "localPlayerNotificationTracks";
      container.hidden = true;
      container.setAttribute("aria-hidden", "true");
      document.body.appendChild(container);
    }
    return container;
  }

  function createTrackForKey(key) {
    var track = document.createElement("div");
    track.className = "game-invite-list__track local-player-notif-track";
    track.id = "localPlayerNotifTrack-" + key;
    track.setAttribute("data-local-player-notif-track", key);
    return track;
  }

  function buildFriendRequestRow(handle, avatarSrc, timeLabel, unread, meta) {
    meta = meta || {};
    var item = document.createElement("div");
    item.className = "game-invite-list__item";
    if (unread) item.classList.add("game-invite-list__item--notification-unread");
    item.setAttribute("data-name", "Notification Item");
    item.setAttribute("data-notification-source", "friend-request");
    item.setAttribute(
      "data-player-panel-handle-key",
      meta.fromKey || "friend-request-notify"
    );
    item.setAttribute("data-player-panel-state", "incoming-request");
    item.setAttribute("data-local-player-notif-id", nextNotifId());
    if (meta.fromKey) item.setAttribute("data-friend-request-from-key", meta.fromKey);
    if (meta.toKey) item.setAttribute("data-friend-request-to-key", meta.toKey);

    var thumb = document.createElement("div");
    thumb.className = "game-invite-list__thumb game-invite-list__thumb--avatar";
    var avWrap = document.createElement("div");
    avWrap.className = "game-invite-list__avatar";
    avWrap.setAttribute("data-name", "Avatar");
    var avImg = document.createElement("img");
    avImg.setAttribute("alt", "");
    avImg.setAttribute("decoding", "async");
    avImg.src = avatarSrc;
    avWrap.appendChild(avImg);
    thumb.appendChild(avWrap);

    var body = document.createElement("div");
    body.className = "game-invite-list__body";
    body.setAttribute("data-name", "Content");

    var nameP = document.createElement("p");
    nameP.className = "game-invite-list__name";
    nameP.textContent = handle + " wants to be friends";

    var timeP = document.createElement("p");
    timeP.className = "game-invite-list__notification-time";
    timeP.textContent = timeLabel || "Today";

    body.appendChild(nameP);
    body.appendChild(timeP);
    item.appendChild(thumb);
    item.appendChild(body);
    return item;
  }

  function buildGameInviteRow(inviterHandle, gameTitle, unread, inviterKey) {
    var item = document.createElement("div");
    item.className = "game-invite-list__item";
    if (unread) item.classList.add("game-invite-list__item--notification-unread");
    item.setAttribute("data-name", "Notification Item");
    item.setAttribute("data-notification-source", "tv-game-invite-toast");
    item.setAttribute("data-local-player-notif-id", nextNotifId());
    if (inviterKey) {
      item.setAttribute("data-player-panel-handle-key", inviterKey);
      item.setAttribute("data-player-panel-state", "current-friend");
    }

    var thumb = document.createElement("div");
    thumb.className = "game-invite-list__thumb game-invite-list__thumb--notification-toast-icon";
    var thumbImg = document.createElement("img");
    thumbImg.setAttribute("alt", "");
    thumbImg.setAttribute("decoding", "async");
    thumbImg.setAttribute("width", "120");
    thumbImg.setAttribute("height", "120");
    thumbImg.src = "assets/raster/tv-game-invite-toast-61-6870/image-1898.png";
    thumb.appendChild(thumbImg);

    var body = document.createElement("div");
    body.className = "game-invite-list__body";
    body.setAttribute("data-name", "Content");

    var nameP = document.createElement("p");
    nameP.className = "game-invite-list__name";
    nameP.appendChild(document.createTextNode("Game invite from "));
    var invSpan = document.createElement("span");
    invSpan.setAttribute("data-prototype-player-handle", "inviter");
    invSpan.textContent = inviterHandle || "Friend";
    nameP.appendChild(invSpan);

    var subP = document.createElement("p");
    subP.className = "game-invite-list__sub";
    subP.textContent = gameTitle || "FIFA World Cup";

    var timeP = document.createElement("p");
    timeP.className = "game-invite-list__notification-time";
    timeP.textContent = "Just now";

    body.appendChild(nameP);
    body.appendChild(subP);
    body.appendChild(timeP);
    item.appendChild(thumb);
    item.appendChild(body);
    return item;
  }

  function seedTrackForPlayer(key, playerIndex) {
    var track = tracksByKey[key];
    if (!track) return;

    var handles = handlePool();
    var avatars = avatarPool();
    var offset = playerIndex * 2;

    track.replaceChildren();
    track.appendChild(
      buildFriendRequestRow(
        handles[offset % handles.length],
        avatars[offset % avatars.length],
        "Today 3:45 PM",
        true
      )
    );
    track.appendChild(
      buildFriendRequestRow(
        handles[(offset + 1) % handles.length],
        avatars[(offset + 1) % avatars.length],
        "Yesterday",
        false
      )
    );
  }

  function removeLocalPlayerNotificationTracks() {
    if (container) {
      container.replaceChildren();
    }
    tracksByKey = Object.create(null);
    missedByKey = Object.create(null);
  }

  function syncLocalPlayerNotificationTracks() {
    var count = getLocalCount();
    if (count <= 1) {
      removeLocalPlayerNotificationTracks();
      return;
    }

    ensureContainer();
    var activeKeys = LOCAL_KEYS.slice(0, count);
    var ki;

    for (ki = 0; ki < activeKeys.length; ki++) {
      var key = activeKeys[ki];
      if (!tracksByKey[key]) {
        tracksByKey[key] = createTrackForKey(key);
        container.appendChild(tracksByKey[key]);
        seedTrackForPlayer(key, ki);
      }
    }

    var existing = Object.keys(tracksByKey);
    for (ki = 0; ki < existing.length; ki++) {
      var staleKey = existing[ki];
      if (activeKeys.indexOf(staleKey) === -1) {
        if (tracksByKey[staleKey].parentNode) {
          tracksByKey[staleKey].parentNode.removeChild(tracksByKey[staleKey]);
        }
        delete tracksByKey[staleKey];
        delete missedByKey[staleKey];
      }
    }

    syncNotificationRecipientSelect();
  }

  function getTrackForKey(key) {
    return tracksByKey[key] || null;
  }

  function getActiveLocalPlayerNotificationTrack() {
    if (!isMultiLocal()) return null;
    return getTrackForKey(getActiveKey());
  }

  function getTvIdentityNotificationTrack() {
    if (!isMultiLocal()) return null;
    if (isPlatformPhase05()) {
      return getTrackForKey(getTvProfileNotificationKey());
    }
    return getTrackForKey(getTvIdentityKey());
  }

  function getNotificationAppendTrack() {
    if (isMultiLocal()) {
      var keys = resolveNotificationRecipientKeys();
      if (keys.length === 1) {
        return getTrackForKey(keys[0]);
      }
      return getActiveLocalPlayerNotificationTrack();
    }
    return document.getElementById("tvDashboardNotificationsListTrack");
  }

  function localPlayerLabelForKey(key) {
    var idx = LOCAL_KEYS.indexOf(key);
    if (idx <= 0) return "You";
    return "Local player " + (idx + 1);
  }

  function syncNotificationRecipientSelect() {
    var sel = document.getElementById("selNotificationRecipient");
    if (!sel) return;

    var count = getLocalCount();
    var prev = sel.value;
    var options = [
      { value: "focused", label: "Focused controller" },
    ];

    for (var i = 1; i < count; i++) {
      options.push({
        value: LOCAL_KEYS[i],
        label: localPlayerLabelForKey(LOCAL_KEYS[i]),
      });
    }
    if (count > 1) {
      options.push({ value: "all", label: "All local players" });
    }

    sel.replaceChildren();
    for (var oi = 0; oi < options.length; oi++) {
      var opt = document.createElement("option");
      opt.value = options[oi].value;
      opt.textContent = options[oi].label;
      sel.appendChild(opt);
    }

    var valid = false;
    for (var vi = 0; vi < options.length; vi++) {
      if (options[vi].value === prev) {
        valid = true;
        break;
      }
    }
    sel.value = valid ? prev : "focused";
    sel.disabled = isPlatformPhase05();
    if (isPlatformPhase05()) {
      sel.setAttribute("aria-disabled", "true");
    } else {
      sel.removeAttribute("aria-disabled");
    }
  }

  function resolveNotificationRecipientKeys() {
    if (isPlatformPhase05()) return [getTvProfileNotificationKey()];
    if (!isMultiLocal()) return ["local"];
    var sel = document.getElementById("selNotificationRecipient");
    var val = sel && sel.value ? sel.value : "focused";
    if (val === "all") return LOCAL_KEYS.slice(0, getLocalCount());
    if (val === "focused") return [getActiveKey()];
    if (LOCAL_KEYS.indexOf(val) !== -1) return [val];
    return [getActiveKey()];
  }

  function routeNotificationToast(playerKey, kind, payload) {
    if (!isMultiLocal()) return { showFullToast: true, playerKey: playerKey };

    if (isPlatformPhase05()) {
      return { showFullToast: false, playerKey: playerKey };
    }

    if (playerKey === getActiveKey()) {
      return { showFullToast: true, playerKey: playerKey };
    }

    if (typeof window.showControllerDockThumbToast === "function") {
      window.showControllerDockThumbToast(playerKey, kind, payload);
    }
    return { showFullToast: false, playerKey: playerKey };
  }

  function syncNotificationListUi() {
    if (typeof window.syncTvNotificationsPanelLayout === "function") {
      window.requestAnimationFrame(function () {
        window.syncTvNotificationsPanelLayout();
        if (typeof window.syncTvHeaderGameInviteNotificationBadge === "function") {
          window.syncTvHeaderGameInviteNotificationBadge();
        }
      });
    } else if (typeof window.syncTvHeaderGameInviteNotificationBadge === "function") {
      window.syncTvHeaderGameInviteNotificationBadge();
    }
    syncNotificationsForActivePlayer();
  }

  function localSessionGameTitle() {
    var refRaw = window.PROTOTYPE_LOCAL_SESSION_GAME_TITLE;
    return (typeof refRaw === "string" ? refRaw : "").replace(/\s+/g, " ").trim() || "FIFA World Cup";
  }

  function isLocalPlayerNotificationKey(key) {
    return LOCAL_KEYS.indexOf(key) !== -1;
  }

  function resolveHandleForKey(playerKey) {
    var ph = window.PROTOTYPE_PLAYER_HANDLES || {};
    if (ph[playerKey]) return ph[playerKey];
    if (typeof window.getLocalPlayerState === "function") {
      var state = window.getLocalPlayerState(playerKey);
      if (state && state.handle) return state.handle;
    }
    return "Friend";
  }

  function deliverGameInviteToPlayerKey(recipientKey, inviterHandle, gameTitle, inviterKey) {
    gameTitle = gameTitle || localSessionGameTitle();
    inviterHandle = inviterHandle || "Friend";

    if (!isMultiLocal()) {
      var singleTrack = document.getElementById("tvDashboardNotificationsListTrack");
      appendGameInviteToTrack(singleTrack, inviterHandle, gameTitle, inviterKey);
      syncNotificationListUi();
      return { showFullToast: true, recipientKey: recipientKey || "local" };
    }

    var track = getTrackForKey(recipientKey);
    if (!track) return { showFullToast: false, recipientKey: recipientKey };

    appendGameInviteToTrack(track, inviterHandle, gameTitle, inviterKey);
    var routed = routeNotificationToast(recipientKey, "game-invite", {
      inviterHandle: inviterHandle,
      gameTitle: gameTitle,
    });
    syncNotificationListUi();
    return { showFullToast: routed.showFullToast, recipientKey: recipientKey };
  }

  function deliverLobbyGameInviteToLocalPlayer(recipientKey) {
    if (!isMultiLocal()) return null;
    if (!isLocalPlayerNotificationKey(recipientKey)) return null;
    if (recipientKey === getActiveKey()) return null;

    var inviterHandle = resolveHandleForKey(getActiveKey());
    var gameTitle = localSessionGameTitle();
    var result = deliverGameInviteToPlayerKey(recipientKey, inviterHandle, gameTitle);

    if (
      result &&
      result.showFullToast &&
      typeof window.useEvolutionControllerNotificationToasts === "function" &&
      window.useEvolutionControllerNotificationToasts() &&
      typeof window.showEvolutionControllerGameInviteToast === "function"
    ) {
      var ph = window.PROTOTYPE_PLAYER_HANDLES || {};
      var prevInviter = ph.inviter;
      ph.inviter = inviterHandle;
      window.showEvolutionControllerGameInviteToast();
      if (prevInviter !== undefined) ph.inviter = prevInviter;
      else delete ph.inviter;
    }

    return result;
  }

  function deliverGameInviteNotification() {
    var inviterKey = null;
    if (typeof window.applyRandomInviterHandleToPrototype === "function") {
      inviterKey = window.applyRandomInviterHandleToPrototype();
      if (!inviterKey) return null;
    }

    var ph = window.PROTOTYPE_PLAYER_HANDLES;
    var inviterHandle = ph && ph.inviter ? ph.inviter : "Friend";
    var gameTitle = localSessionGameTitle();

    if (!isMultiLocal()) {
      var single = deliverGameInviteToPlayerKey("local", inviterHandle, gameTitle, inviterKey);
      return {
        showFullToast: single.showFullToast,
        inviterHandle: inviterHandle,
        gameTitle: gameTitle,
        inviterKey: inviterKey,
      };
    }

    var keys = resolveNotificationRecipientKeys();
    var showFullToast = false;
    var ki;

    for (ki = 0; ki < keys.length; ki++) {
      var key = keys[ki];
      var delivered = deliverGameInviteToPlayerKey(key, inviterHandle, gameTitle, inviterKey);
      if (delivered.showFullToast) showFullToast = true;
    }

    return {
      showFullToast: showFullToast,
      inviterHandle: inviterHandle,
      gameTitle: gameTitle,
      inviterKey: inviterKey,
    };
  }

  function deliverFriendRequestToPlayerKey(
    recipientKey,
    requesterKey,
    requesterHandle,
    requesterAvatar
  ) {
    requesterHandle = requesterHandle || resolveHandleForKey(requesterKey);
    requesterAvatar = requesterAvatar || "";
    var meta = { fromKey: requesterKey, toKey: recipientKey };

    if (!isMultiLocal()) {
      var singleTrack = document.getElementById("tvDashboardNotificationsListTrack");
      var singleItem = appendFriendInviteToTrack(
        singleTrack,
        requesterHandle,
        requesterAvatar,
        meta
      );
      syncNotificationListUi();
      return {
        showFullToast: true,
        handle: requesterHandle,
        avatarSrc: requesterAvatar,
        notificationRow: singleItem,
      };
    }

    var track = getTrackForKey(recipientKey);
    if (!track) {
      return {
        showFullToast: false,
        handle: requesterHandle,
        avatarSrc: requesterAvatar,
        notificationRow: null,
      };
    }

    var item = appendFriendInviteToTrack(track, requesterHandle, requesterAvatar, meta);
    var routed = routeNotificationToast(recipientKey, "friend-invite", {
      handle: requesterHandle,
      avatarSrc: requesterAvatar,
    });
    syncNotificationListUi();
    return {
      showFullToast: routed.showFullToast,
      handle: requesterHandle,
      avatarSrc: requesterAvatar,
      notificationRow: item,
    };
  }

  function deliverFriendInviteNotification(friendHandle, avatarSrc) {
    if (!isMultiLocal()) {
      var singleTrack = document.getElementById("tvDashboardNotificationsListTrack");
      var singleItem = appendFriendInviteToTrack(singleTrack, friendHandle, avatarSrc);
      syncNotificationListUi();
      return {
        showFullToast: true,
        handle: friendHandle,
        avatarSrc: avatarSrc,
        notificationRow: singleItem,
      };
    }

    var keys = resolveNotificationRecipientKeys();
    var showFullToast = false;
    var activeItem = null;
    var ki;

    for (ki = 0; ki < keys.length; ki++) {
      var key = keys[ki];
      var track = getTrackForKey(key);
      var item = appendFriendInviteToTrack(track, friendHandle, avatarSrc);
      var routed = routeNotificationToast(key, "friend-invite", {
        handle: friendHandle,
        avatarSrc: avatarSrc,
      });
      if (routed.showFullToast) {
        showFullToast = true;
        activeItem = item;
      }
    }

    syncNotificationListUi();
    return {
      showFullToast: showFullToast,
      handle: friendHandle,
      avatarSrc: avatarSrc,
      notificationRow: activeItem,
    };
  }

  function getMobileNotificationTrack() {
    if (isMultiLocal()) {
      return getActiveLocalPlayerNotificationTrack();
    }
    return document.getElementById("tvDashboardNotificationsListTrack");
  }

  function getPrototypeNotificationTrack(opts) {
    opts = opts || {};
    var purpose = opts.purpose || "mobile";
    if (purpose === "append") return getNotificationAppendTrack();
    if (purpose === "tv") {
      if (isMultiLocal()) return getTvIdentityNotificationTrack();
      return document.getElementById("tvDashboardNotificationsListTrack");
    }
    return getMobileNotificationTrack();
  }

  function appendFriendInviteToTrack(track, friendHandle, avatarSrc, meta) {
    if (!track) return null;
    var item = buildFriendRequestRow(friendHandle, avatarSrc, "Just now", true, meta);
    track.insertBefore(item, track.firstChild);
    return item;
  }

  function appendGameInviteToTrack(track, inviterHandle, gameTitle, inviterKey) {
    if (!track) return null;
    var item = buildGameInviteRow(
      inviterHandle,
      gameTitle,
      true,
      inviterKey || window.PROTOTYPE_GAME_INVITE_INVITER_KEY || null
    );
    track.insertBefore(item, track.firstChild);
    return item;
  }

  function markMissedForActivePlayer(kind) {
    if (!isMultiLocal()) return;
    missedByKey[getActiveKey()] = { kind: kind };
  }

  function markMissedForLocalPlayer(playerKey, kind) {
    if (!isMultiLocal() || !playerKey) return;
    missedByKey[playerKey] = { kind: kind };
    if (playerKey === getActiveKey()) {
      syncNotificationsForActivePlayer();
    }
  }

  function getMissedForActivePlayer() {
    if (!isMultiLocal()) return null;
    return missedByKey[getActiveKey()] || null;
  }

  function clearMissedForActivePlayer() {
    if (!isMultiLocal()) return;
    delete missedByKey[getActiveKey()];
  }

  function syncNotificationsForActivePlayer() {
    if (typeof window.syncMobileNotificationList === "function") {
      window.syncMobileNotificationList();
    }
    if (typeof window.syncMobileDashboardMissedCard === "function") {
      window.syncMobileDashboardMissedCard();
    }
    if (typeof window.syncTvHeaderGameInviteNotificationBadge === "function") {
      window.syncTvHeaderGameInviteNotificationBadge();
    }
  }

  function initLocalPlayerNotifications() {
    document.querySelectorAll(".control-count-toggle").forEach(function (root) {
      root.addEventListener("click", function () {
        window.requestAnimationFrame(function () {
          syncLocalPlayerNotificationTracks();
          syncNotificationRecipientSelect();
          syncNotificationsForActivePlayer();
        });
      });
    });

    var selIdentity = document.getElementById("selTvDashboardIdentity");
    if (selIdentity) {
      selIdentity.addEventListener("change", function () {
        if (isMultiLocal()) {
          window.requestAnimationFrame(syncNotificationsForActivePlayer);
        }
      });
    }

    syncLocalPlayerNotificationTracks();
    syncNotificationRecipientSelect();
  }

  window.syncLocalPlayerNotificationTracks = syncLocalPlayerNotificationTracks;
  window.getActiveLocalPlayerNotificationTrack = getActiveLocalPlayerNotificationTrack;
  window.getNotificationAppendTrack = getNotificationAppendTrack;
  window.getMobileNotificationTrack = getMobileNotificationTrack;
  window.getPrototypeNotificationTrack = getPrototypeNotificationTrack;
  window.appendFriendInviteToPlayerTrack = appendFriendInviteToTrack;
  window.appendGameInviteToPlayerTrack = appendGameInviteToTrack;
  window.markMissedNotificationForActiveLocalPlayer = markMissedForActivePlayer;
  window.markMissedNotificationForLocalPlayer = markMissedForLocalPlayer;
  window.getMissedNotificationForActiveLocalPlayer = getMissedForActivePlayer;
  window.clearMissedNotificationForActiveLocalPlayer = clearMissedForActivePlayer;
  window.syncNotificationsForActiveLocalPlayer = syncNotificationsForActivePlayer;
  window.deliverGameInviteNotification = deliverGameInviteNotification;
  window.deliverGameInviteToPlayerKey = deliverGameInviteToPlayerKey;
  window.deliverLobbyGameInviteToLocalPlayer = deliverLobbyGameInviteToLocalPlayer;
  window.deliverFriendInviteNotification = deliverFriendInviteNotification;
  window.deliverFriendRequestToPlayerKey = deliverFriendRequestToPlayerKey;
  window.syncNotificationRecipientSelect = syncNotificationRecipientSelect;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLocalPlayerNotifications);
  } else {
    initLocalPlayerNotifications();
  }
})();
