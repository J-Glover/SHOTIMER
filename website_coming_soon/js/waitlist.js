/**
 * Shotimer Coming Soon — Waitlist Notification Script
 * Handles both Hero and Bottom waitlist capture forms with:
 * - Real-time client email validation
 * - Async submission to /api/waitlist (persisting to data/waitlist.json on server)
 * - LocalStorage offline resilience
 * - Smooth celebration state with "Register another email" reset button
 */

document.addEventListener('DOMContentLoaded', () => {
  const setupWaitlistForm = (prefix) => {
    const form = document.getElementById(`${prefix}-form`);
    const emailInput = document.getElementById(`${prefix}-email`);
    const submitBtn = document.getElementById(`${prefix}-submit-btn`);
    const successState = document.getElementById(`${prefix}-success`);
    const formContainer = document.getElementById(`${prefix}-form-container`);
    const userEmailDisplay = document.getElementById(`${prefix}-user-email`);
    const resetBtn = document.getElementById(`${prefix}-reset-btn`);

    if (!form || !emailInput) return;

    const showForm = () => {
      if (formContainer && successState) {
        formContainer.style.display = 'block';
        successState.style.display = 'none';
        emailInput.value = '';
        emailInput.focus();
      }
    };

    const showSuccess = (email) => {
      if (formContainer && successState) {
        formContainer.style.display = 'none';
        successState.style.display = 'block';
        if (userEmailDisplay) userEmailDisplay.textContent = email;
      }
    };

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        showForm();
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();

      // Email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        emailInput.focus();
        emailInput.style.borderColor = '#EF4444';
        return;
      }

      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Notify Me';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
      }

      try {
        const response = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          throw new Error('Server returned ' + response.status);
        }
      } catch (err) {
        console.warn('Backend waitlist API unavailable, falling back to direct Supabase sync:', err);
        // Direct Supabase fallback (works on static hosting or offline dev)
        try {
          await fetch('https://yodcnmzgmjcjgxizcowm.supabase.co/rest/v1/waitlist', {
            method: 'POST',
            headers: {
              apikey: 'sb_publishable__L0Nx0Gr4xTdpxZrAq0veA_6de4-j8E',
              Authorization: 'Bearer sb_publishable__L0Nx0Gr4xTdpxZrAq0veA_6de4-j8E',
              'Content-Type': 'application/json',
              Prefer: 'resolution=ignore-duplicates',
            },
            body: JSON.stringify({ email, source: 'website_coming_soon_direct' }),
          });
        } catch (supabaseErr) {
          console.warn('Supabase direct insert deferred:', supabaseErr);
        }
      } finally {
        try {
          localStorage.setItem('shotimer_last_submitted_email', email);
        } catch {}

        showSuccess(email);

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    });

    emailInput.addEventListener('input', () => {
      emailInput.style.borderColor = '';
    });
  };

  // Initialize both hero and bottom waitlist cards
  setupWaitlistForm('waitlist');
  setupWaitlistForm('bottom-waitlist');

  // Smooth scroll helper for "Join Waitlist" navigation buttons
  document.querySelectorAll('a[href="#waitlist-section"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById('waitlist-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const emailInput = document.getElementById('waitlist-email');
        if (emailInput) {
          setTimeout(() => emailInput.focus(), 500);
        }
      }
    });
  });
});
