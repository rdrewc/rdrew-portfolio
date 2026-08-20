/**
 * Evolution mobile dashboard — mirrors TV dashboard friend roster (Friends strip + invite list).
 */
(function () {
  "use strict";

  var FRIEND_KEYS =
    window.PROTOTYPE_FRIEND_LIST_KEYS || ["list-0", "list-1", "list-2", "list-3", "list-4"];
  var HOME_FRIENDS_PREVIEW_LIMIT = 3;
  var HOME_FRIENDS_TOP5_LIMIT = 5;
  var friendsL2Open = false;
  var friendsL2Animating = false;
  var addPlayersL2Open = false;
  var addPlayersL2Animating = false;
  var achievementsL2Open = false;
  var achievementsL2Animating = false;
  var controllerSettingsL2Open = false;
  var controllerSettingsL2Animating = false;
  var findFriendsL2Open = false;
  var findFriendsL2Animating = false;
  var findFriendsSearchTimer = null;
  /** @type {Record<string, { l2: string|null }>} */
  var mobileDashboardUiByPlayerKey = Object.create(null);
  var controllerHapticsEnabled = true;
  var controllerSoundEnabled = true;
  var controllerMicEnabled = false;
  var controllerMicLevel = 40;
  var INVITE_FRIEND_LOAD_MS = 1500;
  var STATUS_DOT_ONLINE = "assets/raster/game-invite-1-6683/status-online-dot.svg";
  var STATUS_DOT_OFFLINE = "assets/raster/game-invite-1-6683/status-offline-dot.png";

  function presenceApi() {
    return window.PrototypePresence || null;
  }

  function appendListRowMoreMenu(row, options) {
    if (!row || typeof window.createMobileListRowMoreMenu !== "function") return;
    row.appendChild(window.createMobileListRowMoreMenu(options || {}));
  }
  /** @type {Record<string, { phase: string, endsAt: number, timerId: number }>} */
  var inviteFlowByKey = Object.create(null);

  function isMultiLocalAchievements() {
    return (
      typeof window.isMultiLocalSession === "function" &&
      window.isMultiLocalSession() &&
      typeof window.getActiveLocalPlayerAchievementEntries === "function"
    );
  }

  function localSessionGameTitle() {
    var refRaw = window.PROTOTYPE_LOCAL_SESSION_GAME_TITLE;
    return (typeof refRaw === "string" ? refRaw : "").replace(/\s+/g, " ").trim() || "FIFA World Cup";
  }

  function normalizeIdentityText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function findSessionCoplayerForIdentity(handle, avatar, key) {
    var roster = sessionCoplayerRoster();
    var hh = normalizeIdentityText(handle).toLowerCase();
    var av = (avatar || "").trim();
    for (var i = 0; i < roster.length; i++) {
      var r = roster[i];
      if (key && r.key === key) return r;
      var rh = normalizeIdentityText(r.handle).toLowerCase();
      if (hh && rh && hh === rh) return r;
      if (av && r.avatar && av === String(r.avatar).trim()) return r;
    }
    return null;
  }

  function composeFriendEntryStatus(online, idle, gameTitle) {
    var P = presenceApi();
    if (P) {
      return P.formatOnlinePlayerStatus({
        state: !online ? P.STATE_OFFLINE : idle ? P.STATE_IDLE : P.STATE_ONLINE,
        gameTitle: gameTitle,
      });
    }
    if (!online) return "Offline";
    if (gameTitle) return gameTitle;
    return "Online";
  }

  function isLocalPlayerFriendKey(key) {
    return (
      key &&
      typeof window.isLocalPlayerFriendKey === "function" &&
      window.isLocalPlayerFriendKey(key)
    );
  }

  function localPlayerFriendAppearsOfflineToOthers(key) {
    return (
      isLocalPlayerFriendKey(key) &&
      typeof window.isLocalPlayerAppearOfflineToOthers === "function" &&
      window.isLocalPlayerAppearOfflineToOthers(key)
    );
  }

  /** Same buckets as `sortFriendsFocusPlayerCardsByPresenceAndGame` in tv-dashboard.js. */
  function buildFriendEntry(key, PH, PA, refLower) {
    var card = document.querySelector(
      '.tv-dashboard__friends-focus-player-card[data-player-panel-handle-key="' + key + '"]'
    );
    var invItem = document.querySelector(
      '#tvDashboardInviteShell .game-invite-list__item[data-player-panel-handle-key="' + key + '"]'
    );

    var handle = PH[key] ? normalizeIdentityText(PH[key]) : "";
    if (!handle && typeof window.getLocalPlayerState === "function") {
      var localState = window.getLocalPlayerState(key);
      if (localState && localState.handle) handle = localState.handle;
    }
    if (!handle && card) {
      var cardName =
        card.querySelector('[data-prototype-player-handle="' + key + '"]') ||
        card.querySelector(".tv-dashboard__friends-focus-handle-name span");
      handle = cardName ? normalizeIdentityText(cardName.textContent) : "";
    }
    if (!handle && invItem) {
      var listName =
        invItem.querySelector('[data-prototype-player-handle="' + key + '"]') ||
        invItem.querySelector(".game-invite-list__name span") ||
        invItem.querySelector(".game-invite-list__name");
      handle = listName ? normalizeIdentityText(listName.textContent) : "";
    }

    var avatar = PA[key] ? String(PA[key]).trim() : "";
    if (!avatar && typeof window.getLocalPlayerState === "function") {
      var localAvatarState = window.getLocalPlayerState(key);
      if (localAvatarState && localAvatarState.avatar) avatar = localAvatarState.avatar;
    }
    if (!avatar && card) {
      var cardImg = card.querySelector(".tv-dashboard__friends-focus-player-avatar-img");
      avatar = cardImg ? cardImg.getAttribute("src") || "" : "";
    }
    if (!avatar && invItem) {
      var invImg = invItem.querySelector(".game-invite-list__avatar img");
      avatar = invImg ? invImg.getAttribute("src") || "" : "";
    }

    if (!handle && !avatar) return null;
    if (card && card.hidden && !card.hasAttribute("data-local-player-friend")) {
      if (!invItem || invItem.hidden) return null;
      card = null;
    }
    if (!card && invItem && invItem.hidden) return null;

    var online = false;
    var idle = false;
    var gameTitle = "";
    if (card) {
      online = card.classList.contains("tv-dashboard__friends-focus-player-card--online");
      var cardTitleEl = card.querySelector(".tv-dashboard__friends-focus-player-game-title");
      gameTitle = cardTitleEl ? normalizeIdentityText(cardTitleEl.textContent) : "";
      var cardMeta = card.querySelector(".tv-dashboard__friends-focus-player-meta");
      var cardMetaVisible = !!(cardMeta && !cardMeta.hidden);
      idle = online && (!gameTitle || !cardMetaVisible);
    } else if (invItem) {
      online = !!invItem.querySelector(".game-invite-list__status--online");
      idle = !!invItem.querySelector(".game-invite-list__status--idle");
    }

    var statusText;
    var invStatus = invItem && invItem.querySelector(".game-invite-list__status");
    if (invStatus && !card) {
      var invLabel = invStatus.querySelector("span");
      statusText = invLabel ? normalizeIdentityText(invLabel.textContent) : "";
      online =
        invStatus.classList.contains("game-invite-list__status--online") ||
        invStatus.classList.contains("game-invite-list__status--idle");
      idle = invStatus.classList.contains("game-invite-list__status--idle");
      if (/offline/i.test(statusText)) online = false;
      else if (statusText && !/^online$/i.test(statusText) && !/^offline$/i.test(statusText)) {
        gameTitle = statusText;
        idle = false;
      } else if (/^online$/i.test(statusText)) idle = true;
    }

    var sessionMatch = findSessionCoplayerForIdentity(handle, avatar, key);
    if (sessionMatch && !localPlayerFriendAppearsOfflineToOthers(key)) {
      online = true;
      if (!gameTitle) idle = true;
    }

    if (localPlayerFriendAppearsOfflineToOthers(key)) {
      online = false;
      idle = false;
      gameTitle = "";
      statusText = composeFriendEntryStatus(false, false, "");
    } else if (!statusText) {
      statusText = composeFriendEntryStatus(online, idle, gameTitle);
    } else if (sessionMatch) {
      statusText = composeFriendEntryStatus(online, idle, gameTitle);
    }

    var playing = !!gameTitle;
    var sameGame = playing && gameTitle.toLowerCase() === refLower;
    var tier;
    if (!online) tier = 3;
    else if (playing && sameGame) tier = 0;
    else if (playing) tier = 1;
    else tier = 2;

    return {
      key: key,
      handle: handle,
      avatar: avatar,
      online: online,
      idle: idle,
      gameTitle: gameTitle,
      statusText: statusText,
      tier: tier,
    };
  }

  function collectDynamicFriendKeys() {
    var seen = Object.create(null);
    var extra = [];
    var i;
    for (i = 0; i < FRIEND_KEYS.length; i++) seen[FRIEND_KEYS[i]] = true;

    var cards = document.querySelectorAll(
      ".tv-dashboard__friends-focus-player-card[data-player-panel-handle-key]"
    );
    for (i = 0; i < cards.length; i++) {
      if (cards[i].hasAttribute("data-local-player-friend")) continue;
      var cardKey = cards[i].getAttribute("data-player-panel-handle-key");
      if (cardKey && !seen[cardKey] && !cards[i].hidden) {
        seen[cardKey] = true;
        extra.push(cardKey);
      }
    }

    var items = document.querySelectorAll(
      '#tvDashboardInviteShell .game-invite-list__item[data-player-panel-handle-key]:not(.game-invite-list__item--share)'
    );
    for (i = 0; i < items.length; i++) {
      var itemKey = items[i].getAttribute("data-player-panel-handle-key");
      if (itemKey && !seen[itemKey] && !items[i].hidden) {
        seen[itemKey] = true;
        extra.push(itemKey);
      }
    }

    return extra;
  }

  function sortFriendEntries(entries) {
    entries.sort(function (a, b) {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return (a.handle || "").localeCompare(b.handle || "", undefined, { sensitivity: "base" });
    });
    return entries.filter(function (e) {
      return !!(e.handle || e.avatar);
    });
  }

  function collectFriendEntriesForKeys(keys) {
    var PH = window.PROTOTYPE_PLAYER_HANDLES || {};
    var PA = window.PROTOTYPE_PLAYER_AVATARS || {};
    var refLower = localSessionGameTitle().toLowerCase();
    var entries = [];
    var seen = Object.create(null);
    var i;

    for (i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!key || seen[key]) continue;
      seen[key] = true;
      var entry = buildFriendEntry(key, PH, PA, refLower);
      if (entry) entries.push(entry);
    }

    return sortFriendEntries(entries);
  }

  function collectTvDashboardFriendEntries() {
    if (typeof window.isMultiLocalSession === "function" && window.isMultiLocalSession()) {
      var keys =
        typeof window.getActiveLocalPlayerFriendKeys === "function"
          ? window.getActiveLocalPlayerFriendKeys()
          : [];
      if (keys.length) {
        return collectFriendEntriesForKeys(keys);
      }
    }

    var PH = window.PROTOTYPE_PLAYER_HANDLES || {};
    var PA = window.PROTOTYPE_PLAYER_AVATARS || {};
    var refLower = localSessionGameTitle().toLowerCase();
    var entries = [];
    var seen = Object.create(null);
    var i;

    for (i = 0; i < FRIEND_KEYS.length; i++) {
      var staticKey = FRIEND_KEYS[i];
      if (seen[staticKey]) continue;
      var staticEntry = buildFriendEntry(staticKey, PH, PA, refLower);
      if (staticEntry) {
        seen[staticEntry.key] = true;
        entries.push(staticEntry);
      }
    }

    var dynamicKeys = collectDynamicFriendKeys();
    for (i = 0; i < dynamicKeys.length; i++) {
      var dynamicKey = dynamicKeys[i];
      if (seen[dynamicKey]) continue;
      var dynamicEntry = buildFriendEntry(dynamicKey, PH, PA, refLower);
      if (dynamicEntry) {
        seen[dynamicEntry.key] = true;
        entries.push(dynamicEntry);
      }
    }

    return sortFriendEntries(entries);
  }

  function friendEntryPresenceState(entry) {
    var P = presenceApi();
    if (!entry.online) return P ? P.STATE_OFFLINE : "offline";
    if (entry.idle) return P ? P.STATE_IDLE : "idle";
    return P ? P.STATE_ONLINE : "online";
  }

  function friendEntryStatusLabel(entry) {
    if (entry.statusText) return entry.statusText;
    var P = presenceApi();
    return P
      ? P.formatOnlinePlayerStatus({
          state: friendEntryPresenceState(entry),
          gameTitle: entry.gameTitle || "",
        })
      : entry.online
        ? "Online"
        : "Offline";
  }

  function createMobileInviteButton() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fc-mobile-dash__invite-btn";

    var label = document.createElement("span");
    label.className = "fc-mobile-dash__invite-btn-label";
    label.textContent = "Invite";
    btn.appendChild(label);

    var loader = document.createElement("span");
    loader.className = "fc-mobile-dash__invite-btn-loader";
    loader.setAttribute("aria-hidden", "true");
    var loaderImg = document.createElement("img");
    loaderImg.src = "assets/raster/invite-btn-states-56-6141/Loader.png";
    loaderImg.width = 18;
    loaderImg.height = 18;
    loaderImg.alt = "";
    loaderImg.decoding = "async";
    loader.appendChild(loaderImg);
    btn.appendChild(loader);

    var confirm = document.createElement("span");
    confirm.className = "fc-mobile-dash__invite-btn-confirm";
    confirm.setAttribute("aria-hidden", "true");
    var confirmImg = document.createElement("img");
    confirmImg.src = "assets/raster/invite-btn-states-56-6141/circle-checkmark.png";
    confirmImg.width = 18;
    confirmImg.height = 18;
    confirmImg.alt = "";
    confirmImg.decoding = "async";
    confirm.appendChild(confirmImg);
    var confirmText = document.createElement("span");
    confirmText.className = "fc-mobile-dash__invite-btn-confirm-text";
    confirmText.textContent = "Sent";
    confirm.appendChild(confirmText);
    btn.appendChild(confirm);

    return btn;
  }

  function buildInviteFriendRow(entry, index) {
    var li = document.createElement("li");
    li.className = "fc-mobile-notif__item fc-mobile-notif__item--avatar-thumb";
    li.setAttribute("data-player-panel-handle-key", entry.key);

    var wrap = document.createElement("div");
    wrap.className = "fc-mobile-notif__item-wrap";

    var card = document.createElement("div");
    card.className = "fc-mobile-notif__card";

    var row = document.createElement("div");
    row.className = "fc-mobile-notif__row";

    var thumb = document.createElement("div");
    thumb.className = "fc-mobile-notif__thumb";
    var avatarImg = document.createElement("img");
    avatarImg.className = "fc-mobile-notif__thumb-game";
    avatarImg.alt = "";
    avatarImg.decoding = "async";
    avatarImg.src = entry.avatar || defaultHomeFriendAvatar();
    thumb.appendChild(avatarImg);

    var text = document.createElement("div");
    text.className = "fc-mobile-notif__text";
    var title = document.createElement("p");
    title.className = "fc-mobile-notif__title";
    title.textContent = entry.handle || "Friend";
    text.appendChild(title);
    var body = document.createElement("p");
    body.className = "fc-mobile-notif__body";
    body.textContent = friendEntryStatusLabel(entry);
    text.appendChild(body);

    row.appendChild(thumb);
    row.appendChild(text);
    row.appendChild(createMobileInviteButton());

    var P = presenceApi();
    if (P) P.applyPresenceToAvatar(thumb, friendEntryPresenceState(entry));

    card.appendChild(row);
    wrap.appendChild(card);
    li.appendChild(wrap);
    return li;
  }

  function defaultHomeFriendAvatar() {
    var PA = window.PROTOTYPE_PLAYER_AVATARS || {};
    return PA["list-0"] || "assets/profile-avatars/type-01-scarlet.png";
  }

  var FIND_FRIENDS_SUGGESTED_ENTRIES = [
    {
      key: "find-snorlax2",
      handle: "Snorlax2",
      subtitle: "Profile on this account",
      avatar: "assets/profile-avatars/type-02-psyduck.png",
      online: true,
      idle: false,
      gameTitle: "",
    },
    {
      key: "find-nosferatu",
      handle: "Nosferatu",
      subtitle: "Profile on this account",
      avatar: "assets/profile-avatars/type-03-zoro.png",
      online: false,
      idle: false,
      gameTitle: "",
    },
  ];

  var FIND_FRIENDS_SEARCHABLE_ENTRIES = FIND_FRIENDS_SUGGESTED_ENTRIES.concat([
    {
      key: "find-nostromo",
      handle: "Nostromo",
      subtitle: "Profile on this account",
      avatar: "assets/profile-avatars/type-04-mudkip.png",
      online: true,
      idle: false,
      gameTitle: "",
    },
    { key: "find-james",    handle: "James",    avatar: "assets/profile-avatars/type-01-geralt.png", online: true,  idle: false, gameTitle: "" },
    { key: "find-emma",     handle: "Emma",     avatar: "assets/profile-avatars/type-02-nami.png",   online: true,  idle: false, gameTitle: "" },
    { key: "find-liam",     handle: "Liam",     avatar: "assets/profile-avatars/type-01-luffy.png",  online: true,  idle: false, gameTitle: "" },
    { key: "find-olivia",   handle: "Olivia",   avatar: "assets/profile-avatars/type-03-robin.png",  online: true,  idle: false, gameTitle: "" },
    { key: "find-noah",     handle: "Noah",     avatar: "assets/profile-avatars/type-04-usopp.png",  online: true,  idle: false, gameTitle: "" },
    { key: "find-ava",      handle: "Ava",      avatar: "assets/profile-avatars/type-03-yen.png",    online: true,  idle: false, gameTitle: "" },
    { key: "find-ethan",    handle: "Ethan",    avatar: "assets/profile-avatars/type-05-sanji.png",  online: true,  idle: false, gameTitle: "" },
    { key: "find-sophia",   handle: "Sophia",   avatar: "assets/profile-avatars/type-02-ciri.png",   online: true,  idle: false, gameTitle: "" },
    { key: "find-mason",    handle: "Mason",    avatar: "assets/profile-avatars/type-04-nick.png",   online: true,  idle: false, gameTitle: "" },
    { key: "find-mia",      handle: "Mia",      avatar: "assets/profile-avatars/type-05-jade.png",   online: true,  idle: false, gameTitle: "" },
  ]);

  // Shared "friend request sent" state, keyed by entry.key, so the row "+"
  // button and the profile-card CTA stay in sync per profile.
  var FF_ADD_ICON =
    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
    '<circle cx="5.5" cy="4.5" r="2.5" stroke="currentColor" stroke-width="1.3" />' +
    '<path d="M1 12c0-2.2 2-3.6 4.5-3.6S10 9.8 10 12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />' +
    '<path d="M11 5v3.5M9.25 6.75h3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />' +
    "</svg>";
  var FF_CHECK_ICON =
    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
    '<path d="M2.5 7.4L5.5 10.4L11.5 3.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />' +
    "</svg>";
  var FF_ADD_SPINNER = '<span class="fc-mobile-dash__find-friends-add-btn-spinner" aria-hidden="true"></span>';

  // Row "+" and the profile card's Send Friend Request share the real outgoing
  // friend-request state, so sending from one is reflected in the other.
  function isFindFriendRequestSent(entry) {
    return !!(
      entry &&
      entry.key &&
      typeof window.hasOutgoingFriendRequestFromActive === "function" &&
      window.hasOutgoingFriendRequestFromActive(entry.key)
    );
  }

  function applyFindFriendAddBtnState(btn, entry) {
    var sent = isFindFriendRequestSent(entry);
    btn.classList.remove("is-loading");
    btn.disabled = sent;
    btn.classList.toggle("is-sent", sent);
    btn.innerHTML = sent ? FF_CHECK_ICON : FF_ADD_ICON;
    btn.setAttribute(
      "aria-label",
      sent ? (entry.handle || "Friend") + " request sent" : "Add " + (entry.handle || "friend")
    );
  }

  function applyFindFriendProfileCardBtnState() {
    var root = document.getElementById("fcMobileFindFriendsProfileCard");
    var cta = document.getElementById("fcMobileFindFriendsProfileSendBtn");
    if (!root || !cta) return;
    var label = cta.querySelector(".fc-mobile-profile-card__cta-label");
    var sent = isFindFriendRequestSent(findFriendsProfileCardEntry);
    root.classList.remove("fc-mobile-profile-card--loading");
    root.classList.toggle("fc-mobile-profile-card--sent", sent);
    cta.disabled = sent;
    if (label) label.textContent = sent ? "Friend Request Sent" : "Send Friend Request";
  }

  function syncFindFriendRequestUi(entry) {
    if (!entry || !entry.key) return;
    var rows = document.querySelectorAll('[data-find-friends-handle-key="' + entry.key + '"]');
    for (var i = 0; i < rows.length; i++) {
      var b = rows[i].querySelector(".fc-mobile-dash__find-friends-add-btn");
      if (b) applyFindFriendAddBtnState(b, entry);
    }
    if (findFriendsProfileCardEntry && findFriendsProfileCardEntry.key === entry.key) {
      applyFindFriendProfileCardBtnState();
    }
  }

  function sendFindFriendRequest(entry) {
    if (!entry || !entry.key || isFindFriendRequestSent(entry)) return;
    if (typeof window.sendFriendRequestFromActiveToKey === "function") {
      window.sendFriendRequestFromActiveToKey(entry.key);
    }
    if (typeof window.showMobileDashboardStatusToast === "function") {
      window.showMobileDashboardStatusToast({
        message: "Friend request sent to " + (entry.handle || "player"),
        iconKey: "userAddSmall",
      });
    }
    syncFindFriendRequestUi(entry);
  }

  function createFindFriendsAddButton(entry) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fc-mobile-dash__find-friends-add-btn";
    applyFindFriendAddBtnState(btn, entry);
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (btn.disabled || btn.classList.contains("is-loading")) return;
      if (isFindFriendRequestSent(entry)) return;
      // Quick loading spinner, then send → check icon (via syncFindFriendRequestUi).
      btn.classList.add("is-loading");
      btn.innerHTML = FF_ADD_SPINNER;
      window.setTimeout(function () {
        sendFindFriendRequest(entry);
      }, 600);
    });
    return btn;
  }

  function buildFindFriendRow(entry) {
    var li = document.createElement("li");
    li.className = "fc-mobile-notif__item fc-mobile-notif__item--avatar-thumb";
    li.setAttribute("data-find-friends-handle-key", entry.key);

    var wrap = document.createElement("div");
    wrap.className = "fc-mobile-notif__item-wrap";

    var card = document.createElement("div");
    card.className = "fc-mobile-notif__card";
    // Whole cell is tappable → opens the existing player/profile card component
    // (non-friend variant, since these aren't friends yet).
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.addEventListener("click", function () {
      openFindFriendPlayerCard(entry, li);
    });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openFindFriendPlayerCard(entry, li);
      }
    });

    var row = document.createElement("div");
    row.className = "fc-mobile-notif__row";

    var thumb = document.createElement("div");
    thumb.className = "fc-mobile-notif__thumb";
    var avatarImg = document.createElement("img");
    avatarImg.className = "fc-mobile-notif__thumb-game";
    avatarImg.alt = "";
    avatarImg.decoding = "async";
    avatarImg.src = entry.avatar || defaultHomeFriendAvatar();
    thumb.appendChild(avatarImg);

    var text = document.createElement("div");
    text.className = "fc-mobile-notif__text";
    var title = document.createElement("p");
    title.className = "fc-mobile-notif__title";
    title.textContent = entry.handle || "Friend";
    text.appendChild(title);
    // Only render a subtitle when the entry defines one (new searchable
    // profiles show avatar + name only).
    if (entry.subtitle) {
      var body = document.createElement("p");
      body.className = "fc-mobile-notif__body";
      body.textContent = entry.subtitle;
      text.appendChild(body);
    }

    row.appendChild(thumb);
    row.appendChild(text);
    row.appendChild(createFindFriendsAddButton(entry));

    // No presence dot on find-friends rows — these are account profiles, not online status.

    card.appendChild(row);
    wrap.appendChild(card);
    li.appendChild(wrap);
    return li;
  }

  function renderFindFriendsSuggestedList() {
    var list = document.getElementById("fcMobileFindFriendsSuggestedList");
    if (!list) return;
    list.innerHTML = "";
    FIND_FRIENDS_SUGGESTED_ENTRIES.forEach(function (entry) {
      list.appendChild(buildFindFriendRow(entry));
    });
  }

  function findFriendMatchesFor(query) {
    var needle = normalizeIdentityText(query).toLowerCase();
    return FIND_FRIENDS_SEARCHABLE_ENTRIES.filter(function (entry) {
      return normalizeIdentityText(entry.handle).toLowerCase() === needle;
    });
  }

  // The current "you" handle (updates with the sidebar you-picker).
  function localGameHandleNeedle() {
    var el = document.querySelector('[data-prototype-player-handle="local"]');
    var h = el ? normalizeIdentityText(el.textContent) : "";
    return h.toLowerCase();
  }

  function renderFindFriendsResultsList(matches) {
    var list = document.getElementById("fcMobileFindFriendsResultsList");
    if (!list) return;
    list.innerHTML = "";
    matches.forEach(function (entry) {
      list.appendChild(buildFindFriendRow(entry));
    });
  }

  function buildHomeFriendNotifRow(entry, index) {
    var li = document.createElement("li");
    li.className = "fc-mobile-notif__item fc-mobile-notif__item--avatar-thumb";
    li.setAttribute("data-player-panel-handle-key", entry.key);

    var card = document.createElement("div");
    card.className = "fc-mobile-notif__card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    var row = document.createElement("div");
    row.className = "fc-mobile-notif__row";

    var thumb = document.createElement("div");
    thumb.className = "fc-mobile-notif__thumb";
    var avatarImg = document.createElement("img");
    avatarImg.className = "fc-mobile-notif__thumb-game";
    avatarImg.alt = "";
    avatarImg.decoding = "async";
    avatarImg.src = entry.avatar || defaultHomeFriendAvatar();
    thumb.appendChild(avatarImg);

    var text = document.createElement("div");
    text.className = "fc-mobile-notif__text";
    var title = document.createElement("p");
    title.className = "fc-mobile-notif__title";
    title.textContent = entry.handle || "Friend";
    text.appendChild(title);
    var body = document.createElement("p");
    body.className = "fc-mobile-notif__body";
    body.textContent = friendEntryStatusLabel(entry);
    text.appendChild(body);

    row.appendChild(thumb);
    row.appendChild(text);
    appendListRowMoreMenu(row, {
      listContext: "friend",
      itemId: entry.key,
      itemLabel: entry.handle || "Friend",
      menuLabel: "Friend options",
      menuItems: friendListMoreMenuItems(),
    });
    if (presenceApi()) {
      var friendState = entry.online
        ? entry.idle
          ? presenceApi().STATE_IDLE
          : presenceApi().STATE_ONLINE
        : presenceApi().STATE_OFFLINE;
      presenceApi().applyPresenceToAvatar(thumb, friendState);
    }
    card.appendChild(row);

    function activateFriendRow(e) {
      if (
        e &&
        e.target &&
        e.target.closest &&
        e.target.closest(".fc-mobile-notif__row-more")
      ) {
        return;
      }
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (typeof window.openMobileFriendDetailByHandleKey === "function") {
        window.openMobileFriendDetailByHandleKey(entry.key, { sourceElement: li });
      }
    }

    card.addEventListener("click", activateFriendRow);
    row.addEventListener("click", activateFriendRow);
    card.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      activateFriendRow(e);
    });

    var wrap = document.createElement("div");
    wrap.className = "fc-mobile-notif__item-wrap";
    wrap.appendChild(card);
    li.appendChild(wrap);

    return li;
  }

  function collectTvAchievementProgress() {
    if (isMultiLocalAchievements()) {
      return window.getActiveLocalPlayerAchievementProgress();
    }

    var countEl = document.querySelector(".tv-dashboard__achievements-focus-progress-count");
    if (countEl) {
      var raw = countEl.textContent.replace(/\s+/g, " ").trim();
      var parts = raw.split("/");
      if (parts.length === 2) {
        var unlocked = parseInt(parts[0], 10);
        var total = parseInt(parts[1], 10);
        if (!isNaN(unlocked) && !isNaN(total)) {
          return { unlocked: unlocked, total: total };
        }
      }
    }

    var track = document.getElementById("tvDashboardAchievementsCards");
    if (!track) return { unlocked: 0, total: 0 };
    return {
      unlocked: track.querySelectorAll(".tv-dashboard__achievements-focus-card").length,
      total: track.children.length
    };
  }

  function syncMobileDashboardAchievementsProgress() {
    var countEl = document.getElementById("fcMobileDashAchievementsProgressCount");
    var progressWrap = document.getElementById("fcMobileDashAchievementsProgress");
    if (!countEl) return;

    var progress = collectTvAchievementProgress();
    countEl.textContent = progress.unlocked + " / " + progress.total;
    if (progressWrap) {
      progressWrap.setAttribute(
        "aria-label",
        progress.unlocked + " of " + progress.total + " achievements unlocked"
      );
    }
  }

  function collectTvUnlockedAchievementEntry(card) {
    if (!card) return null;
    var titleEl = card.querySelector(".tv-dashboard__achievements-focus-card-text h3");
    var descEl = card.querySelector(".tv-dashboard__achievements-focus-card-desc");
    var dateEl = card.querySelector(".tv-dashboard__achievements-focus-card-date");
    var imgEl = card.querySelector(".tv-dashboard__achievements-focus-card-img img");
    var title = titleEl ? titleEl.textContent.replace(/\s+/g, " ").trim() : "";
    if (!title) return null;
    return {
      kind: "unlocked",
      title: title,
      description: descEl ? descEl.textContent.replace(/\s+/g, " ").trim() : "",
      date: dateEl ? dateEl.textContent.replace(/\s+/g, " ").trim() : "",
      imageSrc: imgEl ? imgEl.getAttribute("src") || "" : ""
    };
  }

  var LOCKED_ACHIEVEMENT_ART_BY_TITLE = {
    "Perfect Hat Trick": "assets/raster/dashboard-achievements-fifa/fifa-unlock-01.svg",
    "Champions Rising": "assets/raster/dashboard-achievements-fifa/fifa-unlock-02.svg",
    "Set Piece Architect": "assets/raster/dashboard-achievements-fifa/fifa-unlock-03.svg",
    "Pro Clubs Captain": "assets/raster/dashboard-achievements-fifa/fifa-unlock-04.svg",
    "Skill Move Maestro": "assets/raster/dashboard-achievements-fifa/fifa-unlock-02.svg"
  };

  function lockedAchievementImageSrc(card, title) {
    if (title && LOCKED_ACHIEVEMENT_ART_BY_TITLE[title]) {
      return LOCKED_ACHIEVEMENT_ART_BY_TITLE[title];
    }
    var lockedImgEl = card.querySelector(".tv-dashboard__achievements-focus-locked-img img");
    var src = lockedImgEl ? lockedImgEl.getAttribute("src") || "" : "";
    if (src.indexOf("achievement-locked-generic") !== -1) return "";
    return src;
  }

  function collectTvLockedAchievementEntry(card) {
    if (!card) return null;
    if (card.classList.contains("tv-dashboard__achievements-focus-mystery")) {
      return {
        kind: "mystery",
        title: "Hidden",
        description: "",
        status: "To reveal this achievement, keep playing!"
      };
    }

    var lockedTitleEl = card.querySelector(".tv-dashboard__achievements-focus-locked-text h3");
    var lockedDescEl = card.querySelector(".tv-dashboard__achievements-focus-locked-text p");
    var lockedTitle = lockedTitleEl ? lockedTitleEl.textContent.replace(/\s+/g, " ").trim() : "";
    if (!lockedTitle) return null;
    return {
      kind: "locked",
      title: lockedTitle,
      description: lockedDescEl ? lockedDescEl.textContent.replace(/\s+/g, " ").trim() : "",
      imageSrc: lockedAchievementImageSrc(card, lockedTitle),
      status: "Locked"
    };
  }

  function collectTvAchievementEntries() {
    if (isMultiLocalAchievements()) {
      return window.getActiveLocalPlayerAchievementEntries();
    }

    var track = document.getElementById("tvDashboardAchievementsCards");
    var unlocked = [];
    var locked = [];
    if (!track) return { unlocked: unlocked, locked: locked };

    var children = track.children;
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      if (node.classList.contains("tv-dashboard__achievements-focus-card")) {
        var unlockedEntry = collectTvUnlockedAchievementEntry(node);
        if (unlockedEntry) unlocked.push(unlockedEntry);
      } else if (
        node.classList.contains("tv-dashboard__achievements-focus-locked") ||
        node.classList.contains("tv-dashboard__achievements-focus-mystery")
      ) {
        var lockedEntry = collectTvLockedAchievementEntry(node);
        if (lockedEntry) locked.push(lockedEntry);
      }
    }

    return { unlocked: unlocked, locked: locked };
  }

  function buildMobileAchievementItem(entry) {
    var li = document.createElement("li");
    li.className = "fc-mobile-dash__achievement-item";
    if (entry.kind === "locked") li.classList.add("fc-mobile-dash__achievement-item--locked");
    if (entry.kind === "mystery") li.classList.add("fc-mobile-dash__achievement-item--mystery");
    li.setAttribute("role", "button");
    li.setAttribute("tabindex", "0");
    li.setAttribute("data-achievement-kind", entry.kind || "unlocked");
    if (entry.title) li.setAttribute("data-achievement-title", entry.title);
    if (entry.description) li.setAttribute("data-achievement-description", entry.description);
    if (entry.imageSrc) li.setAttribute("data-achievement-image", entry.imageSrc);
    if (entry.date) li.setAttribute("data-achievement-date", entry.date);
    if (entry.status) li.setAttribute("data-achievement-status", entry.status);

    var thumb = document.createElement("div");
    thumb.className = "fc-mobile-dash__achievement-thumb";

    if (entry.kind === "mystery") {
      var hiddenImg = document.createElement("img");
      hiddenImg.alt = "";
      hiddenImg.decoding = "async";
      var assets = window.FIGMA_MOBILE_DASHBOARD_ASSETS;
      if (assets && assets.hiddenAchievementThumb) {
        hiddenImg.setAttribute("src", assets.hiddenAchievementThumb);
      }
      thumb.appendChild(hiddenImg);
    } else {
      var img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      if (entry.imageSrc) img.setAttribute("src", entry.imageSrc);
      thumb.appendChild(img);
    }

    var text = document.createElement("div");
    text.className = "fc-mobile-dash__achievement-text";

    var title = document.createElement("p");
    title.className = "fc-mobile-dash__achievement-title";
    title.textContent = entry.title;
    text.appendChild(title);

    if (entry.description) {
      var desc = document.createElement("p");
      desc.className = "fc-mobile-dash__achievement-desc";
      desc.textContent = entry.description;
      text.appendChild(desc);
    }

    if (entry.date) {
      var date = document.createElement("p");
      date.className = "fc-mobile-dash__achievement-date";
      date.textContent = entry.date;
      text.appendChild(date);
    }

    if (entry.status) {
      var status = document.createElement("p");
      status.className = "fc-mobile-dash__achievement-status";
      status.textContent = entry.status;
      text.appendChild(status);
    }

    li.appendChild(thumb);
    li.appendChild(text);

    function openAchievementDetail(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (typeof window.openMobileAchievementDetail !== "function") return;
      window.openMobileAchievementDetail({
        kind: entry.kind,
        title: entry.title,
        description: entry.description,
        imageSrc: entry.imageSrc,
        date: entry.date,
        status: entry.status
      });
    }

    li.addEventListener("click", openAchievementDetail);
    li.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      openAchievementDetail(e);
    });

    return li;
  }

  function renderAchievementList(list, entries, emptyEl) {
    if (!list) return;
    list.replaceChildren();
    for (var i = 0; i < entries.length; i++) {
      list.appendChild(buildMobileAchievementItem(entries[i]));
    }
    if (emptyEl) emptyEl.hidden = entries.length > 0;
  }

  function renderMobileDashboardAchievementsL2() {
    syncMobileDashboardAchievementsProgress();
    var groups = collectTvAchievementEntries();

    var unlockedCountEl = document.getElementById("fcMobileDashAchievementsUnlockedCount");
    var unlockedProgressEl = document.getElementById("fcMobileDashAchievementsUnlockedProgress");
    if (unlockedCountEl) unlockedCountEl.textContent = String(groups.unlocked.length);
    if (unlockedProgressEl) {
      unlockedProgressEl.setAttribute(
        "aria-label",
        groups.unlocked.length + " unlocked achievement" + (groups.unlocked.length === 1 ? "" : "s")
      );
    }

    var lockedCountEl = document.getElementById("fcMobileDashAchievementsLockedCount");
    var lockedProgressEl = document.getElementById("fcMobileDashAchievementsLockedProgress");
    if (lockedCountEl) lockedCountEl.textContent = String(groups.locked.length);
    if (lockedProgressEl) {
      lockedProgressEl.setAttribute(
        "aria-label",
        groups.locked.length + " locked achievement" + (groups.locked.length === 1 ? "" : "s")
      );
    }

    renderAchievementList(
      document.getElementById("fcMobileDashAchievementsUnlockedList"),
      groups.unlocked,
      document.getElementById("fcMobileDashAchievementsUnlockedEmpty")
    );
    renderAchievementList(
      document.getElementById("fcMobileDashAchievementsLockedList"),
      groups.locked,
      document.getElementById("fcMobileDashAchievementsLockedEmpty")
    );
  }

  function renderMobileDashboardAchievementsInline() {
    syncMobileDashboardAchievementsProgress();
    var list = document.getElementById("fcMobileDashAchievementsList");
    if (!list) return;
    list.replaceChildren();

    if (isMultiLocalAchievements()) {
      var groups = collectTvAchievementEntries();
      var recent = null;
      for (var ri = 0; ri < groups.unlocked.length; ri++) {
        if (groups.unlocked[ri].mostRecentUnlocked) {
          recent = groups.unlocked[ri];
          break;
        }
      }
      if (!recent && groups.unlocked.length) recent = groups.unlocked[0];
      if (recent) list.appendChild(buildMobileAchievementItem(recent));
      return;
    }

    var track = document.getElementById("tvDashboardAchievementsCards");
    if (!track) return;

    var recentUnlocked = track.querySelector(
      ".tv-dashboard__achievements-focus-card[data-most-recent-unlocked]"
    );
    var targetCard =
      recentUnlocked || track.querySelector(".tv-dashboard__achievements-focus-card");
    var entry = collectTvUnlockedAchievementEntry(targetCard);
    if (!entry) return;

    list.appendChild(buildMobileAchievementItem(entry));
  }

  function renderFriendNotifList(list, entries, startIndex) {
    if (!list) return;
    list.replaceChildren();
    for (var i = 0; i < entries.length; i++) {
      list.appendChild(buildHomeFriendNotifRow(entries[i], startIndex + i));
    }
    if (typeof window.bindListRowMoreMenusIn === "function") {
      window.bindListRowMoreMenusIn(list);
    }
  }

  function getHomeFriendsListMode() {
    var app = document.getElementById("app");
    var mode = app && app.getAttribute("data-home-friends-list");
    return mode === "top-5" ? "top-5" : "online-only";
  }

  function buildHomeFriendsPreviewEntries(entries) {
    var mode = getHomeFriendsListMode();
    if (mode === "top-5") {
      return entries.slice(0, HOME_FRIENDS_TOP5_LIMIT);
    }
    var online = [];
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].online) online.push(entries[i]);
    }
    return online.slice(0, HOME_FRIENDS_PREVIEW_LIMIT);
  }

  function shouldShowHomeFriendsSeeAll(entries, preview) {
    return entries.length > 0 && preview.length < entries.length;
  }

  function setHomeFriendsListMode(mode) {
    var normalized = mode === "top-5" ? "top-5" : "online-only";
    var app = document.getElementById("app");
    if (app) app.setAttribute("data-home-friends-list", normalized);
    var sel = document.getElementById("selHomeFriendsList");
    if (sel) sel.value = normalized;
    renderMobileDashboardHomeFriendsList();
  }

  // Friends count from the control panel (Number of friends). Used to gate the
  // "add some friends" empty state so it shows only when the count is exactly 0.
  function prototypeFriendsCount() {
    var app = document.getElementById("app");
    var n = app ? parseInt(app.getAttribute("data-friends-count"), 10) : NaN;
    if (!(n >= 0)) {
      var sel = document.getElementById("selFriendsCount");
      n = sel ? parseInt(sel.value, 10) : NaN;
    }
    return n >= 0 ? n : -1;
  }

  function renderMobileDashboardHomeFriendsList() {
    var list = document.getElementById("fcMobileDashHomeFriendsList");
    if (!list) return;

    var entries = collectTvDashboardFriendEntries();
    var preview = buildHomeFriendsPreviewEntries(entries);
    renderFriendNotifList(list, preview, 0);

    var seeAllWrap = document.getElementById("fcMobileDashHomeFriendsSeeAllWrap");
    if (seeAllWrap) {
      seeAllWrap.hidden = !shouldShowHomeFriendsSeeAll(entries, preview);
    }

    var isEmpty = prototypeFriendsCount() === 0;
    var card = document.getElementById("fcMobileDashFriendsHomeCard");
    if (card) card.classList.toggle("is-collapsed", isEmpty);

    var empty = document.getElementById("fcMobileDashHomeFriendsEmpty");
    if (empty) {
      empty.hidden = !isEmpty;
      empty.setAttribute("aria-hidden", isEmpty ? "false" : "true");
    }
  }

  function renderMobileDashboardFriendsL2List() {
    var list = document.getElementById("fcMobileDashFriendsL2List");
    if (!list) return;

    var entries = collectTvDashboardFriendEntries();
    renderFriendNotifList(list, entries, 0);

    var empty = document.getElementById("fcMobileDashFriendsL2Empty");
    if (empty) {
      var isEmpty = prototypeFriendsCount() === 0;
      empty.hidden = !isEmpty;
      empty.setAttribute("aria-hidden", isEmpty ? "false" : "true");
    }
  }

  function isEvolutionMode() {
    var app = document.getElementById("app");
    return !!(app && app.getAttribute("data-platform-experience") === "evolution");
  }

  function isPlatformPhase05() {
    if (!isEvolutionMode()) return false;
    var app = document.getElementById("app");
    return !!(app && app.getAttribute("data-platform-phase") === "0.5");
  }

  function isTvDashConnectionOnlyEligible() {
    var app = document.getElementById("app");
    if (!isEvolutionMode() || !app) return false;
    if (isPlatformPhase05()) return false;
    return app.getAttribute("data-tv-dash") === "off";
  }

  function isMobileConnectionOnlyMode() {
    var root = getMobileDashRoot();
    return !!(root && root.getAttribute("data-mobile-connection-only") === "true");
  }

  var playerListConnectingTimers = Object.create(null);
  var PLAYER_LIST_CONNECTING_MS_MIN = 2500;
  var PLAYER_LIST_CONNECTING_MS_MAX = 6000;
  var PLAYER_LIST_CONNECTING_AVATAR_SRC =
    "assets/raster/mobile-dashboard-player-list-connecting-avatar.png";

  function randomPlayerListConnectingMs() {
    return (
      PLAYER_LIST_CONNECTING_MS_MIN +
      Math.random() * (PLAYER_LIST_CONNECTING_MS_MAX - PLAYER_LIST_CONNECTING_MS_MIN)
    );
  }

  function isPlayerListEntryConnecting(key) {
    return !!(key && playerListConnectingTimers[key]);
  }

  function markPlayerListEntryConnecting(key) {
    if (!key) return;
    if (playerListConnectingTimers[key]) {
      window.clearTimeout(playerListConnectingTimers[key].timerId);
    }
    playerListConnectingTimers[key] = {
      timerId: window.setTimeout(function () {
        clearPlayerListEntryConnecting(key);
      }, randomPlayerListConnectingMs()),
    };
  }

  function clearPlayerListEntryConnecting(key) {
    if (!key || !playerListConnectingTimers[key]) return;
    window.clearTimeout(playerListConnectingTimers[key].timerId);
    delete playerListConnectingTimers[key];
    if (isMobileConnectionOnlyMode()) {
      showConnectionOnlyControllerConnectedTvToast();
    }
    renderMobileDashboardPlayerListRows();
    scheduleMobileDashboardViewScrollSync();
  }

  function clearAllPlayerListConnectingTimers() {
    var keys = Object.keys(playerListConnectingTimers);
    for (var i = 0; i < keys.length; i++) {
      window.clearTimeout(playerListConnectingTimers[keys[i]].timerId);
    }
    playerListConnectingTimers = Object.create(null);
  }

  function rosterKeysSnapshot() {
    return sessionCoplayerRoster().map(function (entry) {
      return entry.key;
    });
  }

  var lastKnownPlayerListKeys = null;
  var connectionOnlyPersistedTvToastActive = false;

  function dismissConnectionOnlyPersistedTvToast() {
    connectionOnlyPersistedTvToastActive = false;
    if (typeof window.dismissTvInviteShareToast === "function") {
      window.dismissTvInviteShareToast();
    }
  }

  function showConnectionOnlyControllerConnectedTvToast() {
    if (connectionOnlyPersistedTvToastActive) return;
    if (typeof window.showTvInviteShareToast !== "function") return;
    connectionOnlyPersistedTvToastActive = true;
    window.showTvInviteShareToast({
      message: "Continue on your controller",
      persist: true,
    });
  }

  function showConnectionOnlyAddPlayersPhoneToast() {
    if (typeof window.showEvolutionContinueOnTvToast === "function") {
      window.showEvolutionContinueOnTvToast("Continue on your TV");
    }
  }

  function markNewPlayerListConnectionsFromRosterDiff() {
    if (!isMobileConnectionOnlyMode()) return;
    var keys = rosterKeysSnapshot();
    if (!lastKnownPlayerListKeys) {
      lastKnownPlayerListKeys = keys.slice();
      return;
    }
    for (var i = 0; i < keys.length; i++) {
      if (lastKnownPlayerListKeys.indexOf(keys[i]) === -1) {
        markPlayerListEntryConnecting(keys[i]);
      }
    }
    lastKnownPlayerListKeys = keys.slice();
  }

  function isAddPlayersSubPageMode() {
    var root = getMobileDashRoot();
    return !!(root && root.getAttribute("data-add-players-screen") === "sub-page");
  }

  function isMobileConnectionOnlyInlineMode() {
    return isMobileConnectionOnlyMode() && !isAddPlayersSubPageMode();
  }

  function syncMobileConnectionOnlyChrome() {
    var addBtn = document.getElementById("fcMobileDashAddPeopleBtn");
    var doneBtn = document.getElementById("fcMobileDashDoneAddPlayersBtn");
    var active = isMobileConnectionOnlyInlineMode();
    if (addBtn) addBtn.hidden = active;
    if (doneBtn) doneBtn.hidden = !active;
  }

  function syncMobileConnectionOnlyUi() {
    syncMobileConnectionOnlyChrome();
    syncMobileDashboardPlayerList();
  }

  function enterMobileConnectionOnlyMode() {
    var root = getMobileDashRoot();
    if (!root) return;
    root.setAttribute("data-mobile-connection-only", "true");
    lastKnownPlayerListKeys = rosterKeysSnapshot();
    syncMobileConnectionOnlyUi();
    if (isAddPlayersSubPageMode()) {
      openAddPlayersL2();
    }
    scheduleMobileDashboardViewScrollSync();
  }

  function exitMobileConnectionOnlyMode() {
    var root = getMobileDashRoot();
    if (!root || root.getAttribute("data-mobile-connection-only") !== "true") return;
    root.removeAttribute("data-mobile-connection-only");
    lastKnownPlayerListKeys = null;
    dismissConnectionOnlyPersistedTvToast();
    clearAllPlayerListConnectingTimers();
    syncMobileConnectionOnlyUi();
    scheduleMobileDashboardViewScrollSync();
  }

  function applyPlatformPhaseSideEffects() {
    syncMobileDashboardProfileIdentityUi();
    if (typeof window.syncMobileDashboardPlayerList === "function") {
      window.syncMobileDashboardPlayerList();
    }
    if (typeof window.syncNotificationRecipientSelect === "function") {
      window.syncNotificationRecipientSelect();
    }
    if (
      typeof window.isMultiLocalSession === "function" &&
      window.isMultiLocalSession() &&
      typeof window.syncAchievementsForActiveLocalPlayer === "function"
    ) {
      window.syncAchievementsForActiveLocalPlayer();
    }
    if (!isEvolutionMode() || !isPlatformPhase05()) return;
    if (typeof window.resetMobileDashboardNotificationsL2 === "function") {
      window.resetMobileDashboardNotificationsL2();
    }
    if (typeof window.resetMobileDashboardFriendsL2 === "function") {
      window.resetMobileDashboardFriendsL2();
    }
    if (typeof window.resetMobileDashboardAddPlayersL2 === "function") {
      window.resetMobileDashboardAddPlayersL2();
    }
    if (typeof window.resetMobileDashboardAchievementsL2 === "function") {
      window.resetMobileDashboardAchievementsL2();
    }
    if (typeof window.resetMobileDashboardControllerSettingsL2 === "function") {
      window.resetMobileDashboardControllerSettingsL2();
    }
    if (typeof window.resetMobileDashboardEditProfileL2 === "function") {
      window.resetMobileDashboardEditProfileL2();
    }
    if (typeof window.clearMissedNotification === "function") {
      window.clearMissedNotification();
    }
  }

  function getMobileDashRoot() {
    return document.getElementById("fcMobileDashboard");
  }

  function isLocalPlayerControllerSwapActive() {
    var root = getMobileDashRoot();
    return !!(root && root.getAttribute("data-local-player-swap") === "1");
  }

  function finishL2OpenAnimation(setAnimatingFalse) {
    if (isLocalPlayerControllerSwapActive()) {
      setAnimatingFalse();
      scheduleMobileDashboardViewScrollSync();
      return;
    }
    window.setTimeout(function () {
      setAnimatingFalse();
      scheduleMobileDashboardViewScrollSync();
    }, 340);
  }

  function isMobileDashOpen() {
    var el = document.getElementById("fcMobileDashboard");
    return !!(el && el.classList.contains("is-open"));
  }

  function openFriendsL2() {
    var root = getMobileDashRoot();
    if (!root || isPlatformPhase05() || !isEvolutionMode() || !isMobileDashOpen() || friendsL2Animating) return;
    if (root.getAttribute("data-mobile-dashboard-view") !== "home") return;

    if (typeof window.resetMobileDashboardNotificationsL2 === "function") {
      window.resetMobileDashboardNotificationsL2();
    }
    if (typeof window.resetMobileDashboardAchievementsL2 === "function") {
      window.resetMobileDashboardAchievementsL2();
    }
    if (typeof window.resetMobileDashboardControllerSettingsL2 === "function") {
      window.resetMobileDashboardControllerSettingsL2();
    }
    if (typeof window.resetMobileDashboardEditProfileL2 === "function") {
      window.resetMobileDashboardEditProfileL2();
    }

    renderMobileDashboardFriendsL2List();
    friendsL2Animating = true;
    friendsL2Open = true;
    root.setAttribute("data-mobile-dashboard-l2", "friends");

    var friendsView = document.getElementById("fcMobileDashViewFriends");
    if (friendsView) {
      friendsView.setAttribute("aria-hidden", "false");
    }

    syncMobileDashboardMissedCard();
    scheduleMobileDashboardViewScrollSync();

    finishL2OpenAnimation(function () {
      friendsL2Animating = false;
    });
  }

  function closeFriendsL2() {
    var root = getMobileDashRoot();
    if (!root || !friendsL2Open || friendsL2Animating) return;

    friendsL2Animating = true;
    friendsL2Open = false;
    if (root.getAttribute("data-mobile-dashboard-l2") === "friends") {
      root.removeAttribute("data-mobile-dashboard-l2");
    }

    var friendsView = document.getElementById("fcMobileDashViewFriends");
    window.setTimeout(function () {
      if (friendsView && !friendsL2Open) {
        friendsView.setAttribute("aria-hidden", "true");
      }
      friendsL2Animating = false;
      syncMobileDashboardMissedCard();
      scheduleMobileDashboardViewScrollSync();
    }, 340);
  }

  function markFriendsL2Open(isOpen) {
    friendsL2Open = !!isOpen;
  }

  function resetFriendsL2() {
    friendsL2Open = false;
    friendsL2Animating = false;
    var root = getMobileDashRoot();
    if (root && root.getAttribute("data-mobile-dashboard-l2") === "friends") {
      root.removeAttribute("data-mobile-dashboard-l2");
    }
    var friendsView = document.getElementById("fcMobileDashViewFriends");
    if (friendsView) friendsView.setAttribute("aria-hidden", "true");
    syncMobileDashboardMissedCard();
  }

  function bindFriendsL2Ui() {
    var seeAllBtn = document.getElementById("fcMobileDashHomeFriendsSeeAllBtn");
    if (seeAllBtn && seeAllBtn.getAttribute("data-friends-l2-bound") !== "1") {
      seeAllBtn.setAttribute("data-friends-l2-bound", "1");
      seeAllBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openFriendsL2();
      });
    }

    var backBtn = document.getElementById("fcMobileFriendsBackBtn");
    if (backBtn && backBtn.getAttribute("data-friends-l2-bound") !== "1") {
      backBtn.setAttribute("data-friends-l2-bound", "1");
      backBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeFriendsL2();
      });
    }
  }

  function resetAllMobileDashboardL2() {
    resetOtherMobileDashboardL2(null);
  }

  function applyMobileDashboardL2EnterMode(root, enter) {
    if (!root) return;
    if (enter === "panel") {
      root.setAttribute("data-mobile-dashboard-l2-enter", "panel");
    } else {
      root.removeAttribute("data-mobile-dashboard-l2-enter");
    }
  }

  function clearMobileDashboardL2EnterMode(root) {
    root = root || getMobileDashRoot();
    if (root) root.removeAttribute("data-mobile-dashboard-l2-enter");
  }

  function resolveDeepLinkPanelEnter(opts) {
    opts = opts || {};
    if (opts.enter === "sub-page") return false;
    if (opts.enter === "panel") return true;
    return !!(opts.openDashboard && !isMobileDashOpen());
  }

  function stageMobileDashboardL2DeepLink(l2Key, opts) {
    opts = opts || {};
    var root = getMobileDashRoot();
    if (!root || !l2Key || !isEvolutionMode()) return false;

    applyMobileDashboardL2EnterMode(root, "panel");
    resetOtherMobileDashboardL2(l2Key);

    if (typeof window.closeAllMobilePopoverMenus === "function") {
      window.closeAllMobilePopoverMenus();
    }

    switch (l2Key) {
      case "friends":
        if (isPlatformPhase05()) return false;
        renderMobileDashboardFriendsL2List();
        friendsL2Open = true;
        friendsL2Animating = false;
        root.setAttribute("data-mobile-dashboard-l2", "friends");
        break;
      case "achievements":
        renderMobileDashboardAchievementsL2();
        achievementsL2Open = true;
        achievementsL2Animating = false;
        root.setAttribute("data-mobile-dashboard-l2", "achievements");
        break;
      case "controller-settings":
        syncControllerSettingsUi();
        controllerSettingsL2Open = true;
        controllerSettingsL2Animating = false;
        root.setAttribute("data-mobile-dashboard-l2", "controller-settings");
        break;
      case "add-players":
        if (isPlatformPhase05()) return false;
        renderMobileDashboardPlayerListRows();
        addPlayersL2Open = true;
        addPlayersL2Animating = false;
        root.setAttribute("data-mobile-dashboard-l2", "add-players");
        syncMobileConnectionOnlyChrome();
        break;
      case "notifications":
        if (
          typeof window.stageMobileDashboardNotificationsL2DeepLink !== "function" ||
          !window.stageMobileDashboardNotificationsL2DeepLink(opts)
        ) {
          return false;
        }
        break;
      default:
        clearMobileDashboardL2EnterMode(root);
        return false;
    }

    var viewId =
      l2Key === "friends"
        ? "fcMobileDashViewFriends"
        : l2Key === "achievements"
          ? "fcMobileDashViewAchievements"
          : l2Key === "controller-settings"
            ? "fcMobileDashViewControllerSettings"
            : l2Key === "add-players"
              ? "fcMobileDashViewAddPlayersL2"
              : l2Key === "notifications"
                ? "fcMobileDashViewNotifications"
                : null;
    if (viewId) {
      var view = document.getElementById(viewId);
      if (view) view.setAttribute("aria-hidden", "false");
    }

    syncMobileDashboardMissedCard();
    scheduleMobileDashboardViewScrollSync();
    if (l2Key === "controller-settings" && opts.scrollToBottom) {
      scheduleMobileDashboardControllerSettingsScrollToBottom();
    }
    return true;
  }

  function finishMobileDashboardL2DeepLink(opts) {
    opts = opts || {};
    clearMobileDashboardL2EnterMode();
    scheduleMobileDashboardViewScrollSync();
    var l2 = opts.deepLinkL2 || opts.l2;
    if (l2 === "controller-settings" && opts.scrollToBottom) {
      scheduleMobileDashboardControllerSettingsScrollToBottom();
    }
  }

  function openMobileDashboardL2InPlace(l2Key, opts) {
    opts = opts || {};
    switch (l2Key) {
      case "friends":
        openFriendsL2();
        break;
      case "achievements":
        openAchievementsL2();
        break;
      case "controller-settings":
        openControllerSettingsL2(opts);
        break;
      case "add-players":
        openAddPlayersL2();
        break;
      case "notifications":
        if (typeof window.openMobileDashboardNotifications === "function") {
          window.openMobileDashboardNotifications();
        }
        break;
      default:
        return false;
    }
    return true;
  }

  function waitForMobileDashboardOpen(callback) {
    var attempts = 0;
    function poll() {
      if (isMobileDashOpen()) {
        callback();
        return;
      }
      attempts += 1;
      if (attempts < 40) {
        window.requestAnimationFrame(poll);
      }
    }
    window.requestAnimationFrame(poll);
  }

  /**
   * Open dashboard to home with an L2 destination.
   * External entry (openDashboard + closed dash) uses panel enter — rides the dashboard slide-in.
   * In-dashboard navigation uses the normal L2 sub-page slide.
   *
   * opts: { l2, deepLinkL2, openDashboard, enter: 'panel'|'sub-page', mobileView, ...l2Opts }
   */
  function openMobileDashboardDeepLink(opts) {
    opts = opts || {};
    var l2 = opts.deepLinkL2 || opts.l2;
    if (!l2 || !isEvolutionMode()) return;
    if (typeof window.setMobileDashboardOpen !== "function") return;

    if (isMobileDashOpen()) {
      openMobileDashboardL2InPlace(l2, opts);
      return;
    }

    var usePanelEnter = resolveDeepLinkPanelEnter(opts);
    var openOpts = Object.assign({}, opts, {
      mobileView: opts.mobileView || "home",
      deepLinkL2: l2,
    });
    if (usePanelEnter) {
      openOpts.l2Enter = "panel";
    }
    window.setMobileDashboardOpen(true, openOpts);

    if (!usePanelEnter) {
      waitForMobileDashboardOpen(function () {
        openMobileDashboardL2InPlace(l2, opts);
      });
    }
  }

  function resetOtherMobileDashboardL2(exceptKey) {
    if (exceptKey !== "notifications" && typeof window.resetMobileDashboardNotificationsL2 === "function") {
      window.resetMobileDashboardNotificationsL2();
    }
    if (exceptKey !== "friends" && typeof window.resetMobileDashboardFriendsL2 === "function") {
      window.resetMobileDashboardFriendsL2();
    }
    if (exceptKey !== "add-players" && typeof window.resetMobileDashboardAddPlayersL2 === "function") {
      window.resetMobileDashboardAddPlayersL2();
    }
    if (exceptKey !== "find-friends" && typeof window.resetMobileDashboardFindFriendsL2 === "function") {
      window.resetMobileDashboardFindFriendsL2();
    }
    if (exceptKey !== "achievements" && typeof window.resetMobileDashboardAchievementsL2 === "function") {
      window.resetMobileDashboardAchievementsL2();
    }
    if (
      exceptKey !== "controller-settings" &&
      typeof window.resetMobileDashboardControllerSettingsL2 === "function"
    ) {
      window.resetMobileDashboardControllerSettingsL2();
    }
    if (exceptKey !== "edit-profile" && typeof window.resetMobileDashboardEditProfileL2 === "function") {
      window.resetMobileDashboardEditProfileL2();
    }
  }

  function finishAddPlayersSession() {
    dismissConnectionOnlyPersistedTvToast();
    try {
      document.dispatchEvent(
        new CustomEvent("tvdashboard:requestClose", { bubbles: true, cancelable: true })
      );
    } catch (err) {}
    exitMobileConnectionOnlyMode();
    closeAddPlayersL2({ skipSessionFinish: true });
  }

  function openAddPlayersL2() {
    var root = getMobileDashRoot();
    if (!root || isPlatformPhase05() || !isEvolutionMode() || !isMobileDashOpen() || addPlayersL2Animating) return;
    if (root.getAttribute("data-mobile-dashboard-view") !== "home") return;
    if (addPlayersL2Open) return;

    resetOtherMobileDashboardL2("add-players");
    if (typeof window.closeAllMobilePopoverMenus === "function") {
      window.closeAllMobilePopoverMenus();
    }

    renderMobileDashboardPlayerListRows();
    addPlayersL2Animating = true;
    addPlayersL2Open = true;
    root.setAttribute("data-mobile-dashboard-l2", "add-players");

    var addPlayersView = document.getElementById("fcMobileDashViewAddPlayersL2");
    if (addPlayersView) {
      addPlayersView.setAttribute("aria-hidden", "false");
    }

    syncMobileConnectionOnlyChrome();
    scheduleMobileDashboardViewScrollSync();

    finishL2OpenAnimation(function () {
      addPlayersL2Animating = false;
    });
  }

  function closeAddPlayersL2(opts) {
    opts = opts || {};
    var root = getMobileDashRoot();
    if (!root || (!addPlayersL2Open && !addPlayersL2Animating)) return;
    if (addPlayersL2Animating) return;

    if (!opts.skipSessionFinish && isMobileConnectionOnlyMode()) {
      finishAddPlayersSession();
      return;
    }

    addPlayersL2Animating = true;
    addPlayersL2Open = false;
    if (root.getAttribute("data-mobile-dashboard-l2") === "add-players") {
      root.removeAttribute("data-mobile-dashboard-l2");
    }

    var addPlayersView = document.getElementById("fcMobileDashViewAddPlayersL2");
    window.setTimeout(function () {
      if (addPlayersView && !addPlayersL2Open) {
        addPlayersView.setAttribute("aria-hidden", "true");
      }
      addPlayersL2Animating = false;
      syncMobileConnectionOnlyChrome();
      scheduleMobileDashboardViewScrollSync();
    }, 340);
  }

  function markAddPlayersL2Open(isOpen) {
    addPlayersL2Open = !!isOpen;
  }

  function resetAddPlayersL2() {
    addPlayersL2Open = false;
    addPlayersL2Animating = false;
    var root = getMobileDashRoot();
    if (root && root.getAttribute("data-mobile-dashboard-l2") === "add-players") {
      root.removeAttribute("data-mobile-dashboard-l2");
    }
    var addPlayersView = document.getElementById("fcMobileDashViewAddPlayersL2");
    if (addPlayersView) addPlayersView.setAttribute("aria-hidden", "true");
    syncMobileConnectionOnlyChrome();
  }

  function bindAddPlayersL2Ui() {
    var backBtn = document.getElementById("fcMobileAddPlayersL2BackBtn");
    if (backBtn && backBtn.getAttribute("data-add-players-l2-bound") !== "1") {
      backBtn.setAttribute("data-add-players-l2-bound", "1");
      backBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        finishAddPlayersSession();
      });
    }

    var doneBtn = document.getElementById("fcMobileDashAddPlayersL2DoneBtn");
    if (doneBtn && doneBtn.getAttribute("data-add-players-l2-bound") !== "1") {
      doneBtn.setAttribute("data-add-players-l2-bound", "1");
      doneBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        finishAddPlayersSession();
      });
    }
  }

  function findFriendsStateEls() {
    return {
      suggested: document.getElementById("fcMobileFindFriendsSuggested"),
      loading: document.getElementById("fcMobileFindFriendsLoading"),
      results: document.getElementById("fcMobileFindFriendsResults"),
      error: document.getElementById("fcMobileFindFriendsError"),
    };
  }

  function setFindFriendsSearchBarError(on) {
    var bar = document.querySelector(".fc-mobile-dash__find-friends-search-bar");
    if (bar) bar.classList.toggle("fc-mobile-dash__find-friends-search-bar--error", !!on);
  }

  function setFindFriendsState(active) {
    var els = findFriendsStateEls();
    ["suggested", "loading", "results", "error"].forEach(function (key) {
      var el = els[key];
      if (!el) return;
      var on = key === active;
      el.hidden = !on;
      el.setAttribute("aria-hidden", on ? "false" : "true");
    });
    setFindFriendsSearchBarError(active === "error");
  }

  function showFindFriendsSuggestedState() {
    setFindFriendsState("suggested");
  }

  function showFindFriendsLoadingState() {
    setFindFriendsState("loading");
  }

  function showFindFriendsResultsState() {
    setFindFriendsState("results");
  }

  function showFindFriendsErrorState(message) {
    var textEl = document.getElementById("fcMobileFindFriendsErrorText");
    if (textEl && message) textEl.textContent = message;
    setFindFriendsState("error");
  }

  function showFindFriendsKeyboard() {
    var kbd = document.getElementById("fcMobileFindFriendsKeyboard");
    if (!kbd) return;
    window.clearTimeout(kbd._ffKbdHideTimer);
    kbd.hidden = false;
    kbd.setAttribute("aria-hidden", "false");
    // Force the closed transform to apply, then flip to open so it slides up.
    void kbd.offsetHeight;
    window.requestAnimationFrame(function () {
      kbd.classList.add("is-open");
    });
  }

  function hideFindFriendsKeyboard() {
    var kbd = document.getElementById("fcMobileFindFriendsKeyboard");
    if (!kbd) return;
    kbd.setAttribute("aria-hidden", "true");
    if (kbd.hidden) return;
    kbd.classList.remove("is-open");
    // Keep it in the DOM until the slide-down finishes, then hide it.
    window.clearTimeout(kbd._ffKbdHideTimer);
    kbd._ffKbdHideTimer = window.setTimeout(function () {
      if (!kbd.classList.contains("is-open")) {
        kbd.hidden = true;
      }
    }, 210);
  }

  function ffInsertText(str) {
    var input = document.getElementById("fcMobileFindFriendsInput");
    if (!input) return;
    input.focus();
    var start = typeof input.selectionStart === "number" ? input.selectionStart : input.value.length;
    var end = typeof input.selectionEnd === "number" ? input.selectionEnd : input.value.length;
    if (typeof input.setRangeText === "function") {
      input.setRangeText(str, start, end, "end");
    } else {
      input.value = input.value.slice(0, start) + str + input.value.slice(end);
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function ffBackspace() {
    var input = document.getElementById("fcMobileFindFriendsInput");
    if (!input) return;
    input.focus();
    var start = typeof input.selectionStart === "number" ? input.selectionStart : input.value.length;
    var end = typeof input.selectionEnd === "number" ? input.selectionEnd : input.value.length;
    if (start === end) {
      if (start === 0) return;
      start -= 1;
    }
    if (typeof input.setRangeText === "function") {
      input.setRangeText("", start, end, "end");
    } else {
      input.value = input.value.slice(0, start) + input.value.slice(end);
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function submitFindFriendsSearch() {
    var input = document.getElementById("fcMobileFindFriendsInput");
    var query = input ? input.value.trim() : "";
    if (!query) return;
    hideFindFriendsKeyboard();
    if (input) input.blur();

    // Can't search for your own game handle — immediate error, no loading.
    var needle = normalizeIdentityText(query).toLowerCase();
    if (needle && needle === localGameHandleNeedle()) {
      window.clearTimeout(findFriendsSearchTimer);
      findFriendsSearchTimer = null;
      showFindFriendsErrorState("You can't search for your own game handle.");
      return;
    }

    showFindFriendsLoadingState();
    window.clearTimeout(findFriendsSearchTimer);
    findFriendsSearchTimer = window.setTimeout(function () {
      findFriendsSearchTimer = null;
      var matches = findFriendMatchesFor(query);
      if (!matches.length) {
        showFindFriendsErrorState("Game handle not found.");
        return;
      }
      renderFindFriendsResultsList(matches);
      showFindFriendsResultsState();
    }, 900);
  }

  function resetFindFriendsSearchState() {
    window.clearTimeout(findFriendsSearchTimer);
    findFriendsSearchTimer = null;
    var input = document.getElementById("fcMobileFindFriendsInput");
    if (input) input.value = "";
    hideFindFriendsKeyboard();
    showFindFriendsSuggestedState();
  }

  function openFindFriendsL2() {
    var root = getMobileDashRoot();
    if (!root || isPlatformPhase05() || !isEvolutionMode() || !isMobileDashOpen() || findFriendsL2Animating) return;
    if (root.getAttribute("data-mobile-dashboard-view") !== "home") return;
    if (findFriendsL2Open) return;

    resetOtherMobileDashboardL2("find-friends");
    if (typeof window.closeAllMobilePopoverMenus === "function") {
      window.closeAllMobilePopoverMenus();
    }

    resetFindFriendsSearchState();
    renderFindFriendsSuggestedList();

    findFriendsL2Animating = true;
    findFriendsL2Open = true;
    root.setAttribute("data-mobile-dashboard-l2", "find-friends");

    var view = document.getElementById("fcMobileDashViewFindFriends");
    if (view) view.setAttribute("aria-hidden", "false");

    scheduleMobileDashboardViewScrollSync();

    finishL2OpenAnimation(function () {
      findFriendsL2Animating = false;
    });
  }

  function closeFindFriendsL2() {
    var root = getMobileDashRoot();
    if (!root || !findFriendsL2Open || findFriendsL2Animating) return;

    findFriendsL2Animating = true;
    findFriendsL2Open = false;
    if (root.getAttribute("data-mobile-dashboard-l2") === "find-friends") {
      root.removeAttribute("data-mobile-dashboard-l2");
    }

    var input = document.getElementById("fcMobileFindFriendsInput");
    if (input) input.blur();

    var view = document.getElementById("fcMobileDashViewFindFriends");
    window.setTimeout(function () {
      if (view && !findFriendsL2Open) view.setAttribute("aria-hidden", "true");
      findFriendsL2Animating = false;
      scheduleMobileDashboardViewScrollSync();
    }, 340);
  }

  function markFindFriendsL2Open(isOpen) {
    findFriendsL2Open = !!isOpen;
  }

  function resetFindFriendsL2() {
    findFriendsL2Open = false;
    findFriendsL2Animating = false;
    var root = getMobileDashRoot();
    if (root && root.getAttribute("data-mobile-dashboard-l2") === "find-friends") {
      root.removeAttribute("data-mobile-dashboard-l2");
    }
    var view = document.getElementById("fcMobileDashViewFindFriends");
    if (view) view.setAttribute("aria-hidden", "true");
    resetFindFriendsSearchState();
  }

  // Open the existing player/profile card component for a find-friends entry.
  // Not a friend → the component renders its built-in non-friend variant.
  function openFindFriendPlayerCard(entry, sourceEl) {
    if (!entry) return;
    if (typeof window.openMobileFriendDetailByHandleKey === "function") {
      window.openMobileFriendDetailByHandleKey(entry.key, {
        handle: entry.handle,
        sourceElement: sourceEl || null,
        returnL2: "find-friends",
      });
    }
  }

  var findFriendsProfileCardEntry = null;
  var findFriendsProfileCardLoadTimer = null;

  function toggleFindFriendsProfileMenu(open) {
    var menu = document.getElementById("fcMobileFindFriendsProfileMenu");
    var moreBtn = document.getElementById("fcMobileFindFriendsProfileMore");
    if (!menu) return;
    var show = open === undefined ? menu.hidden : open;
    if (show) {
      // Undo only makes sense once a request has been sent.
      var undoItem = menu.querySelector('[data-pc-action="undo"]');
      if (undoItem) undoItem.hidden = !isFindFriendRequestSent(findFriendsProfileCardEntry);
    }
    menu.hidden = !show;
    menu.setAttribute("aria-hidden", show ? "false" : "true");
    if (moreBtn) moreBtn.setAttribute("aria-expanded", show ? "true" : "false");
  }

  function openFindFriendsProfileCard(entry) {
    if (!entry) return;
    var modal = document.getElementById("fcMobileFindFriendsProfileCard");
    if (!modal) return;
    window.clearTimeout(findFriendsProfileCardLoadTimer);
    findFriendsProfileCardLoadTimer = null;
    findFriendsProfileCardEntry = entry;
    var avatar = document.getElementById("fcMobileFindFriendsProfileAvatar");
    var name = document.getElementById("fcMobileFindFriendsProfileName");
    if (avatar) avatar.src = entry.avatar || defaultHomeFriendAvatar();
    if (name) name.textContent = entry.handle || "Friend";
    toggleFindFriendsProfileMenu(false);
    // Reflect any request already sent from the row "+" button.
    applyFindFriendProfileCardBtnState();
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(function () {
      modal.classList.add("is-open");
    });
  }

  function closeFindFriendsProfileCard() {
    var modal = document.getElementById("fcMobileFindFriendsProfileCard");
    if (!modal) return;
    window.clearTimeout(findFriendsProfileCardLoadTimer);
    findFriendsProfileCardLoadTimer = null;
    modal.classList.remove("is-open", "fc-mobile-profile-card--loading");
    modal.setAttribute("aria-hidden", "true");
    toggleFindFriendsProfileMenu(false);
    window.setTimeout(function () {
      if (!modal.classList.contains("is-open")) modal.hidden = true;
    }, 240);
    findFriendsProfileCardEntry = null;
  }

  function submitFindFriendsProfileCardRequest() {
    var entry = findFriendsProfileCardEntry;
    var modal = document.getElementById("fcMobileFindFriendsProfileCard");
    if (!entry || !modal || isFindFriendRequestSent(entry)) return;
    if (modal.classList.contains("fc-mobile-profile-card--loading")) return;
    // Brief loading spinner in the pill, then sent (shared with the row "+").
    modal.classList.add("fc-mobile-profile-card--loading");
    window.clearTimeout(findFriendsProfileCardLoadTimer);
    findFriendsProfileCardLoadTimer = window.setTimeout(function () {
      findFriendsProfileCardLoadTimer = null;
      modal.classList.remove("fc-mobile-profile-card--loading");
      sendFindFriendRequest(entry);
    }, 700);
  }

  function bindFindFriendsProfileCardUi() {
    var modal = document.getElementById("fcMobileFindFriendsProfileCard");
    if (!modal || modal.getAttribute("data-find-friends-profile-bound") === "1") return;
    modal.setAttribute("data-find-friends-profile-bound", "1");

    var scrim = document.getElementById("fcMobileFindFriendsProfileScrim");
    if (scrim) scrim.addEventListener("click", closeFindFriendsProfileCard);
    var closeBtn = document.getElementById("fcMobileFindFriendsProfileClose");
    if (closeBtn) closeBtn.addEventListener("click", closeFindFriendsProfileCard);

    var moreBtn = document.getElementById("fcMobileFindFriendsProfileMore");
    if (moreBtn) {
      moreBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleFindFriendsProfileMenu();
      });
    }

    var sendBtn = document.getElementById("fcMobileFindFriendsProfileSendBtn");
    if (sendBtn) {
      sendBtn.addEventListener("click", function () {
        if (sendBtn.disabled) return;
        submitFindFriendsProfileCardRequest();
      });
    }

    var menu = document.getElementById("fcMobileFindFriendsProfileMenu");
    if (menu) {
      menu.addEventListener("click", function (e) {
        var item = e.target.closest("[data-pc-action]");
        if (!item) return;
        var action = item.getAttribute("data-pc-action");
        var entry = findFriendsProfileCardEntry;
        toggleFindFriendsProfileMenu(false);
        if (action === "undo") {
          if (entry && entry.key) {
            delete findFriendsRequestsSent[entry.key];
            syncFindFriendRequestUi(entry);
          }
        } else if (action === "report" || action === "block") {
          // Decorative for now — feedback toast only.
          if (typeof window.showMobileDashboardStatusToast === "function") {
            window.showMobileDashboardStatusToast({
              message: (action === "report" ? "Reported " : "Blocked ") + ((entry && entry.handle) || "player"),
              iconKey: "userAddSmall",
            });
          }
        }
      });
    }

    // Tap anywhere on the card (not the … button or the menu) closes the menu.
    var card = modal.querySelector(".fc-mobile-profile-card__card");
    if (card) {
      card.addEventListener("click", function (e) {
        if (e.target.closest(".fc-mobile-profile-card__menu") || e.target.closest(".fc-mobile-profile-card__more")) return;
        toggleFindFriendsProfileMenu(false);
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("is-open")) {
        var menuEl = document.getElementById("fcMobileFindFriendsProfileMenu");
        if (menuEl && !menuEl.hidden) {
          toggleFindFriendsProfileMenu(false);
        } else {
          closeFindFriendsProfileCard();
        }
      }
    });
  }

  function bindFindFriendsL2Ui() {
    ["fcMobileDashFindFriendsSearchBtn", "fcMobileDashHomeFindFriendsSearchBtn"].forEach(function (id) {
      var searchBtn = document.getElementById(id);
      if (searchBtn && searchBtn.getAttribute("data-find-friends-l2-bound") !== "1") {
        searchBtn.setAttribute("data-find-friends-l2-bound", "1");
        searchBtn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          // Self-heal: tapping into a profile card opens a detail over find-friends
          // without closing it, leaving findFriendsL2Open stuck true (which would
          // block re-opening). Close any open detail + clear stale state first so
          // the search icon always opens Find Friends.
          if (typeof window.closeMobileNotificationDetail === "function") {
            window.closeMobileNotificationDetail();
          }
          resetFindFriendsL2();
          openFindFriendsL2();
        });
      }
    });

    var backBtn = document.getElementById("fcMobileFindFriendsBackBtn");
    if (backBtn && backBtn.getAttribute("data-find-friends-l2-bound") !== "1") {
      backBtn.setAttribute("data-find-friends-l2-bound", "1");
      backBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeFindFriendsL2();
      });
    }

    var input = document.getElementById("fcMobileFindFriendsInput");
    if (input && input.getAttribute("data-find-friends-l2-bound") !== "1") {
      input.setAttribute("data-find-friends-l2-bound", "1");
      input.addEventListener("focus", showFindFriendsKeyboard);
      input.addEventListener("blur", hideFindFriendsKeyboard);
      input.addEventListener("input", function () {
        if (!input.value.trim()) showFindFriendsSuggestedState();
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          submitFindFriendsSearch();
        }
      });
    }

    var kbd = document.getElementById("fcMobileFindFriendsKeyboard");
    if (kbd && kbd.getAttribute("data-find-friends-l2-bound") !== "1") {
      kbd.setAttribute("data-find-friends-l2-bound", "1");
      kbd.addEventListener("pointerdown", function (e) {
        var keyBtn = e.target.closest(".fc-mobile-dash__kbd-key");
        if (!keyBtn || keyBtn.disabled) return;
        e.preventDefault();
        var letter = keyBtn.getAttribute("data-key");
        var action = keyBtn.getAttribute("data-action");
        if (letter) {
          ffInsertText(letter);
        } else if (action === "space") {
          ffInsertText(" ");
        } else if (action === "backspace") {
          ffBackspace();
        } else if (action === "search") {
          submitFindFriendsSearch();
        }
      });
    }
  }

  function openAchievementsL2() {
    var root = getMobileDashRoot();
    if (!root || !isEvolutionMode() || !isMobileDashOpen() || achievementsL2Animating) return;
    if (root.getAttribute("data-mobile-dashboard-view") !== "home") return;

    if (typeof window.resetMobileDashboardNotificationsL2 === "function") {
      window.resetMobileDashboardNotificationsL2();
    }
    if (typeof window.resetMobileDashboardFriendsL2 === "function") {
      window.resetMobileDashboardFriendsL2();
    }
    if (typeof window.resetMobileDashboardControllerSettingsL2 === "function") {
      window.resetMobileDashboardControllerSettingsL2();
    }
    if (typeof window.resetMobileDashboardEditProfileL2 === "function") {
      window.resetMobileDashboardEditProfileL2();
    }
    if (typeof window.closeAllMobilePopoverMenus === "function") {
      window.closeAllMobilePopoverMenus();
    }

    renderMobileDashboardAchievementsL2();
    achievementsL2Animating = true;
    achievementsL2Open = true;
    root.setAttribute("data-mobile-dashboard-l2", "achievements");

    var achievementsView = document.getElementById("fcMobileDashViewAchievements");
    if (achievementsView) {
      achievementsView.setAttribute("aria-hidden", "false");
    }

    syncMobileDashboardMissedCard();
    scheduleMobileDashboardViewScrollSync();

    finishL2OpenAnimation(function () {
      achievementsL2Animating = false;
      scheduleMobileDashboardViewScrollSync();
    });
  }

  function closeAchievementsL2() {
    var root = getMobileDashRoot();
    if (!root || !achievementsL2Open || achievementsL2Animating) return;

    achievementsL2Animating = true;
    achievementsL2Open = false;
    if (root.getAttribute("data-mobile-dashboard-l2") === "achievements") {
      root.removeAttribute("data-mobile-dashboard-l2");
    }

    var achievementsView = document.getElementById("fcMobileDashViewAchievements");
    window.setTimeout(function () {
      if (achievementsView && !achievementsL2Open) {
        achievementsView.setAttribute("aria-hidden", "true");
      }
      achievementsL2Animating = false;
      syncMobileDashboardMissedCard();
      scheduleMobileDashboardViewScrollSync();
    }, 340);
  }

  function markAchievementsL2Open(isOpen) {
    achievementsL2Open = !!isOpen;
  }

  function resetAchievementsL2() {
    achievementsL2Open = false;
    achievementsL2Animating = false;
    var root = getMobileDashRoot();
    if (root && root.getAttribute("data-mobile-dashboard-l2") === "achievements") {
      root.removeAttribute("data-mobile-dashboard-l2");
    }
    var achievementsView = document.getElementById("fcMobileDashViewAchievements");
    if (achievementsView) achievementsView.setAttribute("aria-hidden", "true");
    syncMobileDashboardMissedCard();
  }

  function bindAchievementsL2Ui() {
    var seeAllBtn = document.getElementById("fcMobileDashAchievementsSeeAllBtn");
    if (seeAllBtn && seeAllBtn.getAttribute("data-achievements-l2-bound") !== "1") {
      seeAllBtn.setAttribute("data-achievements-l2-bound", "1");
      seeAllBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openAchievementsL2();
      });
    }

    var backBtn = document.getElementById("fcMobileAchievementsBackBtn");
    if (backBtn && backBtn.getAttribute("data-achievements-l2-bound") !== "1") {
      backBtn.setAttribute("data-achievements-l2-bound", "1");
      backBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeAchievementsL2();
      });
    }
  }

  function updateControllerSettingsMicSliderFill(input) {
    if (!input) return;
    var min = Number(input.min) || 0;
    var max = Number(input.max) || 100;
    var val = Number(input.value);
    var pct = max === min ? 0 : ((val - min) / (max - min)) * 100;
    var wrap = input.closest(".fc-mobile-settings-range");
    if (wrap) wrap.style.setProperty("--range-fill", pct + "%");
  }

  function syncControllerSettingsHapticsToggles(fromInput) {
    if (fromInput) controllerHapticsEnabled = fromInput.checked;
    document.querySelectorAll("[data-controller-settings-haptics]").forEach(function (input) {
      input.checked = controllerHapticsEnabled;
    });
  }

  function syncControllerSettingsSoundToggles(fromInput) {
    if (fromInput) controllerSoundEnabled = fromInput.checked;
    document.querySelectorAll("[data-controller-settings-sound]").forEach(function (input) {
      input.checked = controllerSoundEnabled;
    });
  }

  function syncControllerSettingsMicToggles(fromInput) {
    if (fromInput) controllerMicEnabled = fromInput.checked;
    document.querySelectorAll("[data-controller-settings-mic]").forEach(function (input) {
      input.checked = controllerMicEnabled;
    });
    document.querySelectorAll("[data-controller-settings-mic-level]").forEach(function (slider) {
      slider.disabled = !controllerMicEnabled;
    });
    document.querySelectorAll(".fc-mobile-settings-card--mic").forEach(function (card) {
      card.classList.toggle("is-disabled", !controllerMicEnabled);
    });
  }

  function syncControllerSettingsMicLevel(fromInput) {
    if (fromInput) controllerMicLevel = Number(fromInput.value);
    document.querySelectorAll("[data-controller-settings-mic-level]").forEach(function (slider) {
      if (!fromInput || slider !== fromInput) slider.value = String(controllerMicLevel);
      updateControllerSettingsMicSliderFill(slider);
    });
  }

  function syncControllerSettingsUi(fromInput) {
    syncControllerSettingsHapticsToggles(
      fromInput && fromInput.matches("[data-controller-settings-haptics]") ? fromInput : undefined
    );
    syncControllerSettingsSoundToggles(
      fromInput && fromInput.matches("[data-controller-settings-sound]") ? fromInput : undefined
    );
    syncControllerSettingsMicToggles(
      fromInput && fromInput.matches("[data-controller-settings-mic]") ? fromInput : undefined
    );
    syncControllerSettingsMicLevel(
      fromInput && fromInput.matches("[data-controller-settings-mic-level]") ? fromInput : undefined
    );
  }

  function bindControllerSettingsControls() {
    document.querySelectorAll("[data-controller-settings-haptics]").forEach(function (input) {
      if (input.getAttribute("data-controller-settings-bound") === "1") return;
      input.setAttribute("data-controller-settings-bound", "1");
      input.addEventListener("change", function () {
        syncControllerSettingsHapticsToggles(input);
      });
    });

    document.querySelectorAll("[data-controller-settings-sound]").forEach(function (input) {
      if (input.getAttribute("data-controller-settings-bound") === "1") return;
      input.setAttribute("data-controller-settings-bound", "1");
      input.addEventListener("change", function () {
        syncControllerSettingsSoundToggles(input);
      });
    });

    document.querySelectorAll("[data-controller-settings-mic]").forEach(function (input) {
      if (input.getAttribute("data-controller-settings-bound") === "1") return;
      input.setAttribute("data-controller-settings-bound", "1");
      input.addEventListener("change", function () {
        syncControllerSettingsMicToggles(input);
      });
    });

    document.querySelectorAll("[data-controller-settings-mic-level]").forEach(function (input) {
      if (input.getAttribute("data-controller-settings-bound") === "1") return;
      input.setAttribute("data-controller-settings-bound", "1");
      updateControllerSettingsMicSliderFill(input);
      input.addEventListener("input", function () {
        syncControllerSettingsMicLevel(input);
      });
    });
  }

  function disconnectControllerPrototype() {
    var sel = document.getElementById("selCtrlFigma");
    if (sel) {
      sel.value = "not-connected";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function scrollMobileDashboardControllerSettingsToBottom() {
    var el = document.querySelector("#fcMobileDashViewControllerSettings > .fc-mobile-dash__content");
    if (!el) return;
    var overflows = el.scrollHeight > el.clientHeight + 1;
    el.classList.toggle("is-scrollable", overflows);
    if (overflows) {
      el.scrollTop = el.scrollHeight;
    }
    syncMobileDashboardScrollFade();
  }

  function scheduleMobileDashboardControllerSettingsScrollToBottom() {
    scrollMobileDashboardControllerSettingsToBottom();
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(function () {
        scrollMobileDashboardControllerSettingsToBottom();
        window.requestAnimationFrame(scrollMobileDashboardControllerSettingsToBottom);
      });
    }
  }

  function openControllerSettingsL2(opts) {
    opts = opts || {};
    var root = getMobileDashRoot();
    if (!root || !isEvolutionMode() || !isMobileDashOpen() || controllerSettingsL2Animating) return;
    if (root.getAttribute("data-mobile-dashboard-view") !== "home") return;

    if (typeof window.resetMobileDashboardNotificationsL2 === "function") {
      window.resetMobileDashboardNotificationsL2();
    }
    if (typeof window.resetMobileDashboardFriendsL2 === "function") {
      window.resetMobileDashboardFriendsL2();
    }
    if (typeof window.resetMobileDashboardAchievementsL2 === "function") {
      window.resetMobileDashboardAchievementsL2();
    }
    if (typeof window.closeAllMobilePopoverMenus === "function") {
      window.closeAllMobilePopoverMenus();
    }

    syncControllerSettingsUi();
    controllerSettingsL2Animating = true;
    controllerSettingsL2Open = true;
    root.setAttribute("data-mobile-dashboard-l2", "controller-settings");

    var settingsView = document.getElementById("fcMobileDashViewControllerSettings");
    if (settingsView) {
      settingsView.setAttribute("aria-hidden", "false");
    }

    syncMobileDashboardMissedCard();
    scheduleMobileDashboardViewScrollSync();
    if (opts.scrollToBottom) {
      scheduleMobileDashboardControllerSettingsScrollToBottom();
    }

    finishL2OpenAnimation(function () {
      controllerSettingsL2Animating = false;
      scheduleMobileDashboardViewScrollSync();
      if (opts.scrollToBottom) {
        scheduleMobileDashboardControllerSettingsScrollToBottom();
      }
    });
  }

  function openMobileDashboardControllerSettings(opts) {
    openMobileDashboardDeepLink(
      Object.assign({}, opts || {}, {
        deepLinkL2: "controller-settings",
      })
    );
  }

  function closeControllerSettingsL2() {
    var root = getMobileDashRoot();
    if (!root || !controllerSettingsL2Open || controllerSettingsL2Animating) return;

    controllerSettingsL2Animating = true;
    controllerSettingsL2Open = false;
    if (root.getAttribute("data-mobile-dashboard-l2") === "controller-settings") {
      root.removeAttribute("data-mobile-dashboard-l2");
    }

    var settingsView = document.getElementById("fcMobileDashViewControllerSettings");
    window.setTimeout(function () {
      if (settingsView && !controllerSettingsL2Open) {
        settingsView.setAttribute("aria-hidden", "true");
      }
      controllerSettingsL2Animating = false;
      syncMobileDashboardMissedCard();
      scheduleMobileDashboardViewScrollSync();
    }, 340);
  }

  function resetControllerSettingsL2() {
    controllerSettingsL2Open = false;
    controllerSettingsL2Animating = false;
    var root = getMobileDashRoot();
    if (root && root.getAttribute("data-mobile-dashboard-l2") === "controller-settings") {
      root.removeAttribute("data-mobile-dashboard-l2");
    }
    var settingsView = document.getElementById("fcMobileDashViewControllerSettings");
    if (settingsView) settingsView.setAttribute("aria-hidden", "true");
    syncMobileDashboardMissedCard();
  }

  function captureMobileDashboardUiForLocalPlayer(playerKey) {
    if (!playerKey) return;
    var root = getMobileDashRoot();
    var existing = mobileDashboardUiByPlayerKey[playerKey] || {};
    mobileDashboardUiByPlayerKey[playerKey] = {
      l2: root ? root.getAttribute("data-mobile-dashboard-l2") : null,
      dashOpen: isMobileDashOpen(),
      dashClosedManually: existing.dashClosedManually === true,
    };
  }

  function shouldKeepMobileDashboardOpenForPlayer(playerKey) {
    var snapshot = mobileDashboardUiByPlayerKey[playerKey];
    if (!snapshot) return false;
    if (snapshot.dashClosedManually) return false;
    return snapshot.dashOpen === true;
  }

  function markActiveLocalPlayerMobileDashboardManualToggle(willOpen) {
    if (typeof window.isMultiLocalSession !== "function" || !window.isMultiLocalSession()) {
      return;
    }
    var key =
      typeof window.getActiveLocalPlayerKey === "function"
        ? window.getActiveLocalPlayerKey()
        : "local";
    var existing = mobileDashboardUiByPlayerKey[key] || {};
    mobileDashboardUiByPlayerKey[key] = {
      l2: existing.l2 || null,
      dashOpen: willOpen,
      dashClosedManually: !willOpen,
    };
  }

  function syncMobileDashboardOpenForLocalPlayer(playerKey) {
    if (!isEvolutionMode()) return;
    if (typeof window.isMultiLocalSession !== "function" || !window.isMultiLocalSession()) {
      return;
    }
    if (typeof window.setMobileDashboardOpen !== "function") return;

    var shouldOpen = shouldKeepMobileDashboardOpenForPlayer(playerKey);
    if (shouldOpen) {
      if (!isMobileDashOpen()) {
        window.setMobileDashboardOpen(true, { mobileView: "home", instant: true });
      }
      return;
    }
    if (isMobileDashOpen()) {
      window.setMobileDashboardOpen(false, { instant: true });
    }
  }

  function resetActiveLocalPlayerMobileDashboardUi() {
    resetFriendsL2();
    resetAchievementsL2();
    resetControllerSettingsL2();
    if (typeof window.resetMobileDashboardEditProfileL2 === "function") {
      window.resetMobileDashboardEditProfileL2();
    }
    if (typeof window.resetMobileDashboardNotificationsL2 === "function") {
      window.resetMobileDashboardNotificationsL2();
    }
  }

  function restoreMobileDashboardUiForLocalPlayer(playerKey) {
    syncMobileDashboardOpenForLocalPlayer(playerKey);

    var snapshot = mobileDashboardUiByPlayerKey[playerKey];
    if (!snapshot || !snapshot.l2 || snapshot.l2 === "detail" || !isMobileDashOpen()) return;

    if (snapshot.l2 === "friends" && !isPlatformPhase05()) {
      openFriendsL2();
    } else if (snapshot.l2 === "notifications") {
      if (typeof window.openMobileDashboardNotifications === "function") {
        window.openMobileDashboardNotifications();
      }
    } else if (snapshot.l2 === "achievements") {
      openAchievementsL2();
    } else if (snapshot.l2 === "controller-settings") {
      openControllerSettingsL2();
    }
  }

  function bindControllerSettingsL2Ui() {
    var backBtn = document.getElementById("fcMobileControllerSettingsBackBtn");
    if (backBtn && backBtn.getAttribute("data-controller-settings-l2-bound") !== "1") {
      backBtn.setAttribute("data-controller-settings-l2-bound", "1");
      backBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeControllerSettingsL2();
      });
    }

    bindControllerSettingsControls();
  }

  function renderMobileDashboardFriendsList() {
    bindMobileInviteButtons();
    var list = document.getElementById("fcMobileDashFriendsList");
    if (!list) return;

    var entries = collectTvDashboardFriendEntries();
    list.replaceChildren();

    for (var j = 0; j < entries.length; j++) {
      list.appendChild(buildInviteFriendRow(entries[j], j));
    }

    var empty = document.getElementById("fcMobileDashInviteFriendsEmpty");
    if (empty) {
      var isEmpty = prototypeFriendsCount() === 0;
      empty.hidden = !isEmpty;
      empty.setAttribute("aria-hidden", isEmpty ? "false" : "true");
    }

    restoreInviteButtonsAfterListRender();
  }

  function tvInviteListButtonForKey(key) {
    if (!key) return null;
    var item = document.querySelector(
      '#tvDashboardInviteShell .game-invite-list__item[data-player-panel-handle-key="' + key + '"]'
    );
    return item ? item.querySelector(".game-invite-list__invite-btn") : null;
  }

  function mobileInviteButtonForKey(key) {
    if (!key) return null;
    var row = document.querySelector(
      '#fcMobileDashFriendsList [data-player-panel-handle-key="' + key + '"]'
    );
    return row ? row.querySelector(".fc-mobile-dash__invite-btn") : null;
  }

  function mobileInviteFriendLabel(mobileBtn) {
    var row = mobileBtn && mobileBtn.closest("[data-player-panel-handle-key]");
    var nameEl = row && row.querySelector(".fc-mobile-notif__title");
    var name = nameEl ? (nameEl.textContent || "").trim() : "";
    return "Invite " + (name || "friend");
  }

  function clearInviteFlowTimer(key) {
    var flow = inviteFlowByKey[key];
    if (flow && flow.timerId) {
      window.clearTimeout(flow.timerId);
      flow.timerId = 0;
    }
  }

  function clearMobileInviteTimer(mobileBtn) {
    if (!mobileBtn) return;
    var row = mobileBtn.closest("[data-player-panel-handle-key]");
    var key = row && row.getAttribute("data-player-panel-handle-key");
    if (key) clearInviteFlowTimer(key);
    mobileBtn.removeAttribute("data-invite-load-timer");
  }

  function applyMobileInviteButtonUi(mobileBtn, state) {
    if (!mobileBtn) return;
    var loading = state === "loading";
    var invited = state === "invited";
    mobileBtn.classList.toggle("fc-mobile-dash__invite-btn--loading", loading);
    mobileBtn.classList.toggle("fc-mobile-dash__invite-btn--invited", invited);
    mobileBtn.disabled = loading || invited;
    if (loading) {
      mobileBtn.setAttribute("aria-busy", "true");
      mobileBtn.setAttribute("aria-label", "Sending invite");
    } else {
      mobileBtn.removeAttribute("aria-busy");
      if (invited) {
        mobileBtn.setAttribute("aria-label", "Sent");
      } else {
        mobileBtn.setAttribute("aria-label", mobileInviteFriendLabel(mobileBtn));
      }
    }
  }

  function mirrorTvInviteButtonUi(tvBtn, state) {
    if (!tvBtn) return;
    var row = tvBtn.closest(".game-invite-list__item");
    var loading = state === "loading";
    var invited = state === "invited";
    if (row) {
      row.classList.toggle("game-invite-list__item--invite-pending-ui", loading || invited);
    }
    tvBtn.classList.toggle("game-invite-list__invite-btn--loading", loading);
    tvBtn.classList.toggle("game-invite-list__invite-btn--invited", invited);
    if (loading) {
      tvBtn.setAttribute("aria-busy", "true");
    } else {
      tvBtn.removeAttribute("aria-busy");
    }
    if (invited) {
      tvBtn.setAttribute("aria-label", "Invite sent");
    } else if (!loading) {
      tvBtn.removeAttribute("aria-label");
      var lbl = tvBtn.querySelector(".game-invite-list__invite-btn-label");
      if (lbl) lbl.textContent = "Invite";
    }
  }

  function inviteUiStateForKey(key) {
    var flow = inviteFlowByKey[key];
    if (flow && (flow.phase === "loading" || flow.phase === "invited")) {
      return flow.phase;
    }
    var tvBtn = tvInviteListButtonForKey(key);
    if (tvBtn) {
      if (tvBtn.classList.contains("game-invite-list__invite-btn--invited")) return "invited";
      if (tvBtn.classList.contains("game-invite-list__invite-btn--loading")) return "loading";
    }
    return "default";
  }

  function notifyLocalPlayerLobbyInvite(key) {
    if (
      typeof window.isLocalPlayerFriendKey === "function" &&
      window.isLocalPlayerFriendKey(key) &&
      typeof window.deliverLobbyGameInviteToLocalPlayer === "function"
    ) {
      window.deliverLobbyGameInviteToLocalPlayer(key);
    }
  }

  function completeInviteForKey(key) {
    if (!key) return;
    clearInviteFlowTimer(key);
    inviteFlowByKey[key] = { phase: "invited", endsAt: 0, timerId: 0 };
    var mobileBtn = mobileInviteButtonForKey(key);
    var tvBtn = tvInviteListButtonForKey(key);
    if (mobileBtn) {
      mobileBtn.removeAttribute("data-invite-load-timer");
      applyMobileInviteButtonUi(mobileBtn, "invited");
    }
    mirrorTvInviteButtonUi(tvBtn, "invited");
    notifyLocalPlayerLobbyInvite(key);
  }

  function scheduleInviteCompletion(key) {
    if (!key) return;
    clearInviteFlowTimer(key);
    var flow = inviteFlowByKey[key];
    var endsAt = flow && flow.endsAt ? flow.endsAt : Date.now() + inviteLoadMs();
    var remaining = Math.max(0, endsAt - Date.now());
    inviteFlowByKey[key] = { phase: "loading", endsAt: endsAt, timerId: 0 };
    var timerId = window.setTimeout(function () {
      completeInviteForKey(key);
    }, remaining);
    inviteFlowByKey[key].timerId = timerId;
    var mobileBtn = mobileInviteButtonForKey(key);
    if (mobileBtn) mobileBtn.setAttribute("data-invite-load-timer", String(timerId));
  }

  function restoreInviteButtonsAfterListRender() {
    var rows = document.querySelectorAll(
      "#fcMobileDashFriendsList [data-player-panel-handle-key]"
    );
    for (var ri = 0; ri < rows.length; ri++) {
      var key = rows[ri].getAttribute("data-player-panel-handle-key");
      if (!key) continue;
      var state = inviteUiStateForKey(key);
      if (state === "default") continue;
      var mobileBtn = mobileInviteButtonForKey(key);
      var tvBtn = tvInviteListButtonForKey(key);
      applyMobileInviteButtonUi(mobileBtn, state);
      mirrorTvInviteButtonUi(tvBtn, state);
      if (state === "loading") scheduleInviteCompletion(key);
    }
  }

  function syncMobileInviteButtonFromTvInvite(tvBtn) {
    if (!tvBtn) return;
    var row = tvBtn.closest(".game-invite-list__item");
    var key = row && row.getAttribute("data-player-panel-handle-key");
    if (!key) return;
    if (tvBtn.classList.contains("game-invite-list__invite-btn--invited")) {
      completeInviteForKey(key);
      return;
    }
    if (tvBtn.classList.contains("game-invite-list__invite-btn--loading")) {
      if (!inviteFlowByKey[key] || inviteFlowByKey[key].phase !== "loading") {
        inviteFlowByKey[key] = {
          phase: "loading",
          endsAt: Date.now() + inviteLoadMs(),
          timerId: 0
        };
      }
      var mobileBtn = mobileInviteButtonForKey(key);
      applyMobileInviteButtonUi(mobileBtn, "loading");
      mirrorTvInviteButtonUi(tvBtn, "loading");
      scheduleInviteCompletion(key);
      return;
    }
    clearInviteFlowTimer(key);
    delete inviteFlowByKey[key];
    var mobileBtnOff = mobileInviteButtonForKey(key);
    applyMobileInviteButtonUi(mobileBtnOff, "default");
  }

  function clearMobileInviteButtonStates() {
    var keys = Object.keys(inviteFlowByKey);
    for (var k = 0; k < keys.length; k++) {
      clearInviteFlowTimer(keys[k]);
      mirrorTvInviteButtonUi(tvInviteListButtonForKey(keys[k]), "default");
    }
    inviteFlowByKey = Object.create(null);
    var btns = document.querySelectorAll("#fcMobileDashFriendsList .fc-mobile-dash__invite-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].removeAttribute("data-invite-load-timer");
      applyMobileInviteButtonUi(btns[i], "default");
    }
  }

  function resetMobileDashboardInviteSession() {
    var keys = Object.keys(inviteFlowByKey);
    for (var k = 0; k < keys.length; k++) {
      clearInviteFlowTimer(keys[k]);
    }
    inviteFlowByKey = Object.create(null);
    for (var i = 0; i < FRIEND_KEYS.length; i++) {
      var key = FRIEND_KEYS[i];
      var tvBtn = tvInviteListButtonForKey(key);
      var mobileBtn = mobileInviteButtonForKey(key);
      mirrorTvInviteButtonUi(tvBtn, "default");
      if (mobileBtn) {
        mobileBtn.removeAttribute("data-invite-load-timer");
        applyMobileInviteButtonUi(mobileBtn, "default");
      }
    }
  }

  function inviteLoadMs() {
    var ms = window.INVITE_FRIEND_LOAD_MS;
    return typeof ms === "number" && ms > 0 ? ms : INVITE_FRIEND_LOAD_MS;
  }

  /** Mobile Add Players invite — same loading → sent sequence as TV game invite list. */
  function startMobileInviteFriendFlow(mobileBtn) {
    if (!mobileBtn) return;

    var row = mobileBtn.closest("[data-player-panel-handle-key]");
    var key = row && row.getAttribute("data-player-panel-handle-key");
    if (!key) return;

    var flow = inviteFlowByKey[key];
    if (
      flow &&
      (flow.phase === "loading" || flow.phase === "invited")
    ) {
      return;
    }
    if (
      mobileBtn.disabled ||
      mobileBtn.classList.contains("fc-mobile-dash__invite-btn--loading") ||
      mobileBtn.classList.contains("fc-mobile-dash__invite-btn--invited")
    ) {
      return;
    }
    var tvBtn = tvInviteListButtonForKey(key);

    inviteFlowByKey[key] = {
      phase: "loading",
      endsAt: Date.now() + inviteLoadMs(),
      timerId: 0
    };
    applyMobileInviteButtonUi(mobileBtn, "loading");
    mirrorTvInviteButtonUi(tvBtn, "loading");
    scheduleInviteCompletion(key);
  }

  function bindMobileInviteButtons() {
    var list = document.getElementById("fcMobileDashFriendsList");
    if (!list || list.getAttribute("data-invite-bound") === "1") return;
    list.setAttribute("data-invite-bound", "1");
    list.addEventListener(
      "click",
      function (e) {
      var btn = e.target && e.target.closest && e.target.closest(".fc-mobile-dash__invite-btn");
      if (!btn || !list.contains(btn)) return;
      if (
        btn.disabled ||
        btn.classList.contains("fc-mobile-dash__invite-btn--loading") ||
        btn.classList.contains("fc-mobile-dash__invite-btn--invited")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      startMobileInviteFriendFlow(btn);
    },
      true
    );
  }

  function bindMobileShareCard() {
    var addView = document.getElementById("fcMobileDashViewAddPlayers");
    if (!addView || addView.getAttribute("data-share-bound") === "1") return;
    addView.setAttribute("data-share-bound", "1");

    function activateShareAction(btn) {
      if (!btn || !addView.contains(btn)) return;
      var action = btn.getAttribute("data-mobile-share");
      if (action === "copy-link") {
        if (typeof window.showMobileDashboardStatusToast === "function") {
          window.showMobileDashboardStatusToast({
            message: "Link Copied",
            iconKey: "shareCopyLinkSecondary",
          });
        }
        return;
      }
      if (action === "share" && typeof window.openPhoneInviteShareSheet === "function") {
        window.openPhoneInviteShareSheet();
      }
    }

    addView.addEventListener("click", function (e) {
      var btn =
        e.target &&
        e.target.closest &&
        e.target.closest(".fc-mobile-dash__share-action-btn[data-mobile-share]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      activateShareAction(btn);
    });
  }

  function tvCoPlayerCount() {
    var counts =
      typeof window.getTvPlayersJoinedCounts === "function"
        ? window.getTvPlayersJoinedCounts()
        : { total: 1 };
    var n = counts.total;
    if (!(n >= 1 && n <= 4)) n = 1;
    return n;
  }

  function sessionCoplayerRoster() {
    if (typeof window.playerListRosterForDashboard === "function") {
      return window.playerListRosterForDashboard();
    }
    if (window.PROTOTYPE_SESSION_COPLAYERS && window.PROTOTYPE_SESSION_COPLAYERS.length) {
      return window.PROTOTYPE_SESSION_COPLAYERS;
    }
    return window.PROTOTYPE_LOCAL_COPLAYERS || [];
  }

  function playerListPresenceStatusLabel(state) {
    var P = presenceApi();
    if (state === "offline" || (P && state === P.STATE_OFFLINE)) return "Offline";
    return "Connected";
  }

  function isLocalPlayerListKey(key) {
    return (
      key &&
      typeof window.isLocalPlayerFriendKey === "function" &&
      window.isLocalPlayerFriendKey(key)
    );
  }

  function resolveLocalPlayerListEntryKey(entry) {
    if (entry && entry.key) return entry.key;
    if (entry && entry.isSelf && typeof window.getActiveLocalPlayerKey === "function") {
      return window.getActiveLocalPlayerKey();
    }
    return "local";
  }

  function resolveLocalPlayerListPresence(entry) {
    if (entry.isSelf && isLocalProfileDisconnected()) {
      return { state: "offline", label: "disconnected" };
    }

    var key = resolveLocalPlayerListEntryKey(entry);
    var appearOffline =
      typeof window.isLocalPlayerAppearOfflineToOthers === "function" &&
      window.isLocalPlayerAppearOfflineToOthers(key);

    if (appearOffline) {
      return { state: "offline", label: "Connected" };
    }

    return { state: "online", label: "Connected" };
  }

  function resolvePlayerListPresence(entry) {
    if (isPlatformPhase05()) {
      return { state: null, label: "", hidePresence: true };
    }

    var P = presenceApi();
    var PH = window.PROTOTYPE_PLAYER_HANDLES || {};
    var PA = window.PROTOTYPE_PLAYER_AVATARS || {};
    var refLower = localSessionGameTitle().toLowerCase();
    var friendEntry = entry.key ? buildFriendEntry(entry.key, PH, PA, refLower) : null;

    if (!friendEntry && entry.handle) {
      var targetHandle = normalizeIdentityText(entry.handle).toLowerCase();
      var keys = Object.keys(PH);
      for (var i = 0; i < keys.length; i++) {
        if (normalizeIdentityText(PH[keys[i]]).toLowerCase() !== targetHandle) continue;
        friendEntry = buildFriendEntry(keys[i], PH, PA, refLower);
        if (friendEntry) break;
      }
    }

    if (entry.isSelf || isLocalPlayerListKey(entry.key)) {
      return resolveLocalPlayerListPresence(entry);
    }

    if (isNonFriendPlayerEntry(entry)) {
      return { state: "online", label: "Connected" };
    }

    if (friendEntry) {
      var presenceState = friendEntryPresenceState(friendEntry);
      return {
        state: presenceState,
        label: playerListPresenceStatusLabel(presenceState),
      };
    }

    if (P) {
      return {
        state: P.STATE_ONLINE,
        label: P.formatLocalPlayerStatus({ state: P.STATE_ONLINE }),
      };
    }

    return { state: "online", label: "Connected" };
  }

  function isPhase05OtherLocalPlayerKey(key) {
    if (!isPlatformPhase05() || !key || key === "local") return false;
    return (
      typeof window.isLocalPlayerFriendKey === "function" &&
      window.isLocalPlayerFriendKey(key)
    );
  }

  function isPhase05InactivePlayerListEntry(entry) {
    if (!isPlatformPhase05() || !entry) return false;
    if (entry.isSelf) return true;
    return isPhase05OtherLocalPlayerKey(entry.key);
  }

  var LIST_ROW_MENU_DIVIDER = { divider: true };

  function friendListMoreMenuItems() {
    return [
      { action: "profile", label: "Profile" },
      LIST_ROW_MENU_DIVIDER,
      { action: "report", label: "Report" },
      { action: "block", label: "Block" },
    ];
  }

  function playerListMoreMenuItems(entry) {
    if (entry && entry.isSelf) {
      if (!isLocalProfileDisconnected()) {
        return [
          {
            action: "stop-playing",
            label: "Disconnect Controller",
            destructive: true,
          },
        ];
      }
      return [{ action: "profile", label: "Profile" }];
    }

    var isFriend =
      entry &&
      entry.key &&
      typeof window.isActiveLocalPlayerFriend === "function" &&
      window.isActiveLocalPlayerFriend(entry.key);

    var items = [{ action: "profile", label: "Profile" }];

    if (
      !isFriend &&
      entry &&
      entry.key &&
      typeof window.isActiveLocalPlayerFriend === "function" &&
      !window.isActiveLocalPlayerFriend(entry.key) &&
      !(
        typeof window.hasOutgoingFriendRequestFromActive === "function" &&
        window.hasOutgoingFriendRequestFromActive(entry.key)
      )
    ) {
      items.push({ action: "add-friend", label: "Add Friend" });
    }

    items.push(
      LIST_ROW_MENU_DIVIDER,
      { action: "report", label: "Report" },
      { action: "block", label: "Block" },
      LIST_ROW_MENU_DIVIDER,
      { action: "remove-controller", label: "Remove Controller", destructive: true }
    );

    return items;
  }

  function isNonFriendPlayerEntry(entry) {
    return !!(
      entry &&
      entry.key &&
      typeof window.isActiveLocalPlayerFriend === "function" &&
      !window.isActiveLocalPlayerFriend(entry.key)
    );
  }

  function resolveMobileDashboardPlayerListEntryDisplay(entry) {
    if (!entry) {
      return { title: "Player", avatar: defaultHomeFriendAvatar() };
    }
    if (isPlayerListEntryConnecting(entry.key)) {
      return {
        title: "Controller",
        avatar: PLAYER_LIST_CONNECTING_AVATAR_SRC,
      };
    }
    return {
      title: entry.displayTitle || entry.handle || "Player",
      avatar: entry.avatar || defaultHomeFriendAvatar(),
    };
  }

  function buildPlayerListNotifRow(entry, index) {
    var li = document.createElement("li");
    li.className = "fc-mobile-notif__item fc-mobile-notif__item--avatar-thumb";
    li.setAttribute("data-player-panel-handle-key", entry.key || "local-p" + (index + 2));
    if (entry.isSelf) li.setAttribute("data-is-local-self", "1");

    var card = document.createElement("div");
    card.className = "fc-mobile-notif__card";
    if (!isPhase05InactivePlayerListEntry(entry)) {
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
    }

    var row = document.createElement("div");
    row.className = "fc-mobile-notif__row";

    var thumb = document.createElement("div");
    thumb.className = "fc-mobile-notif__thumb";
    var avatarImg = document.createElement("img");
    avatarImg.className = "fc-mobile-notif__thumb-game";
    avatarImg.alt = "";
    avatarImg.decoding = "async";
    if (isPlayerListEntryConnecting(entry.key)) {
      li.classList.add("is-player-list-connecting");
      avatarImg.classList.add("fc-mobile-notif__thumb-game--connecting");
      avatarImg.src = PLAYER_LIST_CONNECTING_AVATAR_SRC;
    } else {
      avatarImg.src = entry.avatar || defaultHomeFriendAvatar();
    }
    thumb.appendChild(avatarImg);

    var text = document.createElement("div");
    text.className = "fc-mobile-notif__text";
    var title = document.createElement("p");
    title.className = "fc-mobile-notif__title";
    if (isPlayerListEntryConnecting(entry.key)) {
      title.textContent = "Controller";
    } else {
      title.textContent = entry.displayTitle || entry.handle || "Player";
    }
    text.appendChild(title);
    var body = document.createElement("p");
    body.className = "fc-mobile-notif__body";
    var presence = resolvePlayerListPresence(entry);
    if (isPlayerListEntryConnecting(entry.key)) {
      body.textContent = "Connecting…";
    } else if (presence.hidePresence) {
      body.hidden = true;
    } else {
      body.textContent = presence.label;
    }
    text.appendChild(body);

    row.appendChild(thumb);
    row.appendChild(text);
    if (!isPlatformPhase05()) {
      appendListRowMoreMenu(row, {
        listContext: "player",
        itemId: entry.key || "local-p" + (index + 2),
        itemLabel: entry.displayTitle || entry.handle || "Player",
        menuLabel: "Player options",
        menuItems: playerListMoreMenuItems(entry),
      });
    }
    card.appendChild(row);

    function activatePlayerRow(e) {
      if (
        e &&
        e.target &&
        e.target.closest &&
        e.target.closest(".fc-mobile-notif__row-more")
      ) {
        return;
      }
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (entry.isSelf) {
        if (isPlatformPhase05()) return;
        if (typeof window.openMobileLocalProfile === "function") {
          window.openMobileLocalProfile();
        }
        return;
      }
      if (isPhase05OtherLocalPlayerKey(entry.key)) return;
      var key = entry.key || li.getAttribute("data-player-panel-handle-key");
      if (key && typeof window.openMobileFriendDetailByHandleKey === "function") {
        window.openMobileFriendDetailByHandleKey(key, { sourceElement: li });
      }
    }

    card.addEventListener("click", activatePlayerRow);
    row.addEventListener("click", activatePlayerRow);
    card.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      activatePlayerRow(e);
    });

    var wrap = document.createElement("div");
    wrap.className = "fc-mobile-notif__item-wrap";
    wrap.appendChild(card);
    li.appendChild(wrap);

    return li;
  }

  function renderPlayerListInto(list) {
    if (!list) return;
    var roster = sessionCoplayerRoster();
    list.replaceChildren();
    for (var i = 0; i < roster.length; i++) {
      list.appendChild(buildPlayerListNotifRow(roster[i], i));
    }
    if (typeof window.bindListRowMoreMenusIn === "function") {
      window.bindListRowMoreMenusIn(list);
    }
  }

  function renderMobileDashboardPlayerListRows() {
    renderPlayerListInto(document.getElementById("fcMobileDashPlayerList"));
    renderPlayerListInto(document.getElementById("fcMobileDashAddPlayersL2List"));

    if (typeof window.renderVoiceChatParticipants === "function") {
      window.renderVoiceChatParticipants();
    }
  }

  /** Collapse Player List when solo (no co-players), when disconnected, or expand when others have joined. */
  function syncMobileDashboardPlayerList() {
    var card = document.getElementById("fcMobileDashPlayerListCard");
    if (!card) return;
    var roster = sessionCoplayerRoster();
    var connectionMode = isMobileConnectionOnlyInlineMode();
    var disconnected = isLocalProfileDisconnected();
    var solo = roster.length < 1;
    var collapsed = disconnected || (!connectionMode && solo);
    card.classList.toggle("is-collapsed", collapsed);
    var body = document.getElementById("fcMobileDashPlayerListBody");
    var divider = card.querySelector(".fc-mobile-dash__card-divider");
    if (body) body.hidden = collapsed;
    if (divider) divider.hidden = collapsed;
    syncMobileConnectionOnlyChrome();
    markNewPlayerListConnectionsFromRosterDiff();
    renderMobileDashboardPlayerListRows();
    if (typeof window.syncMobileDashboardFriendsList === "function") {
      window.syncMobileDashboardFriendsList();
    }
    if (typeof window.PrototypePresence !== "undefined") {
      window.PrototypePresence.syncMobileLocalProfilePresence();
      window.PrototypePresence.syncLobbyLocalRowPresence();
    }
    scheduleMobileDashboardViewScrollSync();
  }

  function bindMobileDashboardPlayerListSync() {
    var toggles = document.querySelectorAll(".control-count-toggle");
    if (!toggles.length || document.body.getAttribute("data-md-player-list-bound") === "1") return;
    document.body.setAttribute("data-md-player-list-bound", "1");
    toggles.forEach(function (root) {
      root.addEventListener("click", function () {
        window.requestAnimationFrame(function () {
          syncMobileDashboardPlayerList();
          scheduleMobileDashboardViewScrollSync();
        });
      });
    });
    syncMobileDashboardPlayerList();
  }

  function hasLocalSessionCoplayers() {
    var counts =
      typeof window.getTvPlayersJoinedCounts === "function"
        ? window.getTvPlayersJoinedCounts()
        : { local: 1, total: 1 };
    return (counts.local || 1) > 1 || (counts.total || 1) > 1;
  }

  function isLocalProfileDisconnected() {
    return !!window.PROTOTYPE_LOCAL_PROFILE_DISCONNECTED;
  }

  function isPhoneNotConnected() {
    var sel = document.getElementById("selCtrlFigma");
    return !!(sel && sel.value === "not-connected");
  }

  function syncConnectToGameControl() {
    var connectBlock = document.getElementById("controlConnectToGameBlock");
    if (connectBlock) connectBlock.hidden = !isPhoneNotConnected();
  }

  function syncMobileDashboardStopPlayingMenuItem() {
    var item = document.getElementById("fcMobileDashStopPlayingMenuItem");
    if (!item) return;
    item.hidden = isLocalProfileDisconnected();
  }

  function syncMobileDashboardDisconnectedUi() {
    var disconnected = isLocalProfileDisconnected();
    var app = document.getElementById("app");
    if (app) app.setAttribute("data-profile-disconnected", disconnected ? "true" : "false");
    var root = getMobileDashRoot();
    if (root) root.setAttribute("data-profile-disconnected", disconnected ? "true" : "false");
    if (disconnected && typeof clearMissedNotification === "function") {
      clearMissedNotification({ animate: false });
    }
    syncMobileDashboardPlayerList();
    scheduleMobileDashboardViewScrollSync();
  }

  function connectLocalProfileToGame() {
    window.PROTOTYPE_LOCAL_PROFILE_DISCONNECTED = false;
    if (typeof window.syncPrototypeLocalCoplayers === "function") {
      window.syncPrototypeLocalCoplayers();
    }
    if (typeof window.applyTvPlayersJoinedFromControl === "function") {
      window.applyTvPlayersJoinedFromControl();
    }
    var selCtrl = document.getElementById("selCtrlFigma");
    if (selCtrl) {
      selCtrl.value = "connected";
      selCtrl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (
      window.TvPrototypeBridge &&
      typeof window.TvPrototypeBridge.launchFifa26FromGameTab === "function"
    ) {
      window.TvPrototypeBridge.launchFifa26FromGameTab();
    }
    syncMobileDashboardDisconnectedUi();
    syncMobileDashboardStopPlayingMenuItem();
    if (typeof window.setMobileDashboardOpen === "function") {
      window.setMobileDashboardOpen(false, { instant: true });
    }
    if (typeof window.PrototypePresence !== "undefined") {
      window.PrototypePresence.syncMobileLocalProfilePresence();
    }
  }

  function bindConnectToGameControl() {
    var btn = document.getElementById("btnConnectToGame");
    if (!btn || btn.getAttribute("data-connect-game-bound") === "1") return;
    btn.setAttribute("data-connect-game-bound", "1");
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      connectLocalProfileToGame();
    });
  }

  function closeMobileStopPlayingModal() {
    var modal = document.getElementById("fcMobileStopPlayingModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    window.setTimeout(function () {
      if (!modal.classList.contains("is-open")) {
        modal.setAttribute("hidden", "");
      }
    }, 240);
  }

  function openMobileStopPlayingModal() {
    var modal = document.getElementById("fcMobileStopPlayingModal");
    if (!modal) return;
    if (typeof window.closeAllMobilePopoverMenus === "function") {
      window.closeAllMobilePopoverMenus();
    }
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () {
      modal.classList.add("is-open");
      var leaveBtn = document.getElementById("fcMobileStopPlayingLeave");
      if (leaveBtn) leaveBtn.focus();
    });
  }

  function disconnectLocalProfileFromSession() {
    window.PROTOTYPE_LOCAL_PROFILE_DISCONNECTED = true;
    if (typeof window.syncPrototypeLocalCoplayers === "function") {
      window.syncPrototypeLocalCoplayers();
    }
    if (typeof window.applyTvPlayersJoinedFromControl === "function") {
      window.applyTvPlayersJoinedFromControl();
    }
    if (window.TvPrototypeBridge && typeof window.TvPrototypeBridge.setTvState === "function") {
      window.TvPrototypeBridge.setTvState("netflix-games");
    }
    if (typeof window.setMobileDashboardOpen === "function") {
      window.setMobileDashboardOpen(false, { instant: true });
    }
    var selCtrl = document.getElementById("selCtrlFigma");
    if (selCtrl) {
      selCtrl.value = "not-connected";
      selCtrl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    syncMobileDashboardDisconnectedUi();
    syncConnectToGameControl();
    syncMobileDashboardStopPlayingMenuItem();
    if (typeof window.PrototypePresence !== "undefined") {
      window.PrototypePresence.syncMobileLocalProfilePresence();
    }
  }

  function applyMobileStopPlayingLeaveGame() {
    closeMobileStopPlayingModal();
    disconnectLocalProfileFromSession();
  }

  var pendingRemoveControllerKey = null;

  function closeMobileRemoveControllerModal() {
    var modal = document.getElementById("fcMobileRemoveControllerModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    window.setTimeout(function () {
      if (!modal.classList.contains("is-open")) {
        modal.setAttribute("hidden", "");
      }
    }, 240);
    pendingRemoveControllerKey = null;
  }

  function openMobileRemoveControllerModal(playerKey) {
    if (!playerKey) return;
    var modal = document.getElementById("fcMobileRemoveControllerModal");
    if (!modal) return;
    if (typeof window.closeAllMobilePopoverMenus === "function") {
      window.closeAllMobilePopoverMenus();
    }
    pendingRemoveControllerKey = playerKey;
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () {
      modal.classList.add("is-open");
      var confirmBtn = document.getElementById("fcMobileRemoveControllerConfirm");
      if (confirmBtn) confirmBtn.focus();
    });
  }

  function applyMobileRemoveControllerConfirm() {
    var playerKey = pendingRemoveControllerKey;
    closeMobileRemoveControllerModal();
    if (!playerKey) return;
    var removed =
      typeof window.removeSessionCoplayerByKey === "function" &&
      window.removeSessionCoplayerByKey(playerKey);
    if (removed && typeof window.showMobileDashboardStatusToast === "function") {
      window.showMobileDashboardStatusToast({
        message: "Controller Removed",
        iconSrc: "assets/raster/game-invite-1-6683/toast-phone-controller-medium.svg",
      });
    }
  }

  function bindMobileRemoveControllerModalUi() {
    var modal = document.getElementById("fcMobileRemoveControllerModal");
    if (!modal || modal.getAttribute("data-remove-controller-bound") === "1") return;
    modal.setAttribute("data-remove-controller-bound", "1");

    var scrim = document.getElementById("fcMobileRemoveControllerScrim");
    var closeBtn = document.getElementById("fcMobileRemoveControllerClose");
    var confirmBtn = document.getElementById("fcMobileRemoveControllerConfirm");
    var cancelBtn = document.getElementById("fcMobileRemoveControllerCancel");

    if (scrim) {
      scrim.addEventListener("click", function (e) {
        e.preventDefault();
        closeMobileRemoveControllerModal();
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        closeMobileRemoveControllerModal();
      });
    }
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function (e) {
        e.preventDefault();
        applyMobileRemoveControllerConfirm();
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function (e) {
        e.preventDefault();
        closeMobileRemoveControllerModal();
      });
    }

    modal.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMobileRemoveControllerModal();
      }
    });
  }

  function bindMobileStopPlayingModalUi() {
    var modal = document.getElementById("fcMobileStopPlayingModal");
    if (!modal || modal.getAttribute("data-stop-playing-bound") === "1") return;
    modal.setAttribute("data-stop-playing-bound", "1");

    var scrim = document.getElementById("fcMobileStopPlayingScrim");
    var closeBtn = document.getElementById("fcMobileStopPlayingClose");
    var leaveBtn = document.getElementById("fcMobileStopPlayingLeave");
    var endAllBtn = document.getElementById("fcMobileStopPlayingEndAll");

    if (scrim) {
      scrim.addEventListener("click", function (e) {
        e.preventDefault();
        closeMobileStopPlayingModal();
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        closeMobileStopPlayingModal();
      });
    }
    if (leaveBtn) {
      leaveBtn.addEventListener("click", function (e) {
        e.preventDefault();
        applyMobileStopPlayingLeaveGame();
      });
    }
    if (endAllBtn) {
      endAllBtn.addEventListener("click", function (e) {
        e.preventDefault();
        closeMobileStopPlayingModal();
      });
    }

    modal.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMobileStopPlayingModal();
      }
    });
  }

  function bindMobileDashboardPeekActionsUi() {
    var endGameBtn = document.getElementById("fcMobileDashEndGame");
    if (!endGameBtn || endGameBtn.getAttribute("data-end-game-bound") === "1") return;
    endGameBtn.setAttribute("data-end-game-bound", "1");
    endGameBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof window.openTvDashboardExitFromController === "function") {
        window.openTvDashboardExitFromController({ exitOnly: true });
      }
    });
  }

  function bindMobileDashboardAddPeopleBtn() {
    var btn = document.getElementById("fcMobileDashAddPeopleBtn");
    if (!btn || btn.getAttribute("data-add-people-bound") === "1") return;
    btn.setAttribute("data-add-people-bound", "1");
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.openTvDashboardControllersFromMobile !== "function") return;
      if (isTvDashConnectionOnlyEligible()) {
        enterMobileConnectionOnlyMode();
        window.openTvDashboardControllersFromMobile({ connectionOnly: true });
        showConnectionOnlyAddPlayersPhoneToast();
        return;
      }
      window.openTvDashboardControllersFromMobile();
    });
  }

  function bindMobileDashboardDoneAddPlayersBtn() {
    var btn = document.getElementById("fcMobileDashDoneAddPlayersBtn");
    if (!btn || btn.getAttribute("data-done-add-players-bound") === "1") return;
    btn.setAttribute("data-done-add-players-bound", "1");
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      finishAddPlayersSession();
    });
  }

  function mobileDashboardScrollableContents() {
    return document.querySelectorAll(
      "#fcMobileDashViewHome > .fc-mobile-dash__content, " +
        "#fcMobileDashViewNotifications > .fc-mobile-dash__content, " +
        "#fcMobileDashViewFriends > .fc-mobile-dash__content, " +
        "#fcMobileDashViewAchievements > .fc-mobile-dash__content, " +
        "#fcMobileDashViewControllerSettings > .fc-mobile-dash__content, " +
        "#fcMobileDashViewEditProfile > .fc-mobile-dash__content, " +
        "#fcMobileDashViewAddPlayers > .fc-mobile-dash__content, " +
        "#fcMobileDashViewAddPlayersL2 > .fc-mobile-dash__content, " +
        "#fcMobileDashViewNotifDetail > .fc-mobile-dash__content"
    );
  }

  function mobileDashboardActiveScrollContent() {
    var root = getMobileDashRoot();
    if (!root || root.classList.contains("is-hidden") || !root.classList.contains("is-open")) return null;
    if (root.getAttribute("data-mobile-dashboard-l3")) return null;

    var view = root.getAttribute("data-mobile-dashboard-view");
    var l2 = root.getAttribute("data-mobile-dashboard-l2");

    if (l2 === "notifications") {
      return document.querySelector("#fcMobileDashViewNotifications > .fc-mobile-dash__content");
    }
    if (l2 === "friends") {
      return document.querySelector("#fcMobileDashViewFriends > .fc-mobile-dash__content");
    }
    if (l2 === "achievements") {
      return document.querySelector("#fcMobileDashViewAchievements > .fc-mobile-dash__content");
    }
    if (l2 === "controller-settings") {
      return document.querySelector("#fcMobileDashViewControllerSettings > .fc-mobile-dash__content");
    }
    if (l2 === "add-players") {
      return document.querySelector("#fcMobileDashViewAddPlayersL2 > .fc-mobile-dash__content");
    }
    if (l2 === "edit-profile") {
      return document.querySelector("#fcMobileDashViewEditProfile > .fc-mobile-dash__content");
    }
    if (l2 === "detail") {
      if (root.getAttribute("data-mobile-detail-view") === "sub-page") {
        return document.querySelector("#fcMobileDashViewNotifDetail > .fc-mobile-dash__content");
      }
      return null;
    }
    if (view === "add-players") {
      return document.querySelector("#fcMobileDashViewAddPlayers > .fc-mobile-dash__content");
    }
    if (!l2) {
      return document.querySelector("#fcMobileDashViewHome > .fc-mobile-dash__content");
    }
    return null;
  }

  function syncMobileDashboardScrollFade() {
    var root = getMobileDashRoot();
    if (!root) return;
    var isOpen = root.classList.contains("is-open") && !root.classList.contains("is-hidden");
    var nodes = mobileDashboardScrollableContents();

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var view = el.parentElement;
      if (!view) continue;
      var fade = view.querySelector(":scope > .fc-mobile-dash__scroll-fade");
      if (!fade) continue;

      if (!isOpen || view.getAttribute("aria-hidden") === "true" || view.classList.contains("is-hidden")) {
        fade.removeAttribute("data-md-scroll-fade");
        continue;
      }

      if (!el.classList.contains("is-scrollable")) {
        fade.removeAttribute("data-md-scroll-fade");
        continue;
      }

      var remaining = el.scrollHeight - el.clientHeight - el.scrollTop;
      fade.setAttribute("data-md-scroll-fade", remaining <= 2 ? "end" : "visible");
    }
  }

  /** Only enable scroll (and rubber-band) when content actually overflows. */
  function syncMobileDashboardViewScroll() {
    var root = getMobileDashRoot();
    var nodes = mobileDashboardScrollableContents();
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var view = el.parentElement;
      if (view && view.id === "fcMobileDashViewNotifDetail") {
        if (!root || root.getAttribute("data-mobile-detail-view") !== "sub-page") {
          el.classList.remove("is-scrollable");
          el.scrollTop = 0;
          continue;
        }
      }
      if (
        view &&
        (view.getAttribute("aria-hidden") === "true" || view.classList.contains("is-hidden"))
      ) {
        el.classList.remove("is-scrollable");
        el.scrollTop = 0;
        continue;
      }
      var overflows = el.scrollHeight > el.clientHeight + 1;
      el.classList.toggle("is-scrollable", overflows);
      if (!overflows) el.scrollTop = 0;
    }
    syncMobileDashboardScrollFade();
  }

  function scheduleMobileDashboardViewScrollSync() {
    syncMobileDashboardViewScroll();
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(syncMobileDashboardViewScroll);
    } else {
      syncMobileDashboardViewScroll();
    }
  }

  function bindMobileDashboardViewScrollSync() {
    if (document.documentElement.getAttribute("data-md-view-scroll-bound") === "1") return;
    document.documentElement.setAttribute("data-md-view-scroll-bound", "1");

    var nodes = mobileDashboardScrollableContents();
    if (typeof ResizeObserver === "function") {
      var ro = new ResizeObserver(scheduleMobileDashboardViewScrollSync);
      for (var i = 0; i < nodes.length; i++) ro.observe(nodes[i]);
    }
    for (var j = 0; j < nodes.length; j++) {
      nodes[j].addEventListener("scroll", syncMobileDashboardScrollFade, { passive: true });
    }
    window.addEventListener("resize", scheduleMobileDashboardViewScrollSync);
    scheduleMobileDashboardViewScrollSync();
  }

  function syncMobileDashboardProfileIdentityUi() {
    var dash = getMobileDashRoot();
    if (!dash) return;
    var identity = dash.querySelector(".fc-mobile-dash__view--home .fc-mobile-dash__identity");
    if (!identity) return;

    if (isPlatformPhase05()) {
      identity.removeAttribute("role");
      identity.removeAttribute("tabindex");
      identity.removeAttribute("aria-label");
    } else {
      identity.setAttribute("role", "button");
      identity.setAttribute("tabindex", "0");
      identity.setAttribute("aria-label", "View my profile");
    }
  }

  function bindMobileDashboardProfileIdentityUi() {
    var dash = getMobileDashRoot();
    if (!dash || dash.getAttribute("data-profile-identity-bound") === "1") return;
    dash.setAttribute("data-profile-identity-bound", "1");

    var identity = dash.querySelector(".fc-mobile-dash__view--home .fc-mobile-dash__identity");
    if (!identity) return;

    function openProfile(e) {
      if (isPlatformPhase05()) return;
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (typeof window.openMobileLocalProfile === "function") {
        window.openMobileLocalProfile();
      }
    }

    identity.addEventListener("click", openProfile);
    identity.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      openProfile(e);
    });

    syncMobileDashboardProfileIdentityUi();
  }

  /** @type {{ kind: string } | null} */
  var missedNotifState = null;

  function readMissedNotifState() {
    if (
      typeof window.isMultiLocalSession === "function" &&
      window.isMultiLocalSession() &&
      typeof window.getMissedNotificationForActiveLocalPlayer === "function"
    ) {
      return window.getMissedNotificationForActiveLocalPlayer();
    }
    return missedNotifState;
  }

  function writeMissedNotifState(next) {
    if (
      typeof window.isMultiLocalSession === "function" &&
      window.isMultiLocalSession()
    ) {
      if (!next) {
        if (typeof window.clearMissedNotificationForActiveLocalPlayer === "function") {
          window.clearMissedNotificationForActiveLocalPlayer();
        }
      }
      return;
    }
    missedNotifState = next;
  }
  var MISSED_CARD_ANIM_MS = 360;
  var missedCardVisible = false;
  var missedCardExitTimer = null;
  var missedCardExitListener = null;

  function prefersReducedMissedMotion() {
    return !!(
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function isMissedDisplayInline() {
    var root = getMobileDashRoot();
    return !!(root && root.getAttribute("data-missed-notif-display") === "inline");
  }

  function clearMissedCardExitTimer() {
    if (missedCardExitTimer) {
      window.clearTimeout(missedCardExitTimer);
      missedCardExitTimer = null;
    }
  }

  function detachMissedCardExitListener(slot, card) {
    if (!missedCardExitListener) return;
    var listenEl = isMissedDisplayInline() ? slot : card;
    if (listenEl) listenEl.removeEventListener("transitionend", missedCardExitListener);
    missedCardExitListener = null;
  }

  function finishMissedCardHide(slot, root) {
    clearMissedCardExitTimer();
    detachMissedCardExitListener(slot, document.getElementById("fcMobileDashMissedCard"));
    missedCardVisible = false;
    if (slot) {
      slot.classList.remove("is-missed-open");
      slot.hidden = true;
    }
    if (root) root.removeAttribute("data-missed-card-visible");
    scheduleMobileDashboardViewScrollSync();
  }

  function missedNotifAssets() {
    return window.FIGMA_MOBILE_DASHBOARD_NOTIFICATIONS_ASSETS || {};
  }

  function defaultMissedGameThumb() {
    if (typeof window.getGameInviteThumbnailSrc === "function") {
      return window.getGameInviteThumbnailSrc();
    }
    var pack = missedNotifAssets();
    return pack.listItemGameImage || pack.listItemThumbnail || "";
  }

  function defaultMissedGameBadge() {
    var pack = missedNotifAssets();
    return (
      (window.PROTOTYPE_PLAYER_AVATARS && window.PROTOTYPE_PLAYER_AVATARS.inviter) ||
      pack.listItemAvatar ||
      "assets/profile-avatars/type-01-luffy.png"
    );
  }

  function defaultMissedFriendAvatar() {
    var pack = missedNotifAssets();
    return pack.listItemAvatar || "assets/profile-avatars/type-01-scarlet.png";
  }

  function toastKindToOutcomeKind(toastKind) {
    if (toastKind === "friend-invite") return "friend-request";
    if (toastKind === "achievement") return "achievement";
    return "game-invite";
  }

  function resolveMissedNotificationRow(toastKind) {
    var track =
      typeof window.getMobileNotificationTrack === "function"
        ? window.getMobileNotificationTrack()
        : document.getElementById("tvDashboardNotificationsListTrack");
    if (!track) return null;
    if (toastKind === "friend-invite") {
      return (
        track.querySelector(
          '.game-invite-list__item[data-notification-source="friend-request"].game-invite-list__item--notification-unread'
        ) ||
        track.querySelector('.game-invite-list__item[data-notification-source="friend-request"]')
      );
    }
    if (toastKind === "achievement") {
      return (
        track.querySelector(
          '.game-invite-list__item[data-notification-source="achievement"].game-invite-list__item--notification-unread'
        ) ||
        track.querySelector('.game-invite-list__item[data-notification-source="achievement"]')
      );
    }
    return (
      track.querySelector(
        '.game-invite-list__item[data-notification-source="tv-game-invite-toast"].game-invite-list__item--notification-unread'
      ) ||
      track.querySelector('.game-invite-list__item[data-notification-source="tv-game-invite-toast"]')
    );
  }

  function missedInviteHandle(tvRow, toastKind) {
    if (toastKind === "friend-invite") {
      var nameEl = tvRow && tvRow.querySelector(".game-invite-list__name");
      var raw = nameEl ? (nameEl.textContent || "").trim() : "";
      return raw.replace(/\s+wants to be friends\.?$/i, "").trim() || "Friend";
    }
    var ph = window.PROTOTYPE_PLAYER_HANDLES;
    if (ph && ph.inviter) return String(ph.inviter).trim();
    var invSpan = tvRow && tvRow.querySelector('[data-prototype-player-handle="inviter"]');
    return invSpan ? invSpan.textContent.replace(/\s+/g, " ").trim() : "Friend";
  }

  function missedGameTitle(tvRow) {
    var subEl = tvRow && tvRow.querySelector(".game-invite-list__sub");
    var sub = subEl ? subEl.textContent.replace(/\s+/g, " ").trim() : "";
    if (sub) return sub;
    return localSessionGameTitle();
  }

  function shouldShowMissedCard() {
    if (isPlatformPhase05()) return false;
    var state = readMissedNotifState();
    if (!state || !isEvolutionMode() || !isMobileDashOpen()) return false;
    var root = getMobileDashRoot();
    if (!root || root.getAttribute("data-mobile-dashboard-view") !== "home") return false;
    if (root.getAttribute("data-mobile-dashboard-l2")) return false;
    if (root.getAttribute("data-mobile-dashboard-l3")) return false;
    if (!resolveMissedNotificationRow(state.kind)) {
      writeMissedNotifState(null);
      return false;
    }
    return true;
  }

  function showMissedCardAnimated() {
    var slot = document.getElementById("fcMobileDashMissedSlot");
    var root = getMobileDashRoot();
    if (!slot) return;

    clearMissedCardExitTimer();
    detachMissedCardExitListener(slot, document.getElementById("fcMobileDashMissedCard"));
    slot.hidden = false;
    if (prefersReducedMissedMotion()) {
      slot.classList.add("is-missed-open");
      missedCardVisible = true;
      if (root) root.setAttribute("data-missed-card-visible", "true");
      scheduleMobileDashboardViewScrollSync();
      return;
    }

    slot.classList.remove("is-missed-open");
    void slot.offsetHeight;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        slot.classList.add("is-missed-open");
        missedCardVisible = true;
        if (root) root.setAttribute("data-missed-card-visible", "true");
        scheduleMobileDashboardViewScrollSync();
      });
    });
  }

  function hideMissedCard(immediate) {
    var slot = document.getElementById("fcMobileDashMissedSlot");
    var card = document.getElementById("fcMobileDashMissedCard");
    var root = getMobileDashRoot();
    if (!slot) return;

    if (immediate || prefersReducedMissedMotion() || !missedCardVisible || slot.hidden) {
      resetMissedCardOutcomeUi();
      finishMissedCardHide(slot, root);
      return;
    }

    clearMissedCardExitTimer();
    detachMissedCardExitListener(slot, card);

    var listenEl = isMissedDisplayInline() ? slot : card;
    var done = false;

    function completeHide() {
      if (done) return;
      done = true;
      detachMissedCardExitListener(slot, card);
      clearMissedCardExitTimer();
      resetMissedCardOutcomeUi();
      finishMissedCardHide(slot, root);
    }

    slot.classList.remove("is-missed-open");

    if (!listenEl) {
      completeHide();
      return;
    }

    missedCardExitListener = function (e) {
      if (e.target !== listenEl) return;
      if (
        e.propertyName !== "transform" &&
        e.propertyName !== "grid-template-rows" &&
        e.propertyName !== "opacity"
      ) {
        return;
      }
      completeHide();
    };
    listenEl.addEventListener("transitionend", missedCardExitListener);
    missedCardExitTimer = window.setTimeout(completeHide, MISSED_CARD_ANIM_MS + 48);
  }

  function populateMissedCard(toastKind, tvRow) {
    var titleEl = document.getElementById("fcMobileDashMissedTitle");
    var subEl = document.getElementById("fcMobileDashMissedSub");
    var gameEl = document.getElementById("fcMobileDashMissedGame");
    var thumbWrap = document.getElementById("fcMobileDashMissedThumb");
    var gameImg = document.getElementById("fcMobileDashMissedThumbGame");
    var avatarImg = document.getElementById("fcMobileDashMissedThumbAvatar");
    if (!titleEl || !thumbWrap || !gameImg) return;

    var handle = missedInviteHandle(tvRow, toastKind);
    if (toastKind === "friend-invite") {
      titleEl.textContent = handle + " wants to be friends";
      if (subEl) subEl.hidden = true;
      thumbWrap.classList.add("fc-mobile-dash__missed-thumb--avatar-only");
      var frAv =
        (tvRow &&
          tvRow.querySelector(".game-invite-list__avatar img") &&
          tvRow.querySelector(".game-invite-list__avatar img").getAttribute("src")) ||
        defaultMissedFriendAvatar();
      gameImg.src = frAv;
      gameImg.alt = "";
      if (avatarImg) avatarImg.hidden = true;
      return;
    }

    if (toastKind === "achievement") {
      var achTitle =
        (tvRow && tvRow.getAttribute("data-achievement-title")) || "Achievement";
      titleEl.textContent = "Achievement unlocked";
      if (subEl) {
        subEl.hidden = false;
        subEl.textContent = achTitle;
      }
      if (gameEl) gameEl.textContent = "";
      thumbWrap.classList.remove("fc-mobile-dash__missed-thumb--avatar-only");
      var achThumb = tvRow && tvRow.querySelector(".game-invite-list__thumb img");
      gameImg.src =
        (achThumb && achThumb.getAttribute("src")) ||
        (tvRow && tvRow.getAttribute("data-achievement-image")) ||
        "assets/raster/dashboard-achievements-fifa/fifa-unlock-01.svg";
      gameImg.alt = "";
      if (avatarImg) avatarImg.hidden = true;
      return;
    }

    titleEl.textContent = handle + " invited you";
    if (subEl) subEl.hidden = false;
    if (gameEl) gameEl.textContent = missedGameTitle(tvRow);
    thumbWrap.classList.remove("fc-mobile-dash__missed-thumb--avatar-only");

    var toastThumb = tvRow && tvRow.querySelector(".game-invite-list__thumb img");
    gameImg.src =
      (toastThumb && toastThumb.getAttribute("src")) || defaultMissedGameThumb();
    gameImg.alt = "";
    if (avatarImg) {
      avatarImg.hidden = false;
      avatarImg.src = defaultMissedGameBadge();
      avatarImg.alt = "";
    }
  }

  function syncMobileDashboardMissedCard() {
    var slot = document.getElementById("fcMobileDashMissedSlot");
    var root = getMobileDashRoot();
    if (!slot) return;

    if (isLocalProfileDisconnected()) {
      hideMissedCard(true);
      return;
    }

    if (!shouldShowMissedCard()) {
      hideMissedCard(true);
      return;
    }

    var state = readMissedNotifState();
    var tvRow = resolveMissedNotificationRow(state.kind);
    if (!tvRow) {
      writeMissedNotifState(null);
      hideMissedCard(true);
      return;
    }

    populateMissedCard(state.kind, tvRow);
    buildMissedCardActions(state.kind, tvRow);

    if (missedCardVisible && slot.classList.contains("is-missed-open") && !slot.hidden) {
      if (root) root.setAttribute("data-missed-card-visible", "true");
      scheduleMobileDashboardViewScrollSync();
      return;
    }

    showMissedCardAnimated();
  }

  function clearMissedNotification(opts) {
    opts = opts || {};
    writeMissedNotifState(null);
    hideMissedCard(!opts.animate);
  }

  function markEvolutionControllerToastMissed(kind) {
    if (isPlatformPhase05()) return;
    if (
      !isEvolutionMode() ||
      (kind !== "game-invite" && kind !== "friend-invite" && kind !== "achievement")
    ) {
      return;
    }
    if (
      typeof window.isMultiLocalSession === "function" &&
      window.isMultiLocalSession() &&
      typeof window.markMissedNotificationForActiveLocalPlayer === "function"
    ) {
      window.markMissedNotificationForActiveLocalPlayer(kind);
      syncMobileDashboardMissedCard();
      return;
    }
    missedNotifState = { kind: kind };
    syncMobileDashboardMissedCard();
  }

  function resetMissedCardOutcomeUi() {
    var card = document.getElementById("fcMobileDashMissedCard");
    var actions = document.getElementById("fcMobileDashMissedActions");
    if (card) {
      if (window.fcMobileNotifOutcome && typeof window.fcMobileNotifOutcome.clearTimers === "function") {
        window.fcMobileNotifOutcome.clearTimers(card);
      }
      card.removeAttribute("data-notif-outcome");
    }
    if (actions) actions.innerHTML = "";
  }

  function buildMissedCardActions(toastKind, tvRow) {
    resetMissedCardOutcomeUi();
    var actions = document.getElementById("fcMobileDashMissedActions");
    var card = document.getElementById("fcMobileDashMissedCard");
    if (!actions || !card || !tvRow) return;
    if (toastKind === "achievement") return;
    var outcomeKind = toastKindToOutcomeKind(toastKind);
    if (
      window.fcMobileNotifOutcome &&
      typeof window.fcMobileNotifOutcome.buildOutcomeCtaStage === "function"
    ) {
      actions.appendChild(
        window.fcMobileNotifOutcome.buildOutcomeCtaStage(tvRow, card, outcomeKind)
      );
    }
  }

  function dismissMissedCardOnly() {
    var card = document.getElementById("fcMobileDashMissedCard");
    if (card && card.getAttribute("data-notif-outcome")) {
      resetMissedCardOutcomeUi();
    }
    clearMissedNotification({ animate: true });
  }

  function bindMissedCardUi() {
    var dismissBtn = document.getElementById("fcMobileDashMissedDismissBtn");
    if (dismissBtn && dismissBtn.getAttribute("data-missed-bound") !== "1") {
      dismissBtn.setAttribute("data-missed-bound", "1");
      dismissBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        dismissMissedCardOnly();
      });
    }
  }

  var STATUS_TOAST_DWELL_MS = 2600;
  var statusToastTimer = null;
  var statusToastExitTimer = null;
  var statusToastUndoCallback = null;
  var statusToastDismissCallback = null;

  function bindStatusToastUi() {
    var undoBtn = document.getElementById("fcMobileDashStatusToastUndo");
    if (!undoBtn || undoBtn.getAttribute("data-bound") === "1") return;
    undoBtn.setAttribute("data-bound", "1");
    undoBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var undo = statusToastUndoCallback;
      statusToastUndoCallback = null;
      statusToastDismissCallback = null;
      dismissMobileDashboardStatusToast(true);
      if (typeof undo === "function") undo();
    });
  }

  function dismissMobileDashboardStatusToast(immediate) {
    var toast = document.getElementById("fcMobileDashStatusToast");
    var layer = document.getElementById("fcMobileDashStatusToastLayer");
    var undoBtn = document.getElementById("fcMobileDashStatusToastUndo");
    var iconEl = document.getElementById("fcMobileDashStatusToastIcon");
    if (!toast || !layer) return;

    if (statusToastTimer) {
      window.clearTimeout(statusToastTimer);
      statusToastTimer = null;
    }
    if (statusToastExitTimer) {
      window.clearTimeout(statusToastExitTimer);
      statusToastExitTimer = null;
    }

    function finishHide() {
      toast.hidden = true;
      toast.classList.remove(
        "fc-mobile-dash__status-toast--in",
        "fc-mobile-dash__status-toast--out",
        "fc-mobile-dash__status-toast--with-undo"
      );
      layer.classList.remove("fc-mobile-dash__status-toast-layer--interactive");
      layer.setAttribute("aria-hidden", "true");
      if (undoBtn) undoBtn.hidden = true;
      if (iconEl) iconEl.classList.remove("fc-mobile-dash__status-toast-icon--dark");
      if (statusToastDismissCallback) {
        var onDismiss = statusToastDismissCallback;
        statusToastDismissCallback = null;
        onDismiss();
      }
      statusToastUndoCallback = null;
    }

    if (immediate || !toast.classList.contains("fc-mobile-dash__status-toast--in")) {
      finishHide();
      return;
    }

    toast.classList.remove("fc-mobile-dash__status-toast--in");
    toast.classList.add("fc-mobile-dash__status-toast--out");
    statusToastExitTimer = window.setTimeout(function () {
      statusToastExitTimer = null;
      finishHide();
    }, 280);
  }

  function resolveStatusToastIconSrc(iconKey) {
    var dashAssets = window.FIGMA_MOBILE_DASHBOARD_ASSETS;
    if (dashAssets && dashAssets[iconKey]) return dashAssets[iconKey];
    var apAssets = window.FIGMA_MOBILE_DASHBOARD_ADD_PLAYERS_ASSETS;
    if (apAssets && apAssets[iconKey]) return apAssets[iconKey];
    return null;
  }

  function showMobileDashboardStatusToast(opts) {
    opts = opts || {};
    var toast = document.getElementById("fcMobileDashStatusToast");
    var layer = document.getElementById("fcMobileDashStatusToastLayer");
    var textEl = document.getElementById("fcMobileDashStatusToastText");
    var iconEl = document.getElementById("fcMobileDashStatusToastIcon");
    var undoBtn = document.getElementById("fcMobileDashStatusToastUndo");
    var dash = document.getElementById("fcMobileDashboard");
    if (!toast || !layer || !textEl || !dash || !dash.classList.contains("is-open")) return;

    dismissMobileDashboardStatusToast(true);

    textEl.textContent = opts.message || "";
    statusToastUndoCallback = typeof opts.onUndo === "function" ? opts.onUndo : null;
    statusToastDismissCallback =
      typeof opts.onDismiss === "function" ? opts.onDismiss : null;

    if (undoBtn) {
      if (statusToastUndoCallback) {
        undoBtn.hidden = false;
        undoBtn.textContent = opts.undoLabel || "Undo";
        toast.classList.add("fc-mobile-dash__status-toast--with-undo");
        layer.classList.add("fc-mobile-dash__status-toast-layer--interactive");
      } else {
        undoBtn.hidden = true;
        toast.classList.remove("fc-mobile-dash__status-toast--with-undo");
        layer.classList.remove("fc-mobile-dash__status-toast-layer--interactive");
      }
    }

    if (iconEl) {
      iconEl.classList.toggle("fc-mobile-dash__status-toast-icon--dark", !!opts.iconDark);
      var iconKey = opts.iconKey || "userAddSmall";
      var iconSrc = opts.iconSrc || resolveStatusToastIconSrc(iconKey);
      if (iconSrc) {
        iconEl.src = iconSrc;
      } else {
        iconEl.setAttribute("data-md", iconKey);
      }
      iconEl.hidden = opts.hideIcon === true;
    }

    toast.hidden = false;
    layer.setAttribute("aria-hidden", "false");
    void toast.offsetWidth;
    window.requestAnimationFrame(function () {
      toast.classList.add("fc-mobile-dash__status-toast--in");
      statusToastTimer = window.setTimeout(function () {
        statusToastTimer = null;
        dismissMobileDashboardStatusToast(false);
      }, opts.dwellMs || STATUS_TOAST_DWELL_MS);
    });
  }

  function initMobileDashboardInviteUi() {
    bindStatusToastUi();
    bindMobileInviteButtons();
    bindMobileShareCard();
    bindFriendsL2Ui();
    bindAddPlayersL2Ui();
    bindFindFriendsL2Ui();
    bindAchievementsL2Ui();
    bindControllerSettingsL2Ui();
    bindMobileDashboardProfileIdentityUi();
    bindMobileDashboardPlayerListSync();
    bindMobileStopPlayingModalUi();
    bindMobileRemoveControllerModalUi();
    bindMobileDashboardPeekActionsUi();
    bindMobileDashboardAddPeopleBtn();
    bindMobileDashboardDoneAddPlayersBtn();
    bindMissedCardUi();
    bindConnectToGameControl();
    syncMobileDashboardStopPlayingMenuItem();
    syncMobileDashboardDisconnectedUi();
    syncConnectToGameControl();
    bindMobileDashboardViewScrollSync();
    if (typeof window.bindMobileDashboardFriendDetailClicks === "function") {
      window.bindMobileDashboardFriendDetailClicks();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileDashboardInviteUi);
  } else {
    initMobileDashboardInviteUi();
  }

  function syncMobileDashboardFriendsList() {
    renderMobileDashboardHomeFriendsList();
    renderMobileDashboardAchievementsInline();
    if (friendsL2Open) {
      renderMobileDashboardFriendsL2List();
    }
    if (achievementsL2Open) {
      renderMobileDashboardAchievementsL2();
    }
    renderMobileDashboardFriendsList();
    syncMobileDashboardMissedCard();
    if (typeof window.PrototypePresence !== "undefined") {
      window.PrototypePresence.syncMobileLocalProfilePresence();
    }
    scheduleMobileDashboardViewScrollSync();
  }

  window.isTvDashConnectionOnlyEligible = isTvDashConnectionOnlyEligible;
  window.enterMobileConnectionOnlyMode = enterMobileConnectionOnlyMode;
  window.exitMobileConnectionOnlyMode = exitMobileConnectionOnlyMode;
  window.syncMobileConnectionOnlyUi = syncMobileConnectionOnlyUi;
  window.isAddPlayersSubPageMode = isAddPlayersSubPageMode;
  window.isPlatformPhase05 = isPlatformPhase05;
  window.isPhase05OtherLocalPlayerKey = isPhase05OtherLocalPlayerKey;
  window.isPhase05InactivePlayerListEntry = isPhase05InactivePlayerListEntry;
  window.applyPlatformPhaseSideEffects = applyPlatformPhaseSideEffects;
  window.collectTvDashboardFriendEntries = collectTvDashboardFriendEntries;
  window.setHomeFriendsListMode = setHomeFriendsListMode;
  window.syncMobileDashboardFriendsList = syncMobileDashboardFriendsList;
  window.syncMobileDashboardPlayerList = syncMobileDashboardPlayerList;
  window.clearPlayerListEntryConnecting = clearPlayerListEntryConnecting;
  window.resolveMobileDashboardPlayerListEntryDisplay = resolveMobileDashboardPlayerListEntryDisplay;
  window.syncMobileDashboardStopPlayingMenuItem = syncMobileDashboardStopPlayingMenuItem;
  window.syncMobileDashboardDisconnectedUi = syncMobileDashboardDisconnectedUi;
  window.syncConnectToGameControl = syncConnectToGameControl;
  window.connectLocalProfileToGame = connectLocalProfileToGame;
  window.openMobileStopPlayingModal = openMobileStopPlayingModal;
  window.openMobileRemoveControllerModal = openMobileRemoveControllerModal;
  window.closeMobileRemoveControllerModal = closeMobileRemoveControllerModal;
  window.shouldShowMobileStopPlayingAction = function () {
    return hasLocalSessionCoplayers() && !isLocalProfileDisconnected();
  };
  window.closeMobileStopPlayingModal = closeMobileStopPlayingModal;
  window.syncMobileDashboardViewScroll = syncMobileDashboardViewScroll;
  window.scheduleMobileDashboardViewScrollSync = scheduleMobileDashboardViewScrollSync;
  window.openMobileDashboardFriends = openFriendsL2;
  window.closeMobileDashboardFriends = closeFriendsL2;
  window.markMobileDashboardFriendsL2Open = markFriendsL2Open;
  window.resetMobileDashboardFriendsL2 = resetFriendsL2;
  window.openMobileDashboardAddPlayersL2 = openAddPlayersL2;
  window.closeMobileDashboardAddPlayersL2 = closeAddPlayersL2;
  window.markMobileDashboardAddPlayersL2Open = markAddPlayersL2Open;
  window.resetMobileDashboardAddPlayersL2 = resetAddPlayersL2;
  window.openMobileDashboardFindFriendsL2 = openFindFriendsL2;
  window.closeMobileDashboardFindFriendsL2 = closeFindFriendsL2;
  window.markMobileDashboardFindFriendsL2Open = markFindFriendsL2Open;
  window.resetMobileDashboardFindFriendsL2 = resetFindFriendsL2;
  window.openMobileDashboardAchievements = openAchievementsL2;
  window.closeMobileDashboardAchievements = closeAchievementsL2;
  window.markMobileDashboardAchievementsL2Open = markAchievementsL2Open;
  window.resetMobileDashboardAchievementsL2 = resetAchievementsL2;
  window.openMobileDashboardControllerSettings = openMobileDashboardControllerSettings;
  window.openMobileDashboardDeepLink = openMobileDashboardDeepLink;
  window.stageMobileDashboardL2DeepLink = stageMobileDashboardL2DeepLink;
  window.finishMobileDashboardL2DeepLink = finishMobileDashboardL2DeepLink;
  window.clearMobileDashboardL2EnterMode = clearMobileDashboardL2EnterMode;
  window.closeMobileDashboardControllerSettings = closeControllerSettingsL2;
  window.resetMobileDashboardControllerSettingsL2 = resetControllerSettingsL2;
  window.resetAllMobileDashboardL2 = resetAllMobileDashboardL2;
  window.captureMobileDashboardUiForLocalPlayer = captureMobileDashboardUiForLocalPlayer;
  window.resetActiveLocalPlayerMobileDashboardUi = resetActiveLocalPlayerMobileDashboardUi;
  window.restoreMobileDashboardUiForLocalPlayer = restoreMobileDashboardUiForLocalPlayer;
  window.markActiveLocalPlayerMobileDashboardManualToggle =
    markActiveLocalPlayerMobileDashboardManualToggle;
  window.syncMobileDashboardOpenForLocalPlayer = syncMobileDashboardOpenForLocalPlayer;
  window.isLocalPlayerControllerSwapActive = isLocalPlayerControllerSwapActive;
  window.cycleControllerSettingsHaptics = function () {
    controllerHapticsEnabled = !controllerHapticsEnabled;
    syncControllerSettingsHapticsToggles();
  };
  window.syncControllerSettingsHapticsUi = syncControllerSettingsHapticsToggles;
  window.syncControllerSettingsSoundToggles = syncControllerSettingsSoundToggles;
  window.syncControllerSettingsUi = syncControllerSettingsUi;
  window.bindControllerSettingsControls = bindControllerSettingsControls;
  window.disconnectControllerPrototype = disconnectControllerPrototype;
  window.showMobileDashboardStatusToast = showMobileDashboardStatusToast;
  window.dismissMobileDashboardStatusToast = dismissMobileDashboardStatusToast;
  window.syncMobileDashboardHomeFriendsList = renderMobileDashboardHomeFriendsList;
  window.syncMobileDashboardAchievementsInline = renderMobileDashboardAchievementsInline;
  window.renderMobileDashboardAchievementsL2 = renderMobileDashboardAchievementsL2;
  window.syncMobileDashboardMissedCard = syncMobileDashboardMissedCard;
  window.markEvolutionControllerToastMissed = markEvolutionControllerToastMissed;
  window.clearMissedNotification = clearMissedNotification;
  window.syncMobileInviteButtonFromTvInvite = syncMobileInviteButtonFromTvInvite;
  window.clearMobileInviteButtonStates = clearMobileInviteButtonStates;
  window.resetMobileDashboardInviteSession = resetMobileDashboardInviteSession;
  window.startMobileInviteFriendFlow = startMobileInviteFriendFlow;
  window.completeMobileInviteForKey = completeInviteForKey;
  window.getMobileInviteUiStateForKey = inviteUiStateForKey;
  window.initMobileDashboardInviteUi = initMobileDashboardInviteUi;
})();
