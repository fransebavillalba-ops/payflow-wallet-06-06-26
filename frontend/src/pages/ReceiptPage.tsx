import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';

export default function ReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.transactions.receipt(id)
      .then((r: any) => setReceipt(r.data))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Layout><div className="text-center py-12 text-gray-400">Cargando comprobante...</div></Layout>;
  if (error) return <Layout><div className="text-center py-12 text-red-500">{error}</div></Layout>;

  const statusColor: Record<string, string> = { SUCCESS: 'text-emerald-600', FAILED: 'text-red-500', PENDING: 'text-amber-500' };

  return (
    <Layout>
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">{receipt.estado === 'SUCCESS' ? '✅' : receipt.estado === 'FAILED' ? '❌' : '⏳'}</div>
            <h1 className="text-lg font-bold text-gray-900">Comprobante de operación</h1>
            <p className={`text-sm font-semibold mt-1 ${statusColor[receipt.estado] || 'text-gray-500'}`}>{receipt.estado}</p>
          </div>

          <div className="space-y-3 text-sm">
            {[
              ['Operación', receipt.tipo],
              ['Fecha y hora', new Date(receipt.fechaHora).toLocaleString('es-AR')],
              ['De', receipt.aliasOrigen],
              ['Para', receipt.aliasDestino],
              ['CVU destino', receipt.cvuDestino],
              ['Concepto', receipt.concepto],
              ['Monto', `$${Number(receipt.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-right break-all text-xs">{value}</span>
              </div>
            ))}
          </div>

          {receipt.hash && (
            <div className="mt-5 bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">🔐 Hash LedgerBlock #{receipt.blockNumber}</p>
              <p className="text-xs font-mono text-gray-700 break-all">{receipt.hash}</p>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col gap-2">
            <p className="text-xs text-center text-gray-400">ID: {id}</p>
            <button onClick={() => navigate(-1)} className="w-full border border-gray-200 text-gray-700 font-medium py-3 rounded-xl text-sm hover:bg-gray-50">
              ← Volver
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
