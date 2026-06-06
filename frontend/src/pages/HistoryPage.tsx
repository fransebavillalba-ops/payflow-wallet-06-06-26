import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import TransactionItem from '../components/TransactionItem';
import { api } from '../services/api';
import { Transaction } from '../types';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: p, limit: 20 };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res: any = await api.transactions.history(params);
      setTxs(res.data?.transactions || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
      setPage(p);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  return (
    <Layout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Historial</h1>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Filtrar por fecha</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Desde</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">Hasta</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <button onClick={() => load(1)} className="w-full bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
            Aplicar filtros
          </button>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : txs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-4xl mb-2">📋</p>
              <p className="text-gray-400 text-sm">No hay operaciones.</p>
            </div>
          ) : (
            txs.map(tx => <TransactionItem key={tx.id} tx={tx} onClick={() => navigate(`/receipt/${tx.id}`)} />)
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button disabled={page === 1} onClick={() => load(page - 1)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
            <span className="px-4 py-2 text-sm text-gray-600">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => load(page + 1)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50">Siguiente →</button>
          </div>
        )}
      </div>
    </Layout>
  );
}
