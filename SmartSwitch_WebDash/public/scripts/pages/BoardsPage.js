import SwitchCard from '../components/SwitchCard.js'; // kept only for compatibility

export default class BoardsPage {
  constructor(app) {
    this.app = app;
    this.editingId = null;
    this.currentBoardId = null;
    this.deleteId = null;
    this.switchCards = new Map(); // exactly like DashboardPage
  }

  async init() {
    try {
      await this.loadBoards();
      this.render();
    } catch (error) {
      console.error('BoardsPage init error:', error);
      this.app.state.boards = [];
      this.render();
    }
  }

  async loadBoards() {
    try {
      const api = this.app.getService('api');
      const boards = await api.getBoards();
      this.app.state.boards = Array.isArray(boards) ? boards : [];
    } catch (error) {
      console.error('Failed to load boards:', error);
      this.app.state.boards = [];
      throw error;
    }
  }

  render() {
    const container = document.getElementById('boards-page');
    if (!container) return;

    const boards = this.app.state.boards || [];
    const places = this.app.state.places || [];
    const totalSwitches = boards.reduce((acc, b) => acc + (b.switches?.length || 0), 0);
    const avgSwitches = boards.length ? (totalSwitches / boards.length).toFixed(1) : '0';

    container.innerHTML = `
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gradient mb-2">Boards</h1>
        <p class="text-muted-foreground">Manage your smart boards and their switches</p>
      </div>

      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><i class="fas fa-th-large"></i></div>
            <div><p class="text-sm text-muted-foreground">Total Boards</p><p class="text-2xl font-bold">${boards.length}</p></div>
          </div>
        </div>
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center"><i class="fas fa-microchip"></i></div>
            <div><p class="text-sm text-muted-foreground">Total Switches</p><p class="text-2xl font-bold">${totalSwitches}</p></div>
          </div>
        </div>
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center"><i class="fas fa-map-marker-alt"></i></div>
            <div><p class="text-sm text-muted-foreground">Places Covered</p><p class="text-2xl font-bold">${new Set(boards.map(b => b.placeId).filter(id => id)).size}</p></div>
          </div>
        </div>
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><i class="fas fa-chart-pie"></i></div>
            <div><p class="text-sm text-muted-foreground">Avg Switches/Board</p><p class="text-2xl font-bold">${avgSwitches}</p></div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div class="flex gap-2">
          <select id="place-filter" class="px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
            <option value="">All Places</option>
            ${places.map(p => `<option value="${p.id}">${this.escapeHtml(p.name || 'Unnamed')}</option>`).join('')}
          </select>
          <select id="sort-filter" class="px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
            <option value="name">Sort by Name</option>
            <option value="switches">Sort by Switches</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
        <div class="flex gap-3">
          <button id="refresh-boards-btn" class="px-5 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-border transition-colors">
            <i class="fas fa-sync-alt mr-2"></i> Refresh
          </button>
          <button id="add-board-btn" class="px-5 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
            <i class="fas fa-plus mr-2"></i> Add Board
          </button>
        </div>
      </div>

      <!-- Boards List (always expanded) -->
      <div id="boards-list" class="space-y-6">
        ${boards.length > 0 ? boards.map(board => this.renderBoardWithSwitches(board, places)).join('') : this.renderEmptyState()}
      </div>

      <!-- Modals -->
      <div id="board-modal" class="modal hidden">
        <div class="modal-content w-full max-w-md">
          <h2 class="text-2xl font-bold mb-4" id="board-modal-title">Create Board</h2>
          <label class="block mb-2 text-sm font-medium">Board UID</label>
          <input id="board-uid-input" type="text" placeholder="Enter board UID" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
          <label class="block mb-2 text-sm font-medium">Board Name</label>
          <input id="board-name-input" type="text" placeholder="Enter board name" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
          <label class="block mb-2 text-sm font-medium">Place</label>
          <select id="board-place-select" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
            <option value="">-- None --</option>
            ${places.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('')}
          </select>
          <div class="flex justify-end gap-3">
            <button id="cancel-board-btn" class="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-border transition">Cancel</button>
            <button id="save-board-btn" class="px-4 py-2 rounded-lg bg-primary text-background hover:opacity-90 transition">Save</button>
          </div>
        </div>
      </div>

      <div id="add-switch-modal" class="modal hidden">
        <div class="modal-content w-full max-w-md">
          <h2 class="text-2xl font-bold mb-4">Add New Switch</h2>
          <label class="block mb-2 text-sm font-medium">Switch Name</label>
          <input id="new-switch-name" type="text" placeholder="e.g., Living Room Light" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
          <label class="block mb-2 text-sm font-medium">Switch Type</label>
          <select id="new-switch-type" class="w-full mb-4 px-4 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
            <option value="lightbulb">💡 Light (60W)</option>
            <option value="fan">🌀 Fan (75W)</option>
            <option value="tv">📺 TV (120W)</option>
            <option value="snowflake">❄️ Air Conditioner (1500W)</option>
            <option value="desktop">💻 Computer (200W)</option>
            <option value="coffee">☕ Coffee Maker (800W)</option>
            <option value="utensils">🍳 Kitchen Appliance (1000W)</option>
            <option value="music">🎵 Speaker (50W)</option>
            <option value="plug">🔌 Outlet (100W)</option>
            <option value="wifi">📡 Router (15W)</option>
          </select>
          <div class="flex justify-end gap-3">
            <button id="cancel-add-switch-btn" class="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-border transition">Cancel</button>
            <button id="confirm-add-switch-btn" class="px-4 py-2 rounded-lg bg-primary text-background hover:opacity-90 transition">Add Switch</button>
          </div>
        </div>
      </div>

      <div id="delete-modal" class="modal hidden">
        <div class="modal-content">
          <h2 class="text-2xl font-bold mb-4">Delete Board</h2>
          <p class="text-muted-foreground mb-6">Are you sure you want to delete this board? All switches will also be deleted. This action cannot be undone.</p>
          <div class="flex justify-end gap-3">
            <button id="cancel-delete-btn" class="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-border transition">Cancel</button>
            <button id="confirm-delete-btn" class="px-4 py-2 rounded-lg bg-destructive text-white hover:opacity-90 transition">Delete</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    // Exact same timing as DashboardPage
    setTimeout(() => {
      boards.forEach(board => this.renderBoardSwitchesForBoard(board));
    }, 50);
  }

  renderBoardWithSwitches(board, places) {
    const place = places.find(p => p.id === board.placeId);
    const isOnline = board.isOnline !== false;
    const activeSwitches = (board.switches || []).filter(s => s.state).length;
    const totalSwitches = (board.switches || []).length;
    const lastSeen = board.lastSeen ? new Date(board.lastSeen).toLocaleString() : 'Never';

    return `
      <div class="glass-card overflow-hidden board-container" data-board-id="${board.id}">
        <div class="board-header p-5 hover:bg-muted/10 transition-colors flex items-center justify-between">
          <div class="flex items-center gap-4 flex-1 min-w-0">
            <div class="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl flex-shrink-0">
              <i class="fas fa-${board.icon || 'microchip'}"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 flex-wrap">
                <h2 class="text-xl font-bold truncate">${this.escapeHtml(board.name)}</h2>
                <div class="flex items-center gap-2">
                  <span class="relative flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${isOnline ? 'bg-success' : 'bg-destructive'} opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-success' : 'bg-destructive'}"></span>
                  </span>
                  <span class="text-xs ${isOnline ? 'text-success' : 'text-destructive'}">${isOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>
              <div class="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                <span><i class="fas fa-microchip mr-1"></i>${board.uid || 'No UID'}</span>
                <span><i class="fas fa-map-marker-alt mr-1"></i>${place ? this.escapeHtml(place.name) : 'Unassigned'}</span>
                <span><i class="fas fa-clock mr-1"></i>Last seen: ${lastSeen}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <div class="text-2xl font-bold">${activeSwitches}/${totalSwitches}</div>
              <div class="text-xs text-muted-foreground">Active Switches</div>
            </div>
            <button class="delete-board-btn text-destructive hover:text-red-600 transition p-2" data-id="${board.id}">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>

        <!-- Switches Grid - always visible -->
        <div id="board-${board.id}-switches" class="board-switches p-5 pt-0 border-t border-border/30">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4" id="board-${board.id}-switches-grid"></div>
          <div class="flex justify-end mt-4">
            <button class="add-switch-btn text-sm px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition" data-board-id="${board.id}">
              <i class="fas fa-plus mr-1"></i> Add Switch
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // EXACT same switch rendering as DashboardPage
  renderBoardSwitchesForBoard(board) {
    const grid = document.getElementById(`board-${board.id}-switches-grid`);
    if (!grid) return;

    grid.innerHTML = '';

    if (!board.switches || board.switches.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-8 text-muted-foreground">
          <i class="fas fa-microchip text-4xl mb-2 opacity-50"></i>
          <p>No switches found on this board</p>
          <button class="add-switch-empty mt-2 text-sm text-primary hover:underline" data-board-id="${board.id}">Add Switch</button>
        </div>
      `;
      return;
    }

    const modeNames = ['Manual', 'Presence', 'AI', 'Auto'];
    const modeColors = ['bg-gray-500/10 text-gray-400', 'bg-yellow-500/10 text-yellow-500', 'bg-primary/10 text-primary', 'bg-green-500/10 text-green-500'];
    const modeIcons = ['hand', 'user', 'robot', 'magic'];

    board.switches.forEach(switchData => {
      const card = document.createElement('div');
      card.className = `switch-card bg-muted/30 border border-border rounded-xl p-4 hover:border-primary/30 transition-all ${switchData.state ? 'active' : ''}`;
      card.dataset.switchId = switchData.id;

      const currentMode = switchData.mode || 3;

      card.innerHTML = `
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-${switchData.color || 'primary'}/10 flex items-center justify-center text-${switchData.color || 'primary'}">
              <i class="fas fa-${switchData.icon || 'lightbulb'} text-lg"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold">${this.escapeHtml(switchData.name)}</h3>
                <span class="text-xs px-2 py-0.5 rounded-full ${modeColors[currentMode]}">
                  <i class="fas fa-${modeIcons[currentMode]} mr-1"></i>${modeNames[currentMode]}
                </span>
              </div>
              <p class="text-sm text-muted-foreground">
                <i class="fas fa-microchip mr-1"></i>
                ${this.escapeHtml(board.name)} • Switch ${switchData.index} • ${switchData.power || 0}W
              </p>
            </div>
          </div>

          <div class="flex flex-col items-end gap-2">
            <label class="toggle-switch">
              <input type="checkbox" ${switchData.state ? 'checked' : ''} data-switch-id="${switchData.id}">
              <span class="toggle-slider"></span>
            </label>
            <button class="mode-cycle-btn w-8 h-8 rounded bg-muted/50 hover:bg-muted transition flex items-center justify-center" title="Cycle Mode">
              <i class="fas fa-sync-alt text-xs"></i>
            </button>
          </div>
        </div>
      `;

      // Toggle - same as Dashboard
      card.querySelector('input[type="checkbox"]').addEventListener('change', async (e) => {
        e.stopPropagation();
        await this.handleSwitchToggle(board, { ...switchData, state: e.target.checked });
      });

      // Mode cycle button
      card.querySelector('.mode-cycle-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const newMode = (switchData.mode + 1) % 4;
        await this.handleModeChange(board, { ...switchData, mode: newMode }, newMode);
      });

      grid.appendChild(card);

      const key = `${board.id}-${switchData.id}`;
      this.switchCards.set(key, card);
    });
  }

  bindEvents() {
    // Refresh button
    document.getElementById('refresh-boards-btn')?.addEventListener('click', async () => {
      await this.loadBoards();
      this.render();
    });

    // Add Board button
    document.getElementById('add-board-btn')?.addEventListener('click', () => {
      this.editingId = null;
      document.getElementById('board-modal-title').innerText = 'Create Board';
      document.getElementById('board-uid-input').value = '';
      document.getElementById('board-name-input').value = '';
      document.getElementById('board-place-select').value = '';
      const modal = document.getElementById('board-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });

    // Empty state button
    document.getElementById('empty-add-board-btn')?.addEventListener('click', () => {
      document.getElementById('add-board-btn').click();
    });

    // Add Switch & Delete buttons (delegation)
    const boardsList = document.getElementById('boards-list');
    boardsList?.addEventListener('click', (e) => {
      const addBtn = e.target.closest('.add-switch-btn, .add-switch-empty');
      if (addBtn) {
        e.stopPropagation();
        const boardId = parseInt(addBtn.dataset.boardId);
        this.openAddSwitchModal(boardId);
      }

      const deleteBtn = e.target.closest('.delete-board-btn');
      if (deleteBtn) {
        e.stopPropagation();
        this.deleteId = parseInt(deleteBtn.dataset.id);
        const modal = document.getElementById('delete-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    });

    // Modal close buttons
    document.getElementById('cancel-board-btn')?.addEventListener('click', () => {
      const modal = document.getElementById('board-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });

    document.getElementById('save-board-btn')?.addEventListener('click', () => this.saveBoard());

    document.getElementById('cancel-add-switch-btn')?.addEventListener('click', () => {
      const modal = document.getElementById('add-switch-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });

    document.getElementById('confirm-add-switch-btn')?.addEventListener('click', () => {
      if (this.currentBoardId) this.addSwitchToBoard(this.currentBoardId);
    });

    document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
      const modal = document.getElementById('delete-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });

    document.getElementById('confirm-delete-btn')?.addEventListener('click', () => this.confirmDelete());
  }

  openAddSwitchModal(boardId) {
    this.currentBoardId = boardId;
    const modal = document.getElementById('add-switch-modal');
    document.getElementById('new-switch-name').value = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  async saveBoard() {
    // ... your original save logic
    const uid = document.getElementById('board-uid-input')?.value.trim();
    const name = document.getElementById('board-name-input')?.value.trim();
    const placeId = document.getElementById('board-place-select')?.value || null;

    if (!uid || !name) {
      this.app.components.notification.show({ title: 'Error', message: 'UID and Name are required', type: 'error' });
      return;
    }

    try {
      const api = this.app.getService('api');
      if (this.editingId) {
        await api.updateBoard(this.editingId, { name, placeId });
      } else {
        await api.createBoard({ uid, name, placeId });
      }
      await this.loadBoards();
      this.render();
      this.app.components.notification.show({ title: 'Success', message: `${name} saved`, type: 'success' });
    } catch (error) {
      this.app.components.notification.show({ title: 'Error', message: error.message, type: 'error' });
    }
  }

  async addSwitchToBoard(boardId) {
    // your original add logic
    const board = this.app.state.boards.find(b => b.id === boardId);
    if (!board) return;

    const name = document.getElementById('new-switch-name')?.value.trim();
    const type = document.getElementById('new-switch-type')?.value;

    if (!name) {
      this.app.components.notification.show({ title: 'Error', message: 'Please enter a switch name', type: 'error' });
      return;
    }

    const powerMap = { lightbulb: 60, fan: 75, tv: 120, snowflake: 1500, desktop: 200, coffee: 800, utensils: 1000, music: 50, plug: 100, wifi: 15 };
    const newSwitch = {
      boardId,
      index: (board.switches?.length || 0) + 1,
      name,
      icon: type,
      color: 'primary',
      mode: 3,
      state: false,
      power: powerMap[type] || 60
    };

    try {
      const api = this.app.getService('api');
      const created = await api.createSwitch(newSwitch);
      if (!board.switches) board.switches = [];
      board.switches.push(created);

      this.app.components.notification.show({ title: 'Success', message: `${name} added`, type: 'success' });

      const modal = document.getElementById('add-switch-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');

      this.renderBoardSwitchesForBoard(board);
      this.updateBoardStats(boardId);
    } catch (error) {
      this.app.components.notification.show({ title: 'Error', message: error.message, type: 'error' });
    }
  }

  async handleSwitchToggle(board, sw) {
    try {
      const api = this.app.getService('api');
      await api.toggleSwitch(sw.id, sw.state);

      const boardIndex = this.app.state.boards.findIndex(b => b.id === board.id);
      if (boardIndex !== -1) {
        const switchIndex = this.app.state.boards[boardIndex].switches.findIndex(s => s.id === sw.id);
        if (switchIndex !== -1) this.app.state.boards[boardIndex].switches[switchIndex].state = sw.state;
      }

      this.app.components.notification.show({
        title: board.name,
        message: `${sw.name} turned ${sw.state ? 'on' : 'off'}`,
        type: sw.state ? 'success' : 'info'
      });

      this.updateBoardStats(board.id);
      this.renderBoardSwitchesForBoard(board);
    } catch (error) {
      sw.state = !sw.state;
      this.renderBoardSwitchesForBoard(board);
      this.app.components.notification.show({ title: 'Error', message: 'Failed to toggle switch', type: 'error' });
    }
  }

  async handleModeChange(board, sw, mode) {
    try {
      const api = this.app.getService('api');
      await api.setSwitchMode(sw.id, mode);

      const boardIndex = this.app.state.boards.findIndex(b => b.id === board.id);
      if (boardIndex !== -1) {
        const switchIndex = this.app.state.boards[boardIndex].switches.findIndex(s => s.id === sw.id);
        if (switchIndex !== -1) this.app.state.boards[boardIndex].switches[switchIndex].mode = mode;
      }

      this.app.components.notification.show({
        title: 'Mode Changed',
        message: `${board.name} - ${sw.name} set to ${['Manual', 'Presence', 'AI', 'Auto'][mode]}`,
        type: 'info'
      });

      this.renderBoardSwitchesForBoard(board);
    } catch (error) {
      this.app.components.notification.show({ title: 'Error', message: 'Failed to change mode', type: 'error' });
    }
  }

  updateBoardStats(boardId) {
    const board = this.app.state.boards.find(b => b.id === boardId);
    if (!board) return;

    const active = (board.switches || []).filter(s => s.state).length;
    const total = (board.switches || []).length;

    const container = document.querySelector(`.board-container[data-board-id="${boardId}"]`);
    if (container) {
      const statsDiv = container.querySelector('.text-right');
      if (statsDiv) {
        statsDiv.innerHTML = `
          <div class="text-2xl font-bold">${active}/${total}</div>
          <div class="text-xs text-muted-foreground">Active Switches</div>
        `;
      }
    }
  }

  async confirmDelete() {
    if (!this.deleteId) return;
    try {
      const api = this.app.getService('api');
      await api.deleteBoard(this.deleteId);
      await this.loadBoards();
      this.render();
      this.app.components.notification.show({ title: 'Deleted', message: 'Board removed', type: 'info' });
    } catch (error) {
      this.app.components.notification.show({ title: 'Error', message: error.message, type: 'error' });
    } finally {
      const modal = document.getElementById('delete-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      this.deleteId = null;
    }
  }

  renderEmptyState() {
    return `
      <div class="glass-card p-12 text-center">
        <i class="fas fa-microchip text-6xl text-muted-foreground mb-4"></i>
        <h3 class="text-xl font-semibold mb-2">No Boards Found</h3>
        <p class="text-muted-foreground mb-4">Get started by adding your first smart board</p>
        <button id="empty-add-board-btn" class="px-5 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
          <i class="fas fa-plus mr-2"></i> Add Board
        </button>
      </div>
    `;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
  }
}