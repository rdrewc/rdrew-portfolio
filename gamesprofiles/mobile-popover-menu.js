/**
 * Evolution mobile pop-over menu — reusable anchored dropdown.
 */
(function () {
  "use strict";

  /** @type {Array<{ wrapper: HTMLElement, trigger: HTMLElement, menu: HTMLElement, close: function(): void }>} */
  var instances = [];
  var listRowMenuIdCounter = 0;

  function isOpen(menu) {
    return menu && menu.classList.contains("is-open");
  }

  function setTriggerExpanded(trigger, expanded) {
    if (!trigger) return;
    trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  function prunePopoverInstances() {
    for (var i = instances.length - 1; i >= 0; i--) {
      if (!instances[i].menu || !instances[i].menu.isConnected) {
        instances.splice(i, 1);
      }
    }
  }

  function findInstanceByMenu(menu) {
    for (var i = 0; i < instances.length; i++) {
      if (instances[i].menu === menu) return instances[i];
    }
    return null;
  }

  function listRowMenuHost(inst) {
    if (!inst || !inst.wrapper) return null;
    if (!inst.wrapper.classList.contains("fc-mobile-notif__row-more")) return null;
    return inst.wrapper.closest(".fc-mobile-notif__item");
  }

  function syncListRowMenuStacking(inst, open) {
    var host = listRowMenuHost(inst);
    if (!host) return;
    host.classList.toggle("is-list-more-open", !!open);
  }

  function isListRowMenuInst(inst) {
    return !!(inst && inst.wrapper && inst.wrapper.classList.contains("fc-mobile-notif__row-more"));
  }

  function getMobileDashShell() {
    var dash = document.getElementById("fcMobileDashboard");
    return dash ? dash.querySelector(".fc-mobile-dash__shell") : null;
  }

  function ensureListRowMenuLayer() {
    var shell = getMobileDashShell();
    if (!shell) return null;
    var layer = shell.querySelector(".fc-mobile-dash__list-row-menu-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "fc-mobile-dash__list-row-menu-layer";
      layer.setAttribute("aria-hidden", "true");
      shell.appendChild(layer);
    }
    return layer;
  }

  function rectRelativeToShell(el, shell) {
    var elRect = el.getBoundingClientRect();
    var shellRect = shell.getBoundingClientRect();
    var scale = shell.offsetWidth ? shellRect.width / shell.offsetWidth : 1;

    return {
      top: (elRect.top - shellRect.top) / scale,
      left: (elRect.left - shellRect.left) / scale,
      right: (shellRect.right - elRect.right) / scale,
      bottom: (shellRect.bottom - elRect.bottom) / scale,
      width: elRect.width / scale,
      height: elRect.height / scale
    };
  }

  function shouldPortalPopoverMenu(inst) {
    var dash = document.getElementById("fcMobileDashboard");
    return !!(dash && inst && inst.trigger && dash.contains(inst.trigger));
  }

  var POPOVER_EDGE_PAD = 8;
  var POPOVER_TRIGGER_GAP = 8;

  function clearPortaledMenuStyle(menu) {
    if (!menu || !menu.style) return;
    menu.style.position = "";
    menu.style.top = "";
    menu.style.right = "";
    menu.style.bottom = "";
    menu.style.left = "";
    menu.style.maxHeight = "";
    menu.style.overflowY = "";
    menu.style.visibility = "";
    menu.classList.remove(
      "fc-mobile-popover-menu--opens-up",
      "fc-mobile-popover-menu--align-left",
      "fc-mobile-popover-menu--align-right",
      "fc-mobile-popover-menu--scrollable"
    );
  }

  function measurePopoverMenu(menu) {
    if (!menu) return { width: 0, height: 0 };
    menu.style.position = "absolute";
    menu.style.display = "flex";
    menu.style.top = "0";
    menu.style.left = "0";
    menu.style.right = "auto";
    menu.style.bottom = "auto";
    menu.style.maxHeight = "none";
    menu.style.overflowY = "";
    return {
      width: menu.offsetWidth,
      height: menu.offsetHeight
    };
  }

  function positionPopoverMenuInShell(inst) {
    var menu = inst.menu;
    var trigger = inst.trigger;
    var shell = getMobileDashShell();
    if (!menu || !trigger || !shell || !inst.menuPortal) return;

    var tr = rectRelativeToShell(trigger, shell);
    var gap = POPOVER_TRIGGER_GAP;
    var pad = POPOVER_EDGE_PAD;
    var shellW = shell.offsetWidth;
    var shellH = shell.offsetHeight;

    var dims = measurePopoverMenu(menu);
    var menuW = dims.width;
    var menuH = dims.height;
    var availH = shellH - pad * 2;

    var triggerMidY = tr.top + tr.height / 2;
    var top;
    var maxH = null;
    var openDown = true;

    if (menuH <= availH) {
      var preferredBelow = tr.top + tr.height + gap;
      var preferredAbove = tr.top - gap - menuH;
      var preferredCenter = triggerMidY - menuH / 2;

      if (preferredBelow + menuH <= shellH - pad) {
        top = preferredBelow;
      } else if (preferredAbove >= pad) {
        top = preferredAbove;
      } else {
        top = Math.max(pad, Math.min(preferredCenter, shellH - pad - menuH));
      }

      top = Math.max(pad, Math.min(top, shellH - pad - menuH));
      openDown = top + menuH / 2 >= triggerMidY;
    } else {
      maxH = availH;
      top = pad;
      openDown = triggerMidY >= shellH / 2;
    }

    menu.classList.toggle("fc-mobile-popover-menu--opens-up", !openDown);

    var right = tr.right;
    var left = null;
    var menuLeftIfRightAnchored = shellW - right - menuW;

    menu.classList.remove("fc-mobile-popover-menu--align-left", "fc-mobile-popover-menu--align-right");

    if (menuLeftIfRightAnchored < pad) {
      left = Math.max(pad, Math.min(tr.left, shellW - pad - menuW));
      right = null;
      menu.classList.add("fc-mobile-popover-menu--align-left");
    } else if (shellW - right < menuW + pad) {
      right = pad;
      menu.classList.add("fc-mobile-popover-menu--align-right");
    } else {
      menu.classList.add("fc-mobile-popover-menu--align-right");
    }

    menu.style.position = "absolute";
    menu.style.left = left === null ? "auto" : left + "px";
    menu.style.right = right === null ? "auto" : right + "px";
    menu.style.top = top + "px";
    menu.style.bottom = "auto";

    if (maxH && maxH < menuH) {
      menu.style.maxHeight = maxH + "px";
      menu.style.overflowY = "auto";
      menu.classList.add("fc-mobile-popover-menu--scrollable");
      requestAnimationFrame(function () {
        finalizePopoverMenuScroll(menu, top, maxH, triggerMidY);
      });
    } else {
      menu.style.maxHeight = "";
      menu.style.overflowY = "";
      menu.classList.remove("fc-mobile-popover-menu--scrollable");
      menu.scrollTop = 0;
    }
  }

  function finalizePopoverMenuScroll(menu, menuTop, menuMaxH, triggerMidY) {
    if (!menu || !menu.classList.contains("fc-mobile-popover-menu--scrollable")) return;
    var maxScroll = Math.max(0, menu.scrollHeight - menu.clientHeight);
    if (maxScroll <= 0) return;
    var ideal = triggerMidY - menuTop - menuMaxH / 2;
    menu.scrollTop = Math.max(0, Math.min(maxScroll, ideal));
  }

  function portalPopoverMenu(inst) {
    if (!shouldPortalPopoverMenu(inst)) return;
    var layer = ensureListRowMenuLayer();
    if (!layer || !inst.menu || !inst.wrapper) return;

    if (!inst.menuPortal) {
      var placeholder = document.createComment("portaled-popover-menu");
      inst.wrapper.insertBefore(placeholder, inst.menu);
      inst.menuPortal = { layer: layer, placeholder: placeholder };
    }

    layer.appendChild(inst.menu);
    positionPopoverMenuInShell(inst);
  }

  function restorePortaledMenu(inst) {
    if (!inst.menuPortal || !inst.menu) return;
    var placeholder = inst.menuPortal.placeholder;
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(inst.menu, placeholder);
      placeholder.remove();
    } else if (inst.wrapper) {
      inst.wrapper.appendChild(inst.menu);
    }
    clearPortaledMenuStyle(inst.menu);
    inst.menuPortal = null;
  }

  function syncListRowMenuDashboardState() {
    var dash = document.getElementById("fcMobileDashboard");
    if (!dash) return;
    var anyOpen = false;
    for (var i = 0; i < instances.length; i++) {
      if (isListRowMenuInst(instances[i]) && isOpen(instances[i].menu)) {
        anyOpen = true;
        break;
      }
    }
    dash.classList.toggle("is-list-row-more-open", anyOpen);

    var layer = dash.querySelector(".fc-mobile-dash__list-row-menu-layer");
    if (layer) layer.setAttribute("aria-hidden", anyOpen ? "false" : "true");
  }

  function repositionOpenPortaledMenus() {
    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      if (!inst.menuPortal || !isOpen(inst.menu)) continue;
      positionPopoverMenuInShell(inst);
    }
  }

  function popoverInteractiveTarget(inst, target) {
    if (!inst || !target) return false;
    if (inst.menu && inst.menu.contains(target)) return true;
    if (inst.wrapper && inst.wrapper.contains(target)) return true;
    if (inst.trigger && inst.trigger.contains(target)) return true;
    return false;
  }

  function closeInstance(inst) {
    if (!inst || !inst.menu) return;
    inst.menu.classList.remove("is-open");
    inst.menu.setAttribute("hidden", "");
    setTriggerExpanded(inst.trigger, false);
    syncListRowMenuStacking(inst, false);
    if (isListRowMenuInst(inst)) {
      restorePortaledMenu(inst);
      syncListRowMenuDashboardState();
    } else if (inst.menuPortal) {
      restorePortaledMenu(inst);
    }
  }

  function closeAllMobilePopoverMenus() {
    for (var i = 0; i < instances.length; i++) {
      closeInstance(instances[i]);
    }
    syncListRowMenuDashboardState();
  }

  function closeOthers(current) {
    for (var i = 0; i < instances.length; i++) {
      if (instances[i] !== current) closeInstance(instances[i]);
    }
  }

  function openInstance(inst) {
    if (!inst || !inst.menu || !inst.trigger) return;
    closeOthers(inst);
    syncListRowMenuStacking(inst, true);
    if (shouldPortalPopoverMenu(inst)) {
      portalPopoverMenu(inst);
      if (isListRowMenuInst(inst)) {
        syncListRowMenuDashboardState();
      }
    }
    inst.menu.removeAttribute("hidden");
    requestAnimationFrame(function () {
      if (inst.menuPortal) {
        positionPopoverMenuInShell(inst);
      }
      inst.menu.classList.add("is-open");
      if (inst.menuPortal) {
        requestAnimationFrame(function () {
          positionPopoverMenuInShell(inst);
        });
      }
    });
    setTriggerExpanded(inst.trigger, true);
  }

  function toggleInstance(inst) {
    if (isOpen(inst.menu)) closeInstance(inst);
    else openInstance(inst);
  }

  function nextListRowMenuId(context, itemId) {
    listRowMenuIdCounter += 1;
    var safeContext = (context || "list").replace(/[^\w-]+/g, "-");
    var safeItemId = String(itemId || "item").replace(/[^\w-]+/g, "-");
    return "fcMobileListMoreMenu-" + safeContext + "-" + safeItemId + "-" + listRowMenuIdCounter;
  }

  function dispatchListRowMoreSelect(detail) {
    if (typeof window.CustomEvent !== "function") return;
    window.dispatchEvent(new CustomEvent("mobile-list-more-select", { detail: detail }));
  }

  /**
   * @param {{
   *   listContext?: string,
   *   itemId?: string,
   *   itemLabel?: string,
   *   menuLabel?: string,
   *   menuItems?: Array<{ action?: string, label?: string, destructive?: boolean, divider?: boolean, type?: string }>,
   *   onSelect?: function(string, { listContext: string, itemId: string }): void
   * }} [options]
   * @returns {HTMLElement}
   */
  function createMobileListRowMoreMenu(options) {
    options = options || {};
    var listContext = options.listContext || "list";
    var itemId = options.itemId || "";
    var itemLabel = options.itemLabel || "item";
    var menuLabel = options.menuLabel || "Item options";
    var menuId = nextListRowMenuId(listContext, itemId);

    var wrapper = document.createElement("div");
    wrapper.className = "fc-mobile-popover-menu__anchor fc-mobile-notif__row-more";
    wrapper.setAttribute("data-list-more-context", listContext);
    if (itemId) wrapper.setAttribute("data-list-more-id", itemId);

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className =
      "fc-mobile-dash__icon-btn fc-mobile-popover-menu__trigger fc-mobile-notif__row-more-btn";
    trigger.setAttribute("aria-label", "More options for " + itemLabel);
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", menuId);

    var img = document.createElement("img");
    img.alt = "";
    img.width = 16;
    img.height = 16;
    img.decoding = "async";
    var assets = window.FIGMA_MOBILE_DASHBOARD_ASSETS;
    if (assets && assets.moreHorizontalSmall) {
      img.src = assets.moreHorizontalSmall;
    } else {
      img.setAttribute("data-md", "moreHorizontalSmall");
    }
    trigger.appendChild(img);

    var menu = document.createElement("div");
    menu.className = "fc-mobile-popover-menu fc-mobile-popover-menu--list-row";
    menu.id = menuId;
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", menuLabel);
    menu.setAttribute("hidden", "");

    var menuItems = options.menuItems || [{ action: "placeholder", label: "Placeholder" }];

    function appendMenuDivider() {
      if (menu.childElementCount === 0) return;
      var last = menu.lastElementChild;
      if (last && last.classList.contains("fc-mobile-popover-menu__divider")) return;
      var dividerEl = document.createElement("hr");
      dividerEl.className = "fc-mobile-popover-menu__divider";
      dividerEl.setAttribute("aria-hidden", "true");
      menu.appendChild(dividerEl);
    }

    for (var mi = 0; mi < menuItems.length; mi++) {
      var itemDef = menuItems[mi];
      if (!itemDef) continue;
      if (itemDef.divider || itemDef.type === "divider") {
        appendMenuDivider();
        continue;
      }
      if (!itemDef.action) continue;
      var menuItem = document.createElement("button");
      menuItem.type = "button";
      menuItem.className = "fc-mobile-popover-menu__item";
      if (itemDef.destructive) {
        menuItem.className += " fc-mobile-popover-menu__item--destructive";
      }
      menuItem.setAttribute("role", "menuitem");
      menuItem.setAttribute("data-popover-action", itemDef.action);
      menuItem.textContent = itemDef.label || itemDef.action;
      menu.appendChild(menuItem);
    }

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);

    return wrapper;
  }

  function ensureListRowPopoverInst(wrapper) {
    if (!wrapper) return null;
    var trigger = wrapper.querySelector(".fc-mobile-notif__row-more-btn");
    var menu = wrapper.querySelector(".fc-mobile-popover-menu");
    if (!trigger || !menu) return null;

    prunePopoverInstances();

    var existing = findInstanceByMenu(menu);
    if (existing) {
      existing.wrapper = wrapper;
      existing.trigger = trigger;
      return existing;
    }

    var listContext = wrapper.getAttribute("data-list-more-context") || "list";
    var itemId = wrapper.getAttribute("data-list-more-id") || "";

    return initMobilePopoverMenu(wrapper, menu, {
      trigger: trigger,
      bindTrigger: false,
      onSelect: function (action) {
        var hostRow =
          wrapper.closest && wrapper.closest("[data-player-panel-handle-key]");
        dispatchListRowMoreSelect({
          action: action,
          listContext: listContext,
          itemId: itemId,
          sourceElement: hostRow || null
        });
      }
    });
  }

  function bindListRowMoreMenuDelegation() {
    var dash = document.getElementById("fcMobileDashboard");
    if (!dash || dash.getAttribute("data-list-more-delegation") === "1") return;
    dash.setAttribute("data-list-more-delegation", "1");

    dash.addEventListener("click", function (e) {
      if (!dash.classList.contains("is-open")) return;
      var trigger =
        e.target && e.target.closest && e.target.closest(".fc-mobile-notif__row-more-btn");
      if (!trigger || !dash.contains(trigger)) return;
      var wrapper = trigger.closest(".fc-mobile-notif__row-more");
      if (!wrapper) return;

      e.preventDefault();
      e.stopPropagation();

      var inst = ensureListRowPopoverInst(wrapper);
      toggleInstance(inst);
    });
  }

  /**
   * @deprecated List row menus use dashboard-level delegation; kept for compatibility.
   * @param {ParentNode|null|undefined} root
   */
  function bindListRowMoreMenusIn(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll(".fc-mobile-notif__row-more").forEach(function (wrapper) {
      ensureListRowPopoverInst(wrapper);
    });
  }

  /**
   * @param {HTMLElement} anchorEl
   * @param {HTMLElement} menu
   * @param {{ trigger?: HTMLElement, bindTrigger?: boolean, onSelect?: function(string, HTMLElement): void }} [options]
   */
  function initMobilePopoverMenu(anchorEl, menu, options) {
    if (!menu) return null;
    options = options || {};
    var bindTrigger = options.bindTrigger !== false;

    var trigger =
      options.trigger ||
      (anchorEl &&
      anchorEl.classList &&
      anchorEl.classList.contains("fc-mobile-popover-menu__trigger")
        ? anchorEl
        : null);
    if (!trigger && anchorEl && anchorEl.querySelector) {
      trigger = anchorEl.querySelector(".fc-mobile-popover-menu__trigger");
    }
    if (!trigger) trigger = anchorEl;
    if (!trigger) return null;

    var wrapper =
      anchorEl && anchorEl.classList && anchorEl.classList.contains("fc-mobile-popover-menu__anchor")
        ? anchorEl
        : trigger.closest
          ? trigger.closest(".fc-mobile-popover-menu__anchor")
          : null;
    if (!wrapper) wrapper = trigger;

    prunePopoverInstances();

    var existing = findInstanceByMenu(menu);
    if (existing) {
      existing.wrapper = wrapper;
      existing.trigger = trigger;
      return existing;
    }

    var inst = {
      wrapper: wrapper,
      trigger: trigger,
      menu: menu,
      close: function () {
        closeInstance(inst);
      }
    };

    if (bindTrigger) {
      trigger.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleInstance(inst);
      });
    }

    menu.addEventListener("click", function (e) {
      var item =
        e.target && e.target.closest && e.target.closest("[data-popover-action]");
      if (!item || !menu.contains(item)) return;
      e.preventDefault();
      e.stopPropagation();
      var action = item.getAttribute("data-popover-action") || "";
      if (typeof options.onSelect === "function") {
        options.onSelect(action, item);
      }
      closeInstance(inst);
    });

    instances.push(inst);
    return inst;
  }

  function isPopoverTriggerTarget(target) {
    return !!(
      target &&
      target.closest &&
      target.closest(".fc-mobile-popover-menu__trigger, .fc-mobile-notif__row-more-btn")
    );
  }

  function onDocumentClick(e) {
    var closedAny = false;
    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      if (!isOpen(inst.menu)) continue;
      if (popoverInteractiveTarget(inst, e.target)) continue;
      closeInstance(inst);
      closedAny = true;
    }
    if (!closedAny) return;
    if (isPopoverTriggerTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function onDocumentKeyDown(e) {
    if (e.key !== "Escape") return;
    closeAllMobilePopoverMenus();
  }

  function bindProfileHeaderMenu() {
    var trigger = document.getElementById("fcMobileDashMoreBtn");
    var menu = document.getElementById("fcMobileDashProfileMenu");
    if (!trigger || !menu) return;
    var wrapper = trigger.closest(".fc-mobile-popover-menu__anchor");

    initMobilePopoverMenu(wrapper || trigger, menu, {
      trigger: trigger,
      onSelect: function (action) {
        if (action === "my-profile") {
          if (typeof window.openMobileLocalProfile === "function") {
            window.openMobileLocalProfile();
          }
        } else if (action === "achievements") {
          if (typeof window.openMobileDashboardAchievements === "function") {
            window.openMobileDashboardAchievements();
          }
        } else if (action === "controller-settings") {
          if (typeof window.openMobileDashboardControllerSettings === "function") {
            window.openMobileDashboardControllerSettings();
          }
        } else if (action === "stop-playing") {
          if (typeof window.openMobileStopPlayingModal === "function") {
            window.openMobileStopPlayingModal();
          }
        }
      }
    });
  }

  function bindListRowMenuReposition() {
    var dash = document.getElementById("fcMobileDashboard");
    if (!dash || dash.getAttribute("data-list-row-menu-reposition") === "1") return;
    dash.setAttribute("data-list-row-menu-reposition", "1");
    dash.addEventListener("scroll", repositionOpenPortaledMenus, true);
    window.addEventListener("resize", repositionOpenPortaledMenus, false);
  }

  function bindUi() {
    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("keydown", onDocumentKeyDown, false);
    bindProfileHeaderMenu();
    bindListRowMoreMenuDelegation();
    bindListRowMenuReposition();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindUi);
  } else {
    bindUi();
  }

  window.initMobilePopoverMenu = initMobilePopoverMenu;
  window.closeAllMobilePopoverMenus = closeAllMobilePopoverMenus;
  window.createMobileListRowMoreMenu = createMobileListRowMoreMenu;
  window.bindListRowMoreMenusIn = bindListRowMoreMenusIn;
  window.ensureListRowPopoverInst = ensureListRowPopoverInst;
})();
