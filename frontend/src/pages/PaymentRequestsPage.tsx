import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { PaymentRequest } from '../types';

export default function PaymentRequestsPage() {
  const [tab, setTab] = useState<'received' | 'sent' | 'new'>('received');
  const [received, setReceived] = useState<PaymentRequest[]>([]);
  const [sent, setSent] = useState<PaymentRequest[]>([]);
  const [form, setForm] = useState({ payerAlias: '', amount: '', concept: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [r, s]: any = await Promise.all([api.paymentRequests.received(), api.paymentRequests.sent()]);
      setReceived(r.data || []);
      setSent(s.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createRequest = async () => {
    setError(''); setSuccess('');
    if (!form.payerAlias || !form.amount || Number(form.amount) <= 0) { setError('Completá todos los campos'); return; }
    try {
      await api.paymentRequests.create({ payerAlias: form.payerAlias, amount: Number(form.amount), concept: form.concept });
      setSuccess('Solicitud enviada!');
      setForm({ payerAlias: '', amount: '', concept: '' });
      await load();
    } catch (e: any) { setError(e.message); }
  };

  const accept = async (id: string) => {
    try { await api.paymentRequests.accept(id); setSuccess('Pago realizado!'); await load(); }
    catch (e: any) { setError(e.message); }
  };

  const reject = async (id: string) => {
    await api.paymentRequests.reject(id); await load();
  };

  const statusColor: Record<string, string> = { PENDING: 'bg-amber-100 text-amber-700', ACCEPTED: 'bg-emerald-100 text-emerald-700', REJECTED: 'bg-red-100 text-red-700', EXPIRED: 'bg-gray-100 text-gray-600' };

  return (
    <Layout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Solicitudes de pago</h1>

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
        {success && <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded-xl">{success}</div>}

        <div className="flex gap-2">
          {[['received', '📥 Recibidas'], ['sent', '📤 Enviadas'], ['new', '➕ Nueva']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`flex-1 text-xs font-semibold py-2.5 rounded-xl transition-colors ${tab === key ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'received' && (
          <div className="space-y-3">
            {loading ? <div className="text-center py-6 text-gray-400">Cargando...</div>
            : received.length === 0 ? <div className="text-center py-8"><p className="text-3xl mb-2">📥</p><p className="text-gray-400 text-sm">No tenés solicitudes recibidas.</p></div>
            : received.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">${Number(r.amount).toLocaleString('es-AR')}</p>
                    <p className="text-xs text-gray-500">{r.concept}</p>
                    <p className="text-xs text-gray-400">De: {r.requesterWallet?.user?.name} · {r.requesterWallet?.alias}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[r.status]}`}>{r.status}</span>
                </div>
                {r.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button onClick={() => accept(r.id)} className="flex-1 bg-emerald-600 text-white text-xs font-semibold py-2 rounded-xl hover:bg-emerald-700">✓ Pagar</button>
                    <button onClick={() => reject(r.id)} className="flex-1 border border-red-200 text-red-600 text-xs font-semibold py-2 rounded-xl hover:bg-red-50">✕ Rechazar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'sent' && (
          <div className="space-y-3">
            {loading ? <div className="text-center py-6 text-gray-400">Cargando...</div>
            : sent.length === 0 ? <div className="text-center py-8"><p className="text-3xl mb-2">📤</p><p className="text-gray-400 text-sm">No enviaste ninguna solicitud.</p></div>
            : sent.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">${Number(s.amount).toLocaleString('es-AR')}</p>
                    <p className="text-xs text-gray-500">{s.concept}</p>
                    <p className="text-xs text-gray-400">A: {s.payerWallet?.user?.name}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[s.status]}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'new' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm">Nueva solicitud de pago</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Alias del pagador</label>
              <input type="text" value={form.payerAlias} onChange={e => setForm(f => ({ ...f, payerAlias: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="nombre.apellido.1234" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monto</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="1"
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Concepto</label>
              <input type="text" value={form.concept} onChange={e => setForm(f => ({ ...f, concept: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Motivo del cobro" />
            </div>
            <button onClick={createRequest} className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700">
              Enviar solicitud
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
