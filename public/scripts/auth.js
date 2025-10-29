import { supabase } from './supabase.js';

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
        const email = `${username}@schedulearn.local`;

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          showError('Invalid username or password');
          return;
        }

        const { data: userData, error: queryError } = await supabase
          .from('users')
          .select('username')
          .eq('id', data.user.id)
          .maybeSingle();

        if (queryError || !userData) {
          showError('Login failed. Please try again.');
          return;
        }

        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('username', userData.username);
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please try again.');
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
        const email = `${username}@schedulearn.local`;

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + '/dashboard',
            data: {
              username
            }
          }
        });

        if (signUpError) {
          console.error('Sign up error:', signUpError);
          showError(`Registration failed: ${signUpError.message}`);
          return;
        }

        if (!signUpData.user) {
          showError('Registration failed. Please try again.');
          return;
        }

        console.log('User created:', signUpData.user.id);
        console.log('Session:', signUpData.session);

        if (signUpData.session) {
          const { error: insertError } = await supabase
            .from('users')
            .insert([{
              id: signUpData.user.id,
              username
            }]);

          if (insertError) {
            console.error('Insert error:', insertError);
            showError(`Registration failed: ${insertError.message}`);
            return;
          }

          localStorage.setItem('userId', signUpData.user.id);
          localStorage.setItem('username', username);
          window.location.href = '/dashboard';
        } else {
          showError('Email confirmation is required. Please check your email.');
        }
      } catch (error) {
        console.error('Signup error:', error);
        showError(`Registration failed: ${error.message}`);
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
