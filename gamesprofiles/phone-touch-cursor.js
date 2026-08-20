/**
 * Touch-style cursor for the phone mockup — transparent circle with press / tap feedback.
 * Visual only: never captures the pointer so underlying phone UI keeps receiving clicks.
 */
(function () {
  "use strict";

  function bootPhoneTouchCursor() {
    var phoneOuter = document.getElementById("phoneOuter");
    var phoneFrame = document.getElementById("phoneFrame");
    if (!phoneOuter || !phoneFrame) return;

    /* Skip touch-primary devices; mouse + trackpad still get the overlay. */
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;

    var cursor = document.createElement("div");
    cursor.id = "phoneTouchCursor";
    cursor.className = "phone-touch-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML =
      '<span class="phone-touch-cursor__ring"></span>' +
      '<span class="phone-touch-cursor__ripple"></span>';
    phoneFrame.appendChild(cursor);

    var active = false;
    var pressed = false;
    var rippleTimer = 0;
    var activePointerId = null;

    function phoneVisible() {
      return getComputedStyle(phoneOuter).display !== "none";
    }

    function framePoint(e) {
      var rect = phoneFrame.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }

    function pointerInsideFrame(e) {
      var rect = phoneFrame.getBoundingClientRect();
      return (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
    }

    function setPosition(x, y) {
      cursor.style.left = x + "px";
      cursor.style.top = y + "px";
    }

    function setForce(e) {
      var force = typeof e.pressure === "number" && e.pressure > 0 ? e.pressure : pressed ? 1 : 0;
      cursor.style.setProperty("--touch-force", String(Math.min(1, Math.max(0, force))));
    }

    function show() {
      if (!phoneVisible()) return;
      active = true;
      cursor.classList.add("is-visible");
    }

    function hide() {
      active = false;
      pressed = false;
      activePointerId = null;
      cursor.classList.remove("is-visible", "is-pressed", "is-tap");
      cursor.style.removeProperty("--touch-force");
    }

    function playTapRipple() {
      cursor.classList.remove("is-tap");
      void cursor.offsetWidth;
      cursor.classList.add("is-tap");
      window.clearTimeout(rippleTimer);
      rippleTimer = window.setTimeout(function () {
        cursor.classList.remove("is-tap");
      }, 460);
    }

    function trackPointer(e) {
      if (e.pointerType === "touch") return;
      if (!phoneVisible()) {
        if (!pressed) hide();
        return;
      }
      if (pointerInsideFrame(e)) {
        show();
        var p = framePoint(e);
        setPosition(p.x, p.y);
        setForce(e);
      } else if (!pressed) {
        hide();
      }
    }

    document.addEventListener("pointermove", trackPointer, { passive: true });

    document.addEventListener(
      "pointerdown",
      function (e) {
        if (e.pointerType === "touch" || e.button !== 0) return;
        if (!phoneVisible() || !pointerInsideFrame(e)) return;
        activePointerId = e.pointerId;
        pressed = true;
        show();
        cursor.classList.add("is-pressed");
        var p = framePoint(e);
        setPosition(p.x, p.y);
        setForce(e);
      },
      { passive: true }
    );

    function releasePointer(e) {
      if (e.pointerType === "touch") return;
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      var wasPressed = pressed;
      pressed = false;
      activePointerId = null;
      cursor.classList.remove("is-pressed");
      setForce(e);
      if (wasPressed && pointerInsideFrame(e)) playTapRipple();
      if (!pointerInsideFrame(e)) hide();
    }

    document.addEventListener("pointerup", releasePointer, { passive: true });
    document.addEventListener("pointercancel", releasePointer, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPhoneTouchCursor);
  } else {
    bootPhoneTouchCursor();
  }
})();
