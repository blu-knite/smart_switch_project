export default class SchedulesPage {
  constructor(app) {
    this.app = app;
    this.editingId = null;
    this.selectedBoard = null;
    this.selectedSwitch = null;
  }

  async init() {
    try {
      await this.loadSchedules();
      this.render();
    } catch (error) {
      console.error('SchedulesPage init error:', error);
      this.app.state.schedules = [];
      this.render();
    }
  }

  async loadSchedules() {
    try {
      const api = this.app.getService('api');
      const schedules = await api.getSchedules();
      this.app.state.schedules = Array.isArray(schedules) ? schedules : [];
    } catch (error) {
      console.error('Failed to load schedules:', error);
      this.app.state.schedules = [];
      throw error;
    }
  }

  saveToStorage() {
    localStorage.setItem('smartswitch_schedules', JSON.stringify(this.app.state.schedules));
  }

  render() {
    const container = document.getElementById('schedules-page');
    if (!container) return;

    const schedules = this.app.state.schedules || [];
    const boards = this.app.state.boards || [];
    const places = this.app.state.places || [];
    const switches = this.app.state.switches || [];

    // Calculate stats
    const totalSchedules = schedules.length;
    const activeSchedules = schedules.filter(s => s.isActive !== false).length;
    const todayExecutions = this.getTodayExecutionsCount(schedules);

    container.innerHTML = `
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gradient mb-2">Schedules</h1>
        <p class="text-muted-foreground">Manage your automation schedules</p>
      </div>

      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <i class="fas fa-calendar-alt"></i>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Total Schedules</p>
              <p class="text-2xl font-bold">${totalSchedules}</p>
            </div>
          </div>
        </div>
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center">
              <i class="fas fa-check-circle"></i>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Active</p>
              <p class="text-2xl font-bold">${activeSchedules}</p>
            </div>
          </div>
        </div>
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <i class="fas fa-clock"></i>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Executions Today</p>
              <p class="text-2xl font-bold">${todayExecutions}</p>
            </div>
          </div>
        </div>
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
              <i class="fas fa-chart-line"></i>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Success Rate</p>
              <p class="text-2xl font-bold">${this.calculateSuccessRate(schedules)}%</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end mb-6 gap-3">
        <button id="refresh-schedules-btn"
          class="px-5 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-border transition-colors">
          <i class="fas fa-sync-alt mr-2"></i>
          Refresh
        </button>
        <button id="test-schedules-btn"
          class="px-5 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors">
          <i class="fas fa-flask mr-2"></i>
          Test All
        </button>
        <button id="add-schedule-btn"
          class="px-5 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
          <i class="fas fa-plus mr-2"></i>
          Add Schedule
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-4 mb-6">
        <div class="flex-1 min-w-[200px]">
          <select id="schedule-filter-board" class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
            <option value="">All Boards</option>
            ${boards.map(b => `<option value="${b.id}">${this.escapeHtml(b.name)}</option>`).join('')}
          </select>
        </div>
        <div class="flex-1 min-w-[200px]">
          <select id="schedule-filter-mode" class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
            <option value="">All Modes</option>
            <option value="manual">Manual</option>
            <option value="ai">AI</option>
            <option value="presence">Presence</option>
            <option value="all">All</option>
          </select>
        </div>
        <div class="flex-1 min-w-[200px]">
          <select id="schedule-filter-status" class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <!-- Schedules List -->
      <div id="schedules-list" class="space-y-4">
        ${schedules.length > 0 ? schedules.map(schedule => this.renderScheduleRow(schedule, boards, places, switches)).join('') : this.renderEmptyState()}
      </div>

      <!-- Add/Edit Schedule Modal -->
      <div id="schedule-modal" class="modal hidden">
        <div class="modal-content w-full max-w-2xl">
          <h2 class="text-2xl font-bold mb-4" id="schedule-modal-title">Create Schedule</h2>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block mb-2 text-sm font-medium">Schedule Name</label>
              <input id="schedule-name-input" type="text" placeholder="e.g., Morning Lights"
                class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">

              <label class="block mb-2 text-sm font-medium">Description</label>
              <textarea id="schedule-description-input" placeholder="What does this schedule do?"
                rows="2" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary"></textarea>

              <label class="block mb-2 text-sm font-medium">Select Board</label>
              <select id="schedule-board-select" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                <option value="">-- Select Board --</option>
                ${boards.map(b => `<option value="${b.id}">${this.escapeHtml(b.name)}</option>`).join('')}
              </select>

              <label class="block mb-2 text-sm font-medium">Select Switch</label>
              <select id="schedule-switch-select" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                <option value="">-- Select Switch --</option>
              </select>

              <label class="block mb-2 text-sm font-medium">Mode</label>
              <select id="schedule-mode-select" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                <option value="manual">Manual Control</option>
                <option value="ai">AI Optimized</option>
                <option value="presence">Presence Based</option>
                <option value="all">All Modes</option>
              </select>
            </div>

            <div>
              <label class="block mb-2 text-sm font-medium">Action</label>
              <select id="schedule-action-select" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                <option value="ON">Turn On</option>
                <option value="OFF">Turn Off</option>
                <option value="TOGGLE">Toggle</option>
              </select>

              <label class="block mb-2 text-sm font-medium">Schedule Type</label>
              <select id="schedule-type-select" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                <option value="cron">Cron Expression</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="time_range">Time Range</option>
              </select>

              <div id="cron-config" class="mb-4">
                <label class="block mb-2 text-sm font-medium">Cron Expression</label>
                <input id="schedule-cron-input" type="text" placeholder="0 7 * * *" 
                  class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                <p class="text-xs text-muted-foreground mt-1">Examples: 0 7 * * * (7am daily), 0 18 * * 1-5 (6pm weekdays)</p>
              </div>

              <div id="daily-config" class="hidden mb-4">
                <label class="block mb-2 text-sm font-medium">Time</label>
                <input id="schedule-time-input" type="time" 
                  class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
              </div>

              <div id="weekly-config" class="hidden mb-4">
                <label class="block mb-2 text-sm font-medium">Day of Week</label>
                <select id="schedule-day-select" class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
                <label class="block mt-2 mb-2 text-sm font-medium">Time</label>
                <input id="schedule-weekly-time-input" type="time" 
                  class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
              </div>

              <div id="time-range-config" class="hidden mb-4">
                <label class="block mb-2 text-sm font-medium">Start Time</label>
                <input id="schedule-start-time-input" type="time" 
                  class="w-full mb-2 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                <label class="block mb-2 text-sm font-medium">End Time</label>
                <input id="schedule-end-time-input" type="time" 
                  class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
              </div>

              <label class="flex items-center gap-2 mt-4">
                <input type="checkbox" id="schedule-active" checked>
                <span>Active Schedule</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button id="cancel-schedule-btn" 
              class="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-border transition">
              Cancel
            </button>
            <button id="save-schedule-btn"
              class="px-4 py-2 rounded-lg bg-primary text-background hover:opacity-90 transition">
              Save
            </button>
          </div>
        </div>
      </div>

      <!-- Test Modal -->
      <div id="test-modal" class="modal hidden">
        <div class="modal-content">
          <h2 class="text-2xl font-bold mb-4">Test Schedule</h2>
          <p class="text-muted-foreground mb-4" id="test-message">Testing schedule...</p>
          <div class="flex justify-end gap-3">
            <button id="close-test-btn"
              class="px-4 py-2 rounded-lg bg-primary text-background hover:opacity-90 transition">
              Close
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div id="delete-modal" class="modal hidden">
        <div class="modal-content">
          <h2 class="text-2xl font-bold mb-4">Delete Schedule</h2>
          <p class="text-muted-foreground mb-6">Are you sure you want to delete this schedule? This action cannot be undone.</p>
          <div class="flex justify-end gap-3">
            <button id="cancel-delete-btn"
              class="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-border transition">
              Cancel
            </button>
            <button id="confirm-delete-btn"
              class="px-4 py-2 rounded-lg bg-destructive text-white hover:opacity-90 transition">
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Loading Indicator -->
      <div id="schedules-loading" class="hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-50 items-center justify-center">
        <div class="text-center">
          <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-primary">Loading...</p>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderEmptyState() {
    return `
      <div class="glass-card p-12 text-center">
        <i class="fas fa-calendar-alt text-5xl text-muted-foreground mb-4"></i>
        <h3 class="text-xl font-semibold mb-2">No Schedules Found</h3>
        <p class="text-muted-foreground mb-4">Create automated schedules to control your devices</p>
        <button id="empty-add-schedule-btn" class="px-5 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
          <i class="fas fa-plus mr-2"></i>
          Add Schedule
        </button>
      </div>
    `;
  }

  renderScheduleRow(schedule, boards, places, switches) {
    const board = boards.find(b => b.id === schedule.boardId);
    const place = places.find(p => p.id === schedule.placeId);
    const switchObj = switches.find(s => s.id === schedule.switchId);
    
    const isActive = schedule.isActive !== false;
    const nextRun = schedule.nextRun ? new Date(schedule.nextRun).toLocaleString() : 'Not scheduled';
    const lastRun = schedule.lastRun ? new Date(schedule.lastRun).toLocaleString() : 'Never';
    const scheduleType = schedule.cronExpression ? 'Cron' : 
                         schedule.daysOfWeek?.length ? 'Weekly' : 
                         schedule.startTime ? 'Time Range' : 'Daily';

    // Get mode display
    const modeNames = {
      manual: 'Manual',
      ai: 'AI Optimized',
      presence: 'Presence Based',
      all: 'All Modes'
    };
    
    const modeColors = {
      manual: 'bg-gray-500/10 text-gray-400',
      ai: 'bg-primary/10 text-primary',
      presence: 'bg-warning/10 text-warning',
      all: 'bg-success/10 text-success'
    };

    return `
      <div class="glass-card p-5 hover:border-primary/30 transition-all group ${!isActive ? 'opacity-60' : ''}"
           data-id="${schedule.id}">
        <div class="flex flex-wrap justify-between items-start gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-lg font-bold">${this.escapeHtml(schedule.name)}</h3>
              <span class="text-xs px-2 py-1 rounded-full ${isActive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}">
                ${isActive ? 'Active' : 'Inactive'}
              </span>
              <span class="text-xs px-2 py-1 rounded-full ${modeColors[schedule.mode] || 'bg-muted/30'}">
                <i class="fas fa-${schedule.mode === 'ai' ? 'robot' : schedule.mode === 'presence' ? 'user' : 'clock'} mr-1"></i>
                ${modeNames[schedule.mode] || schedule.mode}
              </span>
              <span class="text-xs px-2 py-1 rounded-full bg-muted/30">
                <i class="fas fa-${scheduleType === 'Cron' ? 'code' : scheduleType === 'Weekly' ? 'calendar-week' : 'clock'} mr-1"></i>
                ${scheduleType}
              </span>
            </div>
            
            ${schedule.description ? `<p class="text-sm text-muted-foreground mb-2">${this.escapeHtml(schedule.description)}</p>` : ''}
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
              <div>
                <p class="text-muted-foreground">Board:</p>
                <p class="font-medium">${board ? this.escapeHtml(board.name) : 'Any'}</p>
              </div>
              <div>
                <p class="text-muted-foreground">Switch:</p>
                <p class="font-medium">${switchObj ? this.escapeHtml(switchObj.name) : schedule.switchName || 'Any'}</p>
              </div>
              <div>
                <p class="text-muted-foreground">Action:</p>
                <p class="font-medium text-${schedule.action === 'ON' ? 'success' : schedule.action === 'OFF' ? 'warning' : 'info'}">
                  ${schedule.action}
                </p>
              </div>
              <div>
                <p class="text-muted-foreground">Schedule:</p>
                <p class="font-medium font-mono text-xs">${this.formatScheduleTime(schedule)}</p>
              </div>
            </div>
            
            <div class="flex gap-3 text-xs text-muted-foreground">
              <span><i class="fas fa-calendar-check mr-1"></i>Last: ${lastRun}</span>
              <span><i class="fas fa-calendar-alt mr-1"></i>Next: ${nextRun}</span>
            </div>
          </div>
          
          <div class="flex gap-2">
            <button class="toggle-schedule p-2 rounded-lg hover:bg-primary/10 text-primary transition"
                    data-id="${schedule.id}" title="${isActive ? 'Disable' : 'Enable'}">
              <i class="fas fa-${isActive ? 'pause' : 'play'}"></i>
            </button>
            <button class="test-schedule p-2 rounded-lg hover:bg-accent/10 text-accent transition"
                    data-id="${schedule.id}" title="Test Run">
              <i class="fas fa-flask"></i>
            </button>
            <button class="edit-schedule p-2 rounded-lg hover:bg-primary/10 text-primary transition"
                    data-id="${schedule.id}" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete-schedule p-2 rounded-lg hover:bg-destructive/10 text-destructive transition"
                    data-id="${schedule.id}" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div class="mt-3 pt-3 border-t border-border/30 flex justify-between items-center">
          <div class="flex gap-3">
            <span class="text-xs px-2 py-1 rounded-full bg-muted/30">
              <i class="fas fa-chart-line mr-1"></i>
              ${schedule.executionCount || 0} executions
            </span>
            ${schedule.lastRun ? `
              <span class="text-xs px-2 py-1 rounded-full bg-muted/30">
                <i class="fas fa-clock mr-1"></i>
                ${this.getTimeSince(schedule.lastRun)}
              </span>
            ` : ''}
          </div>
          <button class="view-logs-schedule text-xs text-primary hover:underline"
                  data-id="${schedule.id}">
            View Logs <i class="fas fa-arrow-right ml-1"></i>
          </button>
        </div>
      </div>
    `;
  }

  formatScheduleTime(schedule) {
    if (schedule.cronExpression) {
      return this.formatCron(schedule.cronExpression);
    } else if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayNames = schedule.daysOfWeek.map(d => days[d]).join(', ');
      return `${dayNames} at ${schedule.startTime || '00:00'}`;
    } else if (schedule.startTime && schedule.endTime) {
      return `${schedule.startTime} - ${schedule.endTime}`;
    } else if (schedule.startTime) {
      return `Daily at ${schedule.startTime}`;
    }
    return 'Manual trigger';
  }

  formatCron(cron) {
    const parts = cron.split(' ');
    if (parts.length >= 5) {
      const [minute, hour, day, month, weekday] = parts;
      if (minute === '0' && hour !== '*') {
        return `At ${hour}:00 ${day !== '*' ? `on day ${day}` : ''} ${weekday !== '*' ? `on ${this.getWeekdayName(weekday)}` : ''}`;
      }
    }
    return cron;
  }

  getWeekdayName(weekday) {
    const days = { '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday' };
    return days[weekday] || weekday;
  }

  getTodayExecutionsCount(schedules) {
    const today = new Date().toDateString();
    let count = 0;
    for (const schedule of schedules) {
      if (schedule.lastRun && new Date(schedule.lastRun).toDateString() === today) {
        count++;
      }
    }
    return count;
  }

  calculateSuccessRate(schedules) {
    if (schedules.length === 0) return 0;
    let total = 0;
    let succeeded = 0;
    for (const schedule of schedules) {
      total += schedule.executionCount || 0;
      succeeded += schedule.successCount || 0;
    }
    if (total === 0) return 100;
    return Math.round((succeeded / total) * 100);
  }

  getTimeSince(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return 'Just now';
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

  async updateSwitchList() {
    const boardId = document.getElementById('schedule-board-select')?.value;
    const switchSelect = document.getElementById('schedule-switch-select');
    if (!switchSelect) return;
    
    switchSelect.innerHTML = '<option value="">-- Select Switch --</option>';
    
    if (boardId) {
      try {
        const api = this.app.getService('api');
        const switches = await api.getSwitches(boardId);
        if (Array.isArray(switches)) {
          switches.forEach(sw => {
            const option = document.createElement('option');
            option.value = sw.id;
            option.textContent = sw.name || `Switch ${sw.index}`;
            switchSelect.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Failed to load switches:', error);
      }
    }
  }

  bindEvents() {
    const addBtn = document.getElementById('add-schedule-btn');
    const refreshBtn = document.getElementById('refresh-schedules-btn');
    const testAllBtn = document.getElementById('test-schedules-btn');
    const modal = document.getElementById('schedule-modal');
    const cancelBtn = document.getElementById('cancel-schedule-btn');
    const saveBtn = document.getElementById('save-schedule-btn');
    const boardSelect = document.getElementById('schedule-board-select');
    const typeSelect = document.getElementById('schedule-type-select');

    // Type select change handler
    typeSelect?.addEventListener('change', () => {
      const cronConfig = document.getElementById('cron-config');
      const dailyConfig = document.getElementById('daily-config');
      const weeklyConfig = document.getElementById('weekly-config');
      const timeRangeConfig = document.getElementById('time-range-config');
      
      cronConfig?.classList.add('hidden');
      dailyConfig?.classList.add('hidden');
      weeklyConfig?.classList.add('hidden');
      timeRangeConfig?.classList.add('hidden');
      
      if (typeSelect.value === 'cron') {
        cronConfig?.classList.remove('hidden');
      } else if (typeSelect.value === 'daily') {
        dailyConfig?.classList.remove('hidden');
      } else if (typeSelect.value === 'weekly') {
        weeklyConfig?.classList.remove('hidden');
      } else if (typeSelect.value === 'time_range') {
        timeRangeConfig?.classList.remove('hidden');
      }
    });

    // Board change to update switch list
    boardSelect?.addEventListener('change', () => {
      this.updateSwitchList();
    });

    // Refresh button
    refreshBtn?.addEventListener('click', async () => {
      const loadingEl = document.getElementById('schedules-loading');
      if (loadingEl) loadingEl.classList.remove('hidden');
      try {
        await this.loadSchedules();
        this.render();
        this.app.components.notification.show({
          title: 'Refreshed',
          message: 'Schedules list updated',
          type: 'success'
        });
      } catch (error) {
        this.app.components.notification.show({
          title: 'Refresh Failed',
          message: error.message,
          type: 'error'
        });
      } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
      }
    });

    // Test all button
    testAllBtn?.addEventListener('click', async () => {
      const schedules = this.app.state.schedules || [];
      if (schedules.length === 0) {
        this.app.components.notification.show({
          title: 'No Schedules',
          message: 'Create a schedule first',
          type: 'info'
        });
        return;
      }
      
      const loadingEl = document.getElementById('schedules-loading');
      if (loadingEl) loadingEl.classList.remove('hidden');
      
      try {
        const api = this.app.getService('api');
        let successCount = 0;
        
        for (const schedule of schedules) {
          try {
            await api.executeSchedule(schedule.id);
            successCount++;
          } catch (err) {
            console.error(`Failed to test schedule ${schedule.id}:`, err);
          }
        }
        
        this.app.components.notification.show({
          title: 'Test Complete',
          message: `Tested ${successCount}/${schedules.length} schedules`,
          type: successCount === schedules.length ? 'success' : 'warning'
        });
      } catch (error) {
        this.app.components.notification.show({
          title: 'Test Failed',
          message: error.message,
          type: 'error'
        });
      } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
      }
    });

    // Open modal for adding
    addBtn?.addEventListener('click', () => {
      this.editingId = null;
      document.getElementById('schedule-modal-title').innerText = 'Create Schedule';
      this.resetModal();
      modal?.classList.remove('hidden');
      modal?.classList.add('flex');
    });

    // Empty state add button
    const emptyAddBtn = document.getElementById('empty-add-schedule-btn');
    emptyAddBtn?.addEventListener('click', () => {
      addBtn?.click();
    });

    // Cancel modal
    cancelBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
      modal?.classList.remove('flex');
    });

    // Save schedule
    saveBtn?.addEventListener('click', async () => {
      await this.saveSchedule();
    });

    // Edit schedule
    document.querySelectorAll('.edit-schedule').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        this.editSchedule(id);
      });
    });

    // Toggle schedule
    document.querySelectorAll('.toggle-schedule').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        await this.toggleSchedule(id);
      });
    });

    // Test schedule
    document.querySelectorAll('.test-schedule').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        await this.testSchedule(id);
      });
    });

    // Delete with confirmation
    this.setupDeleteConfirmation();

    // View logs
    document.querySelectorAll('.view-logs-schedule').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        this.viewLogs(id);
      });
    });

    // Filter events
    const filterBoard = document.getElementById('schedule-filter-board');
    const filterMode = document.getElementById('schedule-filter-mode');
    const filterStatus = document.getElementById('schedule-filter-status');
    
    filterBoard?.addEventListener('change', () => this.applyFilters());
    filterMode?.addEventListener('change', () => this.applyFilters());
    filterStatus?.addEventListener('change', () => this.applyFilters());
  }

  async saveSchedule() {
    const nameInput = document.getElementById('schedule-name-input');
    const descriptionInput = document.getElementById('schedule-description-input');
    const boardSelect = document.getElementById('schedule-board-select');
    const switchSelect = document.getElementById('schedule-switch-select');
    const modeSelect = document.getElementById('schedule-mode-select');
    const actionSelect = document.getElementById('schedule-action-select');
    const typeSelect = document.getElementById('schedule-type-select');
    const activeCheck = document.getElementById('schedule-active');

    const name = nameInput?.value.trim();
    const description = descriptionInput?.value.trim();
    const boardId = boardSelect?.value;
    const switchId = switchSelect?.value;
    const mode = modeSelect?.value || 'manual';
    const action = actionSelect?.value || 'ON';
    const isActive = activeCheck?.checked || false;

    if (!name) {
      this.app.components.notification.show({
        title: 'Error',
        message: 'Please enter a schedule name',
        type: 'error'
      });
      return;
    }

    if (!boardId) {
      this.app.components.notification.show({
        title: 'Error',
        message: 'Please select a board',
        type: 'error'
      });
      return;
    }

    // Build schedule data based on type
    let scheduleData = {
      name,
      description: description || null,
      boardId: parseInt(boardId),
      switchId: switchId ? parseInt(switchId) : null,
      mode,
      action,
      isActive
    };

    const type = typeSelect?.value || 'daily';

    if (type === 'cron') {
      const cronInput = document.getElementById('schedule-cron-input');
      scheduleData.cronExpression = cronInput?.value;
      if (!scheduleData.cronExpression) {
        this.app.components.notification.show({
          title: 'Error',
          message: 'Please enter a cron expression',
          type: 'error'
        });
        return;
      }
    } else if (type === 'daily') {
      const timeInput = document.getElementById('schedule-time-input');
      scheduleData.startTime = timeInput?.value;
      if (!scheduleData.startTime) {
        this.app.components.notification.show({
          title: 'Error',
          message: 'Please select a time',
          type: 'error'
        });
        return;
      }
    } else if (type === 'weekly') {
      const daySelect = document.getElementById('schedule-day-select');
      const timeInput = document.getElementById('schedule-weekly-time-input');
      scheduleData.daysOfWeek = [parseInt(daySelect?.value || '0')];
      scheduleData.startTime = timeInput?.value;
      if (!scheduleData.startTime) {
        this.app.components.notification.show({
          title: 'Error',
          message: 'Please select a time',
          type: 'error'
        });
        return;
      }
    } else if (type === 'time_range') {
      const startTimeInput = document.getElementById('schedule-start-time-input');
      const endTimeInput = document.getElementById('schedule-end-time-input');
      scheduleData.startTime = startTimeInput?.value;
      scheduleData.endTime = endTimeInput?.value;
      if (!scheduleData.startTime || !scheduleData.endTime) {
        this.app.components.notification.show({
          title: 'Error',
          message: 'Please select start and end times',
          type: 'error'
        });
        return;
      }
    }

    const loadingEl = document.getElementById('schedules-loading');
    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
      const api = this.app.getService('api');
      
      if (this.editingId) {
        await api.updateSchedule(this.editingId, scheduleData);
        this.app.components.notification.show({
          title: 'Schedule Updated',
          message: `${name} updated successfully`,
          type: 'success'
        });
      } else {
        await api.createSchedule(scheduleData);
        this.app.components.notification.show({
          title: 'Schedule Created',
          message: `${name} added successfully`,
          type: 'success'
        });
      }

      await this.loadSchedules();
      const modal = document.getElementById('schedule-modal');
      modal?.classList.add('hidden');
      modal?.classList.remove('flex');
      this.render();
    } catch (error) {
      console.error('Save schedule error:', error);
      this.app.components.notification.show({
        title: 'Error',
        message: error.message || 'Failed to save schedule',
        type: 'error'
      });
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  async editSchedule(id) {
    const schedules = this.app.state.schedules || [];
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    this.editingId = id;
    document.getElementById('schedule-modal-title').innerText = 'Edit Schedule';
    
    document.getElementById('schedule-name-input').value = schedule.name || '';
    document.getElementById('schedule-description-input').value = schedule.description || '';
    document.getElementById('schedule-board-select').value = schedule.boardId || '';
    document.getElementById('schedule-mode-select').value = schedule.mode || 'manual';
    document.getElementById('schedule-action-select').value = schedule.action || 'ON';
    document.getElementById('schedule-active').checked = schedule.isActive !== false;
    
    await this.updateSwitchList();
    setTimeout(() => {
      document.getElementById('schedule-switch-select').value = schedule.switchId || '';
    }, 100);
    
    // Determine schedule type
    if (schedule.cronExpression) {
      document.getElementById('schedule-type-select').value = 'cron';
      document.getElementById('schedule-cron-input').value = schedule.cronExpression;
    } else if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
      document.getElementById('schedule-type-select').value = 'weekly';
      document.getElementById('schedule-day-select').value = schedule.daysOfWeek[0];
      document.getElementById('schedule-weekly-time-input').value = schedule.startTime || '';
    } else if (schedule.startTime && schedule.endTime) {
      document.getElementById('schedule-type-select').value = 'time_range';
      document.getElementById('schedule-start-time-input').value = schedule.startTime;
      document.getElementById('schedule-end-time-input').value = schedule.endTime;
    } else {
      document.getElementById('schedule-type-select').value = 'daily';
      document.getElementById('schedule-time-input').value = schedule.startTime || '';
    }
    
    // Trigger type change to show correct config
    const event = new Event('change');
    document.getElementById('schedule-type-select').dispatchEvent(event);
    
    const modal = document.getElementById('schedule-modal');
    modal?.classList.remove('hidden');
    modal?.classList.add('flex');
  }

  async toggleSchedule(id) {
    const schedules = this.app.state.schedules || [];
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    const newState = schedule.isActive === false;
    
    try {
      const api = this.app.getService('api');
      await api.toggleSchedule(id, newState);
      
      schedule.isActive = newState;
      this.app.state.schedules = [...schedules];
      
      this.render();
      
      this.app.components.notification.show({
        title: newState ? 'Schedule Enabled' : 'Schedule Disabled',
        message: `${schedule.name} ${newState ? 'enabled' : 'disabled'}`,
        type: 'info'
      });
    } catch (error) {
      this.app.components.notification.show({
        title: 'Error',
        message: error.message || 'Failed to toggle schedule',
        type: 'error'
      });
    }
  }

  async testSchedule(id) {
    const schedules = this.app.state.schedules || [];
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    const loadingEl = document.getElementById('schedules-loading');
    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
      const api = this.app.getService('api');
      await api.executeSchedule(id);
      
      const testModal = document.getElementById('test-modal');
      const testMessage = document.getElementById('test-message');
      if (testMessage) {
        testMessage.innerHTML = `
          <i class="fas fa-check-circle text-success mr-2"></i>
          Schedule "${schedule.name}" executed successfully!
        `;
      }
      testModal?.classList.remove('hidden');
      testModal?.classList.add('flex');
      
      // Close modal after 2 seconds
      setTimeout(() => {
        testModal?.classList.add('hidden');
        testModal?.classList.remove('flex');
      }, 2000);
      
      // Reload to update last run
      await this.loadSchedules();
      this.render();
    } catch (error) {
      const testModal = document.getElementById('test-modal');
      const testMessage = document.getElementById('test-message');
      if (testMessage) {
        testMessage.innerHTML = `
          <i class="fas fa-exclamation-triangle text-destructive mr-2"></i>
          Failed: ${error.message}
        `;
      }
      testModal?.classList.remove('hidden');
      testModal?.classList.add('flex');
      
      setTimeout(() => {
        testModal?.classList.add('hidden');
        testModal?.classList.remove('flex');
      }, 3000);
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  viewLogs(id) {
    const schedule = (this.app.state.schedules || []).find(s => s.id === id);
    if (!schedule) return;
    
    this.app.components.notification.show({
      title: `Schedule Logs: ${schedule.name}`,
      message: `Last run: ${schedule.lastRun || 'Never'}\nExecutions: ${schedule.executionCount || 0}\nSuccess rate: ${this.calculateSuccessRate([schedule])}%`,
      type: 'info'
    });
  }

  applyFilters() {
    const filterBoard = document.getElementById('schedule-filter-board')?.value;
    const filterMode = document.getElementById('schedule-filter-mode')?.value;
    const filterStatus = document.getElementById('schedule-filter-status')?.value;
    
    const schedules = this.app.state.schedules || [];
    const boards = this.app.state.boards || [];
    const places = this.app.state.places || [];
    const switches = this.app.state.switches || [];
    
    let filteredSchedules = [...schedules];
    
    if (filterBoard) {
      filteredSchedules = filteredSchedules.filter(s => s.boardId == filterBoard);
    }
    
    if (filterMode) {
      filteredSchedules = filteredSchedules.filter(s => s.mode === filterMode);
    }
    
    if (filterStatus === 'active') {
      filteredSchedules = filteredSchedules.filter(s => s.isActive !== false);
    } else if (filterStatus === 'inactive') {
      filteredSchedules = filteredSchedules.filter(s => s.isActive === false);
    }
    
    const listContainer = document.getElementById('schedules-list');
    if (listContainer) {
      if (filteredSchedules.length > 0) {
        listContainer.innerHTML = filteredSchedules.map(schedule => 
          this.renderScheduleRow(schedule, boards, places, switches)
        ).join('');
        this.bindEvents(); // Re-bind events
      } else {
        listContainer.innerHTML = this.renderEmptyState();
        this.bindEvents();
      }
    }
  }

  setupDeleteConfirmation() {
    const deleteModal = document.getElementById('delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    let deleteId = null;

    document.querySelectorAll('.delete-schedule').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteId = parseInt(btn.dataset.id);
        deleteModal?.classList.remove('hidden');
        deleteModal?.classList.add('flex');
      });
    });

    cancelDeleteBtn?.addEventListener('click', () => {
      deleteModal?.classList.add('hidden');
      deleteModal?.classList.remove('flex');
      deleteId = null;
    });

    confirmDeleteBtn?.addEventListener('click', async () => {
      if (deleteId) {
        const loadingEl = document.getElementById('schedules-loading');
        if (loadingEl) loadingEl.classList.remove('hidden');
        
        try {
          const api = this.app.getService('api');
          await api.deleteSchedule(deleteId);
          await this.loadSchedules();
          
          this.app.components.notification.show({
            title: 'Schedule Deleted',
            message: 'Schedule removed successfully',
            type: 'info'
          });
          
          deleteModal?.classList.add('hidden');
          deleteModal?.classList.remove('flex');
          this.render();
        } catch (error) {
          this.app.components.notification.show({
            title: 'Error',
            message: error.message || 'Failed to delete schedule',
            type: 'error'
          });
        } finally {
          if (loadingEl) loadingEl.classList.add('hidden');
          deleteId = null;
        }
      }
    });
  }

  resetModal() {
    document.getElementById('schedule-name-input').value = '';
    document.getElementById('schedule-description-input').value = '';
    document.getElementById('schedule-board-select').value = '';
    document.getElementById('schedule-mode-select').value = 'manual';
    document.getElementById('schedule-action-select').value = 'ON';
    document.getElementById('schedule-active').checked = true;
    document.getElementById('schedule-type-select').value = 'daily';
    
    // Reset config containers
    document.getElementById('cron-config')?.classList.add('hidden');
    document.getElementById('daily-config')?.classList.remove('hidden');
    document.getElementById('weekly-config')?.classList.add('hidden');
    document.getElementById('time-range-config')?.classList.add('hidden');
    
    // Clear inputs
    document.getElementById('schedule-cron-input').value = '';
    document.getElementById('schedule-time-input').value = '';
    document.getElementById('schedule-weekly-time-input').value = '';
    document.getElementById('schedule-start-time-input').value = '';
    document.getElementById('schedule-end-time-input').value = '';
    document.getElementById('schedule-day-select').value = '0';
    
    // Reset switch select
    const switchSelect = document.getElementById('schedule-switch-select');
    if (switchSelect) switchSelect.innerHTML = '<option value="">-- Select Switch --</option>';
  }
}