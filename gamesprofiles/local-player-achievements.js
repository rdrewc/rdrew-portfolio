/**
 * Per-local-player achievement progress — mobile reads active player; TV reads identity player.
 */
(function () {
  "use strict";

  var LOCAL_KEYS = ["local", "local-p2", "local-p3", "local-p4"];
  var UNLOCKED_COUNTS_BY_INDEX = [4, 2, 3, 1];

  var LOCKED_ACHIEVEMENT_ART_BY_TITLE = {
    "Perfect Hat Trick": "assets/raster/dashboard-achievements-fifa/fifa-unlock-01.svg",
    "Champions Rising": "assets/raster/dashboard-achievements-fifa/fifa-unlock-02.svg",
    "Set Piece Architect": "assets/raster/dashboard-achievements-fifa/fifa-unlock-03.svg",
    "Pro Clubs Captain": "assets/raster/dashboard-achievements-fifa/fifa-unlock-04.svg",
    "Skill Move Maestro": "assets/raster/dashboard-achievements-fifa/fifa-unlock-02.svg",
  };

  var DEFAULT_ACHIEVEMENT_ART =
    "assets/raster/dashboard-achievements-fifa/fifa-unlock-01.svg";

  /** @type {Record<string, { achievements: object[] }>} */
  var stateByKey = Object.create(null);

  var ACHIEVEMENT_CATALOG = [
    {
      id: "first-kick",
      defaultKind: "unlocked",
      title: "First Kick",
      description: "Score your first goal in any mode.",
      date: "Mar 2, 2026",
      imageSrc: "assets/raster/dashboard-achievements-fifa/fifa-unlock-01.svg",
    },
    {
      id: "clean-sheet-hero",
      defaultKind: "unlocked",
      title: "Clean Sheet Hero",
      description: "Win a match without conceding in Career Mode.",
      date: "Feb 18, 2026",
      imageSrc: "assets/raster/dashboard-achievements-fifa/fifa-unlock-02.svg",
    },
    {
      id: "world-cup-mode",
      defaultKind: "unlocked",
      title: "World Cup mode",
      description: "Win the tournament final in World Cup mode.",
      date: "Jan 5, 2026",
      imageSrc: "assets/raster/dashboard-achievements-fifa/fifa-unlock-03.svg",
    },
    {
      id: "ultimate-starter",
      defaultKind: "unlocked",
      title: "Ultimate Starter",
      description: "Open your first Ultimate Team reward pack.",
      date: "Dec 12, 2025",
      imageSrc: "assets/raster/dashboard-achievements-fifa/fifa-unlock-04.svg",
    },
    {
      id: "perfect-hat-trick",
      defaultKind: "locked",
      title: "Perfect Hat Trick",
      description: "Score three goals with one player: left foot, right foot, and a header.",
    },
    {
      id: "champions-rising",
      defaultKind: "locked",
      title: "Champions Rising",
      description: "Win the top division in Online Seasons.",
    },
    {
      id: "set-piece-architect",
      defaultKind: "locked",
      title: "Set Piece Architect",
      description: "Score fifteen goals from direct free kicks.",
    },
    {
      id: "pro-clubs-captain",
      defaultKind: "locked",
      title: "Pro Clubs Captain",
      description: "Lead a Pro Clubs side to fifty wins as club captain.",
    },
    {
      id: "skill-move-maestro",
      defaultKind: "locked",
      title: "Skill Move Maestro",
      description: "Earn an S rank in the advanced dribbling trial.",
    },
    {
      id: "mystery-1",
      defaultKind: "mystery",
      title: "Hidden",
      status: "To reveal this achievement, keep playing!",
    },
    {
      id: "mystery-2",
      defaultKind: "mystery",
      title: "Hidden",
      status: "To reveal this achievement, keep playing!",
    },
    {
      id: "mystery-3",
      defaultKind: "mystery",
      title: "Hidden",
      status: "To reveal this achievement, keep playing!",
    },
  ];

  function isMultiLocal() {
    return typeof window.isMultiLocalSession === "function" && window.isMultiLocalSession();
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

  function getActiveKey() {
    return typeof window.getActiveLocalPlayerKey === "function"
      ? window.getActiveLocalPlayerKey()
      : "local";
  }

  function getTvIdentityKey() {
    if (!isMultiLocal()) return "local";
    if (
      typeof window.getTvDashboardIdentityMode === "function" &&
      window.getTvDashboardIdentityMode() === "host"
    ) {
      return "local";
    }
    return getActiveKey();
  }

  function resolveAchievementAwardKey(key) {
    return key || getActiveKey();
  }

  function syncAchievementViewsAfterUnlock(awardKey) {
    if (awardKey === getTvIdentityKey()) {
      renderTvAchievementTrackForKey(awardKey);
    }
    if (awardKey === getActiveKey()) {
      if (typeof window.syncMobileDashboardAchievementsInline === "function") {
        window.syncMobileDashboardAchievementsInline();
      }
      if (
        achievementsL2MaybeOpen() &&
        typeof window.renderMobileDashboardAchievementsL2 === "function"
      ) {
        window.renderMobileDashboardAchievementsL2();
      }
    }
  }

  function shuffleArray(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function formatAchievementDate(date) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function achievementArtForTitle(title) {
    return (title && LOCKED_ACHIEVEMENT_ART_BY_TITLE[title]) || DEFAULT_ACHIEVEMENT_ART;
  }

  function cloneCatalogEntry(entry) {
    return {
      id: entry.id,
      defaultKind: entry.defaultKind,
      kind: entry.defaultKind,
      title: entry.title,
      description: entry.description || "",
      date: entry.date || "",
      imageSrc: entry.imageSrc || achievementArtForTitle(entry.title),
      status: entry.status || "",
      mostRecentUnlocked: false,
    };
  }

  function buildAchievementsForPlayer(playerIndex) {
    var unlockCount = UNLOCKED_COUNTS_BY_INDEX[playerIndex];
    if (!(unlockCount >= 0)) unlockCount = 4;

    var items = ACHIEVEMENT_CATALOG.map(cloneCatalogEntry);
    var defaultUnlocked = items.filter(function (item) {
      return item.defaultKind === "unlocked";
    });

    items.forEach(function (item) {
      if (item.defaultKind === "mystery") {
        item.kind = "mystery";
        return;
      }
      item.kind = "locked";
      item.date = "";
    });

    for (var i = 0; i < defaultUnlocked.length; i++) {
      if (i < unlockCount) {
        defaultUnlocked[i].kind = "unlocked";
        defaultUnlocked[i].date = defaultUnlocked[i].date || formatAchievementDate(new Date());
      }
    }

    shuffleArray(items);
    return items;
  }

  function clearMostRecentFlags(achievements) {
    achievements.forEach(function (item) {
      item.mostRecentUnlocked = false;
    });
  }

  function achievementEntryForMobile(item) {
    if (item.kind === "unlocked") {
      return {
        kind: "unlocked",
        title: item.title,
        description: item.description,
        date: item.date,
        imageSrc: item.imageSrc,
        mostRecentUnlocked: !!item.mostRecentUnlocked,
      };
    }
    if (item.kind === "mystery") {
      return {
        kind: "mystery",
        title: item.title || "Hidden",
        description: "",
        status: item.status || "To reveal this achievement, keep playing!",
      };
    }
    return {
      kind: "locked",
      title: item.title,
      description: item.description,
      imageSrc: item.imageSrc || achievementArtForTitle(item.title),
      status: "Locked",
    };
  }

  function groupAchievementEntries(achievements) {
    var unlocked = [];
    var locked = [];
    for (var i = 0; i < achievements.length; i++) {
      var entry = achievementEntryForMobile(achievements[i]);
      if (entry.kind === "unlocked") unlocked.push(entry);
      else locked.push(entry);
    }
    return { unlocked: unlocked, locked: locked };
  }

  function getStateForKey(key) {
    return stateByKey[key] || null;
  }

  function getAchievementsForKey(key) {
    var state = getStateForKey(key);
    return state ? state.achievements : null;
  }

  function getProgressForAchievements(achievements) {
    if (!achievements) return { unlocked: 0, total: 0 };
    var unlocked = 0;
    for (var i = 0; i < achievements.length; i++) {
      if (achievements[i].kind === "unlocked") unlocked += 1;
    }
    return { unlocked: unlocked, total: achievements.length };
  }

  function createUnlockedAchievementButton(item) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "tv-dashboard__achievements-focus-card tv-dashboard__dash-content-focusable tv-dashboard__dash-content-focusable--tile";
    btn.setAttribute("aria-label", "Achievement: " + item.title);
    btn.setAttribute("tabindex", "-1");
    if (item.mostRecentUnlocked) btn.setAttribute("data-most-recent-unlocked", "true");

    var inner = document.createElement("div");
    inner.className = "tv-dashboard__achievements-focus-card-inner";

    var imgWrap = document.createElement("div");
    imgWrap.className = "tv-dashboard__achievements-focus-card-img";
    var img = document.createElement("img");
    img.setAttribute("src", item.imageSrc || DEFAULT_ACHIEVEMENT_ART);
    img.setAttribute("alt", "");
    img.setAttribute("decoding", "async");
    imgWrap.appendChild(img);

    var text = document.createElement("div");
    text.className = "tv-dashboard__achievements-focus-card-text";

    var title = document.createElement("h3");
    title.textContent = item.title;

    var desc = document.createElement("p");
    desc.className = "tv-dashboard__achievements-focus-card-desc";
    desc.textContent = item.description;

    var date = document.createElement("p");
    date.className = "tv-dashboard__achievements-focus-card-date";
    date.textContent = item.date;

    text.appendChild(title);
    text.appendChild(desc);
    text.appendChild(date);
    inner.appendChild(imgWrap);
    inner.appendChild(text);
    btn.appendChild(inner);
    return btn;
  }

  function createLockedAchievementButton(item) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "tv-dashboard__achievements-focus-locked tv-dashboard__dash-content-focusable tv-dashboard__dash-content-focusable--tile";
    btn.setAttribute("aria-label", "Locked achievement: " + item.title);
    btn.setAttribute("tabindex", "-1");

    var imgWrap = document.createElement("div");
    imgWrap.className = "tv-dashboard__achievements-focus-locked-img";
    var img = document.createElement("img");
    img.setAttribute(
      "src",
      "assets/raster/dashboard-achievements-fifa/achievement-locked-generic.svg"
    );
    img.setAttribute("alt", "");
    img.setAttribute("decoding", "async");
    imgWrap.appendChild(img);

    var text = document.createElement("div");
    text.className = "tv-dashboard__achievements-focus-locked-text";

    var title = document.createElement("h3");
    title.textContent = item.title;

    var desc = document.createElement("p");
    desc.textContent = item.description;

    text.appendChild(title);
    text.appendChild(desc);

    var label = document.createElement("p");
    label.className = "tv-dashboard__achievements-focus-locked-label";
    label.textContent = "Locked";

    btn.appendChild(imgWrap);
    btn.appendChild(text);
    btn.appendChild(label);
    return btn;
  }

  function createMysteryAchievementButton(item) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "tv-dashboard__achievements-focus-mystery tv-dashboard__dash-content-focusable tv-dashboard__dash-content-focusable--tile";
    btn.setAttribute("aria-label", "Hidden achievement");
    btn.setAttribute("tabindex", "-1");

    var imgWrap = document.createElement("div");
    imgWrap.className = "tv-dashboard__achievements-focus-mystery-img";
    var img = document.createElement("img");
    img.setAttribute(
      "src",
      "assets/raster/dashboard-achievements-fifa/achievement-locked-generic.svg"
    );
    img.setAttribute("alt", "");
    img.setAttribute("decoding", "async");
    imgWrap.appendChild(img);

    var body = document.createElement("div");
    body.className = "tv-dashboard__achievements-focus-mystery-body";
    var title = document.createElement("h3");
    title.textContent = "???";
    body.appendChild(title);

    var label = document.createElement("p");
    label.className = "tv-dashboard__achievements-focus-mystery-label";
    label.textContent = "Mystery";

    btn.appendChild(imgWrap);
    btn.appendChild(body);
    btn.appendChild(label);
    return btn;
  }

  function renderTvAchievementTrack(achievements) {
    var track = document.getElementById("tvDashboardAchievementsCards");
    if (!track || !achievements) return;

    track.replaceChildren();
    for (var i = 0; i < achievements.length; i++) {
      var item = achievements[i];
      if (item.kind === "unlocked") {
        track.appendChild(createUnlockedAchievementButton(item));
      } else if (item.kind === "mystery") {
        track.appendChild(createMysteryAchievementButton(item));
      } else {
        track.appendChild(createLockedAchievementButton(item));
      }
    }
    track.setAttribute("data-achievements-shuffled", "1");
    syncTvAchievementProgressForAchievements(achievements);
  }

  function renderTvAchievementTrackForKey(key) {
    renderTvAchievementTrack(getAchievementsForKey(key));
  }

  function syncTvAchievementProgressForAchievements(achievements) {
    var progress = getProgressForAchievements(achievements);
    var countEl = document.querySelector(".tv-dashboard__achievements-focus-progress-count");
    if (countEl) countEl.textContent = progress.unlocked + "/" + progress.total;

    var fillEl = document.querySelector(".tv-dashboard__achievements-focus-progress-fill--fifa");
    if (fillEl && progress.total > 0) {
      fillEl.style.width = "calc(100% * " + progress.unlocked + " / " + progress.total + ")";
    }

    if (typeof window.syncTvAchievementProgress === "function") {
      window.syncTvAchievementProgress();
    }
  }

  function removeLocalPlayerAchievementState() {
    stateByKey = Object.create(null);
  }

  function syncLocalPlayerAchievementTracks() {
    var count = getLocalCount();
    if (count <= 1) {
      removeLocalPlayerAchievementState();
      return;
    }

    var activeKeys = LOCAL_KEYS.slice(0, count);
    var ki;

    for (ki = 0; ki < activeKeys.length; ki++) {
      var key = activeKeys[ki];
      if (!stateByKey[key]) {
        stateByKey[key] = {
          achievements: buildAchievementsForPlayer(ki),
        };
      }
    }

    var existing = Object.keys(stateByKey);
    for (ki = 0; ki < existing.length; ki++) {
      var staleKey = existing[ki];
      if (activeKeys.indexOf(staleKey) === -1) {
        delete stateByKey[staleKey];
      }
    }
  }

  function getActiveLocalPlayerAchievementEntries() {
    if (!isMultiLocal()) return null;
    var achievements = getAchievementsForKey(getActiveKey());
    if (!achievements) return { unlocked: [], locked: [] };
    return groupAchievementEntries(achievements);
  }

  function getActiveLocalPlayerAchievementProgress() {
    if (!isMultiLocal()) return null;
    return getProgressForAchievements(getAchievementsForKey(getActiveKey()));
  }

  function unlockNextAchievementForKey(key) {
    var awardKey = resolveAchievementAwardKey(key);
    var achievements = getAchievementsForKey(awardKey);
    if (!achievements) return null;

    for (var i = 0; i < achievements.length; i++) {
      if (achievements[i].kind !== "locked") continue;

      var item = achievements[i];
      clearMostRecentFlags(achievements);
      item.kind = "unlocked";
      item.imageSrc = achievementArtForTitle(item.title);
      item.date = formatAchievementDate(new Date());
      item.mostRecentUnlocked = true;

      achievements.splice(i, 1);
      achievements.unshift(item);

      syncAchievementViewsAfterUnlock(awardKey);

      return {
        title: item.title,
        description: item.description,
        imageSrc: item.imageSrc,
        date: item.date,
      };
    }
    return null;
  }

  function unlockNextAchievementForActiveLocalPlayer() {
    if (!isMultiLocal()) return null;
    return unlockNextAchievementForKey(getActiveKey());
  }

  function achievementsL2MaybeOpen() {
    var root = document.getElementById("fcMobileDashboard");
    return !!(root && root.getAttribute("data-mobile-dashboard-l2") === "achievements");
  }

  function syncAchievementsUiForActivePlayer() {
    if (!isMultiLocal()) return;

    var tvKey = getTvIdentityKey();
    renderTvAchievementTrackForKey(tvKey);

    if (typeof window.syncMobileDashboardAchievementsInline === "function") {
      window.syncMobileDashboardAchievementsInline();
    }
    if (
      achievementsL2MaybeOpen() &&
      typeof window.renderMobileDashboardAchievementsL2 === "function"
    ) {
      window.renderMobileDashboardAchievementsL2();
    }
  }

  function initLocalPlayerAchievements() {
    document.querySelectorAll(".control-count-toggle").forEach(function (root) {
      root.addEventListener("click", function () {
        window.requestAnimationFrame(function () {
          syncLocalPlayerAchievementTracks();
          syncAchievementsUiForActivePlayer();
        });
      });
    });

    var selIdentity = document.getElementById("selTvDashboardIdentity");
    if (selIdentity) {
      selIdentity.addEventListener("change", function () {
        if (isMultiLocal()) {
          window.requestAnimationFrame(syncAchievementsUiForActivePlayer);
        }
      });
    }

    syncLocalPlayerAchievementTracks();
  }

  window.syncLocalPlayerAchievementTracks = syncLocalPlayerAchievementTracks;
  window.getActiveLocalPlayerAchievementEntries = getActiveLocalPlayerAchievementEntries;
  window.getActiveLocalPlayerAchievementProgress = getActiveLocalPlayerAchievementProgress;
  window.unlockNextAchievementForActiveLocalPlayer = unlockNextAchievementForActiveLocalPlayer;
  window.unlockNextAchievementForLocalPlayerKey = unlockNextAchievementForKey;
  window.syncAchievementsForActiveLocalPlayer = syncAchievementsUiForActivePlayer;
  window.renderTvAchievementTrackForLocalPlayerKey = renderTvAchievementTrackForKey;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLocalPlayerAchievements);
  } else {
    initLocalPlayerAchievements();
  }
})();
