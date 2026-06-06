import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';

export default function DepositPage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError('Ingresá un monto válido'); return; }
    setError('');
    setLoading(true);
    try {
      await api.transactions.deposit({ amount: Number(amount), concept: concept || 'Carga de saldo' });
      setSuccess(true);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (success) return (
    <Layout>
      <div className="max-w-sm mx-auto text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900">¡Saldo acreditado!</h2>
        <p className="text-gray-500 text-sm mt-2">${Number(amount).toLocaleString('es-AR')} fueron añadidos a tu cuenta.</p>
        <p className="text-xs text-gray-400 mt-1">⚠️ Dinero ficticio — proyecto académico</p>
        <button onClick={() => navigate('/dashboard')} className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">Ir al inicio</button>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-sm mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Cargar saldo</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-5">
          ⚠️ Carga de saldo ficticio. No involucra dinero real.
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto a cargar</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1" step="0.01"
                className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto (opcional)</label>
            <input type="text" value={concept} onChange={e => setConcept(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Carga de saldo" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
            {loading ? 'Acreditando...' : 'Acreditar saldo'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
