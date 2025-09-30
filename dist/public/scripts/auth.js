// Authentication handling
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  // Setup password toggle functionality
  setupPasswordToggle();

  // Handle login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(loginForm);
      const data = {
        username: formData.get('username'),
        password: formData.get('password')
      };

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
          window.location.href = result.redirect;
        } else {
          showError(result.error || 'Login failed');
        }
      } catch (error) {
        showError('Network error. Please try again.');
      }
    });
  }

  // Handle signup form submission
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(signupForm);
      const data = {
        username: formData.get('username'),
        password: formData.get('password')
      };

      // Basic validation
      if (data.password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
      }

      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
          window.location.href = result.redirect;
        } else {
          showError(result.error || 'Registration failed');
        }
      } catch (error) {
        showError('Network error. Please try again.');
      }
    });
  }

  // Error display function
  function showError(message) {
    // Remove existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }

    // Create and show new error message
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

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  // Password toggle functionality
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