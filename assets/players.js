// Looping case study videos that behave like GIFs, with a way to pause them.
// - Play only while on screen, so off-screen clips don't download or burn CPU.
// - Click/tap the video, or use the corner button, to pause and resume.
// - With "reduce motion" on, nothing autoplays; each video waits on its poster.
// - Videos marked data-audio get an unmute button.
(function(){
  var players = document.querySelectorAll('[data-player]');
  if(!players.length) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ICONS = {
    pause: '<svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    muted: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>'
  };

  function button(cls){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'player-btn ' + cls;
    return b;
  }

  players.forEach(function(player){
    var video = player.querySelector('video');
    if(!video) return;
    var label = player.getAttribute('data-label') || 'video';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.removeAttribute('autoplay');

    var userPaused = reduceMotion;
    var onScreen = false;

    var controls = document.createElement('div');
    controls.className = 'player-controls';
    var toggle = button('player-toggle');
    controls.appendChild(toggle);

    var soundBtn = null;
    if(player.hasAttribute('data-audio')){
      soundBtn = button('player-sound');
      controls.appendChild(soundBtn);
      soundBtn.addEventListener('click', function(e){
        e.stopPropagation();
        video.muted = !video.muted;
        if(!video.muted){ userPaused = false; play(); }
        render();
      });
    }
    player.appendChild(controls);

    function render(){
      var paused = video.paused;
      player.classList.toggle('is-paused', paused && userPaused);
      toggle.innerHTML = paused ? ICONS.play : ICONS.pause;
      toggle.setAttribute('aria-label', (paused ? 'Play ' : 'Pause ') + label);
      if(soundBtn){
        soundBtn.innerHTML = video.muted ? ICONS.muted : ICONS.sound;
        soundBtn.setAttribute('aria-label', (video.muted ? 'Unmute ' : 'Mute ') + label);
      }
    }

    function play(){
      var p = video.play();
      if(p && p.catch) p.catch(function(){});
    }

    function sync(){
      if(onScreen && !userPaused) play(); else video.pause();
    }

    function flip(){
      userPaused = !video.paused;
      if(userPaused) video.pause(); else play();
    }

    toggle.addEventListener('click', function(e){ e.stopPropagation(); flip(); });
    video.addEventListener('click', flip);
    video.addEventListener('play', render);
    video.addEventListener('pause', render);

    new IntersectionObserver(function(entries){
      onScreen = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.35 }).observe(player);

    render();
  });
})();
