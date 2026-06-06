// Tipos globales PayFlow v3

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  kycStatus: 'PENDING' | 'REVIEW' | 'APPROVED' | 'REJECTED';
  wallet?: WalletSummary | null;
}

export interface WalletSummary {
  id: string;
  alias: string;
  cvu: string;
  balance: number;
  status: 'PENDING_KYC' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'CLOSED';
}

export interface Wallet extends WalletSummary {
  owner: string;
  email: string;
  role: string;
  kycStatus: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  amount: number;
  concept: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  type: 'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL' | 'MARKET_BUY' | 'MARKET_SELL';
  direction?: 'SENT' | 'RECEIVED';
  senderAlias?: string;
  receiverAlias?: string;
  senderName?: string;
  receiverName?: string;
  failureReason?: string;
  ledgerBlock?: { currentHash: string; blockNumber: number } | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  category: 'ETF_INDEX' | 'CRYPTO' | 'COMMODITY';
  currentPrice: number;
  priceHistory: { date: string; price: number }[];
  isActive: boolean;
}

export interface PortfolioHolding {
  assetId: string;
  symbol: string;
  name: string;
  category: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
}

export interface PaymentRequest {
  id: string;
  amount: number;
  concept: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  requesterWallet?: { alias: string; user: { name: string } };
  payerWallet?: { alias: string; user: { name: string } };
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User, refreshToken?: string) => void;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}
