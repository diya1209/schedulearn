// Theme management
class ThemeManager {
  constructor() {
    this.theme = localStorage.getItem('theme') || 'dark';
    this.init();
  }

  init() {
    this.applyTheme();
    this.setupToggle();
  }

  applyTheme() {
    document.body.className = this.theme === 'dark' ? 'dark-theme' : 'light-theme';
    this.updateToggleIcon();
  }

  updateToggleIcon() {
    const toggles = document.querySelectorAll('.theme-toggle .theme-icon');
    toggles.forEach(toggle => {
      toggle.textContent = this.theme === 'dark' ? '☀️' : '🌙';
    });
  }

  toggle() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', this.theme);
    this.applyTheme();
  }

  setupToggle() {
    const toggleButtons = document.querySelectorAll('.theme-toggle');
    toggleButtons.forEach(button => {
      button.addEventListener('click', () => this.toggle());
    });
  }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ThemeManager();
});