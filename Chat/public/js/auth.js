// Handles both login and signup pages (form ids: loginForm, signupForm)

const apiBase = '/api/auth';

function showMessage(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.remove('hidden');
}

function hideMessage(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  el.textContent = '';
}

// Signup flow
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    hideMessage('errorMessage');
    hideMessage('successMessage');

    const username = (document.getElementById('username') || {}).value?.trim();
    const email = (document.getElementById('email') || {}).value?.trim();
    const password = (document.getElementById('password') || {}).value || '';
    const confirmPassword = (document.getElementById('confirmPassword') || {}).value || '';

    if (!username || username.length < 3 || username.length > 20) {
      showMessage('errorMessage', 'Username must be between 3 and 20 characters.');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage('errorMessage', 'Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 8) {
      showMessage('errorMessage', 'Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      showMessage('errorMessage', 'Passwords do not match.');
      return;
    }

    try {
      const res = await fetch(`${apiBase}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error || data?.message || 'Registration failed';
        showMessage('errorMessage', msg);
        if (typeof showAlert === 'function') showAlert(msg, 'error');
        return;
      }

      const successMsg = data?.message || 'Registered successfully. Redirecting to login...';
      showMessage('successMessage', successMsg);
      if (typeof showAlert === 'function') showAlert(successMsg, 'success');

      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1200);
    } catch (err) {
      showMessage('errorMessage', 'Network error. Please try again.');
      console.error(err);
    }
  });
}

// Login flow (preserve existing behavior if login page uses this file)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    hideMessage('errorMessage');

    const email = (document.getElementById('email') || {}).value?.trim();
    const password = (document.getElementById('password') || {}).value || '';

    if (!email || !password) {
      showMessage('errorMessage', 'Email and password are required.');
      return;
    }

    try {
      const res = await fetch(`${apiBase}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error || data?.message || 'Login failed';
        showMessage('errorMessage', msg);
        if (typeof showAlert === 'function') showAlert(msg, 'error');
        return;
      }

      // Cookie is set by server; show success toast
      if (typeof showAlert === 'function') showAlert('Login successful', 'success');

      // Redirect to chat page after successful login
      setTimeout(() => {
        window.location.href = '/chat.html';
      }, 600);
    } catch (err) {
      showMessage('errorMessage', 'Network error. Please try again.');
      console.error(err);
    }
  });
}