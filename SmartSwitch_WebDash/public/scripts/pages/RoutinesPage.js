export default class RoutinesPage {
  constructor(app) {
    this.app = app;
    this.editingId = null;
    this.selectedBoard = null;
    this.selectedPlace = null;
  }

  async init() {
    try {
      await this.loadRoutines();
      this.render();
    } catch (error) {
      console.error('RoutinesPage init error:', error);
      this.app.state.routines = [];
      this.render();
    }
  }

  async loadRoutines() {
    try {
      const api = this.app.getService('api');
      const routines = await api.getRoutines();
      // Ensure routines is an array
      this.app.state.routines = Array.isArray(routines) ? routines : [];
    } catch (error) {
      console.error('Failed to load routines:', error);
      this.app.state.routines = [];
      throw error;
    }
  }

  getDefaultRoutines() {
    return [
      {
        id: Date.now(),
        name: 'Good Morning',
        description: 'Start your day with lights and fan',
        boardId: null,
        placeId: null,
        actions: [
          { type: 'switch', target: 'Living Room Light', action: 'ON', time: '07:00' },
          { type: 'switch', target: 'Fan', action: 'ON', time: '07:00' }
        ],
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: Date.now() + 1,
        name: 'Good Night',
        description: 'Prepare for sleep',
        boardId: null,
        placeId: null,
        actions: [
          { type: 'switch', target: 'All Lights', action: 'OFF', time: '23:00' },
          { type: 'lock', target: 'Main Door', action: 'LOCK', time: '23:00' }
        ],
        enabled: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  getDefaultAIRoutines() {
    return [
      {
        id: Date.now() + 100,
        name: 'Energy Saving Mode',
        description: 'Optimize power usage based on occupancy patterns',
        boardId: null,
        placeId: null,
        actions: 'Smart power management for optimal energy efficiency',
        type: 'ai',
        confidence: 95,
        createdAt: new Date().toISOString()
      },
      {
        id: Date.now() + 101,
        name: 'Security Check',
        description: 'Verify all doors locked and cameras active at night',
        boardId: null,
        placeId: null,
        actions: 'Automated security verification routine',
        type: 'ai',
        confidence: 88,
        createdAt: new Date().toISOString()
      },
      {
        id: Date.now() + 102,
        name: 'Comfort Mode',
        description: 'Adjust temperature and lighting based on time of day',
        boardId: null,
        placeId: null,
        actions: 'Dynamic environmental adjustments',
        type: 'ai',
        confidence: 92,
        createdAt: new Date().toISOString()
      }
    ];
  }

  saveToStorage() {
    localStorage.setItem('smartswitch_routines', JSON.stringify(this.app.state.routines));
  }

  render() {
    const container = document.getElementById('routines-page');
    if (!container) return;

    const routines = this.app.state.routines || [];
    const boards = this.app.state.boards || [];
    const places = this.app.state.places || [];

    // Calculate stats
    const totalRoutines = routines.length;
    const activeRoutines = routines.filter(r => r.enabled).length;
    const todayRuns = this.getTodayRunsCount(routines);

    container.innerHTML = `
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gradient mb-2">Routines</h1>
        <p class="text-muted-foreground">Automate actions across boards and switches</p>
      </div>

      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <i class="fas fa-robot"></i>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Total Routines</p>
              <p class="text-2xl font-bold">${totalRoutines}</p>
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
              <p class="text-2xl font-bold">${activeRoutines}</p>
            </div>
          </div>
        </div>
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <i class="fas fa-brain"></i>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">AI Suggestions</p>
              <p class="text-2xl font-bold">${this.getDefaultAIRoutines().length}</p>
            </div>
          </div>
        </div>
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
              <i class="fas fa-clock"></i>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Runs Today</p>
              <p class="text-2xl font-bold">${todayRuns}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end mb-6 gap-3">
        <button id="refresh-routines-btn"
          class="px-5 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-border transition-colors">
          <i class="fas fa-sync-alt mr-2"></i>
          Refresh
        </button>
        <button id="analyze-routines-btn"
          class="px-5 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors">
          <i class="fas fa-chart-line mr-2"></i>
          Analyze Usage
        </button>
        <button id="add-routine-btn"
          class="px-5 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
          <i class="fas fa-plus mr-2"></i>
          Add Routine
        </button>
      </div>

      <!-- User Routines -->
      <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-user text-primary"></i>
        Your Routines
      </h2>
      <div id="user-routines-list" class="space-y-4 mb-8">
        ${routines.length > 0 ? routines.map(r => this.renderRoutineCard(r, boards, places)).join('') : this.renderEmptyState('routines')}
      </div>

      <!-- AI-Generated Routines -->
      <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-brain text-accent"></i>
        AI Suggestions
        <span class="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent">Beta</span>
      </h2>
      <div id="ai-routines-list" class="space-y-4">
        ${this.getDefaultAIRoutines().map(r => this.renderAIRoutineCard(r, boards, places)).join('')}
      </div>

      <!-- Routine Modal -->
      <div id="routine-modal" class="modal hidden">
        <div class="modal-content w-full max-w-2xl">
          <h2 class="text-2xl font-bold mb-4" id="routine-modal-title">Create Routine</h2>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block mb-2 text-sm font-medium">Routine Name</label>
              <input id="routine-name-input" type="text" 
                placeholder="e.g., Morning Routine"
                class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">

              <label class="block mb-2 text-sm font-medium">Description</label>
              <textarea id="routine-description-input" 
                placeholder="Describe what this routine does..."
                rows="2"
                class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary"></textarea>

              <label class="block mb-2 text-sm font-medium">Board</label>
              <select id="routine-board-select" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                <option value="">-- Select Board --</option>
                ${boards.map(b => `<option value="${b.id}">${this.escapeHtml(b.name || 'Unnamed')}</option>`).join('')}
              </select>

              <label class="block mb-2 text-sm font-medium">Place</label>
              <select id="routine-place-select" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                <option value="">-- Select Place --</option>
                ${places.map(p => `<option value="${p.id}">${this.escapeHtml(p.name || 'Unnamed')}</option>`).join('')}
              </select>

              <label class="block mb-2 text-sm font-medium">Trigger Type</label>
              <select id="routine-trigger-select" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                <option value="manual">Manual</option>
                <option value="time">Time Based</option>
                <option value="device">Device State Change</option>
                <option value="presence">Presence Detection</option>
              </select>

              <div id="time-trigger-config" class="hidden mb-4">
                <label class="block mb-2 text-sm font-medium">Time</label>
                <input id="routine-time-input" type="time" 
                  class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
              </div>

              <div id="device-trigger-config" class="hidden mb-4">
                <label class="block mb-2 text-sm font-medium">Device</label>
                <select id="routine-device-select" class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                  <option value="">-- Select Device --</option>
                </select>
                <label class="block mt-2 mb-2 text-sm font-medium">Condition</label>
                <select id="routine-condition-select" class="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                  <option value="turns_on">Turns On</option>
                  <option value="turns_off">Turns Off</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block mb-2 text-sm font-medium">Actions</label>
              <div id="actions-container" class="space-y-2 mb-4 max-h-64 overflow-y-auto">
                <div class="action-row flex gap-2 items-center">
                  <select class="action-type-select flex-1 px-3 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                    <option value="switch">Switch</option>
                    <option value="light">Light</option>
                    <option value="fan">Fan</option>
                    <option value="ac">Air Conditioner</option>
                    <option value="lock">Lock</option>
                  </select>
                  <input type="text" placeholder="Target (e.g., Living Room Light)" 
                    class="action-target flex-1 px-3 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                  <select class="action-state-select px-3 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
                    <option value="ON">Turn On</option>
                    <option value="OFF">Turn Off</option>
                    <option value="TOGGLE">Toggle</option>
                  </select>
                  <button class="remove-action text-destructive hover:bg-destructive/10 p-2 rounded-lg">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
              <button id="add-action-btn" class="text-sm text-primary hover:text-primary/80 transition-colors">
                <i class="fas fa-plus mr-1"></i> Add Action
              </button>

              <div class="mt-4">
                <label class="flex items-center gap-2">
                  <input type="checkbox" id="routine-enabled" checked>
                  <span>Enable Routine</span>
                </label>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-4">
            <button id="cancel-routine-btn" 
              class="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-border transition">
              Cancel
            </button>
            <button id="save-routine-btn" 
              class="px-4 py-2 rounded-lg bg-primary text-background hover:opacity-90 transition">
              Save
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div id="delete-modal" class="modal hidden">
        <div class="modal-content">
          <h2 class="text-2xl font-bold mb-4">Delete Routine</h2>
          <p class="text-muted-foreground mb-6">Are you sure you want to delete this routine? This action cannot be undone.</p>
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
      <div id="routines-loading" class="hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-50 items-center justify-center">
        <div class="text-center">
          <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-primary">Loading...</p>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderEmptyState(type) {
    return `
      <div class="glass-card p-8 text-center">
        <i class="fas fa-${type === 'routines' ? 'robot' : 'calendar-alt'} text-4xl text-muted-foreground mb-3"></i>
        <h3 class="text-lg font-semibold mb-2">No ${type === 'routines' ? 'Routines' : 'Schedules'} Found</h3>
        <p class="text-muted-foreground mb-4">Get started by creating your first automation</p>
        <button id="empty-add-${type === 'routines' ? 'routine' : 'schedule'}-btn" 
          class="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
          <i class="fas fa-plus mr-2"></i>
          Add ${type === 'routines' ? 'Routine' : 'Schedule'}
        </button>
      </div>
    `;
  }

  renderRoutineCard(routine, boards, places) {
    const board = boards.find(b => b.id === routine.boardId);
    const place = places.find(p => p.id === routine.placeId);
    const lastExecuted = routine.lastExecuted ? new Date(routine.lastExecuted).toLocaleString() : 'Never';
    const executionCount = routine.executionCount || 0;
    
    // Safely handle actions - ensure it's an array
    const actions = Array.isArray(routine.actions) ? routine.actions : [];
    const actionCount = actions.length;

    return `
      <div class="glass-card p-6 hover:border-primary/30 transition-all group ${!routine.enabled ? 'opacity-60' : ''}"
           data-id="${routine.id}">
        <div class="flex flex-wrap justify-between items-start gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-3">
              <h3 class="text-xl font-bold">${this.escapeHtml(routine.name || 'Unnamed Routine')}</h3>
              <span class="text-xs px-2 py-1 rounded-full ${routine.enabled ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}">
                ${routine.enabled ? 'Active' : 'Disabled'}
              </span>
              ${routine.isAIGenerated ? '<span class="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent">AI Generated</span>' : ''}
            </div>
            
            ${routine.description ? `<p class="text-sm text-muted-foreground mb-3">${this.escapeHtml(routine.description)}</p>` : ''}
            
            <div class="grid grid-cols-2 gap-4 text-sm mb-3">
              <div>
                <p class="text-muted-foreground">Board:</p>
                <p class="font-medium">${board ? this.escapeHtml(board.name) : 'Any Board'}</p>
              </div>
              <div>
                <p class="text-muted-foreground">Place:</p>
                <p class="font-medium">${place ? this.escapeHtml(place.name) : 'Any Place'}</p>
              </div>
            </div>
            
            <div>
              <p class="text-muted-foreground mb-1">Actions (${actionCount}):</p>
              <ul class="list-disc list-inside text-sm space-y-1">
                ${actions.slice(0, 3).map(action => `
                  <li><span class="text-primary">${action.time || 'ASAP'}:</span> ${this.escapeHtml(action.target || action.type || 'Action')} → ${this.escapeHtml(action.action || action.state || 'Execute')}</li>
                `).join('')}
                ${actionCount > 3 ? `<li class="text-muted-foreground">... and ${actionCount - 3} more</li>` : ''}
              </ul>
            </div>
            
            <div class="mt-3 flex gap-3 text-xs text-muted-foreground">
              <span><i class="fas fa-calendar-alt mr-1"></i>Created: ${new Date(routine.createdAt || Date.now()).toLocaleDateString()}</span>
              <span><i class="fas fa-play-circle mr-1"></i>Executed: ${executionCount} times</span>
              <span><i class="fas fa-clock mr-1"></i>Last: ${lastExecuted}</span>
            </div>
          </div>
          
          <div class="flex gap-2">
            <button class="toggle-routine p-2 rounded-lg hover:bg-primary/10 text-primary transition"
                    data-id="${routine.id}" title="${routine.enabled ? 'Disable' : 'Enable'}">
              <i class="fas fa-${routine.enabled ? 'pause' : 'play'}"></i>
            </button>
            <button class="edit-routine p-2 rounded-lg hover:bg-primary/10 text-primary transition"
                    data-id="${routine.id}" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete-routine p-2 rounded-lg hover:bg-destructive/10 text-destructive transition"
                    data-id="${routine.id}" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div class="mt-4 pt-4 border-t border-border/30 flex justify-between items-center">
          <div class="flex gap-2">
            <button class="run-routine text-xs px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition"
                    data-id="${routine.id}">
              <i class="fas fa-play mr-1"></i> Run Now
            </button>
            ${routine.trigger && routine.trigger !== 'manual' ? `
              <span class="text-xs px-3 py-1 rounded-full bg-muted/30">
                <i class="fas fa-${routine.trigger === 'time' ? 'clock' : routine.trigger === 'device' ? 'microchip' : 'user'} mr-1"></i>
                ${routine.trigger}
              </span>
            ` : ''}
          </div>
          <div class="flex gap-2">
            ${routine.isAIGenerated ? `
              <span class="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent">
                <i class="fas fa-chart-line mr-1"></i>
                ${routine.confidence || 85}% Match
              </span>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderAIRoutineCard(routine, boards, places) {
    return `
      <div class="glass-card p-6 border border-accent/30 bg-accent/5 hover:border-accent/50 transition-all">
        <div class="flex flex-wrap justify-between items-start gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-3">
              <h3 class="text-xl font-bold">${this.escapeHtml(routine.name)}</h3>
              <span class="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent">
                AI Generated
              </span>
              <span class="text-xs px-2 py-1 rounded-full bg-success/10 text-success">
                ${routine.confidence}% Match
              </span>
            </div>
            
            <p class="text-muted-foreground mb-3">${this.escapeHtml(routine.description || routine.actions)}</p>
            
            <div class="flex gap-2">
              <span class="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                <i class="fas fa-lightbulb mr-1"></i> Smart Suggestion
              </span>
              <span class="text-xs px-2 py-1 rounded-full bg-muted/30">
                <i class="fas fa-chart-line mr-1"></i> Based on usage patterns
              </span>
            </div>
          </div>
          
          <div class="flex gap-2">
            <button class="apply-ai-routine p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
                    data-id="${routine.id}">
              <i class="fas fa-check mr-1"></i> Apply
            </button>
            <button class="dismiss-ai-routine p-2 rounded-lg bg-muted/10 text-muted-foreground hover:bg-muted/20 transition"
                    data-id="${routine.id}">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  getTodayRunsCount(routines) {
    const today = new Date().toDateString();
    let count = 0;
    for (const routine of routines) {
      if (routine.lastExecuted && new Date(routine.lastExecuted).toDateString() === today) {
        count++;
      }
    }
    return count;
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

  bindEvents() {
    const addBtn = document.getElementById('add-routine-btn');
    const refreshBtn = document.getElementById('refresh-routines-btn');
    const modal = document.getElementById('routine-modal');
    const cancelBtn = document.getElementById('cancel-routine-btn');
    const saveBtn = document.getElementById('save-routine-btn');
    const triggerSelect = document.getElementById('routine-trigger-select');
    const boardSelect = document.getElementById('routine-board-select');

    // Trigger type change handler
    triggerSelect?.addEventListener('change', () => {
      const timeConfig = document.getElementById('time-trigger-config');
      const deviceConfig = document.getElementById('device-trigger-config');
      
      timeConfig?.classList.add('hidden');
      deviceConfig?.classList.add('hidden');
      
      if (triggerSelect.value === 'time') {
        timeConfig?.classList.remove('hidden');
      } else if (triggerSelect.value === 'device') {
        deviceConfig?.classList.remove('hidden');
        this.updateDeviceList();
      }
    });

    // Board change to update device list
    boardSelect?.addEventListener('change', () => {
      this.updateDeviceList();
    });

    // Add action button
    document.getElementById('add-action-btn')?.addEventListener('click', () => {
      const container = document.getElementById('actions-container');
      const actionRow = this.createActionRow();
      container?.appendChild(actionRow);
    });

    // Refresh button
    refreshBtn?.addEventListener('click', async () => {
      const loadingEl = document.getElementById('routines-loading');
      if (loadingEl) loadingEl.classList.remove('hidden');
      try {
        await this.loadRoutines();
        this.render();
        this.app.components.notification.show({
          title: 'Refreshed',
          message: 'Routines list updated',
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

    // Open modal for adding
    addBtn?.addEventListener('click', () => {
      this.editingId = null;
      document.getElementById('routine-modal-title').innerText = 'Create Routine';
      this.resetModal();
      modal?.classList.remove('hidden');
      modal?.classList.add('flex');
    });

    // Empty state add button
    const emptyAddBtn = document.getElementById('empty-add-routine-btn');
    emptyAddBtn?.addEventListener('click', () => {
      addBtn?.click();
    });

    // Cancel modal
    cancelBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
      modal?.classList.remove('flex');
    });

    // Save routine
    saveBtn?.addEventListener('click', async () => {
      await this.saveRoutine();
    });

    // Edit routine
    document.querySelectorAll('.edit-routine').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        this.editRoutine(id);
      });
    });

    // Toggle routine
    document.querySelectorAll('.toggle-routine').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        await this.toggleRoutine(id);
      });
    });

    // Run routine
    document.querySelectorAll('.run-routine').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        await this.executeRoutine(id);
      });
    });

    // Apply AI routine
    document.querySelectorAll('.apply-ai-routine').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        await this.applyAIRoutine(id);
      });
    });

    // Dismiss AI routine
    document.querySelectorAll('.dismiss-ai-routine').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.glass-card');
        card?.remove();
        this.app.components.notification.show({
          title: 'Suggestion Dismissed',
          message: 'You can see it again later',
          type: 'info'
        });
      });
    });

    // Delete with confirmation
    this.setupDeleteConfirmation();

    // Analyze usage
    document.getElementById('analyze-routines-btn')?.addEventListener('click', () => {
      this.analyzeUsage();
    });
  }

  createActionRow() {
    const div = document.createElement('div');
    div.className = 'action-row flex gap-2 items-center';
    div.innerHTML = `
      <select class="action-type-select flex-1 px-3 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
        <option value="switch">Switch</option>
        <option value="light">Light</option>
        <option value="fan">Fan</option>
        <option value="ac">Air Conditioner</option>
        <option value="lock">Lock</option>
      </select>
      <input type="text" placeholder="Target (e.g., Living Room Light)" 
        class="action-target flex-1 px-3 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
      <select class="action-state-select px-3 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
        <option value="ON">Turn On</option>
        <option value="OFF">Turn Off</option>
        <option value="TOGGLE">Toggle</option>
      </select>
      <button class="remove-action text-destructive hover:bg-destructive/10 p-2 rounded-lg">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    div.querySelector('.remove-action')?.addEventListener('click', () => {
      div.remove();
    });
    
    return div;
  }

  async updateDeviceList() {
    const boardId = document.getElementById('routine-board-select')?.value;
    const deviceSelect = document.getElementById('routine-device-select');
    if (!deviceSelect) return;
    
    deviceSelect.innerHTML = '<option value="">-- Select Device --</option>';
    
    if (boardId) {
      try {
        const api = this.app.getService('api');
        const switches = await api.getSwitches(boardId);
        if (Array.isArray(switches)) {
          switches.forEach(sw => {
            const option = document.createElement('option');
            option.value = sw.id;
            option.textContent = sw.name || `Switch ${sw.index}`;
            deviceSelect.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Failed to load devices:', error);
      }
    }
  }

  async saveRoutine() {
    const nameInput = document.getElementById('routine-name-input');
    const descriptionInput = document.getElementById('routine-description-input');
    const boardSelect = document.getElementById('routine-board-select');
    const placeSelect = document.getElementById('routine-place-select');
    const enabledCheck = document.getElementById('routine-enabled');
    const triggerSelect = document.getElementById('routine-trigger-select');

    const name = nameInput?.value.trim();
    const description = descriptionInput?.value.trim();
    const boardId = boardSelect?.value;
    const placeId = placeSelect?.value;
    const enabled = enabledCheck?.checked || false;
    const trigger = triggerSelect?.value || 'manual';

    if (!name) {
      this.app.components.notification.show({
        title: 'Error',
        message: 'Please enter a routine name',
        type: 'error'
      });
      return;
    }

    // Collect actions safely
    const actions = [];
    document.querySelectorAll('.action-row').forEach(row => {
      const type = row.querySelector('.action-type-select')?.value;
      const target = row.querySelector('.action-target')?.value.trim();
      const action = row.querySelector('.action-state-select')?.value;
      
      if (target && action) {
        actions.push({ type, target, action });
      }
    });

    if (actions.length === 0) {
      this.app.components.notification.show({
        title: 'Error',
        message: 'Please add at least one action',
        type: 'error'
      });
      return;
    }

    // Build trigger config
    let triggerConfig = {};
    if (trigger === 'time') {
      const timeInput = document.getElementById('routine-time-input');
      triggerConfig = { time: timeInput?.value || '08:00' };
    } else if (trigger === 'device') {
      const deviceSelect = document.getElementById('routine-device-select');
      const conditionSelect = document.getElementById('routine-condition-select');
      triggerConfig = {
        deviceId: deviceSelect?.value,
        condition: conditionSelect?.value
      };
    }

    const routineData = {
      name,
      description: description || null,
      boardId: boardId || null,
      placeId: placeId || null,
      actions,
      trigger,
      triggerConfig,
      enabled
    };

    const loadingEl = document.getElementById('routines-loading');
    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
      const api = this.app.getService('api');
      
      if (this.editingId) {
        await api.updateRoutine(this.editingId, routineData);
        this.app.components.notification.show({
          title: 'Routine Updated',
          message: `${name} updated successfully`,
          type: 'success'
        });
      } else {
        await api.createRoutine(routineData);
        this.app.components.notification.show({
          title: 'Routine Created',
          message: `${name} added successfully`,
          type: 'success'
        });
      }

      await this.loadRoutines();
      const modal = document.getElementById('routine-modal');
      modal?.classList.add('hidden');
      modal?.classList.remove('flex');
      this.render();
    } catch (error) {
      console.error('Save routine error:', error);
      this.app.components.notification.show({
        title: 'Error',
        message: error.message || 'Failed to save routine',
        type: 'error'
      });
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  async editRoutine(id) {
    const routines = this.app.state.routines || [];
    const routine = routines.find(r => r.id === id);
    if (!routine) return;

    this.editingId = id;
    document.getElementById('routine-modal-title').innerText = 'Edit Routine';
    
    document.getElementById('routine-name-input').value = routine.name || '';
    document.getElementById('routine-description-input').value = routine.description || '';
    document.getElementById('routine-board-select').value = routine.boardId || '';
    document.getElementById('routine-place-select').value = routine.placeId || '';
    document.getElementById('routine-enabled').checked = routine.enabled !== false;
    document.getElementById('routine-trigger-select').value = routine.trigger || 'manual';
    
    // Set trigger config if exists
    if (routine.trigger === 'time' && routine.triggerConfig?.time) {
      document.getElementById('routine-time-input').value = routine.triggerConfig.time;
      document.getElementById('time-trigger-config')?.classList.remove('hidden');
    } else if (routine.trigger === 'device' && routine.triggerConfig?.deviceId) {
      document.getElementById('device-trigger-config')?.classList.remove('hidden');
      await this.updateDeviceList();
      setTimeout(() => {
        document.getElementById('routine-device-select').value = routine.triggerConfig.deviceId || '';
        document.getElementById('routine-condition-select').value = routine.triggerConfig.condition || 'turns_on';
      }, 100);
    }
    
    // Clear and populate actions
    const container = document.getElementById('actions-container');
    if (container) {
      container.innerHTML = '';
      const actions = Array.isArray(routine.actions) ? routine.actions : [];
      if (actions.length > 0) {
        actions.forEach(action => {
          const actionRow = this.createActionRow();
          const typeSelect = actionRow.querySelector('.action-type-select');
          const targetInput = actionRow.querySelector('.action-target');
          const stateSelect = actionRow.querySelector('.action-state-select');
          
          if (typeSelect) typeSelect.value = action.type || 'switch';
          if (targetInput) targetInput.value = action.target || '';
          if (stateSelect) stateSelect.value = action.action || action.state || 'ON';
          
          container.appendChild(actionRow);
        });
      } else {
        container.appendChild(this.createActionRow());
      }
    }
    
    const modal = document.getElementById('routine-modal');
    modal?.classList.remove('hidden');
    modal?.classList.add('flex');
  }

  async toggleRoutine(id) {
    const routines = this.app.state.routines || [];
    const routine = routines.find(r => r.id === id);
    if (!routine) return;

    const newState = !routine.enabled;
    
    try {
      const api = this.app.getService('api');
      await api.toggleRoutine(id, newState);
      
      routine.enabled = newState;
      this.app.state.routines = [...routines];
      
      this.render();
      
      this.app.components.notification.show({
        title: newState ? 'Routine Enabled' : 'Routine Disabled',
        message: `${routine.name} ${newState ? 'enabled' : 'disabled'}`,
        type: 'info'
      });
    } catch (error) {
      this.app.components.notification.show({
        title: 'Error',
        message: error.message || 'Failed to toggle routine',
        type: 'error'
      });
    }
  }

  async executeRoutine(id) {
    const routines = this.app.state.routines || [];
    const routine = routines.find(r => r.id === id);
    if (!routine) return;

    const loadingEl = document.getElementById('routines-loading');
    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
      const api = this.app.getService('api');
      await api.executeRoutine(id);
      
      this.app.components.notification.show({
        title: 'Routine Executed',
        message: `${routine.name} started successfully`,
        type: 'success'
      });
      
      // Reload to update execution count
      await this.loadRoutines();
      this.render();
    } catch (error) {
      this.app.components.notification.show({
        title: 'Execution Failed',
        message: error.message || 'Failed to execute routine',
        type: 'error'
      });
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  async applyAIRoutine(id) {
    const aiRoutines = this.getDefaultAIRoutines();
    const routine = aiRoutines.find(r => r.id === id);
    if (!routine) return;

    const loadingEl = document.getElementById('routines-loading');
    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
      const api = this.app.getService('api');
      
      const newRoutine = {
        name: routine.name,
        description: routine.description || routine.actions,
        actions: [{ type: 'ai', target: 'ai', action: routine.actions }],
        enabled: true,
        trigger: 'manual',
        isAIGenerated: true,
        confidence: routine.confidence
      };
      
      await api.createRoutine(newRoutine);
      await this.loadRoutines();
      this.render();
      
      this.app.components.notification.show({
        title: 'AI Routine Applied',
        message: `${routine.name} added to your routines`,
        type: 'success'
      });
    } catch (error) {
      this.app.components.notification.show({
        title: 'Failed to Apply',
        message: error.message,
        type: 'error'
      });
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  setupDeleteConfirmation() {
    const deleteModal = document.getElementById('delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    let deleteId = null;

    document.querySelectorAll('.delete-routine').forEach(btn => {
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
        const loadingEl = document.getElementById('routines-loading');
        if (loadingEl) loadingEl.classList.remove('hidden');
        
        try {
          const api = this.app.getService('api');
          await api.deleteRoutine(deleteId);
          await this.loadRoutines();
          
          this.app.components.notification.show({
            title: 'Routine Deleted',
            message: 'Routine removed successfully',
            type: 'info'
          });
          
          deleteModal?.classList.add('hidden');
          deleteModal?.classList.remove('flex');
          this.render();
        } catch (error) {
          this.app.components.notification.show({
            title: 'Error',
            message: error.message || 'Failed to delete routine',
            type: 'error'
          });
        } finally {
          if (loadingEl) loadingEl.classList.add('hidden');
          deleteId = null;
        }
      }
    });
  }

  analyzeUsage() {
    const routines = this.app.state.routines || [];
    const activeCount = routines.filter(r => r.enabled).length;
    const totalActions = routines.reduce((sum, r) => sum + (Array.isArray(r.actions) ? r.actions.length : 0), 0);
    const mostUsed = routines.length > 0 ? routines.reduce((max, r) => 
      (r.executionCount || 0) > (max.executionCount || 0) ? r : max, routines[0]) : null;
    
    this.app.components.notification.show({
      title: 'Usage Analysis',
      message: `${routines.length} total routines, ${activeCount} active. ${totalActions} total actions. ${mostUsed ? `Most used: ${mostUsed.name} (${mostUsed.executionCount || 0} times)` : 'No routines yet'}`,
      type: 'info'
    });
  }

  resetModal() {
    document.getElementById('routine-name-input').value = '';
    document.getElementById('routine-description-input').value = '';
    document.getElementById('routine-board-select').value = '';
    document.getElementById('routine-place-select').value = '';
    document.getElementById('routine-enabled').checked = true;
    document.getElementById('routine-trigger-select').value = 'manual';
    document.getElementById('time-trigger-config')?.classList.add('hidden');
    document.getElementById('device-trigger-config')?.classList.add('hidden');
    
    const container = document.getElementById('actions-container');
    if (container) {
      container.innerHTML = '';
      container.appendChild(this.createActionRow());
    }
  }
}