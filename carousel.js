let index = 0;

function moveCarousel() {
    const carousel = document.querySelector('.carousel-inner');
    const items = document.querySelectorAll('.carousel-item');
    const totalItems = items.length;

    index++;

    // Loop to the start if at the end
    if (index > totalItems - 3) {
        index = 0;
    }

    const offset = -index * (100 / 3);  // Adjust for partial view
    carousel.style.transform = `translateX(${offset}%)`;
}

setInterval(moveCarousel, 3000); // Slide every 3 seconds

document.addEventListener("DOMContentLoaded", function () {
  const carouselInner = document.querySelector(".carousel-inner");
  const carouselItems = document.querySelectorAll(".carousel-item");
  
  // Clone the items and append them to create a seamless loop
  carouselItems.forEach(item => {
    const clone = item.cloneNode(true); // Clone each item
    carouselInner.appendChild(clone);   // Append the cloned item to the carousel
  });
});