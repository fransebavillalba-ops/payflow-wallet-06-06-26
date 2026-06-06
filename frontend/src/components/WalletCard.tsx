import { useState, useCallback } from 'react';
import { Wallet } from '../types';

interface Props { wallet: Wallet; kycStatus?: string; }

const statusLabel: Record<string, { label: string; color: string }> = {
  ACTIVE:      { label: 'Activa',         color: 'bg-emerald-100 text-emerald-800' },
  PENDING_KYC: { label: 'Pendiente KYC',  color: 'bg-amber-100 text-amber-800' },
  BLOCKED:     { label: 'Bloqueada',      color: 'bg-red-100 text-red-800' },
  SUSPENDED:   { label: 'Suspendida',     color: 'bg-orange-100 text-orange-800' },
  CLOSED:      { label: 'Cerrada',        color: 'bg-gray-200 text-gray-600' },
};

const kycLabel: Record<string, { label: string; icon: string }> = {
  PENDING:  { label: 'Verificación pendiente', icon: '⏳' },
  APPROVED: { label: 'Identidad verificada',   icon: '✓' },
  REJECTED: { label: 'Verificación rechazada', icon: '✗' },
  NOT_STARTED: { label: 'Sin verificar',       icon: '○' },
};

type CopyTarget = 'alias' | 'cvu' | null;

export default function WalletCard({ wallet, kycStatus }: Props) {
  const [copied, setCopied] = useState<CopyTarget>(null);
  const st = statusLabel[wallet.status] || statusLabel.ACTIVE;

  const copyToClipboard = useCallback(async (text: string, target: CopyTarget) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(target);
      setTimeout(() => setCopied(null), 2000);
    }
  }, []);

  return (
    <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200/40 select-none">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest">PayFlow</p>
          <p className="text-white font-semibold text-sm mt-0.5">{wallet.owner}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.color}`}>
          {st.label}
        </span>
      </div>

      {/* Balance */}
      <div className="mb-6">
        <p className="text-indigo-200 text-xs mb-1">Saldo disponible</p>
        <p className="text-4xl font-bold tracking-tight">
          ${wallet.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-indigo-200 text-xs mt-1">ARS</p>
      </div>

      {/* Alias + CVU with copy buttons */}
      <div className="border-t border-white/20 pt-4 space-y-3">
        {/* Alias row */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-indigo-200 text-xs mb-0.5">Alias</p>
            <p className="text-sm font-mono font-medium truncate">{wallet.alias}</p>
          </div>
          <button
            onClick={() => copyToClipboard(wallet.alias, 'alias')}
            className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${
              copied === 'alias'
                ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            }`}
            title="Copiar alias"
          >
            {copied === 'alias' ? (
              <><span>✓</span><span>Copiado</span></>
            ) : (
              <><span>⧉</span><span>Copiar</span></>
            )}
          </button>
        </div>

        {/* CVU row */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-indigo-200 text-xs mb-0.5">CVU</p>
            <p className="text-xs font-mono truncate">{wallet.cvu}</p>
          </div>
          <button
            onClick={() => copyToClipboard(wallet.cvu, 'cvu')}
            className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${
              copied === 'cvu'
                ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            }`}
            title="Copiar CVU"
          >
            {copied === 'cvu' ? (
              <><span>✓</span><span>Copiado</span></>
            ) : (
              <><span>⧉</span><span>Copiar</span></>
            )}
          </button>
        </div>
      </div>

      {/* KYC badge */}
      {kycStatus && kycStatus !== 'APPROVED' && (
        <div className="mt-4 pt-3 border-t border-white/20">
          <p className="text-xs text-indigo-200">
            {kycLabel[kycStatus]?.icon} {kycLabel[kycStatus]?.label || kycStatus}
          </p>
        </div>
      )}
    </div>
  );
}
