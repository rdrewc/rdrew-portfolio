/* ==========================================================================
   Slide overlays
   Edits drawn on top of the static exports, so a change can be shown without
   waiting on a re-export. Every value is a percentage of the slide frame
   (cqw / cqh), measured off the artwork itself, so they hold at any size.
   Anything here should eventually be folded back into the Figma source.
   ========================================================================== */
(function () {
  'use strict';

  if (!window.Deck) return;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  /* A 1-2-3 podium: second place left, first centre, third right. Reads as
     ranking at row size, where a trophy would read as achievements. Solid,
     to sit with the play glyph on the row above rather than the outlined
     icons further up. */
  function podiumIcon() {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 14');
    svg.setAttribute('class', 'dp-icon');
    svg.setAttribute('aria-hidden', 'true');
    /* Blocks nearly touch and fill the box, so the three read as one podium
       rather than as three bars of a chart. */
    [[0, 5.2, 8.8], [5.4, 0, 14], [10.8, 7.6, 6.4]].forEach(function (b) {
      var rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', b[0]);
      rect.setAttribute('y', b[1]);
      rect.setAttribute('width', 5.2);
      rect.setAttribute('height', b[2]);
      rect.setAttribute('rx', 0.4);
      rect.setAttribute('fill', 'currentColor');
      svg.appendChild(rect);
    });
    return svg;
  }

  /* ------------------------------------------------------------------
     Slide 3 — The Player Journey (all-white state)
     The export's background under Peruse, Post Game, Prep and Play has been
     cleaned (their dim copy painted out, median-filtered from the same
     gradient) so a fresh heading + paragraph can sit on top at full white —
     matching what Play Again, baked into the export, already looks like.
     Position/size are measured off Play Again's own text: same heading and
     body scale, same left-aligned flow, same wrap width per block.
     ------------------------------------------------------------------ */
  var PHASES = [
    { cls: 'pj-peruse',   heading: 'PERUSE',    body: 'This initial phase is all about discovery and first impressions. Players are seeking information and a reason to invest their time.' },
    { cls: 'pj-postgame', heading: 'POST GAME', body: 'After a game session, players often reflect on their experience and may be looking for ways to extend their engagement or prepare for the next session.' },
    { cls: 'pj-prep',     heading: 'PREP',      body: 'Once a player has decided to play, the \u201cPrep\u201d phase is about getting ready for the actual game session. This can involve solo preparation or social coordination.' },
    { cls: 'pj-play',     heading: 'PLAY',      body: 'This is the core of the experience, where players are actively engaged with the game itself.' }
  ];

  Deck.registerOverlay('player-journey', function (layer) {
    PHASES.forEach(function (p) {
      var block = el('div', 'pj-phase ' + p.cls);
      block.appendChild(el('div', 'pj-phase__heading', p.heading));
      block.appendChild(el('div', 'pj-phase__body', p.body));
      layer.appendChild(block);
    });
  });

  /* ------------------------------------------------------------------
     Slide 5 — Cross Platform
     Two edits to the tv Details Page mock:
       1. a Leaderboards row under More Info, in the selected (white) state
       2. the leaderboard module's Close button becomes "See all"
     ------------------------------------------------------------------ */
  Deck.registerOverlay('cross-platform', function (layer) {
    var row = el('div', 'dp-row dp-row--selected');
    row.appendChild(podiumIcon());
    row.appendChild(el('span', null, 'Leaderboards'));

    var cta = el('div', 'dp-cta', 'See all');

    layer.appendChild(row);
    layer.appendChild(cta);
  });
})();
