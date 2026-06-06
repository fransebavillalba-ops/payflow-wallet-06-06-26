import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Notification } from '../types';

const typeIcon: Record<string, string> = {
  KYC_APPROVED: '✅', KYC_REJECTED: '❌',
  TRANSFER_RECEIVED: '💸', TRANSFER_SENT: '📤',
  DEPOSIT: '➕', WITHDRAWAL: '➖',
  WALLET_BLOCKED: '🚫', WALLET_UNBLOCKED: '🔓',
  PAYMENT_REQUEST: '🔔', PAYMENT_REQUEST_ACCEPTED: '✅', PAYMENT_REQUEST_REJECTED: '❌',
  MARKET_OPERATION: '📈',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const res: any = await api.notifications.list();
      setNotifications(res.data?.notifications || []);
      setUnread(res.data?.unreadCount || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await api.notifications.markRead(id);
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAll = async () => {
    await api.notifications.markAllRead();
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Notificaciones {unread > 0 && <span className="text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-2">{unread} nuevas</span>}</h1>
          {unread > 0 && <button onClick={markAll} className="text-xs text-indigo-600 font-medium hover:underline">Marcar todas</button>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-4xl mb-2">🔔</p>
              <p className="text-gray-400 text-sm">No tenés notificaciones.</p>
            </div>
          ) : (
            notifications.map(n => (
              <button key={n.id} onClick={() => !n.read && markRead(n.id)}
                className={`w-full text-left flex gap-3 p-4 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-indigo-50/50' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                  {typeIcon[n.type] || '📣'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('es-AR')}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
