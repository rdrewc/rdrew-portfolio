(function () {
  "use strict";

  function qs(root, sel) {
    return root ? root.querySelector(sel) : null;
  }

  function hydrateOverlay(root) {
    var cfg = window.FIGMA_DASHBOARD_OVERLAY;
    if (!cfg || !root) return;
    if (root.getAttribute("data-overlay-hydrated") === "1") return;
    var plate = qs(root, ".tv-dashboard__bottom-glow-plate-img");
    if (plate && cfg.bottomGlowPlate && cfg.bottomGlowPlate.path) {
      plate.src = cfg.bottomGlowPlate.path;
      plate.alt = "";
    }
    var img = qs(root, ".tv-dashboard__circle-clip img");
    if (img && cfg.colorGradientCircle && cfg.colorGradientCircle.path) {
      img.src = cfg.colorGradientCircle.path;
      img.alt = "";
    }
    function fillVideo(sel, spec) {
      if (!spec) return;
      var wrap = qs(root, sel);
      if (!wrap) return;
      var video = wrap.querySelector("video");
      if (!video) return;
      video.textContent = "";
      if (spec.webm) {
        var s1 = document.createElement("source");
        s1.src = spec.webm;
        s1.type = "video/webm";
        video.appendChild(s1);
      }
      if (spec.mp4) {
        var s2 = document.createElement("source");
        s2.src = spec.mp4;
        s2.type = "video/mp4";
        video.appendChild(s2);
      }
      video.load();
    }
    fillVideo(".tv-dashboard__cmp--glow-video", cfg.glowVideo);
    fillVideo(".tv-dashboard__cmp--particles-video", cfg.particlesVideo);
    root.setAttribute("data-overlay-hydrated", "1");
  }

  function forEachVideo(root, fn) {
    if (!root) return;
    var nodes = root.querySelectorAll(".tv-dashboard__video");
    for (var i = 0; i < nodes.length; i++) {
      fn(nodes[i]);
    }
  }

  function setOverlayPlayback(open) {
    var dash = document.getElementById("tvDashboard");
    if (!dash) return;
    forEachVideo(dash, function (v) {
      if (open) {
        var p = v.play();
        if (p && typeof p.catch === "function") {
          p.catch(function () {});
        }
      } else {
        v.pause();
        try {
          v.currentTime = 0;
        } catch (e) {}
      }
    });
  }

  window.DashboardOverlay = {
    hydrate: function () {
      var dash = document.getElementById("tvDashboard");
      if (!dash) return;
      hydrateOverlay(dash);
    },
    setPlayback: setOverlayPlayback
  };
})();
