/**
 * Evolution mobile — Edit Profile L2 (Set your online status).
 */
(function () {
  "use strict";

  var editProfileL2Open = false;
  var editProfileL2Animating = false;
  var editProfileReturnDetail = false;
  var editProfileReturnL3 = false;
  var editProfileReturnHandleKey = null;
  var selectedOnlineStatus = "online";

  var ONLINE_STATUS_OPTIONS = [
    {
      value: "online",
      title: "Online",
      desc: "Your friends will see when you're playing a game.",
    },
    {
      value: "appear-offline",
      title: "Appear Offline",
      desc:
        "Your friends won't see when you're playing, but your game handle might appear in multiplayer games.",
    },
  ];

  function getRoot() {
    return document.getElementById("fcMobileDashboard");
  }

  function getApp() {
    return document.getElementById("app");
  }

  function isEvolutionMode() {
    var app = getApp();
    return app && app.getAttribute("data-platform-experience") === "evolution";
  }

  function isMobileDashOpen() {
    var root = getRoot();
    return !!(root && root.classList.contains("is-open"));
  }

  function isMobileDetailSubPage() {
    var root = getRoot();
    return !!(root && root.getAttribute("data-mobile-detail-view") === "sub-page");
  }

  function isDetailOpen() {
    var root = getRoot();
    if (!root) return false;
    if (root.getAttribute("data-mobile-dashboard-l2") === "detail") return true;
    if (root.getAttribute("data-mobile-dashboard-l3") === "detail") return true;
    return false;
  }

  function l2AnimMs() {
    var root = getRoot();
    if (!root) return 340;
    var ms = parseInt(
      getComputedStyle(root).getPropertyValue("--fc-mobile-dash-view-ms").trim(),
      10
    );
    return Number.isFinite(ms) && ms > 0 ? ms : 340;
  }

  function finishL2OpenAnimation(done) {
    window.setTimeout(function () {
      if (typeof done === "function") done();
      if (typeof window.scheduleMobileDashboardViewScrollSync === "function") {
        window.scheduleMobileDashboardViewScrollSync();
      }
    }, l2AnimMs());
  }

  function resetOtherL2() {
    if (typeof window.resetMobileDashboardNotificationsL2 === "function") {
      window.resetMobileDashboardNotificationsL2();
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
  }

  function syncOnlineStatusRadios() {
    var list = document.getElementById("fcMobileEditProfileRadioList");
    if (!list) return;
    var buttons = list.querySelectorAll(".fc-mobile-edit-profile__radio");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var value = btn.getAttribute("data-online-status") || "";
      var selected = value === selectedOnlineStatus;
      btn.classList.toggle("is-selected", selected);
      btn.setAttribute("aria-checked", selected ? "true" : "false");
    }
  }

  function setOnlineStatus(value) {
    if (value !== "online" && value !== "appear-offline") return;
    selectedOnlineStatus = value;
    var playerKey =
      typeof window.getActiveLocalPlayerKey === "function"
        ? window.getActiveLocalPlayerKey()
        : "local";
    if (
      typeof window.PrototypePresence !== "undefined" &&
      typeof window.PrototypePresence.setLocalOnlineStatus === "function"
    ) {
      window.PrototypePresence.setLocalOnlineStatus(playerKey, value);
    }
    syncOnlineStatusRadios();
    if (typeof window.syncLocalPlayerPresenceUi === "function") {
      window.syncLocalPlayerPresenceUi();
    }
  }

  function bindOnlineStatusRadios() {
    var list = document.getElementById("fcMobileEditProfileRadioList");
    if (!list || list.getAttribute("data-edit-profile-radios-bound") === "1") return;
    list.setAttribute("data-edit-profile-radios-bound", "1");

    list.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest(".fc-mobile-edit-profile__radio");
      if (!btn || !list.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      setOnlineStatus(btn.getAttribute("data-online-status"));
    });

    list.addEventListener("keydown", function (e) {
      var btn = e.target.closest && e.target.closest(".fc-mobile-edit-profile__radio");
      if (!btn || !list.contains(btn)) return;
      var buttons = Array.prototype.slice.call(
        list.querySelectorAll(".fc-mobile-edit-profile__radio")
      );
      var idx = buttons.indexOf(btn);
      if (idx < 0) return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        var next = buttons[(idx + 1) % buttons.length];
        if (next) next.focus();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        var prev = buttons[(idx - 1 + buttons.length) % buttons.length];
        if (prev) prev.focus();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setOnlineStatus(btn.getAttribute("data-online-status"));
      }
    });
  }

  function openEditProfileL2(opts) {
    opts = opts || {};
    var root = getRoot();
    if (!root || !isEvolutionMode() || !isMobileDashOpen() || editProfileL2Animating) return;

    if (!opts.fromDetail && root.getAttribute("data-mobile-dashboard-view") !== "home") return;

    resetOtherL2();

    var fromDetail = !!opts.fromDetail || isDetailOpen();
    editProfileReturnDetail = fromDetail;
    editProfileReturnL3 =
      fromDetail && !isMobileDetailSubPage() && root.getAttribute("data-mobile-dashboard-l3") === "detail";
    editProfileReturnHandleKey =
      fromDetail && typeof window.getMobileDetailActiveHandleKey === "function"
        ? window.getMobileDetailActiveHandleKey()
        : null;

    if (fromDetail) {
      root.setAttribute("data-mobile-edit-profile-return", "detail");
      root.removeAttribute("data-mobile-dashboard-l3");
      root.removeAttribute("data-mobile-dashboard-l3-enter");
    } else {
      root.removeAttribute("data-mobile-edit-profile-return");
    }

    editProfileL2Animating = true;
    editProfileL2Open = true;
    root.setAttribute("data-mobile-dashboard-l2", "edit-profile");

    var playerKey =
      typeof window.getActiveLocalPlayerKey === "function"
        ? window.getActiveLocalPlayerKey()
        : "local";
    if (typeof window.getLocalOnlineStatusForKey === "function") {
      selectedOnlineStatus = window.getLocalOnlineStatusForKey(playerKey);
    }

    var view = document.getElementById("fcMobileDashViewEditProfile");
    if (view) view.setAttribute("aria-hidden", "false");

    syncOnlineStatusRadios();
    if (typeof window.syncMobileDashboardMissedCard === "function") {
      window.syncMobileDashboardMissedCard();
    }
    if (typeof window.scheduleMobileDashboardViewScrollSync === "function") {
      window.scheduleMobileDashboardViewScrollSync();
    }

    finishL2OpenAnimation(function () {
      editProfileL2Animating = false;
    });
  }

  function closeEditProfileL2() {
    var root = getRoot();
    if (!root || !editProfileL2Open || editProfileL2Animating) return;

    editProfileL2Animating = true;
    editProfileL2Open = false;

    var returnDetail = editProfileReturnDetail;
    var returnL3 = editProfileReturnL3;
    var returnHandleKey = editProfileReturnHandleKey;
    var returnSubPageDetail = returnDetail && isMobileDetailSubPage() && !returnL3;
    var returnOverlayDetail = returnDetail && returnL3;
    editProfileReturnDetail = false;
    editProfileReturnL3 = false;
    editProfileReturnHandleKey = null;

    if (returnSubPageDetail) {
      root.setAttribute("data-mobile-edit-profile-closing", "detail");
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          root.removeAttribute("data-mobile-edit-profile-return");
        });
      });
      if (typeof window.restoreMobileDetailAfterEditProfileClose === "function") {
        if (
          returnHandleKey &&
          typeof window.setMobileDetailActiveHandleKey === "function"
        ) {
          window.setMobileDetailActiveHandleKey(returnHandleKey);
        }
        window.restoreMobileDetailAfterEditProfileClose();
      }
    } else if (returnOverlayDetail) {
      root.setAttribute("data-mobile-edit-profile-closing", "overlay");
      root.setAttribute("data-mobile-dashboard-l3", "detail");
      root.removeAttribute("data-mobile-edit-profile-return");
      if (typeof window.restoreMobileDetailAfterEditProfileClose === "function") {
        if (
          returnHandleKey &&
          typeof window.setMobileDetailActiveHandleKey === "function"
        ) {
          window.setMobileDetailActiveHandleKey(returnHandleKey);
        }
        window.restoreMobileDetailAfterEditProfileClose();
      }
    } else {
      root.removeAttribute("data-mobile-edit-profile-return");
      if (root.getAttribute("data-mobile-dashboard-l2") === "edit-profile") {
        root.removeAttribute("data-mobile-dashboard-l2");
      }
    }

    var view = document.getElementById("fcMobileDashViewEditProfile");
    window.setTimeout(function () {
      if (view && !editProfileL2Open) {
        view.setAttribute("aria-hidden", "true");
      }

      if (returnDetail) {
        if (returnL3) {
          root.removeAttribute("data-mobile-dashboard-l2");
          root.setAttribute("data-mobile-dashboard-l3", "detail");
        } else {
          root.setAttribute("data-mobile-dashboard-l2", "detail");
        }
      } else if (root.getAttribute("data-mobile-dashboard-l2") === "edit-profile") {
        root.removeAttribute("data-mobile-dashboard-l2");
      }

      root.removeAttribute("data-mobile-edit-profile-closing");

      if (returnDetail && typeof window.restoreMobileDetailAfterEditProfileClose === "function") {
        if (
          returnHandleKey &&
          typeof window.setMobileDetailActiveHandleKey === "function"
        ) {
          window.setMobileDetailActiveHandleKey(returnHandleKey);
        }
        window.restoreMobileDetailAfterEditProfileClose();
      }

      editProfileL2Animating = false;
      if (typeof window.syncMobileDashboardMissedCard === "function") {
        window.syncMobileDashboardMissedCard();
      }
      if (typeof window.scheduleMobileDashboardViewScrollSync === "function") {
        window.scheduleMobileDashboardViewScrollSync();
      }
    }, l2AnimMs());
  }

  function resetEditProfileL2() {
    editProfileL2Open = false;
    editProfileL2Animating = false;
    editProfileReturnDetail = false;
    editProfileReturnL3 = false;
    editProfileReturnHandleKey = null;
    var root = getRoot();
    if (root) {
      if (root.getAttribute("data-mobile-dashboard-l2") === "edit-profile") {
        root.removeAttribute("data-mobile-dashboard-l2");
      }
      root.removeAttribute("data-mobile-edit-profile-return");
      root.removeAttribute("data-mobile-edit-profile-closing");
    }
    var view = document.getElementById("fcMobileDashViewEditProfile");
    if (view) view.setAttribute("aria-hidden", "true");
    if (typeof window.syncMobileDashboardMissedCard === "function") {
      window.syncMobileDashboardMissedCard();
    }
  }

  function bindEditProfileUi() {
    var backBtn = document.getElementById("fcMobileEditProfileBackBtn");
    if (backBtn && backBtn.getAttribute("data-edit-profile-bound") !== "1") {
      backBtn.setAttribute("data-edit-profile-bound", "1");
      backBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeEditProfileL2();
      });
    }
    bindOnlineStatusRadios();
    syncOnlineStatusRadios();
  }

  function initEditProfile() {
    bindEditProfileUi();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEditProfile);
  } else {
    initEditProfile();
  }

  window.openMobileEditProfileL2 = openEditProfileL2;
  window.closeMobileEditProfileL2 = closeEditProfileL2;
  window.resetMobileDashboardEditProfileL2 = resetEditProfileL2;
  window.isMobileEditProfileL2Open = function () {
    return editProfileL2Open;
  };
  window.getMobileOnlineStatusSelection = function () {
    return selectedOnlineStatus;
  };
})();
