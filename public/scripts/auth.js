import { supabase } from './supabase.js';
import bcrypt from 'https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  setupPasswordToggle();

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(loginForm);
      const username = formData.get('username');
      const password = formData.get('password');

      try {
        const { data: users, error: queryError } = await supabase
          .from('users')
          .select('id, username, password')
          .eq('username', username)
          .maybeSingle();

        if (queryError || !users) {
          showError('Invalid username or password');
          return;
        }

        const isValid = await bcrypt.compare(password, users.password);
        if (!isValid) {
          showError('Invalid username or password');
          return;
        }

        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) {
          showError('Login failed. Please try again.');
          return;
        }

        localStorage.setItem('userId', users.id);
        localStorage.setItem('username', users.username);
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(signupForm);
      const username = formData.get('username');
      const password = formData.get('password');

      if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
      }

      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (existingUser) {
          showError('Username already exists');
          return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) {
          showError('Registration failed. Please try again.');
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([{
            id: user.id,
            username,
            password: hashedPassword
          }])
          .select()
          .single();

        if (insertError) {
          showError('Registration failed. Please try again.');
          return;
        }

        localStorage.setItem('userId', newUser.id);
        localStorage.setItem('username', newUser.username);
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Signup error:', error);
        showError('Network error. Please try again.');
      }
    });
  }

  function showError(message) {
    const existingError = document.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
      background: #fee2e2;
      color: #dc2626;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      border: 1px solid #fecaca;
      font-size: 14px;
    `;
    errorDiv.textContent = message;

    const form = document.querySelector('.auth-form');
    form.insertBefore(errorDiv, form.firstChild);

    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  function setupPasswordToggle() {
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('password');

    if (passwordToggle && passwordInput) {
      passwordToggle.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';

        const icon = passwordToggle.querySelector('.password-toggle-icon');
        icon.textContent = isPassword ? '🙈' : '👁️';
      });
    }
  }
});
