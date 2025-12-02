import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { EyeCatchingButton_v2 } from './shiny-button';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions | string) => {
        const finalOptions = typeof opts === 'string' ? { message: opts } : opts;
        setOptions(finalOptions);
        setIsOpen(true);

        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const handleClose = (result: boolean) => {
        setIsOpen(false);
        if (resolveRef.current) {
            resolveRef.current(result);
            resolveRef.current = null;
        }
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-full ${options.type === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    {options.title || 'Confirmation'}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                                    {options.message}
                                </p>
                            </div>
                            <button
                                onClick={() => handleClose(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => handleClose(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
                            >
                                {options.cancelText || 'Annuler'}
                            </button>
                            <EyeCatchingButton_v2
                                onClick={() => handleClose(true)}
                                className={`text-white shadow-lg ${options.type === 'danger'
                                        ? 'bg-red-500 shadow-red-500/20 hover:bg-red-600'
                                        : 'bg-brand-blue shadow-brand-blue/20'
                                    }`}
                            >
                                {options.confirmText || 'Confirmer'}
                            </EyeCatchingButton_v2>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context.confirm;
};
