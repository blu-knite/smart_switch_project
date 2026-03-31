export default class SettingsPage {
  constructor(app) {
    this.app = app;
    this.initialized = false;
    this.userSettings = {
      notifications: true,
      darkMode: true,
      aiAssist: true,
      autoUpdate: true,
      language: 'en',
      timezone: 'UTC'
    };
  }

  async init() {
    try {
      if (this.initialized) return;
      this.initialized = true;
      
      await this.loadSettings();
      this.render();
    } catch (error) {
      console.error('SettingsPage init error:', error);
      // Still render even if loading fails
      this.render();
    }
  }

  async loadSettings() {
    try {
      const api = this.app.getService('api');
      const user = await api.getCurrentUser();
      if (user && user.settings) {
        this.userSettings = { ...this.userSettings, ...user.settings };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use localStorage as fallback
      const savedSettings = localStorage.getItem('smartswitch_settings');
      if (savedSettings) {
        try {
          this.userSettings = { ...this.userSettings, ...JSON.parse(savedSettings) };
        } catch (e) {
          console.error('Failed to parse saved settings:', e);
        }
      }
    }
  }

  saveSettingsToStorage() {
    localStorage.setItem('smartswitch_settings', JSON.stringify(this.userSettings));
  }

  render() {
    const container = document.getElementById('settings-page');
    if (!container) {
      console.error('Settings page container not found');
      return;
    }

    const user = this.app.getState()?.user || {};
    const theme = this.app.getState()?.theme || 'dark';
    const boards = this.app.getState()?.boards || [];
    const switches = this.app.getState()?.switches || [];

    container.innerHTML = `
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gradient mb-2">Settings</h1>
        <p class="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <!-- Settings Tabs -->
      <div class="border-b border-border mb-6">
        <div class="flex gap-4 overflow-x-auto pb-2">
          <button class="settings-tab px-4 py-2 font-medium border-b-2 border-primary text-primary" data-tab="profile">
            <i class="fas fa-user mr-2"></i>Profile
          </button>
          <button class="settings-tab px-4 py-2 font-medium text-muted-foreground hover:text-foreground transition" data-tab="preferences">
            <i class="fas fa-sliders-h mr-2"></i>Preferences
          </button>
          <button class="settings-tab px-4 py-2 font-medium text-muted-foreground hover:text-foreground transition" data-tab="devices">
            <i class="fas fa-microchip mr-2"></i>Devices
          </button>
          <button class="settings-tab px-4 py-2 font-medium text-muted-foreground hover:text-foreground transition" data-tab="notifications">
            <i class="fas fa-bell mr-2"></i>Notifications
          </button>
          <button class="settings-tab px-4 py-2 font-medium text-muted-foreground hover:text-foreground transition" data-tab="security">
            <i class="fas fa-shield-alt mr-2"></i>Security
          </button>
          <button class="settings-tab px-4 py-2 font-medium text-muted-foreground hover:text-foreground transition" data-tab="system">
            <i class="fas fa-server mr-2"></i>System
          </button>
        </div>
      </div>

      <!-- Tab Content -->
      <div id="settings-content"></div>
    `;

    this.renderTab('profile');
    this.bindEvents();
  }

  renderTab(tabName) {
    const content = document.getElementById('settings-content');
    if (!content) return;

    const user = this.app.getState()?.user || {};
    const boards = this.app.getState()?.boards || [];
    const switches = this.app.getState()?.switches || [];

    const tabs = {
      profile: `
        <div class="max-w-2xl">
          <div class="glass-card p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
              <i class="fas fa-user-circle text-primary"></i>
              Profile Information
            </h2>
            
            <div class="flex items-center gap-6 mb-6">
              <div class="relative">
                <img src="${user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (user.email || 'user')}" 
                     alt="Avatar" 
                     class="w-24 h-24 rounded-full border-2 border-primary">
                <button id="change-avatar-btn" class="absolute bottom-0 right-0 bg-primary rounded-full p-1 text-background">
                  <i class="fas fa-camera text-xs"></i>
                </button>
              </div>
              <div>
                <h3 class="text-xl font-bold">${this.escapeHtml(user.name || 'User')}</h3>
                <p class="text-muted-foreground">${this.escapeHtml(user.email || 'Not set')}</p>
                <p class="text-xs text-muted-foreground mt-1">Role: ${user.role || 'User'}</p>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">Full Name</label>
                <input type="text" id="profile-name" value="${this.escapeHtml(user.name || '')}" 
                       class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Email Address</label>
                <input type="email" id="profile-email" value="${this.escapeHtml(user.email || '')}" 
                       class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Bio</label>
                <textarea id="profile-bio" rows="3" 
                          class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary"
                          placeholder="Tell us about yourself...">${this.escapeHtml(user.bio || '')}</textarea>
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button id="save-profile-btn" class="px-5 py-2 bg-primary text-background rounded-lg hover:opacity-90 transition">
                <i class="fas fa-save mr-2"></i>Save Changes
              </button>
            </div>
          </div>
        </div>
      `,

      preferences: `
        <div class="max-w-2xl">
          <div class="glass-card p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
              <i class="fas fa-palette text-primary"></i>
              Appearance
            </h2>
            
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">Dark Mode</p>
                  <p class="text-sm text-muted-foreground">Switch between light and dark theme</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="dark-mode-toggle" ${this.userSettings.darkMode !== false ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">Animations</p>
                  <p class="text-sm text-muted-foreground">Enable smooth animations throughout the app</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="animations-toggle" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="glass-card p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
              <i class="fas fa-language text-primary"></i>
              Language & Region
            </h2>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">Language</label>
                <select id="language-select" class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                  <option value="en" ${this.userSettings.language === 'en' ? 'selected' : ''}>English</option>
                  <option value="es" ${this.userSettings.language === 'es' ? 'selected' : ''}>Español</option>
                  <option value="fr" ${this.userSettings.language === 'fr' ? 'selected' : ''}>Français</option>
                  <option value="de" ${this.userSettings.language === 'de' ? 'selected' : ''}>Deutsch</option>
                  <option value="zh" ${this.userSettings.language === 'zh' ? 'selected' : ''}>中文</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-1">Time Zone</label>
                <select id="timezone-select" class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                  <option value="UTC" ${this.userSettings.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                  <option value="America/New_York" ${this.userSettings.timezone === 'America/New_York' ? 'selected' : ''}>Eastern Time</option>
                  <option value="America/Chicago" ${this.userSettings.timezone === 'America/Chicago' ? 'selected' : ''}>Central Time</option>
                  <option value="America/Denver" ${this.userSettings.timezone === 'America/Denver' ? 'selected' : ''}>Mountain Time</option>
                  <option value="America/Los_Angeles" ${this.userSettings.timezone === 'America/Los_Angeles' ? 'selected' : ''}>Pacific Time</option>
                  <option value="Europe/London" ${this.userSettings.timezone === 'Europe/London' ? 'selected' : ''}>London</option>
                  <option value="Europe/Paris" ${this.userSettings.timezone === 'Europe/Paris' ? 'selected' : ''}>Paris</option>
                  <option value="Asia/Tokyo" ${this.userSettings.timezone === 'Asia/Tokyo' ? 'selected' : ''}>Tokyo</option>
                </select>
              </div>
            </div>
          </div>

          <div class="glass-card p-6">
            <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
              <i class="fas fa-microchip text-primary"></i>
              AI Features
            </h2>
            
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">AI Assistant</p>
                  <p class="text-sm text-muted-foreground">Get AI-powered recommendations and insights</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="ai-assist-toggle" ${this.userSettings.aiAssist !== false ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">Auto-Optimization</p>
                  <p class="text-sm text-muted-foreground">Let AI automatically optimize your schedules</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="auto-optimize-toggle" ${this.userSettings.autoOptimize !== false ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      `,

      devices: `
        <div>
          <div class="glass-card p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
              <i class="fas fa-microchip text-primary"></i>
              Device Management
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div class="bg-muted/20 p-4 rounded-lg">
                <p class="text-sm text-muted-foreground">Total Boards</p>
                <p class="text-2xl font-bold">${boards.length}</p>
              </div>
              <div class="bg-muted/20 p-4 rounded-lg">
                <p class="text-sm text-muted-foreground">Total Switches</p>
                <p class="text-2xl font-bold">${switches.length}</p>
              </div>
            </div>
            
            <div class="space-y-3">
              <button id="discover-devices-btn" class="w-full px-4 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition flex items-center justify-center gap-2">
                <i class="fas fa-search"></i>
                Discover New Devices
              </button>
              <button id="sync-devices-btn" class="w-full px-4 py-3 bg-muted/30 text-muted-foreground rounded-lg hover:bg-muted/50 transition flex items-center justify-center gap-2">
                <i class="fas fa-sync-alt"></i>
                Sync Device Status
              </button>
            </div>
          </div>

          <div class="glass-card p-6">
            <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
              <i class="fas fa-chart-line text-primary"></i>
              Device Statistics
            </h2>
            
            <div class="space-y-3">
              <div class="flex justify-between items-center py-2 border-b border-border">
                <span>Online Devices</span>
                <span class="text-success">${boards.filter(b => b.isOnline !== false).length}/${boards.length}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-border">
                <span>Active Switches</span>
                <span class="text-success">${switches.filter(s => s.state).length}/${switches.length}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-border">
                <span>Total Power Consumption</span>
                <span class="text-warning">${switches.filter(s => s.state).reduce((sum, s) => sum + (s.power || 0), 0)} W</span>
              </div>
            </div>
          </div>
        </div>
      `,

      notifications: `
        <div class="max-w-2xl">
          <div class="glass-card p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
              <i class="fas fa-bell text-primary"></i>
              Notification Preferences
            </h2>
            
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">Push Notifications</p>
                  <p class="text-sm text-muted-foreground">Receive browser notifications</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="push-notifications-toggle" ${this.userSettings.notifications !== false ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">Device Status Alerts</p>
                  <p class="text-sm text-muted-foreground">Get notified when devices go offline/online</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="device-alerts-toggle" ${this.userSettings.deviceAlerts !== false ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">AI Recommendations</p>
                  <p class="text-sm text-muted-foreground">Receive AI-powered suggestions</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="ai-recommendations-toggle" ${this.userSettings.aiRecommendations !== false ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">Email Notifications</p>
                  <p class="text-sm text-muted-foreground">Receive important updates via email</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="email-notifications-toggle" ${this.userSettings.emailNotifications !== false ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      `,

      security: `
        <div class="max-w-2xl">
          <div class="glass-card p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
              <i class="fas fa-key text-primary"></i>
              Change Password
            </h2>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">Current Password</label>
                <input type="password" id="current-password" 
                       class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">New Password</label>
                <input type="password" id="new-password" 
                       class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                <p class="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Confirm New Password</label>
                <input type="password" id="confirm-password" 
                       class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
              </div>
            </div>
            
            <div class="mt-6 flex justify-end">
              <button id="change-password-btn" class="px-5 py-2 bg-primary text-background rounded-lg hover:opacity-90 transition">
                <i class="fas fa-lock mr-2"></i>Update Password
              </button>
            </div>
          </div>

          <div class="glass-card p-6">
            <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
              <i class="fas fa-history text-primary"></i>
              Session Management
            </h2>
            
            <div class="space-y-3">
              <div class="flex justify-between items-center py-2 border-b border-border">
                <span>Current Session</span>
                <span class="text-success">Active</span>
              </div>
              <button id="logout-all-devices-btn" class="w-full px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition">
                <i class="fas fa-sign-out-alt mr-2"></i>
                Logout from all devices
              </button>
            </div>
          </div>
        </div>
      `,

      system: `
        <div>
          <div class="glass-card p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
              <i class="fas fa-info-circle text-primary"></i>
              System Information
            </h2>
            
            <div class="space-y-3">
              <div class="flex justify-between items-center py-2 border-b border-border">
                <span>Version</span>
                <span>2.0.0</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-border">
                <span>API Status</span>
                <span id="api-status" class="text-success">Checking...</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-border">
                <span>MQTT Status</span>
                <span id="mqtt-status" class="text-warning">Checking...</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-border">
                <span>Last Sync</span>
                <span id="last-sync">${new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div class="glass-card p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
              <i class="fas fa-database text-primary"></i>
              Data Management
            </h2>
            
            <div class="space-y-3">
              <button id="export-data-btn" class="w-full px-4 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition flex items-center justify-center gap-2">
                <i class="fas fa-download"></i>
                Export All Data
              </button>
              <button id="clear-cache-btn" class="w-full px-4 py-3 bg-warning/10 text-warning rounded-lg hover:bg-warning/20 transition flex items-center justify-center gap-2">
                <i class="fas fa-trash-alt"></i>
                Clear Cache
              </button>
            </div>
          </div>

          <div class="glass-card p-6">
            <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
              <i class="fas fa-exclamation-triangle text-destructive"></i>
              Danger Zone
            </h2>
            
            <div class="space-y-3">
              <button id="reset-settings-btn" class="w-full px-4 py-3 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition flex items-center justify-center gap-2">
                <i class="fas fa-undo-alt"></i>
                Reset All Settings
              </button>
              <button id="delete-account-btn" class="w-full px-4 py-3 bg-destructive text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2">
                <i class="fas fa-user-slash"></i>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      `
    };

    content.innerHTML = tabs[tabName] || tabs.profile;
    
    // Update active tab styling
    document.querySelectorAll('.settings-tab').forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('border-primary', 'text-primary');
        tab.classList.remove('text-muted-foreground');
      } else {
        tab.classList.remove('border-primary', 'text-primary');
        tab.classList.add('text-muted-foreground');
      }
    });
  }

  bindEvents() {
    // Tab switching
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.renderTab(tabName);
        this.bindEvents(); // Re-bind events for new content
      });
    });

    // Profile save
    const saveProfileBtn = document.getElementById('save-profile-btn');
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', async () => {
        await this.saveProfile();
      });
    }

    // Change password
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', async () => {
        await this.changePassword();
      });
    }

    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
      darkModeToggle.addEventListener('change', (e) => {
        this.userSettings.darkMode = e.target.checked;
        this.saveSettingsToStorage();
        this.app.components.theme.toggleTheme();
        this.app.components.notification.show({
          title: 'Theme Updated',
          message: `Dark mode ${e.target.checked ? 'enabled' : 'disabled'}`,
          type: 'success'
        });
      });
    }

    // AI Assist toggle
    const aiAssistToggle = document.getElementById('ai-assist-toggle');
    if (aiAssistToggle) {
      aiAssistToggle.addEventListener('change', (e) => {
        this.userSettings.aiAssist = e.target.checked;
        this.saveSettingsToStorage();
        this.app.components.notification.show({
          title: 'AI Assistant',
          message: e.target.checked ? 'AI features enabled' : 'AI features disabled',
          type: 'info'
        });
      });
    }

    // Language select
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        this.userSettings.language = e.target.value;
        this.saveSettingsToStorage();
        this.app.components.notification.show({
          title: 'Language Updated',
          message: `Language set to ${e.target.options[e.target.selectedIndex].text}`,
          type: 'success'
        });
      });
    }

    // Timezone select
    const timezoneSelect = document.getElementById('timezone-select');
    if (timezoneSelect) {
      timezoneSelect.addEventListener('change', (e) => {
        this.userSettings.timezone = e.target.value;
        this.saveSettingsToStorage();
        this.app.components.notification.show({
          title: 'Timezone Updated',
          message: `Timezone set to ${e.target.value}`,
          type: 'success'
        });
      });
    }

    // Discover devices
    const discoverBtn = document.getElementById('discover-devices-btn');
    if (discoverBtn) {
      discoverBtn.addEventListener('click', async () => {
        await this.discoverDevices();
      });
    }

    // Sync devices
    const syncBtn = document.getElementById('sync-devices-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        await this.syncDevices();
      });
    }

    // Export data
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportData();
      });
    }

    // Clear cache
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', async () => {
        await this.clearCache();
      });
    }

    // Reset settings
    const resetBtn = document.getElementById('reset-settings-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        await this.resetSettings();
      });
    }

    // Delete account
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener('click', async () => {
        await this.deleteAccount();
      });
    }

    // Logout all devices
    const logoutAllBtn = document.getElementById('logout-all-devices-btn');
    if (logoutAllBtn) {
      logoutAllBtn.addEventListener('click', async () => {
        await this.logoutAllDevices();
      });
    }

    // System status check
    this.checkSystemStatus();
  }

  async saveProfile() {
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    const bioInput = document.getElementById('profile-bio');

    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    const bio = bioInput?.value;

    if (!name) {
      this.app.components.notification.show({
        title: 'Error',
        message: 'Name is required',
        type: 'error'
      });
      return;
    }

    try {
      const api = this.app.getService('api');
      await api.updateProfile({ name, email, bio });
      
      this.app.state.user = { ...this.app.state.user, name, email, bio };
      
      this.app.components.notification.show({
        title: 'Profile Updated',
        message: 'Your profile has been saved',
        type: 'success'
      });
      
      // Refresh sidebar to show updated name
      if (this.app.components.sidebar) {
        this.app.components.sidebar.render();
      }
    } catch (error) {
      this.app.components.notification.show({
        title: 'Error',
        message: error.message || 'Failed to update profile',
        type: 'error'
      });
    }
  }

  async changePassword() {
    const currentPassword = document.getElementById('current-password')?.value;
    const newPassword = document.getElementById('new-password')?.value;
    const confirmPassword = document.getElementById('confirm-password')?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      this.app.components.notification.show({
        title: 'Error',
        message: 'All fields are required',
        type: 'error'
      });
      return;
    }

    if (newPassword.length < 6) {
      this.app.components.notification.show({
        title: 'Error',
        message: 'Password must be at least 6 characters',
        type: 'error'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      this.app.components.notification.show({
        title: 'Error',
        message: 'Passwords do not match',
        type: 'error'
      });
      return;
    }

    try {
      const api = this.app.getService('api');
      await api.changePassword({ currentPassword, newPassword });
      
      this.app.components.notification.show({
        title: 'Password Updated',
        message: 'Your password has been changed',
        type: 'success'
      });
      
      // Clear password fields
      document.getElementById('current-password').value = '';
      document.getElementById('new-password').value = '';
      document.getElementById('confirm-password').value = '';
    } catch (error) {
      this.app.components.notification.show({
        title: 'Error',
        message: error.message || 'Failed to change password',
        type: 'error'
      });
    }
  }

  async discoverDevices() {
    try {
      const api = this.app.getService('api');
      await api.discoverBoards();
      
      this.app.components.notification.show({
        title: 'Device Discovery',
        message: 'Searching for new devices...',
        type: 'info'
      });
      
      // Wait a bit then refresh
      setTimeout(async () => {
        await this.app.refreshAllData();
        this.app.components.notification.show({
          title: 'Discovery Complete',
          message: 'Device scan finished',
          type: 'success'
        });
      }, 3000);
    } catch (error) {
      this.app.components.notification.show({
        title: 'Error',
        message: error.message || 'Failed to discover devices',
        type: 'error'
      });
    }
  }

  async syncDevices() {
    try {
      await this.app.refreshAllData();
      this.app.components.notification.show({
        title: 'Sync Complete',
        message: 'All devices synchronized',
        type: 'success'
      });
    } catch (error) {
      this.app.components.notification.show({
        title: 'Sync Failed',
        message: error.message,
        type: 'error'
      });
    }
  }

  exportData() {
    const state = this.app.getState();
    const exportData = {
      user: state.user,
      boards: state.boards,
      places: state.places,
      schedules: state.schedules,
      routines: state.routines,
      settings: this.userSettings,
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `smartswitch_backup_${new Date().toISOString().slice(0,10)}.json`);
    linkElement.click();
    
    this.app.components.notification.show({
      title: 'Export Complete',
      message: 'Your data has been exported',
      type: 'success'
    });
  }

  async clearCache() {
    try {
      // Clear localStorage except auth token
      const token = localStorage.getItem('token');
      localStorage.clear();
      if (token) localStorage.setItem('token', token);
      
      // Clear session storage
      sessionStorage.clear();
      
      this.app.components.notification.show({
        title: 'Cache Cleared',
        message: 'Local cache has been cleared',
        type: 'success'
      });
      
      // Reload page to refresh
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      this.app.components.notification.show({
        title: 'Error',
        message: 'Failed to clear cache',
        type: 'error'
      });
    }
  }

  async resetSettings() {
    const confirmed = confirm('Are you sure you want to reset all settings? This cannot be undone.');
    if (!confirmed) return;
    
    try {
      // Reset user settings to defaults
      this.userSettings = {
        notifications: true,
        darkMode: true,
        aiAssist: true,
        autoUpdate: true,
        language: 'en',
        timezone: 'UTC'
      };
      
      this.saveSettingsToStorage();
      
      // Reset theme if needed
      if (!this.userSettings.darkMode) {
        this.app.components.theme.toggleTheme();
      }
      
      this.app.components.notification.show({
        title: 'Settings Reset',
        message: 'All settings have been reset to defaults',
        type: 'success'
      });
      
      this.render();
    } catch (error) {
      this.app.components.notification.show({
        title: 'Error',
        message: 'Failed to reset settings',
        type: 'error'
      });
    }
  }

  async deleteAccount() {
    const confirmed = confirm('WARNING: This will permanently delete your account and all data. This cannot be undone. Are you sure?');
    if (!confirmed) return;
    
    const secondConfirm = confirm('This is your final warning. All your boards, switches, and routines will be lost forever. Type "DELETE" to confirm.');
    if (secondConfirm !== 'DELETE') {
      this.app.components.notification.show({
        title: 'Cancelled',
        message: 'Account deletion cancelled',
        type: 'info'
      });
      return;
    }
    
    try {
      const api = this.app.getService('api');
      await api.deleteAccount();
      
      this.app.components.notification.show({
        title: 'Account Deleted',
        message: 'Your account has been deleted',
        type: 'info'
      });
      
      // Logout and redirect
      this.app.logout();
    } catch (error) {
      this.app.components.notification.show({
        title: 'Error',
        message: error.message || 'Failed to delete account',
        type: 'error'
      });
    }
  }

  async logoutAllDevices() {
    const confirmed = confirm('This will log you out from all devices. Are you sure?');
    if (!confirmed) return;
    
    try {
      const api = this.app.getService('api');
      await api.logoutAllDevices();
      
      this.app.components.notification.show({
        title: 'Logged Out',
        message: 'You have been logged out from all devices',
        type: 'info'
      });
      
      this.app.logout();
    } catch (error) {
      this.app.components.notification.show({
        title: 'Error',
        message: error.message || 'Failed to logout all devices',
        type: 'error'
      });
    }
  }

  async checkSystemStatus() {
    try {
      const api = this.app.getService('api');
      const health = await api.request('/health');
      
      const apiStatus = document.getElementById('api-status');
      if (apiStatus) {
        apiStatus.textContent = 'Online';
        apiStatus.className = 'text-success';
      }
      
      const mqttStatus = document.getElementById('mqtt-status');
      if (mqttStatus) {
        mqttStatus.textContent = health.mqtt === 'connected' ? 'Connected' : 'Disconnected';
        mqttStatus.className = health.mqtt === 'connected' ? 'text-success' : 'text-destructive';
      }
    } catch (error) {
      const apiStatus = document.getElementById('api-status');
      if (apiStatus) {
        apiStatus.textContent = 'Offline';
        apiStatus.className = 'text-destructive';
      }
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}