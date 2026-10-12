const getAPIUrl = () => {
  if (typeof window !== 'undefined') {
    // En producción, usa rutas relativas (mismo dominio)
    // En desarrollo local, usa localhost:5000
    // En VPS, detecta la IP automáticamente
    if (import.meta.env.PROD) {
      return '/api';
    }
    // En desarrollo: si está en localhost o 127.0.0.1, usa localhost:5000
    // Si está en otra IP (VPS), usa esa IP con puerto 5000
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    // Para VPS, usa la misma IP con puerto 5000
    return `http://${hostname}:5000/api`;
  }
  return '/api';
};

const API_URL = getAPIUrl();

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request<T>(method: string, endpoint: string, body?: any): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout para imágenes

      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API Error');
      }

      return data;
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  // Auth endpoints
  async signup(username: string, password: string, confirmPassword: string, email: string) {
    const response = await this.request<{ user: any; token: string }>('POST', '/auth/signup', {
      username,
      password,
      confirmPassword,
      email,
    });
    this.setToken(response.token);
    return response;
  }

  async login(username: string, password: string) {
    const response = await this.request<{ user: any; token: string }>('POST', '/auth/login', {
      username,
      password,
    });
    this.setToken(response.token);
    return response;
  }

  async getCurrentUser() {
    return await this.request<any>('GET', '/auth/me');
  }

  async getProfile(username: string) {
    return await this.request<any>('GET', `/auth/profile/${username}`);
  }

  async updateProfile(data: any) {
    return await this.request<any>('PUT', '/auth/profile', data);
  }

  // Data endpoints
  async getTournaments() {
    return await this.request<any[]>('GET', '/tournaments');
  }

  async getTopPlayers(limit: number = 5) {
    return await this.request<any[]>('GET', `/players/top?limit=${limit}`);
  }

  async getPlayers(page: number = 1, limit: number = 20) {
    return await this.request<{ data: any[]; pagination: any }>('GET', `/players?page=${page}&limit=${limit}`);
  }

  async getPlayerById(id: string) {
    return await this.request<any>('GET', `/players/${id}`);
  }

  async getPlayersCount() {
    return await this.request<{ total: number }>('GET', '/stats/players-count');
  }

  async getAdminOverview() {
    return await this.request<any>('GET', '/admin/overview');
  }

  async getAdminPlayer(id: number) {
    return await this.request<any>('GET', `/admin/players/${id}`);
  }

  async getAdminMatchRoom(key: number) {
    return await this.request<any>('GET', `/admin/matches/room/${key}`);
  }

  async getAdminSection(section: string, params?: Record<string, string | number | undefined> | string) {
    const query = new URLSearchParams();
    if (typeof params === 'string') {
      if (params) query.set('q', params);
    } else {
      Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
      });
    }
    const qs = query.toString();
    return await this.request<any>('GET', `/admin/${section}${qs ? `?${qs}` : ''}`);
  }

  async getClans(search?: string) {
    const url = search ? `/clans?search=${encodeURIComponent(search)}` : '/clans';
    return await this.request<any[]>('GET', url);
  }

  async getClanDetails(guildId: number) {
    return await this.request<any>('GET', `/clans/${guildId}`);
  }

  async getProducts(category?: string) {
    const url = category && category !== 'all' ? `/products?category=${category}` : '/products';
    return await this.request<any[]>('GET', url);
  }

  async getGcoinPackages() {
    return await this.request<any[]>('GET', '/wallet/packages');
  }

  async getWalletBalance(userId: number) {
    return await this.request<{ nx: number }>('GET', `/wallet/balance/${userId}`);
  }

  async getTransactionHistory(userId: number, limit?: number) {
    const url = limit ? `/wallet/transactions/${userId}?limit=${limit}` : `/wallet/transactions/${userId}`;
    return await this.request<any[]>('GET', url);
  }

  async createPayPalOrder(userId: number, packageId: number) {
    return await this.request<{ orderId: string; approveUrl: string }>('POST', '/wallet/create-order', {
      userId,
      packageId
    });
  }

  async capturePayPalOrder(userId: number, orderId: string) {
    return await this.request<{ success: boolean; gcoin: number }>('POST', '/wallet/capture-order', {
      userId,
      orderId
    });
  }

  async confirmPayment(userId: number, packageId: number) {
    return await this.request<{ success: boolean; newBalance: number; coins: number }>('POST', '/wallet/confirm-payment', {
      userId,
      packageId
    });
  }

  async claimLevelReward(username: string, level: number, nxAmount: number) {
    const profile = JSON.parse(localStorage.getItem('profile') || '{}');
    return await this.request<{ success: boolean; message: string }>('POST', '/claim-level-reward', {
      oidUser: profile.id || 0,
      username,
      level,
      nxAmount,
    });
  }

  async getClaimedRewards(username: string) {
    return await this.request<any[]>('GET', `/claimed-rewards/${username}`);
  }

  // Birthday endpoints
  async getBirthdayInfo(username: string) {
    return await this.request<any>('GET', `/birthday/${username}`);
  }

  async registerBirthday(username: string, birthDate: string) {
    return await this.request<{ success: boolean; message: string }>('POST', '/birthday/register', {
      username,
      birthDate,
    });
  }

  async claimBirthdayReward(username: string) {
    return await this.request<{ success: boolean; message: string; nxAmount: number }>('POST', '/birthday/claim', {
      username,
    });
  }

  // Payment endpoints
  async createPaymentRequest(oidUser: number, username: string, NickName: string, nxAmount: number, dollarAmount: number) {
    return await this.request<{ success: boolean; paymentId: number }>('POST', '/payments/request', {
      oidUser,
      username,
      NickName,
      nxAmount,
      dollarAmount,
    });
  }

  async getPendingPayments() {
    return await this.request<any[]>('GET', '/payments/pending');
  }

  async getAllPayments() {
    return await this.request<any[]>('GET', '/payments/all');
  }

  async approvePayment(paymentId: number, adminUsername: string) {
    return await this.request<{ success: boolean; message: string; newBalance: number }>('POST', `/payments/approve/${paymentId}`, {
      adminUsername,
    });
  }

  async getApprovedPaymentsNotRecorded(username: string) {
    return await this.request<any[]>('GET', `/payments/approved-not-recorded/${username}`);
  }

  async rejectPayment(paymentId: number, adminUsername: string, reason?: string) {
    return await this.request<{ success: boolean; message: string }>('POST', `/payments/reject/${paymentId}`, {
      adminUsername,
      reason,
    });
  }

  async uploadPaymentProof(oidUser: number, username: string, NickName: string, nxAmount: number, dollarAmount: number, proofImageBase64: string) {
    return await this.request<{ success: boolean; paymentId: number; message: string }>('POST', '/payments/upload-proof', {
      oidUser,
      username,
      NickName,
      nxAmount,
      dollarAmount,
      proofImageBase64,
    });
  }

  // Nuevo sistema de códigos de pago
  async submitPaymentCode(oidUser: number, username: string, NickName: string, paymentCode: string, nxAmount: number, dollarAmount: number) {
    return await this.request<{ success: boolean; message: string }>('POST', '/payments/submit-payment-code', {
      oidUser,
      username,
      NickName,
      paymentCode,
      nxAmount,
      dollarAmount,
    });
  }

  async getPendingPaymentCodes() {
    // Fetch pending payment codes from /payments/payment-codes/pending
    return await this.request<any[]>('GET', '/payments/payment-codes/pending');
  }

  async getAllPaymentCodes() {
    return await this.request<any[]>('GET', '/payments/payment-codes/all');
  }

  async approvePaymentCode(codeId: number, adminUsername: string) {
    return await this.request<{ success: boolean; message: string }>('POST', `/payments/payment-codes/approve/${codeId}`, {
      adminUsername,
    });
  }

  async rejectPaymentCode(codeId: number, adminUsername: string, reason?: string) {
    return await this.request<{ success: boolean; message: string }>('POST', `/payments/payment-codes/reject/${codeId}`, {
      adminUsername,
      reason,
    });
  }

  // Refund endpoints - DESHABILITADOS
  // Sistema de reembolsos removido por solicitud del usuario
  // La tabla RefundRequests no existe en la base de datos

  // Support endpoints
  async createSupportTicket(oidUser: number, username: string, NickName: string, subject: string, description: string, refundId?: number) {
    return await this.request<{ success: boolean; ticketId: number; ticketNumber: string; message: string }>('POST', '/support/create', {
      oidUser,
      username,
      NickName,
      subject,
      description,
      refundId,
    });
  }

  async getUserTickets(username: string) {
    return await this.request<any[]>('GET', `/support/user/${username}`);
  }

  async getTicketDetails(ticketId: number) {
    return await this.request<{ ticket: any; messages: any[] }>('GET', `/support/ticket/${ticketId}`);
  }

  async sendTicketMessage(ticketId: number, senderType: 'user' | 'admin', senderUsername: string, message: string) {
    return await this.request<{ success: boolean; messageId: number; createdAt: string }>('POST', `/support/message/${ticketId}`, {
      senderType,
      senderUsername,
      message,
    });
  }

  async getAllTickets() {
    return await this.request<any[]>('GET', '/support/admin/all');
  }

  async updateTicketStatus(ticketId: number, status: string, adminUsername?: string) {
    return await this.request<{ success: boolean; message: string }>('PUT', `/support/ticket/${ticketId}/status`, {
      status,
      adminUsername,
    });
  }

  async getRefundedItems() {
    return await this.request<any[]>('GET', '/support/admin/refunded-items');
  }

  // Refund endpoints
  async requestRefund(oidUser: number, username: string, NickName: string, productName: string, nxPaid: number, productId?: number, purchaseLogId?: number) {
    return await this.request<{ success: boolean; refundId: number; message: string; nxToRefund: number }>('POST', '/refund/request-refund', {
      oidUser,
      username,
      NickName,
      productId,
      productName,
      purchaseLogId,
      nxPaid,
    });
  }

  async getPendingRefunds() {
    return await this.request<any[]>('GET', '/refund/pending');
  }

  async approveRefund(refundId: number, adminUsername: string) {
    return await this.request<{ success: boolean; message: string; details: any }>('POST', `/refund/approve/${refundId}`, {
      adminUsername,
    });
  }

  async rejectRefund(refundId: number, adminUsername: string, reason?: string) {
    return await this.request<{ success: boolean; message: string }>('POST', `/refund/reject/${refundId}`, {
      adminUsername,
      reason,
    });
  }

  // Marketplace endpoints
  async createMarketplaceListing(oidUser: number, username: string, NickName: string, itemName: string, itemDescription: string, itemRarity: string, sellingPrice: number, quantity: number, condition: string, imageBase64?: string, purchaseLogId?: number) {
    return await this.request<{ success: boolean; listingId: number; message: string; createdAt: string }>('POST', '/marketplace/create-listing', {
      oidUser,
      username,
      NickName,
      itemName,
      itemDescription,
      itemRarity,
      sellingPrice,
      quantity,
      condition,
      imageBase64,
      purchaseLogId,
    });
  }

  async getMarketplaceListings(page: number = 1, limit: number = 20, search: string = '', rarity: string = '') {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);
    if (rarity) params.append('rarity', rarity);
    return await this.request<any>('GET', `/marketplace/listings?${params.toString()}`);
  }

  async getUserMarketplaceListings(username: string) {
    return await this.request<any[]>('GET', `/marketplace/user/${username}`);
  }

  async getMarketplaceListingDetails(listingId: number) {
    return await this.request<any>('GET', `/marketplace/listing/${listingId}`);
  }

  async purchaseMarketplaceItem(listingId: number, buyerId: number, buyerUsername: string, buyerNickName: string) {
    return await this.request<{ success: boolean; message: string; details: any }>('POST', `/marketplace/purchase/${listingId}`, {
      buyerId,
      buyerUsername,
      buyerNickName,
    });
  }

  async getMarketplaceTransactions(username: string, type: string = 'all') {
    return await this.request<any[]>('GET', `/marketplace/transactions/${username}?type=${type}`);
  }

  async deleteMarketplaceListing(listingId: number, username: string) {
    return await this.request<{ success: boolean; message: string }>('DELETE', `/marketplace/listing/${listingId}`, { username });
  }

  async getMarketplaceStats(username: string) {
    return await this.request<any>('GET', `/marketplace/stats/${username}`);
  }

  async getPurchaseMarketplaceStatus(purchaseLogId: number) {
    return await this.request<any>('GET', `/data/purchase-marketplace-status/${purchaseLogId}`);
  }

  // Get available items for selling (purchases that haven't been refunded or sold)
  async getAvailableItemsForSelling(username: string) {
    return await this.request<any[]>('GET', `/available-items/${username}`);
  }

  logout() {
    this.clearToken();
  }

  // Change password endpoint
  async changePassword(userId: number, currentPassword: string, newPassword: string, confirmPassword: string) {
    return await this.request<{ success: boolean; message: string }>('POST', '/auth-combatarms/change-password', {
      userId,
      currentPassword,
      newPassword,
      confirmPassword,
    });
  }

}

export const api = new ApiClient();
