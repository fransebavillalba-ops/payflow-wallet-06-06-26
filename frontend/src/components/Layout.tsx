import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const NAV = [
  { to: '/dashboard', icon: '🏠', label: 'Inicio' },
  { to: '/transfer', icon: '💸', label: 'Enviar' },
  { to: '/history', icon: '📋', label: 'Historial' },
  { to: '/market', icon: '📈', label: 'Mercado' },
  { to: '/notifications', icon: '🔔', label: 'Avisos' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.notifications.list(1).then((r: any) => setUnread(r.data?.unreadCount || 0)).catch(() => {});
  }, [location.pathname]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-bold">P</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">PayFlow</span>
        </Link>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link to="/admin" className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
              ⚙️ Admin
            </Link>
          )}
          <span className="text-sm text-gray-600 hidden sm:block">{user?.name}</span>
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-500 transition-colors px-2 py-1">
            Salir
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">{children}</main>

      {/* Bottom nav */}
      <nav className="bg-white border-t border-gray-100 sticky bottom-0 z-20">
        <div className="max-w-2xl mx-auto flex">
          {NAV.map(({ to, icon, label }) => {
            const active = location.pathname === to;
            const isNotif = to === '/notifications';
            return (
              <Link key={to} to={to} className={`flex-1 flex flex-col items-center py-2 px-1 relative transition-colors ${active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                <span className="text-xl">{icon}</span>
                {isNotif && unread > 0 && (
                  <span className="absolute top-1 right-1/4 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">{unread > 9 ? '9+' : unread}</span>
                )}
                <span className="text-xs mt-0.5 font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
