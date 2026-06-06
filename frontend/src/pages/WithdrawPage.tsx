import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';

export default function WithdrawPage() {
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
      await api.transactions.withdraw({ amount: Number(amount), concept: concept || 'Retiro de saldo' });
      setSuccess(true);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (success) return (
    <Layout>
      <div className="max-w-sm mx-auto text-center py-12">
        <div className="text-6xl mb-4">📤</div>
        <h2 className="text-xl font-bold text-gray-900">Retiro realizado</h2>
        <p className="text-gray-500 text-sm mt-2">${Number(amount).toLocaleString('es-AR')} fueron retirados de tu cuenta.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">Ir al inicio</button>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-sm mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Retirar saldo</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto a retirar</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1" step="0.01"
                className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto (opcional)</label>
            <input type="text" value={concept} onChange={e => setConcept(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Retiro de saldo" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50">
            {loading ? 'Procesando...' : 'Retirar saldo'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
