/**
 * Mini notification toasts on inactive controller-dock thumbnails.
 */
(function () {
  "use strict";

  var DWELL_MS = 4000;
  var EXIT_MS = 400;
  var activeByKey = Object.create(null);

  function getApp() {
    return document.getElementById("app");
  }

  function isMultiLocal() {
    return typeof window.isMultiLocalSession === "function" && window.isMultiLocalSession();
  }

  function isEvolutionToastMode() {
    return (
      typeof window.useEvolutionControllerNotificationToasts === "function" &&
      window.useEvolutionControllerNotificationToasts()
    );
  }

  function indexForPlayerKey(playerKey) {
    if (!playerKey || typeof window.getLocalPlayerKeyForIndex !== "function") return -1;
    var count =
      typeof window.getTvPlayersJoinedCounts === "function"
        ? window.getTvPlayersJoinedCounts().local
        : 4;
    if (!(count >= 1 && count <= 4)) count = 4;
    for (var i = 0; i < count; i++) {
      if (window.getLocalPlayerKeyForIndex(i) === playerKey) return i;
    }
    return -1;
  }

  function thumbButtonForKey(playerKey) {
    var index = indexForPlayerKey(playerKey);
    if (!(index >= 0)) return null;
    return document.querySelector(
      '.controller-dock__thumb[data-local-player-index="' + index + '"]'
    );
  }

  function toastSlotForKey(playerKey) {
    var btn = thumbButtonForKey(playerKey);
    if (!btn) return null;
    return btn.querySelector(".controller-dock__thumb-toast-slot");
  }

  function defaultGameThumb() {
    if (typeof window.getGameInviteThumbnailSrc === "function") {
      return window.getGameInviteThumbnailSrc();
    }
    return "assets/raster/tv-game-invite-toast-61-6870/image-1898.png";
  }

  function defaultGameBadge() {
    var av = window.PROTOTYPE_PLAYER_AVATARS;
    return (av && av.inviter) || "assets/profile-avatars/type-01-luffy.png";
  }

  function localSessionGameTitle() {
    var refRaw = window.PROTOTYPE_LOCAL_SESSION_GAME_TITLE;
    return (typeof refRaw === "string" ? refRaw : "").replace(/\s+/g, " ").trim() || "FIFA World Cup";
  }

  function clearTimer(state) {
    if (!state) return;
    if (state.dwellTimer) {
      window.clearTimeout(state.dwellTimer);
      state.dwellTimer = null;
    }
    if (state.exitTimer) {
      window.clearTimeout(state.exitTimer);
      state.exitTimer = null;
    }
  }

  function finishThumbToast(playerKey) {
    var state = activeByKey[playerKey];
    if (!state) return;
    clearTimer(state);
    if (state.el && state.el.parentNode) {
      state.el.parentNode.removeChild(state.el);
    }
    delete activeByKey[playerKey];
    var slot = toastSlotForKey(playerKey);
    if (slot) slot.setAttribute("aria-hidden", "true");
  }

  function dismissThumbToast(playerKey, opts) {
    opts = opts || {};
    var state = activeByKey[playerKey];
    if (!state || !state.el) {
      finishThumbToast(playerKey);
      return;
    }
    clearTimer(state);
    state.el.classList.remove("controller-dock__thumb-toast--in");
    state.el.classList.add("controller-dock__thumb-toast--out");
    if (opts.markMissed && typeof window.markMissedNotificationForLocalPlayer === "function") {
      window.markMissedNotificationForLocalPlayer(playerKey, state.kind);
    }
    state.exitTimer = window.setTimeout(function () {
      finishThumbToast(playerKey);
    }, EXIT_MS);
  }

  function buildThumbToastEl(kind, payload) {
    payload = payload || {};
    var toast = document.createElement("div");
    toast.className = "controller-dock__thumb-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    if (kind === "friend-invite") toast.classList.add("controller-dock__thumb-toast--friend-request");
    if (kind === "achievement") toast.classList.add("controller-dock__thumb-toast--achievement");

    var thumb = document.createElement("div");
    thumb.className = "controller-dock__thumb-toast-thumb";
    thumb.setAttribute("aria-hidden", "true");

    var gameImg = document.createElement("img");
    gameImg.className = "controller-dock__thumb-toast-game";
    gameImg.alt = "";
    gameImg.decoding = "async";

    var badge = document.createElement("img");
    badge.className = "controller-dock__thumb-toast-badge";
    badge.alt = "";
    badge.decoding = "async";

    var text = document.createElement("div");
    text.className = "controller-dock__thumb-toast-text";

    var title = document.createElement("p");
    title.className = "controller-dock__thumb-toast-title";

    var body = document.createElement("p");
    body.className = "controller-dock__thumb-toast-body";

    if (kind === "friend-invite") {
      var handle = payload.handle || "Friend";
      title.textContent = handle + " wants to be friends";
      body.textContent = "";
      gameImg.src = payload.avatarSrc || "assets/profile-avatars/type-01-scarlet.png";
    } else if (kind === "achievement") {
      var ach = payload.achievement || payload;
      title.textContent = "Achievement unlocked";
      body.textContent = ach.title || "Achievement";
      gameImg.src = ach.imageSrc || "assets/raster/dashboard-achievements-fifa/fifa-unlock-01.svg";
    } else {
      var inviter = payload.inviterHandle || "Friend";
      title.textContent = "Game invite from " + inviter;
      body.textContent = payload.gameTitle || localSessionGameTitle();
      gameImg.src = defaultGameThumb();
      badge.src = defaultGameBadge();
    }

    thumb.appendChild(gameImg);
    if (kind === "game-invite") thumb.appendChild(badge);
    text.appendChild(title);
    if (body.textContent) text.appendChild(body);
    toast.appendChild(thumb);
    toast.appendChild(text);
    return toast;
  }

  function showControllerDockThumbToast(playerKey, kind, payload) {
    if (!isMultiLocal() || !isEvolutionToastMode()) return;
    var slot = toastSlotForKey(playerKey);
    if (!slot) return;

    if (activeByKey[playerKey]) {
      dismissThumbToast(playerKey, { markMissed: false });
    }

    var el = buildThumbToastEl(kind, payload);
    slot.replaceChildren(el);
    slot.setAttribute("aria-hidden", "false");

    activeByKey[playerKey] = { el: el, kind: kind, payload: payload };

    void el.offsetWidth;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (!activeByKey[playerKey]) return;
        el.classList.add("controller-dock__thumb-toast--in");
        activeByKey[playerKey].dwellTimer = window.setTimeout(function () {
          dismissThumbToast(playerKey, { markMissed: true });
        }, DWELL_MS);
      });
    });
  }

  function dismissAllThumbToasts() {
    Object.keys(activeByKey).forEach(function (key) {
      dismissThumbToast(key, { markMissed: false });
    });
  }

  function restoreVisibleThumbToasts() {
    Object.keys(activeByKey).forEach(function (key) {
      var state = activeByKey[key];
      if (!state || !state.el) return;
      var slot = toastSlotForKey(key);
      if (!slot || slot.contains(state.el)) return;
      slot.replaceChildren(state.el);
      slot.setAttribute("aria-hidden", "false");
      state.el.classList.add("controller-dock__thumb-toast--in");
      state.el.classList.remove("controller-dock__thumb-toast--out");
    });
  }

  window.showControllerDockThumbToast = showControllerDockThumbToast;
  window.dismissControllerDockThumbToast = dismissThumbToast;
  window.dismissAllControllerDockThumbToasts = dismissAllThumbToasts;
  window.restoreControllerDockThumbToasts = restoreVisibleThumbToasts;
})();
