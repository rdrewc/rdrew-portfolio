/**
 * Prototype: unlock the next locked TV achievement, notify, and sync mobile dashboard.
 */
(function () {
  "use strict";

  var LOCKED_ACHIEVEMENT_ART_BY_TITLE = {
    "Perfect Hat Trick": "assets/raster/dashboard-achievements-fifa/fifa-unlock-01.svg",
    "Champions Rising": "assets/raster/dashboard-achievements-fifa/fifa-unlock-02.svg",
    "Set Piece Architect": "assets/raster/dashboard-achievements-fifa/fifa-unlock-03.svg",
    "Pro Clubs Captain": "assets/raster/dashboard-achievements-fifa/fifa-unlock-04.svg",
    "Skill Move Maestro": "assets/raster/dashboard-achievements-fifa/fifa-unlock-02.svg"
  };

  var DEFAULT_ACHIEVEMENT_ART =
    "assets/raster/dashboard-achievements-fifa/fifa-unlock-01.svg";

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

  function formatAchievementDate(date) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function achievementArtForTitle(title) {
    return (title && LOCKED_ACHIEVEMENT_ART_BY_TITLE[title]) || DEFAULT_ACHIEVEMENT_ART;
  }

  function findFirstLockedAchievementCard() {
    var track = document.getElementById("tvDashboardAchievementsCards");
    if (!track) return null;
    return track.querySelector(".tv-dashboard__achievements-focus-locked");
  }

  function extractLockedAchievementData(card) {
    if (!card) return null;
    var titleEl = card.querySelector(".tv-dashboard__achievements-focus-locked-text h3");
    var descEl = card.querySelector(".tv-dashboard__achievements-focus-locked-text p");
    var title = titleEl ? titleEl.textContent.replace(/\s+/g, " ").trim() : "";
    if (!title) return null;
    return {
      title: title,
      description: descEl ? descEl.textContent.replace(/\s+/g, " ").trim() : "",
      imageSrc: achievementArtForTitle(title),
      date: formatAchievementDate(new Date())
    };
  }

  function clearMostRecentUnlockedFlags(track) {
    if (!track) return;
    track.querySelectorAll("[data-most-recent-unlocked]").forEach(function (node) {
      node.removeAttribute("data-most-recent-unlocked");
    });
  }

  function createUnlockedAchievementCard(data) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "tv-dashboard__achievements-focus-card tv-dashboard__dash-content-focusable tv-dashboard__dash-content-focusable--tile";
    btn.setAttribute("aria-label", "Achievement: " + data.title);
    btn.setAttribute("tabindex", "-1");
    btn.setAttribute("data-most-recent-unlocked", "true");

    var inner = document.createElement("div");
    inner.className = "tv-dashboard__achievements-focus-card-inner";

    var imgWrap = document.createElement("div");
    imgWrap.className = "tv-dashboard__achievements-focus-card-img";
    var img = document.createElement("img");
    img.setAttribute("src", data.imageSrc);
    img.setAttribute("alt", "");
    img.setAttribute("decoding", "async");
    imgWrap.appendChild(img);

    var text = document.createElement("div");
    text.className = "tv-dashboard__achievements-focus-card-text";

    var title = document.createElement("h3");
    title.textContent = data.title;

    var desc = document.createElement("p");
    desc.className = "tv-dashboard__achievements-focus-card-desc";
    desc.textContent = data.description;

    var date = document.createElement("p");
    date.className = "tv-dashboard__achievements-focus-card-date";
    date.textContent = data.date;

    text.appendChild(title);
    text.appendChild(desc);
    text.appendChild(date);
    inner.appendChild(imgWrap);
    inner.appendChild(text);
    btn.appendChild(inner);
    return btn;
  }

  function syncTvAchievementProgress() {
    var track = document.getElementById("tvDashboardAchievementsCards");
    if (!track) return { unlocked: 0, total: 0 };

    var unlocked = track.querySelectorAll(".tv-dashboard__achievements-focus-card").length;
    var locked = track.querySelectorAll(".tv-dashboard__achievements-focus-locked").length;
    var mystery = track.querySelectorAll(".tv-dashboard__achievements-focus-mystery").length;
    var total = unlocked + locked + mystery;

    var countEl = document.querySelector(".tv-dashboard__achievements-focus-progress-count");
    if (countEl) countEl.textContent = unlocked + "/" + total;

    var fillEl = document.querySelector(".tv-dashboard__achievements-focus-progress-fill--fifa");
    if (fillEl && total > 0) {
      fillEl.style.width = "calc(100% * " + unlocked + " / " + total + ")";
    }

    return { unlocked: unlocked, total: total };
  }

  function unlockNextAchievementOnTv() {
    if (
      typeof window.isMultiLocalSession === "function" &&
      window.isMultiLocalSession() &&
      typeof window.unlockNextAchievementForActiveLocalPlayer === "function"
    ) {
      return window.unlockNextAchievementForActiveLocalPlayer();
    }

    var track = document.getElementById("tvDashboardAchievementsCards");
    var lockedCard = findFirstLockedAchievementCard();
    if (!track || !lockedCard) return null;

    var data = extractLockedAchievementData(lockedCard);
    if (!data) return null;

    clearMostRecentUnlockedFlags(track);
    var unlockedCard = createUnlockedAchievementCard(data);
    track.insertBefore(unlockedCard, track.firstChild);
    track.removeChild(lockedCard);
    syncTvAchievementProgress();
    return data;
  }

  function showAchievementToastForCurrentMode(achievement) {
    if (
      typeof window.useEvolutionControllerNotificationToasts === "function" &&
      window.useEvolutionControllerNotificationToasts()
    ) {
      if (typeof window.showEvolutionControllerAchievementToast === "function") {
        window.showEvolutionControllerAchievementToast(achievement);
      }
    } else if (typeof window.showTvAchievementToast === "function") {
      window.showTvAchievementToast(achievement);
    }
  }

  function syncMobileAchievementViews() {
    if (typeof window.syncMobileDashboardAchievementsInline === "function") {
      window.syncMobileDashboardAchievementsInline();
    }
    if (typeof window.syncMobileDashboardFriendsList === "function") {
      window.syncMobileDashboardFriendsList();
    }
  }

  function showPrototypeAchievementUnlock() {
    var app = getApp();
    if (!app || app.getAttribute("data-state") !== "in-game") return false;

    var achievement = unlockNextAchievementOnTv();
    if (!achievement) return false;

    window.__tvAchievementToastMeta = { achievement: achievement };

    if (isEvolutionMode()) {
      showAchievementToastForCurrentMode(achievement);
    } else if (typeof window.showTvAchievementToast === "function") {
      window.showTvAchievementToast(achievement);
    }

    syncMobileAchievementViews();
    return true;
  }

  function initUnlockAchievementControl() {
    var btn = document.getElementById("btnUnlockAchievement");
    if (!btn || btn.getAttribute("data-achievement-unlock-bound") === "1") return;
    btn.setAttribute("data-achievement-unlock-bound", "1");
    btn.addEventListener("click", function () {
      showPrototypeAchievementUnlock();
    });
  }

  function initTvAchievementToast() {
    var layer = document.getElementById("tvAchievementToastLayer");
    var toast = document.getElementById("tvAchievementToast");
    if (!layer || !toast) return;

    var titleEl = document.getElementById("tvAchievementToastTitle");
    var subEl = document.getElementById("tvAchievementToastSub");
    var imgEl = document.getElementById("tvAchievementToastImg");
    var app = getApp();

    var dwellTimer = null;
    var exitFallbackTimer = null;
    var exitListening = false;
    var toastExitDone = false;

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

    function finishExit() {
      if (toastExitDone) return;
      toastExitDone = true;
      toast.removeEventListener("transitionend", onToastTransitionEnd);
      exitListening = false;
      clearExitFallback();
      toast.hidden = true;
      toast.classList.remove("tv-game-invite-toast--in", "tv-game-invite-toast--out");
      layer.setAttribute("aria-hidden", "true");
      if (app) app.removeAttribute("data-tv-achievement-toast");
    }

    function onToastTransitionEnd(e) {
      if (e.target !== toast) return;
      if (e.propertyName !== "transform") return;
      if (!toast.classList.contains("tv-game-invite-toast--out")) return;
      finishExit();
    }

    function dismissWithExit() {
      clearDwellTimer();
      if (toast.hidden) return;
      toast.classList.remove("tv-game-invite-toast--in");
      toast.classList.add("tv-game-invite-toast--out");
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

    function dismissTvAchievementToastImmediately() {
      clearDwellTimer();
      clearExitFallback();
      toast.removeEventListener("transitionend", onToastTransitionEnd);
      exitListening = false;
      toastExitDone = true;
      toast.classList.remove("tv-game-invite-toast--in", "tv-game-invite-toast--out");
      toast.hidden = true;
      layer.setAttribute("aria-hidden", "true");
      if (app) app.removeAttribute("data-tv-achievement-toast");
    }

    window.dismissTvAchievementToastImmediately = dismissTvAchievementToastImmediately;

    window.showTvAchievementToast = function (achievement) {
      if (!achievement) return;
      if (
        typeof window.useEvolutionControllerNotificationToasts === "function" &&
        window.useEvolutionControllerNotificationToasts()
      ) {
        return;
      }
      clearDwellTimer();
      clearExitFallback();
      toast.removeEventListener("transitionend", onToastTransitionEnd);
      exitListening = false;
      toastExitDone = false;

      if (titleEl) titleEl.textContent = "Achievement unlocked";
      if (subEl) subEl.textContent = achievement.title;
      if (imgEl) imgEl.src = achievement.imageSrc || DEFAULT_ACHIEVEMENT_ART;

      toast.classList.remove("tv-game-invite-toast--in", "tv-game-invite-toast--out");
      if (app) app.setAttribute("data-tv-achievement-toast", "active");
      layer.setAttribute("aria-hidden", "false");
      toast.hidden = false;
      void toast.offsetWidth;
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          toast.classList.add("tv-game-invite-toast--in");
          dwellTimer = window.setTimeout(function () {
            dwellTimer = null;
            dismissWithExit();
          }, 5000);
        });
      });
    };
  }

  function initAchievementUnlockUi() {
    initUnlockAchievementControl();
    initTvAchievementToast();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAchievementUnlockUi);
  } else {
    initAchievementUnlockUi();
  }

  window.showPrototypeAchievementUnlock = showPrototypeAchievementUnlock;
  window.syncTvAchievementProgress = syncTvAchievementProgress;
})();
