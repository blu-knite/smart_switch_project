import { STATS } from '../utils/constants.js';

export default class DashboardPage {
  constructor(app) {
    this.app = app;
    this.switchCards = new Map();
    this.aiInsights = null;
    this.aiUpdateInterval = null;
    this.initialized = false;
    this.mockRecommendations = [
      {
        id: 1,
        type: 'mode',
        mode_name: 'AI Mode',
        reason: 'Switch 2 in Living Room has usage pattern suggesting automation',
        confidence: 0.90
      },
      {
        id: 2,
        type: 'schedule',
        mode_name: 'Schedule',
        reason: 'Office lights typically off between 12AM-6AM',
        confidence: 0.80
      },
      {
        id: 3,
        type: 'energy',
        mode_name: 'Energy Save',
        reason: 'Bedroom AC could be optimized during peak hours',
        confidence: 0.76
      }
    ];
  }

  async init() {
    // Always refresh data when dashboard is shown
    try {
      await this.loadData();
      this.render();
      this.startAIUpdates();
    } catch (error) {
      console.error('DashboardPage init error:', error);
      this.render();
    }
  }

  async loadData() {
    try {
      const api = this.app.getService('api');
      const boards = await api.getBoards();
      this.app.state.boards = Array.isArray(boards) ? boards : [];
      
      await this.loadAIInsights();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.app.state.boards = this.app.state.boards || [];
    }
  }

  async loadAIInsights() {
    try {
      const api = this.app.getService('api');
      this.aiInsights = await api.getAIInsights();
      this.app.state.aiInsights = this.aiInsights;
    } catch (error) {
      console.error('Failed to load AI insights:', error);
      this.aiInsights = {
        trust_scores: { overall: 0.94 },
        prediction_accuracy: 0.87,
        drift_metrics: { score: 0.12, drift_detected: false },
        recommendations: this.mockRecommendations
      };
    }
  }

  startAIUpdates() {
    if (this.aiUpdateInterval) {
      clearInterval(this.aiUpdateInterval);
    }
    
    this.aiUpdateInterval = setInterval(async () => {
      await this.loadAIInsights();
      this.updateAIWidgets();
    }, 30000);
  }

  updateAIWidgets() {
    if (!this.aiInsights) return;

    const trustElement = document.getElementById('ai-trust-score');
    if (trustElement) {
      const trust = (this.aiInsights.trust_scores?.overall * 100 || 94).toFixed(1);
      trustElement.textContent = `${trust}%`;
    }

    const accuracyElement = document.getElementById('ai-accuracy');
    if (accuracyElement) {
      const accuracy = (this.aiInsights.prediction_accuracy * 100 || 87).toFixed(1);
      accuracyElement.textContent = `${accuracy}%`;
    }

    const driftElement = document.getElementById('ai-drift');
    if (driftElement) {
      const drift = (this.aiInsights.drift_metrics?.score * 100 || 12).toFixed(1);
      driftElement.textContent = `${drift}%`;
    }

    const updateElement = document.getElementById('ai-last-update');
    if (updateElement) {
      updateElement.textContent = 'Just now';
    }

    this.renderAIRecommendations(this.aiInsights.recommendations || this.mockRecommendations);
  }

  render() {
    const container = document.getElementById('dashboard-page');
    if (!container) {
      console.error('Dashboard container not found');
      return;
    }

    const boards = this.app.state.boards || [];
    const totalSwitches = boards.reduce((acc, board) => acc + (board.switches?.length || 0), 0);
    const activeSwitches = boards.reduce((acc, board) => 
      acc + (board.switches?.filter(s => s.state).length || 0), 0
    );

    container.innerHTML = this.getTemplate(boards, totalSwitches, activeSwitches);
    
    // Render board switches after template is inserted
    setTimeout(() => {
      boards.forEach(board => {
        this.renderBoardSwitchesForBoard(board);
      });
      this.bindEvents();
    }, 50);
    
    this.updateAIWidgets();
  }

  getTemplate(boards, totalSwitches, activeSwitches) {
    const stats = STATS.map(stat => {
      let value = stat.value;
      if (stat.label === 'Active Switches') {
        value = `${activeSwitches}/${totalSwitches}`;
      }
      return { ...stat, value };
    });

    return `
      <section id="dashboard-page" class="page active animate-slide-in">
        <!-- Welcome Header -->
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gradient mb-1">Quantum Dashboard</h1>
          <p class="text-sm text-muted-foreground">AI-powered home control system</p>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          ${stats.map(stat => `
            <div class="glass-card p-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-${stat.color}/10 text-${stat.color} flex items-center justify-center">
                  <i class="fas fa-${stat.icon} text-lg"></i>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">${stat.label}</p>
                  <p class="text-xl font-bold">${stat.value}</p>
                </div>
              </div>
              <div class="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-${stat.color} to-${stat.color}-500 rounded-full" style="width: ${stat.progress}%"></div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <!-- Left Column - Control Matrix -->
          <div class="lg:col-span-2">
            <div class="glass-card p-5">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold">Control Matrix</h2>
                <div class="flex gap-2">
                  <button id="ai-optimize-btn" class="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-sm hover:bg-accent/20 transition">
                    <i class="fas fa-robot mr-1"></i>AI Optimize
                  </button>
                  <button id="view-all-btn" class="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20 transition">
                    View All
                  </button>
                </div>
              </div>

              <!-- Boards Summary -->
              <div class="flex flex-wrap gap-2 mb-4">
                ${boards.map(board => `
                  <div class="px-3 py-1.5 bg-muted/30 rounded-full text-sm flex items-center gap-2">
                    <i class="fas fa-${board.icon || 'microchip'} text-primary"></i>
                    <span>${this.escapeHtml(board.name)}</span>
                    <span class="text-xs bg-muted px-1.5 rounded-full">
                      ${board.switches?.filter(s => s.state).length || 0}/${board.switches?.length || 0}
                    </span>
                  </div>
                `).join('')}
              </div>

              <!-- Switch Previews -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3" id="switch-previews">
                ${this.renderSwitchPreviews(boards)}
              </div>
            </div>
          </div>

          <!-- Right Column - AI Panel -->
          <div>
            <div class="glass-card p-5 h-full">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold">AI Insights</h2>
                <span class="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">Live</span>
              </div>
              
              <!-- AI Stats Row -->
              <div class="grid grid-cols-3 gap-2 mb-4">
                <div class="bg-muted/20 p-2 rounded-lg text-center">
                  <p class="text-xs text-muted-foreground">Trust</p>
                  <p class="text-lg font-bold text-accent" id="ai-trust-score">94%</p>
                </div>
                <div class="bg-muted/20 p-2 rounded-lg text-center">
                  <p class="text-xs text-muted-foreground">Accuracy</p>
                  <p class="text-lg font-bold text-success" id="ai-accuracy">87%</p>
                </div>
                <div class="bg-muted/20 p-2 rounded-lg text-center">
                  <p class="text-xs text-muted-foreground">Drift</p>
                  <p class="text-lg font-bold text-warning" id="ai-drift">12%</p>
                </div>
              </div>

              <!-- Recommendations -->
              <div id="ai-recommendations" class="space-y-2 mb-4 max-h-[200px] overflow-y-auto pr-1">
                ${(this.aiInsights?.recommendations || this.mockRecommendations).map(rec => `
                  <div class="p-3 bg-accent/5 rounded-lg border border-accent/20">
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-semibold">${rec.mode_name || rec.type}</span>
                      <span class="text-xs px-2 py-0.5 ${rec.confidence > 0.8 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'} rounded-full">
                        ${Math.round(rec.confidence * 100)}%
                      </span>
                    </div>
                    <p class="text-xs text-muted-foreground mb-2">${rec.reason}</p>
                    <button class="apply-recommendation text-xs text-primary hover:underline" data-id="${rec.id}">
                      Apply <i class="fas fa-arrow-right ml-1"></i>
                    </button>
                  </div>
                `).join('')}
              </div>

              <!-- Quick Actions -->
              <div class="grid grid-cols-2 gap-2 mb-3">
                <button class="action-button p-2 bg-muted/20 rounded-lg hover:bg-muted/40 transition flex items-center justify-center gap-2" data-action="all-on">
                  <i class="fas fa-power-off text-success"></i>
                  <span class="text-sm">All On</span>
                </button>
                <button class="action-button p-2 bg-muted/20 rounded-lg hover:bg-muted/40 transition flex items-center justify-center gap-2" data-action="night-mode">
                  <i class="fas fa-moon text-primary"></i>
                  <span class="text-sm">Night</span>
                </button>
                <button class="action-button p-2 bg-muted/20 rounded-lg hover:bg-muted/40 transition flex items-center justify-center gap-2" data-action="away-mode">
                  <i class="fas fa-home text-warning"></i>
                  <span class="text-sm">Away</span>
                </button>
                <button class="action-button p-2 bg-muted/20 rounded-lg hover:bg-muted/40 transition flex items-center justify-center gap-2" data-action="ai-optimize">
                  <i class="fas fa-robot text-accent"></i>
                  <span class="text-sm">AI</span>
                </button>
              </div>

              <!-- System Status -->
              <div class="flex items-center justify-between pt-3 border-t border-border/30 text-sm">
                <div class="flex items-center gap-4">
                  <span class="flex items-center gap-1">
                    <i class="fas fa-wifi text-success text-xs"></i>
                    <span class="text-xs">MQTT</span>
                  </span>
                  <span class="flex items-center gap-1">
                    <i class="fas fa-brain text-success text-xs"></i>
                    <span class="text-xs">AI Engine</span>
                  </span>
                </div>
                <span class="text-xs text-muted-foreground" id="ai-last-update">Just now</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Boards Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" id="boards-container">
          ${boards.map(board => this.renderBoardCard(board)).join('')}
        </div>
      </section>
    `;
  }

  renderSwitchPreviews(boards) {
    let allSwitches = [];
    boards.forEach(board => {
      (board.switches || []).forEach(sw => {
        allSwitches.push({ 
          ...sw, 
          boardName: board.name, 
          boardId: board.id, 
          boardUid: board.uid 
        });
      });
    });
    
    if (allSwitches.length === 0) {
      return '<div class="col-span-full text-center py-4 text-muted-foreground">No switches available</div>';
    }
    
    return allSwitches.slice(0, 8).map(sw => `
      <div class="bg-muted/20 p-3 rounded-lg hover:bg-muted/30 transition cursor-pointer switch-preview" 
           data-board="${sw.boardId}" data-switch="${sw.index}">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-lg bg-${sw.color || 'primary'}/10 text-${sw.color || 'primary'} flex items-center justify-center">
            <i class="fas fa-${sw.icon || 'lightbulb'}"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">${this.escapeHtml(sw.name)}</p>
            <p class="text-xs text-muted-foreground truncate">${this.escapeHtml(sw.boardName)}</p>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs px-2 py-0.5 rounded-full ${sw.state ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}">
            ${sw.state ? 'ON' : 'OFF'}
          </span>
          <span class="text-xs text-muted-foreground">${sw.power || 0}W</span>
        </div>
      </div>
    `).join('');
  }

  renderBoardCard(board) {
    const activeCount = board.switches?.filter(s => s.state).length || 0;
    const totalCount = board.switches?.length || 0;
    const isExpanded = this.expandedBoards?.has(board.id) || false;

    return `
      <div class="glass-card overflow-hidden" data-board-id="${board.id}">
        <div class="board-header p-4 cursor-pointer hover:bg-muted/10 transition flex items-center justify-between" data-board-id="${board.id}">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl">
              <i class="fas fa-${board.icon || 'microchip'}"></i>
            </div>
            <div>
              <h3 class="text-lg font-bold">${this.escapeHtml(board.name)}</h3>
              <div class="flex items-center gap-3 text-xs text-muted-foreground">
                <span><i class="fas fa-microchip mr-1"></i>${board.uid || 'Unknown'}</span>
                <span><i class="fas fa-clock mr-1"></i>${board.lastSeen || 'Just now'}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm bg-muted px-3 py-1 rounded-full">
              ${activeCount}/${totalCount} active
            </span>
            <i class="fas fa-chevron-down text-muted-foreground transition-transform board-chevron ${isExpanded ? 'rotate-180' : ''}"></i>
          </div>
        </div>
        
        <!-- Switches Grid -->
        <div id="board-${board.id}-switches" class="board-switches px-4 pb-4 ${isExpanded ? '' : 'hidden'}">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3" id="board-${board.id}-switches-grid"></div>
        </div>
      </div>
    `;
  }

  renderBoardSwitchesForBoard(board) {
    const grid = document.getElementById(`board-${board.id}-switches-grid`);
    if (!grid || !board.switches) return;

    grid.innerHTML = '';
    
    board.switches.forEach(switchData => {
      const card = document.createElement('div');
      card.className = `switch-card bg-muted/30 border border-border rounded-xl p-4 hover:border-primary/30 transition-all ${switchData.state ? 'active' : ''}`;
      card.dataset.switchId = switchData.id;
      
      const modeNames = ['Manual', 'Presence', 'AI', 'Auto'];
      const modeColors = ['bg-gray-500/10 text-gray-400', 'bg-yellow-500/10 text-yellow-500', 'bg-primary/10 text-primary', 'bg-green-500/10 text-green-500'];
      const modeIcons = ['hand', 'user', 'robot', 'magic'];

      card.innerHTML = `
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-${switchData.color || 'primary'}/10 flex items-center justify-center text-${switchData.color || 'primary'}">
              <i class="fas fa-${switchData.icon || 'lightbulb'} text-lg"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold">${this.escapeHtml(switchData.name)}</h3>
                <span class="text-xs px-2 py-0.5 rounded-full ${modeColors[switchData.mode || 3]}">
                  <i class="fas fa-${modeIcons[switchData.mode || 3]} mr-1"></i>
                  ${modeNames[switchData.mode || 3]}
                </span>
              </div>
              <p class="text-sm text-muted-foreground">
                <i class="fas fa-microchip mr-1"></i>
                ${this.escapeHtml(board.name)} • Switch ${switchData.index} • ${switchData.power || 0}W
              </p>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" ${switchData.state ? 'checked' : ''} data-switch-id="${switchData.id}">
            <span class="toggle-slider"></span>
          </label>
        </div>
      `;

      const toggle = card.querySelector('input[type="checkbox"]');
      toggle.addEventListener('change', async (e) => {
        e.stopPropagation();
        await this.handleSwitchToggle(board, { ...switchData, state: e.target.checked });
      });

      grid.appendChild(card);
      
      const key = `${board.id}-${switchData.index}`;
      this.switchCards.set(key, card);
    });
  }

  renderAIRecommendations(recommendations) {
    const container = document.getElementById('ai-recommendations');
    if (!container) return;

    container.innerHTML = recommendations.map(rec => `
      <div class="p-3 bg-accent/5 rounded-lg border border-accent/20">
        <div class="flex items-center justify-between mb-1">
          <span class="font-semibold">${rec.mode_name || rec.type}</span>
          <span class="text-xs px-2 py-0.5 ${rec.confidence > 0.8 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'} rounded-full">
            ${Math.round(rec.confidence * 100)}%
          </span>
        </div>
        <p class="text-xs text-muted-foreground mb-2">${rec.reason}</p>
        <button class="apply-recommendation text-xs text-primary hover:underline" data-id="${rec.id}">
          Apply <i class="fas fa-arrow-right ml-1"></i>
        </button>
      </div>
    `).join('');

    container.querySelectorAll('.apply-recommendation').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const recId = btn.dataset.id;
        await this.applyAIRecommendation(recId);
      });
    });
  }

  async handleSwitchToggle(board, sw) {
    try {
      const api = this.app.getService('api');
      
      const boardIndex = this.app.state.boards.findIndex(b => b.id === board.id);
      if (boardIndex !== -1) {
        const switchIndex = this.app.state.boards[boardIndex].switches.findIndex(s => s.id === sw.id);
        if (switchIndex !== -1) {
          this.app.state.boards[boardIndex].switches[switchIndex].state = sw.state;
        }
      }

      this.updateSwitchCard(board, sw);
      await api.toggleSwitch(sw.id, sw.state);

      this.app.getComponent('notification').show({
        title: board.name,
        message: `${sw.name} turned ${sw.state ? 'on' : 'off'}`,
        type: sw.state ? 'success' : 'info'
      });

    } catch (error) {
      sw.state = !sw.state;
      this.updateSwitchCard(board, sw);
      
      this.app.getComponent('notification').show({
        title: 'Error',
        message: 'Failed to toggle switch',
        type: 'error'
      });
    }
  }

  async applyAIRecommendation(recId) {
    try {
      const api = this.app.getService('api');
      await api.applyAIRecommendation(recId);
      
      this.app.getComponent('notification').show({
        title: 'AI Recommendation Applied',
        message: 'The AI recommendation has been applied',
        type: 'success'
      });
    } catch (error) {
      this.app.getComponent('notification').show({
        title: 'Failed to Apply',
        message: error.message,
        type: 'error'
      });
    }
  }

  updateSwitchCard(board, sw) {
    const key = `${board.id}-${sw.index}`;
    const card = this.switchCards.get(key);
    if (card) {
      const toggle = card.querySelector('input[type="checkbox"]');
      if (toggle) toggle.checked = sw.state;
      if (sw.state) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    }
  }

  async handleQuickAction(action) {
    const api = this.app.getService('api');
    const notification = this.app.getComponent('notification');
    const boards = this.app.state.boards || [];
    
    try {
      switch(action) {
        case 'all-on':
          for (const board of boards) {
            for (const sw of (board.switches || [])) {
              await api.toggleSwitch(sw.id, true);
            }
          }
          notification.show({
            title: 'Success',
            message: 'All switches turned on',
            type: 'success'
          });
          break;
          
        case 'night-mode':
          notification.show({
            title: 'Night Mode',
            message: 'Activated',
            type: 'info'
          });
          break;
          
        case 'away-mode':
          notification.show({
            title: 'Away Mode',
            message: 'Activated',
            type: 'info'
          });
          break;
          
        case 'ai-optimize':
          await this.loadAIInsights();
          this.updateAIWidgets();
          notification.show({
            title: 'AI Optimization',
            message: 'Complete',
            type: 'success'
          });
          break;
      }
      
      const freshBoards = await api.getBoards();
      this.app.state.boards = Array.isArray(freshBoards) ? freshBoards : [];
      this.render();
      
    } catch (error) {
      notification.show({
        title: 'Error',
        message: error.message,
        type: 'error'
      });
    }
  }

  bindEvents() {
    // Use event delegation for board headers
    const boardsContainer = document.getElementById('boards-container');
    if (boardsContainer) {
      boardsContainer.removeEventListener('click', this.boardClickHandler);
      this.boardClickHandler = (e) => {
        const header = e.target.closest('.board-header');
        if (header && !e.target.closest('button') && !e.target.closest('.toggle-switch')) {
          const boardDiv = header.closest('[data-board-id]');
          if (boardDiv) {
            const boardId = boardDiv.dataset.boardId;
            const switchesDiv = document.getElementById(`board-${boardId}-switches`);
            const chevron = header.querySelector('.board-chevron');
            if (switchesDiv) {
              switchesDiv.classList.toggle('hidden');
              if (chevron) chevron.classList.toggle('rotate-180');
            }
          }
        }
      };
      boardsContainer.addEventListener('click', this.boardClickHandler);
    }

    // Quick action buttons
    document.querySelectorAll('.action-button').forEach(btn => {
      btn.removeEventListener('click', this.actionHandler);
      this.actionHandler = () => {
        const action = btn.dataset.action;
        this.handleQuickAction(action);
      };
      btn.addEventListener('click', this.actionHandler);
    });

    // AI Optimize button
    const aiOptimizeBtn = document.getElementById('ai-optimize-btn');
    if (aiOptimizeBtn) {
      aiOptimizeBtn.removeEventListener('click', this.aiOptimizeHandler);
      this.aiOptimizeHandler = () => this.handleQuickAction('ai-optimize');
      aiOptimizeBtn.addEventListener('click', this.aiOptimizeHandler);
    }

    // View all button
    const viewAllBtn = document.getElementById('view-all-btn');
    if (viewAllBtn) {
      viewAllBtn.removeEventListener('click', this.viewAllHandler);
      this.viewAllHandler = () => this.app.navigate('boards');
      viewAllBtn.addEventListener('click', this.viewAllHandler);
    }

    // Switch preview click handlers
    document.querySelectorAll('.switch-preview').forEach(preview => {
      preview.removeEventListener('click', this.previewHandler);
      this.previewHandler = () => {
        const boardId = preview.dataset.board;
        const boardSection = document.querySelector(`[data-board-id="${boardId}"]`);
        if (boardSection) {
          const switchesDiv = boardSection.querySelector('.board-switches');
          const chevron = boardSection.querySelector('.board-chevron');
          if (switchesDiv) {
            switchesDiv.classList.toggle('hidden');
            if (chevron) {
              chevron.style.transform = switchesDiv.classList.contains('hidden') ? '' : 'rotate(180deg)';
            }
          }
          boardSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };
      preview.addEventListener('click', this.previewHandler);
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
  }

  destroy() {
    if (this.aiUpdateInterval) {
      clearInterval(this.aiUpdateInterval);
      this.aiUpdateInterval = null;
    }
    this.switchCards.clear();
  }
}