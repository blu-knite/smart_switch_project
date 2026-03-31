export default class PlacesPage {
  constructor(app) {
    this.app = app;
    this.editingId = null;
    this.defaultPlaces = [
      { id: 1, name: 'Home', icon: 'home', deviceCount: 0 },
      { id: 2, name: 'Work Place', icon: 'briefcase', deviceCount: 0 },
      { id: 3, name: 'Guest House', icon: 'house-user', deviceCount: 0 }
    ];
  }

  async init() {
    try {
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('PlacesPage init error:', error);
      this.app.state.places = [...this.defaultPlaces];
      this.render();
    }
  }

  async loadData() {
    try {
      const api = this.app.getService('api');
      
      // Load both places and boards simultaneously
      const [places, boards] = await Promise.all([
        api.getPlaces().catch(() => []),
        api.getBoards().catch(() => [])
      ]);
      
      this.app.state.places = Array.isArray(places) ? places : [];
      this.app.state.boards = Array.isArray(boards) ? boards : [];
    } catch (error) {
      console.error('Failed to load places data:', error);
      this.app.state.places = [...this.defaultPlaces];
    }
  }

  render() {
    const container = document.getElementById('places-page');
    if (!container) return;

    const places = this.app.state.places || [];
    const boards = this.app.state.boards || [];

    // Calculate device counts for each place based on actual boards
    const updatedPlaces = places.map(place => ({
      ...place,
      deviceCount: boards.filter(board => board.placeId === place.id).length
    }));

    const totalDevices = updatedPlaces.reduce((sum, place) => sum + place.deviceCount, 0);
    const avgDevices = places.length ? (totalDevices / places.length).toFixed(1) : '0';

    container.innerHTML = `
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gradient mb-2">Places</h1>
        <p class="text-muted-foreground">Organize your smart environments</p>
      </div>

      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <i class="fas fa-map-marker-alt"></i>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Total Places</p>
              <p class="text-2xl font-bold">${places.length}</p>
            </div>
          </div>
        </div>
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center">
              <i class="fas fa-microchip"></i>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Total Boards</p>
              <p class="text-2xl font-bold">${boards.length}</p>
            </div>
          </div>
        </div>
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <i class="fas fa-chart-line"></i>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Avg Boards/Place</p>
              <p class="text-2xl font-bold">${avgDevices}</p>
            </div>
          </div>
        </div>
        <div class="glass-card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
              <i class="fas fa-building"></i>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Occupied Places</p>
              <p class="text-2xl font-bold">${updatedPlaces.filter(p => p.deviceCount > 0).length}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end mb-6 gap-3">
        <button id="refresh-places-btn"
          class="px-5 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-border transition-colors">
          <i class="fas fa-sync-alt mr-2"></i> Refresh
        </button>
        <button id="add-place-btn"
          class="px-5 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
          <i class="fas fa-plus mr-2"></i> Add Place
        </button>
      </div>

      <!-- Places Grid -->
      <div id="places-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${updatedPlaces.map(place => this.renderPlaceCard(place, boards)).join('')}
      </div>

      <!-- Add/Edit Place Modal -->
      <div id="place-modal" class="modal hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50" style="display: none;">
        <div class="bg-background rounded-xl p-5 w-full max-w-sm border border-border">
          <h2 class="text-xl font-bold mb-3" id="place-modal-title">Create New Place</h2>
          <input id="place-name-input" type="text" placeholder="Enter place name..."
            class="w-full mb-3 px-3 py-2 rounded-lg bg-muted/30 border border-border focus:outline-none focus:border-primary">
          <label class="block mb-2 text-sm font-medium">Icon</label>
          <div class="grid grid-cols-6 gap-2 mb-4" id="icon-options">
            ${this.getIconOptions().map(icon => `
              <button class="icon-option p-2 rounded-lg border border-border hover:border-primary transition-colors ${icon === 'home' ? 'bg-primary/10 border-primary' : ''}"
                data-icon="${icon}">
                <i class="fas fa-${icon}"></i>
              </button>
            `).join('')}
          </div>
          <div class="flex justify-end gap-2">
            <button id="cancel-place-btn" class="px-4 py-2 rounded-lg bg-muted">Cancel</button>
            <button id="save-place-btn" class="px-4 py-2 rounded-lg bg-primary text-white">Save</button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div id="delete-modal" class="modal hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50" style="display: none;">
        <div class="bg-background rounded-xl p-5 w-full max-w-sm border border-border">
          <h2 class="text-xl font-bold mb-2">Delete Place</h2>
          <p class="text-sm text-muted-foreground mb-4" id="delete-place-message"></p>
          <div class="flex justify-end gap-2">
            <button id="cancel-delete-btn" class="px-4 py-2 rounded-lg bg-muted">Cancel</button>
            <button id="confirm-delete-btn" class="px-4 py-2 rounded-lg bg-destructive text-white">Delete</button>
          </div>
        </div>
      </div>

      <!-- Loading Indicator -->
      <div id="places-loading" class="hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-50 items-center justify-center">
        <div class="text-center">
          <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-primary">Loading...</p>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  getIconOptions() {
    return ['home', 'building', 'house-user', 'tree', 'umbrella-beach', 'city', 'store', 'university', 'hospital', 'school', 'hotel', 'warehouse'];
  }

  renderPlaceCard(place, boards) {
    const placeBoards = boards.filter(board => board.placeId === place.id);
    const deviceCount = placeBoards.length;
    const hasBoards = deviceCount > 0;

    return `
      <div class="glass-card p-5 hover:scale-[1.02] transition-transform cursor-pointer place-card" data-place-id="${place.id}" data-place-name="${place.name}">
        <div class="flex items-center justify-between mb-4">
          <div class="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl">
            <i class="fas fa-${place.icon || 'home'}"></i>
          </div>
          <div class="flex gap-2">
            <button class="edit-place text-primary hover:bg-primary/10 p-2 rounded-lg transition"
                    data-id="${place.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete-place text-destructive hover:bg-destructive/10 p-2 rounded-lg transition"
                    data-id="${place.id}" data-has-boards="${hasBoards}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <h3 class="text-xl font-bold truncate mb-1">${this.escapeHtml(place.name)}</h3>
        <p class="text-sm text-muted-foreground mb-3">
          <i class="fas fa-microchip mr-1"></i>
          ${deviceCount} board${deviceCount !== 1 ? 's' : ''}
        </p>
        
        ${hasBoards ? `
          <div class="mt-3 pt-3 border-t border-border/30">
            <p class="text-xs text-muted-foreground mb-2">Boards in this place:</p>
            <div class="space-y-1 max-h-32 overflow-y-auto">
              ${placeBoards.slice(0, 3).map(board => `
                <div class="flex items-center justify-between text-sm hover:bg-muted/10 p-1 rounded cursor-pointer board-item" 
                     data-board-id="${board.id}" data-board-name="${this.escapeHtml(board.name)}">
                  <span class="truncate flex-1">
                    <i class="fas fa-${board.icon || 'microchip'} text-xs mr-1"></i>
                    ${this.escapeHtml(board.name)}
                  </span>
                  <span class="text-xs ${board.isOnline !== false ? 'text-success' : 'text-destructive'}">
                    ${board.isOnline !== false ? '● Online' : '○ Offline'}
                  </span>
                </div>
              `).join('')}
              ${placeBoards.length > 3 ? `<p class="text-xs text-muted-foreground mt-1">+${placeBoards.length - 3} more</p>` : ''}
            </div>
            <button class="view-all-boards mt-2 text-xs text-primary hover:underline w-full text-center" data-place-id="${place.id}">
              <i class="fas fa-arrow-right mr-1"></i> View all boards
            </button>
          </div>
        ` : `
          <div class="mt-3 pt-3 border-t border-border/30 text-center">
            <p class="text-xs text-muted-foreground">No boards assigned yet</p>
            <button class="add-board-to-place mt-2 text-xs text-primary hover:underline" data-place-id="${place.id}" data-place-name="${this.escapeHtml(place.name)}">
              <i class="fas fa-plus mr-1"></i> Add board to this place
            </button>
          </div>
        `}
        
        <div class="flex justify-between items-center mt-3 pt-2 border-t border-border/30">
          <span class="text-xs text-muted-foreground">
            <i class="fas fa-calendar-alt mr-1"></i>
            ${new Date(place.createdAt || Date.now()).toLocaleDateString()}
          </span>
          ${hasBoards ? `
            <span class="text-xs ${placeBoards.some(b => b.isOnline !== false) ? 'text-success' : 'text-destructive'}">
              <i class="fas fa-circle"></i> 
              ${placeBoards.filter(b => b.isOnline !== false).length} online
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-places-btn');
    refreshBtn?.addEventListener('click', async () => {
      const loadingEl = document.getElementById('places-loading');
      if (loadingEl) loadingEl.classList.remove('hidden');
      try {
        await this.loadData();
        this.render();
        this.app.components.notification.show({
          title: 'Refreshed',
          message: 'Places and boards synchronized',
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

    // Add Place button
    const addBtn = document.getElementById('add-place-btn');
    addBtn?.addEventListener('click', () => this.openAddPlaceModal());

    // Place card click handlers (delegation)
    const placesGrid = document.getElementById('places-grid');
    if (placesGrid) {
      placesGrid.addEventListener('click', async (e) => {
        // Edit place
        const editBtn = e.target.closest('.edit-place');
        if (editBtn) {
          e.stopPropagation();
          const id = parseInt(editBtn.dataset.id);
          await this.editPlace(id);
          return;
        }

        // Delete place
        const deleteBtn = e.target.closest('.delete-place');
        if (deleteBtn) {
          e.stopPropagation();
          const id = parseInt(deleteBtn.dataset.id);
          const hasBoards = deleteBtn.dataset.hasBoards === 'true';
          await this.openDeleteModal(id, hasBoards);
          return;
        }

        // View all boards
        const viewAllBtn = e.target.closest('.view-all-boards');
        if (viewAllBtn) {
          e.stopPropagation();
          const placeId = parseInt(viewAllBtn.dataset.placeId);
          await this.viewAllBoards(placeId);
          return;
        }

        // Add board to place
        const addBoardBtn = e.target.closest('.add-board-to-place');
        if (addBoardBtn) {
          e.stopPropagation();
          const placeId = parseInt(addBoardBtn.dataset.placeId);
          const placeName = addBoardBtn.dataset.placeName;
          await this.addBoardToPlace(placeId, placeName);
          return;
        }

        // Navigate to specific board
        const boardItem = e.target.closest('.board-item');
        if (boardItem) {
          e.stopPropagation();
          const boardId = parseInt(boardItem.dataset.boardId);
          this.navigateToBoard(boardId);
          return;
        }
      });
    }

    // Modal handlers
    this.setupModals();
  }

  openAddPlaceModal() {
    const modal = document.getElementById('place-modal');
    const title = document.getElementById('place-modal-title');
    const nameInput = document.getElementById('place-name-input');
    
    if (modal) {
      this.editingId = null;
      title.textContent = 'Create New Place';
      nameInput.value = '';
      
      // Reset icon selection
      document.querySelectorAll('.icon-option').forEach(btn => {
        btn.classList.remove('bg-primary/10', 'border-primary');
        if (btn.dataset.icon === 'home') {
          btn.classList.add('bg-primary/10', 'border-primary');
        }
      });
      
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
    }
  }

  async editPlace(id) {
    const place = this.app.state.places.find(p => p.id === id);
    if (!place) return;

    const modal = document.getElementById('place-modal');
    const title = document.getElementById('place-modal-title');
    const nameInput = document.getElementById('place-name-input');
    
    this.editingId = id;
    title.textContent = 'Edit Place';
    nameInput.value = place.name;
    
    // Set icon selection
    document.querySelectorAll('.icon-option').forEach(btn => {
      btn.classList.remove('bg-primary/10', 'border-primary');
      if (btn.dataset.icon === (place.icon || 'home')) {
        btn.classList.add('bg-primary/10', 'border-primary');
      }
    });
    
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
  }

  async openDeleteModal(id, hasBoards) {
    this.deleteId = id;
    const modal = document.getElementById('delete-modal');
    const messageEl = document.getElementById('delete-place-message');
    
    if (hasBoards) {
      messageEl.textContent = 'This place has boards assigned to it. Deleting it will unassign all boards. Are you sure?';
    } else {
      messageEl.textContent = 'Are you sure you want to delete this place? This action cannot be undone.';
    }
    
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
  }

  async viewAllBoards(placeId) {
    // Navigate to boards page and filter by this place
    this.app.navigate('boards');
    
    // After navigation, filter boards by place
    setTimeout(() => {
      const placeFilter = document.getElementById('place-filter');
      if (placeFilter) {
        placeFilter.value = placeId;
        // Trigger change event to apply filter
        const event = new Event('change');
        placeFilter.dispatchEvent(event);
      }
      
      this.app.components.notification.show({
        title: 'Filtered Boards',
        message: 'Showing boards for selected place',
        type: 'info'
      });
    }, 100);
  }

  async addBoardToPlace(placeId, placeName) {
    // Navigate to boards page with add board modal
    this.app.navigate('boards');
    
    setTimeout(() => {
      // Open add board modal and pre-select the place
      const addBoardBtn = document.getElementById('add-board-btn');
      if (addBoardBtn) {
        addBoardBtn.click();
        
        // Wait for modal to open then set place
        setTimeout(() => {
          const placeSelect = document.getElementById('board-place-select');
          if (placeSelect) {
            placeSelect.value = placeId;
          }
        }, 200);
      }
      
      this.app.components.notification.show({
        title: 'Add Board',
        message: `Adding a new board to ${placeName}`,
        type: 'info'
      });
    }, 100);
  }

  navigateToBoard(boardId) {
    // Navigate to boards page and scroll to specific board
    this.app.navigate('boards');
    
    setTimeout(() => {
      const boardElement = document.querySelector(`[data-board-id="${boardId}"]`);
      if (boardElement) {
        boardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Expand the board if collapsed
        const switchesDiv = boardElement.querySelector('.board-switches');
        const chevron = boardElement.querySelector('.board-chevron');
        if (switchesDiv && switchesDiv.classList.contains('hidden')) {
          switchesDiv.classList.remove('hidden');
          if (chevron) chevron.classList.add('rotate-180');
        }
        
        // Highlight the board temporarily
        boardElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
        setTimeout(() => {
          boardElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
        }, 2000);
        
        this.app.components.notification.show({
          title: 'Board Found',
          message: `Navigated to board`,
          type: 'success'
        });
      }
    }, 100);
  }

  setupModals() {
    // Icon selection
    const iconOptions = document.getElementById('icon-options');
    if (iconOptions) {
      iconOptions.addEventListener('click', (e) => {
        const btn = e.target.closest('.icon-option');
        if (btn) {
          document.querySelectorAll('.icon-option').forEach(b => {
            b.classList.remove('bg-primary/10', 'border-primary');
          });
          btn.classList.add('bg-primary/10', 'border-primary');
        }
      });
    }

    // Save place
    const saveBtn = document.getElementById('save-place-btn');
    saveBtn?.addEventListener('click', async () => {
      await this.savePlace();
    });

    // Cancel place modal
    const cancelBtn = document.getElementById('cancel-place-btn');
    cancelBtn?.addEventListener('click', () => {
      this.closeModal('place-modal');
    });

    // Delete confirmation
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    cancelDeleteBtn?.addEventListener('click', () => {
      this.closeModal('delete-modal');
      this.deleteId = null;
    });
    
    confirmDeleteBtn?.addEventListener('click', async () => {
      if (this.deleteId) {
        await this.deletePlace(this.deleteId);
        this.deleteId = null;
        this.closeModal('delete-modal');
      }
    });

    // Close modals on outside click
    const modals = ['place-modal', 'delete-modal'];
    modals.forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModal(id);
        });
      }
    });
  }

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'none';
      modal.classList.add('hidden');
    }
  }

  async savePlace() {
    const nameInput = document.getElementById('place-name-input');
    const selectedIcon = document.querySelector('.icon-option.bg-primary\\/10')?.dataset.icon || 'home';
    
    const name = nameInput?.value.trim();
    if (!name) {
      this.app.components.notification.show({
        title: 'Error',
        message: 'Please enter a place name',
        type: 'error'
      });
      return;
    }

    const loadingEl = document.getElementById('places-loading');
    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
      const api = this.app.getService('api');
      
      if (this.editingId) {
        await api.updatePlace(this.editingId, { name, icon: selectedIcon });
        this.app.components.notification.show({
          title: 'Place Updated',
          message: `${name} updated successfully`,
          type: 'success'
        });
      } else {
        const places = this.app.state.places || [];
        if (places.some(p => p.name?.toLowerCase() === name.toLowerCase())) {
          this.app.components.notification.show({
            title: 'Duplicate Place',
            message: 'Place already exists',
            type: 'error'
          });
          if (loadingEl) loadingEl.classList.add('hidden');
          return;
        }
        await api.createPlace({ name, icon: selectedIcon });
        this.app.components.notification.show({
          title: 'Place Created',
          message: `${name} added successfully`,
          type: 'success'
        });
      }

      await this.loadData();
      this.closeModal('place-modal');
      this.render();
    } catch (error) {
      this.app.components.notification.show({
        title: 'Error',
        message: error.message || 'Failed to save place',
        type: 'error'
      });
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  async deletePlace(id) {
    const loadingEl = document.getElementById('places-loading');
    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
      const api = this.app.getService('api');
      await api.deletePlace(id);
      await this.loadData();
      
      this.app.components.notification.show({
        title: 'Place Deleted',
        message: 'Place removed successfully',
        type: 'info'
      });
      
      this.render();
    } catch (error) {
      this.app.components.notification.show({
        title: 'Error',
        message: error.message || 'Failed to delete place',
        type: 'error'
      });
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
  }
}