/* ============================================================
   PHONEPACT — INTERACTION LAYER
   Scroll reveals, multi-step form, modals, navigation
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Scroll Reveal (IntersectionObserver) ──────────── */
  const revealElements = document.querySelectorAll('.reveal');
  document.documentElement.classList.add('js');
  
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));
  if (window.location.hash.length > 1) {
    document.getElementById(window.location.hash.slice(1))?.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }


  /* ── Navigation ────────────────────────────────────── */
  const nav = document.querySelector('.nav');
  const mobileToggle = document.querySelector('.nav__mobile-toggle');
  const navLinks = document.querySelector('.nav__links');

  // Scroll effect
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    nav.classList.toggle('nav--scrolled', currentScroll > 60);
    lastScroll = currentScroll;
  }, { passive: true });

  // Scroll Spy for Sticky Sidebar Navigation (Home page)
  const sidebarLinks = document.querySelectorAll('.sidebar-nav__link');
  const spySections = Array.from(sidebarLinks).map(link => {
    return document.querySelector(link.getAttribute('href'));
  }).filter(Boolean);

  if (sidebarLinks.length > 0 && spySections.length > 0) {
    window.addEventListener('scroll', () => {
      let current = 'hero';
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      const offset = 120; // offset threshold

      spySections.forEach(section => {
        const sectionTop = section.offsetTop - offset;
        if (scrollPosition >= sectionTop) {
          current = section.getAttribute('id');
        }
      });

      sidebarLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
          link.classList.add('active');
        }
      });
    }, { passive: true });
  }

  // Mobile menu
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      mobileToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', String(navLinks.classList.contains('open')));
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        navLinks.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }


  /* ── Formspree Waitlist Form ───────────────────────── */
  const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xzdqlaad';
  const waitlistForm = document.getElementById('waitlist-form');
  const waitlistSuccess = document.querySelector('.form-success');
  const waitlistStatus = document.getElementById('waitlist-status');

  if (waitlistForm) {
    waitlistForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('email-input');
      const phone = document.getElementById('phone-number');
      const consent = document.getElementById('tcpa-checkbox');
      const emailError = document.getElementById('email-error');
      const phoneError = document.getElementById('phone-error');
      const consentError = document.getElementById('consent-error');
      const submitButton = document.getElementById('submit-btn');
      const phoneDigits = phone.value.replace(/\D/g, '');

      emailError.textContent = '';
      phoneError.textContent = '';
      consentError.textContent = '';
      waitlistStatus.textContent = '';

      let valid = true;
      if (!email.validity.valid) {
        emailError.textContent = 'Enter a valid email address.';
        valid = false;
      }
      if (phone.value && phoneDigits.length < 10) {
        phoneError.textContent = 'Enter a complete phone number or leave this field blank.';
        valid = false;
      }
      if (phone.value && !consent.checked) {
        consentError.textContent = 'Please confirm SMS consent, or remove your phone number.';
        valid = false;
      }
      if (!valid) {
        waitlistForm.querySelector('.form-error:not(:empty)')?.previousElementSibling?.focus();
        return;
      }

      const payload = Object.fromEntries(new FormData(waitlistForm).entries());
      payload.timestamp = new Date().toISOString();
      payload.sms_consent = phone.value ? 'CONSENTED' : 'NOT_REQUESTED';
      submitButton.disabled = true;
      submitButton.textContent = 'Joining…';
      waitlistStatus.textContent = 'Saving your place…';

      try {
        const response = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Submission rejected');
        waitlistForm.hidden = true;
        waitlistSuccess.classList.add('active');
        waitlistSuccess.setAttribute('tabindex', '-1');
        waitlistSuccess.focus();
      } catch (error) {
        submitButton.disabled = false;
        submitButton.textContent = 'Join the waitlist';
        waitlistStatus.textContent = 'We could not save your place. Please try again.';
      }
    });
  }

  /* ── Legacy survey (kept hidden for reference) ─────── */
  const formContainer = document.getElementById('waitlist-survey-legacy');
  const formSteps = document.querySelectorAll('.form-step');
  const progressDots = document.querySelectorAll('.form-progress__dot');
  const formSuccess = document.querySelector('.form-success');
  let currentStep = 0;

  // Form data storage
  const formData = {
    maxScreenTime: '',
    weeklyScreenTime: '',
    reason: '',
    ageRange: '',
    phone: '',
    email: '',
    tcpaConsent: false
  };

  function showStep(index) {
    formSteps.forEach((step, i) => {
      step.classList.toggle('active', i === index);
    });
    progressDots.forEach((dot, i) => {
      dot.classList.remove('active', 'completed');
      if (i === index) dot.classList.add('active');
      else if (i < index) dot.classList.add('completed');
    });
    currentStep = index;
  }

  // Next/Prev buttons
  document.querySelectorAll('.form-next').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateCurrentStep()) {
        saveCurrentStep();
        if (currentStep < formSteps.length - 1) {
          showStep(currentStep + 1);
        }
      }
    });
  });

  document.querySelectorAll('.form-prev').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep > 0) {
        showStep(currentStep - 1);
      }
    });
  });

  // Range slider live update
  const maxSlider = document.getElementById('screen-time-max');
  const maxDisplay = document.getElementById('max-display');
  if (maxSlider && maxDisplay) {
    maxSlider.addEventListener('input', () => {
      const val = parseInt(maxSlider.value);
      const hours = Math.floor(val / 60);
      const mins = val % 60;
      if (hours > 0 && mins > 0) {
        maxDisplay.innerHTML = `${hours}<span>h</span> ${mins}<span>m</span>`;
      } else if (hours > 0) {
        maxDisplay.innerHTML = `${hours}<span>h</span>`;
      } else {
        maxDisplay.innerHTML = `${mins}<span>m</span>`;
      }
    });
  }

  const weeklySlider = document.getElementById('screen-time-weekly');
  const weeklyDisplay = document.getElementById('weekly-display');
  if (weeklySlider && weeklyDisplay) {
    weeklySlider.addEventListener('input', () => {
      const val = parseInt(weeklySlider.value);
      weeklyDisplay.innerHTML = `${val}<span>h</span>`;
    });
  }

  // Pill selection (age range)
  document.querySelectorAll('.pill-option').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill-option').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
    });
  });

  // Validation
  function validateCurrentStep() {
    const step = formSteps[currentStep];
    const stepIndex = parseInt(step.dataset.step);

    switch (stepIndex) {
      case 1: // Max screen time
        return parseInt(maxSlider?.value) > 0;

      case 2: // Weekly screen time
        return parseInt(weeklySlider?.value) > 0;

      case 3: // Reason
        const reason = document.getElementById('reason-reduce');
        if (!reason || !reason.value.trim()) {
          reason?.focus();
          reason?.classList.add('shake');
          setTimeout(() => reason?.classList.remove('shake'), 500);
          return false;
        }
        return true;

      case 4: // Age range
        const selectedPill = document.querySelector('.pill-option.selected');
        if (!selectedPill) {
          document.querySelector('.pill-group')?.classList.add('shake');
          setTimeout(() => document.querySelector('.pill-group')?.classList.remove('shake'), 500);
          return false;
        }
        return true;

      case 5: // Contact + TCPA
        const phone = document.getElementById('phone-number');
        const email = document.getElementById('email-input');
        const tcpa = document.getElementById('tcpa-checkbox');

        let valid = true;

        if (!phone?.value.trim() || phone.value.replace(/\D/g, '').length < 10) {
          phone?.classList.add('shake');
          setTimeout(() => phone?.classList.remove('shake'), 500);
          valid = false;
        }

        if (!email?.value.trim() || !email.value.includes('@')) {
          email?.classList.add('shake');
          setTimeout(() => email?.classList.remove('shake'), 500);
          valid = false;
        }

        if (!tcpa?.checked) {
          document.querySelector('.tcpa-wrapper')?.classList.add('shake');
          setTimeout(() => document.querySelector('.tcpa-wrapper')?.classList.remove('shake'), 500);
          valid = false;
        }

        return valid;

      default:
        return true;
    }
  }

  function saveCurrentStep() {
    const step = formSteps[currentStep];
    const stepIndex = parseInt(step.dataset.step);

    switch (stepIndex) {
      case 1:
        formData.maxScreenTime = maxSlider?.value + ' minutes';
        break;
      case 2:
        formData.weeklyScreenTime = weeklySlider?.value + ' hours/day';
        break;
      case 3:
        formData.reason = document.getElementById('reason-reduce')?.value;
        break;
      case 4:
        formData.ageRange = document.querySelector('.pill-option.selected')?.textContent;
        break;
      case 5:
        formData.phone = document.getElementById('phone-number')?.value;
        formData.email = document.getElementById('email-input')?.value;
        formData.tcpaConsent = document.getElementById('tcpa-checkbox')?.checked;
        break;
    }
  }

  // Form submission
  const submitBtn = document.getElementById('legacy-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!validateCurrentStep()) return;
      saveCurrentStep();

      // Build audit record
      const auditRecord = {
        ...formData,
        timestamp: new Date().toISOString(),
        disclaimerVersion: 'v1.0-2026-06-05',
        checkboxState: formData.tcpaConsent ? 'CHECKED_BY_USER' : 'UNCHECKED'
      };

      // Show success
      formContainer.style.display = 'none';
      document.querySelector('.form-progress').style.display = 'none';
      formSuccess.classList.add('active');
    });
  }

  // Phone number formatting
  const phoneInput = document.getElementById('phone-number');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let digits = e.target.value.replace(/\D/g, '');
      if (digits.length > 10) digits = digits.substring(0, 10);
      
      let formatted = '';
      if (digits.length > 0) formatted += '(' + digits.substring(0, 3);
      if (digits.length >= 3) formatted += ') ';
      if (digits.length > 3) formatted += digits.substring(3, 6);
      if (digits.length >= 6) formatted += '-' + digits.substring(6, 10);
      
      e.target.value = formatted;
    });
  }


  /* ── Modal System ──────────────────────────────────── */
  const modalTriggers = document.querySelectorAll('[data-modal]');
  const modalOverlays = document.querySelectorAll('.modal-overlay');
  const modalCloses = document.querySelectorAll('.modal-close');
  let modalTrigger = null;

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modalTrigger = document.activeElement;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      // Reset scroll position
      const content = modal.querySelector('.modal-content');
      if (content) content.scrollTop = 0;
      modal.querySelector('.modal-close')?.focus();
    }
  }

  function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    modalTrigger?.focus();
  }

  function closeAllModals() {
    modalOverlays.forEach(m => closeModal(m));
  }

  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const modalId = trigger.getAttribute('data-modal');
      openModal(modalId);
    });
  });

  modalCloses.forEach(btn => {
    btn.addEventListener('click', () => {
      const overlay = btn.closest('.modal-overlay');
      if (overlay) closeModal(overlay);
    });
  });

  // Click backdrop to close
  modalOverlays.forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        closeModal(overlay);
      }
    });
  });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
    if (e.key === 'Tab') {
      const modal = document.querySelector('.modal-overlay.active');
      if (!modal) return;
      const focusable = [...modal.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });


  /* ── Feedback Form ─────────────────────────────────── */
  const feedbackForm = document.getElementById('feedback-form');
  const feedbackSuccess = document.querySelector('.feedback__success');

  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const feedbackData = {
        name: document.getElementById('feedback-name')?.value,
        email: document.getElementById('feedback-email')?.value,
        message: document.getElementById('feedback-message')?.value,
        timestamp: new Date().toISOString(),
        source: 'phonepact-feedback'
      };
      const button = feedbackForm.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Sending…';
      try {
        const response = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
          body: JSON.stringify(feedbackData)
        });
        if (!response.ok) throw new Error('Submission rejected');
        feedbackForm.hidden = true;
        if (feedbackSuccess) feedbackSuccess.classList.add('active');
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Send Feedback';
        alert('We could not send your feedback. Please try again.');
      }
    });
  }


  /* ── Smooth Scroll for Anchor Links ────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = 80; // nav height
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });


  /* ── Shake Animation (inline) ──────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-6px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
    .shake { animation: shake 0.4s ease-in-out; }
  `;
  document.head.appendChild(style);

});
