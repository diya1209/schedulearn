// Landing page animations and interactions
document.addEventListener('DOMContentLoaded', () => {
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Animate forgetting curve demo
  const animateCurve = () => {
    const points = document.querySelectorAll('.point');
    points.forEach((point, index) => {
      setTimeout(() => {
        point.style.transform = 'scale(1.1)';
        point.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        
        setTimeout(() => {
          point.style.transform = 'scale(1)';
          point.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }, 300);
      }, index * 500);
    });
  };

  // Start animation and repeat every 3 seconds
  animateCurve();
  setInterval(animateCurve, 3000);

  // Add intersection observer for feature cards
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observe feature cards
  document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
  });
});