/**
 * Multi-local controller dock — layout + tap-to-swap active local player.
 */
(function () {
  "use strict";

  var DEFAULT_AVATAR = "assets/profile-avatars/type-01-luffy.png";
  var activeLocalPlayerIndex = 0;
  var thumbsBound = false;
  var thumbResyncBound = false;

  function getApp() {
    return document.getElementById("app");
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

  function localPlayerLabel(index) {
    return index === 0 ? "You" : "Local player " + (index + 1);
  }

  function readLocalPlayerIdentities(localCount) {
    var identities = [];

    for (var i = 0; i < localCount; i++) {
      var state =
        typeof window.getLocalPlayerState === "function" &&
        typeof window.getLocalPlayerKeyForIndex === "function"
          ? window.getLocalPlayerState(window.getLocalPlayerKeyForIndex(i))
          : null;
      identities.push({
        index: i,
        avatar: (state && state.avatar) || DEFAULT_AVATAR,
        label: localPlayerLabel(i),
      });
    }

    return identities;
  }

  function clampActiveIndex(localCount) {
    if (activeLocalPlayerIndex < 0) activeLocalPlayerIndex = 0;
    if (activeLocalPlayerIndex >= localCount) activeLocalPlayerIndex = 0;
  }

  function getNgcLayerForThumb() {
    var root = document.getElementById("fcNgcRoot");
    if (!root) return null;
    var layer = root.querySelector(".fc-ngc-layer:not(.is-hidden)");
    if (layer) return layer;
    return root.querySelector('.fc-ngc-layer[data-skin="platform"]');
  }

  function sanitizeThumbLayer(layer) {
    if (!layer) return;
    layer.classList.remove("is-hidden");
    layer.removeAttribute("id");
    layer.setAttribute("aria-hidden", "true");
    layer.querySelectorAll("button").forEach(function (el) {
      el.remove();
    });
    layer.querySelectorAll("[id]").forEach(function (el) {
      el.removeAttribute("id");
    });
  }

  function applyThumbPlayerAvatars(layer, avatar) {
    if (!layer || !avatar) return;
    if (typeof window.applyNgcControlAvatars === "function") {
      window.applyNgcControlAvatars(layer, avatar);
      return;
    }
    layer.querySelectorAll('[data-ngc-slot="home"] [data-ngc-profile-img]').forEach(function (img) {
      img.setAttribute("src", avatar);
      img.alt = "";
    });
    layer.querySelectorAll('[data-ngc-slot="left"] [data-fg="avatar"]').forEach(function (img) {
      img.setAttribute("src", avatar);
      img.alt = "";
    });
  }

  function buildThumbFace(avatar) {
    var face = document.createElement("div");
    face.className = "controller-dock__thumb-face";

    var scaler = document.createElement("div");
    scaler.className = "controller-dock__thumb-scaler";

    var device = document.createElement("div");
    device.className = "controller-dock__thumb-device fc-device fc-device--ngc";

    var toastSlot = document.createElement("div");
    toastSlot.className = "controller-dock__thumb-toast-slot";
    toastSlot.setAttribute("aria-hidden", "true");

    var sourceLayer = getNgcLayerForThumb();
    if (sourceLayer) {
      var layer = sourceLayer.cloneNode(true);
      sanitizeThumbLayer(layer);
      applyThumbPlayerAvatars(layer, avatar);
      device.appendChild(layer);
    }

    device.appendChild(toastSlot);

    scaler.appendChild(device);
    face.appendChild(scaler);
    return face;
  }

  function renderThumbs(identities) {
    var wrap = document.getElementById("controllerDockThumbs");
    if (!wrap) return;

    wrap.replaceChildren();

    for (var i = 0; i < identities.length; i++) {
      var identity = identities[i];
      var selected = identity.index === activeLocalPlayerIndex;
      var playerKey =
        typeof window.getLocalPlayerKeyForIndex === "function"
          ? window.getLocalPlayerKeyForIndex(identity.index)
          : "";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "controller-dock__thumb" + (selected ? " is-selected" : "");
      btn.setAttribute("data-local-player-index", String(identity.index));
      if (playerKey) btn.setAttribute("data-local-player-key", playerKey);
      btn.setAttribute("aria-label", selected ? identity.label + ", selected" : "Switch to " + identity.label);
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
      if (selected) {
        btn.setAttribute("aria-current", "true");
      }

      var bezel = document.createElement("span");
      bezel.className = "controller-dock__thumb-bezel";
      bezel.setAttribute("aria-hidden", "true");
      bezel.appendChild(buildThumbFace(identity.avatar));

      var label = document.createElement("span");
      label.className = "controller-dock__thumb-label";
      label.textContent = identity.label;

      btn.appendChild(bezel);
      btn.appendChild(label);
      wrap.appendChild(btn);
    }

    wrap.setAttribute("aria-hidden", wrap.childElementCount ? "false" : "true");

    if (typeof window.restoreControllerDockThumbToasts === "function") {
      window.restoreControllerDockThumbToasts();
    }
  }

  function readThumbAvatarFromButton(btn) {
    if (!btn) return "";
    var img =
      btn.querySelector('[data-ngc-slot="home"] [data-ngc-profile-img]') ||
      btn.querySelector('[data-ngc-slot="left"] [data-fg="avatar"]');
    return img ? img.getAttribute("src") || "" : "";
  }

  function updateThumbSelectionOnly(identities) {
    var wrap = document.getElementById("controllerDockThumbs");
    if (!wrap) return false;
    var btns = wrap.querySelectorAll(".controller-dock__thumb");
    if (btns.length !== identities.length) return false;

    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var idx = parseInt(btn.getAttribute("data-local-player-index"), 10);
      if (!(idx >= 0 && idx < identities.length)) return false;
      var identity = identities[idx];
      if (readThumbAvatarFromButton(btn) !== identity.avatar) return false;
      var selected = idx === activeLocalPlayerIndex;
      btn.classList.toggle("is-selected", selected);
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        selected ? identity.label + ", selected" : "Switch to " + identity.label
      );
      if (selected) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    }
    return true;
  }

  function bindThumbClicks() {
    if (thumbsBound) return;
    var wrap = document.getElementById("controllerDockThumbs");
    if (!wrap) return;
    thumbsBound = true;
    wrap.addEventListener("click", function (e) {
      if (!e.target || !e.target.closest) return;
      var btn = e.target.closest(".controller-dock__thumb");
      if (!btn) return;
      var idx = parseInt(btn.getAttribute("data-local-player-index"), 10);
      if (!(idx >= 0)) return;
      setActiveLocalPlayerIndex(idx);
    });
  }

  function bindThumbResync() {
    if (thumbResyncBound) return;
    thumbResyncBound = true;

    var selSkin = document.getElementById("selNgcSkin");
    if (selSkin) {
      selSkin.addEventListener("change", function () {
        window.requestAnimationFrame(function () {
          syncControllerDock({ forceRerender: true });
        });
      });
    }

    var selPhone = document.getElementById("selCtrlFigma");
    if (selPhone) {
      selPhone.addEventListener("change", function () {
        window.requestAnimationFrame(function () {
          syncControllerDock({ forceRerender: true });
        });
      });
    }
  }

  function setActiveLocalPlayerIndex(index) {
    var localCount = getLocalCount();
    if (!(index >= 0 && index < localCount)) return;
    if (index === activeLocalPlayerIndex) return;

    var prevKey =
      typeof window.getLocalPlayerKeyForIndex === "function"
        ? window.getLocalPlayerKeyForIndex(activeLocalPlayerIndex)
        : "local";

    if (typeof window.captureActiveLocalPlayerMobileUi === "function") {
      window.captureActiveLocalPlayerMobileUi(prevKey);
    }
    if (typeof window.beginLocalPlayerControllerSwap === "function") {
      window.beginLocalPlayerControllerSwap();
    }
    try {
      if (typeof window.resetActiveLocalPlayerMobileUi === "function") {
        window.resetActiveLocalPlayerMobileUi();
      }

      activeLocalPlayerIndex = index;

      var nextKey =
        typeof window.getLocalPlayerKeyForIndex === "function"
          ? window.getLocalPlayerKeyForIndex(activeLocalPlayerIndex)
          : "local";

      if (typeof window.applyActiveLocalPlayerToSurfaces === "function") {
        window.applyActiveLocalPlayerToSurfaces();
      }
      if (typeof window.restoreActiveLocalPlayerMobileUi === "function") {
        window.restoreActiveLocalPlayerMobileUi(nextKey);
      }
    } finally {
      if (typeof window.endLocalPlayerControllerSwap === "function") {
        window.endLocalPlayerControllerSwap();
      }
    }
    syncControllerDock();
  }

  function syncControllerDock(opts) {
    opts = opts || {};
    var app = getApp();
    if (!app) return;

    var localCount = getLocalCount();
    clampActiveIndex(localCount);

    var multi = localCount > 1;
    app.setAttribute("data-controller-dock-mode", multi ? "multi" : "single");
    app.setAttribute("data-active-local-player-index", String(activeLocalPlayerIndex));

    var phoneOuter = document.getElementById("phoneOuter");
    if (phoneOuter) {
      phoneOuter.style.removeProperty("transform");
      phoneOuter.style.removeProperty("transform-origin");
      phoneOuter.style.removeProperty("zoom");
    }

    if (!multi) {
      var labelEl = document.getElementById("controllerDockActivePlayer");
      if (labelEl) {
        labelEl.textContent = "";
        labelEl.hidden = true;
      }
      var thumbs = document.getElementById("controllerDockThumbs");
      if (thumbs) {
        thumbs.replaceChildren();
        thumbs.setAttribute("aria-hidden", "true");
      }
      if (typeof window.dismissAllControllerDockThumbToasts === "function") {
        window.dismissAllControllerDockThumbToasts();
      }
      if (typeof window.updatePrototypeLayoutScale === "function") {
        window.requestAnimationFrame(window.updatePrototypeLayoutScale);
      } else if (typeof window.syncMultiControllerDockSpacing === "function") {
        window.requestAnimationFrame(function () {
          window.syncMultiControllerDockSpacing(phoneOuter);
        });
      }
      return;
    }

    var identities = readLocalPlayerIdentities(localCount);
    if (!opts.forceRerender && updateThumbSelectionOnly(identities)) {
      return;
    }
    renderThumbs(identities);
    bindThumbClicks();

    if (typeof window.updatePrototypeLayoutScale === "function") {
      window.requestAnimationFrame(window.updatePrototypeLayoutScale);
    } else if (typeof window.syncMultiControllerDockSpacing === "function") {
      window.requestAnimationFrame(function () {
        window.syncMultiControllerDockSpacing(document.getElementById("phoneOuter"));
      });
    }
  }

  function initControllerDock() {
    bindThumbClicks();
    bindThumbResync();
    syncControllerDock();

    document.querySelectorAll(".control-count-toggle").forEach(function (root) {
      root.addEventListener("click", function () {
        window.requestAnimationFrame(syncControllerDock);
      });
    });

    var viewToggle = document.querySelector(".view-mode-toggle");
    if (viewToggle) {
      viewToggle.addEventListener("click", function () {
        window.requestAnimationFrame(syncControllerDock);
      });
    }

    var orientToggle = document.querySelector(".orientation-toggle");
    if (orientToggle) {
      orientToggle.addEventListener("click", function () {
        window.requestAnimationFrame(syncControllerDock);
      });
    }
  }

  window.syncControllerDock = syncControllerDock;
  window.setActiveLocalPlayerIndex = setActiveLocalPlayerIndex;
  window.getActiveLocalPlayerIndex = function () {
    return activeLocalPlayerIndex;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initControllerDock);
  } else {
    initControllerDock();
  }
})();
