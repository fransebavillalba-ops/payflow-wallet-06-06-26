import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { MarketAsset, PortfolioHolding } from '../types';

const categoryLabel: Record<string, string> = { ETF_INDEX: 'ETF', CRYPTO: 'Cripto', COMMODITY: 'Commodity' };
const categoryColor: Record<string, string> = { ETF_INDEX: 'bg-blue-100 text-blue-700', CRYPTO: 'bg-purple-100 text-purple-700', COMMODITY: 'bg-amber-100 text-amber-700' };

export default function MarketPage() {
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([]);
  const [selected, setSelected] = useState<MarketAsset | null>(null);
  const [op, setOp] = useState<'BUY' | 'SELL'>('BUY');
  const [qty, setQty] = useState('');
  const [loading, setLoading] = useState(true);
  const [trading, setTrading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<'market' | 'portfolio'>('market');

  useEffect(() => {
    Promise.all([api.market.assets(), api.market.portfolio()])
      .then(([a, p]: any) => {
        setAssets(a.data || []);
        setPortfolio(p.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleTrade = async () => {
    if (!selected || !qty || Number(qty) <= 0) { setError('Ingresá una cantidad válida'); return; }
    setError(''); setSuccess(''); setTrading(true);
    try {
      await api.market.trade({ assetId: selected.id, operationType: op, quantity: Number(qty) });
      const total = (Number(qty) * selected.currentPrice).toLocaleString('es-AR', { minimumFractionDigits: 2 });
      setSuccess(`${op === 'BUY' ? 'Compra' : 'Venta'} de ${qty} ${selected.symbol} por $${total} realizada. ⚠️ Ficticio.`);
      setQty('');
      // Refresh portfolio
      const p: any = await api.market.portfolio();
      setPortfolio(p.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setTrading(false); }
  };

  const totalValue = portfolio.reduce((s, h) => s + h.currentValue, 0);
  const totalPnl = portfolio.reduce((s, h) => s + h.pnl, 0);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Mercado Simulado</h1>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">⚠️ Ficticio</span>
        </div>

        <div className="flex gap-2">
          {['market', 'portfolio'].map(t => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600'}`}>
              {t === 'market' ? '📈 Activos' : '💼 Mi Portafolio'}
            </button>
          ))}
        </div>

        {tab === 'market' && (
          <div className="space-y-3">
            {loading ? <div className="text-center py-8 text-gray-400">Cargando...</div> : assets.map(a => (
              <button key={a.id} onClick={() => { setSelected(a); setError(''); setSuccess(''); }}
                className={`w-full bg-white rounded-2xl border p-4 text-left transition-all ${selected?.id === a.id ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-100 hover:border-gray-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{a.symbol}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor[a.category]}`}>{categoryLabel[a.category]}</span>
                    </div>
                    <p className="text-xs text-gray-500">{a.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${Number(a.currentPrice).toLocaleString('es-AR')}</p>
                    <p className="text-xs text-gray-400">ARS</p>
                  </div>
                </div>
              </button>
            ))}

            {selected && (
              <div className="bg-white rounded-2xl border border-indigo-200 p-5 space-y-4">
                <h3 className="font-semibold text-gray-900">Operar: {selected.symbol}</h3>
                {error && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl">{error}</div>}
                {success && <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-xl">{success}</div>}
                <div className="flex gap-2">
                  {(['BUY', 'SELL'] as const).map(o => (
                    <button key={o} onClick={() => setOp(o)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${op === o ? (o === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white') : 'border border-gray-200 text-gray-600'}`}>
                      {o === 'BUY' ? '📈 Comprar' : '📉 Vender'}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                  <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0.00001" step="0.00001"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.001" />
                  {qty && Number(qty) > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Total estimado: ${(Number(qty) * selected.currentPrice).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <button onClick={handleTrade} disabled={trading}
                  className={`w-full font-semibold py-3 rounded-xl disabled:opacity-50 transition-colors ${op === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
                  {trading ? 'Procesando...' : `${op === 'BUY' ? 'Comprar' : 'Vender'} ${selected.symbol}`}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'portfolio' && (
          <div className="space-y-3">
            {portfolio.length > 0 && (
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 text-white">
                <p className="text-xs text-indigo-200">Valor total del portafolio</p>
                <p className="text-2xl font-bold">${totalValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                <p className={`text-xs mt-1 ${totalPnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {totalPnl >= 0 ? '▲' : '▼'} ${Math.abs(totalPnl).toLocaleString('es-AR', { minimumFractionDigits: 2 })} PnL
                </p>
              </div>
            )}
            {portfolio.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">💼</p>
                <p className="text-gray-400 text-sm">No tenés activos en el portafolio.</p>
                <button onClick={() => setTab('market')} className="mt-3 text-indigo-600 text-sm font-medium">Ir al mercado →</button>
              </div>
            ) : portfolio.map(h => (
              <div key={h.assetId} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">{h.symbol}</p>
                    <p className="text-xs text-gray-500">{h.quantity} unidades · Precio prom. ${Number(h.avgPrice).toLocaleString('es-AR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${h.currentValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                    <p className={`text-xs font-medium ${h.pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {h.pnl >= 0 ? '▲' : '▼'} ${Math.abs(h.pnl).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
