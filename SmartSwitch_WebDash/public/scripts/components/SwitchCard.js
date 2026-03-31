export default class SwitchCard {
  constructor(board, switchData, onToggle, onModeChange, onEdit) {
    this.board = board;
    this.switch = switchData;
    this.onToggle = onToggle;
    this.onModeChange = onModeChange;
    this.onEdit = onEdit;
    this.element = null;
    this.modeNames = ['Manual', 'Presence', 'AI', 'Auto'];
    this.modeColors = ['gray', 'yellow', 'cyan', 'green'];
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = `switch-card bg-muted/30 border border-border rounded-xl p-4 transition-all duration-200 ${this.switch.state ? 'active border-primary/50 bg-primary/5' : ''}`;
    
    const mode = this.switch.mode || 3;
    const isOnline = this.board.isOnline !== false;

    this.element.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <div class="w-10 h-10 rounded-lg bg-${this.switch.color || 'primary'}/10 flex items-center justify-center text-${this.switch.color || 'primary'} flex-shrink-0">
            <i class="fas fa-${this.switch.icon || 'lightbulb'} text-base"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-sm truncate">${this.escapeHtml(this.switch.name)}</span>
              ${!isOnline ? '<span class="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Offline</span>' : ''}
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs px-1.5 py-0.5 rounded-full bg-${this.modeColors[mode]}/10 text-${this.modeColors[mode]}-500">
                <i class="fas fa-${['hand', 'user', 'robot', 'magic'][mode]} text-xs mr-1"></i>${this.modeNames[mode]}
              </span>
              <span class="text-xs text-muted-foreground">${this.switch.power || 0}W</span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center gap-2 flex-shrink-0">
          <label class="toggle-switch scale-75">
            <input type="checkbox" ${this.switch.state ? 'checked' : ''} ${!isOnline ? 'disabled' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <div class="flex gap-1">
            <button class="edit-switch w-7 h-7 rounded bg-muted/50 hover:bg-muted transition flex items-center justify-center" ${!isOnline ? 'disabled' : ''}>
              <i class="fas fa-edit text-xs"></i>
            </button>
            <button class="mode-switch w-7 h-7 rounded bg-muted/50 hover:bg-muted transition flex items-center justify-center" data-mode="${(mode + 1) % 4}" ${!isOnline ? 'disabled' : ''}>
              <i class="fas fa-sync-alt text-xs"></i>
            </button>
          </div>
        </div>
      </div>
      
      <div class="switch-edit-modal hidden mt-3 pt-3 border-t border-border/30">
        <div class="grid grid-cols-2 gap-2">
          <input type="text" class="switch-name-input px-2 py-1.5 text-sm rounded bg-background border border-border" value="${this.escapeHtml(this.switch.name)}" placeholder="Name">
          <select class="switch-icon-select px-2 py-1.5 text-sm rounded bg-background border border-border">
            <option value="lightbulb" ${this.switch.icon === 'lightbulb' ? 'selected' : ''}>💡 Light</option>
            <option value="fan" ${this.switch.icon === 'fan' ? 'selected' : ''}>🌀 Fan</option>
            <option value="tv" ${this.switch.icon === 'tv' ? 'selected' : ''}>📺 TV</option>
            <option value="snowflake" ${this.switch.icon === 'snowflake' ? 'selected' : ''}>❄️ AC</option>
            <option value="desktop" ${this.switch.icon === 'desktop' ? 'selected' : ''}>💻 Computer</option>
            <option value="plug" ${this.switch.icon === 'plug' ? 'selected' : ''}>🔌 Outlet</option>
          </select>
          <input type="number" class="switch-power-input px-2 py-1.5 text-sm rounded bg-background border border-border" value="${this.switch.power || 60}" placeholder="Watts">
          <select class="switch-color-select px-2 py-1.5 text-sm rounded bg-background border border-border">
            <option value="primary" ${this.switch.color === 'primary' ? 'selected' : ''}>Cyan</option>
            <option value="success" ${this.switch.color === 'success' ? 'selected' : ''}>Green</option>
            <option value="warning" ${this.switch.color === 'warning' ? 'selected' : ''}>Yellow</option>
            <option value="danger" ${this.switch.color === 'danger' ? 'selected' : ''}>Red</option>
            <option value="accent" ${this.switch.color === 'accent' ? 'selected' : ''}>Purple</option>
          </select>
        </div>
        <div class="flex gap-2 mt-2">
          <button class="save-switch-edit flex-1 px-3 py-1.5 bg-primary text-white rounded text-sm">Save</button>
          <button class="cancel-switch-edit flex-1 px-3 py-1.5 bg-muted rounded text-sm">Cancel</button>
        </div>
      </div>
    `;

    this.bindEvents();
    return this.element;
  }

  bindEvents() {
    const toggle = this.element.querySelector('input[type="checkbox"]');
    if (toggle) {
      toggle.addEventListener('change', async (e) => {
        e.stopPropagation();
        const newState = e.target.checked;
        const oldState = this.switch.state;
        this.switch.state = newState;
        this.updateUI();
        try {
          if (this.onToggle) await this.onToggle(this.board, this.switch);
        } catch (error) {
          this.switch.state = oldState;
          this.updateUI();
        }
      });
    }

    const modeBtn = this.element.querySelector('.mode-switch');
    if (modeBtn) {
      modeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newMode = (this.switch.mode + 1) % 4;
        const oldMode = this.switch.mode;
        this.switch.mode = newMode;
        this.updateModeDisplay();
        try {
          if (this.onModeChange) await this.onModeChange(this.board, this.switch, newMode);
        } catch (error) {
          this.switch.mode = oldMode;
          this.updateModeDisplay();
        }
      });
    }

    const editBtn = this.element.querySelector('.edit-switch');
    const editModal = this.element.querySelector('.switch-edit-modal');
    if (editBtn && editModal) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editModal.classList.toggle('hidden');
      });
    }

    const saveBtn = this.element.querySelector('.save-switch-edit');
    if (saveBtn) {
      saveBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.saveEdit();
      });
    }

    const cancelBtn = this.element.querySelector('.cancel-switch-edit');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const editModal = this.element.querySelector('.switch-edit-modal');
        if (editModal) editModal.classList.add('hidden');
      });
    }
  }

  async saveEdit() {
    const nameInput = this.element.querySelector('.switch-name-input');
    const iconSelect = this.element.querySelector('.switch-icon-select');
    const powerInput = this.element.querySelector('.switch-power-input');
    const colorSelect = this.element.querySelector('.switch-color-select');
    
    const updatedData = {
      name: nameInput?.value.trim() || this.switch.name,
      icon: iconSelect?.value || this.switch.icon,
      power: parseInt(powerInput?.value) || 60,
      color: colorSelect?.value || this.switch.color
    };
    
    const oldData = {
      name: this.switch.name,
      icon: this.switch.icon,
      power: this.switch.power,
      color: this.switch.color
    };
    
    Object.assign(this.switch, updatedData);
    this.updateUI();
    
    const editModal = this.element.querySelector('.switch-edit-modal');
    if (editModal) editModal.classList.add('hidden');
    
    try {
      if (this.onEdit) {
        await this.onEdit(this.board, this.switch, updatedData);
      } else if (this.onToggle) {
        await this.onToggle(this.board, this.switch);
      }
    } catch (error) {
      Object.assign(this.switch, oldData);
      this.updateUI();
    }
  }

  updateUI() {
    const iconDiv = this.element.querySelector('.w-10.h-10');
    if (iconDiv) {
      const color = this.switch.color || 'primary';
      iconDiv.className = `w-10 h-10 rounded-lg bg-${color}/10 flex items-center justify-center text-${color} flex-shrink-0`;
      const icon = iconDiv.querySelector('i');
      if (icon) icon.className = `fas fa-${this.switch.icon || 'lightbulb'} text-base`;
    }
    
    const nameSpan = this.element.querySelector('.font-medium');
    if (nameSpan) nameSpan.textContent = this.escapeHtml(this.switch.name);
    
    const powerSpan = this.element.querySelector('.text-muted-foreground');
    if (powerSpan && powerSpan.textContent.includes('W')) {
      powerSpan.textContent = `${this.switch.power || 0}W`;
    }
    
    const toggle = this.element.querySelector('input[type="checkbox"]');
    if (toggle) toggle.checked = this.switch.state;
    
    if (this.switch.state) {
      this.element.classList.add('active', 'border-primary/50', 'bg-primary/5');
    } else {
      this.element.classList.remove('active', 'border-primary/50', 'bg-primary/5');
    }
    
    this.updateModeDisplay();
  }

  updateModeDisplay() {
    const mode = this.switch.mode || 3;
    const modeSpan = this.element.querySelector('.rounded-full');
    if (modeSpan) {
      const colors = ['gray', 'yellow', 'cyan', 'green'];
      modeSpan.className = `text-xs px-1.5 py-0.5 rounded-full bg-${colors[mode]}/10 text-${colors[mode]}-500`;
      modeSpan.innerHTML = `<i class="fas fa-${['hand', 'user', 'robot', 'magic'][mode]} text-xs mr-1"></i>${this.modeNames[mode]}`;
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }
}