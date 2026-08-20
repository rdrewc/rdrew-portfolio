/**
 * Evolution mobile notification detail L3 — card surface Figma 168:5112 (Lightbox - Fill).
 */
(function () {
  "use strict";

  function detailAssets() {
    return window.FIGMA_MOBILE_DASHBOARD_NOTIFICATIONS_DETAIL_ASSETS || {};
  }

  function toastAssets() {
    return window.FIGMA_CONTROLLER_EVOLUTION_TOAST_ASSETS || {};
  }

  var l3Open = false;
  var l3Animating = false;
  var activeTvRow = null;
  var activeFriendHandleKey = null;
  var detailReturnL2 = null;
  /** @type {Record<string, object>} */
  var mobileDetailUiByPlayerKey = Object.create(null);

  function getRoot() {
    return document.getElementById("fcMobileDashboard");
  }

  function getTvTrack() {
    if (typeof window.getMobileNotificationTrack === "function") {
      var track = window.getMobileNotificationTrack();
      if (track) return track;
    }
    return document.getElementById("tvDashboardNotificationsListTrack");
  }

  function getApp() {
    return document.getElementById("app");
  }

  function isEvolutionMode() {
    var app = getApp();
    return app && app.getAttribute("data-platform-experience") === "evolution";
  }

  function canOpenMobileDetailUi() {
    return isEvolutionMode() || isMobileDashOpen();
  }

  function isMobileDashOpen() {
    var root = getRoot();
    return !!(root && root.classList.contains("is-open"));
  }

  function l3EnterAnimMs() {
    if (
      typeof window.isLocalPlayerControllerSwapActive === "function" &&
      window.isLocalPlayerControllerSwapActive()
    ) {
      return 0;
    }
    var root = getRoot();
    if (!root) return 340;
    var enter = getComputedStyle(root).getPropertyValue("--fc-mobile-dash-enter-ms").trim();
    var view = getComputedStyle(root).getPropertyValue("--fc-mobile-dash-view-ms").trim();
    var ms = parseInt(enter || view, 10);
    return Number.isFinite(ms) && ms > 0 ? ms : 340;
  }

  function applyL3EnterMode(root, enter) {
    if (!root) return;
    if (enter === "panel") {
      root.setAttribute("data-mobile-dashboard-l3-enter", "panel");
    } else {
      root.removeAttribute("data-mobile-dashboard-l3-enter");
    }
  }

  function applyL2EnterMode(root, enter) {
    if (!root) return;
    if (enter === "panel") {
      root.setAttribute("data-mobile-dashboard-l2-enter", "panel");
    } else {
      root.removeAttribute("data-mobile-dashboard-l2-enter");
    }
  }

  function isMobileDetailSubPage() {
    var root = getRoot();
    return !!(root && root.getAttribute("data-mobile-detail-view") === "sub-page");
  }

  var DETAIL_RETURN_L2_META = {
    notifications: {
      viewId: "fcMobileDashViewNotifications",
      markOpen: "markMobileDashboardNotificationsL2Open",
    },
    friends: {
      viewId: "fcMobileDashViewFriends",
      markOpen: "markMobileDashboardFriendsL2Open",
    },
    achievements: {
      viewId: "fcMobileDashViewAchievements",
      markOpen: "markMobileDashboardAchievementsL2Open",
    },
    "add-players": {
      viewId: "fcMobileDashViewAddPlayersL2",
      markOpen: "markMobileDashboardAddPlayersL2Open",
    },
  };

  function detectDetailReturnL2(root) {
    if (!root) return null;
    var l2 = root.getAttribute("data-mobile-dashboard-l2");
    if (DETAIL_RETURN_L2_META[l2]) return l2;
    if (root.getAttribute("data-mobile-dashboard-view") === "add-players") return "invite";
    if (l2 === "detail") {
      var attrReturn = root.getAttribute("data-mobile-detail-return");
      if (attrReturn === "invite") return "invite";
      if (DETAIL_RETURN_L2_META[attrReturn]) return attrReturn;
      if (detailReturnL2 === "invite") return detailReturnL2;
      if (detailReturnL2 && DETAIL_RETURN_L2_META[detailReturnL2]) return detailReturnL2;
    }
    return null;
  }

  function resolveDetailReturnL2(root, opts) {
    opts = opts || {};
    if (Object.prototype.hasOwnProperty.call(opts, "returnL2")) {
      return opts.returnL2;
    }
    return detectDetailReturnL2(root);
  }

  function restoreInviteDetailReturn(root) {
    if (!root) return;
    root.setAttribute("data-mobile-dashboard-view", "add-players");
    if (root.getAttribute("data-mobile-dashboard-l2") === "detail") {
      root.removeAttribute("data-mobile-dashboard-l2");
    }
    var inviteView = document.getElementById("fcMobileDashViewAddPlayers");
    var homeView = document.getElementById("fcMobileDashViewHome");
    if (inviteView) inviteView.setAttribute("aria-hidden", "false");
    if (homeView) homeView.setAttribute("aria-hidden", "true");
  }

  function restoreDetailReturnL2(root, returnL2) {
    if (!root) return;
    if (returnL2 === "invite") {
      restoreInviteDetailReturn(root);
      return;
    }
    var meta = DETAIL_RETURN_L2_META[returnL2];
    if (!meta) return;
    root.setAttribute("data-mobile-dashboard-l2", returnL2);
    var view = document.getElementById(meta.viewId);
    if (view) view.setAttribute("aria-hidden", "false");
    if (typeof window[meta.markOpen] === "function") {
      window[meta.markOpen](true);
    }
  }

  function syncDetailReturnL2Underlay(root, returnL2) {
    if (!root || !returnL2) return;
    if (returnL2 === "invite") {
      restoreInviteDetailReturn(root);
      return;
    }
    root.setAttribute("data-mobile-dashboard-l2", returnL2);
    var meta = DETAIL_RETURN_L2_META[returnL2];
    if (!meta) return;
    var view = document.getElementById(meta.viewId);
    if (view) view.setAttribute("aria-hidden", "false");
  }

  function detailHeaderTitleForKind(kind) {
    var titles = {
      "game-invite": "Invite",
      "friend-request": "Friend Request",
      "friend-connected": "Profile",
      achievement: "Achievements",
      "non-friend": "Profile",
      generic: "Notification",
    };
    return titles[kind] || "Details";
  }

  function syncDetailSubPageHeaderTitle() {
    var headerEl = document.getElementById("fcMobileNotifDetailHeaderTitle");
    if (!headerEl) return;
    var card = detailOutcomeHost();
    var kind = card ? card.getAttribute("data-notif-kind") || "" : "";
    headerEl.textContent = detailHeaderTitleForKind(kind);
  }

  function isReturningToDetailFromEditProfile(root) {
    if (!root) return false;
    return (
      root.getAttribute("data-mobile-edit-profile-return") === "detail" ||
      root.getAttribute("data-mobile-edit-profile-closing") === "detail" ||
      root.getAttribute("data-mobile-edit-profile-closing") === "overlay"
    );
  }

  function restoreMobileDetailAfterEditProfileClose() {
    var root = getRoot();
    if (!root) return;

    var returningFromEditProfile = isReturningToDetailFromEditProfile(root);

    if (isMobileDetailSubPage()) {
      if (
        root.getAttribute("data-mobile-dashboard-l2") !== "detail" &&
        !returningFromEditProfile
      ) {
        return;
      }
    } else if (
      root.getAttribute("data-mobile-dashboard-l3") !== "detail" &&
      !returningFromEditProfile
    ) {
      return;
    }

    l3Open = true;
    l3Animating = false;

    var detailView = document.getElementById("fcMobileDashViewNotifDetail");
    if (detailView) detailView.setAttribute("aria-hidden", "false");

    syncDetailSubPageHeaderTitle();

    var card = detailOutcomeHost();
    var handleKey = activeFriendHandleKey;
    if (!handleKey && card) {
      var kind = card.getAttribute("data-notif-kind") || "";
      if (kind === "friend-connected") handleKey = "local";
    }

    if (handleKey) {
      activeFriendHandleKey = handleKey;
      populateFriendConnectedDetail(
        {
          handleKey: handleKey,
          sourceElement: friendsFocusCardForKey(handleKey),
        },
        detailAssets()
      );
    } else if (activeTvRow) {
      populateDetailCard(activeTvRow);
    }

    if (typeof window.scheduleMobileDashboardViewScrollSync === "function") {
      window.scheduleMobileDashboardViewScrollSync();
    }
  }

  function getMobileDetailActiveHandleKey() {
    return activeFriendHandleKey;
  }

  function setMobileDetailActiveHandleKey(handleKey) {
    activeFriendHandleKey = handleKey || null;
  }

  function applyDetailNavigationOpen(root, opts) {
    opts = opts || {};
    if (!root) return;
    if (typeof window.resetMobileDashboardEditProfileL2 === "function") {
      window.resetMobileDashboardEditProfileL2();
    }
    if (isMobileDetailSubPage()) {
      var nextReturnL2 = resolveDetailReturnL2(root, opts);
      if (!nextReturnL2 && detailReturnL2) {
        nextReturnL2 = detailReturnL2;
      }
      detailReturnL2 = nextReturnL2 || null;
      if (detailReturnL2) {
        root.setAttribute("data-mobile-detail-return", detailReturnL2);
      } else {
        root.removeAttribute("data-mobile-detail-return");
      }
      applyL2EnterMode(root, opts.enter === "panel" ? "panel" : null);
      root.removeAttribute("data-mobile-dashboard-l3");
      root.removeAttribute("data-mobile-dashboard-l3-enter");
      root.setAttribute("data-mobile-dashboard-l2", "detail");
      return;
    }
    applyL3EnterMode(root, opts.enter === "panel" ? "panel" : null);
    root.setAttribute("data-mobile-dashboard-l3", "detail");
    if (opts.returnL2 === "notifications") {
      ensureNotificationsL2();
    }
  }

  function applyDetailNavigationClose(root) {
    if (!root) return;
    root.removeAttribute("data-mobile-active-detail");
    if (isMobileDetailSubPage()) {
      root.removeAttribute("data-mobile-dashboard-l3");
      root.removeAttribute("data-mobile-dashboard-l3-enter");
      root.removeAttribute("data-mobile-dashboard-l2-enter");
      if (detailReturnL2) {
        restoreDetailReturnL2(root, detailReturnL2);
      }
      if (root.getAttribute("data-mobile-dashboard-l2") === "detail") {
        root.removeAttribute("data-mobile-dashboard-l2");
      }
      detailReturnL2 = null;
      root.removeAttribute("data-mobile-detail-return");
      return;
    }
    root.removeAttribute("data-mobile-dashboard-l3");
    root.removeAttribute("data-mobile-dashboard-l3-enter");
  }

  function finishDetailOpen(root) {
    l3Open = true;
    l3Animating = true;
    syncDetailSubPageHeaderTitle();
    var detailView = document.getElementById("fcMobileDashViewNotifDetail");
    if (detailView) detailView.setAttribute("aria-hidden", "false");
    // Mirror the active detail kind onto the root so view-scoped styling can react
    // (e.g. the local-profile view hides the persistent "Currently Playing" peek).
    if (root) {
      var detailCard = document.getElementById("fcMobileNotifDetailCard");
      root.setAttribute(
        "data-mobile-active-detail",
        detailCard ? detailCard.getAttribute("data-notif-kind") || "" : ""
      );
    }
    if (typeof window.syncMobileDashboardMissedCard === "function") {
      window.syncMobileDashboardMissedCard();
    }
    if (typeof window.scheduleMobileDashboardViewScrollSync === "function") {
      window.scheduleMobileDashboardViewScrollSync();
    }
    window.setTimeout(function () {
      l3Animating = false;
      if (typeof window.scheduleMobileDashboardViewScrollSync === "function") {
        window.scheduleMobileDashboardViewScrollSync();
      }
    }, l3EnterAnimMs());
  }

  function syncMobileDetailViewMode() {
    if (!l3Open) return;
    var root = getRoot();
    if (!root) return;
    if (root.getAttribute("data-mobile-dashboard-l2") === "edit-profile") return;
    var returnL2 = detailReturnL2;
    if (!returnL2 && !isMobileDetailSubPage()) {
      returnL2 = detectDetailReturnL2(root);
    }
    if (isMobileDetailSubPage()) {
      detailReturnL2 = returnL2;
      if (detailReturnL2) {
        root.setAttribute("data-mobile-detail-return", detailReturnL2);
      } else {
        root.removeAttribute("data-mobile-detail-return");
      }
      root.removeAttribute("data-mobile-dashboard-l3");
      root.removeAttribute("data-mobile-dashboard-l3-enter");
      root.removeAttribute("data-mobile-dashboard-l2-enter");
      root.setAttribute("data-mobile-dashboard-l2", "detail");
    } else {
      if (root.getAttribute("data-mobile-dashboard-l2") === "detail") {
        root.removeAttribute("data-mobile-dashboard-l2");
      }
      root.removeAttribute("data-mobile-detail-return");
      root.setAttribute("data-mobile-dashboard-l3", "detail");
      if (returnL2) {
        syncDetailReturnL2Underlay(root, returnL2);
      }
    }
    syncDetailSubPageHeaderTitle();
    if (typeof window.scheduleMobileDashboardViewScrollSync === "function") {
      window.scheduleMobileDashboardViewScrollSync();
    }
  }

  function localSessionGameTitle() {
    var refRaw = window.PROTOTYPE_LOCAL_SESSION_GAME_TITLE;
    return (typeof refRaw === "string" ? refRaw : "").replace(/\s+/g, " ").trim() || "FIFA World Cup";
  }

  function inviterHandle() {
    var ph = window.PROTOTYPE_PLAYER_HANDLES;
    return (ph && ph.inviter) || "Friend";
  }

  function markTvRowRead(tvRow) {
    if (!tvRow || !tvRow.classList) return;
    tvRow.classList.remove("game-invite-list__item--notification-unread");
    if (typeof window.syncTvHeaderGameInviteNotificationBadge === "function") {
      window.syncTvHeaderGameInviteNotificationBadge();
    }
  }

  function deriveHandleFromFriendRow(tvRow) {
    if (!tvRow) return "";
    var nameEl = tvRow.querySelector(".game-invite-list__name");
    var raw = nameEl ? (nameEl.textContent || "").trim() : "";
    if (!raw) return "";
    var connected = raw.match(/^\s*You are now friends with\s+(.+?)\s*$/i);
    if (connected && connected[1]) return connected[1].trim();
    return raw.replace(/\s+wants to be friends\.?$/i, "").trim();
  }

  function rowKind(tvRow) {
    if (typeof window.getMobileNotificationRowKind === "function") {
      return window.getMobileNotificationRowKind(tvRow);
    }
    var source = tvRow.getAttribute("data-notification-source") || "";
    if (source === "tv-game-invite-toast") return "game-invite";
    if (source === "friend-request") return "friend-request";
    if (source === "friend-connected") return "friend-connected";
    if (source === "achievement") return "achievement";
    return "generic";
  }

  function setElText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text || "";
  }

  function setElHidden(id, hidden) {
    var el = document.getElementById(id);
    if (el) el.hidden = !!hidden;
  }

  function resetCardBackground() {}

  // Sample a vivid representative color from an avatar image and expose it as
  // --avatar-glow on targetEl, so a soft box-shadow can splash that color into
  // the card. Saturation-weighted so the glow reads as a color, not muddy gray.
  function applyProfileAvatarGlow(imgEl, targetEl) {
    if (!imgEl || !targetEl) return;
    function sample() {
      try {
        var size = 20;
        var canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(imgEl, 0, 0, size, size);
        var data = ctx.getImageData(0, 0, size, size).data;
        var rs = 0, gs = 0, bs = 0, ws = 0;
        for (var i = 0; i < data.length; i += 4) {
          var r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;
          var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          var sat = mx === 0 ? 0 : (mx - mn) / mx;
          var w = sat * sat * 3 + 0.04;
          rs += r * w; gs += g * w; bs += b * w; ws += w;
        }
        if (!ws) return;
        targetEl.style.setProperty(
          "--avatar-glow",
          "rgba(" + Math.round(rs / ws) + "," + Math.round(gs / ws) + "," + Math.round(bs / ws) + ",0.62)"
        );
      } catch (e) {
        /* canvas sampling unavailable — leave the transparent fallback */
      }
    }
    if (imgEl.complete && imgEl.naturalWidth) sample();
    else imgEl.addEventListener("load", sample, { once: true });
  }

  function setHeroImage(src, modifier) {
    var img = document.getElementById("fcMobileNotifDetailHeroImg");
    if (!img) return;
    img.className = "fc-mobile-notif-detail__image";
    if (modifier) img.classList.add("fc-mobile-notif-detail__image--" + modifier);
    if (src) {
      img.setAttribute("src", src);
      img.hidden = false;
    } else {
      img.removeAttribute("src");
      img.hidden = true;
    }

    if (modifier === "avatar" && src) {
      applyProfileAvatarGlow(img, img);
    } else {
      img.style.removeProperty("--avatar-glow");
    }

    if (modifier !== "avatar") {
      var imageWrap = document.querySelector(".fc-mobile-notif-detail__image-wrap");
      if (imageWrap) {
        var dot = imageWrap.querySelector(".fc-presence-dot--avatar");
        if (dot) dot.remove();
      }
    }
  }

  function resetDetailContent() {
    resetDetailCtaStage();
    resetCardBackground();
    setHeroImage("", "");
    setElText("fcMobileNotifDetailTitle", "");
    setElText("fcMobileNotifDetailSubtitle", "");
    setElText("fcMobileNotifDetailGame", "");
    setElText("fcMobileNotifDetailTime", "");
    setElText("fcMobileNotifDetailCopy", "");
    setElText("fcMobileNotifDetailLead", "");
    setElHidden("fcMobileNotifDetailTitle", false);
    setElHidden("fcMobileNotifDetailSubtitle", false);
    setElHidden("fcMobileNotifDetailGame", true);
    setElHidden("fcMobileNotifDetailTime", true);
    setElHidden("fcMobileNotifDetailCopy", true);
    setElHidden("fcMobileNotifDetailLead", true);
    setElHidden("fcMobileNotifDetailStatus", true);
    setElHidden("fcMobileNotifDetailMeta", true);
    setElHidden("fcMobileNotifDetailLastPlayed", true);
  }

  function outcomeApi() {
    return window.fcMobileNotifOutcome || null;
  }

  function detailOutcomeHost() {
    return document.getElementById("fcMobileNotifDetailCard");
  }

  function clearDetailOutcomeTimers() {
    var host = detailOutcomeHost();
    var api = outcomeApi();
    if (host && api) api.clearTimers(host);
  }

  function resetDetailCtaStage() {
    clearDetailOutcomeTimers();
    var host = detailOutcomeHost();
    if (host) {
      host.removeAttribute("data-notif-outcome");
      host.removeAttribute("data-friend-invite-key");
    }
    var stage = document.getElementById("fcMobileNotifDetailCtaStage");
    if (stage) {
      stage.removeAttribute("data-outcome");
      stage.hidden = false;
      stage.querySelectorAll(".fc-mobile-notif-detail__confirmation").forEach(function (node) {
        node.remove();
      });
    }
    var cta = document.getElementById("fcMobileNotifDetailCta");
    if (cta) {
      cta.hidden = false;
      cta.classList.remove(
        "fc-mobile-notif-detail__cta--out",
        "fc-mobile-notif-detail__cta--finished"
      );
      cta.replaceChildren();
    }
  }

  function createDetailActionButton(label, variant) {
    var api = outcomeApi();
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "fc-mobile-notif-detail__btn fc-mobile-notif-detail__btn--" +
      (variant === "primary" ? "primary" : "secondary");
    var labelEl = document.createElement("span");
    labelEl.className = "fc-mobile-notif-detail__btn-label";
    labelEl.textContent = label;
    btn.appendChild(labelEl);
    if (api && api.LOADER_SRC) {
      var loader = document.createElement("span");
      loader.className = "fc-mobile-notif-detail__btn-loader";
      loader.setAttribute("aria-hidden", "true");
      var loaderImg = document.createElement("img");
      loaderImg.src = api.LOADER_SRC;
      loaderImg.alt = "";
      loaderImg.decoding = "async";
      loaderImg.width = 18;
      loaderImg.height = 18;
      loader.appendChild(loaderImg);
      btn.appendChild(loader);
    }
    return btn;
  }

  function createDetailOutcomeConfirmation(kind, iconSrc, copy) {
    var conf = document.createElement("div");
    conf.className =
      "fc-mobile-notif-detail__confirmation fc-mobile-notif-detail__confirmation--" +
      kind;
    conf.hidden = true;
    conf.setAttribute("role", "status");
    conf.setAttribute("aria-live", "polite");
    var icon = document.createElement("img");
    icon.className = "fc-mobile-notif-detail__confirmation-icon";
    icon.src = iconSrc;
    icon.alt = "";
    icon.decoding = "async";
    icon.width = 24;
    icon.height = 24;
    var text = document.createElement("p");
    text.className = "fc-mobile-notif-detail__confirmation-text";
    text.textContent = copy;
    conf.appendChild(icon);
    conf.appendChild(text);
    return conf;
  }

  function appendDetailOutcomeConfirmations(stage, outcomeKind) {
    var api = outcomeApi();
    if (!api || !stage) return;
    var copyPack = api.COPY[outcomeKind];
    if (!copyPack) return;
    stage.appendChild(
      createDetailOutcomeConfirmation(
        copyPack.primary.kind,
        api.ACCEPT_ICON,
        copyPack.primary.text
      )
    );
    if (copyPack.secondary && copyPack.secondary.text) {
      stage.appendChild(
        createDetailOutcomeConfirmation(
          copyPack.secondary.kind,
          api.DECLINE_ICON,
          copyPack.secondary.text
        )
      );
    }
  }

  function morphDetailCardToFriendConnected(tvRow, handleKey) {
    var card = detailOutcomeHost();
    var inner = card && card.querySelector(".fc-mobile-notif-detail__card-inner");
    var pack = detailAssets();
    var resolvedKey =
      handleKey ||
      (tvRow && tvRow.getAttribute("data-player-panel-handle-key")) ||
      activeFriendHandleKey;
    var resolvedHandle = tvRow ? friendRowHandle(tvRow) : null;

    function applyFriendConnectedView() {
      if (resolvedKey) activeFriendHandleKey = resolvedKey;
      if (card) {
        card.className =
          "fc-mobile-notif-detail__card fc-mobile-notif-detail__card--friend-connected";
        card.setAttribute("data-notif-kind", "friend-connected");
        card.classList.remove("is-offline");
        card.removeAttribute("data-notif-outcome");
      }
      resetDetailContent();
      populateFriendConnectedDetail(
        {
          handleKey: resolvedKey,
          handle: resolvedHandle,
          sourceElement: tvRow || friendsFocusCardForKey(resolvedKey),
          tvRow: tvRow,
        },
        pack
      );
      if (typeof window.syncMobileNotificationList === "function") {
        window.syncMobileNotificationList();
      }
      if (typeof window.syncMobileDashboardFriendsList === "function") {
        window.syncMobileDashboardFriendsList();
      }
      if (typeof window.syncMobileDashboardPlayerList === "function") {
        window.syncMobileDashboardPlayerList();
      }
    }

    var reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!card || !inner || reduced) {
      applyFriendConnectedView();
      return;
    }

    var morphed = false;
    function finishMorphOut() {
      if (morphed) return;
      morphed = true;
      inner.removeEventListener("transitionend", onMorphOut);
      applyFriendConnectedView();
      void inner.offsetWidth;
      window.requestAnimationFrame(function () {
        card.classList.remove("is-morphing");
      });
    }

    function onMorphOut(ev) {
      if (ev.target !== inner || ev.propertyName !== "opacity") return;
      finishMorphOut();
    }

    card.classList.add("is-morphing");
    inner.addEventListener("transitionend", onMorphOut);
    window.setTimeout(finishMorphOut, 320);
  }

  function settleDetailFriendAcceptInPlace(tvRow) {
    var api = outcomeApi();
    var stage = document.getElementById("fcMobileNotifDetailCtaStage");
    if (!tvRow || !stage) return;
    clearDetailOutcomeTimers();

    var conf = stage.querySelector(".fc-mobile-notif-detail__confirmation--accept");
    var host = detailOutcomeHost();

    function finalizeInPlace() {
      if (api) {
        api.applyOutcome(tvRow, "friend-request", "primary", { skipMobileSync: true });
      }
      if (host) host.removeAttribute("data-notif-outcome");
      resetDetailCtaStage();
      morphDetailCardToFriendConnected(tvRow);
    }

    if (conf && conf.classList.contains("fc-mobile-notif-detail__confirmation--in")) {
      conf.classList.remove("fc-mobile-notif-detail__confirmation--in");
      window.setTimeout(finalizeInPlace, 280);
      return;
    }

    finalizeInPlace();
  }

  function completeDetailOutcome(tvRow, outcomeKind, which) {
    var api = outcomeApi();
    if (!api) return;
    var copyPack = api.COPY[outcomeKind];
    if (which === "primary" && copyPack && copyPack.settlePrimaryInPlace) {
      settleDetailFriendAcceptInPlace(tvRow);
      return;
    }
    api.applyOutcome(tvRow, outcomeKind, which, { skipMobileSync: true });
    if (outcomeKind === "game-invite" && which === "primary") {
      resetNotificationDetailL3();
      return;
    }
    closeNotificationDetailL3();
    if (typeof window.syncMobileNotificationList === "function") {
      window.syncMobileNotificationList();
    }
  }

  function finishDetailOutcomeLoading(
    tvRow,
    outcomeKind,
    which,
    stage,
    actionsEl,
    primaryBtn,
    secondaryBtn
  ) {
    var host = detailOutcomeHost();
    var api = outcomeApi();
    if (!host || !api || host.getAttribute("data-notif-outcome") !== "loading") return;

    var copyPack = api.COPY[outcomeKind];
    var confPrimary = stage.querySelector(
      ".fc-mobile-notif-detail__confirmation--" + copyPack.primary.kind
    );
    var confSecondary =
      copyPack.secondary && copyPack.secondary.kind
        ? stage.querySelector(
            ".fc-mobile-notif-detail__confirmation--" + copyPack.secondary.kind
          )
        : null;
    var conf = which === "primary" ? confPrimary : confSecondary;
    var other = which === "primary" ? confSecondary : confPrimary;
    var timers = host._fcNotifOutcomeTimers || {};

    function afterActionsFade() {
      if (host.getAttribute("data-notif-outcome") !== "loading") return;
      if (timers.fadeListener && actionsEl) {
        actionsEl.removeEventListener("transitionend", timers.fadeListener);
        timers.fadeListener = null;
      }
      if (timers.fadeFallback) {
        window.clearTimeout(timers.fadeFallback);
        timers.fadeFallback = null;
      }

      actionsEl.setAttribute("hidden", "");
      actionsEl.classList.add("fc-mobile-notif-detail__cta--finished");
      primaryBtn.classList.remove("fc-mobile-notif-detail__btn--loading");
      if (secondaryBtn) {
        secondaryBtn.classList.remove("fc-mobile-notif-detail__btn--loading");
      }
      primaryBtn.removeAttribute("aria-busy");
      if (secondaryBtn) secondaryBtn.removeAttribute("aria-busy");

      if (other) {
        other.hidden = true;
        other.classList.remove("fc-mobile-notif-detail__confirmation--in");
      }
      if (conf) {
        conf.hidden = false;
        conf.classList.remove("fc-mobile-notif-detail__confirmation--in");
        void conf.offsetWidth;
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            conf.classList.add("fc-mobile-notif-detail__confirmation--in");
          });
        });
      }

      host.setAttribute("data-notif-outcome", "done");
      stage.setAttribute("data-outcome", "done");

      if (outcomeKind === "friend-game-invite") {
        var inviteKey = host.getAttribute("data-friend-invite-key");
        if (inviteKey && typeof window.completeMobileInviteForKey === "function") {
          window.completeMobileInviteForKey(inviteKey);
        }
        host._fcNotifOutcomeTimers = timers;
        return;
      }

      if (outcomeKind === "friend-request-sent") {
        var friendKey = host.getAttribute("data-friend-invite-key");
        if (
          friendKey &&
          typeof window.sendFriendRequestFromActiveToKey === "function"
        ) {
          window.sendFriendRequestFromActiveToKey(friendKey);
        }
        host._fcNotifOutcomeTimers = timers;
        return;
      }

      timers.confirm = window.setTimeout(function () {
        timers.confirm = null;
        completeDetailOutcome(tvRow, outcomeKind, which);
      }, api.CONFIRM_MS);
      host._fcNotifOutcomeTimers = timers;
    }

    primaryBtn.disabled = true;
    if (secondaryBtn) secondaryBtn.disabled = true;
    actionsEl.classList.add("fc-mobile-notif-detail__cta--out");

    var reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      timers.fadeFallback = window.setTimeout(afterActionsFade, 40);
      host._fcNotifOutcomeTimers = timers;
      return;
    }

    timers.fadeListener = function (ev) {
      if (ev.target !== actionsEl || ev.propertyName !== "opacity") return;
      afterActionsFade();
    };
    actionsEl.addEventListener("transitionend", timers.fadeListener);
    timers.fadeFallback = window.setTimeout(function () {
      timers.fadeFallback = null;
      if (timers.fadeListener && actionsEl) {
        actionsEl.removeEventListener("transitionend", timers.fadeListener);
        timers.fadeListener = null;
      }
      afterActionsFade();
    }, 420);
    host._fcNotifOutcomeTimers = timers;
  }

  function startDetailOutcome(
    tvRow,
    outcomeKind,
    which,
    primaryBtn,
    secondaryBtn
  ) {
    var host = detailOutcomeHost();
    var api = outcomeApi();
    var stage = document.getElementById("fcMobileNotifDetailCtaStage");
    var actionsEl = document.getElementById("fcMobileNotifDetailCta");
    if (!host || !api || !stage || !actionsEl) return;
    if (!tvRow && outcomeKind !== "friend-game-invite" && outcomeKind !== "friend-request-sent") return;
    var phase = host.getAttribute("data-notif-outcome");
    if (phase === "loading" || phase === "done") return;

    if (outcomeKind === "friend-request-sent") {
      var pendingKey = host.getAttribute("data-friend-invite-key");
      if (
        pendingKey &&
        typeof window.hasOutgoingFriendRequestFromActive === "function" &&
        window.hasOutgoingFriendRequestFromActive(pendingKey)
      ) {
        return;
      }
    }

    clearDetailOutcomeTimers();
    if (tvRow) markTvRowRead(tvRow);
    host.setAttribute("data-notif-outcome", "loading");
    stage.setAttribute("data-outcome", "loading");

    primaryBtn.disabled = which !== "primary";
    if (secondaryBtn) secondaryBtn.disabled = which !== "secondary";
    if (which === "primary") {
      primaryBtn.classList.add("fc-mobile-notif-detail__btn--loading");
      primaryBtn.setAttribute("aria-busy", "true");
    } else if (secondaryBtn) {
      secondaryBtn.classList.add("fc-mobile-notif-detail__btn--loading");
      secondaryBtn.setAttribute("aria-busy", "true");
    }

    host._fcNotifOutcomeTimers = {
      load: window.setTimeout(function () {
        if (host._fcNotifOutcomeTimers) host._fcNotifOutcomeTimers.load = null;
        finishDetailOutcomeLoading(
          tvRow,
          outcomeKind,
          which,
          stage,
          actionsEl,
          primaryBtn,
          secondaryBtn
        );
      }, api.LOADING_MS)
    };
  }

  function wireDetailOutcomeActions(tvRow, outcomeKind, primaryLabel, secondaryLabel) {
    var stage = document.getElementById("fcMobileNotifDetailCtaStage");
    var cta = document.getElementById("fcMobileNotifDetailCta");
    if (!stage || !cta) return null;

    if (stage) stage.hidden = false;
    appendDetailOutcomeConfirmations(stage, outcomeKind);

    var primaryBtn = createDetailActionButton(primaryLabel, "primary");
    var secondaryBtn = createDetailActionButton(secondaryLabel, "secondary");

    primaryBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      startDetailOutcome(tvRow, outcomeKind, "primary", primaryBtn, secondaryBtn);
    });
    secondaryBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      startDetailOutcome(tvRow, outcomeKind, "secondary", primaryBtn, secondaryBtn);
    });

    cta.appendChild(primaryBtn);
    cta.appendChild(secondaryBtn);
    return { primaryBtn: primaryBtn, secondaryBtn: secondaryBtn };
  }

  function inviteListRowForKey(handleKey) {
    if (!handleKey) return null;
    return document.querySelector(
      '#tvDashboardInviteShell .game-invite-list__item[data-player-panel-handle-key="' +
        handleKey +
        '"]'
    );
  }

  function showFriendGameInviteSentConfirmation(stage, cta, host, handleKey) {
    if (host) {
      host.setAttribute("data-notif-outcome", "done");
      if (handleKey) host.setAttribute("data-friend-invite-key", handleKey);
      else host.removeAttribute("data-friend-invite-key");
    }
    if (!stage || !cta) return;

    stage.hidden = false;
    stage.setAttribute("data-outcome", "done");
    stage.querySelectorAll(".fc-mobile-notif-detail__confirmation").forEach(function (node) {
      node.remove();
    });
    appendDetailOutcomeConfirmations(stage, "friend-game-invite");

    cta.hidden = true;
    cta.classList.add("fc-mobile-notif-detail__cta--finished");
    cta.replaceChildren();

    var conf = stage.querySelector(".fc-mobile-notif-detail__confirmation--sent");
    if (conf) {
      conf.hidden = false;
      conf.classList.add("fc-mobile-notif-detail__confirmation--in");
    }
  }

  function isProfileFriend(handleKey) {
    if (!handleKey || handleKey === "local") return true;
    if (
      typeof window.isActiveLocalPlayerFriend === "function" &&
      window.isActiveLocalPlayerFriend(handleKey)
    ) {
      return true;
    }
    var ph = window.PROTOTYPE_PLAYER_HANDLES;
    if (/^accepted-/.test(handleKey) && ph && ph[handleKey]) return true;
    if (
      typeof window.isLocalPlayerFriendKey === "function" &&
      window.isLocalPlayerFriendKey(handleKey)
    ) {
      return typeof window.isActiveLocalPlayerFriend !== "function"
        ? true
        : window.isActiveLocalPlayerFriend(handleKey);
    }
    return typeof window.isActiveLocalPlayerFriend !== "function";
  }

  function isPlayingSameGameAsActivePlayer(handleKey, sourceElement) {
    if (!handleKey || handleKey === "local") return true;
    var profile = resolveFriendProfile(sourceElement, handleKey);
    if (!profile || !profile.playingGame) return false;
    var theirGame = profile.playingGame.replace(/\s+/g, " ").trim().toLowerCase();
    var yourGame = localSessionGameTitle().toLowerCase();
    return theirGame === yourGame;
  }

  function showFriendRequestSentConfirmation(stage, cta, host, handleKey) {
    if (host) {
      host.setAttribute("data-notif-outcome", "done");
      if (handleKey) host.setAttribute("data-friend-invite-key", handleKey);
      else host.removeAttribute("data-friend-invite-key");
    }
    if (!stage || !cta) return;

    stage.hidden = false;
    stage.setAttribute("data-outcome", "done");
    stage.querySelectorAll(".fc-mobile-notif-detail__confirmation").forEach(function (node) {
      node.remove();
    });
    appendDetailOutcomeConfirmations(stage, "friend-request-sent");

    cta.hidden = true;
    cta.classList.add("fc-mobile-notif-detail__cta--finished");
    cta.replaceChildren();

    var conf = stage.querySelector(".fc-mobile-notif-detail__confirmation--sent");
    if (conf) {
      conf.hidden = false;
      conf.classList.add("fc-mobile-notif-detail__confirmation--in");
    }
  }

  function wireNonFriendFriendInviteDetailAction(handleKey, sourceElement) {
    var stage = document.getElementById("fcMobileNotifDetailCtaStage");
    var cta = document.getElementById("fcMobileNotifDetailCta");
    var host = detailOutcomeHost();
    if (!stage || !cta) return;

    clearDetailCta();
    stage.hidden = false;
    stage.removeAttribute("data-outcome");
    stage.querySelectorAll(".fc-mobile-notif-detail__confirmation").forEach(function (node) {
      node.remove();
    });
    if (host) {
      host.removeAttribute("data-notif-outcome");
      if (handleKey) host.setAttribute("data-friend-invite-key", handleKey);
      else host.removeAttribute("data-friend-invite-key");
    }

    var inviteBtn = createDetailActionButton("Send Friend Request", "primary");
    cta.appendChild(inviteBtn);

    // Sent state = disabled button (not a green confirmation).
    function markInviteBtnSent() {
      var lbl = inviteBtn.querySelector(".fc-mobile-notif-detail__btn-label");
      if (lbl) lbl.textContent = "Friend Request Sent";
      inviteBtn.classList.remove("fc-mobile-notif-detail__btn--loading");
      inviteBtn.classList.add("fc-mobile-notif-detail__btn--sent");
      inviteBtn.removeAttribute("aria-busy");
      inviteBtn.disabled = true;
    }

    var alreadySent =
      handleKey &&
      typeof window.hasOutgoingFriendRequestFromActive === "function" &&
      window.hasOutgoingFriendRequestFromActive(handleKey);
    if (alreadySent) {
      markInviteBtnSent();
      return;
    }

    inviteBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (inviteBtn.disabled) return;
      inviteBtn.disabled = true;
      inviteBtn.classList.add("fc-mobile-notif-detail__btn--loading");
      inviteBtn.setAttribute("aria-busy", "true");
      var api = outcomeApi();
      var loadMs = (api && api.LOADING_MS) || 650;
      window.setTimeout(function () {
        if (handleKey && typeof window.sendFriendRequestFromActiveToKey === "function") {
          window.sendFriendRequestFromActiveToKey(handleKey);
        }
        markInviteBtnSent();
        if (typeof window.showMobileDashboardStatusToast === "function") {
          var nameEl = document.getElementById("fcMobileNotifDetailTitle");
          var name = nameEl ? nameEl.textContent.trim() : "";
          window.showMobileDashboardStatusToast({
            message: "Friend request sent to " + (name || "player"),
            iconKey: "userAddSmall",
          });
        }
      }, loadMs);
    });
  }

  function isActiveLocalPlayerProfileKey(handleKey) {
    if (!handleKey) return false;
    if (handleKey === "local") return true;
    return (
      typeof window.getActiveLocalPlayerKey === "function" &&
      handleKey === window.getActiveLocalPlayerKey()
    );
  }

  function refreshMobileDetailPresenceForKey(handleKey) {
    if (!handleKey || !activeFriendHandleKey) return;
    var keysMatch =
      handleKey === activeFriendHandleKey ||
      (isActiveLocalPlayerProfileKey(handleKey) &&
        isActiveLocalPlayerProfileKey(activeFriendHandleKey));
    if (!keysMatch) return;

    var root = getRoot();
    if (!root) return;

    var returningFromEditProfile = isReturningToDetailFromEditProfile(root);
    var detailOpen = isMobileDetailSubPage()
      ? root.getAttribute("data-mobile-dashboard-l2") === "detail"
      : root.getAttribute("data-mobile-dashboard-l3") === "detail";
    if (!detailOpen && !returningFromEditProfile) return;

    populateFriendConnectedDetail(
      {
        handleKey: activeFriendHandleKey,
        sourceElement: friendsFocusCardForKey(activeFriendHandleKey),
      },
      detailAssets()
    );
  }

  function wireFriendGameInviteDetailAction(handleKey, sourceElement) {
    var stage = document.getElementById("fcMobileNotifDetailCtaStage");
    var cta = document.getElementById("fcMobileNotifDetailCta");
    var host = detailOutcomeHost();
    if (!stage || !cta) return;

    if (isActiveLocalPlayerProfileKey(handleKey)) {
      clearDetailCta();
      if (host) {
        host.removeAttribute("data-notif-outcome");
        host.removeAttribute("data-friend-invite-key");
      }
      stage.hidden = false;
      stage.removeAttribute("data-outcome");
      addDetailBtn("Online Status", "secondary", function () {
        if (typeof window.openMobileEditProfileL2 === "function") {
          window.openMobileEditProfileL2({ fromDetail: true });
        }
      });
      return;
    }

    // Friend cards always surface Invite to Game + Remove Friend — even when the
    // friend is in your lobby or already playing your game (those states used to
    // hide the CTAs, which left e.g. the first list card with no actions).
    if (
      handleKey &&
      typeof window.getMobileInviteUiStateForKey === "function" &&
      window.getMobileInviteUiStateForKey(handleKey) === "invited"
    ) {
      showFriendGameInviteSentConfirmation(stage, cta, host, handleKey);
      return;
    }

    clearDetailCta();
    if (host) {
      host.removeAttribute("data-notif-outcome");
      if (handleKey) host.setAttribute("data-friend-invite-key", handleKey);
      else host.removeAttribute("data-friend-invite-key");
    }
    stage.hidden = false;
    stage.removeAttribute("data-outcome");
    stage.querySelectorAll(".fc-mobile-notif-detail__confirmation").forEach(function (node) {
      node.remove();
    });

    appendDetailOutcomeConfirmations(stage, "friend-game-invite");
    var inviteBtn = createDetailActionButton("Invite to Game", "primary");
    inviteBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      startDetailOutcome(
        inviteListRowForKey(handleKey),
        "friend-game-invite",
        "primary",
        inviteBtn,
        null
      );
    });
    cta.appendChild(inviteBtn);

    // Secondary "Remove Friend" action (decorative — feedback toast for now).
    addDetailBtn("Remove Friend", "secondary", function () {
      var nameEl = document.getElementById("fcMobileNotifDetailTitle");
      var name = nameEl ? nameEl.textContent.trim() : "";
      if (typeof window.showMobileDashboardStatusToast === "function") {
        window.showMobileDashboardStatusToast({
          message: "Removed " + (name || "friend"),
          iconKey: "userAddSmall",
        });
      }
    });
  }

  var GAME_INVITE_JOIN_MESSAGE =
    "If you join, you'll quit your current session. Any unsaved progress will be lost.";

  var FRIEND_REQUEST_ACCOUNT_NOTE = "On the same Netflix account";
  var FRIEND_REQUEST_COPY_BODY =
    "Play together and share which games you're currently playing.";

  function friendRequestShowsSameAccountNote(seed) {
    var key = (seed || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!key) return Math.random() < 0.5;
    var h = 0;
    for (var i = 0; i < key.length; i++) {
      h = (h * 31 + key.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % 100 < 50;
  }

  function friendRequestLeadCopy(handle) {
    return (handle || "Friend") + " wants to be friends.";
  }
  var FRIEND_ACHIEVEMENTS_SUMMARY = "112 achievements";
  var FRIEND_PLAYING_LABEL = "Currently playing";

  // Distinct-but-stable achievements count per profile (varies per profile,
  // does not re-roll on reopen). Keyed off the profile handle/key.
  function profileAchievementsCount(key) {
    var s = String(key || "you");
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return 8 + (h % 240);
  }
  function profileAchievementsSummary(key) {
    var n = profileAchievementsCount(key);
    return n + (n === 1 ? " achievement" : " achievements");
  }
  var TV_STATUS_ONLINE = "assets/raster/game-invite-1-6683/status-online-dot.svg";
  var TV_STATUS_OFFLINE = "assets/raster/game-invite-1-6683/status-offline-dot.png";

  function friendRowAvatar(tvRow, fallback) {
    var avImg = tvRow.querySelector(".game-invite-list__avatar img");
    return (
      (avImg && avImg.getAttribute("src")) ||
      fallback ||
      "assets/profile-avatars/type-01-scarlet.png"
    );
  }

  function friendRowHandle(tvRow) {
    return deriveHandleFromFriendRow(tvRow) || "Friend";
  }

  function friendsFocusCardForKey(handleKey) {
    if (!handleKey) return null;
    return document.querySelector(
      '.tv-dashboard__friends-focus-player-card[data-player-panel-handle-key="' +
        handleKey +
        '"]'
    );
  }

  function resolveHandleForFriendKey(handleKey, sourceEl) {
    var ph = window.PROTOTYPE_PLAYER_HANDLES;
    if (handleKey && ph && ph[handleKey]) {
      return String(ph[handleKey]).replace(/\s+/g, " ").trim();
    }
    if (sourceEl) {
      var keyed =
        handleKey &&
        sourceEl.querySelector('[data-prototype-player-handle="' + handleKey + '"]');
      var nameEl =
        keyed ||
        sourceEl.querySelector(".tv-dashboard__friends-focus-handle-name span") ||
        sourceEl.querySelector(".fc-mobile-notif__title");
      if (nameEl && nameEl.textContent.trim()) {
        return nameEl.textContent.replace(/\s+/g, " ").trim();
      }
    }
    return "Friend";
  }

  function resolveLocalPlayerProfile(handleKey) {
    handleKey = handleKey || "local";
    if (
      typeof window.isLocalPlayerFriendKey === "function" &&
      !window.isLocalPlayerFriendKey(handleKey)
    ) {
      handleKey = "local";
    }

    var activeKey =
      typeof window.getActiveLocalPlayerKey === "function"
        ? window.getActiveLocalPlayerKey()
        : "local";
    var isActiveSelf = handleKey === activeKey;

    function localPresenceFields() {
      var disconnected = !!window.PROTOTYPE_LOCAL_PROFILE_DISCONNECTED && isActiveSelf;
      var appearOffline =
        typeof window.isLocalPlayerAppearOfflineToOthers === "function" &&
        window.isLocalPlayerAppearOfflineToOthers(handleKey);
      if (disconnected) {
        return {
          online: false,
          presenceLabel: "disconnected",
          presenceDotSrc: TV_STATUS_OFFLINE,
          presenceState: "offline",
        };
      }
      if (appearOffline && isActiveSelf) {
        return {
          online: true,
          presenceLabel: "Connected",
          presenceDotSrc: TV_STATUS_OFFLINE,
          presenceState: "offline",
        };
      }
      if (appearOffline) {
        return {
          online: false,
          presenceLabel: "Offline",
          presenceDotSrc: TV_STATUS_OFFLINE,
          presenceState: "offline",
        };
      }
      return {
        online: true,
        presenceLabel: "Connected",
        presenceDotSrc: TV_STATUS_ONLINE,
        presenceState: "online",
      };
    }

    var presence = localPresenceFields();
    var gameTitleEl = document.getElementById("fcMobileDashGameTitle");
    var playingGame =
      gameTitleEl && gameTitleEl.textContent.trim()
        ? gameTitleEl.textContent.trim()
        : localSessionGameTitle();
    if (!presence.online && !isActiveSelf) {
      playingGame = "";
    }

    if (typeof window.getLocalPlayerState === "function") {
      var playerState = window.getLocalPlayerState(handleKey);
      if (playerState) {
        return {
          handleKey: playerState.key,
          online: presence.online,
          presenceLabel: presence.presenceLabel,
          presenceDotSrc: presence.presenceDotSrc,
          presenceState: presence.presenceState,
          playingGame: playingGame,
          avatarSrc: playerState.avatar,
          achievementSummary: FRIEND_ACHIEVEMENTS_SUMMARY,
          handle: playerState.handle,
        };
      }
    }

    if (typeof window.getActiveLocalPlayerState === "function") {
      var activeState = window.getActiveLocalPlayerState();
      if (activeState && (handleKey === "local" || handleKey === activeState.key)) {
        return {
          handleKey: activeState.key,
          online: presence.online,
          presenceLabel: presence.presenceLabel,
          presenceDotSrc: presence.presenceDotSrc,
          presenceState: presence.presenceState,
          playingGame: playingGame,
          avatarSrc: activeState.avatar,
          achievementSummary: FRIEND_ACHIEVEMENTS_SUMMARY,
          handle: activeState.handle,
        };
      }
    }

    var dash = getRoot();
    var handle = "You";
    var ph = window.PROTOTYPE_PLAYER_HANDLES;
    if (ph && ph[handleKey]) {
      handle = String(ph[handleKey]).replace(/\s+/g, " ").trim();
    } else if (ph && ph.local) {
      handle = String(ph.local).replace(/\s+/g, " ").trim();
    } else if (dash) {
      var handleEl = dash.querySelector('[data-prototype-player-handle="local"]');
      if (handleEl && handleEl.textContent.trim()) {
        handle = handleEl.textContent.replace(/\s+/g, " ").trim();
      }
    }

    var avatarSrc = "";
    if (dash) {
      var av = dash.querySelector(".fc-mobile-dash__avatar");
      if (av && av.getAttribute("src")) avatarSrc = av.getAttribute("src");
    }
    if (!avatarSrc) {
      var pa = window.PROTOTYPE_PLAYER_AVATARS;
      if (pa && pa[handleKey]) avatarSrc = String(pa[handleKey]).trim();
      else if (pa && pa.local) avatarSrc = String(pa.local).trim();
    }
    if (!avatarSrc) {
      var tvProf = document.querySelector(".tv-dashboard__profile-focus-avatar-img");
      if (tvProf && tvProf.getAttribute("src")) avatarSrc = tvProf.getAttribute("src");
    }

    return {
      handleKey: handleKey,
      online: presence.online,
      presenceLabel: presence.presenceLabel,
      presenceDotSrc: presence.presenceDotSrc,
      presenceState: presence.presenceState,
      playingGame: playingGame,
      avatarSrc: avatarSrc,
      achievementSummary: FRIEND_ACHIEVEMENTS_SUMMARY,
      handle: handle,
    };
  }

  function resolveFriendProfile(sourceEl, handleKey) {
    if (typeof window.normalizeLobbyProfileHandleKey === "function") {
      handleKey = window.normalizeLobbyProfileHandleKey(handleKey, sourceEl);
    }
    if (
      handleKey === "local" ||
      (typeof window.isLocalPlayerFriendKey === "function" &&
        window.isLocalPlayerFriendKey(handleKey))
    ) {
      return resolveLocalPlayerProfile(handleKey);
    }
    if (typeof window.resolvePrototypeFriendProfile === "function") {
      return window.resolvePrototypeFriendProfile({
        sourceElement: sourceEl,
        handleKey:
          handleKey ||
          (sourceEl && sourceEl.getAttribute("data-player-panel-handle-key")),
      });
    }
    return null;
  }

  function friendAvatarFromSource(sourceEl, fallback) {
    if (sourceEl) {
      var cardImg = sourceEl.querySelector(
        ".tv-dashboard__friends-focus-player-avatar-img"
      );
      if (cardImg && cardImg.getAttribute("src")) return cardImg.getAttribute("src");
      var mobileThumb = sourceEl.querySelector(".fc-mobile-notif__thumb-game");
      if (mobileThumb && mobileThumb.getAttribute("src")) return mobileThumb.getAttribute("src");
      var listImg = sourceEl.querySelector(".game-invite-list__avatar img");
      if (listImg && listImg.getAttribute("src")) return listImg.getAttribute("src");
      var lobbyImg = sourceEl.querySelector(".tv-gameplay-interactive__avatar img");
      if (lobbyImg && lobbyImg.getAttribute("src")) return lobbyImg.getAttribute("src");
    }
    var key = sourceEl && sourceEl.getAttribute("data-player-panel-handle-key");
    var pa = window.PROTOTYPE_PLAYER_AVATARS;
    if (key && pa && pa[key]) return String(pa[key]).trim();
    return fallback || "assets/profile-avatars/type-01-scarlet.png";
  }

  function clearDetailCta() {
    var cta = document.getElementById("fcMobileNotifDetailCta");
    if (cta) cta.replaceChildren();
  }

  function addDetailBtn(label, variant, onClick) {
    var cta = document.getElementById("fcMobileNotifDetailCta");
    if (!cta) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "fc-mobile-notif-detail__btn fc-mobile-notif-detail__btn--" +
      (variant === "primary" ? "primary" : "secondary");
    btn.textContent = label;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    cta.appendChild(btn);
  }

  function populateGameInviteDetail(tvRow, pack) {
    var inviter = inviterHandle();
    var nameEl = tvRow.querySelector(".game-invite-list__name");
    if (nameEl) {
      var invSpan = nameEl.querySelector("[data-prototype-player-handle='inviter']");
      if (invSpan && invSpan.textContent.trim()) inviter = invSpan.textContent.trim();
    }


    setHeroImage(
      pack.gameInviteLogo || "assets/raster/game-invite-tv-61-6933/fifa-logo-lockup.png",
      "logo"
    );
    setElText("fcMobileNotifDetailTitle", inviter + " invited you to play");
    setElText("fcMobileNotifDetailSubtitle", "");
    setElText("fcMobileNotifDetailCopy", GAME_INVITE_JOIN_MESSAGE);
    setElHidden("fcMobileNotifDetailCopy", false);

    wireDetailOutcomeActions(tvRow, "game-invite", "Join Game", "Decline");
  }

  function populateFriendRequestDetail(tvRow, pack) {
    var handle = friendRowHandle(tvRow);
    var avatarSrc = friendRowAvatar(tvRow, pack.friendAvatarSample);


    setHeroImage(avatarSrc, "avatar");
    setElText("fcMobileNotifDetailTitle", "");
    setElHidden("fcMobileNotifDetailTitle", true);
    if (friendRequestShowsSameAccountNote(handle)) {
      setElText("fcMobileNotifDetailSubtitle", FRIEND_REQUEST_ACCOUNT_NOTE);
      setElHidden("fcMobileNotifDetailSubtitle", false);
    } else {
      setElText("fcMobileNotifDetailSubtitle", "");
      setElHidden("fcMobileNotifDetailSubtitle", true);
    }
    setElText("fcMobileNotifDetailLead", friendRequestLeadCopy(handle));
    setElText("fcMobileNotifDetailCopy", FRIEND_REQUEST_COPY_BODY);
    setElHidden("fcMobileNotifDetailLead", false);
    setElHidden("fcMobileNotifDetailCopy", false);

    wireDetailOutcomeActions(tvRow, "friend-request", "Accept", "Decline");
  }

  function populateNonFriendProfileDetail(opts, pack) {
    var handleKey = opts && opts.handleKey;
    var tvRow = opts && opts.tvRow;
    var sourceEl =
      (opts && opts.sourceElement) || tvRow || friendsFocusCardForKey(handleKey);
    var handle =
      (opts && opts.handle) ||
      (tvRow ? friendRowHandle(tvRow) : "") ||
      resolveHandleForFriendKey(handleKey, sourceEl);
    var avatarSrc =
      friendAvatarFromSource(sourceEl, pack.friendAvatarSample) ||
      (typeof window.getLocalPlayerState === "function" &&
        window.getLocalPlayerState(handleKey) &&
        window.getLocalPlayerState(handleKey).avatar) ||
      "";

    setHeroImage(avatarSrc, "avatar");
    setElText("fcMobileNotifDetailTitle", handle);
    setElText("fcMobileNotifDetailSubtitle", "");
    setElHidden("fcMobileNotifDetailSubtitle", true);
    setElHidden("fcMobileNotifDetailStatus", true);
    setElHidden("fcMobileNotifDetailMeta", true);
    // Non-friends don't expose a last-played game — that's a friends-only detail.
    setElHidden("fcMobileNotifDetailLastPlayed", true);

    var card = document.getElementById("fcMobileNotifDetailCard");
    if (card) {
      card.classList.remove("is-offline");
      card.className =
        "fc-mobile-notif-detail__card fc-mobile-notif-detail__card--non-friend";
      card.setAttribute("data-notif-kind", "non-friend");
    }

    var imageWrap = document.querySelector(".fc-mobile-notif-detail__image-wrap");
    if (imageWrap && typeof window.PrototypePresence !== "undefined") {
      window.PrototypePresence.applyPresenceToAvatar(imageWrap, "offline");
      imageWrap.classList.remove(
        "fc-mobile-dash__friend-status--online",
        "fc-mobile-dash__friend-status--idle",
        "fc-mobile-dash__friend-status--offline"
      );
    }

    wireNonFriendFriendInviteDetailAction(handleKey, sourceEl);
  }

  function populateLocalProfilePanel(handle, avatarSrc) {
    var card = document.getElementById("fcMobileNotifDetailCard");
    if (card) {
      card.className = "fc-mobile-notif-detail__card fc-mobile-notif-detail__card--local-profile";
      card.setAttribute("data-notif-kind", "local-profile");
      card.classList.remove("is-offline");
      card.removeAttribute("data-notif-outcome");
    }

    var avatarEl = document.getElementById("fcLocalProfileAvatar");
    if (avatarEl && avatarSrc) avatarEl.setAttribute("src", avatarSrc);
    applyProfileAvatarGlow(
      avatarEl,
      document.querySelector(".fc-mobile-local-profile__avatar-wrap")
    );

    var handleEl = document.getElementById("fcLocalProfileHandle");
    if (handleEl) handleEl.textContent = handle || "";

    var achEl = document.getElementById("fcLocalProfileAchievements");
    if (achEl) achEl.textContent = profileAchievementsSummary(handle || "you");

    var gameTitleEl = document.getElementById("fcMobileDashGameTitle");
    var gameTitle = gameTitleEl ? gameTitleEl.textContent.trim() : "FIFA World Cup";
    var gameNameEl = document.getElementById("fcLocalProfileGameName");
    if (gameNameEl) gameNameEl.textContent = gameTitle;

    var detailPack = window.FIGMA_MOBILE_DASHBOARD_NOTIFICATIONS_DETAIL_ASSETS || {};
    var panel = document.getElementById("fcMobileLocalProfile");
    if (panel && detailPack) {
      panel.querySelectorAll("[data-md-notif-detail]").forEach(function (el) {
        var key = el.getAttribute("data-md-notif-detail");
        if (key && detailPack[key]) el.setAttribute("src", detailPack[key]);
      });
    }

    var closeBtn = document.getElementById("fcLocalProfileCloseBtn");
    if (closeBtn) {
      closeBtn.onclick = function () {
        if (typeof window.closeMobileNotificationDetail === "function") {
          window.closeMobileNotificationDetail();
        } else if (typeof window.resetMobileNotificationDetailL3 === "function") {
          window.resetMobileNotificationDetailL3();
        }
      };
    }

    var editBtn = document.getElementById("fcLocalProfileEditBtn");
    if (editBtn) {
      editBtn.onclick = function () {
        if (typeof window.openMobileEditProfileL2 === "function") {
          window.openMobileEditProfileL2({ fromDetail: true });
        }
      };
    }

    var shareBtn = document.getElementById("fcLocalProfileShareBtn");
    if (shareBtn) {
      shareBtn.onclick = function () {
        if (typeof window.openProfileShareSheet === "function") {
          window.openProfileShareSheet();
        }
      };
    }

    var lastPlayedBtn = document.getElementById("fcLocalProfileLastPlayed");
    if (lastPlayedBtn) {
      lastPlayedBtn.onclick = function () {
        if (typeof window.openLastPlayedShareSheet === "function") {
          window.openLastPlayedShareSheet();
        }
      };
    }
  }

  function populateFriendConnectedDetail(opts, pack) {
    var handleKey =
      (opts && opts.handleKey) ||
      (opts && opts.tvRow && opts.tvRow.getAttribute("data-player-panel-handle-key"));

    if (handleKey && handleKey !== "local" && !isProfileFriend(handleKey)) {
      populateNonFriendProfileDetail(opts, pack);
      return;
    }

    var tvRow = opts && opts.tvRow;
    var sourceEl =
      (opts && opts.sourceElement) ||
      tvRow ||
      friendsFocusCardForKey(handleKey);
    var handle =
      (opts && opts.handle) ||
      (handleKey ? resolveHandleForFriendKey(handleKey, sourceEl) : "") ||
      (tvRow ? friendRowHandle(tvRow) : resolveHandleForFriendKey(handleKey, sourceEl));
    if (handle === "Friend" && handleKey) {
      var phHandle = resolveHandleForFriendKey(handleKey, friendsFocusCardForKey(handleKey));
      if (phHandle && phHandle !== "Friend") handle = phHandle;
    }
    var profile = resolveFriendProfile(sourceEl, handleKey);
    var avatarSrc =
      (profile && profile.avatarSrc) ||
      (tvRow ? friendRowAvatar(tvRow, pack.friendAvatarSample) : "") ||
      friendAvatarFromSource(sourceEl, pack.friendAvatarSample);
    var isOffline = profile
      ? !profile.online
      : tvRow
        ? tvRow.getAttribute("data-friend-online") !== "true"
        : true;
    var card = document.getElementById("fcMobileNotifDetailCard");
    var playingGame = profile
      ? profile.playingGame
      : (tvRow && tvRow.getAttribute("data-friend-playing-game")) || "";

    if (isActiveLocalPlayerProfileKey(handleKey)) {
      populateLocalProfilePanel(handle, avatarSrc);
      return;
    }

    setHeroImage(avatarSrc, "avatar");
    setElText("fcMobileNotifDetailTitle", handle);
    setElText("fcMobileNotifDetailSubtitle", profileAchievementsSummary(handleKey));

    var statusWrap = document.getElementById("fcMobileNotifDetailStatus");
    var statusDot = document.getElementById("fcMobileNotifDetailStatusDot");
    var statusLabel = document.getElementById("fcMobileNotifDetailStatusLabel");
    if (statusWrap) statusWrap.hidden = false;
    if (card) card.classList.toggle("is-offline", isOffline);
    var presenceState =
      profile && profile.presenceState
        ? profile.presenceState
        : isOffline
          ? "offline"
          : playingGame
            ? "online"
            : profile && profile.online === false
              ? "offline"
              : "idle";
    var presenceText =
      (profile && profile.presenceLabel) ||
      (typeof window.PrototypePresence !== "undefined"
        ? window.PrototypePresence.formatOnlinePlayerStatus(
            {
              state: presenceState,
              gameTitle: playingGame || "",
            },
            { suppressGameTitle: !!(playingGame && !isOffline) }
          )
        : isOffline
          ? "Offline"
          : "Online");
    if (statusDot) statusDot.hidden = true;
    // Online status shows as a row (dot + label) below the avatar — not a corner
    // dot on the avatar. Strip any avatar dot and force the row to show its dot.
    var imageWrap = document.querySelector(".fc-mobile-notif-detail__image-wrap");
    if (imageWrap) {
      var avatarDot = imageWrap.querySelector(".fc-presence-dot--avatar");
      if (avatarDot) avatarDot.remove();
    }
    if (typeof window.PrototypePresence !== "undefined") {
      window.PrototypePresence.applyPresenceStatusRow(
        statusWrap,
        presenceState,
        presenceText,
        { hideDotWhenAvatarNearby: false }
      );
    } else if (statusLabel) {
      statusLabel.textContent = presenceText;
    }

    // The game they're playing is shown as a "Last played" card pinned to the
    // bottom (matching the self profile's card), so hide the inline game line.
    setElHidden("fcMobileNotifDetailMeta", true);
    var lastPlayedCard = document.getElementById("fcMobileNotifDetailLastPlayed");
    if (lastPlayedCard) {
      if (!isActiveLocalPlayerProfileKey(handleKey) && playingGame && !isOffline) {
        var lpTitle = document.getElementById("fcMobileNotifDetailLastPlayedTitle");
        var lpArt = document.getElementById("fcMobileNotifDetailLastPlayedArt");
        if (lpTitle) lpTitle.textContent = playingGame;
        if (lpArt) {
          lpArt.style.backgroundImage =
            "url('assets/raster/game-invite-1-6683/game-art-hero.png')";
        }
        lastPlayedCard.hidden = false;
      } else {
        lastPlayedCard.hidden = true;
      }
    }

    wireFriendGameInviteDetailAction(handleKey, sourceEl);
  }

  function isLobbyGameplayActive() {
    var inter = document.getElementById("tvGameplayInteractiveDefault");
    return !!(inter && inter.classList.contains("is-active"));
  }

  function getVisibleLobbyPlayerRows() {
    var inter = document.getElementById("tvGameplayInteractiveDefault");
    if (!inter) return [];
    return Array.prototype.slice.call(
      inter.querySelectorAll(
        ".tv-gameplay-interactive__row-btn:not(.tv-gameplay-interactive__row--join-hidden)"
      )
    );
  }

  function isSameLobbyPlayer(handleKey, sourceElement, lobbyRow) {
    if (!lobbyRow) return false;
    var lobbyKey = lobbyRow.getAttribute("data-player-panel-handle-key");
    if (handleKey && lobbyKey && handleKey === lobbyKey) return true;
    if (sourceElement && sourceElement === lobbyRow) return true;

    var profileHandle = resolveHandleForFriendKey(handleKey, sourceElement || null);
    var lobbyNameEl =
      lobbyRow.querySelector(".tv-gameplay-interactive__name span") ||
      lobbyRow.querySelector("[data-prototype-player-handle]");
    var lobbyHandle = lobbyNameEl
      ? lobbyNameEl.textContent.replace(/\s+/g, " ").trim()
      : "";
    if (
      profileHandle &&
      lobbyHandle &&
      profileHandle.localeCompare(lobbyHandle, undefined, { sensitivity: "base" }) === 0
    ) {
      return true;
    }

    var ph = window.PROTOTYPE_PLAYER_HANDLES;
    if (handleKey && lobbyKey && ph && ph[handleKey] && ph[lobbyKey] && ph[handleKey] === ph[lobbyKey]) {
      return true;
    }

    return false;
  }

  function isPlayerInActiveLobby(handleKey, sourceElement) {
    if (!isLobbyGameplayActive()) return false;
    var rows = getVisibleLobbyPlayerRows();
    for (var i = 0; i < rows.length; i++) {
      if (isSameLobbyPlayer(handleKey, sourceElement, rows[i])) return true;
    }
    return false;
  }

  function isLobbyGameplayActive() {
    var assets = window.FIGMA_MOBILE_DASHBOARD_ASSETS;
    return (assets && assets.hiddenAchievementThumb) || "";
  }

  function populateAchievementDetailContent(opts, pack) {
    opts = opts || {};
    var tvRow = opts.tvRow || null;
    var kind = opts.kind || (tvRow && tvRow.getAttribute("data-achievement-kind")) || "";
    var title =
      opts.title ||
      (tvRow && tvRow.getAttribute("data-achievement-title")) ||
      "Achievement unlocked";
    var description =
      opts.description ||
      (tvRow && tvRow.getAttribute("data-achievement-description")) ||
      "";
    var date =
      opts.date || (tvRow && tvRow.getAttribute("data-achievement-date")) || "";
    var imageSrc =
      opts.imageSrc || (tvRow && tvRow.getAttribute("data-achievement-image")) || "";

    if (kind === "mystery") {
      title = title || "Hidden";
      description = "To reveal this achievement, keep playing!";
      imageSrc = hiddenAchievementThumbSrc();
    } else if (!description) {
      description = "You completed a new milestone in " + localSessionGameTitle() + ".";
    }

    if (kind === "locked") {
      if (!imageSrc && title) {
        var lockedArt = {
          "Perfect Hat Trick": "assets/raster/dashboard-achievements-fifa/fifa-unlock-01.svg",
          "Champions Rising": "assets/raster/dashboard-achievements-fifa/fifa-unlock-02.svg",
          "Set Piece Architect": "assets/raster/dashboard-achievements-fifa/fifa-unlock-03.svg",
          "Pro Clubs Captain": "assets/raster/dashboard-achievements-fifa/fifa-unlock-04.svg",
          "Skill Move Maestro": "assets/raster/dashboard-achievements-fifa/fifa-unlock-02.svg"
        };
        imageSrc = lockedArt[title] || "";
      }
    } else if (kind !== "mystery" && !imageSrc) {
      imageSrc =
        pack.achievementImage ||
        "assets/raster/dashboard-achievements-fifa/fifa-unlock-01.svg";
    }

    setHeroImage(imageSrc, "achievement");
    setElText("fcMobileNotifDetailTitle", title);
    setElText("fcMobileNotifDetailSubtitle", localSessionGameTitle());
    setElHidden("fcMobileNotifDetailSubtitle", false);

    if (description) {
      setElText("fcMobileNotifDetailCopy", description);
      setElHidden("fcMobileNotifDetailCopy", false);
    }

    if (kind === "locked" || kind === "mystery") {
      setElText("fcMobileNotifDetailTime", "Locked");
      setElHidden("fcMobileNotifDetailTime", false);
    } else if (date) {
      setElText("fcMobileNotifDetailTime", date);
      setElHidden("fcMobileNotifDetailTime", false);
    }

    var card = document.getElementById("fcMobileNotifDetailCard");
    if (card) {
      card.classList.remove(
        "fc-mobile-notif-detail__card--achievement-locked",
        "fc-mobile-notif-detail__card--achievement-mystery"
      );
      if (kind === "locked") {
        card.classList.add("fc-mobile-notif-detail__card--achievement-locked");
      } else if (kind === "mystery") {
        card.classList.add("fc-mobile-notif-detail__card--achievement-mystery");
      }
    }

    var ctaStage = document.getElementById("fcMobileNotifDetailCtaStage");
    if (ctaStage) ctaStage.hidden = true;
  }

  function populateAchievementDetail(tvRow, pack) {
    populateAchievementDetailContent({ tvRow: tvRow }, pack);
  }

  function populateScoreBeatenDetail(tvRow) {
    var nameEl = tvRow.querySelector(".game-invite-list__name");
    var timeEl = tvRow.querySelector(".game-invite-list__notification-time");

    // No game/last-played card in notifications — that treatment lives only in the
    // player profile view. Text only here (resetDetailContent already cleared the hero).
    setElText("fcMobileNotifDetailTitle", nameEl ? nameEl.textContent.trim() : "");
    setElText(
      "fcMobileNotifDetailSubtitle",
      timeEl ? timeEl.textContent.trim() : ""
    );

    addDetailBtn("View", "primary", function () {
      markTvRowRead(tvRow);
      closeNotificationDetailL3();
      if (typeof window.syncMobileNotificationList === "function") {
        window.syncMobileNotificationList();
      }
    });
  }

  function populateGenericDetail(tvRow) {
    var nameEl = tvRow.querySelector(".game-invite-list__name");
    var subEl = tvRow.querySelector(".game-invite-list__sub");
    var timeEl = tvRow.querySelector(".game-invite-list__notification-time");
    var title = nameEl ? nameEl.textContent.trim() : "Notification";
    var subtitle =
      (subEl && subEl.textContent.trim()) ||
      (timeEl && timeEl.textContent.trim()) ||
      "";


    setElText("fcMobileNotifDetailTitle", title);
    setElText("fcMobileNotifDetailSubtitle", subtitle);

    addDetailBtn("View", "primary", function () {
      markTvRowRead(tvRow);
      closeNotificationDetailL3();
      if (typeof window.syncMobileNotificationList === "function") {
        window.syncMobileNotificationList();
      }
    });
  }

  function populateDetailCard(tvRow) {
    var card = document.getElementById("fcMobileNotifDetailCard");
    if (!card || !tvRow) return;

    var kind = rowKind(tvRow);
    var pack = detailAssets();
    card.className = "fc-mobile-notif-detail__card fc-mobile-notif-detail__card--" + kind;
    card.setAttribute("data-notif-kind", kind);
    card.classList.remove("is-offline");

    resetDetailContent();

    if (kind === "game-invite") populateGameInviteDetail(tvRow, pack);
    else if (kind === "friend-request") populateFriendRequestDetail(tvRow, pack);
    else if (kind === "friend-connected") populateFriendConnectedDetail({ tvRow: tvRow }, pack);
    else if (kind === "achievement") populateAchievementDetail(tvRow, pack);
    else if (kind === "score-beaten") populateScoreBeatenDetail(tvRow);
    else populateGenericDetail(tvRow);
  }

  function ensureNotificationsL2() {
    if (typeof window.openMobileDashboardNotifications === "function") {
      window.openMobileDashboardNotifications();
    }
  }

  function openFriendConnectedDetailL3(opts) {
    opts = opts || {};
    var handleKey = opts.handleKey;
    if (!handleKey || !canOpenMobileDetailUi()) return;
    var root = getRoot();
    if (!root) return;

    if (
      l3Open &&
      !l3Animating &&
      activeFriendHandleKey === handleKey &&
      isMobileDetailSubPage() &&
      root.getAttribute("data-mobile-dashboard-l2") === "detail"
    ) {
      return;
    }

    if (!isMobileDetailSubPage()) {
      applyL3EnterMode(root, opts.enter === "panel" ? "panel" : null);
    }

    if (!isMobileDashOpen()) {
      if (typeof window.setMobileDashboardOpen === "function") {
        window.setMobileDashboardOpen(true, { mobileView: "home" });
      }
    }

    /* Open from home friends — keep notifications L2 visible when returning there. */
    var returnL2 = resolveDetailReturnL2(root, opts);
    if (
      !isMobileDetailSubPage() &&
      root.getAttribute("data-mobile-dashboard-l2") === "notifications" &&
      returnL2 !== "notifications"
    ) {
      root.removeAttribute("data-mobile-dashboard-l2");
      var notifViewHide = document.getElementById("fcMobileDashViewNotifications");
      if (notifViewHide) notifViewHide.setAttribute("aria-hidden", "true");
    }

    if (l3Animating) l3Animating = false;

    var sourceEl = opts.sourceElement || friendsFocusCardForKey(handleKey);
    var pack = detailAssets();
    var card = document.getElementById("fcMobileNotifDetailCard");
    if (card) {
      card.className =
        "fc-mobile-notif-detail__card fc-mobile-notif-detail__card--friend-connected";
      card.setAttribute("data-notif-kind", "friend-connected");
      card.classList.remove("is-offline");
      card.removeAttribute("data-notif-outcome");
    }

    activeTvRow = null;
    activeFriendHandleKey = handleKey;
    resetDetailContent();
    populateFriendConnectedDetail(
      {
        handleKey: handleKey,
        sourceElement: sourceEl,
        handle: opts.handle,
      },
      pack
    );

    applyDetailNavigationOpen(root, {
      enter: opts.enter,
      returnL2: resolveDetailReturnL2(root, opts),
    });
    finishDetailOpen(root);
  }

  function openAchievementDetailL3(opts) {
    opts = opts || {};
    if (!canOpenMobileDetailUi()) return;
    var root = getRoot();
    if (!root) return;

    if (!isMobileDashOpen()) {
      if (typeof window.setMobileDashboardOpen === "function") {
        window.setMobileDashboardOpen(true, { mobileView: "home" });
      }
    }

    if (typeof window.closeAllMobilePopoverMenus === "function") {
      window.closeAllMobilePopoverMenus();
    }

    activeTvRow = opts.tvRow || null;
    activeFriendHandleKey = null;
    if (activeTvRow) markTvRowRead(activeTvRow);

    var card = document.getElementById("fcMobileNotifDetailCard");
    if (card) {
      card.className = "fc-mobile-notif-detail__card fc-mobile-notif-detail__card--achievement";
      card.setAttribute("data-notif-kind", "achievement");
      card.classList.remove("is-offline");
      card.removeAttribute("data-notif-outcome");
    }

    resetDetailContent();
    populateAchievementDetailContent(opts, detailAssets());

    applyDetailNavigationOpen(root, {
      enter: opts.enter,
      returnL2: resolveDetailReturnL2(root, opts),
    });
    finishDetailOpen(root);
    if (activeTvRow && typeof window.syncMobileNotificationList === "function") {
      window.syncMobileNotificationList();
    }
  }

  function openNotificationDetailL3(tvRow, uiOpts) {
    uiOpts = uiOpts || {};
    if (!tvRow || !canOpenMobileDetailUi()) return;
    var root = getRoot();
    if (!root) return;

    if (!isMobileDashOpen() || root.getAttribute("data-mobile-dashboard-view") !== "home") {
      if (typeof window.setMobileDashboardOpen === "function") {
        window.setMobileDashboardOpen(true, { mobileView: "home" });
      }
    }

    if (isMobileDetailSubPage()) {
      if (typeof window.syncMobileNotificationList === "function") {
        window.syncMobileNotificationList();
      }
    } else {
      ensureNotificationsL2();
    }

    activeTvRow = tvRow;
    activeFriendHandleKey = null;
    markTvRowRead(tvRow);
    populateDetailCard(tvRow);

    applyDetailNavigationOpen(root, {
      enter: uiOpts.enter,
      returnL2:
        uiOpts.returnL2 !== undefined
          ? uiOpts.returnL2
          : uiOpts.enter === "panel"
            ? null
            : "notifications",
    });
    finishDetailOpen(root);
  }

  function closeMobileNotificationDetailForRow(tvRow) {
    if (l3Open && activeTvRow === tvRow) {
      closeNotificationDetailL3();
    }
  }

  function closeNotificationDetailL3() {
    var root = getRoot();
    if (!root || !l3Open || l3Animating) return;

    clearDetailOutcomeTimers();

    l3Animating = true;
    l3Open = false;
    activeTvRow = null;
    activeFriendHandleKey = null;
    applyDetailNavigationClose(root);

    var detailView = document.getElementById("fcMobileDashViewNotifDetail");
    var closeMs = l3EnterAnimMs();
    window.setTimeout(function () {
      if (detailView && !l3Open) {
        detailView.setAttribute("aria-hidden", "true");
      }
      l3Animating = false;
      if (typeof window.syncMobileDashboardMissedCard === "function") {
        window.syncMobileDashboardMissedCard();
      }
      if (typeof window.scheduleMobileDashboardViewScrollSync === "function") {
        window.scheduleMobileDashboardViewScrollSync();
      }
    }, closeMs);
  }

  function resetNotificationDetailL3() {
    resetDetailCtaStage();
    l3Open = false;
    l3Animating = false;
    activeTvRow = null;
    activeFriendHandleKey = null;
    detailReturnL2 = null;
    var root = getRoot();
    if (root) {
      root.removeAttribute("data-mobile-dashboard-l3");
      root.removeAttribute("data-mobile-dashboard-l3-enter");
      root.removeAttribute("data-mobile-dashboard-l2-enter");
      if (root.getAttribute("data-mobile-dashboard-l2") === "detail") {
        root.removeAttribute("data-mobile-dashboard-l2");
      }
      root.removeAttribute("data-mobile-detail-return");
    }
    if (typeof window.resetMobileDashboardEditProfileL2 === "function") {
      window.resetMobileDashboardEditProfileL2();
    }
    var detailView = document.getElementById("fcMobileDashViewNotifDetail");
    if (detailView) detailView.setAttribute("aria-hidden", "true");
    if (typeof window.syncMobileDashboardMissedCard === "function") {
      window.syncMobileDashboardMissedCard();
    }
  }

  function serializeActiveTvRow(tvRow) {
    if (!tvRow) return null;
    return {
      handleKey: tvRow.getAttribute("data-player-panel-handle-key"),
      source: tvRow.getAttribute("data-notification-source"),
      notifId: tvRow.getAttribute("data-local-player-notif-id"),
    };
  }

  function findActiveTvRow(ref) {
    if (!ref) return null;
    var track = getTvTrack();
    if (!track) return null;
    if (ref.notifId) {
      var byId = track.querySelector(
        '.game-invite-list__item[data-local-player-notif-id="' + ref.notifId + '"]'
      );
      if (byId) return byId;
    }
    if (ref.handleKey && ref.source) {
      var items = track.querySelectorAll(
        '.game-invite-list__item[data-notification-source="' + ref.source + '"]'
      );
      for (var i = 0; i < items.length; i++) {
        if (items[i].getAttribute("data-player-panel-handle-key") === ref.handleKey) {
          return items[i];
        }
      }
    }
    return null;
  }

  function captureMobileDetailUiForLocalPlayer(playerKey) {
    if (!playerKey) return;
    var root = getRoot();
    var card = detailOutcomeHost();
    var stage = document.getElementById("fcMobileNotifDetailCtaStage");
    mobileDetailUiByPlayerKey[playerKey] = {
      l3Open: l3Open,
      l3Enter: root ? root.getAttribute("data-mobile-dashboard-l3-enter") : null,
      detailReturnL2: detailReturnL2,
      activeFriendHandleKey: activeFriendHandleKey,
      activeTvRowRef: serializeActiveTvRow(activeTvRow),
      notifOutcome: card ? card.getAttribute("data-notif-outcome") : null,
      friendInviteKey: card ? card.getAttribute("data-friend-invite-key") : null,
      notifKind: card ? card.getAttribute("data-notif-kind") : null,
      ctaStageOutcome: stage ? stage.getAttribute("data-outcome") : null,
    };
  }

  function resetActiveLocalPlayerMobileDetailUi() {
    resetNotificationDetailL3();
    resetDetailContent();
  }

  function restoreFriendRequestSentConfirmation(handleKey) {
    if (!handleKey) return;
    if (
      typeof window.hasOutgoingFriendRequestFromActive === "function" &&
      !window.hasOutgoingFriendRequestFromActive(handleKey)
    ) {
      return;
    }
    var stage = document.getElementById("fcMobileNotifDetailCtaStage");
    var cta = document.getElementById("fcMobileNotifDetailCta");
    var host = detailOutcomeHost();
    showFriendRequestSentConfirmation(stage, cta, host, handleKey);
  }

  function restoreMobileDetailUiForLocalPlayer(playerKey) {
    var snapshot = mobileDetailUiByPlayerKey[playerKey];
    if (!snapshot || !snapshot.l3Open || !canOpenMobileDetailUi()) return;

    l3Animating = false;
    detailReturnL2 = snapshot.detailReturnL2 || null;

    if (snapshot.activeTvRowRef) {
      var tvRow = findActiveTvRow(snapshot.activeTvRowRef);
      if (tvRow) {
        openNotificationDetailL3(tvRow, {
          enter: snapshot.l3Enter === "panel" ? "panel" : null,
        });
        return;
      }
    }

    if (!snapshot.activeFriendHandleKey) return;

    openFriendConnectedDetailL3({
      handleKey: snapshot.activeFriendHandleKey,
      enter: snapshot.l3Enter === "panel" ? "panel" : null,
    });

    if (
      snapshot.notifOutcome === "done" &&
      snapshot.notifKind === "non-friend" &&
      snapshot.friendInviteKey &&
      typeof window.isActiveLocalPlayerFriend === "function" &&
      !window.isActiveLocalPlayerFriend(snapshot.friendInviteKey)
    ) {
      window.requestAnimationFrame(function () {
        restoreFriendRequestSentConfirmation(snapshot.friendInviteKey);
      });
    }
  }

  function openMobileLocalProfile() {
    if (!isEvolutionMode() || !canOpenMobileDetailUi()) return;

    if (typeof window.closeAllMobilePopoverMenus === "function") {
      window.closeAllMobilePopoverMenus();
    }
    if (typeof window.resetMobileDashboardNotificationsL2 === "function") {
      window.resetMobileDashboardNotificationsL2();
    }
    if (typeof window.resetMobileDashboardFriendsL2 === "function") {
      window.resetMobileDashboardFriendsL2();
    }
    if (typeof window.resetMobileDashboardAchievementsL2 === "function") {
      window.resetMobileDashboardAchievementsL2();
    }

    openFriendConnectedDetailL3({ handleKey: "local" });
  }

  function gameInviteInviterHandle(tvRow) {
    if (!tvRow) return "Friend";
    var invSpan = tvRow.querySelector('[data-prototype-player-handle="inviter"]');
    if (invSpan && invSpan.textContent.trim()) return invSpan.textContent.trim();
    var ph = window.PROTOTYPE_PLAYER_HANDLES;
    if (ph && ph.inviter) return String(ph.inviter).replace(/\s+/g, " ").trim();
    return "Friend";
  }

  function openNotificationSenderProfileDetail(tvRow, uiOpts) {
    uiOpts = uiOpts || {};
    if (!tvRow || !canOpenMobileDetailUi()) return;

    if (typeof window.closeAllMobilePopoverMenus === "function") {
      window.closeAllMobilePopoverMenus();
    }

    var kind = rowKind(tvRow);
    var returnL2 =
      uiOpts.returnL2 !== undefined ? uiOpts.returnL2 : "notifications";

    if (kind === "achievement") {
      openMobileLocalProfile();
      return;
    }

    if (kind === "game-invite") {
      var handleKey =
        uiOpts.handleKey ||
        (typeof window.resolveNotificationSenderHandleKey === "function"
          ? window.resolveNotificationSenderHandleKey(tvRow)
          : tvRow.getAttribute("data-player-panel-handle-key") || "inviter");
      openFriendConnectedDetailL3({
        handleKey: handleKey,
        sourceElement: tvRow,
        tvRow: tvRow,
        handle: gameInviteInviterHandle(tvRow),
        returnL2: returnL2,
      });
      return;
    }

    openNotificationDetailL3(tvRow, {
      returnL2: returnL2,
      enter: uiOpts.enter,
    });
  }

  function openMobileFriendDetailByHandleKey(handleKey, opts) {
    opts = opts || {};
    if (typeof window.normalizeLobbyProfileHandleKey === "function") {
      handleKey = window.normalizeLobbyProfileHandleKey(handleKey, opts.sourceElement);
    }
    openFriendConnectedDetailL3(Object.assign({ handleKey: handleKey }, opts));
  }

  function resolveToastNotificationRow() {
    var track = getTvTrack();
    if (!track) return null;
    var app = getApp();

    if (app && app.getAttribute("data-tv-friend-invite-toast") === "active") {
      var fr = window.__tvFriendInviteToastPerson;
      if (fr && fr.notificationRow && fr.notificationRow.parentNode) {
        return fr.notificationRow;
      }
      return (
        track.querySelector(
          '.game-invite-list__item[data-notification-source="friend-request"].game-invite-list__item--notification-unread'
        ) ||
        track.querySelector('.game-invite-list__item[data-notification-source="friend-request"]')
      );
    }

    if (app && app.getAttribute("data-tv-game-invite-toast") === "active") {
      return track.querySelector(
        '.game-invite-list__item[data-notification-source="tv-game-invite-toast"]'
      );
    }

    return track.querySelector(".game-invite-list__item");
  }

  function openNotificationDetailFromToast() {
    if (!isEvolutionMode()) return;

    var app = getApp();
    var achMeta = window.__tvAchievementToastMeta;
    var isAchievementToast =
      app && app.getAttribute("data-tv-achievement-toast") === "active";

    if (typeof window.dismissEvolutionControllerToastImmediately === "function") {
      window.dismissEvolutionControllerToastImmediately();
    }

    if (isAchievementToast && achMeta && achMeta.achievement) {
      if (typeof window.openMobileAchievementDetail === "function") {
        window.openMobileAchievementDetail(
          Object.assign({}, achMeta.achievement, { enter: "panel" })
        );
      }
      return;
    }

    var row = resolveToastNotificationRow();
    if (!row) return;
    openNotificationDetailL3(row, { enter: "panel" });
    if (typeof window.syncMobileNotificationList === "function") {
      window.syncMobileNotificationList();
    }
  }

  function openNotificationDetailByIndex(index) {
    var track = getTvTrack();
    if (!track) return;
    var rows = track.querySelectorAll(".game-invite-list__item");
    var row = rows[index];
    if (row) openNotificationDetailL3(row);
  }

  function hydrateDetailAssets() {
    var pack = detailAssets();
    if (!pack) return;
    document.querySelectorAll("[data-md-notif-detail]").forEach(function (el) {
      var key = el.getAttribute("data-md-notif-detail");
      if (key && pack[key]) el.setAttribute("src", pack[key]);
    });
  }

  function handleMobileListMoreSelect(e) {
    var detail = (e && e.detail) || {};
    var context = detail.listContext || "";
    var sourceEl = detail.sourceElement || null;
    var handleKey = detail.itemId;

    if (detail.action === "stop-playing") {
      if (context !== "player" || !sourceEl || sourceEl.getAttribute("data-is-local-self") !== "1") {
        return;
      }
      if (typeof window.openMobileStopPlayingModal === "function") {
        window.openMobileStopPlayingModal();
      }
      return;
    }

    if (detail.action === "add-friend") {
      if (context !== "player" || !handleKey) return;
      var sent =
        typeof window.sendFriendRequestFromActiveToKey === "function" &&
        window.sendFriendRequestFromActiveToKey(handleKey);
      if (sent) {
        if (typeof window.showMobileDashboardStatusToast === "function") {
          window.showMobileDashboardStatusToast({
            message: "Friend Request Sent",
            iconKey: "userAddSmall",
          });
        }
        if (typeof window.syncMobileDashboardPlayerList === "function") {
          window.syncMobileDashboardPlayerList();
        }
      }
      return;
    }

    if (detail.action === "remove-controller") {
      if (context !== "player" || !handleKey) return;
      if (sourceEl && sourceEl.getAttribute("data-is-local-self") === "1") return;
      if (typeof window.openMobileRemoveControllerModal === "function") {
        window.openMobileRemoveControllerModal(handleKey);
      }
      return;
    }

    if (detail.action === "report" || detail.action === "block") {
      return;
    }

    if (detail.action !== "profile") return;

    if (context !== "friend" && context !== "friend-invite" && context !== "player") return;

    if (!handleKey) return;

    if (sourceEl && sourceEl.getAttribute("data-is-local-self") === "1") {
      openMobileLocalProfile();
      return;
    }

    openMobileFriendDetailByHandleKey(handleKey, { sourceElement: sourceEl });
  }

  function bindMobileListMoreSelect() {
    if (window.__mobileListMoreSelectBound) return;
    window.__mobileListMoreSelectBound = true;
    window.addEventListener("mobile-list-more-select", handleMobileListMoreSelect);
  }

  function bindMobileDashboardFriendDetailClicks() {
    var dash = document.getElementById("fcMobileDashboard");
    if (!dash || dash.getAttribute("data-friend-detail-bound") === "1") return;
    dash.setAttribute("data-friend-detail-bound", "1");

    dash.addEventListener(
      "click",
      function (e) {
        if (!dash.classList.contains("is-open")) return;

        if (
          e.target &&
          e.target.closest &&
          e.target.closest(
            ".fc-mobile-dash__invite-btn, .fc-mobile-notif__btn, .fc-mobile-notif__cta-stage, .fc-mobile-notif__cta, .fc-mobile-notif__row-more"
          )
        ) {
          return;
        }

        var homeList = document.getElementById("fcMobileDashHomeFriendsList");
        var friendsL2List = document.getElementById("fcMobileDashFriendsL2List");
        var inviteList = document.getElementById("fcMobileDashFriendsList");
        var playerList = document.getElementById("fcMobileDashPlayerList");
        var row =
          e.target && e.target.closest && e.target.closest("[data-player-panel-handle-key]");
        if (!row) return;
        if (
          (homeList && homeList.contains(row)) ||
          (inviteList && inviteList.contains(row)) ||
          (playerList && playerList.contains(row))
        ) {
          var key = row.getAttribute("data-player-panel-handle-key");
          if (!key) return;
          e.preventDefault();
          e.stopPropagation();
          if (row.getAttribute("data-is-local-self") === "1") {
            if (
              playerList &&
              playerList.contains(row) &&
              typeof window.isPlatformPhase05 === "function" &&
              window.isPlatformPhase05()
            ) {
              return;
            }
            openMobileLocalProfile();
          } else if (
            typeof window.isPhase05OtherLocalPlayerKey === "function" &&
            window.isPhase05OtherLocalPlayerKey(key) &&
            playerList &&
            playerList.contains(row)
          ) {
            return;
          } else {
            openMobileFriendDetailByHandleKey(key, { sourceElement: row });
          }
        }
      },
      false
    );
  }

  function bindUi() {
    bindMobileListMoreSelect();
    bindMobileDashboardFriendDetailClicks();

    var closeBtn = document.getElementById("fcMobileNotifDetailCloseBtn");
    if (closeBtn && closeBtn.getAttribute("data-notif-detail-bound") !== "1") {
      closeBtn.setAttribute("data-notif-detail-bound", "1");
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeNotificationDetailL3();
      });
    }

    var backBtn = document.getElementById("fcMobileNotifDetailBackBtn");
    if (backBtn && backBtn.getAttribute("data-notif-detail-bound") !== "1") {
      backBtn.setAttribute("data-notif-detail-bound", "1");
      backBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeNotificationDetailL3();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bindUi();
      hydrateDetailAssets();
    });
  } else {
    bindUi();
    hydrateDetailAssets();
  }

  window.openMobileNotificationDetail = openNotificationDetailL3;
  window.openNotificationSenderProfileDetail = openNotificationSenderProfileDetail;
  window.openMobileAchievementDetail = openAchievementDetailL3;
  window.openMobileLocalProfile = openMobileLocalProfile;
  window.openMobileFriendDetailByHandleKey = openMobileFriendDetailByHandleKey;
  window.bindMobileDashboardFriendDetailClicks = bindMobileDashboardFriendDetailClicks;
  window.openMobileNotificationDetailByIndex = openNotificationDetailByIndex;
  window.openMobileNotificationDetailFromToast = openNotificationDetailFromToast;
  window.closeMobileNotificationDetail = closeNotificationDetailL3;
  window.closeMobileNotificationDetailForRow = closeMobileNotificationDetailForRow;
  window.resetMobileNotificationDetailL3 = resetNotificationDetailL3;
  window.captureMobileDetailUiForLocalPlayer = captureMobileDetailUiForLocalPlayer;
  window.resetActiveLocalPlayerMobileDetailUi = resetActiveLocalPlayerMobileDetailUi;
  window.restoreMobileDetailUiForLocalPlayer = restoreMobileDetailUiForLocalPlayer;
  window.syncMobileDetailViewMode = syncMobileDetailViewMode;
  window.restoreMobileDetailAfterEditProfileClose = restoreMobileDetailAfterEditProfileClose;
  window.getMobileDetailActiveHandleKey = getMobileDetailActiveHandleKey;
  window.setMobileDetailActiveHandleKey = setMobileDetailActiveHandleKey;
  window.refreshMobileDetailPresenceForKey = refreshMobileDetailPresenceForKey;
  window.hydrateMobileNotificationDetailAssets = hydrateDetailAssets;
  window.friendRequestShowsSameAccountNote = friendRequestShowsSameAccountNote;
})();
