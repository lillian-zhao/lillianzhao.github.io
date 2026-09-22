/* ─────────────────────────────────────────────────────────────────────────
   loader.js  ·  site-wide loading screen
   Inject this in <head> (not deferred / not async) so the overlay appears
   before <body> content is painted.  Dismissed automatically on window.load.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  var loader = document.createElement('div');
  loader.id = 'page-loader';
  loader.setAttribute('aria-hidden', 'true');
  loader.innerHTML =
    '<div class="ld-content">' +
      '<div class="ld-mug">' +
        '<div class="ld-steam ld-s1"></div>' +
        '<div class="ld-steam ld-s2"></div>' +
        '<div class="ld-steam ld-s3"></div>' +
        '<div class="ld-cup">' +
          '<div class="ld-liquid"></div>' +
        '</div>' +
        '<div class="ld-handle"></div>' +
        '<div class="ld-saucer"></div>' +
      '</div>' +
      '<p class="ld-text">loading&#8230;</p>' +
    '</div>';

  /* Append to <html> — body does not exist yet at this point */
  document.documentElement.appendChild(loader);

  function dismiss() {
    loader.classList.add('ld-out');
    /* Remove from DOM after the CSS transition finishes */
    setTimeout(function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, 700);
  }

  if (document.readyState === 'complete') {
    /* Already fully loaded (e.g. hard-refresh from cache) */
    setTimeout(dismiss, 250);
  } else {
    window.addEventListener('load', function () {
      /* Small pause so the animation is visible even on fast connections */
      setTimeout(dismiss, 350);
    });
  }
}());
