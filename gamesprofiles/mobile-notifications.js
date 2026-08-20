/**
 * Evolution mobile dashboard — notification center L2 (Figma 132:3895).
 * Mirrors #tvDashboardNotificationsListTrack data and delegates interactions to TV handlers.
 */
(function () {
  "use strict";

  function notifAssets() {
    return window.FIGMA_MOBILE_DASHBOARD_NOTIFICATIONS_ASSETS || {};
  }

  function gameInviteThumbnailSrc() {
    var assets = window.PROTOTYPE_GAME_ASSETS;
    if (assets && assets.tvGameInviteThumb) return assets.tvGameInviteThumb;
    if (window.PROTOTYPE_TV_GAME_INVITE_THUMB) return window.PROTOTYPE_TV_GAME_INVITE_THUMB;
    var pack = notifAssets();
    return pack.listItemGameImage || pack.listItemThumbnail || "";
  }

  function defaultGameInviteThumb() {
    return gameInviteThumbnailSrc();
  }

  function defaultGameInviteBadge() {
    var pack = notifAssets();
    return (
      (window.PROTOTYPE_PLAYER_AVATARS && window.PROTOTYPE_PLAYER_AVATARS.inviter) ||
      pack.listItemAvatar ||
      "assets/profile-avatars/type-01-luffy.png"
    );
  }

  function defaultFriendAvatar() {
    var pack = notifAssets();
    return pack.listItemAvatar || "assets/profile-avatars/type-01-scarlet.png";
  }

  var l2Open = false;
  var l2Animating = false;
  var notifEmptyTransitionTimer = null;
  var NOTIF_LIST_EMPTY_MS = 320;

  function getNotificationsContentEl() {
    return document.querySelector("#fcMobileDashViewNotifications > .fc-mobile-dash__content");
  }

  function clearNotificationListEmptyTransitionTimer() {
    if (notifEmptyTransitionTimer) {
      window.clearTimeout(notifEmptyTransitionTimer);
      notifEmptyTransitionTimer = null;
    }
  }

  function clearNotificationListEmptyTransition() {
    clearNotificationListEmptyTransitionTimer();
    var content = getNotificationsContentEl();
    if (content) {
      content.classList.remove("is-notif-list-emptying");
      content.style.minHeight = "";
    }
  }

  function finishNotificationListEmptyTransition() {
    notifEmptyTransitionTimer = null;
    var empty = document.getElementById("fcMobileNotifEmpty");
    var list = document.getElementById("fcMobileNotifList");
    var content = getNotificationsContentEl();
    if (list) {
      list.hidden = true;
      list.classList.remove("fc-mobile-notif__list--emptying");
    }
    if (empty) {
      empty.hidden = false;
      empty.classList.add("fc-mobile-notif__empty-card--visible");
    }
    if (content) {
      content.classList.remove("is-notif-list-emptying");
      content.style.minHeight = "";
    }
  }

  function beginNotificationListEmptyTransition() {
    var empty = document.getElementById("fcMobileNotifEmpty");
    var list = document.getElementById("fcMobileNotifList");
    var content = getNotificationsContentEl();
    if (!empty || !list || list.hidden) return;

    var listHeight = list.getBoundingClientRect().height;
    if (content) {
      content.classList.add("is-notif-list-emptying");
      if (listHeight > 0) content.style.minHeight = listHeight + "px";
    }

    empty.hidden = false;
    empty.classList.remove("fc-mobile-notif__empty-card--visible");
    void empty.offsetWidth;
    list.classList.add("fc-mobile-notif__list--emptying");

    window.requestAnimationFrame(function () {
      empty.classList.add("fc-mobile-notif__empty-card--visible");
    });

    clearNotificationListEmptyTransitionTimer();
    notifEmptyTransitionTimer = window.setTimeout(
      finishNotificationListEmptyTransition,
      NOTIF_LIST_EMPTY_MS
    );
  }

  function getRoot() {
    return document.getElementById("fcMobileDashboard");
  }

  function isLocalPlayerControllerSwapActive() {
    if (typeof window.isLocalPlayerControllerSwapActive === "function") {
      return window.isLocalPlayerControllerSwapActive();
    }
    var root = getRoot();
    return !!(root && root.getAttribute("data-local-player-swap") === "1");
  }

  function finishL2Animation(done) {
    if (isLocalPlayerControllerSwapActive()) {
      done();
      return;
    }
    window.setTimeout(done, 340);
  }

  function getTvTrack() {
    if (typeof window.getMobileNotificationTrack === "function") {
      var track = window.getMobileNotificationTrack();
      if (track) return track;
    }
    return document.getElementById("tvDashboardNotificationsListTrack");
  }

  function isEvolutionMode() {
    var app = document.getElementById("app");
    return app && app.getAttribute("data-platform-experience") === "evolution";
  }

  function normalizeNotifListActionsMode(mode) {
    if (mode === "off") return "off";
    if (mode === "inline-icons") return "inline-icons";
    if (mode === "on" || mode === "inline-buttons") return "inline-buttons";
    return "inline-buttons";
  }

  function getNotifListActionsMode() {
    if (!isEvolutionMode()) return "inline-buttons";
    var app = document.getElementById("app");
    return normalizeNotifListActionsMode(
      app ? app.getAttribute("data-mobile-notif-list-actions") : "inline-buttons"
    );
  }

  function notifListActionsEnabled() {
    return getNotifListActionsMode() !== "off";
  }

  function isNotifListActionsIconMode() {
    return getNotifListActionsMode() === "inline-icons";
  }

  function setNotifListActionsMode(mode) {
    var normalized = normalizeNotifListActionsMode(mode);
    var app = document.getElementById("app");
    if (app) {
      app.setAttribute("data-mobile-notif-list-actions", normalized);
    }
    var sel = document.getElementById("selNotifListActions");
    if (sel) sel.value = normalized;
    syncMobileNotificationList();
  }

  function setNotifListActionsEnabled(enabled) {
    setNotifListActionsMode(enabled ? "inline-buttons" : "off");
  }

  function isMobileDashOpen() {
    var root = getRoot();
    return !!(root && root.classList.contains("is-open"));
  }

  var LIST_ROW_MENU_DIVIDER = { divider: true };

  function markTvRowRead(tvRow) {
    if (!tvRow || !tvRow.classList) return;
    tvRow.classList.remove("game-invite-list__item--notification-unread");
    if (typeof window.syncTvHeaderGameInviteNotificationBadge === "function") {
      window.syncTvHeaderGameInviteNotificationBadge();
    }
  }

  function markTvRowUnread(tvRow) {
    if (!tvRow || !tvRow.classList) return;
    tvRow.classList.add("game-invite-list__item--notification-unread");
    if (typeof window.syncTvHeaderGameInviteNotificationBadge === "function") {
      window.syncTvHeaderGameInviteNotificationBadge();
    }
  }

  function notificationListMoreMenuItems(tvRow) {
    var unread =
      tvRow &&
      tvRow.classList &&
      tvRow.classList.contains("game-invite-list__item--notification-unread");
    return [
      { action: "profile", label: "Profile" },
      LIST_ROW_MENU_DIVIDER,
      { action: "toggle-read", label: unread ? "Mark Read" : "Mark Unread" },
      { action: "delete", label: "Delete", destructive: true },
    ];
  }

  function lookupHandleKeyForDisplayName(displayName) {
    var target = (displayName || "").replace(/\s+/g, " ").trim();
    if (!target) return null;
    var ph = window.PROTOTYPE_PLAYER_HANDLES || {};
    for (var key in ph) {
      if (!Object.prototype.hasOwnProperty.call(ph, key)) continue;
      if (
        String(ph[key]).replace(/\s+/g, " ").trim().localeCompare(target, undefined, {
          sensitivity: "base",
        }) === 0
      ) {
        return key;
      }
    }
    var items = document.querySelectorAll(
      '#tvDashboardInviteShell .game-invite-list__item[data-player-panel-handle-key]'
    );
    for (var i = 0; i < items.length; i++) {
      var nameEl =
        items[i].querySelector("[data-prototype-player-handle]") ||
        items[i].querySelector(".game-invite-list__name span") ||
        items[i].querySelector(".game-invite-list__name");
      var name = nameEl ? nameEl.textContent.replace(/\s+/g, " ").trim() : "";
      if (name && name.localeCompare(target, undefined, { sensitivity: "base" }) === 0) {
        return items[i].getAttribute("data-player-panel-handle-key");
      }
    }
    return null;
  }

  function resolveNotificationSenderHandleKey(tvRow) {
    if (!tvRow) return null;
    var fromKey = tvRow.getAttribute("data-friend-request-from-key");
    if (fromKey) return fromKey;

    var handleKey = tvRow.getAttribute("data-player-panel-handle-key");
    if (handleKey && handleKey !== "friend-request-notify") return handleKey;

    var kind = rowKind(tvRow);
    if (kind === "achievement") return "local";

    if (kind === "game-invite") {
      var invSpan = tvRow.querySelector('[data-prototype-player-handle="inviter"]');
      var inviterName = invSpan ? invSpan.textContent.trim() : "";
      if (inviterName) {
        var invKey = lookupHandleKeyForDisplayName(inviterName);
        if (invKey) return invKey;
      }
      return "inviter";
    }

    var displayName = deriveHandleFromFriendRow(tvRow);
    if (displayName) {
      var resolved = lookupHandleKeyForDisplayName(displayName);
      if (resolved) return resolved;
    }

    return handleKey || null;
  }

  function getTvRowForNotificationMenuIndex(index) {
    if (index === "" || index == null) return null;
    var track = getTvTrack();
    if (!track) return null;
    var rows = track.querySelectorAll(".game-invite-list__item");
    return rows[Number(index)] || null;
  }

  function openNotificationSenderProfile(tvRow) {
    if (!tvRow || typeof window.openNotificationSenderProfileDetail !== "function") return;
    window.openNotificationSenderProfileDetail(tvRow, { returnL2: "notifications" });
  }

  function toggleNotificationRowRead(tvRow) {
    if (!tvRow || !tvRow.classList) return;
    if (tvRow.classList.contains("game-invite-list__item--notification-unread")) {
      markTvRowRead(tvRow);
    } else {
      markTvRowUnread(tvRow);
    }
    syncMobileNotificationList();
  }

  function deriveHandleFromFriendRow(tvRow) {
    var nameEl = tvRow.querySelector(".game-invite-list__name");
    var raw = nameEl ? (nameEl.textContent || "").trim() : "";
    var connected = raw.match(/^\s*You are now friends with\s+(.+?)\s*$/i);
    if (connected && connected[1]) return connected[1].trim();
    return raw.replace(/\s+wants to be friends\.?$/i, "").trim();
  }

  function rowKind(tvRow) {
    var source = tvRow.getAttribute("data-notification-source") || "";
    var nameEl = tvRow.querySelector(".game-invite-list__name");
    var nameTxt = nameEl ? (nameEl.textContent || "").trim() : "";
    var rowState = tvRow.getAttribute("data-player-panel-state") || "";
    if (source === "tv-game-invite-toast") return "game-invite";
    if (
      source === "friend-connected" ||
      (rowState === "friend-connected" && /^\s*You are now friends with\s+/i.test(nameTxt))
    ) {
      return "friend-connected";
    }
    if (source === "friend-request" || /\bwants to be friends\.?$/i.test(nameTxt)) {
      return "friend-request";
    }
    if (source === "achievement") return "achievement";
    if (source === "score-beaten") return "score-beaten";
    return "generic";
  }

  function rowTitleBody(tvRow, kind) {
    var nameEl = tvRow.querySelector(".game-invite-list__name");
    var subEl = tvRow.querySelector(".game-invite-list__sub");
    var timeEl = tvRow.querySelector(".game-invite-list__notification-time");
    var title = nameEl ? (nameEl.textContent || "").trim() : "";
    var body = "";
    if (subEl && subEl.textContent.trim()) {
      body = subEl.textContent.trim();
    } else if (timeEl && timeEl.textContent.trim()) {
      body = timeEl.textContent.trim();
    }
    if (kind === "game-invite" && !body) {
      var refRaw = window.PROTOTYPE_LOCAL_SESSION_GAME_TITLE;
      body =
        (typeof refRaw === "string" ? refRaw : "").replace(/\s+/g, " ").trim() ||
        "FIFA World Cup";
    }
    if (kind === "friend-connected" && !body) body = "";
    if (kind === "achievement") {
      title = nameEl ? nameEl.textContent.trim() : "Achievement unlocked";
      body =
        (subEl && subEl.textContent.trim()) ||
        tvRow.getAttribute("data-achievement-title") ||
        "";
    }
    return { title: title, body: body };
  }

  function rowThumbImages(tvRow, kind) {
    if (kind === "score-beaten") {
      var sbGame = tvRow.querySelector(".game-invite-list__thumb img");
      var sbAvatar = tvRow.querySelector(".game-invite-list__avatar img");
      return {
        gameSrc: (sbGame && sbGame.getAttribute("src")) || "assets/unhinged.webp",
        badgeSrc: (sbAvatar && sbAvatar.getAttribute("src")) || "",
        friendAvatar: false
      };
    }

    if (kind === "achievement") {
      var achievementSrc = tvRow.getAttribute("data-achievement-image") || "";
      var achievementThumb = tvRow.querySelector(".game-invite-list__thumb img");
      if (!achievementSrc && achievementThumb) {
        achievementSrc = achievementThumb.getAttribute("src") || "";
      }
      return {
        gameSrc:
          achievementSrc ||
          "assets/raster/dashboard-achievements-fifa/fifa-unlock-01.svg",
        badgeSrc: "",
        friendAvatar: false
      };
    }

    if (kind === "game-invite") {
      var toastImg = tvRow.querySelector(".game-invite-list__thumb img");
      var gameSrc =
        (toastImg && toastImg.getAttribute("src")) || defaultGameInviteThumb();
      return {
        gameSrc: gameSrc,
        badgeSrc: defaultGameInviteBadge(),
        friendAvatar: false
      };
    }

    var avImg = tvRow.querySelector(".game-invite-list__avatar img");
    var avatarOnly =
      (avImg && avImg.getAttribute("src")) || defaultFriendAvatar();
    return { gameSrc: avatarOnly, badgeSrc: "", friendAvatar: true };
  }

  function rowActions(kind) {
    if (kind === "game-invite") {
      return { primary: "Join Game", secondary: "Decline", single: false };
    }
    if (kind === "friend-request") {
      return { primary: "Accept", secondary: "Decline", single: false };
    }
    if (kind === "friend-connected") {
      return { primary: "", secondary: "", single: true };
    }
    if (kind === "achievement") {
      return { primary: "", secondary: "", single: true };
    }
    return { primary: "View", secondary: "", single: true };
  }

  var NOTIF_OUTCOME_LOADING_MS = 1000;
  var NOTIF_OUTCOME_CONFIRM_MS = 1500;
  var NOTIF_OUTCOME_LOADER_SRC =
    "assets/raster/invite-btn-states-56-6141/Loader.png";
  var NOTIF_OUTCOME_CONFIRM_ACCEPT_ICON =
    "assets/raster/player-panel-incoming-101/circle-checkmark-38.png";
  var NOTIF_OUTCOME_CONFIRM_DECLINE_ICON =
    "assets/raster/player-panel-incoming-101/circle-x-large.png";
  var NOTIF_OUTCOME_COPY = {
    "friend-request": {
      primary: { kind: "accept", text: "You've made a new friend!" },
      secondary: { kind: "decline", text: "Friend request declined" },
      settlePrimaryInPlace: true
    },
    "game-invite": {
      primary: { kind: "join", text: "Joining Game" },
      secondary: { kind: "decline", text: "Game invite declined" },
      settlePrimaryInPlace: false
    },
    "friend-game-invite": {
      primary: { kind: "sent", text: "Invite sent!" }
    },
    "friend-request-sent": {
      primary: { kind: "sent", text: "Request sent!" }
    }
  };

  function clearNotifOutcomeTimers(li) {
    if (!li || !li._fcNotifOutcomeTimers) return;
    var timers = li._fcNotifOutcomeTimers;
    if (timers.load) window.clearTimeout(timers.load);
    if (timers.confirm) window.clearTimeout(timers.confirm);
    if (timers.fadeFallback) window.clearTimeout(timers.fadeFallback);
    if (timers.collapseFallback) window.clearTimeout(timers.collapseFallback);
    if (timers.fadeListener && timers.actionsEl) {
      timers.actionsEl.removeEventListener("transitionend", timers.fadeListener);
    }
    if (timers.collapseListener) {
      li.removeEventListener("transitionend", timers.collapseListener);
    }
    li._fcNotifOutcomeTimers = null;
  }

  var NOTIF_BTN_ICON_SVG = {
    accept:
      '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M3.25 8.25 6.5 11.5 12.75 4.75" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>",
    decline:
      '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M4.25 4.25 11.75 11.75M11.75 4.25 4.25 11.75" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>' +
      "</svg>",
  };

  function createActionButton(label, opts) {
    opts = opts || {};
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fc-mobile-notif__btn";
    if (opts.icon) {
      btn.classList.add("fc-mobile-notif__btn--icon-only");
      btn.setAttribute("aria-label", label);
      var iconWrap = document.createElement("span");
      iconWrap.className = "fc-mobile-notif__btn-icon";
      iconWrap.innerHTML = NOTIF_BTN_ICON_SVG[opts.icon] || "";
      btn.appendChild(iconWrap);
    } else {
      var labelEl = document.createElement("span");
      labelEl.className = "fc-mobile-notif__btn-label";
      labelEl.textContent = label;
      btn.appendChild(labelEl);
    }
    var loader = document.createElement("span");
    loader.className = "fc-mobile-notif__btn-loader";
    loader.setAttribute("aria-hidden", "true");
    var loaderImg = document.createElement("img");
    loaderImg.src = NOTIF_OUTCOME_LOADER_SRC;
    loaderImg.alt = "";
    loaderImg.decoding = "async";
    loaderImg.width = 18;
    loaderImg.height = 18;
    loader.appendChild(loaderImg);
    btn.appendChild(loader);
    return btn;
  }

  function createOutcomeConfirmation(kind, iconSrc, copy) {
    var conf = document.createElement("div");
    conf.className =
      "fc-mobile-notif__confirmation fc-mobile-notif__confirmation--" + kind;
    conf.hidden = true;
    conf.setAttribute("role", "status");
    conf.setAttribute("aria-live", "polite");
    var icon = document.createElement("img");
    icon.className = "fc-mobile-notif__confirmation-icon";
    icon.src = iconSrc;
    icon.alt = "";
    icon.decoding = "async";
    icon.width = 24;
    icon.height = 24;
    var text = document.createElement("p");
    text.className = "fc-mobile-notif__confirmation-text";
    text.textContent = copy;
    conf.appendChild(icon);
    conf.appendChild(text);
    return conf;
  }

  function friendConnectedTitle(tvRow) {
    var nameEl = tvRow.querySelector(".game-invite-list__name");
    var title = nameEl ? (nameEl.textContent || "").trim() : "";
    if (title) return title;
    var handle = deriveHandleFromFriendRow(tvRow);
    return handle ? "You are now friends with " + handle : "You are now friends";
  }

  var NOTIFICATION_DELETED_TOAST_ICON =
    (window.FIGMA_MOBILE_DASHBOARD_NOTIFICATIONS_ASSETS &&
      window.FIGMA_MOBILE_DASHBOARD_NOTIFICATIONS_ASSETS.checkSmall) ||
    "assets/raster/mobile-notifications/check-small.svg";

  var pendingNotificationDelete = null;

  function clearPendingNotificationDelete() {
    pendingNotificationDelete = null;
  }

  function showNotificationDeletedToast() {
    if (typeof window.showMobileDashboardStatusToast !== "function") return;
    window.showMobileDashboardStatusToast({
      message: "Notification Deleted",
      iconSrc: NOTIFICATION_DELETED_TOAST_ICON,
      iconDark: true,
      undoLabel: "Undo",
      onUndo: undoNotificationDelete,
      onDismiss: clearPendingNotificationDelete,
    });
  }

  function findMobileNotifItemForTvRow(tvRow) {
    if (!tvRow) return null;
    var track = getTvTrack();
    if (!track) return null;
    var rows = track.querySelectorAll(".game-invite-list__item");
    var index = Array.prototype.indexOf.call(rows, tvRow);
    if (index < 0) return null;
    var list = document.getElementById("fcMobileNotifList");
    if (!list) return null;
    return list.querySelector(
      '.fc-mobile-notif__item[data-tv-notif-index="' + index + '"]'
    );
  }

  function setNotificationListEmptyVisible(hasItems, opts) {
    opts = opts || {};
    var empty = document.getElementById("fcMobileNotifEmpty");
    var list = document.getElementById("fcMobileNotifList");
    if (!empty || !list) return;

    if (hasItems) {
      clearNotificationListEmptyTransition();
      empty.hidden = true;
      empty.classList.remove("fc-mobile-notif__empty-card--visible");
      list.hidden = false;
      list.classList.remove("fc-mobile-notif__list--emptying");
      return;
    }

    if (list.classList.contains("fc-mobile-notif__list--emptying")) return;
    if (empty.classList.contains("fc-mobile-notif__empty-card--visible") && list.hidden) return;

    if (opts.animate === true && !prefersReducedMotion()) {
      beginNotificationListEmptyTransition();
      return;
    }

    clearNotificationListEmptyTransition();
    empty.hidden = false;
    empty.classList.add("fc-mobile-notif__empty-card--visible");
    list.hidden = true;
    list.classList.remove("fc-mobile-notif__list--emptying");
  }

  function updateMobileNotifEmptyState() {
    var track = getTvTrack();
    if (!track) return;
    var hasItems = track.querySelectorAll(".game-invite-list__item").length > 0;
    setNotificationListEmptyVisible(hasItems);
  }

  function reindexMobileNotificationItems() {
    var list = document.getElementById("fcMobileNotifList");
    if (!list) return;
    var items = list.querySelectorAll(".fc-mobile-notif__item");
    for (var i = 0; i < items.length; i++) {
      items[i].setAttribute("data-tv-notif-index", String(i));
      var menu = items[i].querySelector(".fc-mobile-notif__row-more");
      if (menu) menu.setAttribute("data-list-more-id", String(i));
    }
  }

  function prefersReducedMotion() {
    return !!(
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function resetNotificationRowRemovalStyles(row) {
    if (!row) return;
    row.classList.remove("game-invite-list__item--notification-removing");
    row.style.overflow = "";
    row.style.maxHeight = "";
    row.style.transition = "";
    row.style.opacity = "";
  }

  function resetMobileNotifItemRemovalStyles(li) {
    if (!li) return;
    li.classList.remove("fc-mobile-notif__item--collapsing");
    li.style.maxHeight = "";
    li.style.overflow = "";
    li.style.opacity = "";
  }

  function undoNotificationDelete() {
    var pending = pendingNotificationDelete;
    if (!pending) return;
    pendingNotificationDelete = null;

    var track = getTvTrack();
    if (!track) return;

    if (pending.finalized) {
      var siblings = track.querySelectorAll(".game-invite-list__item");
      var insertBefore = siblings[pending.removedIndex] || null;
      track.insertBefore(pending.tvRowClone, insertBefore);
    } else {
      if (typeof pending.cancelAnimation === "function") {
        pending.cancelAnimation();
      }
      resetNotificationRowRemovalStyles(pending.tvRow);
      resetMobileNotifItemRemovalStyles(pending.mobileLi);
    }

    syncMobileNotificationList();
    if (typeof window.syncTvHeaderGameInviteNotificationBadge === "function") {
      window.syncTvHeaderGameInviteNotificationBadge();
    }
    if (typeof window.syncTvNotificationsPanelLayout === "function") {
      window.requestAnimationFrame(window.syncTvNotificationsPanelLayout);
    }
    updateMobileNotifEmptyState();
  }

  function animateMobileNotifItemRemoval(li, pending, onComplete) {
    if (!li) {
      if (onComplete) onComplete();
      return;
    }
    if (prefersReducedMotion()) {
      if (li.parentNode) li.parentNode.removeChild(li);
      if (onComplete) onComplete();
      return;
    }

    var height = li.getBoundingClientRect().height;
    li.style.maxHeight = height + "px";
    li.style.overflow = "hidden";
    void li.offsetWidth;

    var settled = false;
    var fallbackTimer = null;
    function finish() {
      if (settled) return;
      settled = true;
      li.removeEventListener("transitionend", onEnd);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (li.parentNode) li.parentNode.removeChild(li);
      resetMobileNotifItemRemovalStyles(li);
      if (onComplete) onComplete();
    }
    function onEnd(e) {
      if (e.target !== li || e.propertyName !== "max-height") return;
      finish();
    }
    li.addEventListener("transitionend", onEnd);
    fallbackTimer = window.setTimeout(finish, 420);
    if (pending) {
      pending.mobileCancel = function () {
        if (settled) return;
        settled = true;
        li.removeEventListener("transitionend", onEnd);
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
        resetMobileNotifItemRemovalStyles(li);
      };
    }

    li.classList.add("fc-mobile-notif__item--collapsing");
    window.requestAnimationFrame(function () {
      li.style.maxHeight = "0";
      li.style.opacity = "0";
    });
  }

  function animateTvNotificationRowRemoval(tvRow, pending, onComplete) {
    if (!tvRow || !tvRow.parentNode) {
      if (onComplete) onComplete();
      return;
    }
    if (prefersReducedMotion()) {
      if (onComplete) onComplete();
      return;
    }

    tvRow.style.overflow = "hidden";
    tvRow.style.maxHeight = tvRow.scrollHeight + "px";
    void tvRow.offsetHeight;
    tvRow.classList.add("game-invite-list__item--notification-removing");

    var settled = false;
    var fallbackTimer = null;
    function finish() {
      if (settled) return;
      settled = true;
      tvRow.removeEventListener("transitionend", onEnd);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (onComplete) onComplete();
    }
    function onEnd(e) {
      if (e.target !== tvRow || e.propertyName !== "max-height") return;
      finish();
    }
    tvRow.addEventListener("transitionend", onEnd);
    fallbackTimer = window.setTimeout(finish, 450);
    if (pending) {
      pending.tvCancel = function () {
        if (settled) return;
        settled = true;
        tvRow.removeEventListener("transitionend", onEnd);
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
        resetNotificationRowRemovalStyles(tvRow);
      };
    }

    window.requestAnimationFrame(function () {
      tvRow.style.maxHeight = "0";
    });
  }

  function finalizeNotificationRemoval(tvRow, removedIndex) {
    if (tvRow && tvRow.parentNode) {
      resetNotificationRowRemovalStyles(tvRow);
      tvRow.parentNode.removeChild(tvRow);
    }
    if (
      tvRow &&
      rowKind(tvRow) === "game-invite" &&
      typeof window.dismissTvGameInviteToastImmediately === "function"
    ) {
      window.dismissTvGameInviteToastImmediately();
    }
    document.dispatchEvent(
      new CustomEvent("tvnotifications:row-removed", {
        bubbles: true,
        detail: { removedIndex: removedIndex },
      })
    );
    if (typeof window.syncTvHeaderGameInviteNotificationBadge === "function") {
      window.syncTvHeaderGameInviteNotificationBadge();
    }
    if (typeof window.syncTvNotificationsPanelLayout === "function") {
      window.requestAnimationFrame(window.syncTvNotificationsPanelLayout);
    }
    updateMobileNotifEmptyState();
    reindexMobileNotificationItems();
    if (typeof window.syncMobileNotificationList === "function") {
      window.syncMobileNotificationList();
    }
    if (typeof window.scheduleMobileDashboardViewScrollSync === "function") {
      window.scheduleMobileDashboardViewScrollSync();
    }
  }

  function removeNotificationRow(tvRow, opts) {
    opts = opts || {};
    if (!tvRow || !tvRow.parentNode) return;
    if (typeof window.closeMobileNotificationDetailForRow === "function") {
      window.closeMobileNotificationDetailForRow(tvRow);
    }

    clearPendingNotificationDelete();

    var track = tvRow.parentNode;
    var siblings = Array.prototype.slice.call(
      track.querySelectorAll(".game-invite-list__item")
    );
    var ix = siblings.indexOf(tvRow);
    var mobileLi = findMobileNotifItemForTvRow(tvRow);
    if (siblings.length === 1) {
      setNotificationListEmptyVisible(false, { animate: true });
    }
    var pending = {
      tvRow: tvRow,
      tvRowClone: tvRow.cloneNode(true),
      mobileLi: mobileLi,
      removedIndex: ix,
      finalized: false,
      cancelAnimation: function () {
        if (typeof this.mobileCancel === "function") this.mobileCancel();
        if (typeof this.tvCancel === "function") this.tvCancel();
      },
    };
    pendingNotificationDelete = pending;

    if (opts.showDeletedToast) {
      showNotificationDeletedToast();
    }

    if (prefersReducedMotion()) {
      if (mobileLi && mobileLi.parentNode) mobileLi.parentNode.removeChild(mobileLi);
      pending.finalized = true;
      finalizeNotificationRemoval(tvRow, ix);
      return;
    }

    var pendingCount = mobileLi ? 2 : 1;
    function maybeFinalize() {
      pendingCount -= 1;
      if (pendingCount > 0) return;
      if (!pendingNotificationDelete || pendingNotificationDelete !== pending) return;
      pending.finalized = true;
      finalizeNotificationRemoval(tvRow, ix);
    }

    animateMobileNotifItemRemoval(mobileLi, pending, maybeFinalize);
    animateTvNotificationRowRemoval(tvRow, pending, maybeFinalize);
  }

  function removeGameInviteNotificationRow(tvRow, opts) {
    removeNotificationRow(tvRow, opts);
  }

  function handleNotificationListMoreSelect(detail) {
    if (!detail || detail.listContext !== "notification") return;
    var tvRow = getTvRowForNotificationMenuIndex(detail.itemId);
    if (!tvRow) return;

    if (detail.action === "profile") {
      openNotificationSenderProfile(tvRow);
      return;
    }
    if (detail.action === "toggle-read") {
      toggleNotificationRowRead(tvRow);
      return;
    }
    if (detail.action === "delete") {
      removeNotificationRow(tvRow, { showDeletedToast: true });
    }
  }

  function isInlineIconNotifListItem(li) {
    return isNotifListActionsIconMode() && !isMissedNotifCard(li);
  }

  function findNotifOutcomeConfirmation(li, stage, kind) {
    var selector = ".fc-mobile-notif__confirmation--" + kind;
    if (li) {
      var inText = li.querySelector(".fc-mobile-notif__text " + selector);
      if (inText) return inText;
    }
    if (stage) return stage.querySelector(selector);
    return null;
  }

  function showInlineIconOutcomeInText(li, stage, conf, other) {
    var textEl = li && li.querySelector(".fc-mobile-notif__text");
    if (!textEl || !conf) return;

    var titleEl = textEl.querySelector(".fc-mobile-notif__title");
    var bodyEl = textEl.querySelector(".fc-mobile-notif__body");
    if (titleEl) titleEl.classList.add("fc-mobile-notif__text-copy--ghost");
    if (bodyEl) bodyEl.classList.add("fc-mobile-notif__text-copy--ghost");
    textEl.classList.add("fc-mobile-notif__text--inline-outcome");

    if (other) {
      other.hidden = true;
      other.classList.remove("fc-mobile-notif__confirmation--in");
    }

    conf.hidden = false;
    conf.classList.remove("fc-mobile-notif__confirmation--in");
    conf.classList.add("fc-mobile-notif__confirmation--inline-text");
    textEl.appendChild(conf);
    void conf.offsetWidth;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        conf.classList.add("fc-mobile-notif__confirmation--in");
      });
    });

    if (stage) {
      stage.hidden = true;
      stage.removeAttribute("data-outcome");
    }
  }

  function clearInlineIconOutcomeText(li) {
    if (!li) return;
    var textEl = li.querySelector(".fc-mobile-notif__text");
    if (!textEl) return;
    var inlineConf = textEl.querySelector(".fc-mobile-notif__confirmation--inline-text");
    if (inlineConf) inlineConf.remove();
    textEl.classList.remove("fc-mobile-notif__text--inline-outcome");
    var titleEl = textEl.querySelector(".fc-mobile-notif__title");
    var bodyEl = textEl.querySelector(".fc-mobile-notif__body");
    if (titleEl) titleEl.classList.remove("fc-mobile-notif__text-copy--ghost");
    if (bodyEl) bodyEl.classList.remove("fc-mobile-notif__text-copy--ghost");
  }

  function applyInlineIconSettledRowLayout(li) {
    if (!li || !isNotifListActionsIconMode()) return;
    var rowEl = li.querySelector(".fc-mobile-notif__row");
    var textEl = li.querySelector(".fc-mobile-notif__text");
    if (rowEl) rowEl.classList.add("fc-mobile-notif__row--inline-settled");
    if (textEl) textEl.classList.add("fc-mobile-notif__text--inline-settled");
  }

  function applyNotifOutcome(tvRow, outcomeKind, which, opts) {
    opts = opts || {};
    if (outcomeKind === "friend-request") {
      applyFriendRequestOutcome(
        tvRow,
        which === "primary" ? "accept" : "decline",
        opts
      );
      return;
    }
    if (outcomeKind === "game-invite") {
      if (which === "primary") {
        markTvRowRead(tvRow);
        if (typeof window.applyGameInviteJoinAction === "function") {
          window.applyGameInviteJoinAction();
        }
        if (typeof window.setMobileDashboardOpen === "function") {
          window.setMobileDashboardOpen(false);
        }
        removeGameInviteNotificationRow(tvRow, opts);
        return;
      }
      markTvRowRead(tvRow);
      removeGameInviteNotificationRow(tvRow, opts);
    }
  }

  function applyFriendRequestOutcome(tvRow, which, opts) {
    opts = opts || {};
    if (which === "accept") {
      if (typeof window.acceptFriendRequestNotificationRow === "function") {
        window.acceptFriendRequestNotificationRow(tvRow, opts);
      }
      return;
    }
    if (typeof window.declineFriendRequestNotificationRow === "function") {
      window.declineFriendRequestNotificationRow(tvRow);
    }
  }

  function settleFriendRequestAcceptInPlace(li, tvRow, stage) {
    if (!li || !tvRow) return;
    clearNotifOutcomeTimers(li);

    var conf = findNotifOutcomeConfirmation(li, stage, "accept");

    function finalizeInPlace() {
      applyFriendRequestOutcome(tvRow, "accept", { skipMobileSync: true });

      clearInlineIconOutcomeText(li);

      var titleEl = li.querySelector(".fc-mobile-notif__title");
      if (titleEl) {
        titleEl.classList.remove("fc-mobile-notif__text-copy--ghost");
        titleEl.textContent = friendConnectedTitle(tvRow);
      }
      var bodyEl = li.querySelector(".fc-mobile-notif__body");
      if (bodyEl) bodyEl.remove();

      applyInlineIconSettledRowLayout(li);

      li.classList.remove("fc-mobile-notif__item--unread");
      var badge = li.querySelector(".fc-mobile-notif__badge");
      if (badge) badge.setAttribute("aria-hidden", "true");

      if (stage && stage.parentNode) stage.parentNode.removeChild(stage);
      li.removeAttribute("data-notif-outcome");
    }

    if (conf && conf.classList.contains("fc-mobile-notif__confirmation--in")) {
      conf.classList.remove("fc-mobile-notif__confirmation--in");
      window.setTimeout(finalizeInPlace, 280);
      return;
    }

    finalizeInPlace();
  }

  function collapseNotifOutcomeItem(li, tvRow, outcomeKind, which) {
    if (!li) return;
    clearNotifOutcomeTimers(li);
    li.setAttribute("data-notif-outcome", "collapsing");

    var reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      applyNotifOutcome(tvRow, outcomeKind, which, { skipMobileSync: true });
      return;
    }

    var height = li.getBoundingClientRect().height;
    li.style.maxHeight = height + "px";
    li.style.overflow = "hidden";
    void li.offsetWidth;

    var collapsed = false;
    function finishCollapse() {
      if (collapsed) return;
      collapsed = true;
      if (li._fcNotifOutcomeTimers && li._fcNotifOutcomeTimers.collapseListener) {
        li.removeEventListener(
          "transitionend",
          li._fcNotifOutcomeTimers.collapseListener
        );
      }
      if (li._fcNotifOutcomeTimers && li._fcNotifOutcomeTimers.collapseFallback) {
        window.clearTimeout(li._fcNotifOutcomeTimers.collapseFallback);
      }
      li._fcNotifOutcomeTimers = null;
      applyNotifOutcome(tvRow, outcomeKind, which, { skipMobileSync: true });
    }

    var collapseListener = function (ev) {
      if (ev.target !== li || ev.propertyName !== "max-height") return;
      finishCollapse();
    };

    li._fcNotifOutcomeTimers = li._fcNotifOutcomeTimers || {};
    li._fcNotifOutcomeTimers.collapseListener = collapseListener;
    li.addEventListener("transitionend", collapseListener);
    li._fcNotifOutcomeTimers.collapseFallback = window.setTimeout(
      finishCollapse,
      420
    );

    li.classList.add("fc-mobile-notif__item--collapsing");
    window.requestAnimationFrame(function () {
      li.style.maxHeight = "0";
      li.style.opacity = "0";
    });
  }

  function isMissedNotifCard(el) {
    return !!(el && el.id === "fcMobileDashMissedCard");
  }

  function finishMissedCardOutcome(li, tvRow, outcomeKind, which) {
    if (!li || !tvRow) return;
    clearNotifOutcomeTimers(li);
    li.removeAttribute("data-notif-outcome");
    applyNotifOutcome(tvRow, outcomeKind, which);
    if (typeof window.clearMissedNotification === "function") {
      window.clearMissedNotification({ animate: true });
    }
    syncMobileNotificationList();
  }

  function finishNotifOutcomeLoading(
    li,
    tvRow,
    outcomeKind,
    which,
    stage,
    actionsEl,
    primaryBtn,
    secondaryBtn
  ) {
    if (!li || li.getAttribute("data-notif-outcome") !== "loading") return;

    var copyPack = NOTIF_OUTCOME_COPY[outcomeKind];
    var primaryConfKind = copyPack.primary.kind;
    var secondaryConfKind = copyPack.secondary.kind;
    var confPrimary = stage.querySelector(
      ".fc-mobile-notif__confirmation--" + primaryConfKind
    );
    var confSecondary = stage.querySelector(
      ".fc-mobile-notif__confirmation--" + secondaryConfKind
    );
    var conf = which === "primary" ? confPrimary : confSecondary;
    var other = which === "primary" ? confSecondary : confPrimary;
    var timers = li._fcNotifOutcomeTimers || {};

    function afterActionsFade() {
      if (li.getAttribute("data-notif-outcome") !== "loading") return;
      if (timers.fadeListener && actionsEl) {
        actionsEl.removeEventListener("transitionend", timers.fadeListener);
        timers.fadeListener = null;
      }
      if (timers.fadeFallback) {
        window.clearTimeout(timers.fadeFallback);
        timers.fadeFallback = null;
      }

      actionsEl.setAttribute("hidden", "");
      actionsEl.classList.add("fc-mobile-notif__cta--finished");
      primaryBtn.classList.remove("fc-mobile-notif__btn--loading");
      secondaryBtn.classList.remove("fc-mobile-notif__btn--loading");
      primaryBtn.removeAttribute("aria-busy");
      secondaryBtn.removeAttribute("aria-busy");

      if (other) {
        other.hidden = true;
        other.classList.remove("fc-mobile-notif__confirmation--in");
      }

      if (isInlineIconNotifListItem(li)) {
        showInlineIconOutcomeInText(li, stage, conf, other);
      } else if (conf) {
        conf.hidden = false;
        conf.classList.remove("fc-mobile-notif__confirmation--in");
        void conf.offsetWidth;
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            conf.classList.add("fc-mobile-notif__confirmation--in");
          });
        });
        stage.setAttribute("data-outcome", "done");
      }

      li.setAttribute("data-notif-outcome", "done");

      timers.confirm = window.setTimeout(function () {
        timers.confirm = null;
        if (isMissedNotifCard(li)) {
          finishMissedCardOutcome(li, tvRow, outcomeKind, which);
          return;
        }
        if (which === "primary" && copyPack.settlePrimaryInPlace) {
          settleFriendRequestAcceptInPlace(li, tvRow, stage);
          return;
        }
        collapseNotifOutcomeItem(li, tvRow, outcomeKind, which);
      }, NOTIF_OUTCOME_CONFIRM_MS);
      li._fcNotifOutcomeTimers = timers;
    }

    primaryBtn.disabled = true;
    secondaryBtn.disabled = true;
    actionsEl.classList.add("fc-mobile-notif__cta--out");

    var reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      timers.fadeFallback = window.setTimeout(afterActionsFade, 40);
      li._fcNotifOutcomeTimers = timers;
      return;
    }

    timers.fadeListener = function (ev) {
      if (ev.target !== actionsEl || ev.propertyName !== "opacity") return;
      afterActionsFade();
    };
    actionsEl.addEventListener("transitionend", timers.fadeListener);
    timers.fadeFallback = window.setTimeout(function () {
      timers.fadeFallback = null;
      if (timers.fadeListener && actionsEl) {
        actionsEl.removeEventListener("transitionend", timers.fadeListener);
        timers.fadeListener = null;
      }
      afterActionsFade();
    }, 420);
    li._fcNotifOutcomeTimers = timers;
  }

  function startNotifOutcome(
    li,
    tvRow,
    outcomeKind,
    which,
    primaryBtn,
    secondaryBtn,
    stage
  ) {
    if (!li || !tvRow || !stage) return;
    var phase = li.getAttribute("data-notif-outcome");
    if (phase === "loading" || phase === "done" || phase === "collapsing") return;

    clearNotifOutcomeTimers(li);
    markTvRowRead(tvRow);
    li.setAttribute("data-notif-outcome", "loading");
    stage.setAttribute("data-outcome", "loading");

    primaryBtn.disabled = which !== "primary";
    secondaryBtn.disabled = which !== "secondary";
    if (which === "primary") {
      primaryBtn.classList.add("fc-mobile-notif__btn--loading");
      primaryBtn.setAttribute("aria-busy", "true");
    } else {
      secondaryBtn.classList.add("fc-mobile-notif__btn--loading");
      secondaryBtn.setAttribute("aria-busy", "true");
    }

    var actionsEl = stage.querySelector(".fc-mobile-notif__cta");
    li._fcNotifOutcomeTimers = {
      load: window.setTimeout(function () {
        if (li._fcNotifOutcomeTimers) li._fcNotifOutcomeTimers.load = null;
        finishNotifOutcomeLoading(
          li,
          tvRow,
          outcomeKind,
          which,
          stage,
          actionsEl,
          primaryBtn,
          secondaryBtn
        );
      }, NOTIF_OUTCOME_LOADING_MS)
    };
  }

  function buildNotifOutcomeCtaStage(tvRow, li, outcomeKind) {
    var copyPack = NOTIF_OUTCOME_COPY[outcomeKind];
    var stage = document.createElement("div");
    stage.className = "fc-mobile-notif__cta-stage";

    var actionsEl = document.createElement("div");
    actionsEl.className = "fc-mobile-notif__cta";

    var iconMode = isNotifListActionsIconMode();
    var primaryLabel =
      outcomeKind === "game-invite" ? "Join Game" : "Accept";
    var primaryBtn = createActionButton(
      primaryLabel,
      iconMode ? { icon: "accept" } : undefined
    );
    var secondaryBtn = createActionButton(
      "Decline",
      iconMode ? { icon: "decline" } : undefined
    );
    primaryBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      startNotifOutcome(
        li,
        tvRow,
        outcomeKind,
        "primary",
        primaryBtn,
        secondaryBtn,
        stage
      );
    });
    secondaryBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      startNotifOutcome(
        li,
        tvRow,
        outcomeKind,
        "secondary",
        primaryBtn,
        secondaryBtn,
        stage
      );
    });

    actionsEl.appendChild(primaryBtn);
    actionsEl.appendChild(secondaryBtn);
    stage.appendChild(actionsEl);
    stage.appendChild(
      createOutcomeConfirmation(
        copyPack.primary.kind,
        NOTIF_OUTCOME_CONFIRM_ACCEPT_ICON,
        copyPack.primary.text
      )
    );
    stage.appendChild(
      createOutcomeConfirmation(
        copyPack.secondary.kind,
        NOTIF_OUTCOME_CONFIRM_DECLINE_ICON,
        copyPack.secondary.text
      )
    );
    return stage;
  }

  function buildStandardCta(tvRow, kind, actions) {
    if (!actions.primary) return null;
    var iconMode = isNotifListActionsIconMode();
    var cta = document.createElement("div");
    cta.className = "fc-mobile-notif__cta";
    var primaryBtn = document.createElement("button");
    primaryBtn.type = "button";
    primaryBtn.className = "fc-mobile-notif__btn";
    if (iconMode && (kind === "friend-request" || kind === "game-invite")) {
      primaryBtn.classList.add("fc-mobile-notif__btn--icon-only");
      primaryBtn.setAttribute("aria-label", actions.primary);
      var primaryIcon = document.createElement("span");
      primaryIcon.className = "fc-mobile-notif__btn-icon";
      primaryIcon.innerHTML = NOTIF_BTN_ICON_SVG.accept;
      primaryBtn.appendChild(primaryIcon);
    } else {
      var primaryLabel = document.createElement("span");
      primaryLabel.className = "fc-mobile-notif__btn-label";
      primaryLabel.textContent = actions.primary;
      primaryBtn.appendChild(primaryLabel);
    }
    primaryBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      applyPrimaryAction(tvRow);
    });
    cta.appendChild(primaryBtn);
    if (!actions.single && actions.secondary) {
      var secondaryBtn = document.createElement("button");
      secondaryBtn.type = "button";
      secondaryBtn.className = "fc-mobile-notif__btn";
      if (iconMode && (kind === "friend-request" || kind === "game-invite")) {
        secondaryBtn.classList.add("fc-mobile-notif__btn--icon-only");
        secondaryBtn.setAttribute("aria-label", actions.secondary);
        var secondaryIcon = document.createElement("span");
        secondaryIcon.className = "fc-mobile-notif__btn-icon";
        secondaryIcon.innerHTML = NOTIF_BTN_ICON_SVG.decline;
        secondaryBtn.appendChild(secondaryIcon);
      } else {
        var secondaryLabel = document.createElement("span");
        secondaryLabel.className = "fc-mobile-notif__btn-label";
        secondaryLabel.textContent = actions.secondary;
        secondaryBtn.appendChild(secondaryLabel);
      }
      secondaryBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        applySecondaryAction(tvRow);
      });
      cta.appendChild(secondaryBtn);
    }
    return cta;
  }

  function applyPrimaryAction(tvRow) {
    if (!tvRow) return;
    var kind = rowKind(tvRow);

    if (kind === "game-invite") {
      return;
    }

    if (kind === "friend-request") {
      return;
    }

    if (isEvolutionMode() && typeof window.openMobileNotificationDetail === "function") {
      markTvRowRead(tvRow);
      window.openMobileNotificationDetail(tvRow);
      syncMobileNotificationList();
      return;
    }
    markTvRowRead(tvRow);
    var app = document.getElementById("app");
    if (app && app.getAttribute("data-tv-dashboard") !== "open" && typeof window.setTvDashboardOpen === "function") {
      window.setTvDashboardOpen(true, {
        context: kind === "game-invite" ? "game-invite" : "default",
        forceTvDashboard: true
      });
    }
    if (kind === "game-invite") {
      return;
    }
    if (typeof window.openTvPlayerPanelFromNotifications === "function") {
      window.openTvPlayerPanelFromNotifications(tvRow);
    }
  }

  function openDetailFromRow(tvRow, e) {
    if (
      e &&
      e.target &&
      e.target.closest &&
      e.target.closest(
        ".fc-mobile-notif__btn, .fc-mobile-notif__cta-stage, .fc-mobile-notif__confirmation, .fc-mobile-notif__row-more"
      )
    ) {
      return;
    }
    if (!isEvolutionMode() || typeof window.openMobileNotificationDetail !== "function") return;
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    markTvRowRead(tvRow);
    window.openMobileNotificationDetail(tvRow);
    syncMobileNotificationList();
  }

  function applySecondaryAction(tvRow) {
    if (!tvRow) return;
    var kind = rowKind(tvRow);
    if (kind === "game-invite" || kind === "friend-request") {
      return;
    }
  }

  function buildMobileRow(tvRow, index) {
    var kind = rowKind(tvRow);
    var copy = rowTitleBody(tvRow, kind);
    var thumbs = rowThumbImages(tvRow, kind);
    var actions = rowActions(kind);
    var unread = tvRow.classList.contains("game-invite-list__item--notification-unread");

    var li = document.createElement("li");
    li.className = "fc-mobile-notif__item";
    if (unread) li.classList.add("fc-mobile-notif__item--unread");
    li.setAttribute("data-tv-notif-index", String(index));
    if (kind === "friend-request" || kind === "friend-connected") {
      li.classList.add("fc-mobile-notif__item--avatar-thumb");
    }
    if (kind === "achievement") {
      li.classList.add("fc-mobile-notif__item--achievement-thumb");
    }

    var badge = document.createElement("span");
    badge.className = "fc-mobile-notif__badge";
    badge.setAttribute("aria-hidden", unread ? "false" : "true");

    var card = document.createElement("div");
    card.className = "fc-mobile-notif__card";

    var row = document.createElement("div");
    row.className = "fc-mobile-notif__row";

    var thumb = document.createElement("div");
    thumb.className = "fc-mobile-notif__thumb";
    var gameImg = document.createElement("img");
    gameImg.className = "fc-mobile-notif__thumb-game";
    gameImg.alt = "";
    gameImg.decoding = "async";
    gameImg.src = thumbs.gameSrc;
    thumb.appendChild(gameImg);
    if (!thumbs.friendAvatar && thumbs.badgeSrc) {
      var badgeImg = document.createElement("img");
      badgeImg.className = "fc-mobile-notif__thumb-avatar";
      badgeImg.alt = "";
      badgeImg.decoding = "async";
      badgeImg.src = thumbs.badgeSrc;
      thumb.appendChild(badgeImg);
    }

    var text = document.createElement("div");
    text.className = "fc-mobile-notif__text";
    var title = document.createElement("p");
    title.className = "fc-mobile-notif__title";
    title.textContent = copy.title;
    text.appendChild(title);
    if (copy.body) {
      var body = document.createElement("p");
      body.className = "fc-mobile-notif__body";
      body.textContent = copy.body;
      text.appendChild(body);
    }

    row.appendChild(thumb);
    row.appendChild(text);
    if (typeof window.createMobileListRowMoreMenu === "function") {
      row.appendChild(
        window.createMobileListRowMoreMenu({
          listContext: "notification",
          itemId: String(index),
          itemLabel: copy.title || "Notification",
          menuLabel: "Notification options",
          menuItems: notificationListMoreMenuItems(tvRow),
        })
      );
    }

    card.appendChild(row);
    if (notifListActionsEnabled()) {
      if (kind === "friend-request" || kind === "game-invite") {
        card.appendChild(buildNotifOutcomeCtaStage(tvRow, li, kind));
      } else {
        var cta = buildStandardCta(tvRow, kind, actions);
        if (cta) card.appendChild(cta);
      }
    }
    card.addEventListener("click", function (e) {
      openDetailFromRow(tvRow, e);
    });
    row.addEventListener("click", function (e) {
      openDetailFromRow(tvRow, e);
    });

    var wrap = document.createElement("div");
    wrap.className = "fc-mobile-notif__item-wrap";
    wrap.appendChild(badge);
    wrap.appendChild(card);

    li.appendChild(wrap);

    if (kind === "friend-connected" && isNotifListActionsIconMode()) {
      applyInlineIconSettledRowLayout(li);
    }

    return li;
  }

  function syncMobileNotificationList() {
    var list = document.getElementById("fcMobileNotifList");
    var track = getTvTrack();
    if (!list || !track) return;

    var tvRows = Array.prototype.slice.call(
      track.querySelectorAll(".game-invite-list__item")
    );
    list.replaceChildren();
    for (var i = 0; i < tvRows.length; i++) {
      list.appendChild(buildMobileRow(tvRows[i], i));
    }

    if (typeof window.bindListRowMoreMenusIn === "function") {
      window.bindListRowMoreMenusIn(list);
    }

    setNotificationListEmptyVisible(tvRows.length > 0);
    if (typeof window.scheduleMobileDashboardViewScrollSync === "function") {
      window.scheduleMobileDashboardViewScrollSync();
    }
    if (typeof window.syncTvHeaderGameInviteNotificationBadge === "function") {
      window.syncTvHeaderGameInviteNotificationBadge();
    }
  }

  function stageMobileDashboardNotificationsL2DeepLink(opts) {
    var root = getRoot();
    if (
      (typeof window.isPlatformPhase05 === "function" && window.isPlatformPhase05()) ||
      !root ||
      !isEvolutionMode()
    ) {
      return false;
    }

    if (typeof window.resetMobileDashboardFriendsL2 === "function") {
      window.resetMobileDashboardFriendsL2();
    }
    if (typeof window.resetMobileDashboardAchievementsL2 === "function") {
      window.resetMobileDashboardAchievementsL2();
    }
    if (typeof window.resetMobileDashboardControllerSettingsL2 === "function") {
      window.resetMobileDashboardControllerSettingsL2();
    }
    if (typeof window.closeAllMobilePopoverMenus === "function") {
      window.closeAllMobilePopoverMenus();
    }

    syncMobileNotificationList();
    l2Open = true;
    l2Animating = false;
    root.setAttribute("data-mobile-dashboard-l2", "notifications");

    var notifView = document.getElementById("fcMobileDashViewNotifications");
    if (notifView) {
      notifView.setAttribute("aria-hidden", "false");
    }

    if (typeof window.syncMobileDashboardMissedCard === "function") {
      window.syncMobileDashboardMissedCard();
    }
    return true;
  }

  function openNotificationsL2() {
    var root = getRoot();
    if (
      (typeof window.isPlatformPhase05 === "function" && window.isPlatformPhase05()) ||
      !root ||
      !isEvolutionMode() ||
      !isMobileDashOpen() ||
      l2Animating
    ) {
      return;
    }
    if (root.getAttribute("data-mobile-dashboard-view") !== "home") return;

    if (typeof window.resetMobileDashboardFriendsL2 === "function") {
      window.resetMobileDashboardFriendsL2();
    }
    if (typeof window.resetMobileDashboardAchievementsL2 === "function") {
      window.resetMobileDashboardAchievementsL2();
    }
    if (typeof window.resetMobileDashboardControllerSettingsL2 === "function") {
      window.resetMobileDashboardControllerSettingsL2();
    }
    if (typeof window.closeAllMobilePopoverMenus === "function") {
      window.closeAllMobilePopoverMenus();
    }

    syncMobileNotificationList();
    l2Animating = true;
    l2Open = true;
    root.setAttribute("data-mobile-dashboard-l2", "notifications");

    var notifView = document.getElementById("fcMobileDashViewNotifications");
    if (notifView) {
      notifView.setAttribute("aria-hidden", "false");
    }

    if (typeof window.syncMobileDashboardMissedCard === "function") {
      window.syncMobileDashboardMissedCard();
    }
    finishL2Animation(function () {
      l2Animating = false;
    });
  }

  function closeNotificationsL2() {
    var root = getRoot();
    if (!root || !l2Open || l2Animating) return;

    l2Animating = true;
    l2Open = false;
    if (root.getAttribute("data-mobile-dashboard-l2") === "notifications") {
      root.removeAttribute("data-mobile-dashboard-l2");
    }

    var notifView = document.getElementById("fcMobileDashViewNotifications");
    finishL2Animation(function () {
      if (notifView && !l2Open) {
        notifView.setAttribute("aria-hidden", "true");
      }
      l2Animating = false;
      if (typeof window.syncMobileDashboardMissedCard === "function") {
        window.syncMobileDashboardMissedCard();
      }
    });
  }

  function markNotificationsL2Open(isOpen) {
    l2Open = !!isOpen;
  }

  function resetNotificationsL2() {
    l2Open = false;
    l2Animating = false;
    var list = document.getElementById("fcMobileNotifList");
    if (list) {
      list.querySelectorAll(".fc-mobile-notif__item").forEach(function (li) {
        clearNotifOutcomeTimers(li);
      });
    }
    var root = getRoot();
    var notificationsL2Active =
      root && root.getAttribute("data-mobile-dashboard-l2") === "notifications";
    var detailOpenedFromNotifications =
      root && root.getAttribute("data-mobile-detail-return") === "notifications";
    if (
      (notificationsL2Active || detailOpenedFromNotifications) &&
      typeof window.resetMobileNotificationDetailL3 === "function"
    ) {
      window.resetMobileNotificationDetailL3();
    }
    if (root && root.getAttribute("data-mobile-dashboard-l2") === "notifications") {
      root.removeAttribute("data-mobile-dashboard-l2");
    }
    var notifView = document.getElementById("fcMobileDashViewNotifications");
    if (notifView) notifView.setAttribute("aria-hidden", "true");
    if (typeof window.syncMobileDashboardMissedCard === "function") {
      window.syncMobileDashboardMissedCard();
    }
  }

  function bindNotificationListMoreSelect() {
    if (window.__mobileNotifListMoreSelectBound) return;
    window.__mobileNotifListMoreSelectBound = true;
    window.addEventListener("mobile-list-more-select", function (e) {
      handleNotificationListMoreSelect((e && e.detail) || {});
    });
  }

  function bindUi() {
    bindNotificationListMoreSelect();

    var bell = document.getElementById("fcMobileDashBellBtn");
    if (bell && bell.getAttribute("data-notif-bound") !== "1") {
      bell.setAttribute("data-notif-bound", "1");
      bell.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openNotificationsL2();
      });
    }

    var back = document.getElementById("fcMobileNotifBackBtn");
    if (back && back.getAttribute("data-notif-bound") !== "1") {
      back.setAttribute("data-notif-bound", "1");
      back.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeNotificationsL2();
      });
    }

    var listActionsSelect = document.getElementById("selNotifListActions");
    if (listActionsSelect && listActionsSelect.getAttribute("data-notif-bound") !== "1") {
      listActionsSelect.setAttribute("data-notif-bound", "1");
      listActionsSelect.addEventListener("change", function () {
        setNotifListActionsMode(listActionsSelect.value);
      });
    }
  }

  function hydrateNotificationAssets() {
    var pack = window.FIGMA_MOBILE_DASHBOARD_NOTIFICATIONS_ASSETS;
    if (!pack) return;
    document.querySelectorAll("[data-md-notif]").forEach(function (el) {
      var key = el.getAttribute("data-md-notif");
      if (key && pack[key]) el.setAttribute("src", pack[key]);
    });
  }

  document.addEventListener("tvnotifications:row-removed", function () {
    if (l2Open) syncMobileNotificationList();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bindUi();
      hydrateNotificationAssets();
    });
  } else {
    bindUi();
    hydrateNotificationAssets();
  }

  window.syncMobileNotificationList = syncMobileNotificationList;
  window.openMobileDashboardNotifications = openNotificationsL2;
  window.stageMobileDashboardNotificationsL2DeepLink = stageMobileDashboardNotificationsL2DeepLink;
  window.closeMobileDashboardNotifications = closeNotificationsL2;
  window.markMobileDashboardNotificationsL2Open = markNotificationsL2Open;
  window.resetMobileDashboardNotificationsL2 = resetNotificationsL2;
  window.getMobileNotificationRowKind = rowKind;
  window.getGameInviteThumbnailSrc = gameInviteThumbnailSrc;
  window.areMobileNotifListActionsEnabled = notifListActionsEnabled;
  window.getMobileNotifListActionsMode = getNotifListActionsMode;
  window.setMobileNotifListActionsMode = setNotifListActionsMode;
  window.setMobileNotifListActionsEnabled = setNotifListActionsEnabled;
  window.resolveNotificationSenderHandleKey = resolveNotificationSenderHandleKey;
  window.fcMobileNotifOutcome = {
    LOADING_MS: NOTIF_OUTCOME_LOADING_MS,
    CONFIRM_MS: NOTIF_OUTCOME_CONFIRM_MS,
    COPY: NOTIF_OUTCOME_COPY,
    LOADER_SRC: NOTIF_OUTCOME_LOADER_SRC,
    ACCEPT_ICON: NOTIF_OUTCOME_CONFIRM_ACCEPT_ICON,
    DECLINE_ICON: NOTIF_OUTCOME_CONFIRM_DECLINE_ICON,
    clearTimers: clearNotifOutcomeTimers,
    applyOutcome: applyNotifOutcome,
    friendConnectedTitle: friendConnectedTitle,
    buildOutcomeCtaStage: buildNotifOutcomeCtaStage
  };
})();
