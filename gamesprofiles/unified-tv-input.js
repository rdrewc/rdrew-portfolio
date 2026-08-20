/**
 * Unified input intents for TV prototype — keyboard (arrows for move), painted controller,
 * and physical gamepad map to these intents; dashboard chrome routes them through
 * `routeTvDashboardInputIntent` in tv-dashboard.js so all devices stay in sync.
 */
(function () {
  "use strict";

  var Intent = Object.freeze({
    MOVE_UP: "MOVE_UP",
    MOVE_DOWN: "MOVE_DOWN",
    MOVE_LEFT: "MOVE_LEFT",
    MOVE_RIGHT: "MOVE_RIGHT",
    CONFIRM: "CONFIRM",
    CANCEL: "CANCEL"
  });

  /**
   * Maps a keyboard event to a single intent. Directional movement: Arrow keys only (no WASD).
   * Enter, Space, NumpadEnter, KeyA → CONFIRM. Escape, KeyB → CANCEL.
   */
  function mapKeyboardEventToIntent(e) {
    if (!e) return null;
    if (e.repeat) return null;
    if (e.metaKey || e.ctrlKey) return null;
    var k = e.key;
    var c = e.code;
    if (c === "Escape" || c === "KeyB") return Intent.CANCEL;
    if (c === "KeyA") return Intent.CONFIRM;
    if (k === "Enter" || k === "NumpadEnter" || c === "Enter" || c === "NumpadEnter") {
      if (e.isComposing) return null;
      return Intent.CONFIRM;
    }
    if (k === " ") return Intent.CONFIRM;
    if (k === "ArrowUp") return Intent.MOVE_UP;
    if (k === "ArrowDown") return Intent.MOVE_DOWN;
    if (k === "ArrowLeft") return Intent.MOVE_LEFT;
    if (k === "ArrowRight") return Intent.MOVE_RIGHT;
    return null;
  }

  function visibleNgcLayer() {
    var ngcRoot = document.getElementById("fcNgcRoot");
    if (!ngcRoot) return null;
    return ngcRoot.querySelector(".fc-ngc-layer:not(.is-hidden)");
  }

  /** Suppress callout glow when the painted controller is activated via pointer (mouse/touch). */
  var ngcPointerPulseDepth = 0;

  function bindNgcPointerPulseGuard() {
    var ngcRoot = document.getElementById("fcNgcRoot");
    if (!ngcRoot || ngcRoot.getAttribute("data-pointer-pulse-guard") === "1") return;
    ngcRoot.setAttribute("data-pointer-pulse-guard", "1");
    ngcRoot.addEventListener(
      "pointerdown",
      function () {
        ngcPointerPulseDepth++;
      },
      true
    );
    function releasePointer() {
      ngcPointerPulseDepth = Math.max(0, ngcPointerPulseDepth - 1);
    }
    ngcRoot.addEventListener("pointerup", releasePointer, true);
    ngcRoot.addEventListener("pointercancel", releasePointer, true);
  }

  function pointerBlocksNgcPulse() {
    return ngcPointerPulseDepth > 0;
  }

  function pulseEl(el) {
    if (!el || pointerBlocksNgcPulse()) return;
    if (el._fcNgcCalloutTimer) {
      window.clearTimeout(el._fcNgcCalloutTimer);
      el._fcNgcCalloutTimer = null;
    }
    el.classList.remove("fc-ngc-key-callout");
    void el.offsetWidth;
    el.classList.add("fc-ngc-key-callout");
    el._fcNgcCalloutTimer = window.setTimeout(function () {
      el.classList.remove("fc-ngc-key-callout");
      el._fcNgcCalloutTimer = null;
    }, 420);
  }

  /**
   * Highlights the on-screen controller region that matches the intent (keyboard/gamepad parity).
   */
  function pulseNgcForIntent(intent) {
    var layer = visibleNgcLayer();
    if (!layer) return;
    var map = {
      MOVE_UP: ".ngc-d-pad__arrow--u",
      MOVE_DOWN: ".ngc-d-pad__arrow--d",
      MOVE_LEFT: ".ngc-d-pad__arrow--l",
      MOVE_RIGHT: ".ngc-d-pad__arrow--r",
      CONFIRM: ".ngc-b-a",
      CANCEL: ".ngc-b-b"
    };
    var sel = map[intent];
    if (!sel) return;
    pulseEl(layer.querySelector(sel));
  }

  bindNgcPointerPulseGuard();

  window.InputIntent = Intent;
  window.mapKeyboardEventToIntent = mapKeyboardEventToIntent;
  window.pulseNgcForIntent = pulseNgcForIntent;
  window.pulseNgcElement = pulseEl;
})();
