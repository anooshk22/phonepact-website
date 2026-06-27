/* ============================================================
   PHONEPACT — INTERACTION LAYER
   Scroll reveals, forms, modals, navigation
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
      if (phone.value && (phoneDigits.length < 8 || phoneDigits.length > 15)) {
        phoneError.textContent = 'Enter a complete international phone number or leave this field blank.';
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

  /* ── Modal System ──────────────────────────────────── */
  const modalTriggers = document.querySelectorAll('[data-modal]');
  const modalOverlays = document.querySelectorAll('.modal-overlay');
  const modalCloses = document.querySelectorAll('.modal-close');
  let modalTrigger = null;

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modalTrigger = document.activeElement;
      modal.hidden = false;
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
    modal.hidden = true;
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
  const feedbackStatus = document.getElementById('feedback-status');

  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = document.getElementById('feedback-message');
      feedbackStatus.textContent = '';
      if (!message.value.trim()) {
        feedbackStatus.textContent = 'Please enter a message.';
        message.focus();
        return;
      }
      const feedbackData = Object.fromEntries(new FormData(feedbackForm).entries());
      feedbackData.timestamp = new Date().toISOString();
      const button = feedbackForm.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Sending…';
      feedbackStatus.textContent = 'Sending your feedback…';
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
        feedbackStatus.textContent = 'We could not send your feedback. Please try again.';
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
