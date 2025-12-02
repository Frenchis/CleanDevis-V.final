import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: {
        success: (message: string) => void;
        error: (message: string) => void;
        warning: (message: string) => void;
        info: (message: string) => void;
    };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto remove after 3 seconds
        setTimeout(() => {
            removeToast(id);
        }, 3000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = {
        success: (message: string) => addToast(message, 'success'),
        error: (message: string) => addToast(message, 'error'),
        warning: (message: string) => addToast(message, 'warning'),
        info: (message: string) => addToast(message, 'info'),
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`
                            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md transition-all animate-in slide-in-from-right-full fade-in duration-300
                            ${t.type === 'success' ? 'bg-green-50/90 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' : ''}
                            ${t.type === 'error' ? 'bg-red-50/90 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200' : ''}
                            ${t.type === 'warning' ? 'bg-amber-50/90 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200' : ''}
                            ${t.type === 'info' ? 'bg-blue-50/90 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200' : ''}
                        `}
                    >
                        {t.type === 'success' && <CheckCircle className="w-5 h-5" />}
                        {t.type === 'error' && <AlertCircle className="w-5 h-5" />}
                        {t.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                        {t.type === 'info' && <Info className="w-5 h-5" />}

                        <span className="text-sm font-medium">{t.message}</span>

                        <button
                            onClick={() => removeToast(t.id)}
                            className="ml-2 p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 opacity-50" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context.toast;
};
