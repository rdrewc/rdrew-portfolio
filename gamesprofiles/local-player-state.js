/**
 * Per-local-player prototype data — handle, avatar, friend roster slices.
 * Active player drives mobile dashboard, NGC profile, and TV friends visibility (multi-local).
 */
(function () {
  "use strict";

  var LOCAL_PLAYER_KEYS = ["local", "local-p2", "local-p3", "local-p4"];
  /** Index of the local co-player who is not friends with You (index 0) — always Player 2 (`local-p2`). */
  var NON_FRIEND_LOCAL_PLAYER_INDEX = 1;
  var DEFAULT_AVATAR = "assets/profile-avatars/type-01-luffy.png";
  /** @type {Record<string, { key: string, index: number, handle: string, avatar: string, friendKeys: string[] }>} */
  var playerStateByKey = Object.create(null);
  /** Friend keys added after an incoming friend request is accepted. */
  var runtimeAddedFriendKeys = Object.create(null);
  /** Outgoing friend requests keyed as "fromKey->toKey". */
  var pendingOutgoingFriendRequests = Object.create(null);

  function getFriendPool() {
    return window.PROTOTYPE_FRIEND_LIST_KEYS || [];
  }

  function getLocalPlayerCount() {
    var counts =
      typeof window.getTvPlayersJoinedCounts === "function"
        ? window.getTvPlayersJoinedCounts()
        : { local: 1 };
    var local = counts.local;
    if (!(local >= 1 && local <= 4)) local = 1;
    return local;
  }

  function isMultiLocalSession() {
    return getLocalPlayerCount() > 1;
  }

  function getFriendsCountPerPlayer() {
    var app = document.getElementById("app");
    var fromAttr = app && app.getAttribute("data-friends-count");
    var n = fromAttr != null ? parseInt(fromAttr, 10) : NaN;
    if (!(n >= 0)) {
      var sel = document.getElementById("selFriendsCount");
      n = sel ? parseInt(sel.value, 10) : 5;
    }
    if (!(n >= 0)) n = 5;
    var pool = getFriendPool();
    return Math.min(n, pool.length);
  }

  function assignFriendKeysForPlayer(playerIndex, count, pool) {
    if (!pool.length || count <= 0) return [];
    var keys = [];
    var offset = (playerIndex * count) % pool.length;
    for (var j = 0; j < count; j++) {
      keys.push(pool[(offset + j) % pool.length]);
    }
    return keys;
  }

  function isNonFriendLocalPair(viewerIndex, targetIndex, localCount) {
    if (localCount <= 1) return false;
    var nf = NON_FRIEND_LOCAL_PLAYER_INDEX;
    if (!(nf >= 1 && nf < localCount)) return false;
    return (
      (viewerIndex === 0 && targetIndex === nf) || (viewerIndex === nf && targetIndex === 0)
    );
  }

  function getNonFriendLocalPlayerIndex() {
    return NON_FRIEND_LOCAL_PLAYER_INDEX;
  }

  function getNonFriendLocalPlayerKey() {
    return getLocalPlayerKeyForIndex(NON_FRIEND_LOCAL_PLAYER_INDEX);
  }

  /** True when `key` is the designated non-friend local slot (Player 2 / `local-p2`). */
  function isNonFriendLocalPlayerKey(key) {
    if (!key || !isLocalPlayerFriendKey(key)) return false;
    var state = getLocalPlayerState(key);
    return !!(state && state.index === NON_FRIEND_LOCAL_PLAYER_INDEX);
  }

  /** True when the active local player is not friends with `targetKey` (local Player 2 pair only). */
  function isNonFriendLocalPlayerForActive(targetKey) {
    if (!targetKey || !isLocalPlayerFriendKey(targetKey)) return false;
    var activeIndex = getActiveLocalPlayerIndex();
    var targetState = getLocalPlayerState(targetKey);
    if (!targetState) return false;
    return isNonFriendLocalPair(activeIndex, targetState.index, getLocalPlayerCount());
  }

  function collectLocalFriendKeysForIndex(index, localCount) {
    if (localCount <= 1) return [];
    var keys = [];
    for (var i = 0; i < localCount; i++) {
      if (i === index) continue;
      if (isNonFriendLocalPair(index, i, localCount)) continue;
      keys.push(getLocalPlayerKeyForIndex(i));
    }
    return keys;
  }

  function publishLocalPlayerHandlesToPrototype() {
    var H = window.PROTOTYPE_PLAYER_HANDLES || {};
    var A = window.PROTOTYPE_PLAYER_AVATARS || {};
    var keys = Object.keys(playerStateByKey);
    for (var i = 0; i < keys.length; i++) {
      var state = playerStateByKey[keys[i]];
      if (!state) continue;
      H[state.key] = state.handle;
      A[state.key] = state.avatar;
    }
    window.PROTOTYPE_PLAYER_HANDLES = H;
    window.PROTOTYPE_PLAYER_AVATARS = A;
  }

  function localSessionGameTitle() {
    var refRaw = window.PROTOTYPE_LOCAL_SESSION_GAME_TITLE;
    return (typeof refRaw === "string" ? refRaw : "").replace(/\s+/g, " ").trim() || "FIFA World Cup";
  }

  function configureLocalPlayerFriendCard(card, state) {
    if (!card || !state) return;

    card.setAttribute("data-player-panel-handle-key", state.key);
    card.setAttribute("data-local-player-friend", "true");
    card.setAttribute("data-player-panel-state", "current-friend");
    card.setAttribute("data-player-panel-game-invite", "false");
    card.setAttribute("data-player-panel-entry", "dashboard");
    card.classList.add("tv-dashboard__friends-focus-player-card--online");
    card.classList.remove("tv-dashboard__friends-focus-player-card--offline");

    var handleSpan = card.querySelector(".tv-dashboard__friends-focus-handle-name span");
    if (handleSpan) {
      handleSpan.removeAttribute("data-prototype-player-handle");
      handleSpan.textContent = state.handle;
    }

    var av = card.querySelector(".tv-dashboard__friends-focus-player-avatar-img");
    if (av) {
      av.setAttribute("src", state.avatar);
      av.alt = "";
    }

    var gameTitleEl = card.querySelector(".tv-dashboard__friends-focus-player-game-title");
    if (gameTitleEl) gameTitleEl.textContent = localSessionGameTitle();

    var meta = card.querySelector(".tv-dashboard__friends-focus-player-meta");
    if (meta) meta.hidden = false;

    if (typeof window.PrototypePresence !== "undefined") {
      if (typeof window.PrototypePresence.applyLocalPlayerOnlineStatusToFriendCard === "function") {
        window.PrototypePresence.applyLocalPlayerOnlineStatusToFriendCard(card, state.key);
      } else {
        window.PrototypePresence.syncFriendsFocusCard(card);
      }
    }
  }

  function ensureLocalPlayerFriendCards() {
    var cardsWrap = document.querySelector(".tv-dashboard__friends-focus-player-cards");
    var template =
      cardsWrap && cardsWrap.querySelector('[data-player-panel-handle-key="list-0"]');
    if (!cardsWrap || !template) return;

    dedupeLocalPlayerFriendCards(cardsWrap);

    var localCount = getLocalPlayerCount();

    for (var ki = 0; ki < LOCAL_PLAYER_KEYS.length; ki++) {
      var key = LOCAL_PLAYER_KEYS[ki];
      var card = cardsWrap.querySelector(
        '.tv-dashboard__friends-focus-player-card[data-local-player-friend="true"][data-player-panel-handle-key="' +
          key +
          '"]'
      );
      if (!card) {
        card = template.cloneNode(true);
        card.setAttribute("data-local-player-friend", "true");
        cardsWrap.appendChild(card);
      }

      var state = playerStateByKey[key];
      if (!state || state.index >= localCount) {
        card.hidden = true;
        card.setAttribute("aria-hidden", "true");
        continue;
      }

      configureLocalPlayerFriendCard(card, state);
      card.hidden = true;
      card.setAttribute("aria-hidden", "true");
    }

    dedupeLocalPlayerFriendCards(cardsWrap);
  }

  function dedupeLocalPlayerFriendCards(cardsWrap) {
    if (!cardsWrap) return;
    for (var ki = 0; ki < LOCAL_PLAYER_KEYS.length; ki++) {
      var key = LOCAL_PLAYER_KEYS[ki];
      var cards = cardsWrap.querySelectorAll(
        '.tv-dashboard__friends-focus-player-card[data-local-player-friend="true"][data-player-panel-handle-key="' +
          key +
          '"]'
      );
      for (var i = 1; i < cards.length; i++) {
        cards[i].remove();
      }
    }
  }

  function hideLocalPlayerFriendCards() {
    var cardsWrap = document.querySelector(".tv-dashboard__friends-focus-player-cards");
    if (!cardsWrap) return;
    var cards = cardsWrap.querySelectorAll(
      '.tv-dashboard__friends-focus-player-card[data-local-player-friend="true"]'
    );
    for (var i = 0; i < cards.length; i++) {
      cards[i].hidden = true;
      cards[i].setAttribute("aria-hidden", "true");
    }
  }

  function removeLocalPlayerFriendCards() {
    var cardsWrap = document.querySelector(".tv-dashboard__friends-focus-player-cards");
    if (!cardsWrap) return;
    var cards = cardsWrap.querySelectorAll(
      '.tv-dashboard__friends-focus-player-card[data-local-player-friend="true"]'
    );
    for (var i = 0; i < cards.length; i++) {
      cards[i].remove();
    }
  }

  function setFriendCardVisible(card, visible) {
    if (!card) return;
    card.hidden = !visible;
    card.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  function setInviteItemVisible(item, visible) {
    if (!item) return;
    item.hidden = !visible;
    item.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  function allFriendVisibilityKeys() {
    return getFriendPool().concat(LOCAL_PLAYER_KEYS);
  }

  function getActiveLocalPlayerFriendKeys() {
    var state = getActiveLocalPlayerState();
    return state && state.friendKeys ? state.friendKeys.slice() : [];
  }

  function isActiveLocalPlayerFriend(handleKey) {
    if (!handleKey) return false;
    var state = getActiveLocalPlayerState();
    if (!state || !state.friendKeys) return false;
    return state.friendKeys.indexOf(handleKey) !== -1;
  }

  function addActiveLocalPlayerFriend(handleKey, opts) {
    if (!handleKey) return false;
    var activeKey = getActiveLocalPlayerKey();
    if (!activeKey) return false;
    runtimeAddedFriendKeys[handleKey] = activeKey;
    syncLocalPlayerStatesFromRoster();
    applyActiveLocalPlayerToSurfaces(opts);
    return true;
  }

  function friendRequestPairKey(fromKey, toKey) {
    return fromKey + "->" + toKey;
  }

  function markOutgoingFriendRequest(fromKey, toKey) {
    if (!fromKey || !toKey) return;
    pendingOutgoingFriendRequests[friendRequestPairKey(fromKey, toKey)] = true;
  }

  function hasOutgoingFriendRequest(fromKey, toKey) {
    if (!fromKey || !toKey) return false;
    return !!pendingOutgoingFriendRequests[friendRequestPairKey(fromKey, toKey)];
  }

  function hasOutgoingFriendRequestFromActive(toKey) {
    return hasOutgoingFriendRequest(getActiveLocalPlayerKey(), toKey);
  }

  function clearOutgoingFriendRequest(fromKey, toKey) {
    delete pendingOutgoingFriendRequests[friendRequestPairKey(fromKey, toKey)];
  }

  function acceptLocalPlayerFriendRequest(acceptorKey, requesterKey, opts) {
    if (!acceptorKey || !requesterKey) return false;
    runtimeAddedFriendKeys[requesterKey] = acceptorKey;
    runtimeAddedFriendKeys[acceptorKey] = requesterKey;
    clearOutgoingFriendRequest(requesterKey, acceptorKey);
    syncLocalPlayerStatesFromRoster();
    applyActiveLocalPlayerToSurfaces(opts);
    return true;
  }

  function sendFriendRequestFromActiveToKey(targetKey) {
    if (!targetKey) return false;
    var fromKey = getActiveLocalPlayerKey();
    if (!fromKey || fromKey === targetKey) return false;
    if (isActiveLocalPlayerFriend(targetKey)) return false;
    if (hasOutgoingFriendRequest(fromKey, targetKey)) return false;

    var fromState = getLocalPlayerState(fromKey);
    if (!fromState) return false;

    markOutgoingFriendRequest(fromKey, targetKey);

    if (typeof window.deliverFriendRequestToPlayerKey === "function") {
      window.deliverFriendRequestToPlayerKey(
        targetKey,
        fromKey,
        fromState.handle,
        fromState.avatar
      );
    }
    return true;
  }

  function isLocalPlayerFriendKey(key) {
    return LOCAL_PLAYER_KEYS.indexOf(key) !== -1;
  }

  function getLocalPlayerKeyForIndex(index) {
    if (!(index >= 0 && index <= 3)) return "local";
    return LOCAL_PLAYER_KEYS[index] || "local";
  }

  function getActiveLocalPlayerIndex() {
    return typeof window.getActiveLocalPlayerIndex === "function"
      ? window.getActiveLocalPlayerIndex()
      : 0;
  }

  function getActiveLocalPlayerKey() {
    return getLocalPlayerKeyForIndex(getActiveLocalPlayerIndex());
  }

  function readIdentityForIndex(index) {
    var H = window.PROTOTYPE_PLAYER_HANDLES || {};
    var A = window.PROTOTYPE_PLAYER_AVATARS || {};
    var coplayers = window.PROTOTYPE_LOCAL_COPLAYERS || [];

    if (index === 0) {
      return {
        handle: H.local || "You",
        avatar: A.local || DEFAULT_AVATAR,
      };
    }

    var entry = coplayers[index - 1];
    return {
      handle: (entry && entry.handle) || "Player " + (index + 1),
      avatar: (entry && entry.avatar) || DEFAULT_AVATAR,
    };
  }

  function buildPlayerState(index) {
    var key = getLocalPlayerKeyForIndex(index);
    var identity = readIdentityForIndex(index);
    var pool = getFriendPool();
    var friendCount = getFriendsCountPerPlayer();
    var localCount = getLocalPlayerCount();
    var localFriendKeys = collectLocalFriendKeysForIndex(index, localCount);
    var existing = playerStateByKey[key];
    var remoteKeys;
    var friendKeys;

    if (
      existing &&
      existing.remoteFriendKeys &&
      existing.remoteFriendKeys.length === friendCount &&
      existing.handle === identity.handle &&
      existing.avatar === identity.avatar
    ) {
      remoteKeys = existing.remoteFriendKeys.slice();
    } else {
      remoteKeys = assignFriendKeysForPlayer(index, friendCount, pool);
    }
    friendKeys = localFriendKeys.concat(remoteKeys);

    var addedKeys = Object.keys(runtimeAddedFriendKeys);
    for (var ai = 0; ai < addedKeys.length; ai++) {
      var ak = addedKeys[ai];
      if (runtimeAddedFriendKeys[ak] !== key) continue;
      if (friendKeys.indexOf(ak) === -1) friendKeys.push(ak);
    }

    return {
      key: key,
      index: index,
      handle: identity.handle,
      avatar: identity.avatar,
      friendKeys: friendKeys,
      localFriendKeys: localFriendKeys,
      remoteFriendKeys: remoteKeys,
    };
  }

  function syncLocalPlayerStatesFromRoster() {
    var localCount = getLocalPlayerCount();
    var next = Object.create(null);

    for (var i = 0; i < localCount; i++) {
      var key = getLocalPlayerKeyForIndex(i);
      next[key] = buildPlayerState(i);
    }

    playerStateByKey = next;
    window.PROTOTYPE_LOCAL_PLAYER_STATE = playerStateByKey;
    publishLocalPlayerHandlesToPrototype();
    if (localCount > 1) {
      ensureLocalPlayerFriendCards();
    } else {
      removeLocalPlayerFriendCards();
    }
  }

  function getLocalPlayerState(key) {
    if (!key) key = getActiveLocalPlayerKey();
    return playerStateByKey[key] || null;
  }

  function getActiveLocalPlayerState() {
    return getLocalPlayerState(getActiveLocalPlayerKey());
  }

  function getHostLocalPlayerState() {
    return getLocalPlayerState("local") || getLocalPlayerState(getLocalPlayerKeyForIndex(0));
  }

  function getTvDashboardIdentityMode() {
    var app = document.getElementById("app");
    var mode = app && app.getAttribute("data-tv-dashboard-identity");
    return mode === "focused" ? "focused" : "host";
  }

  function setTvDashboardIdentityMode(mode) {
    var app = document.getElementById("app");
    if (!app) return;
    var normalized = mode === "focused" ? "focused" : "host";
    app.setAttribute("data-tv-dashboard-identity", normalized);
    var sel = document.getElementById("selTvDashboardIdentity");
    if (sel && sel.value !== normalized) sel.value = normalized;
    if (typeof window.applyActiveLocalPlayerToSurfaces === "function") {
      window.applyActiveLocalPlayerToSurfaces();
    } else {
      syncTvDashboardIdentityDisplay();
    }
  }

  function getTvDashboardDisplayHandle(rawHandle) {
    return (rawHandle || "").trim();
  }

  function syncTvDashboardIdentityDisplay() {
    applyTvDashboardIdentitySurfaces(getTvDashboardIdentityState());
  }

  /** TV Profile/Friends identity — focused controller or host when multi-local. */
  function getTvDashboardIdentityState() {
    if (!isMultiLocalSession()) return getActiveLocalPlayerState();
    if (getTvDashboardIdentityMode() === "host") {
      return getHostLocalPlayerState() || getActiveLocalPlayerState();
    }
    return getActiveLocalPlayerState();
  }

  /** NGC top row — Evolution: profile on N; Current: avatar on left pill. */
  function resolveNgcAvatarLayer(root) {
    if (!root) return null;
    if (root.classList && root.classList.contains("fc-ngc-layer")) return root;
    var layer = root.querySelector(".fc-ngc-layer:not(.is-hidden)");
    if (!layer) layer = root.querySelector('.fc-ngc-layer[data-skin="platform"]');
    return layer;
  }

  function applyNgcControlAvatars(root, avatar) {
    if (!root || !avatar) return;
    var layer = resolveNgcAvatarLayer(root);
    if (!layer) return;
    layer.querySelectorAll('[data-ngc-slot="home"] [data-ngc-profile-img]').forEach(function (img) {
      img.setAttribute("src", avatar);
      img.alt = "";
    });
    layer.querySelectorAll('[data-ngc-slot="left"] [data-fg="avatar"]').forEach(function (img) {
      img.setAttribute("src", avatar);
      img.alt = "";
    });
  }

  function applyActiveLocalPlayerIdentity(state) {
    if (!state) return;

    var handleEls = document.querySelectorAll(
      '#fcMobileDashboard [data-prototype-player-handle="local"]'
    );
    for (var i = 0; i < handleEls.length; i++) {
      handleEls[i].textContent = state.handle;
    }

    var mobileAv = document.querySelector("#fcMobileDashboard .fc-mobile-dash__avatar");
    if (mobileAv) {
      mobileAv.setAttribute("src", state.avatar);
      mobileAv.alt = "";
    }

    applyNgcControlAvatars(document.getElementById("fcNgcRoot"), state.avatar);

    if (typeof window.PrototypePresence !== "undefined") {
      window.PrototypePresence.syncMobileLocalProfilePresence();
    }
  }

  function applyTvDashboardIdentitySurfaces(state) {
    if (!state) return;

    var handleEls = document.querySelectorAll(
      '.tv-dashboard__profile-focus-handle [data-prototype-player-handle="local"], ' +
        '.tv-dashboard__nav-item[data-state-id="profile"] .tv-dashboard__nav-item__handle'
    );
    for (var i = 0; i < handleEls.length; i++) {
      handleEls[i].textContent = getTvDashboardDisplayHandle(state.handle);
    }

    var profImg = document.querySelector(".tv-dashboard__profile-focus-avatar-img");
    if (profImg) {
      profImg.setAttribute("src", state.avatar);
      profImg.alt = "";
    }

    var navProfileAv = document.querySelector(
      '.tv-dashboard__nav-item[data-state-id="profile"] .tv-dashboard__nav-item__icon img'
    );
    if (navProfileAv) {
      navProfileAv.setAttribute("src", state.avatar);
      navProfileAv.alt = "";
    }

    if (typeof window.PrototypePresence !== "undefined") {
      window.PrototypePresence.syncProfileFocusPresence();
    }

    if (typeof window.refreshTvDashboardProfileFocusLayer === "function") {
      window.refreshTvDashboardProfileFocusLayer();
    }
  }

  function applyActiveLocalPlayerFriendsVisibility(state) {
    var friendsRoot = document.getElementById("tvDashboardFriendsFocus");
    var cardsWrap =
      friendsRoot && friendsRoot.querySelector(".tv-dashboard__friends-focus-player-cards");
    var emptyEl = document.getElementById("tvDashboardFriendsFocusEmpty");
    var pool = getFriendPool();
    var localCount = getLocalPlayerCount();
    var fi;

    if (!cardsWrap) return;

    var allCards = cardsWrap.querySelectorAll(".tv-dashboard__friends-focus-player-card");
    for (fi = 0; fi < allCards.length; fi++) {
      setFriendCardVisible(allCards[fi], false);
    }

    for (fi = 0; fi < pool.length; fi++) {
      var invItem = document.querySelector(
        '#tvDashboardInviteShell .game-invite-list__item[data-player-panel-handle-key="' +
          pool[fi] +
          '"]'
      );
      setInviteItemVisible(invItem, false);
    }

    var visibleCount = 0;
    if (state && state.friendKeys) {
      for (fi = 0; fi < state.friendKeys.length; fi++) {
        var key = state.friendKeys[fi];
        var playerState = playerStateByKey[key];
        var inSession =
          !isLocalPlayerFriendKey(key) || (playerState && playerState.index < localCount);
        if (!inSession) continue;

        var cards = cardsWrap.querySelectorAll(
          '.tv-dashboard__friends-focus-player-card[data-player-panel-handle-key="' + key + '"]'
        );
        if (cards.length > 1 && isLocalPlayerFriendKey(key)) {
          dedupeLocalPlayerFriendCards(cardsWrap);
          cards = cardsWrap.querySelectorAll(
            '.tv-dashboard__friends-focus-player-card[data-player-panel-handle-key="' + key + '"]'
          );
        }
        if (cards.length) {
          setFriendCardVisible(cards[0], true);
          visibleCount++;
        }

        if (!isLocalPlayerFriendKey(key)) {
          var inviteEl = document.querySelector(
            '#tvDashboardInviteShell .game-invite-list__item[data-player-panel-handle-key="' +
              key +
              '"]'
          );
          setInviteItemVisible(inviteEl, true);
        }
      }
    }

    cardsWrap.hidden = visibleCount === 0;
    cardsWrap.setAttribute("aria-hidden", visibleCount === 0 ? "true" : "false");
    if (emptyEl) {
      emptyEl.hidden = visibleCount > 0;
      emptyEl.setAttribute("aria-hidden", visibleCount > 0 ? "true" : "false");
    }

    if (typeof window.sortFriendsFocusPlayerCardsByPresenceAndGame === "function") {
      window.sortFriendsFocusPlayerCardsByPresenceAndGame();
    }
  }

  function applyActiveLocalPlayerToSurfaces(opts) {
    opts = opts || {};
    if (!isMultiLocalSession()) {
      removeLocalPlayerFriendCards();
      if (typeof window.applyPrototypeFriendsCount === "function") {
        window.applyPrototypeFriendsCount(getFriendsCountPerPlayer());
      }
      if (typeof window.syncLocalProfileAvatarSurfaces === "function") {
        window.syncLocalProfileAvatarSurfaces();
      }
      syncTvDashboardIdentityDisplay();
      if (typeof window.syncMobileDashboardFriendsList === "function") {
        window.syncMobileDashboardFriendsList();
      }
      if (typeof window.syncMobileDashboardPlayerList === "function") {
        window.syncMobileDashboardPlayerList();
      }
      if (
        !opts.skipNotificationListSync &&
        typeof window.syncNotificationsForActiveLocalPlayer === "function"
      ) {
        window.syncNotificationsForActiveLocalPlayer();
      }
      if (typeof window.syncLocalPlayerPresenceUi === "function") {
        window.syncLocalPlayerPresenceUi();
      }
      return;
    }

    var state = getActiveLocalPlayerState();
    applyActiveLocalPlayerIdentity(state);

    var tvState = getTvDashboardIdentityState();
    applyTvDashboardIdentitySurfaces(tvState);
    applyActiveLocalPlayerFriendsVisibility(tvState);

    if (typeof window.syncMobileDashboardFriendsList === "function") {
      window.syncMobileDashboardFriendsList();
    }
    if (typeof window.syncMobileDashboardPlayerList === "function") {
      window.syncMobileDashboardPlayerList();
    }
    if (
      !opts.skipNotificationListSync &&
      typeof window.syncNotificationsForActiveLocalPlayer === "function"
    ) {
      window.syncNotificationsForActiveLocalPlayer();
    }
    if (typeof window.syncAchievementsForActiveLocalPlayer === "function") {
      window.syncAchievementsForActiveLocalPlayer();
    }
    if (typeof window.syncTvInvitePanelLayout === "function") {
      window.syncTvInvitePanelLayout();
    }
    if (typeof window.syncLocalPlayerPresenceUi === "function") {
      window.syncLocalPlayerPresenceUi();
    }
  }

  function refreshLocalPlayerData() {
    syncLocalPlayerStatesFromRoster();
    if (typeof window.syncLocalPlayerNotificationTracks === "function") {
      window.syncLocalPlayerNotificationTracks();
    }
    if (typeof window.syncLocalPlayerAchievementTracks === "function") {
      window.syncLocalPlayerAchievementTracks();
    }
    applyActiveLocalPlayerToSurfaces();
    if (isMultiLocalSession() && typeof window.syncControllerDock === "function") {
      window.syncControllerDock({ forceRerender: true });
    }
  }

  function captureActiveLocalPlayerMobileUi(playerKey) {
    if (!playerKey || !isMultiLocalSession()) return;
    if (typeof window.captureMobileDashboardUiForLocalPlayer === "function") {
      window.captureMobileDashboardUiForLocalPlayer(playerKey);
    }
    if (typeof window.captureMobileDetailUiForLocalPlayer === "function") {
      window.captureMobileDetailUiForLocalPlayer(playerKey);
    }
  }

  function resetActiveLocalPlayerMobileUi() {
    if (!isMultiLocalSession()) return;
    if (typeof window.closeAllMobilePopoverMenus === "function") {
      window.closeAllMobilePopoverMenus();
    }
    if (typeof window.resetActiveLocalPlayerMobileDashboardUi === "function") {
      window.resetActiveLocalPlayerMobileDashboardUi();
    }
    if (typeof window.resetActiveLocalPlayerMobileDetailUi === "function") {
      window.resetActiveLocalPlayerMobileDetailUi();
    }
  }

  function restoreActiveLocalPlayerMobileUi(playerKey) {
    if (!playerKey || !isMultiLocalSession()) return;
    if (typeof window.restoreMobileDashboardUiForLocalPlayer === "function") {
      window.restoreMobileDashboardUiForLocalPlayer(playerKey);
    }
    if (typeof window.restoreMobileDetailUiForLocalPlayer === "function") {
      window.restoreMobileDetailUiForLocalPlayer(playerKey);
    }
  }

  function beginLocalPlayerControllerSwap() {
    if (!isMultiLocalSession()) return;
    var dash = document.getElementById("fcMobileDashboard");
    if (dash) dash.setAttribute("data-local-player-swap", "1");
  }

  function endLocalPlayerControllerSwap() {
    var dash = document.getElementById("fcMobileDashboard");
    if (!dash || dash.getAttribute("data-local-player-swap") !== "1") return;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        dash.removeAttribute("data-local-player-swap");
      });
    });
  }

  /**
   * Mobile dashboard Player List — everyone in the session except the active local profile.
   */
  function collectPlayerListEntriesForActiveLocalPlayer() {
    var activeIndex = getActiveLocalPlayerIndex();
    var localCount = getLocalPlayerCount();
    var entries = [];

    if (localCount > 1 && activeIndex !== 0) {
      var hostState = getLocalPlayerState("local");
      if (hostState) {
        entries.push({
          key: hostState.key,
          handle: hostState.handle,
          avatar: hostState.avatar,
          online: false,
        });
      }
    }

    for (var i = 1; i < localCount; i++) {
      if (i === activeIndex) continue;
      var localState = getLocalPlayerState(getLocalPlayerKeyForIndex(i));
      if (!localState) continue;
      entries.push({
        key: localState.key,
        handle: localState.handle,
        avatar: localState.avatar,
        online: false,
      });
    }

    var online = window.PROTOTYPE_ONLINE_COPLAYERS || [];
    for (var j = 0; j < online.length; j++) {
      entries.push(online[j]);
    }

    return entries;
  }

  /** Active local profile — first row in the Players panel. */
  function activeLocalPlayerListEntry() {
    var state = getActiveLocalPlayerState();
    if (!state) return null;
    return {
      key: state.key,
      handle: state.handle,
      avatar: state.avatar,
      online: false,
      isSelf: true,
    };
  }

  function playerListRosterForDashboard() {
    var roster;
    if (isMultiLocalSession()) {
      roster = collectPlayerListEntriesForActiveLocalPlayer();
    } else if (window.PROTOTYPE_SESSION_COPLAYERS && window.PROTOTYPE_SESSION_COPLAYERS.length) {
      roster = window.PROTOTYPE_SESSION_COPLAYERS.slice();
    } else {
      roster = (window.PROTOTYPE_LOCAL_COPLAYERS || []).slice();
    }

    var self = activeLocalPlayerListEntry();
    if (self) {
      var alreadyListed = false;
      for (var i = 0; i < roster.length; i++) {
        if (roster[i].key === self.key) {
          alreadyListed = true;
          break;
        }
      }
      if (!alreadyListed) roster = [self].concat(roster);
    }

    return roster;
  }

  function initLocalPlayerState() {
    var selIdentity = document.getElementById("selTvDashboardIdentity");
    if (selIdentity) {
      setTvDashboardIdentityMode(selIdentity.value || "host");
      selIdentity.addEventListener("change", function () {
        setTvDashboardIdentityMode(selIdentity.value);
      });
    }

    var selFriends = document.getElementById("selFriendsCount");
    if (selFriends) {
      selFriends.addEventListener("change", function () {
        window.requestAnimationFrame(refreshLocalPlayerData);
      });
    }

    document.querySelectorAll(".control-count-toggle").forEach(function (root) {
      root.addEventListener("click", function () {
        window.requestAnimationFrame(refreshLocalPlayerData);
      });
    });

    refreshLocalPlayerData();
  }

  window.syncLocalPlayerStatesFromRoster = syncLocalPlayerStatesFromRoster;
  window.applyActiveLocalPlayerToSurfaces = applyActiveLocalPlayerToSurfaces;
  window.applyActiveLocalPlayerFriendsVisibility = applyActiveLocalPlayerFriendsVisibility;
  window.getActiveLocalPlayerKey = getActiveLocalPlayerKey;
  window.getLocalPlayerKeyForIndex = getLocalPlayerKeyForIndex;
  window.getActiveLocalPlayerState = getActiveLocalPlayerState;
  window.getLocalPlayerState = getLocalPlayerState;
  window.refreshLocalPlayerData = refreshLocalPlayerData;
  window.captureActiveLocalPlayerMobileUi = captureActiveLocalPlayerMobileUi;
  window.resetActiveLocalPlayerMobileUi = resetActiveLocalPlayerMobileUi;
  window.restoreActiveLocalPlayerMobileUi = restoreActiveLocalPlayerMobileUi;
  window.beginLocalPlayerControllerSwap = beginLocalPlayerControllerSwap;
  window.endLocalPlayerControllerSwap = endLocalPlayerControllerSwap;
  window.isMultiLocalSession = isMultiLocalSession;
  window.playerListRosterForDashboard = playerListRosterForDashboard;
  window.removeLocalPlayerFriendCards = removeLocalPlayerFriendCards;
  window.getActiveLocalPlayerFriendKeys = getActiveLocalPlayerFriendKeys;
  window.isActiveLocalPlayerFriend = isActiveLocalPlayerFriend;
  window.addActiveLocalPlayerFriend = addActiveLocalPlayerFriend;
  window.hasOutgoingFriendRequestFromActive = hasOutgoingFriendRequestFromActive;
  window.sendFriendRequestFromActiveToKey = sendFriendRequestFromActiveToKey;
  window.acceptLocalPlayerFriendRequest = acceptLocalPlayerFriendRequest;
  window.isLocalPlayerFriendKey = isLocalPlayerFriendKey;
  window.getNonFriendLocalPlayerIndex = getNonFriendLocalPlayerIndex;
  window.getNonFriendLocalPlayerKey = getNonFriendLocalPlayerKey;
  window.isNonFriendLocalPlayerKey = isNonFriendLocalPlayerKey;
  window.isNonFriendLocalPlayerForActive = isNonFriendLocalPlayerForActive;
  window.getTvDashboardIdentityMode = getTvDashboardIdentityMode;
  window.setTvDashboardIdentityMode = setTvDashboardIdentityMode;
  window.getTvDashboardIdentityState = getTvDashboardIdentityState;
  window.getTvDashboardDisplayHandle = getTvDashboardDisplayHandle;
  window.syncTvDashboardIdentityDisplay = syncTvDashboardIdentityDisplay;
  window.applyTvDashboardIdentitySurfaces = applyTvDashboardIdentitySurfaces;
  window.applyNgcControlAvatars = applyNgcControlAvatars;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLocalPlayerState);
  } else {
    initLocalPlayerState();
  }
})();
