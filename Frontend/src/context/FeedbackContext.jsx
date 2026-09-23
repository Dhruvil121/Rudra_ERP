import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const FeedbackContext = createContext();

export const useFeedback = () => useContext(FeedbackContext);

export const FeedbackProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [confirmConfig, setConfirmConfig] = useState(null);

    // Toast functions
    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, type }]);
        
        if (duration) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Confirm Modal functions
    const showConfirm = useCallback(({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) => {
        return new Promise((resolve) => {
            setConfirmConfig({
                title,
                message,
                confirmText,
                cancelText,
                type, // 'warning', 'danger', 'info'
                onConfirm: () => {
                    setConfirmConfig(null);
                    resolve(true);
                },
                onCancel: () => {
                    setConfirmConfig(null);
                    resolve(false);
                }
            });
        });
    }, []);

    return (
        <FeedbackContext.Provider value={{ showToast, showConfirm }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => {
                    const icons = {
                        success: <CheckCircle className="w-5 h-5 text-green-500" />,
                        error: <XCircle className="w-5 h-5 text-red-500" />,
                        warning: <AlertTriangle className="w-5 h-5 text-orange-500" />,
                        info: <Info className="w-5 h-5 text-blue-500" />
                    };
                    const bgColors = {
                        success: 'bg-green-50 border-green-200',
                        error: 'bg-red-50 border-red-200',
                        warning: 'bg-orange-50 border-orange-200',
                        info: 'bg-blue-50 border-blue-200'
                    };
                    return (
                        <div key={toast.id} className={`pointer-events-auto flex items-start gap-3 p-4 border rounded-xl shadow-lg min-w-[300px] animate-in slide-in-from-top-2 fade-in duration-200 ${bgColors[toast.type] || bgColors.info}`}>
                            {icons[toast.type] || icons.info}
                            <p className="flex-1 text-sm font-medium text-slate-800">{toast.message}</p>
                            <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Confirm Modal */}
            {confirmConfig && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{confirmConfig.title}</h3>
                            <p className="text-slate-600">{confirmConfig.message}</p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={confirmConfig.onCancel}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                {confirmConfig.cancelText}
                            </button>
                            <button
                                onClick={confirmConfig.onConfirm}
                                className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-colors ${
                                    confirmConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                                    confirmConfig.type === 'warning' ? 'bg-orange-500 hover:bg-orange-600' :
                                    'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {confirmConfig.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </FeedbackContext.Provider>
    );
};
