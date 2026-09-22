window.addEventListener('DOMContentLoaded', () => {
  // Lenis is optional — skip when the library isn't loaded (projects page, etc.)
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis();
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // Intersection Observer to trigger row animations.
  // Tall rows (GIF + screenshots) can be taller than the viewport, so a
  // fixed 0.45 threshold would never fire — they stay opacity:0 forever.
  const rows = document.querySelectorAll('.row');
  const vh = window.innerHeight || 800;
  rows.forEach(row => {
    const h = Math.max(row.offsetHeight, 1);
    const threshold = Math.min(0.45, Math.max(0.05, (vh * 0.35) / h));
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold });
    observer.observe(row);
  });
});
