/**
 * Voice Chat prototype — join / participants sheet / leave (Figma 6444:50913).
 * Non-functional audio; visual states only. Evolution Phase 1.0+, online players ≥ 1.
 */
(function () {
  "use strict";

  var voiceChatState = "off";
  var voiceChatSheetOpen = false;
  var voiceChatSheetPending = false;
  var voiceNavHideTimer = null;
  var voiceNavMicTimer = null;
  var VOICE_NAV_LAYOUT_MS = 380;
  var VOICE_NAV_MIC_MS = 220;

  function prefersReducedVoiceNavMotion() {
    return !!(
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function voiceNavLayoutDuration() {
    return prefersReducedVoiceNavMotion() ? 0 : VOICE_NAV_LAYOUT_MS;
  }

  function voiceNavMicDuration() {
    return prefersReducedVoiceNavMotion() ? 0 : VOICE_NAV_MIC_MS;
  }

  function getApp() {
    return document.getElementById("app");
  }

  function isEvolutionMode() {
    var app = getApp();
    return !!(app && app.getAttribute("data-platform-experience") === "evolution");
  }

  function isPlatformPhase05() {
    return typeof window.isPlatformPhase05 === "function" && window.isPlatformPhase05();
  }

  function getOnlinePlayerCount() {
    if (typeof window.getTvPlayersJoinedCounts !== "function") return 0;
    var counts = window.getTvPlayersJoinedCounts();
    var online = counts && counts.online;
    if (!(online >= 0 && online <= 4)) return 0;
    return online;
  }

  function isVoiceChatEligible() {
    if (!isEvolutionMode() || isPlatformPhase05()) return false;
    return getOnlinePlayerCount() >= 1;
  }

  function isMobileDashboardOpen() {
    return typeof window.isMobileDashboardOpen === "function" && window.isMobileDashboardOpen();
  }

  function isMobileDashboardObscuring() {
    var el = document.getElementById("fcMobileDashboard");
    return !!(el && !el.classList.contains("is-hidden"));
  }

  function dashboardPlayerRoster() {
    if (typeof window.playerListRosterForDashboard === "function") {
      return window.playerListRosterForDashboard();
    }
    return [];
  }

  function resolveVoiceEntryDisplay(entry) {
    if (typeof window.resolveMobileDashboardPlayerListEntryDisplay === "function") {
      return window.resolveMobileDashboardPlayerListEntryDisplay(entry);
    }
    return {
      title: (entry && (entry.displayTitle || entry.handle)) || "Player",
      avatar: (entry && entry.avatar) || "",
    };
  }

  function isSelfPlayerEntry(entry) {
    if (!entry) return false;
    if (entry.isSelf) return true;
    var selfKey =
      typeof window.getActiveLocalPlayerKey === "function" ? window.getActiveLocalPlayerKey() : "local";
    return entry.key === selfKey;
  }

  function toVoiceParticipant(entry) {
    var display = resolveVoiceEntryDisplay(entry);
    return {
      key: entry.key,
      handle: display.title,
      avatar: display.avatar,
      isSelf: isSelfPlayerEntry(entry),
    };
  }

  function voiceParticipants() {
    var roster = dashboardPlayerRoster();
    var selfEntry = null;
    var others = [];

    for (var i = 0; i < roster.length; i++) {
      if (!selfEntry && isSelfPlayerEntry(roster[i])) {
        selfEntry = roster[i];
      } else {
        others.push(roster[i]);
      }
    }

    if (!selfEntry && roster.length) {
      selfEntry = roster[0];
      others = roster.slice(1);
    }

    if (!selfEntry) {
      return { self: toVoiceParticipant({ key: "local", handle: "YourHandle", isSelf: true }), others: [] };
    }

    return {
      self: toVoiceParticipant(selfEntry),
      others: others.map(toVoiceParticipant),
    };
  }

  function localPlayerIdentity() {
    return voiceParticipants().self;
  }

  function applyVoiceChatAssets(root) {
    var map = window.FIGMA_MOBILE_VOICE_CHAT_ASSETS;
    if (!map || !root) return;
    root.querySelectorAll("[data-vc]").forEach(function (el) {
      var key = el.getAttribute("data-vc");
      if (key && map[key]) el.setAttribute("src", map[key]);
    });
  }

  function setVoiceChatState(next) {
    if (next !== "off" && next !== "joined" && next !== "muted") next = "off";
    if (next !== "off" && !isVoiceChatEligible()) {
      next = "off";
      voiceChatSheetOpen = false;
    }
    voiceChatState = next;
    var app = getApp();
    if (app) {
      if (voiceChatState === "off") {
        app.removeAttribute("data-voice-chat");
      } else {
        app.setAttribute("data-voice-chat", voiceChatState);
      }
      app.setAttribute("data-voice-chat-eligible", isVoiceChatEligible() ? "true" : "false");
    }
    var sel = document.getElementById("selVoiceChatState");
    if (sel && sel.value !== voiceChatState) sel.value = voiceChatState;
    syncVoiceChatCard();
    syncVoiceChatNav();
    syncVoiceChatSheet();
    renderVoiceChatParticipants();
  }

  function syncVoiceChatCard() {
    var card = document.getElementById("fcMobileDashVoiceChatCard");
    if (!card) return;
    var eligible = isVoiceChatEligible();
    card.hidden = !eligible;
    card.setAttribute("data-voice-chat-card", voiceChatState === "off" ? "idle" : "joined");
    var btn = document.getElementById("fcMobileDashVoiceChatBtn");
    if (btn) {
      btn.setAttribute(
        "aria-label",
        voiceChatState === "off" ? "Join voice chat" : "Open voice chat participants"
      );
    }
  }

  function shouldShowVoiceNavPill() {
    if (voiceChatState === "off") return false;
    return !isMobileDashboardObscuring();
  }

  function getActiveNgcControls() {
    var root = document.getElementById("fcNgcRoot");
    if (!root) return null;
    var layer = root.querySelector(".fc-ngc-layer:not(.is-hidden)");
    if (!layer) layer = root.querySelector('.fc-ngc-layer[data-skin="platform"]');
    return layer ? layer.querySelector(".ngc-controls") : null;
  }

  function resetInactiveNgcVoiceChatControlRows(activeControls) {
    document.querySelectorAll(".ngc-controls").forEach(function (controls) {
      if (controls === activeControls) return;
      controls.classList.remove("ngc-controls--voice-chat");
      var home = controls.querySelector('[data-ngc-slot="home"]');
      if (home) {
        home.classList.remove("ngc-home--voice-chat", "ngc-home--voice-mic-visible");
      }
    });
  }

  function getActiveHomeSlot() {
    var controls = getActiveNgcControls();
    return controls ? controls.querySelector('[data-ngc-slot="home"]') : null;
  }

  function clearVoiceNavHideTimer() {
    if (voiceNavHideTimer) {
      window.clearTimeout(voiceNavHideTimer);
      voiceNavHideTimer = null;
    }
  }

  function clearVoiceNavMicTimer() {
    if (voiceNavMicTimer) {
      window.clearTimeout(voiceNavMicTimer);
      voiceNavMicTimer = null;
    }
  }

  function parkVoiceChatNav(nav, anchor) {
    if (!nav || !anchor) return;
    if (nav.parentElement !== anchor) {
      anchor.appendChild(nav);
    }
    nav.hidden = true;
    nav.setAttribute("aria-hidden", "true");
  }

  function showVoiceChatHomeMic(home) {
    if (!home) return;
    home.classList.add("ngc-home--voice-mic-visible");
  }

  function scheduleVoiceChatHomeMicReveal(home) {
    clearVoiceNavMicTimer();
    if (!home) return;
    home.classList.remove("ngc-home--voice-mic-visible");
    var delay = voiceNavLayoutDuration();
    if (delay <= 0) {
      showVoiceChatHomeMic(home);
      return;
    }
    voiceNavMicTimer = window.setTimeout(function () {
      voiceNavMicTimer = null;
      if (voiceChatState !== "off" && shouldShowVoiceNavPill()) {
        showVoiceChatHomeMic(home);
      }
    }, delay);
  }

  function collapseVoiceChatHome(home, controls, nav, anchor) {
    if (!home) return;
    home.classList.remove("ngc-home--voice-chat");
    if (controls) controls.classList.remove("ngc-controls--voice-chat");
    voiceNavHideTimer = window.setTimeout(function () {
      voiceNavHideTimer = null;
      if (voiceChatState === "off" || !shouldShowVoiceNavPill()) {
        parkVoiceChatNav(nav, anchor);
      }
    }, voiceNavLayoutDuration());
  }

  function syncVoiceChatNav() {
    var app = getApp();
    if (!app) return;
    var showPill = shouldShowVoiceNavPill() && isEvolutionMode();
    var voiceLayout = showPill && voiceChatState !== "off";
    app.setAttribute("data-voice-chat-nav", showPill ? "pill" : "standard");

    var nav = document.getElementById("fcNgcVoiceChatNav");
    var anchor = document.getElementById("fcNgcVoiceChatNavAnchor");
    var controls = getActiveNgcControls();
    var home = getActiveHomeSlot();

    resetInactiveNgcVoiceChatControlRows(controls);
    clearVoiceNavHideTimer();
    clearVoiceNavMicTimer();

    if (voiceLayout && nav && home && controls) {
      if (nav.parentElement !== home) {
        home.classList.remove("ngc-home--voice-mic-visible");
        home.appendChild(nav);
      }
      nav.hidden = false;
      nav.setAttribute("aria-hidden", "false");
      controls.classList.add("ngc-controls--voice-chat");
      home.classList.add("ngc-home--voice-chat");

      if (!home.classList.contains("ngc-home--voice-mic-visible")) {
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            if (voiceChatState === "off" || !shouldShowVoiceNavPill()) return;
            scheduleVoiceChatHomeMicReveal(home);
          });
        });
      }
    } else if (home && home.classList.contains("ngc-home--voice-chat")) {
      home.classList.remove("ngc-home--voice-mic-visible");
      voiceNavHideTimer = window.setTimeout(function () {
        voiceNavHideTimer = null;
        if (voiceChatState !== "off" && shouldShowVoiceNavPill()) return;
        collapseVoiceChatHome(home, controls, nav, anchor);
      }, voiceNavMicDuration());
    } else if (nav && anchor) {
      if (home) {
        home.classList.remove("ngc-home--voice-chat", "ngc-home--voice-mic-visible");
      }
      if (controls) controls.classList.remove("ngc-controls--voice-chat");
      parkVoiceChatNav(nav, anchor);
    }

    if (nav) {
      var muteBtn = nav.querySelector(".ngc-voice-chat-nav__mute");
      if (muteBtn) {
        muteBtn.setAttribute(
          "aria-label",
          voiceChatState === "muted" ? "Unmute microphone" : "Mute microphone"
        );
      }
      applyVoiceChatAssets(nav);
    }

    var sheetMute = document.getElementById("fcVoiceChatSheetMuteBtn");
    if (sheetMute) {
      sheetMute.setAttribute(
        "aria-label",
        voiceChatState === "muted" ? "Unmute microphone" : "Mute microphone"
      );
      applyVoiceChatAssets(sheetMute);
    }
  }

  function syncVoiceChatSheet() {
    var region = document.getElementById("fcVoiceChatRegion");
    var layer = document.getElementById("fcVoiceChatLayer");
    if (!layer) return;

    if (isMobileDashboardOpen()) {
      voiceChatSheetOpen = false;
      voiceChatSheetPending = false;
    }

    var wantsSheet = voiceChatSheetOpen || voiceChatSheetPending;
    var open = wantsSheet && voiceChatState !== "off" && !isMobileDashboardObscuring();

    if (open) {
      voiceChatSheetOpen = true;
      voiceChatSheetPending = false;
    }

    if (region) {
      region.classList.toggle("is-open", open);
      region.setAttribute("aria-hidden", open ? "false" : "true");
    }
    layer.setAttribute("aria-hidden", open ? "false" : "true");
    syncVoiceChatNav();
  }

  function requestVoiceChatSheet() {
    if (voiceChatState === "off") return;
    if (isMobileDashboardObscuring()) {
      voiceChatSheetPending = true;
      if (isMobileDashboardOpen() && typeof window.setMobileDashboardOpen === "function") {
        window.setMobileDashboardOpen(false);
      }
    } else {
      voiceChatSheetOpen = true;
      voiceChatSheetPending = false;
    }
    syncVoiceChatSheet();
  }

  function openVoiceChatSheet() {
    requestVoiceChatSheet();
  }

  function closeVoiceChatSheet() {
    voiceChatSheetOpen = false;
    voiceChatSheetPending = false;
    syncVoiceChatSheet();
  }

  function joinVoiceChat() {
    if (!isVoiceChatEligible()) return;
    setVoiceChatState("joined");
    requestVoiceChatSheet();
  }

  function leaveVoiceChat() {
    voiceChatSheetOpen = false;
    voiceChatSheetPending = false;
    setVoiceChatState("off");
  }

  function toggleVoiceChatMute() {
    if (voiceChatState === "off") return;
    setVoiceChatState(voiceChatState === "muted" ? "joined" : "muted");
  }

  function openVoiceChatMicSettings() {
    closeVoiceChatSheet();
    if (typeof window.openMobileDashboardControllerSettings === "function") {
      window.openMobileDashboardControllerSettings({ scrollToBottom: true, openDashboard: true });
    }
  }

  function renderVoiceChatParticipants() {
    var selfName = document.getElementById("fcVoiceChatSelfName");
    var selfAvatar = document.getElementById("fcVoiceChatSelfAvatar");
    var list = document.getElementById("fcVoiceChatParticipantsList");
    if (!list) return;

    var participants = voiceParticipants();
    var self = participants.self;
    if (selfName) selfName.textContent = self.handle;
    if (selfAvatar && self.avatar) selfAvatar.src = self.avatar;

    list.replaceChildren();
    for (var i = 0; i < participants.others.length; i++) {
      list.appendChild(buildParticipantRow(participants.others[i]));
    }
  }

  function buildParticipantRow(entry) {
    var li = document.createElement("li");
    li.className = "fc-voice-chat-sheet__participant";

    var identity = document.createElement("div");
    identity.className = "fc-voice-chat-sheet__identity";

    var avatarWrap = document.createElement("div");
    avatarWrap.className = "fc-voice-chat-sheet__avatar";
    var ring = document.createElement("img");
    ring.className = "fc-voice-chat-sheet__avatar-ring";
    ring.alt = "";
    ring.setAttribute("data-vc", "voiceAvatarRing");
    ring.decoding = "async";
    var img = document.createElement("img");
    img.className = "fc-voice-chat-sheet__avatar-img";
    img.alt = "";
    img.decoding = "async";
    if (entry.avatar) img.src = entry.avatar;
    avatarWrap.appendChild(ring);
    avatarWrap.appendChild(img);

    var name = document.createElement("p");
    name.className = "fc-voice-chat-sheet__name";
    name.textContent = entry.handle;

    identity.appendChild(avatarWrap);
    identity.appendChild(name);

    var actions = document.createElement("div");
    actions.className = "fc-voice-chat-sheet__participant-actions";

    var volumeBtn = document.createElement("button");
    volumeBtn.type = "button";
    volumeBtn.className =
      "fc-voice-chat-sheet__icon-btn fc-voice-chat-sheet__icon-btn--volume";
    volumeBtn.setAttribute("aria-label", "Adjust " + entry.handle + " volume");
    var volumeImg = document.createElement("img");
    volumeImg.alt = "";
    volumeImg.setAttribute("data-vc", "volumeBtn");
    volumeBtn.appendChild(volumeImg);

    var moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "fc-voice-chat-sheet__icon-btn";
    moreBtn.setAttribute("aria-label", "More options for " + entry.handle);
    var moreImg = document.createElement("img");
    moreImg.alt = "";
    moreImg.setAttribute("data-vc", "moreVerticalMedium");
    moreBtn.appendChild(moreImg);

    actions.appendChild(volumeBtn);
    actions.appendChild(moreBtn);
    li.appendChild(identity);
    li.appendChild(actions);
    applyVoiceChatAssets(li);
    return li;
  }

  function handleVoiceChatCardClick() {
    if (!isVoiceChatEligible()) return;
    if (voiceChatState === "off") {
      joinVoiceChat();
      return;
    }
    requestVoiceChatSheet();
  }

  function bindVoiceChatUi() {
    var cardBtn = document.getElementById("fcMobileDashVoiceChatBtn");
    if (cardBtn && cardBtn.getAttribute("data-voice-chat-bound") !== "1") {
      cardBtn.setAttribute("data-voice-chat-bound", "1");
      cardBtn.addEventListener("click", function (e) {
        e.preventDefault();
        handleVoiceChatCardClick();
      });
    }

    var nav = document.getElementById("fcNgcVoiceChatNav");
    if (nav && nav.getAttribute("data-voice-chat-bound") !== "1") {
      nav.setAttribute("data-voice-chat-bound", "1");
      nav.addEventListener("click", function (e) {
        if (e.target.closest(".ngc-voice-chat-nav__mute")) {
          e.preventDefault();
          e.stopPropagation();
          toggleVoiceChatMute();
        }
      });
    }

    var sheetMute = document.getElementById("fcVoiceChatSheetMuteBtn");
    if (sheetMute && sheetMute.getAttribute("data-voice-chat-bound") !== "1") {
      sheetMute.setAttribute("data-voice-chat-bound", "1");
      sheetMute.addEventListener("click", function (e) {
        e.preventDefault();
        toggleVoiceChatMute();
      });
    }

    var sheetLeave = document.getElementById("fcVoiceChatSheetLeaveBtn");
    if (sheetLeave && sheetLeave.getAttribute("data-voice-chat-bound") !== "1") {
      sheetLeave.setAttribute("data-voice-chat-bound", "1");
      sheetLeave.addEventListener("click", function (e) {
        e.preventDefault();
        leaveVoiceChat();
      });
    }

    var sheetClose = document.getElementById("fcVoiceChatSheetCloseBtn");
    if (sheetClose && sheetClose.getAttribute("data-voice-chat-bound") !== "1") {
      sheetClose.setAttribute("data-voice-chat-bound", "1");
      sheetClose.addEventListener("click", function (e) {
        e.preventDefault();
        closeVoiceChatSheet();
      });
    }

    var sheetSettings = document.getElementById("fcVoiceChatSheetSettingsBtn");
    if (sheetSettings && sheetSettings.getAttribute("data-voice-chat-bound") !== "1") {
      sheetSettings.setAttribute("data-voice-chat-bound", "1");
      sheetSettings.addEventListener("click", function (e) {
        e.preventDefault();
        openVoiceChatMicSettings();
      });
    }

    var scrim = document.getElementById("fcVoiceChatScrim");
    if (scrim && scrim.getAttribute("data-voice-chat-bound") !== "1") {
      scrim.setAttribute("data-voice-chat-bound", "1");
      scrim.addEventListener("click", function (e) {
        e.preventDefault();
        closeVoiceChatSheet();
      });
    }

    var sel = document.getElementById("selVoiceChatState");
    if (sel && sel.getAttribute("data-voice-chat-bound") !== "1") {
      sel.setAttribute("data-voice-chat-bound", "1");
      sel.addEventListener("change", function () {
        var val = sel.value;
        if (val === "off") {
          leaveVoiceChat();
        } else {
          if (!isVoiceChatEligible()) {
            sel.value = "off";
            return;
          }
          setVoiceChatState(val);
          if (val !== "off") requestVoiceChatSheet();
        }
      });
    }
  }

  function syncVoiceChatChrome() {
    if (!isVoiceChatEligible() && voiceChatState !== "off") {
      leaveVoiceChat();
    }
    var app = getApp();
    if (app) app.setAttribute("data-voice-chat-eligible", isVoiceChatEligible() ? "true" : "false");
    syncVoiceChatCard();
    syncVoiceChatNav();
    syncVoiceChatSheet();
    renderVoiceChatParticipants();
  }

  function initVoiceChat() {
    applyVoiceChatAssets(document);
    bindVoiceChatUi();
    syncVoiceChatChrome();
  }

  window.syncVoiceChatChrome = syncVoiceChatChrome;
  window.renderVoiceChatParticipants = renderVoiceChatParticipants;
  window.setVoiceChatPrototypeState = function (state) {
    if (state === "off") {
      leaveVoiceChat();
      return;
    }
    if (!isVoiceChatEligible()) return;
    setVoiceChatState(state === "muted" ? "muted" : "joined");
  };
  window.getVoiceChatPrototypeState = function () {
    return voiceChatState;
  };
  window.openVoiceChatParticipantsSheet = openVoiceChatSheet;
  window.closeVoiceChatParticipantsSheet = closeVoiceChatSheet;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVoiceChat);
  } else {
    initVoiceChat();
  }
})();
