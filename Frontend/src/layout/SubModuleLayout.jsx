import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function SubModuleLayout({ title, children }) {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#f3f4f6]">
            <header className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">{title}</h1>

                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </button>
            </header>

            <main className="p-8">
                {children}
            </main>
        </div>
    );
}