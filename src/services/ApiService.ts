const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  private static getAuthHeaders(): { [key: string]: string } {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private static async handleResponse(response: Response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'An error occurred');
    }
    return response.json();
  }

  // Auth APIs
  static async signup(userData: { email: string; password: string; name?: string; phone?: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    const data = await this.handleResponse(response);
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  }

  static async signin(credentials: { email: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(credentials)
    });
    const data = await this.handleResponse(response);
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  }

  static async getProfile() {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // Generic GET helper (supports responseType: 'json' (default) | 'blob' | 'raw')
  static async get(path: string, opts: RequestInit & { responseType?: 'json' | 'blob' | 'raw' } = {}) {
    const headers = { ...this.getAuthHeaders(), ...(opts.headers || {}) } as any;
    const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`, { ...opts, headers });
    const responseType = opts.responseType || 'json';
    if (responseType === 'blob') {
      const blob = await response.blob();
      return { data: blob, status: response.status, headers: response.headers } as any;
    }
    if (responseType === 'raw') return { raw: response, status: response.status, headers: response.headers } as any;
    return this.handleResponse(response);
  }

  // POST multipart/form-data helper (supports responseType similar to get)
  static async postMultipart(path: string, formData: FormData, opts: RequestInit & { responseType?: 'json' | 'blob' | 'raw' } = {}) {
    const token = localStorage.getItem('authToken');
    const headers: any = opts.headers || {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`, { method: 'POST', body: formData, ...opts, headers });
    const responseType = opts.responseType || 'json';
    if (responseType === 'blob') {
      const blob = await response.blob();
      return { data: blob, status: response.status, headers: response.headers } as any;
    }
    if (responseType === 'raw') return { raw: response, status: response.status, headers: response.headers } as any;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return this.handleResponse(response);
    const txt = await response.text().catch(() => '');
    try { return JSON.parse(txt); } catch { return txt; }
  }

  static async updateProfile(profileData: { name?: string; phone?: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    return this.handleResponse(response);
  }

  // Medicine APIs
  static async getMedicines() {
    const response = await fetch(`${API_BASE_URL}/medicines`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async addMedicine(medicineData: { name: string; time: string; days: string[] }) {
    const response = await fetch(`${API_BASE_URL}/medicines`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(medicineData)
    });
    return this.handleResponse(response);
  }

  static async updateMedicine(id: string, medicineData: { name?: string; time?: string; days?: string[]; is_active?: boolean }) {
    const response = await fetch(`${API_BASE_URL}/medicines/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(medicineData)
    });
    return this.handleResponse(response);
  }

  static async deleteMedicine(id: string) {
    const response = await fetch(`${API_BASE_URL}/medicines/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async toggleMedicine(id: string) {
    const response = await fetch(`${API_BASE_URL}/medicines/${id}/toggle`, {
      method: 'PATCH',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // Mood APIs
  static async getMoodEntries() {
    const response = await fetch(`${API_BASE_URL}/mood`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async addMoodEntry(moodData: { 
    mood: string; 
    activity_type?: string; 
    activity_content?: string; 
    interests?: string[]; 
    notes?: string 
  }) {
    const response = await fetch(`${API_BASE_URL}/mood`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(moodData)
    });
    return this.handleResponse(response);
  }

  static async getMoodStats(period: number = 7) {
    const response = await fetch(`${API_BASE_URL}/mood/stats?period=${period}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async getUserInterests() {
    const response = await fetch(`${API_BASE_URL}/mood/interests`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // News APIs
  static async getAggregatedNews() {
    const response = await fetch(`${API_BASE_URL}/news/all`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async getNewsSources() {
    const response = await fetch(`${API_BASE_URL}/news/sources`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // Memory Aids APIs
  static async getMemoryAids() {
    const response = await fetch(`${API_BASE_URL}/memory`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async addMemoryAid(memoryData: { title: string; date: string; time?: string; type: string; notes?: string }) {
    const response = await fetch(`${API_BASE_URL}/memory`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(memoryData)
    });
    return this.handleResponse(response);
  }

  static async updateMemoryAid(id: string, memoryData: { title?: string; date?: string; time?: string; type?: string; notes?: string; is_active?: boolean }) {
    const response = await fetch(`${API_BASE_URL}/memory/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(memoryData)
    });
    return this.handleResponse(response);
  }

  static async deleteMemoryAid(id: string) {
    const response = await fetch(`${API_BASE_URL}/memory/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async getTodaysReminders() {
    const response = await fetch(`${API_BASE_URL}/memory/today`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async getUpcomingReminders() {
    const response = await fetch(`${API_BASE_URL}/memory/upcoming`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // Emergency Contacts APIs
  static async getEmergencyContacts() {
    const response = await fetch(`${API_BASE_URL}/emergency`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async addEmergencyContact(contactData: { name: string; phone: string; relationship: string; is_primary?: boolean }) {
    const response = await fetch(`${API_BASE_URL}/emergency`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(contactData)
    });
    return this.handleResponse(response);
  }

  static async updateEmergencyContact(id: string, contactData: { name?: string; phone?: string; relationship?: string; is_primary?: boolean }) {
    const response = await fetch(`${API_BASE_URL}/emergency/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(contactData)
    });
    return this.handleResponse(response);
  }

  static async deleteEmergencyContact(id: string) {
    const response = await fetch(`${API_BASE_URL}/emergency/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async setPrimaryContact(id: string) {
    const response = await fetch(`${API_BASE_URL}/emergency/${id}/primary`, {
      method: 'PATCH',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async getPrimaryContact() {
    const response = await fetch(`${API_BASE_URL}/emergency/primary`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // Utility methods
  static logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  static isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  static getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
}

export default ApiService;
