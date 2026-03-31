import { NAV_ITEMS } from '../utils/constants.js';

export default class Sidebar {
  constructor(app) {
    this.app = app;
    this.element = document.getElementById('sidebar');
    this.isOpen = window.innerWidth >= 1024;
    this.isCollapsed = false;
  }

  render() {
    const { user } = this.app.getState();
    const currentPage = this.app.state.currentPage;
    
    this.element.innerHTML = `
      <!-- Logo Section -->
      <div class="p-6 border-b border-border/30" style="position: relative;">
        <div class="flex items-center gap-4 ${this.isCollapsed ? 'justify-center' : ''}">
          <div class="relative flex-shrink-0">
            <div class="w-12 h-12 bg-gradient-to-br from-primary to-cyan-500 rounded-xl flex items-center justify-center animate-pulse-glow">
              <i class="fas fa-bolt text-xl text-background"></i>
            </div>
            <div class="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-sidebar"></div>
          </div>
          ${!this.isCollapsed ? `
            <div>
              <h1 class="text-2xl font-bold text-gradient">SmartSwitch</h1>
              <p class="text-xs text-muted-foreground mt-1">v2.0 • Connected</p>
            </div>
          ` : ''}
        </div>
        <button id="collapse-btn" class="text-muted-foreground hover:text-foreground transition-colors">
          <i class="fas fa-chevron-left"></i>
        </button>
      </div>

      <!-- User Profile -->
      <div class="p-6 border-b border-border/30">
        <div class="flex items-center gap-4 ${this.isCollapsed ? 'justify-center' : ''}">
          <div class="relative flex-shrink-0">
            <div class="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent p-0.5">
              <div class="w-full h-full rounded-full bg-background p-1">
                <img src="${user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}"
                     alt="Avatar"
                     class="rounded-full">
              </div>
            </div>
            <div class="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-sidebar"></div>
          </div>
          ${!this.isCollapsed ? `
            <div class="flex-1 min-w-0">
              <h3 class="font-bold truncate">${user?.name || 'Guest'}</h3>
              <p class="text-sm text-muted-foreground truncate">${user?.email || 'Not logged in'}</p>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-6 space-y-2">
        ${NAV_ITEMS.map(item => `
          <a href="#" data-page="${item.id}"
             class="nav-item ${currentPage === item.id ? 'active' : ''} group">
            <div class="nav-icon">
              <i class="fas fa-${item.icon}"></i>
            </div>
            ${!this.isCollapsed ? `<span class="truncate">${item.label}</span>` : ''}
            <div class="nav-indicator"></div>
          </a>
        `).join('')}
      </nav>

      <!-- Bottom Section -->
      <div class="p-6 border-t border-border/30">
        <div class="flex items-center justify-between ${this.isCollapsed ? 'justify-center' : ''}">
          ${!this.isCollapsed ? `
            <div class="text-xs text-muted-foreground">
              <i class="fas fa-wifi mr-1"></i>
              <span>5ms • 100%</span>
            </div>
          ` : ''}
          <button id="logout-btn" class="text-destructive hover:bg-destructive/10 rounded-lg transition-colors ${this.isCollapsed ? 'p-3' : 'px-4 py-2'}">
            <i class="fas fa-sign-out-alt ${!this.isCollapsed ? 'mr-2' : ''}"></i>
            ${!this.isCollapsed ? 'Logout' : ''}
          </button>
        </div>
      </div>
    `;

    this.bindEvents();
    this.updateCollapseState();
  }

  bindEvents() {
    // Navigation items
    this.element.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        this.app.navigate(page);
      });
    });

    // Logout button
    const logoutBtn = this.element.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.app.logout());
    }

    // Collapse button
    const collapseBtn = this.element.querySelector('#collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCollapse();
      });
    }
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.render();
    document.body.classList.toggle('sidebar-collapsed', this.isCollapsed);
    
    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('sidebar-collapse', { 
      detail: { collapsed: this.isCollapsed } 
    }));
  }

  updateCollapseState() {
    this.element.classList.toggle('collapsed', this.isCollapsed);
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.element.classList.toggle('open', this.isOpen);
  }

  show() {
    this.isOpen = true;
    this.element.classList.add('open');
  }

  hide() {
    this.isOpen = false;
    this.element.classList.remove('open');
  }

  setActive(page) {
    this.element.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
  }
}