import Sidebar from './components/Sidebar.js';
import Notification from './components/Notification.js';
import ThemeManager from './components/ThemeManager.js';
import DashboardPage from './pages/DashboardPage.js';
import PlacesPage from './pages/PlacesPage.js';
import BoardsPage from './pages/BoardsPage.js';
import SchedulesPage from './pages/SchedulesPage.js';
import RoutinesPage from './pages/RoutinesPage.js';
import SettingsPage from './pages/SettingsPage.js';
import ApiService from './services/ApiService.js';
import AuthService from './services/AuthService.js';

class SmartSwitchApp {
  constructor() {
    this.components = {};
    this.pages = {};
    this.services = {};
    this.state = {
      user: null,
      currentPage: 'dashboard',
      theme: 'dark',
      boards: [],
      places: [],
      schedules: [],
      routines: [],
      devices: [],
      notifications: [],
      loading: false,
      error: null
    };

    this.init();
  }

  async init() {
    // Initialize services
    this.services.api = new ApiService();
    this.services.auth = new AuthService(this.services.api);

    // Initialize components
    this.components.sidebar = new Sidebar(this);
    this.components.notification = new Notification(this);
    this.components.theme = new ThemeManager(this);

    // Initialize pages
    this.pages.dashboard = new DashboardPage(this);
    this.pages.places = new PlacesPage(this);
    this.pages.boards = new BoardsPage(this);
    this.pages.schedules = new SchedulesPage(this);
    this.pages.routines = new RoutinesPage(this);
    this.pages.settings = new SettingsPage(this);

    // Bind events
    this.bindEvents();

    // Check for existing session
    if (this.services.auth.isAuthenticated()) {
      await this.loadAuthenticatedApp();
    } else {
      this.showLoginScreen();
    }
  }

  bindEvents() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    document.addEventListener('click', (e) => {
      if (e.target.matches('#sidebar-toggle') || e.target.closest('#sidebar-toggle')) {
        if (this.components.sidebar) {
          this.components.sidebar.toggle();
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        document.querySelector('input[type="search"]')?.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024 && this.components.sidebar) {
        this.components.sidebar.isOpen = true;
        this.components.sidebar.element?.classList.add('open');
      }
    });

    this.listenToSocketEvents();
  }

  listenToSocketEvents() {
    const events = [
      'board-created', 'board-updated', 'board-deleted',
      'switch-updated', 'switch-toggled', 'switch-mode-changed',
      'schedule-triggered', 'routine-executed',
      'mqtt-status', 'ai-prediction', 'ai-anomaly', 'ai-recommendation'
    ];

    events.forEach(event => {
      window.addEventListener(event.replace(/-/g, ''), (e) => {
        if (event === 'switch-toggled') {
          this.components.notification.show({
            title: 'Switch Updated',
            message: e.detail.state ? 'Turned ON' : 'Turned OFF',
            type: e.detail.state ? 'success' : 'info'
          });
        }
        this.refreshCurrentPage();
      });
    });
  }

  showLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    const app = document.getElementById('app');
    
    if (loginScreen) {
      loginScreen.style.display = 'flex';
      loginScreen.style.opacity = '1';
    }
    
    if (app) {
      app.style.display = 'none';
    }
  }

  showApp() {
    const loginScreen = document.getElementById('login-screen');
    const app = document.getElementById('app');
    
    if (loginScreen) {
      loginScreen.style.opacity = '0';
      setTimeout(() => {
        loginScreen.style.display = 'none';
      }, 500);
    }
    
    if (app) {
      app.style.display = 'flex';
      setTimeout(() => app.style.opacity = '1', 50);
    }
  }

  async handleLogin() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;

    if (!email || !password) {
      this.components.notification.show({
        title: 'Error',
        message: 'Please enter email and password',
        type: 'error'
      });
      return;
    }

    this.setLoading(true);

    try {
      await this.services.auth.login(email, password);
      await this.loadAuthenticatedApp();
    } catch (error) {
      this.components.notification.show({
        title: 'Login Failed',
        message: error.message || 'Invalid credentials',
        type: 'error'
      });
    } finally {
      this.setLoading(false);
    }
  }

  async loadAuthenticatedApp() {
    this.setLoading(true);

    try {
      const user = await this.services.auth.getCurrentUser();
      
      const [boards, places, schedules, routines] = await Promise.all([
        this.services.api.getBoards().catch(() => []),
        this.services.api.getPlaces().catch(() => []),
        this.services.api.getSchedules().catch(() => []),
        this.services.api.getRoutines().catch(() => [])
      ]);

      this.state = {
        ...this.state,
        user,
        boards: Array.isArray(boards) ? boards : [],
        places: Array.isArray(places) ? places : [],
        schedules: Array.isArray(schedules) ? schedules : [],
        routines: Array.isArray(routines) ? routines : []
      };

      this.services.api.connectSocket();
      this.showApp();

      if (this.components.sidebar && typeof this.components.sidebar.render === 'function') {
        await this.components.sidebar.render();
      }

      this.navigate('dashboard');

      const totalSwitches = this.getTotalSwitches();
      this.components.notification.show({
        title: 'Welcome Back!',
        message: `${this.state.boards.length} boards online with ${totalSwitches} switches`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to load app data:', error);
      this.components.notification.show({
        title: 'Warning',
        message: 'Running with demo data',
        type: 'warning'
      });
      
      this.state.boards = [];
      this.state.places = [];
      
      this.showApp();
      this.navigate('dashboard');
    } finally {
      this.setLoading(false);
    }
  }

  async logout() {
    try {
      await this.services.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    this.state.user = null;
    this.services.api.disconnectSocket();
    this.showLoginScreen();
  }

  navigate(page) {
  this.state.currentPage = page;

  // Hide all pages
  document.querySelectorAll('.page').forEach(el => {
    el.classList.remove('active');
    el.style.display = 'none';
  });

  // Show target page
  const target = document.getElementById(`${page}-page`);
  if (target) {
    target.style.display = 'block';
    setTimeout(() => target.classList.add('active'), 10);
    
    const pageObj = this.pages[page];
    if (pageObj) {
      // Check if init is a function
      if (typeof pageObj.init === 'function') {
        pageObj.init().catch(err => {
          console.error(`Error initializing ${page}:`, err);
          // Show error notification
          if (this.components.notification) {
            this.components.notification.show({
              title: 'Error',
              message: `Failed to load ${page} page`,
              type: 'error'
            });
          }
        });
      } else if (typeof pageObj.render === 'function') {
        // If no init, just render
        pageObj.render();
      }
    } else {
      console.warn(`Page object for "${page}" not found`);
    }
  } else {
    console.warn(`Page element for "${page}" not found`);
  }

  // Update sidebar
  if (this.components.sidebar) {
    this.components.sidebar.setActive(page);
  }

  // Close sidebar on mobile
  if (window.innerWidth < 1024 && this.components.sidebar) {
    this.components.sidebar.hide();
  }
}

  refreshCurrentPage() {
    const pageObj = this.pages[this.state.currentPage];
    if (pageObj && typeof pageObj.render === 'function') {
      pageObj.render();
    }
  }

  getTotalSwitches() {
    return this.state.boards.reduce((acc, board) => 
      acc + (board.switches?.length || 0), 0
    );
  }

  setLoading(loading) {
    this.state.loading = loading;
    const loadingEl = document.getElementById('global-loading');
    if (loadingEl) {
      if (loading) {
        loadingEl.classList.add('flex');
      } else {
        loadingEl.classList.remove('flex');
      }
    }
  }

  getState() {
    return this.state;
  }

  getService(name) {
    return this.services[name];
  }

  getComponent(name) {
    return this.components[name];
  }

  getPage(name) {
    return this.pages[name];
  }

  updateState(newState) {
    this.state = { ...this.state, ...newState };
    this.refreshCurrentPage();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new SmartSwitchApp();
});

export default SmartSwitchApp;