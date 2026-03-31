export default class ThemeManager {
    constructor(app) {
      this.app = app;
      this.theme = this.app.state.theme;
      this.applyTheme();
    }
  
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      this.app.updateState({ theme: this.theme });
      this.applyTheme();
    }
  
    applyTheme() {
      document.documentElement.classList.toggle('dark', this.theme === 'dark');
      // You can extend this to update custom vars if needed
    }
  }