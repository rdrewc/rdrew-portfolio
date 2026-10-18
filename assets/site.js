// Case study order for the previous / next header. Add new projects here, in the same order as the homepage list.
var PROJECTS = [
  { slug: 'password-sharing', title: 'Password Sharing' },
  { slug: 'remix', title: 'Discord Remix' },
  { slug: 'player-profiles', title: 'Player Profiles' },
  { slug: 'spatial-audio', title: 'Netflix Spatial Audio' },
  { slug: 'dynamic-ads', title: 'Instagram Dynamic Ads' },
  { slug: 'igtv', title: 'IGTV App' },
  { slug: 'stage-channels', title: 'Stage Channels' },
  { slug: 'facebook-tv', title: 'Facebook TV App' }
];

// Header on case study pages: Home on every project, "Previous Project" on all but the first,
// and "Next Project" on all but the last. Order comes from PROJECTS.
(function(){
  var nav = document.querySelector('[data-project-nav]');
  if(!nav) return;
  var parts = location.pathname.split('/').filter(Boolean);
  var slug = parts[parts.length - 1] === 'index.html' ? parts[parts.length - 2] : parts[parts.length - 1];
  var i = PROJECTS.map(function(p){ return p.slug; }).indexOf(slug);
  if(i < 0) return;

  function link(cls, href, text, label){
    var a = document.createElement('a');
    a.className = cls;
    a.href = href;
    a.innerHTML = text;
    if(label) a.setAttribute('aria-label', label);
    return a;
  }

  nav.innerHTML = '';
  // Home icon, always first: same stroke style as the footer's theme icons, no container.
  nav.appendChild(link('nav-home', '../',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h4.5v-6h4v6h4.5V9"/></svg>',
    'Home'));
  var prev = PROJECTS[i - 1];
  var next = PROJECTS[i + 1];
  if(prev) nav.appendChild(link('nav-prev', '../' + prev.slug + '/', '&larr; Previous Project', 'Previous project: ' + prev.title));
  if(next) nav.appendChild(link('nav-next', '../' + next.slug + '/', 'Next Project &rarr;', 'Next project: ' + next.title));
})();

// Theme toggle in the shared footer. The saved theme is applied in each page's <head> to avoid a flash.
(function(){
  var root = document.documentElement;
  var sunBtn = document.querySelector('.theme-toggle .sun-btn');
  var moonBtn = document.querySelector('.theme-toggle .moon-btn');
  if(!sunBtn || !moonBtn) return;

  function applyTheme(theme){
    if(theme === 'light'){
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    sunBtn.setAttribute('aria-pressed', String(theme === 'light'));
    moonBtn.setAttribute('aria-pressed', String(theme !== 'light'));
  }

  function saved(){
    try { return localStorage.getItem('theme') || 'dark'; } catch(e){ return 'dark'; }
  }
  function save(theme){
    try { localStorage.setItem('theme', theme); } catch(e){}
  }

  applyTheme(saved());

  sunBtn.addEventListener('click', function(){
    save('light');
    applyTheme('light');
  });
  moonBtn.addEventListener('click', function(){
    save('dark');
    applyTheme('dark');
  });
})();

// Case study pages: the Details panel collapses from its label (open by default), and the page
// title tucks into the top of the sticky left panel once it slides under the header, flying back
// to its place on the way up. The title only pins while the left panel is sticky (tall desktop windows).
(function(){
  var page = document.querySelector('main.case');
  var h1 = page && page.querySelector(':scope > h1');
  var left = page && page.querySelector('.left');
  if(!h1 || !left) return;
  var header = document.querySelector('.site-header');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Collapsible sections: everything after the rule moves into a body that animates its height.
  left.querySelectorAll('section').forEach(function(section, n){
    var label = section.querySelector(':scope > .section-label');
    var rule = section.querySelector(':scope > .section-rule');
    if(!label || !rule) return;
    var body = document.createElement('div');
    body.className = 'collapse-body';
    body.id = 'case-details-' + n;
    var inner = document.createElement('div');
    inner.className = 'collapse-inner';
    while(rule.nextSibling) inner.appendChild(rule.nextSibling);
    body.appendChild(inner);
    section.appendChild(body);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'section-label collapse-toggle';
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-controls', body.id);
    toggle.innerHTML = '<span>' + label.innerHTML + '</span>' +
      '<svg class="caret" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    label.replaceWith(toggle);
    toggle.addEventListener('click', function(){
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      section.classList.toggle('is-collapsed', !open);
      body.inert = !open;
    });
  });

  // Detail rows read "Name ....... value" on one line while the panel is wide enough for the
  // longest one; narrower than that, every row stacks its value under its name (.is-stacked).
  var rows = left.querySelectorAll('.dot-row');
  var needed = 0;
  function measureRows(){
    left.classList.remove('is-stacked');
    needed = 0;
    rows.forEach(function(row){
      var name = row.querySelector('.name');
      var value = row.querySelector('.date');
      if(!name || !value) return;
      // name + value at their natural widths, the leader dots' margins, and a few dots between
      needed = Math.max(needed, name.getBoundingClientRect().width + value.getBoundingClientRect().width + 12 + 30);
    });
    fitRows();
  }
  function fitRows(){
    left.classList.toggle('is-stacked', left.clientWidth < needed);
  }
  if(rows.length){
    measureRows();
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(measureRows);
    if(window.ResizeObserver) new ResizeObserver(fitRows).observe(left);
    else window.addEventListener('resize', fitRows);
  }

  // Pinned title: a copy of the h1 at the top of the left panel.
  var slot = document.createElement('div');
  slot.className = 'pinned-title';
  slot.setAttribute('aria-hidden', 'true');
  slot.innerHTML = '<div class="pinned-title-inner"><div class="pinned-title-text"></div></div>';
  var copy = slot.querySelector('.pinned-title-text');
  copy.textContent = h1.textContent;
  left.insertBefore(slot, left.firstChild);

  // Animate el from where `from` was to where el now sits (FLIP). Both titles share one type size,
  // so it only slides; the pinned copy may wrap in the narrower panel.
  function fly(el, from){
    if(reduceMotion.matches || !el.animate) return;
    var to = el.getBoundingClientRect();
    el.animate([
      { transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px)' },
      { transform: 'none' }
    ], { duration: 520, easing: 'cubic-bezier(.2,.75,.25,1)' });
  }

  var pinned = false;
  function update(animate){
    var line = header ? header.getBoundingClientRect().bottom : 0;
    var shouldPin = getComputedStyle(left).position === 'sticky' && h1.getBoundingClientRect().top < line;
    if(shouldPin === pinned) return;
    pinned = shouldPin;
    var leaving = pinned ? h1 : copy;
    var arriving = pinned ? copy : h1;
    var from = leaving.getBoundingClientRect();
    page.classList.toggle('is-title-pinned', pinned);
    if(animate) fly(arriving, from);
  }

  function onScroll(){ update(true); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update(false); // a reload that restores scroll lands already pinned, without a fly-in
})();
