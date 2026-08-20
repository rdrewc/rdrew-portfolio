/**
 * TV in-game pause menu — overlay on gameplay (NGC hamburger, Current + Evolution).
 */
(function () {
  "use strict";

  var PAUSE_MENU_ITEM_COUNT = 4;
  var layer = null;
  var listEl = null;
  var resumeBtn = null;
  var focusIdx = 0;
  var gpPrev = { up: false, down: false };

  function getApp() {
    return document.getElementById("app");
  }

  function isBlockingDashboardOpen() {
    var app = getApp();
    if (!app) return true;
    if (app.getAttribute("data-tv-dashboard") === "open") return true;
    if (app.getAttribute("data-mobile-dashboard") === "open") return true;
    if (typeof window.isMobileDashboardOpen === "function" && window.isMobileDashboardOpen()) {
      return true;
    }
    return false;
  }

  function isTvGamePauseMenuOpen() {
    var app = getApp();
    return !!(app && app.getAttribute("data-tv-game-menu") === "open");
  }

  function canOpenTvGamePauseMenu() {
    var app = getApp();
    if (!app) return false;
    if (app.getAttribute("data-state") !== "in-game") return false;
    if (isBlockingDashboardOpen()) return false;
    return true;
  }

  function getFocusables() {
    if (!listEl) return [];
    return Array.prototype.slice.call(listEl.querySelectorAll(".tv-game-pause-menu__item"));
  }

  function syncPauseMenuFocus() {
    if (!isTvGamePauseMenuOpen()) return;
    var focusables = getFocusables();
    if (!focusables.length) return;
    if (focusIdx >= focusables.length) focusIdx = focusables.length - 1;
    if (focusIdx < 0) focusIdx = 0;
    for (var i = 0; i < focusables.length; i++) {
      var el = focusables[i];
      el.tabIndex = i === focusIdx ? 0 : -1;
      el.classList.toggle("tv-game-pause-menu__item--tv-focused", i === focusIdx);
    }
    try {
      focusables[focusIdx].focus({ preventScroll: true });
    } catch (e1) {
      try {
        focusables[focusIdx].focus();
      } catch (e2) {}
    }
  }

  function teardownPauseMenuFocus() {
    focusIdx = 0;
    gpPrev.up = gpPrev.down = false;
    var focusables = getFocusables();
    for (var i = 0; i < focusables.length; i++) {
      focusables[i].tabIndex = -1;
      focusables[i].classList.remove("tv-game-pause-menu__item--tv-focused");
    }
    if (
      document.activeElement &&
      document.activeElement.closest &&
      document.activeElement.closest("#tvGamePauseMenu")
    ) {
      try {
        document.activeElement.blur();
      } catch (e0) {}
    }
  }

  function movePauseMenuVertical(delta) {
    if (!isTvGamePauseMenuOpen()) return;
    var focusables = getFocusables();
    if (!focusables.length) return;
    var next = focusIdx + delta;
    if (next < 0 || next >= focusables.length) return;
    focusIdx = next;
    syncPauseMenuFocus();
  }

  function applyPauseMenuPrimaryAction() {
    if (!isTvGamePauseMenuOpen()) return;
    var focusables = getFocusables();
    var el = focusables[focusIdx];
    if (!el) return;
    if (el === resumeBtn) {
      closeTvGamePauseMenu();
      return;
    }
    var menuItems = listEl
      ? Array.prototype.slice.call(
          listEl.querySelectorAll(".tv-game-pause-menu__item:not(#tvGamePauseMenuResumeBtn)")
        )
      : [];
    var itemIndex = menuItems.indexOf(el) + 1;
    document.dispatchEvent(
      new CustomEvent("tvGamePauseMenu:select", {
        bubbles: true,
        detail: {
          index: itemIndex,
          label: "Menu item " + itemIndex,
        },
      })
    );
  }

  function readGamepadDpadY(gp) {
    var y = 0;
    if (!gp || !gp.buttons) return y;
    var b = gp.buttons;
    if (b[12] && b[12].pressed) y -= 1;
    if (b[13] && b[13].pressed) y += 1;
    if (y === 0) {
      if (b[16] && b[16].pressed) y -= 1;
      if (b[17] && b[17].pressed) y += 1;
    }
    if (y === 0 && gp.axes && gp.axes.length > 7) {
      if (gp.axes[7] < -0.5) y -= 1;
      if (gp.axes[7] > 0.5) y += 1;
    }
    if (y === 0 && gp.axes && gp.axes.length > 1) {
      if (gp.axes[1] < -0.45) y -= 1;
      else if (gp.axes[1] > 0.45) y += 1;
    }
    return y;
  }

  function routePauseMenuIntent(intent) {
    var I = window.InputIntent;
    if (!I || !isTvGamePauseMenuOpen()) return false;
    if (intent === I.CANCEL) {
      closeTvGamePauseMenu();
      return true;
    }
    if (intent === I.CONFIRM) {
      applyPauseMenuPrimaryAction();
      return true;
    }
    if (intent === I.MOVE_UP) {
      movePauseMenuVertical(-1);
      return true;
    }
    if (intent === I.MOVE_DOWN) {
      movePauseMenuVertical(1);
      return true;
    }
    return false;
  }

  function tickPauseMenuGamepad() {
    if (!isTvGamePauseMenuOpen()) {
      gpPrev.up = gpPrev.down = false;
      return;
    }
    var gps = navigator.getGamepads && navigator.getGamepads();
    var yAxis = 0;
    if (gps) {
      for (var g = 0; g < gps.length; g++) {
        var gp = gps[g];
        if (!gp) continue;
        var y = readGamepadDpadY(gp);
        if (y < 0) yAxis = -1;
        else if (y > 0 && yAxis === 0) yAxis = 1;
      }
    }
    var up = yAxis < 0;
    var down = yAxis > 0;
    var I = window.InputIntent;
    if (up && !gpPrev.up && I) {
      if (window.pulseNgcForIntent) window.pulseNgcForIntent(I.MOVE_UP);
      routePauseMenuIntent(I.MOVE_UP);
    }
    if (down && !gpPrev.down && I) {
      if (window.pulseNgcForIntent) window.pulseNgcForIntent(I.MOVE_DOWN);
      routePauseMenuIntent(I.MOVE_DOWN);
    }
    gpPrev.up = up;
    gpPrev.down = down;
  }

  function resetPauseMenuGamepadPrev() {
    gpPrev.up = gpPrev.down = false;
  }

  function buildPauseMenuList() {
    if (!listEl || listEl.getAttribute("data-tv-pause-built") === "1") return;
    listEl.setAttribute("data-tv-pause-built", "1");
    for (var i = 1; i <= PAUSE_MENU_ITEM_COUNT; i++) {
      var li = document.createElement("li");
      li.setAttribute("role", "none");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tv-game-pause-menu__item";
      btn.setAttribute("role", "menuitem");
      btn.setAttribute("aria-label", "Menu item " + i);
      btn.appendChild(document.createTextNode("Menu item " + i + " "));
      var num = document.createElement("span");
      num.className = "tv-game-pause-menu__num";
      num.textContent = String(i);
      btn.appendChild(num);
      li.appendChild(btn);
      listEl.appendChild(li);
    }
  }

  function syncPauseMenuVisibility() {
    if (!layer) return;
    var open = isTvGamePauseMenuOpen();
    layer.hidden = !open;
    layer.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function openTvGamePauseMenu() {
    if (!layer || !canOpenTvGamePauseMenu() || isTvGamePauseMenuOpen()) return;
    var app = getApp();
    app.setAttribute("data-tv-game-menu", "open");
    focusIdx = 0;
    syncPauseMenuVisibility();
    window.requestAnimationFrame(function () {
      syncPauseMenuFocus();
    });
    if (typeof window.showEvolutionContinueOnTvToast === "function") {
      window.showEvolutionContinueOnTvToast("Continue on your TV");
    }
  }

  function closeTvGamePauseMenu() {
    var app = getApp();
    if (!app || !isTvGamePauseMenuOpen()) return;
    app.removeAttribute("data-tv-game-menu");
    teardownPauseMenuFocus();
    syncPauseMenuVisibility();
  }

  function toggleTvGamePauseMenu() {
    if (isTvGamePauseMenuOpen()) {
      closeTvGamePauseMenu();
      return;
    }
    openTvGamePauseMenu();
  }

  function bindTvGamePauseMenuUi() {
    if (!layer || layer.getAttribute("data-tv-pause-bound") === "1") return;
    layer.setAttribute("data-tv-pause-bound", "1");

    var backdrop = layer.querySelector(".tv-game-pause-menu__backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", function (e) {
        e.preventDefault();
        closeTvGamePauseMenu();
      });
    }

    if (resumeBtn) {
      resumeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        closeTvGamePauseMenu();
      });
    }

    layer.addEventListener(
      "pointerover",
      function (e) {
        if (!isTvGamePauseMenuOpen()) return;
        var item =
          e.target && e.target.closest && e.target.closest(".tv-game-pause-menu__item");
        if (!item) return;
        var focusables = getFocusables();
        var ix = focusables.indexOf(item);
        if (ix < 0) return;
        focusIdx = ix;
        syncPauseMenuFocus();
      },
      true
    );

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!isTvGamePauseMenuOpen()) return;
      e.preventDefault();
      closeTvGamePauseMenu();
    });
  }

  function initTvGamePauseMenu() {
    layer = document.getElementById("tvGamePauseMenu");
    listEl = document.getElementById("tvGamePauseMenuList");
    resumeBtn = document.getElementById("tvGamePauseMenuResumeBtn");
    if (!layer) return;
    buildPauseMenuList();
    bindTvGamePauseMenuUi();
    syncPauseMenuVisibility();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTvGamePauseMenu);
  } else {
    initTvGamePauseMenu();
  }

  window.isTvGamePauseMenuOpen = isTvGamePauseMenuOpen;
  window.openTvGamePauseMenu = openTvGamePauseMenu;
  window.closeTvGamePauseMenu = closeTvGamePauseMenu;
  window.toggleTvGamePauseMenu = toggleTvGamePauseMenu;
  window.routePauseMenuIntent = routePauseMenuIntent;
  window.tickPauseMenuGamepad = tickPauseMenuGamepad;
  window.resetPauseMenuGamepadPrev = resetPauseMenuGamepadPrev;
})();
