export default class Notification {
  constructor(app) {
    this.app = app;
    this.element = null;
    this.notifications = [];
    this.counter = 0;
    this.maxNotifications = 5;
    this.duration = 5000; // 5 seconds default
    this.animating = false;
    
    this.init();
  }

  init() {
    // Create notification center if it doesn't exist
    this.element = document.getElementById('notification-center');
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.id = 'notification-center';
      this.element.className = 'notification-center fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md';
      document.body.appendChild(this.element);
    }
  }

  show(notification) {
    const id = this.counter++;
    const newNotification = {
      id,
      title: notification.title || 'Notification',
      message: notification.message || '',
      type: notification.type || 'info',
      duration: notification.duration || this.duration,
      icon: this.getIconForType(notification.type),
      timestamp: new Date(),
      onClose: notification.onClose
    };
    
    this.notifications.push(newNotification);
    
    // Limit number of notifications
    if (this.notifications.length > this.maxNotifications) {
      const removed = this.notifications.shift();
      this.removeNotificationElement(removed.id);
    }
    
    this.render();
    
    // Auto-hide after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        this.hide(id);
      }, newNotification.duration);
    }
    
    return id;
  }

  hide(id) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      const notification = this.notifications[index];
      
      // Animate out
      const element = document.querySelector(`.notification[data-id="${id}"]`);
      if (element) {
        element.style.transform = 'translateX(100%)';
        element.style.opacity = '0';
        setTimeout(() => {
          this.notifications = this.notifications.filter(n => n.id !== id);
          this.render();
          if (notification.onClose) notification.onClose();
        }, 300);
      } else {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.render();
        if (notification.onClose) notification.onClose();
      }
    }
  }

  clear() {
    this.notifications = [];
    this.render();
  }

  getIconForType(type) {
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    return icons[type] || 'fa-bell';
  }

  getColorForType(type) {
    const colors = {
      success: 'border-success',
      error: 'border-destructive',
      warning: 'border-warning',
      info: 'border-primary'
    };
    return colors[type] || 'border-primary';
  }

  getIconColorForType(type) {
    const colors = {
      success: 'text-success',
      error: 'text-destructive',
      warning: 'text-warning',
      info: 'text-primary'
    };
    return colors[type] || 'text-primary';
  }

  render() {
    if (!this.element) return;
    
    if (this.notifications.length === 0) {
      this.element.innerHTML = '';
      return;
    }

    this.element.innerHTML = this.notifications.map(notif => `
      <div class="notification glass-card p-4 flex items-start gap-3 animate-slide-in border-l-4 ${this.getColorForType(notif.type)} transform transition-all duration-300 hover:scale-102"
           data-id="${notif.id}"
           role="alert">
        <div class="flex-shrink-0">
          <i class="fas ${notif.icon} text-xl ${this.getIconColorForType(notif.type)}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-semibold text-sm mb-1">${this.escapeHtml(notif.title)}</h4>
          <p class="text-xs text-muted-foreground">${this.escapeHtml(notif.message)}</p>
          <p class="text-xs text-muted-foreground/60 mt-1">
            ${this.formatTime(notif.timestamp)}
          </p>
        </div>
        <button class="close-notification flex-shrink-0 text-muted-foreground hover:text-foreground transition p-1 rounded-lg hover:bg-muted/30">
          <i class="fas fa-times text-sm"></i>
        </button>
      </div>
    `).join('');

    // Bind close buttons
    this.element.querySelectorAll('.close-notification').forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const notificationDiv = btn.closest('.notification');
        if (notificationDiv) {
          const id = parseInt(notificationDiv.dataset.id);
          if (!isNaN(id)) this.hide(id);
        }
      });
    });
    
    // Add click to dismiss on notification body
    this.element.querySelectorAll('.notification').forEach(notification => {
      notification.addEventListener('click', (e) => {
        if (!e.target.closest('.close-notification')) {
          const id = parseInt(notification.dataset.id);
          if (!isNaN(id)) this.hide(id);
        }
      });
    });
  }

  formatTime(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Quick notification methods
  success(title, message, duration = 3000) {
    return this.show({ title, message, type: 'success', duration });
  }

  error(title, message, duration = 5000) {
    return this.show({ title, message, type: 'error', duration });
  }

  warning(title, message, duration = 4000) {
    return this.show({ title, message, type: 'warning', duration });
  }

  info(title, message, duration = 3000) {
    return this.show({ title, message, type: 'info', duration });
  }

  // Promise-based notification for async operations
  async loading(title, message, promise) {
    const id = this.show({
      title,
      message: message || 'Loading...',
      type: 'info',
      duration: 0 // Don't auto-hide
    });
    
    try {
      const result = await promise;
      this.hide(id);
      this.success(title, 'Completed successfully', 2000);
      return result;
    } catch (error) {
      this.hide(id);
      this.error(title, error.message || 'Operation failed', 5000);
      throw error;
    }
  }
}