import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import Layout from '../components/Layout';
import { api } from '../services/api';

declare global { interface Window { QRCode: any; } }

export default function QRPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrData, setQrData] = useState<any>(null);
  const [scanMode, setScanMode] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.wallet.qr().then((r: any) => setQrData(r.data)).catch(console.error);
    // Load QRCode.js from CDN
    if (!window.QRCode) {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload = () => generateQR();
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => { if (qrData && window.QRCode) generateQR(); }, [qrData]);

  const generateQR = () => {
    if (!canvasRef.current || !qrData) return;
    const container = canvasRef.current.parentElement;
    if (!container) return;
    container.innerHTML = '<div id="qr-target"></div>';
    const target = document.getElementById('qr-target');
    if (!target) return;
    new window.QRCode(target, {
      text: JSON.stringify(qrData),
      width: 220, height: 220, colorDark: '#1e1b4b', colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.H,
    });
  };

  const handlePay = () => {
    if (!pasteData.trim()) { setError('Pegá los datos QR'); return; }
    try {
      const data = JSON.parse(pasteData);
      if (!data.alias) { setError('QR inválido'); return; }
      navigate('/transfer', { state: { prefilledAlias: data.alias, prefilledAmount: data.amount, prefilledConcept: data.concept } });
    } catch { setError('QR inválido o malformado'); }
  };

  return (
    <Layout>
      <div className="max-w-sm mx-auto space-y-4">
        <h1 className="text-xl font-bold text-gray-900">QR de pago</h1>

        <div className="flex gap-2">
          <button onClick={() => setScanMode(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${!scanMode ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600'}`}>Mi QR</button>
          <button onClick={() => setScanMode(true)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${scanMode ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600'}`}>Pagar con QR</button>
        </div>

        {!scanMode && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-4">
            <p className="text-sm text-gray-500">Mostrá este QR para recibir dinero</p>
            <div className="flex justify-center" ref={canvasRef as any}>
              <div id="qr-target" />
            </div>
            {qrData && (
              <div className="text-left bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Alias</span><span className="font-mono font-medium">{qrData.alias}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">CVU</span><span className="font-mono">{qrData.cvu}</span></div>
              </div>
            )}
          </div>
        )}

        {scanMode && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-sm text-gray-500">Pegá los datos del QR del destinatario (JSON)</p>
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
            <textarea value={pasteData} onChange={e => { setPasteData(e.target.value); setError(''); }}
              className="w-full border border-gray-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 h-28"
              placeholder='{"alias":"nombre.apellido.1234","cvu":"..."}'/>
            <button onClick={handlePay} className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700">
              Pagar →
            </button>
          </div>
        )}

        <p className="text-xs text-center text-gray-400">⚠️ Sólo dinero ficticio — proyecto académico</p>
      </div>
    </Layout>
  );
}
