// ==========================================================================
// Shotimer — Public Marketing Website Main Interactions
// Navigation, Pricing Toggle, FAQ Accordion, Auth Modal
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Drawer
  const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');

  if (mobileMenuBtn && mobileDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileDrawer.classList.toggle('open');
      const isOpen = mobileDrawer.classList.contains('open');
      mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
      mobileMenuBtn.innerHTML = isOpen
        ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    });

    // Close when clicking a link
    mobileDrawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        mobileMenuBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
      });
    });
  }

  // 2. Pricing Billing Interval Switcher
  const btnMonthly = document.getElementById('billing-monthly-btn');
  const btnAnnual = document.getElementById('billing-annual-btn');
  const proPriceAmount = document.getElementById('pricing-pro-amount');
  const proPricePeriod = document.getElementById('pricing-pro-period');

  if (btnMonthly && btnAnnual && proPriceAmount) {
    btnMonthly.addEventListener('click', () => {
      btnMonthly.classList.add('active');
      btnAnnual.classList.remove('active');
      proPriceAmount.textContent = '$14.99';
      if (proPricePeriod) proPricePeriod.textContent = '/ month';
    });

    btnAnnual.addEventListener('click', () => {
      btnAnnual.classList.add('active');
      btnMonthly.classList.remove('active');
      proPriceAmount.textContent = '$8.25';
      if (proPricePeriod) proPricePeriod.textContent = '/ mo (billed $99/yr)';
    });
  }

  // 3. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const questionBtn = item.querySelector('.faq-question');
    if (!questionBtn) return;

    questionBtn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close other items for clean accordion behavior
      faqItems.forEach((other) => {
        if (other !== item) other.classList.remove('open');
      });

      item.classList.toggle('open', !isOpen);
    });
  });

  // 4. Auth Modal (Login / Sign Up / License Activation)
  const authModal = document.getElementById('auth-modal');
  const openAuthBtns = document.querySelectorAll('.open-auth-modal');
  const closeAuthBtn = document.getElementById('close-auth-modal');
  const authTabs = document.querySelectorAll('.auth-tab-btn');
  const loginForm = document.getElementById('auth-login-form');
  const licenseForm = document.getElementById('auth-license-form');
  const licenseKeyInput = document.getElementById('auth-license-key');
  const licenseFeedback = document.getElementById('auth-license-feedback');

  function openModal() {
    if (authModal) {
      authModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (authModal) {
      authModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  openAuthBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  if (closeAuthBtn) {
    closeAuthBtn.addEventListener('click', closeModal);
  }

  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && authModal.classList.contains('open')) {
        closeModal();
      }
    });
  }

  // Auth Tab Switch (Magic Link / Email vs License Key)
  authTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      authTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-target');
      if (target === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (licenseForm) licenseForm.style.display = 'none';
      } else {
        if (loginForm) loginForm.style.display = 'none';
        if (licenseForm) licenseForm.style.display = 'block';
      }
    });
  });

  // Demo Pro Key Quick Activation
  if (licenseForm && licenseKeyInput && licenseFeedback) {
    licenseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const key = licenseKeyInput.value.trim().toUpperCase();

      if (key === 'PRO-STAGE-2026') {
        licenseFeedback.innerHTML = `<span style="color: var(--emerald-live); font-weight: 600;">✓ License verified! Redirecting to Pro Controller...</span>`;
        setTimeout(() => {
          window.location.href = '/?view=controller';
        }, 1200);
      } else {
        licenseFeedback.innerHTML = `<span style="color: var(--signal-red); font-weight: 600;">✕ Invalid license key. Demo key is: PRO-STAGE-2026</span>`;
      }
    });
  }
});
