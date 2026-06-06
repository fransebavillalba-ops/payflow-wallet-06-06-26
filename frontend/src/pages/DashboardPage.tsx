import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import WalletCard from '../components/WalletCard';
import TransactionItem from '../components/TransactionItem';
import Layout from '../components/Layout';
import { Wallet, Transaction } from '../types';

const QUICK = [
  { to: '/transfer',  icon: '💸', label: 'Enviar' },
  { to: '/receive',   icon: '📲', label: 'Recibir' },
  { to: '/qr',        icon: '⬛', label: 'Mi QR' },
  { to: '/deposit',   icon: '➕', label: 'Cargar' },
  { to: '/withdraw',  icon: '➖', label: 'Retirar' },
  { to: '/history',   icon: '📋', label: 'Historial' },
  { to: '/contacts',  icon: '👥', label: 'Contactos' },
  { to: '/market',    icon: '📈', label: 'Mercado' },
];

const kycInfo: Record<string, { color: string; icon: string; text: string; action?: { to: string; label: string } }> = {
  PENDING:     { color: 'bg-amber-50 border-amber-200',  icon: '⏳', text: 'Tu verificación de identidad está siendo revisada.',         action: undefined },
  REJECTED:    { color: 'bg-red-50 border-red-200',      icon: '⚠️', text: 'Tu verificación fue rechazada. Podés iniciar una nueva.', action: { to: '/kyc', label: 'Nueva verificación' } },
  NOT_STARTED: { color: 'bg-blue-50 border-blue-200',    icon: '🔒', text: 'Verificá tu identidad para activar tu cuenta.',              action: { to: '/kyc', label: 'Verificar identidad' } },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs,    setTxs]    = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.wallet.me(), api.transactions.history({ limit: 5 })])
      .then(([w, h]: any) => {
        setWallet(w.data);
        setTxs(h.data?.transactions || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const walletActive = wallet?.status === 'ACTIVE';
  const kycStatus    = user?.kycStatus || 'NOT_STARTED';
  const needsKyc     = kycStatus !== 'APPROVED';
  const kyc          = kycInfo[kycStatus];

  if (loading) return (
    <Layout>
      <div className="space-y-4 animate-pulse">
        <div className="h-52 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-6">

        {/* KYC Banner */}
        {needsKyc && kyc && (
          <div className={`border rounded-2xl p-4 flex items-center gap-3 ${kyc.color}`}>
            <span className="text-2xl flex-shrink-0">{kyc.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">Verificación de identidad</p>
              <p className="text-xs text-gray-600 mt-0.5">{kyc.text}</p>
            </div>
            {kyc.action && (
              <Link to={kyc.action.to}
                className="flex-shrink-0 bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
                {kyc.action.label}
              </Link>
            )}
          </div>
        )}

        {/* Wallet Card */}
        {wallet && <WalletCard wallet={wallet} kycStatus={kycStatus} />}

        {/* Wallet restricted message */}
        {!walletActive && wallet && wallet.status !== 'PENDING_KYC' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <p className="font-semibold">Cuenta {wallet.status === 'BLOCKED' ? 'bloqueada' : wallet.status.toLowerCase()}</p>
            <p className="text-xs mt-0.5 text-red-600">Para más información, contactá al soporte de PayFlow.</p>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Operaciones</h3>
          <div className="grid grid-cols-4 gap-3">
            {QUICK.map(({ to, icon, label }) => {
              const blocked = !walletActive && !['/receive', '/qr', '/history', '/contacts'].includes(to);
              return (
                <button key={to}
                  onClick={() => !blocked && navigate(to)}
                  disabled={blocked}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                    blocked
                      ? 'bg-gray-50 border-gray-100 opacity-40 cursor-not-allowed'
                      : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-sm cursor-pointer active:scale-95'
                  }`}
                >
                  <span className="text-2xl">{icon}</span>
                  <span className="text-xs font-medium text-gray-700">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Últimas operaciones</h3>
            <Link to="/history" className="text-xs text-indigo-600 font-semibold hover:underline">Ver todas</Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {txs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-gray-400 text-sm">Aún no tenés operaciones.</p>
              </div>
            ) : (
              txs.map(tx => (
                <TransactionItem key={tx.id} tx={tx} onClick={() => navigate(`/receipt/${tx.id}`)} />
              ))
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-2">
          PayFlow — Plataforma de pagos digitales
        </p>
      </div>
    </Layout>
  );
}
