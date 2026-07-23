// Instagram-style Carousel functionality
const carousels = {};

// Lightbox functionality
let lightboxImages = [];
let currentLightboxIndex = 0;

function initCarousel(carouselId) {
  const carousel = document.getElementById(carouselId);
  const track = carousel.querySelector('.carousel-track');
  const slides = carousel.querySelectorAll('.carousel-slide');
  const dotsContainer = carousel.querySelector('.carousel-dots');
  
  const totalSlides = slides.length;
  let currentSlide = 0;
  
  // Create dots
  for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot';
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(carouselId, i));
    dotsContainer.appendChild(dot);
  }
  
  // Store carousel state
  carousels[carouselId] = {
    track,
    slides,
    totalSlides,
    currentSlide,
    dots: dotsContainer.querySelectorAll('.dot')
  };
  
  // Set initial position
  updateCarousel(carouselId);
  
  // Add click handlers for lightbox
  slides.forEach((slide, index) => {
    slide.addEventListener('click', () => {
      openLightbox(carouselId, index);
    });
  });
}

function moveCarousel(carouselId, direction) {
  const carousel = carousels[carouselId];
  if (!carousel) return;
  
  const newSlide = carousel.currentSlide + direction;
  
  if (newSlide < 0) {
    carousel.currentSlide = carousel.totalSlides - 1;
  } else if (newSlide >= carousel.totalSlides) {
    carousel.currentSlide = 0;
  } else {
    carousel.currentSlide = newSlide;
  }
  
  updateCarousel(carouselId);
}

function goToSlide(carouselId, slideIndex) {
  const carousel = carousels[carouselId];
  if (!carousel || slideIndex < 0 || slideIndex >= carousel.totalSlides) return;
  
  carousel.currentSlide = slideIndex;
  updateCarousel(carouselId);
}

function updateCarousel(carouselId) {
  const carousel = carousels[carouselId];
  if (!carousel) return;
  
  // Update track position
  const translateX = -carousel.currentSlide * 100;
  carousel.track.style.transform = `translateX(${translateX}%)`;
  
  // Update dots
  carousel.dots.forEach((dot, index) => {
    if (index === carousel.currentSlide) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

// Lightbox functions
function openLightbox(carouselId, slideIndex) {
  const carousel = carousels[carouselId];
  if (!carousel) return;
  
  // Collect images only from the current carousel
  lightboxImages = [];
  const currentCarousel = document.getElementById(carouselId);
  const slides = currentCarousel.querySelectorAll('.carousel-slide img');
  
  slides.forEach(img => {
    lightboxImages.push(img.src);
  });
  
  // Set the current index to the clicked slide
  currentLightboxIndex = slideIndex;
  showLightboxImage();
  
  // Show lightbox
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.add('active');
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.remove('active');
  
  // Restore body scroll
  document.body.style.overflow = '';
}

function changeLightboxImage(direction) {
  currentLightboxIndex += direction;
  
  if (currentLightboxIndex < 0) {
    currentLightboxIndex = lightboxImages.length - 1;
  } else if (currentLightboxIndex >= lightboxImages.length) {
    currentLightboxIndex = 0;
  }
  
  showLightboxImage();
}

function showLightboxImage() {
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxCounter = document.getElementById('lightbox-counter');
  
  lightboxImage.src = lightboxImages[currentLightboxIndex];
  lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${lightboxImages.length}`;
}

// Add touch/swipe support
function addTouchSupport(carouselId) {
  const carousel = document.getElementById(carouselId);
  const track = carousel.querySelector('.carousel-track');
  
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  
  track.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  });
  
  track.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
    e.preventDefault();
  });
  
  track.addEventListener('touchend', () => {
    if (!isDragging) return;
    
    const diff = startX - currentX;
    const threshold = 50; // Minimum swipe distance
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left - next slide
        moveCarousel(carouselId, 1);
      } else {
        // Swipe right - previous slide
        moveCarousel(carouselId, -1);
      }
    }
    
    isDragging = false;
  });
}

// Add keyboard support
function addKeyboardSupport(carouselId) {
  document.addEventListener('keydown', (e) => {
    const carousel = document.getElementById(carouselId);
    if (!carousel || !carousel.contains(document.activeElement)) return;
    
    if (e.key === 'ArrowLeft') {
      moveCarousel(carouselId, -1);
    } else if (e.key === 'ArrowRight') {
      moveCarousel(carouselId, 1);
    }
  });
}

// Add keyboard support for lightbox
document.addEventListener('keydown', (e) => {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox.classList.contains('active')) return;
  
  if (e.key === 'Escape') {
    closeLightbox();
  } else if (e.key === 'ArrowLeft') {
    changeLightboxImage(-1);
  } else if (e.key === 'ArrowRight') {
    changeLightboxImage(1);
  }
});

// Auto-play functionality (optional)
function startAutoPlay(carouselId, interval = 5000) {
  const carousel = carousels[carouselId];
  if (!carousel) return;
  
  carousel.autoPlayInterval = setInterval(() => {
    moveCarousel(carouselId, 1);
  }, interval);
}

function stopAutoPlay(carouselId) {
  const carousel = carousels[carouselId];
  if (!carousel || !carousel.autoPlayInterval) return;
  
  clearInterval(carousel.autoPlayInterval);
  carousel.autoPlayInterval = null;
}

// Initialize carousels when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Automatically find and initialize all carousels
  const allCarousels = document.querySelectorAll('.instagram-carousel');
  
  allCarousels.forEach(carousel => {
    const carouselId = carousel.id;
    
    // Initialize the carousel
    initCarousel(carouselId);
    
    // Add touch support
    addTouchSupport(carouselId);
    
    // Add keyboard support
    addKeyboardSupport(carouselId);
    
    // Optional: Start auto-play (uncomment if you want auto-play)
    // startAutoPlay(carouselId, 4000);
    
    // Pause auto-play on hover (if auto-play is enabled)
    carousel.addEventListener('mouseenter', () => {
      stopAutoPlay(carouselId);
    });
    
    carousel.addEventListener('mouseleave', () => {
      // Uncomment if you want auto-play to resume
      // startAutoPlay(carouselId, 4000);
    });
  });
  
  // Close lightbox when clicking outside the image
  const lightbox = document.getElementById('lightbox');
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });
  
  console.log(`Initialized ${allCarousels.length} carousels automatically!`);
});