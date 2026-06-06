// API Service v3 — PayFlow
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('payflow_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error en la solicitud');
  return data;
}

// ── Auth ──────────────────────────────────────────────
export const api = {
  auth: {
    register: (body: object) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: object) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    refresh: (refreshToken: string) => request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
    logout: (refreshToken?: string) => request('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  },
  kyc: {
    me: () => request('/kyc/me'),
    submit: (body: object) => request('/kyc/submit', { method: 'POST', body: JSON.stringify(body) }),
  },
  pin: {
    set: (pin: string) => request('/pin/set', { method: 'POST', body: JSON.stringify({ pin }) }),
  },
  wallet: {
    me: () => request('/wallet/me'),
    qr: (amount?: number, concept?: string) => {
      const params = new URLSearchParams();
      if (amount) params.set('amount', String(amount));
      if (concept) params.set('concept', concept);
      return request(`/wallet/qr?${params}`);
    },
    findByAlias: (alias: string) => request(`/wallet/find/${alias}`),
    contacts: () => request('/wallet/contacts'),
    addContact: (body: object) => request('/wallet/contacts', { method: 'POST', body: JSON.stringify(body) }),
    removeContact: (alias: string) => request(`/wallet/contacts/${alias}`, { method: 'DELETE' }),
  },
  transactions: {
    transfer: (body: object) => request('/transactions/transfer', { method: 'POST', body: JSON.stringify(body) }),
    history: (params?: Record<string, string | number>) => {
      const q = new URLSearchParams(Object.entries(params || {}).map(([k, v]) => [k, String(v)]));
      return request(`/transactions/history?${q}`);
    },
    deposit: (body: object) => request('/transactions/deposit', { method: 'POST', body: JSON.stringify(body) }),
    withdraw: (body: object) => request('/transactions/withdraw', { method: 'POST', body: JSON.stringify(body) }),
    receipt: (id: string) => request(`/transactions/${id}/receipt`),
  },
  notifications: {
    list: (page = 1) => request(`/notifications?page=${page}`),
    markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  },
  paymentRequests: {
    create: (body: object) => request('/payment-requests', { method: 'POST', body: JSON.stringify(body) }),
    received: () => request('/payment-requests/received'),
    sent: () => request('/payment-requests/sent'),
    accept: (id: string) => request(`/payment-requests/${id}/accept`, { method: 'POST' }),
    reject: (id: string) => request(`/payment-requests/${id}/reject`, { method: 'POST' }),
  },
  market: {
    assets: () => request('/market/assets'),
    asset: (id: string) => request(`/market/assets/${id}`),
    trade: (body: object) => request('/market/trade', { method: 'POST', body: JSON.stringify(body) }),
    portfolio: () => request('/market/portfolio'),
  },
  admin: {
    metrics: () => request('/admin/metrics'),
    users: (page = 1) => request(`/admin/users?page=${page}`),
    wallets: (page = 1) => request(`/admin/wallets?page=${page}`),
    blockWallet: (id: string) => request(`/admin/wallets/${id}/block`, { method: 'PATCH' }),
    unblockWallet: (id: string) => request(`/admin/wallets/${id}/unblock`, { method: 'PATCH' }),
    transactions: (page = 1, status?: string) => request(`/admin/transactions?page=${page}${status ? `&status=${status}` : ''}`),
    failedTransactions: () => request('/admin/transactions/failed'),
    auditLogs: (page = 1) => request(`/admin/audit-logs?page=${page}`),
    pendingKyc: () => request('/admin/kyc/pending'),
    approveKyc: (userId: string) => request(`/admin/kyc/${userId}/approve`, { method: 'PATCH' }),
    rejectKyc: (userId: string, reason?: string) => request(`/admin/kyc/${userId}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
    kycVerifications: (status?: string) => request(`/admin/kyc/verifications${status ? `?status=${status}` : ''}`),
    approveKycVerif: (id: string) => request(`/admin/kyc/verifications/${id}/approve`, { method: 'PATCH' }),
    rejectKycVerif: (id: string, reason: string) => request(`/admin/kyc/verifications/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
    verifyLedger: () => request('/admin/ledger/verify'),
    marketAssets: () => request('/admin/market/assets'),
    createAsset: (body: object) => request('/admin/market/assets', { method: 'POST', body: JSON.stringify(body) }),
    updateAsset: (id: string, body: object) => request(`/admin/market/assets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
};
