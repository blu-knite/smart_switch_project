export default class AuthService {
  constructor(apiService) {
    this.api = apiService;
    this.user = null;
  }

  async login(email, password) {
    try {
      const response = await this.api.login(email, password);
      this.user = response.user;
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await this.api.register(userData);
      this.user = response.user;
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.user = null;
    }
  }

  async getCurrentUser() {
    if (this.user) return this.user;

    try {
      const response = await this.api.getCurrentUser();
      this.user = response.user;
      return this.user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  isAuthenticated() {
    return !!this.api.token;
  }

  getUser() {
    return this.user;
  }
}