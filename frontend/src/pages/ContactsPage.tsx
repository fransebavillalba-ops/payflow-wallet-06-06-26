import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<any[]>([]);
  const [alias, setAlias] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const res: any = await api.wallet.contacts();
      setContacts(res.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addContact = async () => {
    if (!alias.trim()) { setError('Ingresá el alias'); return; }
    setError(''); setAdding(true);
    try {
      await api.wallet.addContact({ alias: alias.trim(), label: label.trim() || undefined });
      setAlias(''); setLabel('');
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setAdding(false); }
  };

  const remove = async (contactAlias: string) => {
    await api.wallet.removeContact(contactAlias);
    setContacts(cs => cs.filter(c => c.alias !== contactAlias));
  };

  return (
    <Layout>
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-gray-900">Contactos</h1>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Agregar contacto</p>
          {error && <div className="bg-red-50 text-red-600 text-xs p-2 rounded-xl">{error}</div>}
          <input type="text" value={alias} onChange={e => setAlias(e.target.value)} placeholder="Alias de la wallet"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Apodo (opcional)"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button onClick={addContact} disabled={adding}
            className="w-full bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
            {adding ? 'Guardando...' : 'Guardar contacto'}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {loading ? <div className="p-6 text-center text-gray-400 text-sm">Cargando...</div>
          : contacts.length === 0 ? <div className="p-6 text-center text-gray-400 text-sm">No tenés contactos guardados.</div>
          : contacts.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                {(c.label || c.alias).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{c.label || c.alias}</p>
                <p className="text-xs text-gray-500 font-mono truncate">{c.alias}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate('/transfer', { state: { prefilledAlias: c.alias } })}
                  className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-100">
                  Enviar
                </button>
                <button onClick={() => remove(c.alias)} className="text-xs text-red-400 px-2 py-1.5 hover:text-red-600">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
