(function () {
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function initDeck(deck) {
    var total = parseInt(deck.getAttribute('data-count'), 10);
    var pattern = deck.getAttribute('data-src');
    var labelName = deck.getAttribute('data-label') || 'Presentation slide';
    var img = deck.querySelector('.slide-deck-stage img');
    var label = deck.querySelector('.slide-deck-bar span');
    var dotsWrap = deck.querySelector('.slide-deck-dots');
    if (!total || !pattern || !img) return;

    var i = 1;
    var dots = [];

    function srcFor(n) {
      return pattern.replace('{n}', pad(n));
    }

    function goTo(n) {
      i = ((n - 1 + total) % total) + 1;
      img.src = srcFor(i);
      img.alt = labelName + ' ' + i + ' of ' + total;
      if (label) label.textContent = i + ' / ' + total;
      dots.forEach(function (dot, idx) {
        dot.classList.toggle('is-active', idx === i - 1);
      });
      var next = new Image();
      next.src = srcFor(i === total ? 1 : i + 1);
    }

    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      for (var d = 1; d <= total; d++) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slide-deck-dot' + (d === 1 ? ' is-active' : '');
        btn.setAttribute('aria-label', 'Go to slide ' + d);
        btn.addEventListener('click', goTo.bind(null, d));
        dotsWrap.appendChild(btn);
        dots.push(btn);
      }
    }

    var prev = deck.querySelector('.slide-deck-nav.prev');
    var nextBtn = deck.querySelector('.slide-deck-nav.next');
    if (prev) prev.addEventListener('click', function () { goTo(i - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(i + 1); });

    var wheelLock = 0;
    deck.addEventListener('wheel', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var now = Date.now();
      if (now - wheelLock < 280) return;
      wheelLock = now;
      goTo(e.deltaY > 0 ? i + 1 : i - 1);
    }, { passive: false });

    var startX = 0;
    deck.addEventListener('touchstart', function (e) {
      startX = e.changedTouches[0].clientX;
    }, { passive: true });
    deck.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 40) return;
      goTo(dx < 0 ? i + 1 : i - 1);
    });

    deck.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goTo(i + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goTo(i - 1); }
    });
  }

  document.querySelectorAll('.slide-deck').forEach(initDeck);
})();
