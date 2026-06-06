import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import Layout from '../components/Layout';
import { api } from '../services/api';

type Step = 'recipient' | 'amount' | 'confirm' | 'done';

export default function TransferPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('recipient');
  const [alias, setAlias] = useState('');
  const [recipientInfo, setRecipientInfo] = useState<{ alias: string; ownerName: string; cvu: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const searchRecipient = async () => {
    setError('');
    setLoading(true);
    try {
      const res: any = await api.wallet.findByAlias(alias.trim());
      setRecipientInfo(res.data);
      setStep('amount');
    } catch (err: any) {
      setError(err.message || 'Alias no encontrado');
    } finally { setLoading(false); }
  };

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError('Ingresá un monto válido'); return; }
    setStep('confirm');
    setError('');
  };

  const handleTransfer = async () => {
    setError('');
    setLoading(true);
    try {
      const res: any = await api.transactions.transfer({
        receiverAlias: alias.trim(),
        amount: Number(amount),
        concept: concept || 'Transferencia PayFlow',
        idempotencyKey: uuidv4(),
        ...(pin ? { transferPin: pin } : {}),
      });
      setResult(res.data);
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Error en la transferencia');
    } finally { setLoading(false); }
  };

  const steps = ['recipient', 'amount', 'confirm', 'done'];
  const stepIdx = steps.indexOf(step);

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Enviar dinero</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['Destinatario', 'Monto', 'Confirmar'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${i < stepIdx ? 'bg-emerald-500 text-white' : i === stepIdx ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {i < stepIdx ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${i === stepIdx ? 'text-indigo-600' : 'text-gray-400'}`}>{s}</span>
              {i < 2 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 border border-red-100">{error}</div>}

        {/* Step 1 */}
        {step === 'recipient' && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alias del destinatario</label>
              <input type="text" value={alias} onChange={e => setAlias(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchRecipient()}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="nombre.apellido.1234" />
            </div>
            <button onClick={searchRecipient} disabled={!alias.trim() || loading}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Buscando...' : 'Buscar destinatario →'}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 'amount' && recipientInfo && (
          <form onSubmit={handleConfirm} className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <div className="bg-indigo-50 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-lg">👤</div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{recipientInfo.ownerName}</p>
                <p className="text-xs text-gray-500 font-mono">{recipientInfo.alias}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto (ARS)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="0.01" step="0.01"
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0,00" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
              <input type="text" value={concept} onChange={e => setConcept(e.target.value)} maxLength={255}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Pago de cena" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('recipient')}
                className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50">
                ← Atrás
              </button>
              <button type="submit" className="flex-2 flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700">
                Continuar →
              </button>
            </div>
          </form>
        )}

        {/* Step 3 */}
        {step === 'confirm' && recipientInfo && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <h2 className="font-semibold text-gray-900">Confirmá la transferencia</h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Para</span><span className="font-medium">{recipientInfo.ownerName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Alias</span><span className="font-mono text-xs">{alias}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Concepto</span><span>{concept || 'Sin concepto'}</span></div>
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="text-2xl font-bold text-gray-900">${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">PIN de transferencia (si configuraste uno)</label>
              <input type="password" value={pin} onChange={e => setPin(e.target.value)} maxLength={6}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••" />
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}
            <div className="flex gap-3">
              <button onClick={() => { setStep('amount'); setError(''); }}
                className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50">
                ← Atrás
              </button>
              <button onClick={handleTransfer} disabled={loading}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50">
                {loading ? 'Enviando...' : 'Confirmar envío'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && result && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center space-y-4">
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-bold text-gray-900">¡Transferencia exitosa!</h2>
            <p className="text-gray-500 text-sm">Tu dinero fue enviado correctamente.</p>
            <div className="bg-gray-50 rounded-xl p-4 text-left text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">ID</span><span className="font-mono text-xs truncate max-w-32">{result.id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Monto</span><span className="font-bold">${Number(amount).toLocaleString('es-AR')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Para</span><span>{recipientInfo?.ownerName}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate(`/receipt/${result.id}`)} className="flex-1 border border-indigo-200 text-indigo-600 font-semibold py-3 rounded-xl hover:bg-indigo-50">
                Ver comprobante
              </button>
              <button onClick={() => navigate('/dashboard')} className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700">
                Ir al inicio
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
