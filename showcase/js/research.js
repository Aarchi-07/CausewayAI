/**
 * research.js — Section 03: Scroll animations, metric bars, stat counters
 */

// ---- INTERSECTION OBSERVER for fade-ups & metric bars ----
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    // Fade-up elements
    if (entry.target.classList.contains('fade-up')) {
      entry.target.classList.add('visible');
    }

    // Metric bars
    if (entry.target.classList.contains('metric-bar')) {
      const w = parseFloat(entry.target.dataset.w);
      // Normalize: max value is 100 for % scores, 40 for recall %
      const pct = Math.min(w / 100 * 100, 100);
      entry.target.style.width = pct + '%';
    }

    observer.unobserve(entry.target);
  });
}, { threshold: 0.2 });

// ---- HERO STAT COUNTERS ----
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1800;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target;
  }

  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    animateCounter(entry.target);
    counterObserver.unobserve(entry.target);
  });
}, { threshold: 0.5 });

// ---- VIDEO PLACEHOLDER ----
function initVideo() {
  const video = document.getElementById('demoVideo');
  const placeholder = document.getElementById('videoPlaceholder');
  if (!video || !placeholder) return;

  // Check if video source exists
  video.addEventListener('error', () => {
    placeholder.style.display = 'flex';
  });

  video.addEventListener('loadeddata', () => {
    placeholder.style.display = 'none';
  });

  placeholder.addEventListener('click', () => {
    placeholder.style.display = 'none';
    video.play();
  });

  // If src is missing, keep placeholder visible
  const src = video.querySelector('source');
  if (!src || !src.src || src.src.endsWith('/')) {
    // placeholder stays visible
  }
}

// ---- NAV SCROLL HIGHLIGHT ----
function initNavHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.style.color = link.getAttribute('href') === `#${id}` ? '#111' : '';
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => sectionObserver.observe(s));
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  // Observe all fade-up elements
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

  // Observe metric bars
  document.querySelectorAll('.metric-bar').forEach(bar => {
    bar.style.width = '0%'; // ensure starting at 0
    observer.observe(bar);
  });

  // Observe hero stat counters
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    el.textContent = '0';
    counterObserver.observe(el);
  });

  // Add fade-up to section headers and key blocks
  const animTargets = [
    '.section-header',
    '.metrics-block',
    '.arch-block',
    '.method-block',
    '.video-block',
    '.links-block',
    '.graph-meta',
    '.filter-bar',
    '.explorer-note'
  ];
  animTargets.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.classList.add('fade-up');
      observer.observe(el);
    });
  });

  // Method items staggered
  document.querySelectorAll('.method-item').forEach((el, i) => {
    el.classList.add('fade-up');
    el.style.transitionDelay = `${i * 80}ms`;
    observer.observe(el);
  });

  initVideo();
  initNavHighlight();
});
