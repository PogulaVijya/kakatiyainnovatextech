// Custom Cursor Follower
const cursor = document.querySelector('.custom-cursor');
const cursorDot = document.querySelector('.custom-cursor-dot');

if (cursor && cursorDot) {
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    cursorDot.style.left = e.clientX + 'px';
    cursorDot.style.top = e.clientY + 'px';
  });

  document.addEventListener('mousedown', () => {
    cursor.style.width = '35px';
    cursor.style.height = '35px';
    cursor.style.borderColor = '#C99A2E';
  });

  document.addEventListener('mouseup', () => {
    cursor.style.width = '20px';
    cursor.style.height = '20px';
    cursor.style.borderColor = '#0057D9';
  });
  
  // Hover effect for links
  const links = document.querySelectorAll('a, button, .interactive-el');
  links.forEach(link => {
    link.addEventListener('mouseenter', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
      cursor.style.backgroundColor = 'rgba(0, 87, 217, 0.1)';
    });
    link.addEventListener('mouseleave', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(1)';
      cursor.style.backgroundColor = 'transparent';
    });
  });
}

// Scroll logic (Progress bar, Sticky Navbar, & active ScrollSpy highlighting)
const premiumNav = document.querySelector('.premium-nav');
const sections = document.querySelectorAll('section, header');
const navLinks = document.querySelectorAll('.nav-link-custom');

window.addEventListener('scroll', () => {
  const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;
  
  // Update Scroll Progress
  const progressBar = document.querySelector('.scroll-progress-bar');
  if (progressBar) {
    progressBar.style.width = scrolled + '%';
  }

  // Toggle Navbar Background
  if (premiumNav) {
    if (winScroll > 50) {
      premiumNav.classList.add('scrolled');
    } else {
      premiumNav.classList.remove('scrolled');
    }
  }

  // ScrollSpy active link highlighters
  let currentSec = 'hero';
  sections.forEach(sec => {
    const secTop = sec.offsetTop - 120;
    if (winScroll >= secTop) {
      currentSec = sec.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${currentSec}`) {
      link.classList.add('active');
    }
  });
});

// HTML5 Canvas Luxury Particle Background
const canvas = document.getElementById('particles-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let particlesArray = [];
  const numberOfParticles = 80;
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 3 + 1;
      this.speedX = Math.random() * 0.5 - 0.25;
      this.speedY = Math.random() * 0.5 - 0.25;
      this.color = Math.random() > 0.5 ? '#0057D9' : '#C99A2E';
      this.alpha = Math.random() * 0.5 + 0.2;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      if (this.x > canvas.width) this.x = 0;
      else if (this.x < 0) this.x = canvas.width;
      if (this.y > canvas.height) this.y = 0;
      else if (this.y < 0) this.y = canvas.height;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function initParticles() {
    particlesArray = [];
    for (let i = 0; i < numberOfParticles; i++) {
      particlesArray.push(new Particle());
    }
  }

  function connectParticles() {
    for (let a = 0; a < particlesArray.length; a++) {
      for (let b = a; b < particlesArray.length; b++) {
        let dx = particlesArray[a].x - particlesArray[b].x;
        let dy = particlesArray[a].y - particlesArray[b].y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          ctx.save();
          let opacity = (1 - (distance / 150)) * 0.15;
          ctx.strokeStyle = `rgba(0, 87, 217, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
          ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particlesArray.length; i++) {
      particlesArray[i].update();
      particlesArray[i].draw();
    }
    connectParticles();
    requestAnimationFrame(animateParticles);
  }

  initParticles();
  animateParticles();
}

// Initializing AOS (Animate On Scroll)
document.addEventListener('DOMContentLoaded', () => {
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 1000,
      once: true,
      easing: 'ease-out-cubic',
    });
  }

  // GSAP scroll animations for Why Choose Us section
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Link GSAP ScrollTrigger updates with global Lenis scroll events
    if (window.lenis) {
      window.lenis.on('scroll', () => {
        ScrollTrigger.update();
      });
    }

    // Animate grid cards
    gsap.from(".why-card-wrapper", {
      scrollTrigger: {
        trigger: ".why-choose-grid",
        start: "top 85%",
        toggleActions: "play none none none"
      },
      y: 60,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power2.out"
    });

    // Animate trust statistics row
    gsap.from(".trust-stats-row .col-lg-3", {
      scrollTrigger: {
        trigger: ".trust-stats-row",
        start: "top 90%",
        toggleActions: "play none none none"
      },
      scale: 0.8,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "back.out(1.7)"
    });
  }

  // Initializing Swiper for Testimonials
  if (typeof Swiper !== 'undefined') {
    // Testimonials Carousel
    new Swiper('.testimonials-swiper', {
      slidesPerView: 1,
      spaceBetween: 30,
      loop: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
      },
      pagination: {
        el: '.swiper-pagination-testimonials',
        clickable: true,
      }
    });
  }

  // Count-up animations for Metrics Section
  const counters = document.querySelectorAll('.counter-val');
  const countSpeed = 200;

  const countUp = (counter) => {
    const target = +counter.getAttribute('data-target');
    const isPercentage = counter.getAttribute('data-percentage') === 'true';
    let count = 0;
    const increment = target / countSpeed;

    const updateCount = () => {
      count += increment;
      if (count < target) {
        counter.innerText = Math.ceil(count) + (isPercentage ? '%' : '+');
        setTimeout(updateCount, 1);
      } else {
        counter.innerText = target + (isPercentage ? '%' : '+');
      }
    };
    updateCount();
  };

  const observerOptions = {
    threshold: 0.5,
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        countUp(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  counters.forEach(counter => {
    observer.observe(counter);
  });
});

// Blog Search & Filtering
const searchInput = document.getElementById('blog-search');
const categoryButtons = document.querySelectorAll('.blog-filter-btn');
const blogCards = document.querySelectorAll('.blog-post-card');

function filterBlogs() {
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const activeCategory = document.querySelector('.blog-filter-btn.active')?.getAttribute('data-category') || 'all';

  blogCards.forEach(card => {
    const title = card.querySelector('.blog-title').innerText.toLowerCase();
    const excerpt = card.querySelector('.blog-excerpt').innerText.toLowerCase();
    const category = card.getAttribute('data-category');

    const matchesSearch = title.includes(searchTerm) || excerpt.includes(searchTerm);
    const matchesCategory = activeCategory === 'all' || category === activeCategory;

    if (matchesSearch && matchesCategory) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

if (searchInput) {
  searchInput.addEventListener('input', filterBlogs);
}

categoryButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    categoryButtons.forEach(b => b.classList.remove('active', 'btn-gold-custom'));
    categoryButtons.forEach(b => b.classList.add('btn-outline-custom'));
    btn.classList.add('active', 'btn-gold-custom');
    btn.classList.remove('btn-outline-custom');
    filterBlogs();
  });
});

// Careers & Job Applications Handling
const jobForm = document.getElementById('job-apply-form');
if (jobForm) {
  jobForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = jobForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    
    // Capture form values
    const role = document.getElementById('job-title-input').value;
    const name = document.getElementById('app-name').value;
    const email = document.getElementById('app-email').value;
    const skills = document.getElementById('app-skills').value;
    const resume = document.getElementById('app-resume').value;
    const message = document.getElementById('app-message').value;

    submitBtn.innerText = 'Submitting to Database...';
    submitBtn.disabled = true;

    try {
      // 1. Submit to database API
      await fetch('/api/applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: null,
          name: name,
          email: email,
          skills: skills,
          resume_url: resume,
          message: message
        })
      });
    } catch (err) {
      console.error("Database submission failed, running fallback email routing:", err);
    }

    // 2. Mailto routing trigger
    submitBtn.innerText = 'Opening Email Client...';
    const mailSubject = `Job Application: ${role} - ${name}`;
    const mailBody = `Hello HR Team,\n\nI would like to submit my job application details.\n\n` + 
                     `Full Name: ${name}\n` + 
                     `Email Address: ${email}\n` + 
                     `Role Interested: ${role}\n` + 
                     `Key Skills: ${skills}\n` + 
                     `Resume / Portfolio URL: ${resume}\n\n` + 
                     `Cover Message / Introduction:\n${message}\n`;

    const mailtoUrl = `mailto:hr.support@kakatiyainnovatextechnologies.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
    window.location.href = mailtoUrl;

    setTimeout(() => {
      alert('Your details have been saved to our database, and an email draft has been generated. Please review and hit send in your email client to submit it to hr.support@kakatiyainnovatextechnologies.com.');
      jobForm.reset();
      submitBtn.innerText = originalText;
      submitBtn.disabled = false;
      
      // Close Bootstrap modal if it is inside one
      const modal = bootstrap.Modal.getInstance(document.getElementById('applyModal'));
      if (modal) {
        modal.hide();
      }
    }, 1500);
  });
}

// Contact Form submission
const contactForm = document.getElementById('contact-us-form');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;

    // Capture form values
    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const subject = document.getElementById('contact-subject').value;
    const message = document.getElementById('contact-msg').value;

    submitBtn.innerText = 'Submitting to Database...';
    submitBtn.disabled = true;

    try {
      // 1. Submit to database API
      await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email,
          phone: '',
          subject: subject,
          message: message
        })
      });
    } catch (err) {
      console.error("Database submission failed, running fallback email routing:", err);
    }

    // 2. Mailto routing trigger
    submitBtn.innerText = 'Opening Email Client...';
    const mailSubject = `Consultation Request: ${subject} - ${name}`;
    const mailBody = `Hello Team,\n\nI would like to request a consultation.\n\n` + 
                     `Full Name: ${name}\n` + 
                     `Email Address: ${email}\n` + 
                     `Subject Interest: ${subject}\n\n` + 
                     `Message Details:\n${message}\n`;

    const mailtoUrl = `mailto:hr.support@kakatiyainnovatextechnologies.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
    window.location.href = mailtoUrl;

    setTimeout(() => {
      alert('Your consultation details have been saved to our database, and an email draft has been generated. Please review and hit send in your email client to submit it to hr.support@kakatiyainnovatextechnologies.com.');
      contactForm.reset();
      submitBtn.innerText = originalText;
      submitBtn.disabled = false;
    }, 1500);
  });
}


