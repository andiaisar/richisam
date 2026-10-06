import { Outlet, Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const DashboardLayout = () => {
  const { user, isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F5F2EF] flex flex-col md:flex-row">
      {/* Sidebar (Sederhana untuk tes, nanti diperindah di fase berikutnya) */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-richisam-orange)] to-[var(--color-richisam-merah-tua)]">
            RichiStock
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {/* Menu items akan diletakkan di sini */}
          <div className="p-3 bg-[var(--color-richisam-orange)]/10 text-[var(--color-richisam-orange)] rounded-xl font-medium cursor-pointer">
            Dashboard
          </div>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--color-richisam-kuning)] to-[var(--color-richisam-orange)] flex items-center justify-center text-white font-bold">
              {user?.nama?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{user?.nama}</p>
              <p className="text-xs text-gray-500">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full py-2 text-sm text-[var(--color-richisam-merah-tua)] font-medium bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Mobile / Search bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 md:justify-end">
           <div className="md:hidden font-bold text-[var(--color-richisam-orange)]">RichiStock</div>
           <div className="flex items-center space-x-4">
             {/* Bell Icon Placeholder */}
             <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 relative">
               <span className="absolute top-2 right-2.5 w-2 h-2 bg-[var(--color-richisam-merah-muda)] rounded-full border border-white"></span>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
               </svg>
             </div>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
