window.addEventListener('DOMContentLoaded', () => {
  // Lenis is optional — skip when the library isn't loaded (projects page, etc.)
  var nav = document.getElementById('navbar');
  var toggle = document.querySelector('.nav-toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis();
    var _lenisRaf = 0;
    function raf(time) {
      _lenisRaf = 0;
      if (document.hidden) return;
      lenis.raf(time);
      _lenisRaf = requestAnimationFrame(raf);
    }
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden && !_lenisRaf) _lenisRaf = requestAnimationFrame(raf);
    });
    _lenisRaf = requestAnimationFrame(raf);
  }

  function centerSwipeChild(el, kid) {
    if (!kid) return;
    el.scrollLeft = kid.offsetLeft - (el.clientWidth - kid.offsetWidth) / 2;
  }

  function teardownHomeSwipe(el) {
    if (el._swipeCheck) {
      el.removeEventListener('scroll', el._swipeOnScroll);
      el.removeEventListener('scrollend', el._swipeCheck);
      el._swipeCheck = null;
      el._swipeOnScroll = null;
    }
    el.querySelectorAll('[data-swipe-clone]').forEach(function (n) { n.remove(); });
    el._swipeReady = false;
  }

  function setupHomeSwipe(el) {
    if (el._swipeReady) return;
    var originals = Array.prototype.slice.call(el.children);
    var n = originals.length;
    if (n < 2) return;

    originals.forEach(function (node) {
      var clone = node.cloneNode(true);
      clone.setAttribute('data-swipe-clone', '1');
      clone.setAttribute('tabindex', '-1');
      el.appendChild(clone);
    });
    originals.slice().reverse().forEach(function (node) {
      var clone = node.cloneNode(true);
      clone.setAttribute('data-swipe-clone', '1');
      clone.setAttribute('tabindex', '-1');
      el.insertBefore(clone, el.firstChild);
    });

    function nearestIndex() {
      var kids = el.children;
      var midX = el.scrollLeft + el.clientWidth / 2;
      var idx = 0, best = 1e9;
      for (var i = 0; i < kids.length; i++) {
        var c = kids[i].offsetLeft + kids[i].offsetWidth / 2;
        var d = Math.abs(c - midX);
        if (d < best) { best = d; idx = i; }
      }
      return idx;
    }

    function wrapIfNeeded() {
      if (el._swipeJumping) return;
      var idx = nearestIndex();
      var dest = -1;
      if (idx < n) dest = idx + n;
      else if (idx >= n * 2) dest = idx - n;
      if (dest < 0) return;
      el._swipeJumping = true;
      el.style.scrollSnapType = 'none';
      centerSwipeChild(el, el.children[dest]);
      requestAnimationFrame(function () {
        el.style.scrollSnapType = '';
        el._swipeJumping = false;
      });
    }

    var scrollTimer;
    el._swipeCheck = wrapIfNeeded;
    el._swipeOnScroll = function () {
      if (el._swipeJumping) return;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(wrapIfNeeded, 80);
    };
    el.addEventListener('scroll', el._swipeOnScroll, { passive: true });
    if ('onscrollend' in window) el.addEventListener('scrollend', wrapIfNeeded);

    var start = n + Math.floor((n - 1) / 2);
    centerSwipeChild(el, el.children[start]);
    el._swipeReady = true;
  }

  function syncHomeSwipes() {
    var mobile = window.innerWidth <= 899;
    document.querySelectorAll('.home-swipe').forEach(function (el) {
      if (mobile) setupHomeSwipe(el);
      else teardownHomeSwipe(el);
    });
  }
  syncHomeSwipes();
  window.addEventListener('resize', syncHomeSwipes);

  // Intersection Observer to trigger row animations.
  // Tall rows (GIF + screenshots) can be taller than the viewport, so a
  // fixed 0.45 threshold would never fire — they stay opacity:0 forever.
  // On mobile, fire as soon as a row nears the fold. Do not derive the
  // threshold from offsetHeight — images often have not loaded yet, which
  // makes short rows get a high threshold that stays wrong after they grow.
  const rows = document.querySelectorAll('.row');
  const vh = window.innerHeight || 800;
  const mobile = window.innerWidth <= 899;
  rows.forEach(row => {
    if (row.classList.contains('footer-row') || row.classList.contains('show')) return;
    const h = Math.max(row.offsetHeight, 1);
    const threshold = mobile
      ? 0.01
      : Math.min(0.45, Math.max(0.04, (vh * 0.35) / h));
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold,
      rootMargin: mobile ? '80px 0px 50% 0px' : '0px'
    });
    observer.observe(row);
  });
});
