export default class ApiService {
  constructor() {
    this.baseUrl = '';
    this.token = localStorage.getItem('token');
    this.socket = null;
    this.socketConnected = false;
    this.reconnectAttempts = 0;
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `/api${endpoint}`;
    
    const config = {
      ...options,
      headers: this.getAuthHeaders(),
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        this.clearToken();
        window.location.href = '/';
        throw new Error('Session expired');
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || 'API request failed';
        } catch {
          errorMessage = errorText || 'API request failed';
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // ==================== AUTH ENDPOINTS ====================

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
      this.disconnectSocket();
    }
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // ==================== PLACE ENDPOINTS ====================

  async getPlaces() {
    const response = await this.request('/places');
    return response.data || response || [];
  }

  async getPlace(id) {
    return this.request(`/places/${id}`);
  }

  async createPlace(data) {
    return this.request('/places', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePlace(id, data) {
    return this.request(`/places/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deletePlace(id) {
    return this.request(`/places/${id}`, {
      method: 'DELETE'
    });
  }

  // ==================== BOARD ENDPOINTS ====================

  async getBoards() {
    const response = await this.request('/boards');
    return response.data || response || [];
  }

  async getBoard(id) {
    return this.request(`/boards/${id}`);
  }

  async createBoard(data) {
    return this.request('/boards', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateBoard(id, data) {
    return this.request(`/boards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteBoard(id) {
    return this.request(`/boards/${id}`, {
      method: 'DELETE'
    });
  }

  // ==================== SWITCH ENDPOINTS ====================

  async getSwitches(boardId) {
    const url = boardId ? `/switches?boardId=${boardId}` : '/switches';
    const response = await this.request(url);
    return response.data || response || [];
  }

  async getSwitch(id) {
    return this.request(`/switches/${id}`);
  }

  async updateSwitch(id, data) {
    return this.request(`/switches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteSwitch(id) {
    return this.request(`/switches/${id}`, {
      method: 'DELETE'
    });
  }

  async toggleSwitch(id, state) {
    return this.request(`/switches/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ state })
    });
  }

  async setSwitchMode(id, mode) {
    return this.request(`/switches/${id}/mode`, {
      method: 'POST',
      body: JSON.stringify({ mode })
    });
  }

  // ==================== SCHEDULE ENDPOINTS ====================

  async getSchedules() {
    const response = await this.request('/schedules');
    return response.data || response || [];
  }

  async getSchedule(id) {
    return this.request(`/schedules/${id}`);
  }

  async createSchedule(data) {
    return this.request('/schedules', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateSchedule(id, data) {
    return this.request(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteSchedule(id) {
    return this.request(`/schedules/${id}`, {
      method: 'DELETE'
    });
  }

  async toggleSchedule(id, enabled) {
    return this.request(`/schedules/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled })
    });
  }

  // ==================== ROUTINE ENDPOINTS ====================

  async getRoutines() {
    const response = await this.request('/routines');
    return response.data || response || [];
  }

  async getRoutine(id) {
    return this.request(`/routines/${id}`);
  }

  async createRoutine(data) {
    return this.request('/routines', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateRoutine(id, data) {
    return this.request(`/routines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteRoutine(id) {
    return this.request(`/routines/${id}`, {
      method: 'DELETE'
    });
  }

  async executeRoutine(id) {
    return this.request(`/routines/${id}/execute`, {
      method: 'POST'
    });
  }

  async toggleRoutine(id, enabled) {
    return this.request(`/routines/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled })
    });
  }

  // ==================== AI ENDPOINTS ====================

  async getAIInsights() {
    try {
      return await this.request('/ai/insights');
    } catch (error) {
      console.warn('Using mock AI insights');
      return {
        trust_scores: { overall: 0.94 },
        prediction_accuracy: 0.87,
        drift_metrics: { score: 0.12, drift_detected: false },
        recommendations: [
          {
            id: 1,
            type: 'mode',
            mode_name: 'AI Mode',
            reason: 'Switch usage pattern suggests automation',
            confidence: 0.90
          }
        ]
      };
    }
  }

  async getAIPredictions(deviceId) {
    try {
      return await this.request(`/ai/predictions/${deviceId}`);
    } catch (error) {
      return { predictions: [] };
    }
  }

  async getAIRecommendations() {
    try {
      return await this.request('/ai/recommendations');
    } catch (error) {
      const insights = await this.getAIInsights();
      return { recommendations: insights.recommendations };
    }
  }

  async applyAIRecommendation(recommendationId) {
    return this.request('/ai/apply', {
      method: 'POST',
      body: JSON.stringify({ recommendationId })
    });
  }

  // ==================== SOCKET.IO CONNECTION ====================

  connectSocket() {
    if (this.socket || !this.token) return;

    try {
      this.socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.socketConnected = true;
        this.reconnectAttempts = 0;
        this.socket.emit('authenticate', this.token);
      });

      this.socket.on('authenticated', (data) => {
        console.log('Socket authenticated:', data);
      });

      this.socket.on('connect_error', (error) => {
        console.warn('Socket connection error:', error);
        this.socketConnected = false;
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.socketConnected = false;
      });

      // Event forwarding
      const events = [
        'board:created', 'board:updated', 'board:deleted',
        'switch:updated', 'switch:toggled', 'switch:mode-changed',
        'schedule:triggered', 'routine:executed',
        'mqtt:status', 'ai:prediction', 'ai:anomaly', 'ai:recommendation'
      ];

      events.forEach(event => {
        this.socket.on(event, (data) => {
          window.dispatchEvent(new CustomEvent(event, { detail: data }));
        });
      });

    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.socketConnected = false;
    }
  }

  isSocketConnected() {
    return this.socketConnected;
  }
}