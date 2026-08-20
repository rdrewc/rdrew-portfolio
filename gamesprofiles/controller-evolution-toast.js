/**
 * Evolution controller notification toasts — Figma 166:4888 (Messaging/Notification).
 * In Controller Evolution, game/friend invite toasts appear on the phone instead of the TV.
 */
(function () {
  "use strict";

  var DWELL_MS = 4000;
  function toastAssets() {
    return window.FIGMA_CONTROLLER_EVOLUTION_TOAST_ASSETS || {};
  }

  function defaultGameInviteThumb() {
    var pack = toastAssets();
    return pack.gameImage || pack.thumbnail || "";
  }

  function defaultGameInviteBadge() {
    var av = window.PROTOTYPE_PLAYER_AVATARS;
    var pack = toastAssets();
    return (
      (av && av.inviter) ||
      pack.avatarBadge ||
      "assets/profile-avatars/type-01-luffy.png"
    );
  }

  function defaultFriendAvatar() {
    var pack = toastAssets();
    return pack.avatarBadge || "assets/profile-avatars/type-01-scarlet.png";
  }

  var layer = null;
  var toast = null;
  var toastGlow = null;
  var titleEl = null;
  var bodyEl = null;
  var gameImgEl = null;
  var avatarBadgeEl = null;
  var dwellTimer = null;
  var exitFallbackTimer = null;
  var exitListening = false;
  var toastExitDone = false;
  var activeKind = null;
  var toastEngaged = false;
  var toastDashWasOpen = false;
  var toastSwipeDismissed = false;

  var SWIPE_DISMISS_PX = 40;
  var SWIPE_CLICK_SLOP_PX = 10;
  var swipePointerId = null;
  var swipeStartY = 0;
  var swipeDragY = 0;
  var suppressToastClick = false;

  var TV_HINT_DWELL_MS = 3000;
  var tvHintLayer = null;
  var tvHint = null;
  var tvHintGlow = null;
  var tvHintTimer = null;
  var tvHintExitTimer = null;

  function getApp() {
    return document.getElementById("app");
  }

  function isEvolutionMode() {
    var app = getApp();
    return app && app.getAttribute("data-platform-experience") === "evolution";
  }

  function localSessionGameTitle() {
    var refRaw = window.PROTOTYPE_LOCAL_SESSION_GAME_TITLE;
    return (typeof refRaw === "string" ? refRaw : "").replace(/\s+/g, " ").trim() || "FIFA World Cup";
  }

  function syncControllerNotifGlow(glowEl, state) {
    if (!glowEl) return;
    if (state === "in") {
      glowEl.hidden = false;
      glowEl.classList.remove("fc-controller-notif-glow--in", "fc-controller-notif-glow--out");
      void glowEl.offsetWidth;
      window.requestAnimationFrame(function () {
        glowEl.classList.add("fc-controller-notif-glow--in");
      });
      return;
    }
    if (state === "out") {
      glowEl.classList.remove("fc-controller-notif-glow--in");
      glowEl.classList.add("fc-controller-notif-glow--out");
      return;
    }
    glowEl.hidden = true;
    glowEl.classList.remove("fc-controller-notif-glow--in", "fc-controller-notif-glow--out");
  }

  function clearDwellTimer() {
    if (dwellTimer) {
      window.clearTimeout(dwellTimer);
      dwellTimer = null;
    }
  }

  function clearExitFallback() {
    if (exitFallbackTimer) {
      window.clearTimeout(exitFallbackTimer);
      exitFallbackTimer = null;
    }
  }

  function clearActiveAppAttrs() {
    var app = getApp();
    if (!app) return;
    if (activeKind === "game-invite") {
      app.removeAttribute("data-tv-game-invite-toast");
    } else if (activeKind === "friend-invite") {
      app.removeAttribute("data-tv-friend-invite-toast");
      window.__tvFriendInviteToastPerson = null;
    } else if (activeKind === "achievement") {
      app.removeAttribute("data-tv-achievement-toast");
    }
    activeKind = null;
  }

  function finishExit() {
    if (toastExitDone || !toast || !layer) return;
    toastExitDone = true;
    toast.removeEventListener("transitionend", onToastTransitionEnd);
    exitListening = false;
    clearExitFallback();
    toast.hidden = true;
    toast.classList.remove("fc-evo-toast--in", "fc-evo-toast--out", "fc-evo-toast--friend-request", "fc-evo-toast--achievement");
    syncControllerNotifGlow(toastGlow, "hide");
    layer.setAttribute("aria-hidden", "true");
    if (!toastEngaged && !toastDashWasOpen && !toastSwipeDismissed && activeKind) {
      if (typeof window.markEvolutionControllerToastMissed === "function") {
        window.markEvolutionControllerToastMissed(activeKind);
      }
    }
    toastDashWasOpen = false;
    toastEngaged = false;
    toastSwipeDismissed = false;
    clearActiveAppAttrs();
  }

  function onToastTransitionEnd(e) {
    if (!toast || e.target !== toast) return;
    if (e.propertyName !== "transform") return;
    if (!toast.classList.contains("fc-evo-toast--out")) return;
    finishExit();
  }

  function dismissWithExit() {
    if (!toast || toast.hidden) return;
    clearDwellTimer();
    toast.classList.remove("fc-evo-toast--in");
    toast.classList.add("fc-evo-toast--out");
    syncControllerNotifGlow(toastGlow, "out");
    if (!exitListening) {
      exitListening = true;
      toast.addEventListener("transitionend", onToastTransitionEnd);
    }
    clearExitFallback();
    exitFallbackTimer = window.setTimeout(function () {
      exitFallbackTimer = null;
      finishExit();
    }, 700);
  }

  function dismissEvolutionControllerToastImmediately() {
    if (!toast || !layer || toast.hidden) return;
    clearDwellTimer();
    clearExitFallback();
    toast.removeEventListener("transitionend", onToastTransitionEnd);
    exitListening = false;
    toastExitDone = true;
    toast.classList.remove("fc-evo-toast--in", "fc-evo-toast--out", "fc-evo-toast--friend-request", "fc-evo-toast--achievement");
    syncControllerNotifGlow(toastGlow, "hide");
    toast.hidden = true;
    layer.setAttribute("aria-hidden", "true");
    if (toastEngaged && typeof window.clearMissedNotification === "function") {
      window.clearMissedNotification();
    }
    toastEngaged = false;
    toastDashWasOpen = false;
    toastSwipeDismissed = false;
    resetSwipeDrag();
    clearActiveAppAttrs();
  }

  function resetSwipeDrag() {
    if (!toast) return;
    swipePointerId = null;
    swipeStartY = 0;
    swipeDragY = 0;
    suppressToastClick = false;
    toast.classList.remove("fc-evo-toast--dragging");
    toast.style.removeProperty("--evo-toast-drag-y");
  }

  function applySwipeDrag(dy) {
    if (!toast) return;
    swipeDragY = Math.min(0, dy);
    toast.classList.add("fc-evo-toast--dragging");
    toast.style.setProperty("--evo-toast-drag-y", swipeDragY + "px");
  }

  function bindEvolutionToastSwipeDismiss() {
    if (!toast) return;

    toast.addEventListener("pointerdown", function (e) {
      if (toast.hidden) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      swipePointerId = e.pointerId;
      swipeStartY = e.clientY;
      swipeDragY = 0;
      suppressToastClick = false;
      try {
        toast.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
    });

    toast.addEventListener("pointermove", function (e) {
      if (swipePointerId !== e.pointerId) return;
      var dy = e.clientY - swipeStartY;
      if (dy < -SWIPE_CLICK_SLOP_PX || swipeDragY < 0) {
        e.preventDefault();
        suppressToastClick = true;
        applySwipeDrag(dy);
      }
    });

    function finishSwipePointer(e) {
      if (swipePointerId !== e.pointerId) return;
      try {
        toast.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
      swipePointerId = null;
      if (swipeDragY <= -SWIPE_DISMISS_PX) {
        toastSwipeDismissed = true;
        resetSwipeDrag();
        dismissWithExit();
        return;
      }
      resetSwipeDrag();
    }

    toast.addEventListener("pointerup", finishSwipePointer);
    toast.addEventListener("pointercancel", finishSwipePointer);
  }

  function clearTvHintTimer() {
    if (tvHintTimer) {
      window.clearTimeout(tvHintTimer);
      tvHintTimer = null;
    }
    if (tvHintExitTimer) {
      window.clearTimeout(tvHintExitTimer);
      tvHintExitTimer = null;
    }
  }

  function dismissEvolutionContinueOnTvToastImmediately() {
    if (!tvHint || !tvHintLayer) return;
    clearTvHintTimer();
    tvHint.classList.remove("fc-evo-tv-hint--in", "fc-evo-tv-hint--out");
    syncControllerNotifGlow(tvHintGlow, "hide");
    tvHint.hidden = true;
    tvHintLayer.setAttribute("aria-hidden", "true");
  }

  function dismissEvolutionContinueOnTvToast() {
    if (!tvHint || tvHint.hidden) return;
    clearTvHintTimer();
    tvHint.classList.remove("fc-evo-tv-hint--in");
    tvHint.classList.add("fc-evo-tv-hint--out");
    syncControllerNotifGlow(tvHintGlow, "out");
    tvHintExitTimer = window.setTimeout(function () {
      tvHintExitTimer = null;
      dismissEvolutionContinueOnTvToastImmediately();
    }, 320);
  }

  function showEvolutionContinueOnTvToast(message) {
    if (!isEvolutionMode() || !tvHint || !tvHintLayer) return;
    var textEl = tvHint.querySelector(".fc-evo-tv-hint__text");
    if (textEl) {
      textEl.textContent = message || "Continue on your TV";
    }
    dismissEvolutionContinueOnTvToastImmediately();
    tvHint.hidden = false;
    tvHintLayer.setAttribute("aria-hidden", "false");
    void tvHint.offsetWidth;
    window.requestAnimationFrame(function () {
      tvHint.classList.add("fc-evo-tv-hint--in");
      syncControllerNotifGlow(tvHintGlow, "in");
      tvHintTimer = window.setTimeout(function () {
        tvHintTimer = null;
        dismissEvolutionContinueOnTvToast();
      }, TV_HINT_DWELL_MS);
    });
  }

  function isPlatformPhase05() {
    if (!isEvolutionMode()) return false;
    var app = getApp();
    return !!(app && app.getAttribute("data-platform-phase") === "0.5");
  }

  function useEvolutionControllerNotificationToasts() {
    return isEvolutionMode() && !isPlatformPhase05();
  }

  function populateGameInviteToast() {
    var ph = window.PROTOTYPE_PLAYER_HANDLES;
    var av = window.PROTOTYPE_PLAYER_AVATARS;
    var inviter = ph && ph.inviter ? ph.inviter : "Friend";
    if (titleEl) {
      titleEl.textContent = "Game invite from " + inviter;
    }
    if (bodyEl) {
      bodyEl.textContent = localSessionGameTitle();
    }
    if (gameImgEl) {
      gameImgEl.src = defaultGameInviteThumb();
      gameImgEl.alt = "";
    }
    if (avatarBadgeEl) {
      avatarBadgeEl.src = defaultGameInviteBadge();
      avatarBadgeEl.alt = "";
    }
    toast.classList.remove("fc-evo-toast--friend-request", "fc-evo-toast--achievement");
  }

  function populateFriendInviteToast(person) {
    person = person || {};
    var handle = person.handle || "Friend";
    var avatarSrc = person.avatarSrc || defaultFriendAvatar();
    if (titleEl) {
      titleEl.textContent = handle + " wants to be friends";
    }
    if (bodyEl) {
      bodyEl.textContent = "";
    }
    if (gameImgEl) {
      gameImgEl.src = avatarSrc;
      gameImgEl.alt = "";
    }
    if (avatarBadgeEl) {
      avatarBadgeEl.removeAttribute("src");
    }
    toast.classList.add("fc-evo-toast--friend-request");
    toast.classList.remove("fc-evo-toast--achievement");
  }

  function populateAchievementToast(achievement) {
    achievement = achievement || {};
    var title = achievement.title || "Achievement";
    var imageSrc =
      achievement.imageSrc ||
      "assets/raster/dashboard-achievements-fifa/fifa-unlock-01.svg";
    if (titleEl) {
      titleEl.textContent = "Achievement unlocked";
    }
    if (bodyEl) {
      bodyEl.textContent = title;
    }
    if (gameImgEl) {
      gameImgEl.src = imageSrc;
      gameImgEl.alt = "";
    }
    if (avatarBadgeEl) {
      avatarBadgeEl.removeAttribute("src");
    }
    toast.classList.add("fc-evo-toast--achievement");
    toast.classList.remove("fc-evo-toast--friend-request");
  }

  function showEvolutionControllerToast(kind, person) {
    if (!useEvolutionControllerNotificationToasts() || !toast || !layer) return;
    clearDwellTimer();
    clearExitFallback();
    toast.removeEventListener("transitionend", onToastTransitionEnd);
    exitListening = false;
    toastExitDone = false;
    toastEngaged = false;
    toastSwipeDismissed = false;
    resetSwipeDrag();
    toastDashWasOpen =
      typeof window.isMobileDashboardOpen === "function" && window.isMobileDashboardOpen();
    if (typeof window.clearMissedNotification === "function") {
      window.clearMissedNotification();
    }
    activeKind = kind;

    if (kind === "friend-invite") {
      populateFriendInviteToast(person);
      var app = getApp();
      if (app) app.setAttribute("data-tv-friend-invite-toast", "active");
    } else if (kind === "achievement") {
      populateAchievementToast(person);
      var appAch = getApp();
      if (appAch) appAch.setAttribute("data-tv-achievement-toast", "active");
    } else {
      populateGameInviteToast();
      var appGi = getApp();
      if (appGi) appGi.setAttribute("data-tv-game-invite-toast", "active");
    }

    toast.classList.remove("fc-evo-toast--in", "fc-evo-toast--out");
    layer.setAttribute("aria-hidden", "false");
    toast.hidden = false;
    void toast.offsetWidth;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        toast.classList.add("fc-evo-toast--in");
        syncControllerNotifGlow(toastGlow, "in");
        dwellTimer = window.setTimeout(function () {
          dwellTimer = null;
          dismissWithExit();
        }, DWELL_MS);
      });
    });
  }

  function hydrateEvolutionToastAssets() {
    var pack = toastAssets();
    if (!pack) return;
    document.querySelectorAll("[data-evo-toast]").forEach(function (el) {
      var key = el.getAttribute("data-evo-toast");
      if (key && pack[key]) el.setAttribute("src", pack[key]);
    });
  }

  function initEvolutionControllerToast() {
    layer = document.getElementById("fcEvoToastLayer");
    toast = document.getElementById("fcEvoToast");
    toastGlow = document.getElementById("fcEvoToastTopGlow");
    tvHintLayer = document.getElementById("fcEvoTvHintLayer");
    tvHint = document.getElementById("fcEvoTvHint");
    tvHintGlow = document.getElementById("fcEvoTvHintTopGlow");
    if (!layer || !toast) return;
    titleEl = document.getElementById("fcEvoToastTitle");
    bodyEl = document.getElementById("fcEvoToastBody");
    gameImgEl = document.getElementById("fcEvoToastGameImg");
    avatarBadgeEl = document.getElementById("fcEvoToastAvatarBadge");
    hydrateEvolutionToastAssets();
    bindEvolutionToastSwipeDismiss();
    toast.addEventListener("click", function (e) {
      if (suppressToastClick) {
        suppressToastClick = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      toastEngaged = true;
      if (typeof window.openMobileNotificationDetailFromToast === "function") {
        window.openMobileNotificationDetailFromToast();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEvolutionControllerToast);
  } else {
    initEvolutionControllerToast();
  }

  window.showEvolutionControllerGameInviteToast = function () {
    showEvolutionControllerToast("game-invite");
  };

  window.showEvolutionControllerFriendInviteToast = function (person) {
    showEvolutionControllerToast("friend-invite", person);
  };

  window.showEvolutionControllerAchievementToast = function (achievement) {
    showEvolutionControllerToast("achievement", achievement);
  };

  window.dismissEvolutionControllerToastImmediately =
    dismissEvolutionControllerToastImmediately;

  window.useEvolutionControllerNotificationToasts = useEvolutionControllerNotificationToasts;

  window.showEvolutionContinueOnTvToast = showEvolutionContinueOnTvToast;
  window.dismissEvolutionContinueOnTvToastImmediately =
    dismissEvolutionContinueOnTvToastImmediately;
})();
