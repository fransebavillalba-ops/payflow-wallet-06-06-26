import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const navigate    = useNavigate();
  const [tab, setTab]   = useState<'metrics' | 'users' | 'wallets' | 'txs' | 'kyc' | 'ledger' | 'audit'>('metrics');
  const [metrics, setMetrics]   = useState<any>(null);
  const [users,   setUsers]     = useState<any[]>([]);
  const [wallets, setWallets]   = useState<any[]>([]);
  const [txs,     setTxs]       = useState<any[]>([]);
  const [kycList, setKycList]   = useState<any[]>([]);
  const [kycFilter, setKycFilter] = useState('');
  const [ledger,  setLedger]    = useState<any>(null);
  const [audit,   setAudit]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [msg,     setMsg]       = useState('');
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { if (!isAdmin) navigate('/dashboard'); }, [isAdmin]);

  const loadMetrics = async () => { const r: any = await api.admin.metrics();               setMetrics(r.data); };
  const loadUsers   = async () => { const r: any = await api.admin.users();                 setUsers(r.data?.users || []); };
  const loadWallets = async () => { const r: any = await api.admin.wallets();               setWallets(r.data?.wallets || []); };
  const loadTxs     = async () => { const r: any = await api.admin.transactions();          setTxs(r.data?.transactions || []); };
  const loadKyc     = async (f?: string) => { const r: any = await api.admin.kycVerifications(f || kycFilter || undefined); setKycList(r.data || []); };
  const loadLedger  = async () => { const r: any = await api.admin.verifyLedger();          setLedger(r.data); };
  const loadAudit   = async () => { const r: any = await api.admin.auditLogs();             setAudit(r.data?.logs || []); };

  const loaders: Record<string, () => Promise<void>> = {
    metrics: loadMetrics, users: loadUsers, wallets: loadWallets,
    txs: loadTxs, kyc: loadKyc, ledger: loadLedger, audit: loadAudit,
  };

  useEffect(() => {
    setLoading(true);
    loaders[tab]().catch(console.error).finally(() => setLoading(false));
  }, [tab]);

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const doAction = async (fn: () => Promise<any>, reload: () => Promise<void>, ok: string) => {
    try { await fn(); notify(ok); await reload(); } catch (e: any) { notify(`Error: ${e.message}`); }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    try {
      await api.admin.rejectKycVerif(rejectModal.id, rejectReason.trim());
      notify(`Verificación de ${rejectModal.name} rechazada`);
      setRejectModal(null);
      setRejectReason('');
      await loadKyc();
    } catch (e: any) { notify(`Error: ${e.message}`); }
  };

  const TABS = [
    { key: 'metrics', label: '📊 Métricas'       },
    { key: 'users',   label: '👥 Usuarios'       },
    { key: 'wallets', label: '💳 Wallets'        },
    { key: 'txs',     label: '💸 Transacciones'  },
    { key: 'kyc',     label: '🪪 KYC'            },
    { key: 'ledger',  label: '🔐 Ledger'         },
    { key: 'audit',   label: '📝 Auditoría'      },
  ];

  const kycStatusColor: Record<string, string> = {
    PENDING:  'bg-amber-100 text-amber-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-red-100 text-red-800',
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
        </div>

        {msg && (
          <div className={`text-sm p-3 rounded-xl border ${msg.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
            {msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-xl transition-colors whitespace-nowrap ${tab === t.key ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-10 text-gray-400">Cargando...</div>}

        {/* METRICS */}
        {tab === 'metrics' && metrics && !loading && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Usuarios',         metrics.totalUsers,        '👥'],
                ['Wallets activas',  metrics.activeWallets,     '✅'],
                ['Wallets bloqueadas', metrics.blockedWallets,  '🚫'],
                ['Transacciones',    metrics.totalTransactions,  '💸'],
                ['Exitosas',         metrics.successCount,       '✅'],
                ['Fallidas',         metrics.failedCount,        '❌'],
                ['KYC pendiente',    metrics.pendingKyc,         '⏳'],
                ['Bloques ledger',   metrics.ledgerStatus?.totalBlocks, '🔐'],
              ].map(([label, value, icon]) => (
                <div key={String(label)} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <p className="text-2xl">{icon}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Volumen total operado</p>
              <p className="text-2xl font-bold text-gray-900">${Number(metrics.totalVolume || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
              <div className={`mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${metrics.ledgerStatus?.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {metrics.ledgerStatus?.valid ? '🔐 Ledger íntegro' : '⚠️ Verificar ledger'}
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && !loading && (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    <div className="flex gap-2 mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.kycStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : u.kycStatus === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{u.kycStatus}</span>
                    </div>
                  </div>
                  {u.wallet && <p className="text-sm font-semibold text-gray-700">${Number(u.wallet.balance).toLocaleString('es-AR')}</p>}
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-center text-gray-400 py-8">No hay usuarios.</p>}
          </div>
        )}

        {/* WALLETS */}
        {tab === 'wallets' && !loading && (
          <div className="space-y-2">
            {wallets.map(w => (
              <div key={w.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-gray-900 truncate">{w.alias}</p>
                    <p className="text-xs text-gray-500">{w.user?.name} · {w.user?.email}</p>
                    <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${w.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : w.status === 'BLOCKED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{w.status}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3 space-y-1">
                    <p className="font-bold text-gray-900 text-sm">${Number(w.balance).toLocaleString('es-AR')}</p>
                    {w.status === 'ACTIVE'   && <button onClick={() => doAction(() => api.admin.blockWallet(w.id), loadWallets, 'Wallet bloqueada')} className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-200 block w-full">Bloquear</button>}
                    {w.status === 'BLOCKED'  && <button onClick={() => doAction(() => api.admin.unblockWallet(w.id), loadWallets, 'Wallet desbloqueada')} className="text-xs bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded-lg hover:bg-emerald-200 block w-full">Desbloquear</button>}
                  </div>
                </div>
              </div>
            ))}
            {wallets.length === 0 && <p className="text-center text-gray-400 py-8">No hay wallets.</p>}
          </div>
        )}

        {/* TRANSACTIONS */}
        {tab === 'txs' && !loading && (
          <div className="space-y-2">
            {txs.slice(0, 50).map(tx => (
              <div key={tx.id} className="bg-white rounded-2xl border border-gray-100 p-3">
                <div className="flex justify-between items-start text-xs gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{tx.sender?.alias} → {tx.receiver?.alias}</p>
                    <p className="text-gray-500 truncate">{tx.concept}</p>
                    <p className="text-gray-400">{new Date(tx.createdAt).toLocaleString('es-AR')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold">${Number(tx.amount).toLocaleString('es-AR')}</p>
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${tx.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : tx.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{tx.status}</span>
                  </div>
                </div>
              </div>
            ))}
            {txs.length === 0 && <p className="text-center text-gray-400 py-8">No hay transacciones.</p>}
          </div>
        )}

        {/* KYC VERIFICATIONS */}
        {tab === 'kyc' && !loading && (
          <div className="space-y-3">
            {/* Filter */}
            <div className="flex gap-2">
              {['', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
                <button key={f} onClick={() => { setKycFilter(f); setLoading(true); loadKyc(f).finally(() => setLoading(false)); }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${kycFilter === f ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600'}`}>
                  {f === '' ? 'Todas' : f}
                </button>
              ))}
            </div>

            {kycList.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-gray-400 text-sm">No hay verificaciones {kycFilter || 'registradas'}.</p>
              </div>
            ) : kycList.map((k: any) => (
              <div key={k.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{k.fullName || k.user?.name}</p>
                    <p className="text-xs text-gray-500">{k.user?.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {k.documentType} ·{' '}
                      {k.documentNumber ? k.documentNumber.replace(/(\d{3})(\d+)(\d{3})/, '$1···$3') : '—'}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(k.createdAt).toLocaleString('es-AR')}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${kycStatusColor[k.status] || 'bg-gray-100 text-gray-600'}`}>{k.status}</span>
                </div>

                {k.rejectionReason && (
                  <div className="bg-red-50 text-red-700 text-xs p-2 rounded-xl">
                    Motivo: {k.rejectionReason}
                  </div>
                )}

                {k.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => doAction(() => api.admin.approveKycVerif(k.id), loadKyc, `Verificación aprobada para ${k.user?.name}`)}
                      className="flex-1 bg-emerald-600 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-emerald-700 transition-colors">
                      ✓ Aprobar
                    </button>
                    <button
                      onClick={() => { setRejectModal({ id: k.id, name: k.user?.name }); setRejectReason(''); }}
                      className="flex-1 bg-red-500 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-red-600 transition-colors">
                      ✕ Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* LEDGER */}
        {tab === 'ledger' && !loading && ledger && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Integridad del Ledger SHA-256</h3>
            <div className={`rounded-2xl p-5 flex items-center gap-4 ${ledger.valid ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <span className="text-4xl">{ledger.valid ? '🔐' : '⚠️'}</span>
              <div>
                <p className={`font-bold text-base ${ledger.valid ? 'text-emerald-800' : 'text-red-800'}`}>
                  {ledger.message || (ledger.valid ? 'Ledger verificado correctamente' : 'Integridad comprometida')}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {ledger.totalBlocks} bloque{ledger.totalBlocks !== 1 ? 's' : ''} en la cadena
                  {!ledger.valid && ` · Error en bloque #${ledger.brokenAt}`}
                </p>
              </div>
            </div>
            <button onClick={() => { setLoading(true); loadLedger().finally(() => setLoading(false)); }}
              className="w-full border border-gray-200 text-gray-700 font-medium py-3 rounded-xl text-sm hover:bg-gray-50">
              🔄 Reverificar cadena
            </button>
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
              <p className="font-medium text-gray-700 mb-1">¿Cómo funciona?</p>
              <p>Cada transacción exitosa genera un bloque con hash SHA-256 que incluye el hash del bloque anterior. Si se modifica cualquier dato, el hash no coincide y la cadena queda rota.</p>
            </div>
          </div>
        )}
        {tab === 'ledger' && !loading && !ledger && (
          <div className="text-center py-10 text-gray-400">No hay datos del ledger disponibles.</div>
        )}

        {/* AUDIT */}
        {tab === 'audit' && !loading && (
          <div className="space-y-2">
            {audit.slice(0, 50).map((log: any) => (
              <div key={log.id} className="bg-white rounded-2xl border border-gray-100 p-3">
                <div className="flex justify-between items-start text-xs gap-2">
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-indigo-700">{log.action}</p>
                    <p className="text-gray-500">{log.user?.name}</p>
                    <p className="text-gray-400 font-mono truncate">{JSON.stringify(log.metadata)}</p>
                  </div>
                  <p className="text-gray-400 flex-shrink-0">{new Date(log.createdAt).toLocaleString('es-AR')}</p>
                </div>
              </div>
            ))}
            {audit.length === 0 && <p className="text-center text-gray-400 py-8">No hay registros de auditoría.</p>}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-gray-900">Rechazar verificación</h3>
            <p className="text-sm text-gray-500">Indicá el motivo del rechazo para <strong>{rejectModal.name}</strong>. El usuario recibirá esta información.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm h-24 focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Ej: El documento no es legible, los datos no coinciden..."
            />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleReject} disabled={!rejectReason.trim()}
                className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-xl hover:bg-red-600 disabled:opacity-50">
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
