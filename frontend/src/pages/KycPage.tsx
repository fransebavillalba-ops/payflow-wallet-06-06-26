import { useState, useRef, useCallback, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

type Step = 'intro' | 'form' | 'camera' | 'preview' | 'sending' | 'done' | 'error';

export default function KycPage() {
  const { user, setUser }  = useAuth();
  const navigate           = useNavigate();

  const [step, setStep]   = useState<Step>('intro');
  const [errMsg, setErrMsg] = useState('');

  // Form fields
  const [docType,   setDocType]   = useState('DNI');
  const [docNumber, setDocNumber] = useState('');
  const [fullName,  setFullName]  = useState(user?.name || '');
  const [birthDate, setBirthDate] = useState('');

  // Camera state
  const videoRef          = useRef<HTMLVideoElement>(null);
  const canvasRef         = useRef<HTMLCanvasElement>(null);
  const streamRef         = useRef<MediaStream | null>(null);
  const [cameraTarget, setCameraTarget] = useState<'front' | 'selfie'>('front');
  const [frontImage,  setFrontImage]  = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);

  // Already approved
  if (user?.kycStatus === 'APPROVED') {
    return (
      <Layout>
        <div className="max-w-sm mx-auto text-center py-16">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Identidad verificada</h2>
          <p className="text-gray-500 text-sm mt-2">Tu cuenta está activa y podés operar normalmente.</p>
          <button onClick={() => navigate('/dashboard')}
            className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700">
            Ir al inicio
          </button>
        </div>
      </Layout>
    );
  }

  const startCamera = async (target: 'front' | 'selfie') => {
    setCameraTarget(target);
    setErrMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: target === 'selfie' ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setStep('camera');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setErrMsg('Permiso de cámara denegado. Habilitalo desde la configuración del navegador.');
      } else if (err.name === 'NotFoundError') {
        setErrMsg('No se detectó ninguna cámara en el dispositivo.');
      } else {
        setErrMsg('No se pudo acceder a la cámara. Intentá con otro navegador.');
      }
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    if (cameraTarget === 'front')   setFrontImage(dataUrl);
    if (cameraTarget === 'selfie')  setSelfieImage(dataUrl);
    stopCamera();
    setStep('form');
  }, [cameraTarget, stopCamera]);

  const retake = (target: 'front' | 'selfie') => {
    if (target === 'front')  setFrontImage(null);
    if (target === 'selfie') setSelfieImage(null);
    startCamera(target);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrMsg('');
    if (!docNumber.trim()) { setErrMsg('El número de documento es requerido.'); return; }
    if (!fullName.trim())  { setErrMsg('El nombre completo es requerido.'); return; }
    setStep('sending');
    try {
      await api.kyc.submit({
        documentType:   docType,
        documentNumber: docNumber.trim(),
        fullName:       fullName.trim(),
        birthDate:      birthDate || undefined,
        frontImage:     frontImage  || undefined,
        selfieImage:    selfieImage || undefined,
      });
      // Update local user state
      setUser({ ...user!, kycStatus: 'PENDING' } as User);
      setStep('done');
    } catch (err: any) {
      setErrMsg(err.message || 'No se pudo enviar la verificación. Intentá de nuevo.');
      setStep('form');
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Verificación de identidad</h1>

        {/* INTRO */}
        {step === 'intro' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🪪</span>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">¿Por qué necesitamos esto?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Para proteger tu cuenta y cumplir con las normativas de seguridad, necesitamos verificar tu identidad antes de activar todas las funciones de tu cuenta.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm text-gray-600">
              <div className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Tomá una foto del frente de tu DNI</div>
              <div className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Completá tus datos básicos</div>
              <div className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Opcionalmente, tomá una selfie</div>
              <div className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Tu solicitud será revisada en breve</div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
              <p className="font-semibold mb-0.5">🔒 Privacidad garantizada</p>
              <p>Tus datos e imágenes son almacenados de forma segura y solo son accesibles por personal autorizado.</p>
            </div>

            <button onClick={() => setStep('form')}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors">
              Iniciar verificación
            </button>
          </div>
        )}

        {/* FORM */}
        {(step === 'form' || step === 'sending') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errMsg && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-100 flex items-start gap-2">
                <span>⚠️</span><span>{errMsg}</span>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">Datos del documento</h3>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de documento</label>
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="DNI">DNI — Documento Nacional de Identidad</option>
                  <option value="PASAPORTE">Pasaporte</option>
                  <option value="LC">Libreta Cívica</option>
                  <option value="LE">Libreta de Enrolamiento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Número de documento *</label>
                <input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)} required
                  maxLength={12}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: 30123456" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre y apellido *</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nombre Apellido" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de nacimiento (opcional)</label>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Document photo */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm">Foto del documento</h3>
              {frontImage ? (
                <div className="space-y-2">
                  <img src={frontImage} alt="Frente del documento" className="w-full rounded-xl border border-gray-200 object-cover max-h-48" />
                  <button type="button" onClick={() => retake('front')}
                    className="w-full text-sm text-indigo-600 font-medium border border-indigo-200 py-2 rounded-xl hover:bg-indigo-50">
                    Volver a tomar
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => startCamera('front')}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                  <p className="text-3xl mb-2">📷</p>
                  <p className="text-sm font-medium text-gray-700">Fotografiar frente del documento</p>
                  <p className="text-xs text-gray-400 mt-1">Se solicitará acceso a la cámara</p>
                </button>
              )}
            </div>

            {/* Selfie (optional) */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 text-sm">Selfie de validación</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Opcional</span>
              </div>
              {selfieImage ? (
                <div className="space-y-2">
                  <img src={selfieImage} alt="Selfie" className="w-full rounded-xl border border-gray-200 object-cover max-h-48" />
                  <button type="button" onClick={() => retake('selfie')}
                    className="w-full text-sm text-indigo-600 font-medium border border-indigo-200 py-2 rounded-xl hover:bg-indigo-50">
                    Volver a tomar
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => startCamera('selfie')}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                  <p className="text-3xl mb-2">🤳</p>
                  <p className="text-sm font-medium text-gray-700">Tomá una selfie</p>
                  <p className="text-xs text-gray-400 mt-1">Ayuda a verificar que sos vos</p>
                </button>
              )}
            </div>

            <button type="submit" disabled={step === 'sending'}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-sm">
              {step === 'sending' ? 'Enviando verificación...' : 'Enviar verificación'}
            </button>

            <p className="text-xs text-center text-gray-400">
              Al enviar, aceptás el uso de tus datos con fines de verificación de identidad.
            </p>
          </form>
        )}

        {/* CAMERA */}
        {step === 'camera' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm text-center">
              {cameraTarget === 'front' ? 'Encuadrá el frente de tu documento' : 'Mirá directo a la cámara'}
            </h3>

            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {/* Guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`border-2 border-white/70 rounded-xl ${cameraTarget === 'front' ? 'w-4/5 h-2/3' : 'w-1/2 h-2/3 rounded-full'}`} />
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {errMsg && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl">{errMsg}</div>
            )}

            <div className="flex gap-3">
              <button type="button"
                onClick={() => { stopCamera(); setStep('form'); }}
                className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={capturePhoto}
                className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700">
                📷 Capturar
              </button>
            </div>
            <p className="text-xs text-center text-gray-400">
              {cameraTarget === 'front'
                ? 'Asegurate de que el texto del documento sea legible y esté bien iluminado.'
                : 'Asegurate de que tu cara esté centrada y bien iluminada.'}
            </p>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-4xl">📬</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Verificación enviada</h2>
            <p className="text-gray-500 text-sm">
              Tu solicitud fue recibida y está siendo revisada. Te notificaremos cuando esté lista.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              Estado actual: <span className="font-semibold">Pendiente de revisión</span>
            </div>
            <button onClick={() => navigate('/dashboard')}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700">
              Ir al inicio
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
