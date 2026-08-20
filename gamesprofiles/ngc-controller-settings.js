/**
 * NGC (Current platform experience) — controller settings full-screen bottom sheet.
 */
(function () {
  "use strict";

  var layer = null;
  var openAnimating = false;

  function isCurrentExperience() {
    var app = document.getElementById("app");
    return !!(app && app.getAttribute("data-platform-experience") === "current");
  }

  function isNgcConnectedVisible() {
    var mount = document.getElementById("fcConnectedMount");
    return !!(mount && !mount.classList.contains("is-hidden"));
  }

  function hydrateNgcControllerSettingsAssets() {
    var pack = window.FIGMA_MOBILE_DASHBOARD_NOTIFICATIONS_ASSETS;
    if (!pack || !layer) return;
    layer.querySelectorAll("[data-ngc-settings]").forEach(function (el) {
      var key = el.getAttribute("data-ngc-settings");
      if (key && pack[key]) el.setAttribute("src", pack[key]);
    });
  }

  function bindNgcControllerSettingsUi() {
    if (!layer || layer.getAttribute("data-ngc-settings-bound") === "1") return;
    layer.setAttribute("data-ngc-settings-bound", "1");

    var backBtn = document.getElementById("ngcControllerSettingsBackBtn");
    if (backBtn) {
      backBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeNgcControllerSettingsSheet();
      });
    }

    if (typeof window.bindControllerSettingsControls === "function") {
      window.bindControllerSettingsControls();
    }

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!layer || !layer.classList.contains("is-open")) return;
      e.preventDefault();
      closeNgcControllerSettingsSheet();
    });
  }

  function openNgcControllerSettingsSheet() {
    if (!layer || !isCurrentExperience() || !isNgcConnectedVisible() || openAnimating) return;
    if (layer.classList.contains("is-open")) return;

    hydrateNgcControllerSettingsAssets();
    if (typeof window.syncControllerSettingsUi === "function") {
      window.syncControllerSettingsUi();
    }

    layer.removeAttribute("hidden");
    layer.setAttribute("aria-hidden", "false");
    openAnimating = true;
    void layer.offsetWidth;
    layer.classList.add("is-open");

    window.setTimeout(function () {
      openAnimating = false;
    }, 400);
  }

  function closeNgcControllerSettingsSheet() {
    if (!layer || !layer.classList.contains("is-open") || openAnimating) return;

    openAnimating = true;
    layer.classList.remove("is-open");
    layer.setAttribute("aria-hidden", "true");

    window.setTimeout(function () {
      if (!layer.classList.contains("is-open")) {
        layer.setAttribute("hidden", "");
      }
      openAnimating = false;
    }, 400);
  }

  function initNgcControllerSettings() {
    layer = document.getElementById("ngcControllerSettingsLayer");
    if (!layer) return;
    bindNgcControllerSettingsUi();
    hydrateNgcControllerSettingsAssets();
    if (typeof window.syncControllerSettingsUi === "function") {
      window.syncControllerSettingsUi();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNgcControllerSettings);
  } else {
    initNgcControllerSettings();
  }

  window.openNgcControllerSettingsSheet = openNgcControllerSettingsSheet;
  window.closeNgcControllerSettingsSheet = closeNgcControllerSettingsSheet;
})();
