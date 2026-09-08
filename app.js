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

  /* ── Draggable Hero Phone ──────────────────────────── */
  const phoneScreen = document.querySelector('.phone-ui');

  if (phoneScreen) {
    let draggingPhone = false;
    let dragStartY = 0;
    let dragStartScroll = 0;
    const mobileHeroQuery = window.matchMedia('(max-width: 600px)');

    phoneScreen.scrollTop = 0;

    const resetPhonePosition = () => {
      phoneScreen.scrollTop = 0;
    };

    if (mobileHeroQuery.addEventListener) {
      mobileHeroQuery.addEventListener('change', resetPhonePosition);
    } else {
      mobileHeroQuery.addListener(resetPhonePosition);
    }

    phoneScreen.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      draggingPhone = true;
      dragStartY = event.clientY;
      dragStartScroll = phoneScreen.scrollTop;
      phoneScreen.classList.add('is-dragging');
      phoneScreen.setPointerCapture(event.pointerId);
    });

    phoneScreen.addEventListener('pointermove', (event) => {
      if (!draggingPhone) return;
      event.preventDefault();
      phoneScreen.scrollTop = dragStartScroll - (event.clientY - dragStartY);
    });

    const endPhoneDrag = (event) => {
      if (!draggingPhone) return;
      draggingPhone = false;
      phoneScreen.classList.remove('is-dragging');
      if (phoneScreen.hasPointerCapture(event.pointerId)) {
        phoneScreen.releasePointerCapture(event.pointerId);
      }
    };

    phoneScreen.addEventListener('pointerup', endPhoneDrag);
    phoneScreen.addEventListener('pointercancel', endPhoneDrag);
  }

  /* ── How PhonePact Works Demos ────────────────────── */
  const formatDemoMinutes = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return `${remainder}m`;
    return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
  };

  const intentionValue = document.getElementById('demo-intention-value');
  const intentionSet = document.getElementById('demo-intention-set');
  const intentionStatus = document.getElementById('demo-intention-status');
  const intentionControls = [...document.querySelectorAll('[data-intention-delta]')];
  let intentionMinutes = 150;

  const renderIntentionDemo = () => {
    if (!intentionValue) return;
    intentionValue.textContent = formatDemoMinutes(intentionMinutes);
    intentionControls.forEach((control) => {
      const delta = Number(control.dataset.intentionDelta);
      control.disabled = (delta < 0 && intentionMinutes === 30) || (delta > 0 && intentionMinutes === 720);
    });
  };

  intentionControls.forEach((control) => {
    control.addEventListener('click', () => {
      intentionMinutes = Math.max(30, Math.min(720, intentionMinutes + Number(control.dataset.intentionDelta)));
      intentionSet?.classList.remove('is-set');
      if (intentionSet) intentionSet.textContent = 'Set my pact';
      if (intentionStatus) intentionStatus.textContent = '';
      renderIntentionDemo();
    });
  });

  intentionSet?.addEventListener('click', () => {
    intentionSet.classList.add('is-set');
    intentionSet.textContent = `Pact set · ${formatDemoMinutes(intentionMinutes)}`;
    if (intentionStatus) intentionStatus.textContent = 'Your intention remains yours to change.';
  });

  renderIntentionDemo();

  const checkinPrompt = document.getElementById('demo-checkin-prompt');
  const checkinOutcome = document.getElementById('demo-checkin-outcome');
  const checkinMessage = document.getElementById('demo-checkin-message');
  const checkinChoices = document.querySelectorAll('[data-checkin-choice]');

  checkinChoices.forEach((control) => {
    control.addEventListener('click', () => {
      const paused = control.dataset.checkinChoice === 'pause';
      if (checkinMessage) {
        checkinMessage.textContent = paused
          ? 'A pause, chosen in your own time.'
          : 'You continued. The choice stays visible, without judgment.';
      }
      if (checkinPrompt) checkinPrompt.hidden = true;
      if (checkinOutcome) {
        checkinOutcome.hidden = false;
        checkinOutcome.focus();
      }
    });
  });

  document.getElementById('demo-checkin-reset')?.addEventListener('click', () => {
    if (checkinPrompt) checkinPrompt.hidden = false;
    if (checkinOutcome) checkinOutcome.hidden = true;
    if (checkinMessage) checkinMessage.textContent = '';
    document.querySelector('[data-checkin-choice="pause"]')?.focus();
  });

  const circleRequest = document.getElementById('demo-circle-request');
  const circleOutcome = document.getElementById('demo-circle-outcome');
  const circleMessage = document.getElementById('demo-circle-message');
  const circleReply = document.getElementById('demo-circle-reply');
  const circleChoices = document.querySelectorAll('[data-circle-choice]');

  circleChoices.forEach((control) => {
    control.addEventListener('click', () => {
      const agreed = control.dataset.circleChoice === 'agree';
      if (circleMessage) {
        circleMessage.textContent = agreed
          ? 'Agreed. The pact has moved to two hours, thirty.'
          : 'A conversation is ready in the room.';
      }
      if (circleReply) circleReply.hidden = agreed;
      if (circleRequest) circleRequest.hidden = true;
      if (circleOutcome) {
        circleOutcome.hidden = false;
        circleOutcome.focus();
      }
    });
  });

  document.getElementById('demo-circle-reset')?.addEventListener('click', () => {
    if (circleRequest) circleRequest.hidden = false;
    if (circleOutcome) circleOutcome.hidden = true;
    if (circleReply) circleReply.hidden = true;
    if (circleMessage) circleMessage.textContent = '';
    document.querySelector('[data-circle-choice="agree"]')?.focus();
  });


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


  /* ── Google Sheets Endpoint (Apps Script Web App) ──── */
  const GOOGLE_SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxz7_9OMzQhUseW3L-FUZkKv1Hwy3M1m5HL3PCk_mypZJVxvYZUyOBRA3VpBSZRTEiNVw/exec';
  const FORM_REQUEST_TIMEOUT_MS = 10000;

  /* Send a form payload to the Apps Script endpoint.
     Success must mean a readable 2xx response. An opaque `no-cors` response
     cannot distinguish a saved row from a server error, so it is never treated
     as delivery. Each form exposes its ordinary HTML action as a visitor-chosen
     backup when this request cannot be confirmed. */
  async function postFormPayload(payload) {
    const body = JSON.stringify(payload);
    const headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), FORM_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(GOOGLE_SHEETS_ENDPOINT, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      return response.ok;
    } finally {
      window.clearTimeout(timeout);
    }
  }
  /* ── Feedback Form ─────────────────────────────────── */
  const feedbackForm = document.getElementById('feedback-form');
  const feedbackSuccess = document.querySelector('.feedback__success');
  const feedbackStatus = document.getElementById('feedback-status');
  const feedbackBackup = document.getElementById('feedback-backup');

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
      feedbackData.form_type = 'feedback';
      const button = feedbackForm.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Sending…';
      feedbackStatus.textContent = 'Sending your feedback…';
      if (feedbackBackup) feedbackBackup.hidden = true;
      try {
        const delivered = await postFormPayload(feedbackData);
        if (!delivered) throw new Error('The feedback endpoint rejected the submission.');
        feedbackForm.hidden = true;
        if (feedbackSuccess) feedbackSuccess.classList.add('active');
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Send Feedback';
        feedbackStatus.textContent = 'We could not confirm that your feedback was sent. Try again or use the backup form.';
        if (feedbackBackup) feedbackBackup.hidden = false;
      }
    });

    feedbackBackup?.addEventListener('click', () => {
      HTMLFormElement.prototype.submit.call(feedbackForm);
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
