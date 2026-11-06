import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Loader2, Download } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('superadmin@rudra.com');
    const [password, setPassword] = useState('password123');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            setIsInstalled(true);
        }
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }, []);

    const handleInstall = async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === 'accepted') setIsInstalled(true);
        } else {
            alert('To install Rudra ERP on your device:\n\n• Mobile: Tap browser menu (⋮) -> "Add to Home screen" or "Install"\n• iPhone: Tap Share (⎋) -> "Add to Home Screen"\n• Desktop: Click install icon (⊕) in browser address bar');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Rudra ERP</h1>
                    <p className="text-slate-500 mt-2">Sign in to your account</p>
                </div>

                {!isInstalled && (
                    <div className="mb-6">
                        <button
                            type="button"
                            onClick={handleInstall}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-xs"
                        >
                            <Download className="w-4 h-4 text-indigo-600" />
                            📲 Install Rudra ERP App on this Device
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-2">Email Address</label>
                        <div className="relative">
                            <Mail className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-2">Password</label>
                        <div className="relative">
                            <Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-70 cursor-pointer"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-xs text-slate-400 text-center">
                    Default: superadmin@rudra.com / password123
                </div>
            </div>
        </div>
    );
}
