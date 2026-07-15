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
  const waitlistForm = document.getElementById('waitlist-form');
  const waitlistSuccess = document.querySelector('.form-success');
  const waitlistStatus = document.getElementById('waitlist-status');
  const helpGoalSelect = document.getElementById('help-goal-select');
  const helpGoalOtherWrap = document.getElementById('help-goal-other-wrap');
  const helpGoalOther = document.getElementById('help-goal-other');

  helpGoalSelect?.addEventListener('change', () => {
    const showOther = helpGoalSelect.value === 'other';
    if (helpGoalOtherWrap) helpGoalOtherWrap.hidden = !showOther;
    if (!showOther && helpGoalOther) helpGoalOther.value = '';
    if (showOther) helpGoalOther?.focus();
  });

  if (waitlistForm) {
    waitlistForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('email-input');
      const device = document.getElementById('device-select');
      const partner = document.getElementById('partner-select');
      const phone = document.getElementById('phone-number');
      const consent = document.getElementById('tcpa-checkbox');
      const emailError = document.getElementById('email-error');
      const deviceError = document.getElementById('device-error');
      const partnerError = document.getElementById('partner-error');
      const phoneError = document.getElementById('phone-error');
      const consentError = document.getElementById('consent-error');
      const submitButton = document.getElementById('submit-btn');
      const phoneDigits = phone.value.replace(/\D/g, '');

      emailError.textContent = '';
      deviceError.textContent = '';
      partnerError.textContent = '';
      phoneError.textContent = '';
      consentError.textContent = '';
      waitlistStatus.textContent = '';

      let valid = true;
      if (!email.validity.valid) {
        emailError.textContent = 'Enter a valid email address.';
        valid = false;
      }
      if (!device.value) {
        deviceError.textContent = 'Please select which phone you use.';
        valid = false;
      }
      if (!partner.value) {
        partnerError.textContent = 'Please select a pact partner choice.';
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
      payload.form_type = 'waitlist';
      submitButton.disabled = true;
      submitButton.textContent = 'Joining…';
      waitlistStatus.textContent = 'Saving your place…';

      try {
        await fetch(GOOGLE_SHEETS_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        });
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

  /* ── Waitlist Share Card Setup ── */
  const copyShareBtn = document.getElementById('copy-share-btn');
  const nativeShareBtn = document.getElementById('native-share-btn');
  const shareStatus = document.getElementById('share-status');
  
  const shareMessage = "Hey! I just signed up for PhonePact. It helps us use our phones less through a pact with people we trust—without lockouts or shame. Want to make a pact? https://getphonepact.com";
  const shareUrl = "https://getphonepact.com";
  const shareTextOnly = "Hey! I just signed up for PhonePact. It helps us use our phones less through a pact with people we trust—without lockouts or shame. Want to make a pact?";

  if (copyShareBtn) {
    copyShareBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareMessage);
        shareStatus.textContent = 'Invite copied to clipboard!';
        shareStatus.style.color = '#5b8266'; // PhonePact theme green
        setTimeout(() => { shareStatus.textContent = ''; }, 3000);
      } catch (err) {
        shareStatus.textContent = 'Failed to copy link. Please manually select and copy.';
        shareStatus.style.color = '#7a2d2d';
      }
    });
  }

  if (nativeShareBtn) {
    if (!navigator.share) {
      nativeShareBtn.style.display = 'none';
    } else {
      nativeShareBtn.addEventListener('click', async () => {
        try {
          await navigator.share({
            title: 'Make a PhonePact',
            text: shareTextOnly,
            url: shareUrl
          });
          shareStatus.textContent = 'Shared successfully!';
          setTimeout(() => { shareStatus.textContent = ''; }, 3000);
        } catch (err) {
          console.log('Share failed or cancelled', err);
        }
      });
    }
  }

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
      feedbackData.form_type = 'feedback';
      const button = feedbackForm.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Sending…';
      feedbackStatus.textContent = 'Sending your feedback…';
      try {
        await fetch(GOOGLE_SHEETS_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(feedbackData)
        });
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
