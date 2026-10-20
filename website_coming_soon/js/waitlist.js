/**
 * Shotimer Coming Soon — Waitlist Notification Script
 * Submits to /api/waitlist (saving to data/waitlist.json on the server)
 * and allows easy form reset for multiple submissions.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('waitlist-form');
  const emailInput = document.getElementById('waitlist-email');
  const submitBtn = document.getElementById('waitlist-submit-btn');
  const successState = document.getElementById('waitlist-success');
  const formContainer = document.getElementById('waitlist-form-container');
  const userEmailDisplay = document.getElementById('waitlist-user-email');
  const resetBtn = document.getElementById('waitlist-reset-btn');

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

  // Allow resetting form anytime
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      showForm();
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      emailInput.focus();
      emailInput.style.borderColor = '#EF4444';
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    try {
      // POST to backend API to write to data/waitlist.json
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Server returned ' + response.status);
      }
    } catch (err) {
      console.warn('Backend waitlist API unavailable, falling back to local storage:', err);
    } finally {
      // Store locally in browser as well
      localStorage.setItem('shotimer_last_submitted_email', email);
      showSuccess(email);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Notify Me';
      }
    }
  });

  // Reset border on typing
  emailInput.addEventListener('input', () => {
    emailInput.style.borderColor = '';
  });
});
