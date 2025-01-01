window.addEventListener('DOMContentLoaded', () => {
  // Lenis smooth scrolling initialization
  const lenis = new Lenis();
  lenis.on('scroll', (e) => {
    console.log(e);
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Intersection Observer to trigger row animations
  const rows = document.querySelectorAll('.row');
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.45  // Trigger animation when 50% of the row is in view
  });

  rows.forEach(row => {
    observer.observe(row);
  });
});

window.addEventListener('scroll', () => {
  const line = document.querySelector('.line');
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = (scrollTop / docHeight) * 100;

  // Extend line width based on scroll percentage
  line.style.width = scrollPercent + '%';
});
