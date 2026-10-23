import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Shield } from 'lucide-react';
import { useAuth, ACTIONS } from '../context/AuthContext';
import { ERP_MODULES } from '../config/modules';

export function AppLayout() {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const location = useLocation();
    const { hasPermission, user, logout, refreshUser } = useAuth();

    // Automatically close the mobile sidebar when a navigation item is clicked
    // Also refresh user permissions from DB on route changes to handle live RBAC updates
    useEffect(() => {
        setIsMobileOpen(false);
        // Non-blocking permission refresh — keeps sidebar and routes up-to-date
        refreshUser();
    }, [location.pathname]);

    const permittedModules = ERP_MODULES.filter(module => hasPermission(module.id, ACTIONS.VIEW));

    const navItems = [
        { id: 'dashboard', title: 'Dashboard', path: '/', icon: LayoutDashboard },
        ...permittedModules,
        // Settings link — only visible to Super Admin
        ...(user?.role === 'super_admin' ? [{ id: 'settings', title: 'Settings', path: '/settings', icon: Shield }] : []),
    ];

    // Dynamically determine the page title based on the current route
    const currentTitle = navItems.find(item => item.path === location.pathname)?.title || 'Rudra ERP';

    return (
        <div className="min-h-screen bg-[#f3f4f6] w-full max-w-full overflow-x-hidden relative">

            {/* Mobile Overlay Background */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300
        transition-transform duration-300 ease-in-out
        md:translate-x-0 flex flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="h-16 flex items-center justify-between px-6 bg-slate-950 text-white font-bold text-xl tracking-wide">
                    <span>Rudra ERP</span>
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
                        aria-label="Close Navigation Menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.id}
                                to={item.path}
                                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors
                  ${isActive
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'hover:bg-slate-800 hover:text-white'}
                `}
                            >
                                <Icon className="w-5 h-5" />
                                {item.title}
                            </NavLink>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content Wrapper */}
            <div className="min-h-screen flex flex-col w-full md:ml-64 md:w-[calc(100%-16rem)] max-w-full transition-all">

                {/* Global Top Header */}
                <header className="h-16 bg-white shadow-sm px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 w-full max-w-full">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden shrink-0"
                            aria-label="Open Navigation Menu"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{currentTitle}</h1>
                    </div>

                    {/* User Profile & Logout */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                            {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                        </div>
                        <span className="text-sm font-medium text-slate-600 hidden md:block">{user?.name}</span>
                        <button
                            onClick={() => { logout(); window.location.href = '/login'; }}
                            className="text-xs px-2.5 sm:px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md font-medium transition-colors shrink-0"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                {/* Dynamic Page Content injected by React Router */}
                <main className="p-4 md:p-8 flex-1 w-full max-w-full min-w-0 flex flex-col">
                    <Outlet />
                </main>
            </div>

        </div>
    );
}