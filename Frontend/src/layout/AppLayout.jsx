import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { ERP_MODULES } from '../config/modules';

export function AppLayout() {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const location = useLocation();

    // Automatically close the mobile sidebar when a navigation item is clicked
    useEffect(() => {
        setIsMobileOpen(false);
    }, [location.pathname]);

    const navItems = [
        { id: 'dashboard', title: 'Dashboard', path: '/', icon: LayoutDashboard },
        ...ERP_MODULES
    ];

    // Dynamically determine the page title based on the current route
    const currentTitle = navItems.find(item => item.path === location.pathname)?.title || 'Rudra ERP';

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex">

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
                <div className="h-16 flex items-center px-6 bg-slate-950 text-white font-bold text-xl tracking-wide">
                    Rudra ERP
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
            <div className="flex-1 flex flex-col min-h-screen md:ml-64 w-full transition-all">

                {/* Global Top Header */}
                <header className="h-16 bg-white shadow-sm px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold text-slate-800">{currentTitle}</h1>
                    </div>

                    {/* Future User Profile / Logout Dropdown can go here */}
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                        AD
                    </div>
                </header>

                {/* Dynamic Page Content injected by React Router */}
                <main className="p-4 md:p-8 flex-1 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>

        </div>
    );
}