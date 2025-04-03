// Smooth Scrolling for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    });
  });
  
  // Add Hover Effects to Buttons
  document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-5px)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
    });
  });
  
  // Animate Elements on Scroll
  const animateOnScroll = () => {
    const elements = document.querySelectorAll('.fade-in, .slide-in');
    elements.forEach(element => {
      const elementPosition = element.getBoundingClientRect().top;
      const screenPosition = window.innerHeight * 0.8;
  
      if (elementPosition < screenPosition) {
        element.style.opacity = '1';
        element.style.transform = 'translateX(0)';
      }
    });
  };
  
  window.addEventListener('scroll', animateOnScroll);