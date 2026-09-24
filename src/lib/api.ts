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
    return await this.request<{ success: boolean; newBalance: number; nx: number }>('POST', '/wallet/claim-level-reward', {
      username,
      level,
      nxAmount,
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

  // Refund endpoints
  async getItemDetails(oidUser: number, inventorySeqNo: number) {
    return await this.request<any>('GET', `/refund/item/${oidUser}/${inventorySeqNo}`);
  }

  async processRefund(oidUser: number, username: string, inventorySeqNo: number, nxAmount: number, adminUsername: string, reason?: string) {
    return await this.request<{ success: boolean; message: string; newBalance: number; itemRemoved: any }>('POST', '/refund/process', {
      oidUser,
      username,
      inventorySeqNo,
      nxAmount,
      adminUsername,
      reason,
    });
  }

  async removeItem(oidUser: number, inventorySeqNo: number, adminUsername: string, reason?: string) {
    return await this.request<{ success: boolean; message: string; itemRemoved: any }>('POST', '/refund/remove-item', {
      oidUser,
      inventorySeqNo,
      adminUsername,
      reason,
    });
  }

  // Refund request endpoints (new system with commission)
  async requestRefund(oidUser: number, username: string, NickName: string, productId: number, productName: string, purchaseLogId: number, nxPaid: number) {
    return await this.request<{ success: boolean; refundId: number; message: string; details: any }>('POST', '/refund/request-refund', {
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

  async getAllRefunds() {
    return await this.request<any[]>('GET', '/refund/all');
  }

  async approveRefund(refundId: number, adminUsername: string) {
    return await this.request<{ success: boolean; message: string; details: any }>('POST', `/refund/approve/${refundId}`, {
      adminUsername,
    });
  }

  async rejectRefund(refundId: number, adminUsername: string, rejectedReason?: string) {
    return await this.request<{ success: boolean; message: string }>('POST', `/refund/reject/${refundId}`, {
      adminUsername,
      rejectedReason,
    });
  }

  async findInventoryItem(oidUser: number, productId: number) {
    return await this.request<any>('GET', `/refund/find-item/${oidUser}/${productId}`);
  }

  async getWeeklyRefundCount(username: string) {
    return await this.request<{ used: number; remaining: number; limit: number; mondayOfWeek: string }>('GET', `/refund/weekly-count/${username}`);
  }

  async getTotalRefunded(username: string) {
    return await this.request<{ totalRefunds: number; totalNXRefunded: number; totalCommission: number; totalNXPaid: number }>('GET', `/refund/total-refunded/${username}`);
  }

  async getRefundDetails(username: string) {
    return await this.request<any[]>('GET', `/refund/refund-details/${username}`);
  }

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
}

export const api = new ApiClient();
